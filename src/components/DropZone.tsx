import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { MAX_FILE_SIZE_BYTES, formatBytes } from "../lib/fileUtils";

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  currentFolderName: string;
}

const FORMAT_HINTS = [
  { ext: ".TXT", tone: "text-slate-600" },
  { ext: ".PY", tone: "text-[#155eef]" },
  { ext: ".JSON", tone: "text-amber-600" },
  { ext: ".CPP", tone: "text-emerald-600" },
  { ext: ".PDF", tone: "text-pink-600" },
  { ext: ".TS", tone: "text-violet-600" },
];

export function DropZone({
  onFilesAdded,
  disabled,
  currentFolderName,
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`Upload files to ${currentFolderName}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (disabled) return;
        const dropped = Array.from(e.dataTransfer.files);
        if (dropped.length > 0) onFilesAdded(dropped);
      }}
      className={`dropzone-mesh relative overflow-hidden rounded-2xl border-2 border-dashed px-6 py-9 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
        dragging
          ? "border-[#155eef] scale-[1.004] shadow-[0_14px_34px_-14px_rgba(21,94,239,0.45)]"
          : "border-indigo-200/90 hover:border-blue-400"
      } ${disabled ? "opacity-75 cursor-not-allowed" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files ? Array.from(e.target.files) : [];
          if (picked.length > 0) onFilesAdded(picked);
          e.target.value = "";
        }}
      />

      <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center mb-4">
        {disabled ? (
          <Loader2 className="w-6 h-6 text-[#155eef] animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            height="26px"
            width="26px"
            fill="#EA3323"
            aria-hidden="true"
          >
            <path d="M11,19h2V14.83l1.6,1.6L16,15l-4-4L8,15l1.43,1.4L11,14.83V19ZM6,22q-0.82,0-1.41-0.59T4,20V4Q4,3.17 4.59,2.59T6,2h8l6,6V20q0,0.82-0.59,1.41T18,22H6ZM13,9V4H6V20H18V9H13ZM6,4V9V4V9V20V4Z" />
          </svg>
        )}
      </div>

      <p className="fredericka-the-great-regular text-xl sm:text-2xl tracking-tight text-slate-900">
        {disabled ? (
          "Uploading your files…"
        ) : dragging ? (
          "Release to upload files"
        ) : (
          <>
            Drop files to store in{" "}
            <span className="font-preserved font-bold text-[#155eef]">
              {currentFolderName}
            </span>
          </>
        )}
      </p>

      <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5">
        Drag items straight here or{" "}
        <span className="text-[#155eef] font-semibold hover:underline underline-offset-4">
          browse your workspace
        </span>
        {" · "}Max {formatBytes(MAX_FILE_SIZE_BYTES)} per file
      </p>

      <div className="mt-4 flex items-center justify-center gap-3 flex-wrap text-[11px] font-mono font-medium">
        {FORMAT_HINTS.map((item, idx) => (
          <span key={item.ext} className="inline-flex items-center gap-3">
            <span className={item.tone}>{item.ext}</span>
            {idx < FORMAT_HINTS.length - 1 && (
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
