'use client';

import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from './utils';
import { registerToastHandler, type ToastInput, type ToastVariant } from '@/lib/toast-bus';

type ToastRecord = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return context;
}

const VARIANT_CLASS: Record<ToastVariant, string> = {
  default: 'border-border',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
  info: 'border-info',
};

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const duration = input.duration ?? 5000;
      setToasts((current) => [
        ...current,
        {
          id,
          title: input.title,
          description: input.description,
          variant: input.variant ?? 'default',
          duration,
        },
      ]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => {
            timers.current.delete(id);
            setToasts((current) => current.filter((item) => item.id !== id));
          }, duration),
        );
      }
      return id;
    },
    [],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  // Publish this provider's dispatcher so non-component code (the contexts)
  // can raise toasts without a hook.
  useEffect(() => {
    registerToastHandler(toast);
    return () => registerToastHandler(null);
  }, [toast]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-0 right-0 z-[100] flex w-full flex-col items-center gap-2 p-4 sm:bottom-auto sm:left-auto sm:top-0 sm:items-end sm:p-6">
        <div
          role="region"
          aria-label="Notifications"
          className="flex w-full max-w-sm flex-col items-end gap-2"
        >
          {toasts.map((item) => (
            <div
              key={item.id}
              role={item.variant === 'danger' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-md border-l-4 bg-card p-4 text-card-foreground shadow-md animate-enter-right',
                VARIANT_CLASS[item.variant],
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="-m-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast };
export type { ToastInput, ToastRecord, ToastVariant };
