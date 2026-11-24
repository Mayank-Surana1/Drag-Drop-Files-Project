export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const BLOCKED_EXECUTABLE_REGEX =
  /\.(exe|bat|cmd|com|msi|scr|dll|sh|app|jar|vbs|ps1)$/i;

export const TEXT_READABLE_REGEX =
  /\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|yaml|yml|csv|log|env|gitignore|py|rb|go|rs|java|c|cpp|h|hpp|bash|zsh|sql|graphql)$/i;

export const SAFE_PREVIEW_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(2))} ${units[idx]}`;
}

export function formatRelativeTime(isoDate: string): string {
  const diffSeconds = (Date.now() - new Date(isoDate).getTime()) / 1000;
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export function getFileExtensionLabel(name: string): string {
  const parts = name.split(".");
  if (parts.length < 2) return "FILE";
  return (parts.pop() || "FILE").toUpperCase().slice(0, 4);
}

export function isTextReadableFile(name: string, mimeType: string): boolean {
  return (
    TEXT_READABLE_REGEX.test(name) ||
    mimeType.startsWith("text/") ||
    /json|javascript|typescript|xml|yaml/.test(mimeType)
  );
}

export function isPreviewableImage(mimeType: string): boolean {
  return SAFE_PREVIEW_IMAGE_TYPES.has(mimeType);
}
