import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, description, actionHref, actionLabel, onAction }: Props) {
  const action = actionLabel && (actionHref || onAction) ? (
    actionHref ? (
      <Link href={actionHref} className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">
        {actionLabel}
      </Link>
    ) : (
      <button onClick={onAction} className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="relative mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
  );
}
