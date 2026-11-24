import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
  Layers,
  X,
} from "lucide-react";
import type { FileRecord, FolderRecord, WorkspaceStats } from "../types";
import {
  formatBytes,
  isPreviewableImage,
  isTextReadableFile,
} from "../lib/fileUtils";

export type FileCategoryFilter = "all" | "text" | "images" | "other";

interface FolderSidebarProps {
  folders: FolderRecord[];
  currentFiles: FileRecord[];
  currentFolderId: string | null;
  categoryFilter: FileCategoryFilter;
  stats: WorkspaceStats;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectFolder: (folderId: string | null) => void;
  onSelectCategory: (cat: FileCategoryFilter) => void;
  onNewFolder: () => void;
  onFileDropOnFolder: (
    fileId: string,
    targetFolderId: string | null,
    targetName: string
  ) => void;
}

const FILE_MIME = "application/x-file-id";

export function FolderSidebar({
  folders,
  currentFiles,
  currentFolderId,
  categoryFilter,
  stats,
  mobileOpen,
  onCloseMobile,
  onSelectFolder,
  onSelectCategory,
  onNewFolder,
  onFileDropOnFolder,
}: FolderSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<string | "home" | null>(null);

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, FolderRecord[]>();
    for (const f of folders) {
      const list = map.get(f.parent_id) ?? [];
      list.push(f);
      map.set(f.parent_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [folders]);

  useEffect(() => {
    if (!currentFolderId) return;
    const byId = new Map(folders.map((f) => [f.id, f]));
    const next = new Set<string>();
    let pointer = byId.get(currentFolderId)?.parent_id ?? null;
    while (pointer) {
      next.add(pointer);
      pointer = byId.get(pointer)?.parent_id ?? null;
    }
    if (next.size > 0) {
      setExpanded((prev) => new Set([...prev, ...next]));
    }
  }, [currentFolderId, folders]);

  const categoryBreakdown = useMemo(() => {
    let textCount = 0;
    let textBytes = 0;
    let imgCount = 0;
    let imgBytes = 0;
    let otherCount = 0;
    let otherBytes = 0;

    for (const f of currentFiles) {
      if (isPreviewableImage(f.type)) {
        imgCount += 1;
        imgBytes += f.size;
      } else if (isTextReadableFile(f.name, f.type)) {
        textCount += 1;
        textBytes += f.size;
      } else {
        otherCount += 1;
        otherBytes += f.size;
      }
    }
    const folderBytes = Math.max(textBytes + imgBytes + otherBytes, 1);
    return {
      textCount,
      imgCount,
      otherCount,
      textPct: Math.round((textBytes / folderBytes) * 100),
      imgPct: Math.round((imgBytes / folderBytes) * 100),
      otherPct: Math.round((otherBytes / folderBytes) * 100),
    };
  }, [currentFiles]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const select = (id: string | null) => {
    onSelectFolder(id);
    onCloseMobile();
  };

  const dropProps = (key: string | "home", id: string | null, name: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(FILE_MIME)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      }
    },
    onDragLeave: () => setDropTarget((t) => (t === key ? null : t)),
    onDrop: (e: React.DragEvent) => {
      const fileId = e.dataTransfer.getData(FILE_MIME);
      setDropTarget(null);
      if (fileId) {
        e.preventDefault();
        onFileDropOnFolder(fileId, id, name);
      }
    },
  });

  const renderNode = (folder: FolderRecord, depth: number): React.ReactNode => {
    const kids = childrenMap.get(folder.id) ?? [];
    const isOpen = expanded.has(folder.id);
    const isActive = currentFolderId === folder.id;
    const isDrop = dropTarget === folder.id;
    return (
      <li key={folder.id}>
        <div
          {...dropProps(folder.id, folder.id, folder.name)}
          style={{ paddingLeft: 8 + depth * 14 }}
          className={`group flex items-center gap-1 pr-2.5 rounded-xl transition-all ${
            isDrop
              ? "bg-pink-50 ring-2 ring-pink-400"
              : isActive
                ? "bg-[#155eef] text-white shadow-[0_6px_16px_-6px_rgba(21,94,239,0.65)]"
                : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-900"
          }`}
        >
          <button
            type="button"
            onClick={() => toggle(folder.id)}
            aria-label={isOpen ? "Collapse" : "Expand"}
            aria-expanded={isOpen}
            className={`p-1 rounded-md shrink-0 ${
              kids.length === 0 ? "invisible" : ""
            } ${isActive ? "hover:bg-blue-500/40" : "hover:bg-slate-200/70"}`}
          >
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => select(folder.id)}
            className="flex-1 min-w-0 flex items-center gap-2 py-2.5 text-left text-[13px] font-medium"
            title={folder.name}
          >
            {isActive ? (
              <FolderOpen className="w-4 h-4 shrink-0 text-white" />
            ) : (
              <Folder className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
            )}
            <span className="font-preserved truncate">{folder.name}</span>
          </button>
          {typeof folder.item_count === "number" && (
            <span
              className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                isActive
                  ? "bg-white/20 text-white font-semibold"
                  : "text-slate-400"
              }`}
            >
              {folder.item_count}
            </span>
          )}
        </div>
        {isOpen && kids.length > 0 && (
          <ul className="mt-0.5 space-y-0.5">
            {kids.map((k) => renderNode(k, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const roots = childrenMap.get(null) ?? [];
  const homeActive = currentFolderId === null;

  const filterItems: {
    id: FileCategoryFilter;
    label: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: "all",
      label: "All Files",
      count: currentFiles.length,
      icon: <Layers className="w-3.5 h-3.5 text-slate-500" />,
    },
    {
      id: "text",
      label: "Text & Code",
      count: categoryBreakdown.textCount,
      icon: <FileCode className="w-3.5 h-3.5 text-[#155eef]" />,
    },
    {
      id: "images",
      label: "Images",
      count: categoryBreakdown.imgCount,
      icon: <FileImage className="w-3.5 h-3.5 text-pink-600" />,
    },
    {
      id: "other",
      label: "Documents",
      count: categoryBreakdown.otherCount,
      icon: <FileText className="w-3.5 h-3.5 text-amber-600" />,
    },
  ];

  const panelContent = (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Workspace
        </h2>
        <button
          type="button"
          onClick={onNewFolder}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#155eef] hover:bg-blue-50 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Folder</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin px-3 space-y-5">
        <div className="space-y-1">
          <div
            {...dropProps("home", null, "Home")}
            className={`rounded-xl transition-colors ${
              dropTarget === "home" ? "bg-pink-50 ring-2 ring-pink-400" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => select(null)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                homeActive
                  ? "bg-[#155eef] text-white shadow-[0_6px_16px_-6px_rgba(21,94,239,0.65)]"
                  : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-900"
              }`}
            >
              <Home
                className={`w-4 h-4 shrink-0 ${
                  homeActive ? "text-white" : "text-slate-400"
                }`}
              />
              <span className="font-preserved flex-1 text-left truncate">Home Directory</span>
            </button>
          </div>

          {roots.length > 0 && (
            <ul className="pt-0.5 space-y-0.5">
              {roots.map((f) => renderNode(f, 0))}
            </ul>
          )}
        </div>

        {/* Real interactive folder-type filter list */}
        <div>
          <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Folder Contents
          </h3>
          <div className="space-y-0.5">
            {filterItems.map((item) => {
              const active = categoryFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Storage Summary Card matching reference */}
      <div className="p-3.5 border-t border-slate-100">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-900">Storage Used</p>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {stats.totalFolders} dir
            </span>
          </div>
          <p className="fredericka-the-great-regular text-2xl tracking-tight text-slate-900 tabular-nums mt-2">
            {formatBytes(stats.totalSize)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            across {stats.totalFiles} stored{" "}
            {stats.totalFiles === 1 ? "file" : "files"}
          </p>

          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
            {currentFiles.length > 0 ? (
              <>
                {categoryBreakdown.textPct > 0 && (
                  <span
                    className="h-full bg-[#155eef] rounded-full"
                    style={{ width: `${categoryBreakdown.textPct}%` }}
                  />
                )}
                {categoryBreakdown.imgPct > 0 && (
                  <span
                    className="h-full bg-pink-500 rounded-full"
                    style={{ width: `${categoryBreakdown.imgPct}%` }}
                  />
                )}
                {categoryBreakdown.otherPct > 0 && (
                  <span
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${categoryBreakdown.otherPct}%` }}
                  />
                )}
              </>
            ) : (
              <span className="h-full w-full bg-slate-200/70 rounded-full" />
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
            <span>Code {categoryBreakdown.textCount}</span>
            <span>Media {categoryBreakdown.imgCount}</span>
            <span>Docs {categoryBreakdown.otherCount}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden animate-fade"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        aria-label="Folders"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-200 lg:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/assets/aistudio/image_3bc9add8.png"
                alt="Drag Drop logo"
                className="h-full w-full object-contain"
              />
            </span>
            <span className="font-preserved text-base font-bold text-slate-900">
              Drag <span className="text-[#155eef]">Drop</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close folders"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0">{panelContent}</div>
      </aside>

      {/* Desktop Left Sidebar Rail */}
      <aside
        aria-label="Folders"
        className="hidden lg:block w-64 shrink-0 border-r border-slate-200/80 bg-white sticky top-16 self-start h-[calc(100vh-4rem)]"
      >
        {panelContent}
      </aside>
    </>
  );
}
