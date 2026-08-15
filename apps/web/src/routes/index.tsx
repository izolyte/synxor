import { createFileRoute } from "@tanstack/react-router";
import { CreateRoomPage } from "~/features/room/pages/CreateRoomPage";

export const Route = createFileRoute("/")({
  // The manifest "Paste text" shortcut lands here with ?compose=text — there's no
  // standalone text surface, snippets are sent from inside a Room. The flag just
  // tailors the header copy toward that intent.
  validateSearch: (search: Record<string, unknown>): { compose?: "text" } =>
    search.compose === "text" ? { compose: "text" } : {},
  component: CreateRoomPage,
});
