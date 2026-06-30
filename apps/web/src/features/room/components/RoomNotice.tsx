import { Link } from "@tanstack/react-router";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { buttonVariants } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

/**
 * A terminal Room state: a headline, a one-line explanation, and the single way
 * forward (start a new Room). Shared by the expired and session-missing views, so
 * that layout and its call to action are defined once.
 */
export function RoomNotice({ title, message }: { title: string; message: string }) {
  return (
    <>
      <ScreenHeader title={title} />
      <p role="status" className="text-muted-foreground text-sm text-pretty">
        {message}
      </p>
      <Link to="/" className={cn(buttonVariants(), "w-full text-base")}>
        Create a new Room
      </Link>
    </>
  );
}
