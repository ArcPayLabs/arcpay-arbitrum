import { BadgeCheck } from "lucide-react";
import { PageHeader as AppPageHeader } from "./app/PageHeader";

export function PageHeader({
  eyebrow,
  title,
  description,
  badges = [],
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly badges?: readonly string[];
}) {
  return (
    <>
      <AppPageHeader icon={BadgeCheck} eyebrow={eyebrow} title={title} description={description} />
      {badges.length ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
