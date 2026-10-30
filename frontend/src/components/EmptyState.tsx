import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center border border-dashed border-border bg-card px-6 py-20 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">{icon}</div>
      <h2 className="mt-6 font-heading text-2xl font-medium">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className={buttonVariants({ className: "mt-8 min-w-44" })} data-testid={testId ? `${testId}-action` : undefined}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
