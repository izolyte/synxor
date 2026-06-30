import { Wordmark } from "~/shared/components/Wordmark";

/**
 * The shared screen header: the wordmark, a title, and an optional description.
 * Every route-level screen opens with this, so the brand lockup and heading scale
 * live in one place. `descriptionId` lets a form field point its
 * aria-describedby at the description.
 */
export function ScreenHeader({
  title,
  description,
  descriptionId,
}: {
  title: string;
  description?: string;
  descriptionId?: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <Wordmark>synxor</Wordmark>
      <h1 className="text-foreground text-3xl font-bold tracking-[var(--tracking-tight)]">
        {title}
      </h1>
      {description && (
        <p id={descriptionId} className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      )}
    </header>
  );
}
