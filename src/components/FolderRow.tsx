import { ChevronRight, Folder, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FolderRecord, LayoutMode } from "../types";
import { IconAction } from "./Shared";

interface FolderRowProps {
  folder: FolderRecord;
  layout: LayoutMode;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onFileDrop: (fileId: string) => void;
}

export function FolderRow({
  folder,
  layout,
  onOpen,
  onRename,
  onDelete,
  onFileDrop,
}: FolderRowProps) {
  const [dropActive, setDropActive] = useState(false);
  const count = folder.item_count ?? 0;

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("application/x-file-id")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropActive(true);
      }
    },
    onDragLeave: () => setDropActive(false),
    onDrop: (e: React.DragEvent) => {
      const fileId = e.dataTransfer.getData("application/x-file-id");
      setDropActive(false);
      if (fileId) {
        e.preventDefault();
        onFileDrop(fileId);
      }
    },
  };

  const actions = (
    <div className="flex items-center gap-0.5 shrink-0 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <IconAction label="Rename folder" onClick={onRename}>
        <Pencil className="w-4 h-4" />
      </IconAction>
      <IconAction label="Delete folder" onClick={onDelete} danger>
        <Trash2 className="w-4 h-4" />
      </IconAction>
    </div>
  );

  const stateClasses = dropActive
    ? "border-pink-400 bg-pink-50/70 ring-2 ring-pink-200"
    : "border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-sm";

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  if (layout === "grid") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={onKeyDown}
        {...dropHandlers}
        className={`group rounded-2xl border p-4 cursor-pointer transition-all ${stateClasses}`}
      >
        <div className="flex items-start justify-between">
          <span className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/80 flex items-center justify-center">
            <Folder className="w-6 h-6" fill="currentColor" fillOpacity={0.14} />
          </span>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#155eef] group-hover:translate-x-0.5 transition-all" />
        </div>
        <p
          className="font-preserved mt-3 text-sm font-semibold text-slate-900 truncate"
          title={folder.name}
        >
          {folder.name}
        </p>
        <p className="text-xs font-mono text-slate-500 tabular-nums mt-0.5">
          {count} {count === 1 ? "item" : "items"}
        </p>
        <div className="mt-2.5 -mx-1.5 flex justify-end">{actions}</div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      {...dropHandlers}
      className={`group flex items-center gap-3.5 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${stateClasses}`}
    >
      <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/80 flex items-center justify-center shrink-0">
        <Folder className="w-5 h-5" fill="currentColor" fillOpacity={0.14} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="font-preserved text-sm font-semibold text-slate-900 truncate"
          title={folder.name}
        >
          {folder.name}
        </p>
        <p className="text-xs text-slate-500">Directory</p>
      </div>
      <span className="text-xs font-mono text-slate-500 tabular-nums">
        {count} {count === 1 ? "item" : "items"}
      </span>
      {actions}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#155eef] transition-colors shrink-0" />
    </div>
  );
}
