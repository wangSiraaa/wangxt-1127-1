import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let listeners: ((toast: ToastItem) => void)[] = [];

export const showToast = (message: string, type: ToastType = "info") => {
  const toast: ToastItem = {
    id: Math.random().toString(36).slice(2),
    type,
    message,
  };
  listeners.forEach((l) => l(toast));
};

const styleMap: Record<ToastType, { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: CheckCircle2 },
  error: { bg: "bg-red-50 border-red-200 text-red-800", icon: AlertCircle },
  warning: { bg: "bg-amber-50 border-amber-200 text-amber-800", icon: AlertCircle },
  info: { bg: "bg-blue-50 border-blue-200 text-blue-800", icon: Info },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80 pointer-events-none">
      {toasts.map((t) => {
        const style = styleMap[t.type];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            className={`${style.bg} border rounded-lg p-3 shadow-lg flex items-start gap-3 pointer-events-auto animate-fade-in`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">{t.message}</div>
            <button
              onClick={() => remove(t.id)}
              className="opacity-60 hover:opacity-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
