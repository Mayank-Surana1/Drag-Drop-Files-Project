import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|com|msi|scr|dll|sh|app|jar|vbs|ps1)$/i;
const TEXT_EXTENSIONS =
  /\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|yaml|yml|csv|log|env|gitignore|py|rb|go|rs|java|c|cpp|h|hpp|bash|zsh|sql|graphql)$/i;

const SAFE_INLINE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const DATA_DIR = path.resolve(__dirname, "data");
const UPLOADS_DIR = path.resolve(DATA_DIR, "uploads");
const STORE_PATH = path.resolve(DATA_DIR, "store.json");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

interface StoredFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  content: string | null;
  folder_id: string | null;
  created_at: string;
}

interface StoreSchema {
  folders: StoredFolder[];
  files: StoredFile[];
}

// Server-side scrypt hash for keeper passcode verification (defaults to 123 unless KEEPER_PASSWORD is set)
const PASSCODE_SALT = crypto.randomBytes(16);
const DEFAULT_PASSCODE = String.fromCharCode(49, 50, 51);
const EXPECTED_PASSCODE =
  process.env.KEEPER_PASSWORD && process.env.KEEPER_PASSWORD.length > 0
    ? process.env.KEEPER_PASSWORD
    : DEFAULT_PASSCODE;
const EXPECTED_PASSCODE_HASH = crypto.scryptSync(
  EXPECTED_PASSCODE,
  PASSCODE_SALT,
  32
);

function verifyKeeperPassword(candidate: unknown): boolean {
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > 128) {
    return false;
  }
  const candidateHash = crypto.scryptSync(candidate, PASSCODE_SALT, 32);
  return crypto.timingSafeEqual(candidateHash, EXPECTED_PASSCODE_HASH);
}

function readStore(): StoreSchema {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const initial: StoreSchema = { folders: [], files: [] };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreSchema>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch {
    return { folders: [], files: [] };
  }
}

let writeQueue: Promise<void> = Promise.resolve();

function writeStore(nextStore: StoreSchema): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const tmpPath = `${STORE_PATH}.${crypto.randomUUID()}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(nextStore, null, 2), "utf8");
    await fs.promises.rename(tmpPath, STORE_PATH);
  });
  return writeQueue;
}

function resolveConfinedUploadPath(storagePath: string): string | null {
  const safeBase = path.basename(storagePath);
  if (!safeBase || safeBase !== storagePath) {
    return null;
  }
  const resolved = path.resolve(UPLOADS_DIR, safeBase);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function isTextReadable(name: string, mimeType: string): boolean {
  const textMimes = [
    "text/",
    "application/json",
    "application/javascript",
    "application/typescript",
    "application/xml",
    "application/x-yaml",
  ];
  return (
    textMimes.some((prefix) => mimeType.startsWith(prefix) || mimeType.includes(prefix)) ||
    TEXT_EXTENSIONS.test(name)
  );
}

function removeUploadFileSafely(storagePath: string) {
  const confined = resolveConfinedUploadPath(storagePath);
  if (confined && fs.existsSync(confined)) {
    try {
      fs.unlinkSync(confined);
    } catch {
      // Ignore cleanup errors if already missing
    }
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 25,
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Fetch all folders with item counts and workspace stats
  app.get("/api/folders", (_req: Request, res: Response) => {
    const store = readStore();
    const foldersWithCounts = [...store.folders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((folder) => {
        const childFolders = store.folders.filter((f) => f.parent_id === folder.id).length;
        const childFiles = store.files.filter((f) => f.folder_id === folder.id).length;
        return {
          ...folder,
          item_count: childFolders + childFiles,
        };
      });

    const totalSize = store.files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
    res.json({
      folders: foldersWithCounts,
      stats: {
        totalFiles: store.files.length,
        totalFolders: store.folders.length,
        totalSize,
      },
    });
  });

  app.post("/api/folders", async (req: Request, res: Response) => {
    const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const parentId =
      typeof req.body?.parent_id === "string" && req.body.parent_id.length > 0
        ? req.body.parent_id
        : null;

    if (!rawName) {
      res.status(400).json({ error: "Folder name is required." });
      return;
    }

    const store = readStore();
    if (parentId !== null && !store.folders.some((f) => f.id === parentId)) {
      res.status(404).json({ error: "Parent folder not found." });
      return;
    }

    const folder: StoredFolder = {
      id: crypto.randomUUID(),
      name: rawName.slice(0, 80),
      parent_id: parentId,
      created_at: new Date().toISOString(),
    };

    store.folders.unshift(folder);
    await writeStore(store);

    res.status(201).json({ folder: { ...folder, item_count: 0 } });
  });

  app.patch("/api/folders/:id", async (req: Request, res: Response) => {
    const id = req.params.id;
    const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!rawName) {
      res.status(400).json({ error: "Folder name cannot be empty." });
      return;
    }

    const store = readStore();
    const target = store.folders.find((f) => f.id === id);
    if (!target) {
      res.status(404).json({ error: "Folder not found." });
      return;
    }

    target.name = rawName.slice(0, 80);
    await writeStore(store);
    res.json({ folder: target });
  });

  app.delete("/api/folders/:id", async (req: Request, res: Response) => {
    const id = req.params.id;
    const password = req.body?.password;

    if (!verifyKeeperPassword(password)) {
      res.status(403).json({ error: "Incorrect password. Deletion blocked." });
      return;
    }

    const store = readStore();
    const exists = store.folders.some((f) => f.id === id);
    if (!exists) {
      res.status(404).json({ error: "Folder not found." });
      return;
    }

    // Collect folder and all nested descendant folder IDs
    const folderIdsToDelete = new Set<string>([id]);
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.pop()!;
      for (const f of store.folders) {
        if (f.parent_id === current && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id);
          queue.push(f.id);
        }
      }
    }

    const filesToDelete = store.files.filter(
      (file) => file.folder_id !== null && folderIdsToDelete.has(file.folder_id)
    );
    for (const file of filesToDelete) {
      removeUploadFileSafely(file.storage_path);
    }

    store.folders = store.folders.filter((f) => !folderIdsToDelete.has(f.id));
    store.files = store.files.filter(
      (file) => file.folder_id === null || !folderIdsToDelete.has(file.folder_id)
    );

    await writeStore(store);
    res.json({ deletedFolderIds: Array.from(folderIdsToDelete), deletedFiles: filesToDelete.length });
  });

  // List files for a folder or across all folders
  app.get("/api/files", (req: Request, res: Response) => {
    const scope = req.query.scope;
    const folderIdParam = req.query.folderId;
    const store = readStore();

    let result = [...store.files];
    if (scope !== "all") {
      const targetFolderId =
        typeof folderIdParam === "string" && folderIdParam.length > 0 && folderIdParam !== "null"
          ? folderIdParam
          : null;
      result = result.filter((f) => f.folder_id === targetFolderId);
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ files: result });
  });

  app.post("/api/files/upload", upload.array("files", 25), async (req: Request, res: Response) => {
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    const folderIdRaw = req.body?.folderId;
    const folderId =
      typeof folderIdRaw === "string" && folderIdRaw.length > 0 && folderIdRaw !== "null"
        ? folderIdRaw
        : null;

    if (uploadedFiles.length === 0) {
      res.status(400).json({ error: "No files provided." });
      return;
    }

    const store = readStore();
    if (folderId !== null && !store.folders.some((f) => f.id === folderId)) {
      res.status(404).json({ error: "Target folder not found." });
      return;
    }

    const created: StoredFile[] = [];
    const rejected: Array<{ name: string; reason: string }> = [];

    for (const file of uploadedFiles) {
      const originalName = (file.originalname || "untitled").slice(0, 200);
      if (BLOCKED_EXTENSIONS.test(originalName)) {
        rejected.push({
          name: originalName,
          reason: "Executable file types are not permitted.",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        rejected.push({
          name: originalName,
          reason: "Exceeds the 25 MB file size limit.",
        });
        continue;
      }

      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
      const storagePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const confined = resolveConfinedUploadPath(storagePath);
      if (!confined) {
        rejected.push({ name: originalName, reason: "Invalid storage path." });
        continue;
      }

      await fs.promises.writeFile(confined, file.buffer);

      const mimeType = file.mimetype || "application/octet-stream";
      let textContent: string | null = null;
      if (isTextReadable(originalName, mimeType)) {
        // Store up to 1.5 MB of UTF-8 text content for instant copy and preview
        const sliceBuffer =
          file.buffer.byteLength > 1500 * 1024
            ? file.buffer.subarray(0, 1500 * 1024)
            : file.buffer;
        textContent = sliceBuffer.toString("utf8");
      }

      const record: StoredFile = {
        id: crypto.randomUUID(),
        name: originalName,
        size: file.size,
        type: mimeType,
        storage_path: storagePath,
        content: textContent,
        folder_id: folderId,
        created_at: new Date().toISOString(),
      };

      store.files.unshift(record);
      created.push(record);
    }

    if (created.length > 0) {
      await writeStore(store);
    }

    res.status(created.length > 0 ? 201 : 400).json({
      files: created,
      rejected,
    });
  });

  app.patch("/api/files/:id", async (req: Request, res: Response) => {
    const id = req.params.id;
    const store = readStore();
    const target = store.files.find((f) => f.id === id);

    if (!target) {
      res.status(404).json({ error: "File not found." });
      return;
    }

    if (typeof req.body?.name === "string") {
      const nextName = req.body.name.trim().slice(0, 200);
      if (!nextName) {
        res.status(400).json({ error: "File name cannot be empty." });
        return;
      }
      target.name = nextName;
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "folder_id")) {
      const nextFolderId = req.body.folder_id;
      if (nextFolderId !== null) {
        if (typeof nextFolderId !== "string" || !store.folders.some((f) => f.id === nextFolderId)) {
          res.status(404).json({ error: "Destination folder not found." });
          return;
        }
      }
      target.folder_id = nextFolderId;
    }

    await writeStore(store);
    res.json({ file: target });
  });

  app.delete("/api/files/:id", async (req: Request, res: Response) => {
    const id = req.params.id;
    const password = req.body?.password;

    if (!verifyKeeperPassword(password)) {
      res.status(403).json({ error: "Incorrect password. Deletion blocked." });
      return;
    }

    const store = readStore();
    const idx = store.files.findIndex((f) => f.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "File not found." });
      return;
    }

    const [removed] = store.files.splice(idx, 1);
    removeUploadFileSafely(removed.storage_path);
    await writeStore(store);

    res.json({ deletedId: id });
  });

  app.post("/api/files/clear", async (req: Request, res: Response) => {
    const password = req.body?.password;
    const folderId =
      typeof req.body?.folderId === "string" && req.body.folderId.length > 0
        ? req.body.folderId
        : null;

    if (!verifyKeeperPassword(password)) {
      res.status(403).json({ error: "Incorrect password. Deletion blocked." });
      return;
    }

    const store = readStore();
    const toRemove = store.files.filter((f) => f.folder_id === folderId);
    for (const file of toRemove) {
      removeUploadFileSafely(file.storage_path);
    }

    store.files = store.files.filter((f) => f.folder_id !== folderId);
    await writeStore(store);

    res.json({ deletedCount: toRemove.length });
  });

  app.get("/api/files/:id/download", (req: Request, res: Response) => {
    const id = req.params.id;
    const store = readStore();
    const file = store.files.find((f) => f.id === id);
    if (!file) {
      res.status(404).json({ error: "File not found." });
      return;
    }

    const confined = resolveConfinedUploadPath(file.storage_path);
    if (!confined || !fs.existsSync(confined)) {
      res.status(404).json({ error: "Stored file missing on disk." });
      return;
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.download(confined, file.name);
  });

  app.get("/api/files/:id/raw", (req: Request, res: Response) => {
    const id = req.params.id;
    const store = readStore();
    const file = store.files.find((f) => f.id === id);
    if (!file) {
      res.status(404).json({ error: "File not found." });
      return;
    }

    const confined = resolveConfinedUploadPath(file.storage_path);
    if (!confined || !fs.existsSync(confined)) {
      res.status(404).json({ error: "Stored file missing on disk." });
      return;
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    if (SAFE_INLINE_IMAGE_TYPES.has(file.type)) {
      res.setHeader("Content-Type", file.type);
      res.sendFile(confined);
      return;
    }

    res.download(confined, file.name);
  });

  // Multer & API error handler
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "One or more files exceed the 25 MB size limit." });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(path.resolve(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Drag Drop server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Drag Drop server:", err);
  process.exit(1);
});
