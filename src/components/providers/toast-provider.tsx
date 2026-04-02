"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
    id: number;
    title: string;
    kind: ToastKind;
}

interface ToastContextValue {
    success: (title: string) => void;
    error: (title: string) => void;
    info: (title: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function toastClasses(kind: ToastKind): string {
    if (kind === "success") {
        return "border-emerald-300 bg-emerald-50 text-emerald-900";
    }

    if (kind === "error") {
        return "border-rose-300 bg-rose-50 text-rose-900";
    }

    return "border-slate-300 bg-white text-slate-900";
}

export function AppToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const pushToast = useCallback((kind: ToastKind, title: string) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);

        setToasts((previous) => [...previous, { id, kind, title }]);

        window.setTimeout(() => {
            setToasts((previous) => previous.filter((toast) => toast.id !== id));
        }, 3200);
    }, []);

    const value = useMemo<ToastContextValue>(
        () => ({
            success: (title) => pushToast("success", title),
            error: (title) => pushToast("error", title),
            info: (title) => pushToast("info", title),
        }),
        [pushToast],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-md ${toastClasses(toast.kind)}`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.title}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used within AppToastProvider");
    }

    return context;
}
