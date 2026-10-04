import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

type DetailDrawerProps = {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
};

export function DetailDrawer({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'md:w-[32rem]',
}: DetailDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-950/30"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Cerrar detalle"
        onClick={onClose}
      />
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden bg-white shadow-xl',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            {subtitle ? (
              <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-slate-100 hover:text-gray-700"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">{children}</div>

        {footer ? (
          <div className="border-t border-[#E2E8F0] bg-white p-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

type DetailSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DetailSection({
  title,
  description,
  actions,
  children,
}: DetailSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#0F766E]">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

type DetailFieldProps = {
  label: string;
  children: ReactNode;
};

export function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 text-sm break-words text-gray-900">{children}</div>
    </div>
  );
}