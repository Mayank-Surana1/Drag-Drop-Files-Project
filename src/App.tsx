import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  LayoutGrid,
  List,
  Search,
  Trash2,
} from "lucide-react";
import { DropZone } from "./components/DropZone";
import { FileRow } from "./components/FileRow";
import { FolderRow } from "./components/FolderRow";
import {
  type FileCategoryFilter,
  FolderSidebar,
} from "./components/FolderSidebar";
import { InspectorDrawer } from "./components/InspectorDrawer";
import {
  MoveFileModal,
  NewFolderModal,
  PasswordDeleteModal,
  RenameModal,
} from "./components/Modals";
import { ToastContainer } from "./components/ToastContainer";
import { TopBar } from "./components/TopBar";
import {
  BLOCKED_EXECUTABLE_REGEX,
  MAX_FILE_SIZE_BYTES,
  isPreviewableImage,
  isTextReadableFile,
} from "./lib/fileUtils";
import type {
  FileRecord,
  FolderRecord,
  LayoutMode,
  ToastItem,
  WorkspaceStats,
} from "./types";

type DeleteTarget =
  | { kind: "file"; file: FileRecord }
  | { kind: "folder"; folder: FolderRecord }
  | { kind: "clear-folder"; folderId: string | null; folderName: string };

type RenameTarget =
  | { kind: "file"; file: FileRecord }
  | { kind: "folder"; folder: FolderRecord };

export default function App() {
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<WorkspaceStats>({
    totalFiles: 0,
    totalFolders: 0,
    totalSize: 0,
  });

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FileCategoryFilter>("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("list");
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [inspectedFileId, setInspectedFileId] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileRecord | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to load folders");
      const data = await res.json();
      setFolders(data.folders ?? []);
      if (data.stats) setStats(data.stats);
    } catch {
      pushToast({
        title: "Unable to load folders",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [pushToast]);

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const url = `/api/files?folderId=${encodeURIComponent(currentFolderId ?? "null")}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      pushToast({
        title: "Unable to load files",
        description: "Could not fetch stored documents.",
        variant: "destructive",
      });
    } finally {
      setLoadingFiles(false);
    }
  }, [currentFolderId, pushToast]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchFolders(), fetchFiles()]);
  }, [fetchFolders, fetchFiles]);

  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId) return [];
    const byId = new Map(folders.map((f) => [f.id, f]));
    const chain: FolderRecord[] = [];
    let pointer = byId.get(currentFolderId);
    while (pointer) {
      chain.unshift(pointer);
      pointer = pointer.parent_id ? byId.get(pointer.parent_id) : undefined;
    }
    return chain;
  }, [folders, currentFolderId]);

  const currentFolder = breadcrumbPath[breadcrumbPath.length - 1] ?? null;

  const visibleFolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return folders.filter((folder) => {
      if (folder.parent_id !== currentFolderId) return false;
      if (!q) return true;
      return folder.name.toLowerCase().includes(q);
    });
  }, [folders, currentFolderId, searchQuery]);

  const visibleFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      if (categoryFilter === "images" && !isPreviewableImage(file.type)) {
        return false;
      }
      if (
        categoryFilter === "text" &&
        !isTextReadableFile(file.name, file.type)
      ) {
        return false;
      }
      if (
        categoryFilter === "other" &&
        (isPreviewableImage(file.type) ||
          isTextReadableFile(file.name, file.type))
      ) {
        return false;
      }
      if (!q) return true;
      return file.name.toLowerCase().includes(q);
    });
  }, [files, categoryFilter, searchQuery]);

  const inspectedFile = useMemo(
    () => files.find((f) => f.id === inspectedFileId) ?? null,
    [files, inspectedFileId]
  );

  const getFolderNameById = useCallback(
    (folderId: string | null) => {
      if (!folderId) return "Home Directory";
      return folders.find((f) => f.id === folderId)?.name ?? "Folder";
    },
    [folders]
  );

  const handleUploadFiles = useCallback(
    async (incoming: File[]) => {
      const validFiles: File[] = [];
      for (const file of incoming) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          pushToast({
            title: "File too large",
            description: `${file.name} exceeds the 25 MB limit.`,
            variant: "destructive",
          });
          continue;
        }
        if (BLOCKED_EXECUTABLE_REGEX.test(file.name)) {
          pushToast({
            title: "File type not allowed",
            description: `${file.name} is an executable type and cannot be uploaded.`,
            variant: "destructive",
          });
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setUploading(true);
      try {
        const formData = new FormData();
        if (currentFolderId) {
          formData.append("folderId", currentFolderId);
        }
        for (const file of validFiles) {
          formData.append("files", file);
        }

        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          pushToast({
            title: "Upload failed",
            description: data.error || "Could not upload files.",
            variant: "destructive",
          });
          return;
        }

        const uploadedCount = Array.isArray(data.files) ? data.files.length : 0;
        if (uploadedCount > 0) {
          pushToast({
            title: "Files uploaded",
            description: `${uploadedCount} ${uploadedCount === 1 ? "file" : "files"} added to ${
              currentFolderId ? currentFolder?.name || "folder" : "Home Directory"
            }.`,
            variant: "success",
          });
        }
        if (Array.isArray(data.rejected) && data.rejected.length > 0) {
          for (const item of data.rejected) {
            pushToast({
              title: `Skipped ${item.name}`,
              description: item.reason,
              variant: "destructive",
            });
          }
        }
        await refreshAll();
      } catch {
        pushToast({
          title: "Upload failed",
          description: "A network error occurred while uploading.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [currentFolderId, currentFolder?.name, pushToast, refreshAll]
  );

  const handleCreateFolder = async (name: string) => {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parent_id: currentFolderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast({
          title: "Failed to create folder",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      pushToast({
        title: "Folder created",
        description: name,
        variant: "success",
      });
      await fetchFolders();
    } catch {
      pushToast({
        title: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleRenameSubmit = async (nextName: string) => {
    if (!renameTarget) return;
    try {
      const endpoint =
        renameTarget.kind === "file"
          ? `/api/files/${encodeURIComponent(renameTarget.file.id)}`
          : `/api/folders/${encodeURIComponent(renameTarget.folder.id)}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast({
          title: "Rename failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      pushToast({
        title: renameTarget.kind === "file" ? "File renamed" : "Folder renamed",
        description: nextName,
        variant: "success",
      });
      await refreshAll();
    } catch {
      pushToast({
        title: "Rename failed",
        variant: "destructive",
      });
    }
  };

  const handleMoveFile = async (
    fileId: string,
    targetFolderId: string | null,
    targetName?: string
  ) => {
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: targetFolderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast({
          title: "Move failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      pushToast({
        title: "File moved",
        description: `Moved to ${targetName ?? getFolderNameById(targetFolderId)}.`,
        variant: "success",
      });
      await refreshAll();
    } catch {
      pushToast({
        title: "Move failed",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async (
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!deleteTarget) return { ok: false, error: "Nothing selected." };

    try {
      let res: Response;
      if (deleteTarget.kind === "file") {
        res = await fetch(
          `/api/files/${encodeURIComponent(deleteTarget.file.id)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          }
        );
      } else if (deleteTarget.kind === "folder") {
        res = await fetch(
          `/api/folders/${encodeURIComponent(deleteTarget.folder.id)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          }
        );
      } else {
        res = await fetch("/api/files/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, folderId: deleteTarget.folderId }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || "Incorrect password. Deletion blocked.",
        };
      }

      if (
        deleteTarget.kind === "file" &&
        inspectedFileId === deleteTarget.file.id
      ) {
        setInspectedFileId(null);
      }
      if (
        deleteTarget.kind === "folder" &&
        currentFolderId === deleteTarget.folder.id
      ) {
        setCurrentFolderId(deleteTarget.folder.parent_id);
      }
      if (deleteTarget.kind === "clear-folder") {
        setInspectedFileId(null);
      }

      pushToast({
        title:
          deleteTarget.kind === "folder"
            ? "Folder deleted"
            : deleteTarget.kind === "clear-folder"
              ? "Folder cleared"
              : "File deleted",
        variant: "success",
      });
      await refreshAll();
      return { ok: true };
    } catch {
      return { ok: false, error: "Request failed. Please try again." };
    }
  };

  const handleDownloadFile = (file: FileRecord) => {
    const link = document.createElement("a");
    link.href = `/api/files/${encodeURIComponent(file.id)}/download`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopyAllText = async () => {
    const readable = visibleFiles.filter(
      (f) => typeof f.content === "string" && f.content.length > 0
    );
    if (readable.length === 0) {
      pushToast({
        title: "No text files",
        description: "Nothing readable to copy in this view.",
        variant: "destructive",
      });
      return;
    }
    try {
      const combined = readable
        .map((f) => `// ===== ${f.name} =====\n${f.content}`)
        .join("\n\n");
      await navigator.clipboard.writeText(combined);
      setCopiedAll(true);
      pushToast({
        title: "All copied",
        description: `Copied ${readable.length} ${readable.length === 1 ? "file" : "files"} to clipboard.`,
        variant: "success",
      });
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      pushToast({
        title: "Failed to copy",
        description: "Clipboard permission denied.",
        variant: "destructive",
      });
    }
  };

  const folderTitle = currentFolder?.name || "Home Directory";

  const deleteModalProps = (() => {
    if (!deleteTarget) {
      return { title: "", description: "" };
    }
    if (deleteTarget.kind === "file") {
      return {
        title: "Delete File?",
        description: `Enter the password to permanently delete "${deleteTarget.file.name}".`,
      };
    }
    if (deleteTarget.kind === "folder") {
      return {
        title: "Delete Folder?",
        description: `Enter the password to delete "${deleteTarget.folder.name}" and all nested contents.`,
      };
    }
    return {
      title: "Clear All Files?",
      description: `Enter the password to delete all files inside "${deleteTarget.folderName}". This cannot be undone.`,
    };
  })();

  const filterTabs: { id: FileCategoryFilter; label: string }[] = [
    { id: "all", label: `All Files (${files.length})` },
    { id: "text", label: "Text & Code" },
    { id: "images", label: "Images" },
    { id: "other", label: "Documents" },
  ];

  const gridCols = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <TopBar
        breadcrumbs={breadcrumbPath}
        currentFolderId={currentFolderId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectFolder={(folderId) => {
          setCurrentFolderId(folderId);
          setInspectedFileId(null);
          setCategoryFilter("all");
        }}
        onFileDropOnFolder={(fileId, targetFolderId, targetName) => {
          handleMoveFile(fileId, targetFolderId, targetName);
        }}
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex-1 w-full max-w-[1600px] mx-auto flex min-h-0">
        <FolderSidebar
          folders={folders}
          currentFiles={files}
          currentFolderId={currentFolderId}
          categoryFilter={categoryFilter}
          stats={stats}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onSelectFolder={(folderId) => {
            setCurrentFolderId(folderId);
            setInspectedFileId(null);
            setCategoryFilter("all");
          }}
          onSelectCategory={setCategoryFilter}
          onNewFolder={() => setNewFolderOpen(true)}
          onFileDropOnFolder={(fileId, targetFolderId, targetName) => {
            handleMoveFile(fileId, targetFolderId, targetName);
          }}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 lg:py-8 space-y-6">
          {/* ── Top Workspace Header Row ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-preserved text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">
                {folderTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setNewFolderOpen(true)}
                aria-label="New subfolder"
                title="New subfolder"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-300 shadow-xs transition-colors shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  height="22px"
                  width="22px"
                  fill="#EA3323"
                  aria-hidden="true"
                >
                  <path d="M11,17h2V12.8l1.6,1.6L16,13L12,9L8,13l1.4,1.4L11,12.8V17ZM4,20q-0.82,0-1.41-0.59T2,18V6Q2,5.18 2.59,4.59T4,4h6l2,2h8q0.83,0 1.41,0.59Q22,7.18 22,8V18q0,0.82-0.59,1.41T20,20H4Zm0-2H20V8H11.18l-2-2H4V18Zm0,0V6V8V18Z" />
                </svg>
              </button>

              {files.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyAllText}
                    aria-label={copiedAll ? "Copied all files" : "Copy all files"}
                    title={copiedAll ? "Copied all files" : "Copy all files"}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-300 shadow-xs transition-colors shrink-0"
                  >
                    {copiedAll ? (
                      <CheckCheck className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        height="22px"
                        width="22px"
                        fill="#EA3323"
                        aria-hidden="true"
                      >
                        <path d="M3,18.5v-2H5v2H3ZM3,15V13H5v2H3Zm0-3.5v-2H5v2H3ZM6.5,22V20h2v2h-2ZM9,18q-0.82,0-1.41-0.59T7,16V4Q7,3.17 7.59,2.59T9,2h9q0.82,0 1.41,0.59T20,4V16q0,0.82-0.59,1.41T18,18H9Zm0-2h9V4H9V16Zm1,6V20h2v2H10ZM5,22q-0.83,0-1.41-0.59T3,20H5v2Zm8.5,0V20h2q0,0.82-0.59,1.41T13.5,22ZM3,8Q3,7.18 3.59,6.59T5,6V8H3Zm10.5,2Z" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "clear-folder",
                        folderId: currentFolderId,
                        folderName: currentFolder?.name || "Home Directory",
                      })
                    }
                    aria-label="Purge all files"
                    title="Purge all files"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Pastel Gradient Upload DropZone ── */}
          <DropZone
            onFilesAdded={handleUploadFiles}
            disabled={uploading}
            currentFolderName={currentFolder?.name || "Drag Drop"}
          />

          {/* ── Segmented Filter Bar & View Toolbar ── */}
          {(visibleFolders.length > 0 ||
            files.length > 0 ||
            searchQuery.length > 0) && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div
                role="tablist"
                aria-label="Filter files by type"
                className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 border border-slate-200/80 overflow-x-auto max-w-full"
              >
                {filterTabs.map((tab) => {
                  const active = categoryFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                        active
                          ? "bg-white text-slate-900 font-semibold shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter current view..."
                    aria-label="Filter current view"
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#155eef] focus:ring-3 focus:ring-blue-100 transition"
                  />
                </div>

                <div
                  role="group"
                  aria-label="Layout view"
                  className="flex items-center gap-0.5 p-1 rounded-xl border border-slate-200 bg-white"
                >
                  {(
                    [
                      { mode: "list", label: "List view", Icon: List },
                      { mode: "grid", label: "Grid view", Icon: LayoutGrid },
                    ] as const
                  ).map(({ mode, label, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLayoutMode(mode)}
                      aria-label={label}
                      aria-pressed={layoutMode === mode}
                      className={`p-1.5 rounded-lg transition-colors ${
                        layoutMode === mode
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Subfolders ── */}
          {visibleFolders.length > 0 && (
            <section aria-label="Folders" className="space-y-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Subfolders · <span className="tabular-nums">{visibleFolders.length}</span>
              </h2>
              <div
                className={layoutMode === "grid" ? gridCols : "flex flex-col gap-2.5"}
              >
                {visibleFolders.map((folder) => (
                  <FolderRow
                    key={folder.id}
                    folder={folder}
                    layout={layoutMode}
                    onOpen={() => {
                      setCurrentFolderId(folder.id);
                      setInspectedFileId(null);
                      setCategoryFilter("all");
                    }}
                    onRename={() => setRenameTarget({ kind: "folder", folder })}
                    onDelete={() => setDeleteTarget({ kind: "folder", folder })}
                    onFileDrop={(fileId) =>
                      handleMoveFile(fileId, folder.id, folder.name)
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Uploaded Files ── */}
          {loadingFiles ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="h-16 rounded-2xl border border-slate-200 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : visibleFiles.length > 0 ? (
            <section aria-label="Files" className="space-y-2.5 pb-8">
              <div
                className={layoutMode === "grid" ? gridCols : "flex flex-col gap-2.5"}
              >
                {visibleFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    layout={layoutMode}
                    isInspected={inspectedFileId === file.id}
                    onInspect={() =>
                      setInspectedFileId((prev) =>
                        prev === file.id ? null : file.id
                      )
                    }
                    onDownload={() => handleDownloadFile(file)}
                    onMove={() => setMoveTarget(file)}
                    onRename={() => setRenameTarget({ kind: "file", file })}
                    onDelete={() => setDeleteTarget({ kind: "file", file })}
                    onNotifyCopied={(fileName) =>
                      pushToast({
                        title: "Copied",
                        description: `Copied ${fileName} contents to clipboard.`,
                        variant: "success",
                      })
                    }
                    onNotifyCopyError={() =>
                      pushToast({
                        title: "Cannot copy",
                        description: "This file does not contain readable text.",
                        variant: "destructive",
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ) : files.length > 0 || searchQuery.trim().length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No matching files or folders
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your search or switching back to All Files.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
                className="mt-3 text-xs font-semibold text-[#155eef] hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : null}
        </main>

        <InspectorDrawer
          file={inspectedFile}
          folderName={
            inspectedFile
              ? getFolderNameById(inspectedFile.folder_id)
              : "Home Directory"
          }
          onClose={() => setInspectedFileId(null)}
          onDownload={handleDownloadFile}
          onMove={(file) => setMoveTarget(file)}
          onRename={(file) => setRenameTarget({ kind: "file", file })}
          onDelete={(file) => setDeleteTarget({ kind: "file", file })}
          onNotifyCopied={(fileName) =>
            pushToast({
              title: "Copied",
              description: `Copied ${fileName} contents to clipboard.`,
              variant: "success",
            })
          }
          onNotifyCopyError={() =>
            pushToast({
              title: "Cannot copy",
              description: "Failed to write to clipboard.",
              variant: "destructive",
            })
          }
        />
      </div>

      <NewFolderModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreate={handleCreateFolder}
        parentName={currentFolder?.name}
      />

      <PasswordDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteModalProps.title}
        description={deleteModalProps.description}
      />

      <RenameModal
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        currentName={
          renameTarget
            ? renameTarget.kind === "file"
              ? renameTarget.file.name
              : renameTarget.folder.name
            : ""
        }
        itemLabel={renameTarget?.kind === "folder" ? "Folder" : "File"}
        onRename={handleRenameSubmit}
      />

      <MoveFileModal
        open={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        fileName={moveTarget?.name ?? ""}
        currentFolderId={moveTarget?.folder_id ?? null}
        folders={folders}
        onMove={async (targetFolderId) => {
          if (moveTarget) {
            await handleMoveFile(moveTarget.id, targetFolderId);
          }
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
