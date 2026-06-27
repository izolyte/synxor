import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-6">
      <span className="text-muted-foreground font-mono text-xs font-medium tracking-[0.2em] uppercase">
        synxor
      </span>
      <Button>Transfer</Button>
    </main>
  );
}
