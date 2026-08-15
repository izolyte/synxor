import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "~/features/room/pages/LandingPage";

export const Route = createFileRoute("/")({
  // The manifest "Paste text" shortcut lands here with ?compose=text — there's no
  // standalone text surface, snippets are sent from inside a Room. The flag just
  // tailors the hero copy toward that intent.
  validateSearch: (search: Record<string, unknown>): { compose?: "text" } =>
    search.compose === "text" ? { compose: "text" } : {},
  component: LandingPage,
});
