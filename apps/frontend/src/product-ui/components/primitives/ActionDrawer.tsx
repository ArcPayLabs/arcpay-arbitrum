"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

type ActionDrawerProps = {
  readonly children: ReactNode;
  readonly description?: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly title: string;
};

export function ActionDrawer({ children, description, onClose, open, title }: ActionDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close drawer overlay" className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-border bg-background shadow-2xl sm:rounded-l-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {description ? <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
          </div>
          <button type="button" aria-label="Close drawer" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}
