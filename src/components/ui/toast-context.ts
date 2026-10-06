import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning';

export type Toast = {
  id: number;
  title: string;
  type: ToastType;
  details?: string[];
};

export type ToastContextValue = {
  toast: (message: Omit<Toast, 'id'>) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }

  return context;
}
