import { Copy, Download, FolderInput, Pencil, Trash2 } from "lucide-react";
import type { FileRecord, LayoutMode } from "../types";
import {
  formatBytes,
  formatRelativeTime,
  getFileExtensionLabel,
  isPreviewableImage,
  isTextReadableFile,
} from "../lib/fileUtils";
import { FileTile, IconAction } from "./Shared";

interface FileRowProps {
  file: FileRecord;
  layout: LayoutMode;
  isInspected: boolean;
  onInspect: () => void;
  onDownload: () => void;
  onMove: () => void;
  onRename: () => void;
  onDelete: () => void;
  onNotifyCopied: (fileName: string) => void;
  onNotifyCopyError: () => void;
}

function getFileDescriptor(file: FileRecord): string {
  if (isPreviewableImage(file.type)) {
    return file.type || "Image asset";
  }
  if (isTextReadableFile(file.name, file.type)) {
    if (file.content) {
      const firstLine = file.content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);
      if (firstLine) {
        return firstLine.length > 70 ? `${firstLine.slice(0, 70)}…` : firstLine;
      }
    }
    return "Readable text or source file";
  }
  return file.type || "Stored file";
}

export function FileRow({
  file,
  layout,
  isInspected,
  onInspect,
  onDownload,
  onMove,
  onRename,
  onDelete,
  onNotifyCopied,
  onNotifyCopyError,
}: FileRowProps) {
  const handleCopy = async () => {
    if (!file.content) {
      onNotifyCopyError();
      return;
    }
    try {
      await navigator.clipboard.writeText(file.content);
      onNotifyCopied(file.name);
    } catch {
      onNotifyCopyError();
    }
  };

  const actions = (
    <div className="flex items-center gap-0.5 shrink-0 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <IconAction label="Copy contents" onClick={handleCopy}>
        <Copy className="w-4 h-4" />
      </IconAction>
      <IconAction label="Download" onClick={onDownload}>
        <Download className="w-4 h-4" />
      </IconAction>
      <IconAction label="Move to folder" onClick={onMove}>
        <FolderInput className="w-4 h-4" />
      </IconAction>
      <IconAction label="Rename" onClick={onRename}>
        <Pencil className="w-4 h-4" />
      </IconAction>
      <IconAction label="Delete" onClick={onDelete} danger>
        <Trash2 className="w-4 h-4" />
      </IconAction>
    </div>
  );

  const stateClasses = isInspected
    ? "border-[#155eef] bg-blue-50/40 ring-2 ring-blue-100 shadow-xs"
    : "border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-sm";

  const extLabel = getFileExtensionLabel(file.name);
  const descriptor = getFileDescriptor(file);

  const common = {
    role: "button" as const,
    tabIndex: 0,
    draggable: true,
    "aria-pressed": isInspected,
    onClick: onInspect,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onInspect();
      }
    },
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("application/x-file-id", file.id);
      e.dataTransfer.effectAllowed = "move";
    },
  };

  if (layout === "grid") {
    return (
      <div
        {...common}
        className={`group relative rounded-2xl border p-4 cursor-pointer transition-all ${stateClasses}`}
      >
        <div className="flex items-start justify-between gap-2">
          <FileTile name={file.name} type={file.type} size="lg" />
          <span className="text-[11px] font-mono font-medium text-slate-400">
            {extLabel}
          </span>
        </div>
        <p
          className="mt-3 text-sm font-semibold text-slate-900 truncate"
          title={file.name}
        >
          {file.name}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{descriptor}</p>
        <p className="text-[11px] font-mono text-slate-400 mt-2 tabular-nums">
          {formatBytes(file.size)} · {formatRelativeTime(file.created_at)}
        </p>
        <div className="mt-2.5 -mx-1.5 flex justify-end">{actions}</div>
      </div>
    );
  }

  return (
    <div
      {...common}
      className={`group flex items-center gap-3.5 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${stateClasses}`}
    >
      <FileTile name={file.name} type={file.type} />
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold text-slate-900 truncate"
          title={file.name}
        >
          {file.name}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          <span className="sm:hidden font-mono tabular-nums">
            {formatBytes(file.size)} · {formatRelativeTime(file.created_at)} ·{" "}
          </span>
          {descriptor}
        </p>
      </div>
      <span className="hidden sm:inline-block text-xs font-mono font-medium text-slate-500 w-12 text-right">
        {extLabel}
      </span>
      <span className="hidden sm:block w-24 text-right text-xs font-mono font-medium text-slate-700 tabular-nums">
        {formatBytes(file.size)}
      </span>
      <span className="hidden md:block w-20 text-right text-xs font-mono text-slate-400 tabular-nums">
        {formatRelativeTime(file.created_at)}
      </span>
      {actions}
    </div>
  );
}
