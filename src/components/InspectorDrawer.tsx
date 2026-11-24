import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  FolderInput,
  ImageOff,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { FileRecord } from "../types";
import {
  formatBytes,
  formatRelativeTime,
  getFileExtensionLabel,
  isPreviewableImage,
} from "../lib/fileUtils";
import { FileTile } from "./Shared";

interface InspectorDrawerProps {
  file: FileRecord | null;
  folderName: string;
  onClose: () => void;
  onDownload: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onRename: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onNotifyCopied: (fileName: string) => void;
  onNotifyCopyError: () => void;
}

export function InspectorDrawer({
  file,
  folderName,
  onClose,
  onDownload,
  onMove,
  onRename,
  onDelete,
  onNotifyCopied,
  onNotifyCopyError,
}: InspectorDrawerProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [file?.id]);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  if (!file) return null;

  const isImage = isPreviewableImage(file.type);
  const hasText = typeof file.content === "string" && file.content.length > 0;

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

  const meta: { label: string; value: string }[] = [
    { label: "Size", value: formatBytes(file.size) },
    { label: "Type", value: file.type || "unknown" },
    { label: "Location", value: folderName },
    {
      label: "Uploaded",
      value: `${new Date(file.created_at).toLocaleString()} (${formatRelativeTime(file.created_at)})`,
    },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-xs xl:hidden animate-fade"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="File details"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] flex flex-col bg-white border-l border-slate-200 shadow-2xl animate-slide-left xl:static xl:z-10 xl:w-[360px] xl:shrink-0 xl:border-l xl:border-slate-200/80 xl:shadow-none xl:sticky xl:top-16 xl:self-start xl:h-[calc(100vh-4rem)]"
      >
        <div className="flex items-start gap-3 p-5 border-b border-slate-100">
          <FileTile name={file.name} type={file.type} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-mono font-semibold text-[#155eef]">
              {getFileExtensionLabel(file.name)}
            </p>
            <h3
              className="fredericka-the-great-regular text-lg text-slate-900 break-words leading-snug mt-0.5"
              title={file.name}
            >
              {file.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin p-5 space-y-5">
          <section aria-label="Preview">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
              Preview
            </h4>
            {isImage && !imageFailed ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={`/api/files/${encodeURIComponent(file.id)}/download`}
                  alt={file.name}
                  onError={() => setImageFailed(true)}
                  className="w-full max-h-72 object-contain rounded-lg"
                />
              </div>
            ) : hasText ? (
              <pre className="rounded-xl bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed p-4 max-h-72 overflow-auto scroll-thin whitespace-pre-wrap break-words border border-slate-800">
                {file.content!.length > 4000
                  ? `${file.content!.slice(0, 4000)}\n\n… (${formatBytes(file.size)} total — copy or download for the full file)`
                  : file.content}
              </pre>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 py-8 text-center">
                <ImageOff className="w-6 h-6 mx-auto text-slate-400" />
                <p className="text-xs text-slate-500 mt-2">
                  No preview available for this file.
                </p>
              </div>
            )}
          </section>

          <section aria-label="Details">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
              Details
            </h4>
            <dl className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
              {meta.map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-4 px-3.5 py-2.5 text-xs"
                >
                  <dt className="text-slate-500 shrink-0">{row.label}</dt>
                  <dd className="font-medium font-mono text-slate-900 text-right break-all tabular-nums">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDownload(file)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#155eef] text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy text
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onMove(file)}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FolderInput className="w-3.5 h-3.5" />
              Move
            </button>
            <button
              type="button"
              onClick={() => onRename(file)}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => onDelete(file)}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-rose-200 bg-rose-50/70 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
