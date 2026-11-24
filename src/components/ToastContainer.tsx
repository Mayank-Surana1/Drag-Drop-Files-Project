import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ToastItem } from "../types";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const VARIANTS = {
  default: {
    iconWrap: "bg-blue-50 text-[#155eef]",
    Icon: Info,
  },
  success: {
    iconWrap: "bg-emerald-50 text-emerald-600",
    Icon: CheckCircle2,
  },
  destructive: {
    iconWrap: "bg-rose-50 text-rose-600",
    Icon: AlertTriangle,
  },
} as const;

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-[80] flex flex-col gap-2.5 sm:w-96 pointer-events-none"
    >
      {toasts.map((toast) => {
        const v = VARIANTS[toast.variant ?? "default"];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-lg animate-toast-in"
          >
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${v.iconWrap}`}
            >
              <v.Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-bold text-slate-900 break-words">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-slate-500 mt-0.5 break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
