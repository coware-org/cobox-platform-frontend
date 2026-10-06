import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { ToastContext } from './toast-context';
import type { Toast, ToastType } from './toast-context';

const toastAppearance: Record<ToastType, { Icon: typeof CheckCircle2; iconClassName: string; containerClassName: string }> = {
  success: {
    Icon: CheckCircle2,
    iconClassName: 'text-[#0F766E]',
    containerClassName: 'min-w-72',
  },
  error: {
    Icon: XCircle,
    iconClassName: 'text-[#EF4444]',
    containerClassName: 'min-w-72',
  },
  warning: {
    Icon: AlertTriangle,
    iconClassName: 'text-[#D97706]',
    containerClassName: 'min-w-72 max-w-md',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: Omit<Toast, 'id'>) => {
    const id = Date.now();
    setToasts((current) => [...current, { ...message, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] space-y-2">
        {toasts.map((item) => {
          const { Icon, iconClassName, containerClassName } = toastAppearance[item.type];
          const details = item.details ?? [];

          return (
            <div
              key={item.id}
              className={`flex ${containerClassName} items-start gap-3 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${iconClassName}`} />
              <div className="min-w-0">
                <p>{item.title}</p>
                {details.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-xs font-normal text-[#64748B]">
                    {details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
