import type { ReactNode } from "react";
import { FileCode, FileImage, FileText } from "lucide-react";
import { isPreviewableImage, isTextReadableFile } from "../lib/fileUtils";

/** Colour-coded file icon tile: images = orange, text/code = blue, other = gold */
export function FileTile({
  name,
  type,
  size = "md",
}: {
  name: string;
  type: string;
  size?: "md" | "lg";
}) {
  const isImg = isPreviewableImage(type);
  const isText = isTextReadableFile(name, type);
  const Icon = isImg ? FileImage : isText ? FileCode : FileText;
  const tone = isImg
    ? "bg-ember-100 text-ember-700 ring-ember-200"
    : isText
      ? "bg-royal-100 text-royal-700 ring-royal-200"
      : "bg-gold-100 text-gold-600 ring-gold-200";
  const dims = size === "lg" ? "w-14 h-14 rounded-2xl" : "w-10 h-10 rounded-xl";
  return (
    <div
      className={`${dims} ${tone} ring-1 flex items-center justify-center shrink-0`}
    >
      <Icon className={size === "lg" ? "w-7 h-7" : "w-5 h-5"} />
    </div>
  );
}

export function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? "text-royal-400 hover:text-rose-600 hover:bg-rose-50"
          : "text-royal-400 hover:text-royal-700 hover:bg-royal-100"
      }`}
    >
      {children}
    </button>
  );
}
