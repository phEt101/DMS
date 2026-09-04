import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "error" | "success" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = "error") => {
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className={`toast toast--${toast.kind}`} role="alert" key={toast.id}>
            <span className="toast__icon" aria-hidden="true">
              {toast.kind === "error" ? "!" : toast.kind === "success" ? "✓" : "i"}
            </span>
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              aria-label="Close notification"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function useErrorToast(message: string) {
  const { showToast } = useToast();
  useEffect(() => {
    if (message) showToast(message, "error");
  }, [message, showToast]);
}
