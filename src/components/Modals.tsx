import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Check,
  Folder,
  FolderInput,
  FolderPlus,
  Home,
  Loader2,
  Lock,
  Pencil,
  ShieldAlert,
  X,
} from "lucide-react";
import type { FolderRecord } from "../types";

/* ───────────── Shared modal shell ───────────── */

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = "blue",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  iconTone?: "blue" | "rose" | "amber";
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tone =
    iconTone === "rose"
      ? "bg-pink-50 text-pink-600 ring-1 ring-pink-200"
      : iconTone === "amber"
        ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
        : "bg-blue-50 text-[#155eef] ring-1 ring-blue-200";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-pop"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="fredericka-the-great-regular text-lg text-slate-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 break-words">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#155eef] focus:bg-white focus:ring-3 focus:ring-blue-100 transition";

function FooterButtons({
  onCancel,
  submitLabel,
  submitting,
  disabled,
  tone = "blue",
}: {
  onCancel: () => void;
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  tone?: "blue" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700"
      : "bg-[#155eef] hover:bg-blue-700";
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled || submitting}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${toneClass}`}
      >
        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

/* ───────────── New folder ───────────── */

export function NewFolderModal({
  open,
  onClose,
  onCreate,
  parentName,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
  parentName?: string;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onCreate(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="New Folder"
      subtitle={`Will be created inside ${parentName ?? "Home"}.`}
      icon={<FolderPlus className="w-5 h-5" />}
      iconTone="amber"
    >
      <form onSubmit={submit}>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Folder name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Project Assets"
          className={inputClass}
        />
        <FooterButtons
          onCancel={onClose}
          submitLabel="Create Folder"
          submitting={submitting}
          disabled={!name.trim()}
        />
      </form>
    </ModalShell>
  );
}

/* ───────────── Rename ───────────── */

export function RenameModal({
  open,
  onClose,
  currentName,
  itemLabel,
  onRename,
}: {
  open: boolean;
  onClose: () => void;
  currentName: string;
  itemLabel: string;
  onRename: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(currentName);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setSubmitting(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [open, currentName]);

  const unchanged = name.trim() === currentName;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || unchanged) return;
    setSubmitting(true);
    try {
      await onRename(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Rename ${itemLabel}`}
      subtitle={currentName}
      icon={<Pencil className="w-5 h-5" />}
      iconTone="blue"
    >
      <form onSubmit={submit}>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          New name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
          className={inputClass}
        />
        <FooterButtons
          onCancel={onClose}
          submitLabel="Save Name"
          submitting={submitting}
          disabled={!name.trim() || unchanged}
        />
      </form>
    </ModalShell>
  );
}

/* ───────────── Move file ───────────── */

export function MoveFileModal({
  open,
  onClose,
  fileName,
  currentFolderId,
  folders,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  fileName: string;
  currentFolderId: string | null;
  folders: FolderRecord[];
  onMove: (targetFolderId: string | null) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(currentFolderId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(currentFolderId);
      setSubmitting(false);
    }
  }, [open, currentFolderId]);

  const options = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const pathOf = (f: FolderRecord) => {
      const parts: string[] = [];
      let p: FolderRecord | undefined = f;
      let guard = 0;
      while (p && guard++ < 50) {
        parts.unshift(p.name);
        p = p.parent_id ? byId.get(p.parent_id) : undefined;
      }
      return parts;
    };
    return folders
      .map((f) => ({ id: f.id, parts: pathOf(f) }))
      .sort((a, b) => a.parts.join("/").localeCompare(b.parts.join("/")));
  }, [folders]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected === currentFolderId) return;
    setSubmitting(true);
    try {
      await onMove(selected);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const rowClass = (active: boolean, current: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-colors ${
      active
        ? "border-[#155eef] bg-blue-50 text-[#155eef]"
        : "border-transparent text-slate-700 hover:bg-slate-100"
    } ${current ? "opacity-60" : ""}`;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Move File"
      subtitle={fileName}
      icon={<FolderInput className="w-5 h-5" />}
      iconTone="blue"
    >
      <form onSubmit={submit}>
        <div className="max-h-64 overflow-y-auto scroll-thin space-y-1 pr-1">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={rowClass(selected === null, currentFolderId === null)}
          >
            <Home className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-preserved flex-1">Home Directory</span>
            {currentFolderId === null && (
              <span className="text-[10px] font-mono uppercase text-slate-400">
                current
              </span>
            )}
            {selected === null && <Check className="w-4 h-4 text-[#155eef]" />}
          </button>
          {options.map((opt) => (
            <button
              type="button"
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={rowClass(selected === opt.id, currentFolderId === opt.id)}
              style={{ paddingLeft: 12 + (opt.parts.length - 1) * 14 }}
            >
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-preserved flex-1 truncate">
                {opt.parts[opt.parts.length - 1]}
              </span>
              {currentFolderId === opt.id && (
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  current
                </span>
              )}
              {selected === opt.id && (
                <Check className="w-4 h-4 text-[#155eef]" />
              )}
            </button>
          ))}
        </div>
        <FooterButtons
          onCancel={onClose}
          submitLabel="Move Here"
          submitting={submitting}
          disabled={selected === currentFolderId}
        />
      </form>
    </ModalShell>
  );
}

/* ───────────── Password-protected delete ───────────── */

export function PasswordDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<{ ok: boolean; error?: string }>;
  title: string;
  description: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await onConfirm(password);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error || "Incorrect password.");
        setPassword("");
        inputRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      icon={<ShieldAlert className="w-5 h-5" />}
      iconTone="rose"
    >
      <form onSubmit={submit}>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Deletion password
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            placeholder="Enter password"
            className={`${inputClass} pl-10 ${error ? "!border-rose-400" : ""}`}
          />
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}
        <FooterButtons
          onCancel={onClose}
          submitLabel="Delete"
          submitting={submitting}
          disabled={!password}
          tone="danger"
        />
      </form>
    </ModalShell>
  );
}
