import { createFileRoute } from "@tanstack/react-router";
import { JoinRoomPage } from "~/features/room/pages/JoinRoomPage";

export const Route = createFileRoute("/join")({
  // Accept an optional ?code so a Sender's shared link prefills the Room Code.
  validateSearch: (search: Record<string, unknown>): { code?: string } => {
    // A duplicated ?code= arrives as an array; take the first. Drop anything non-string.
    const raw = Array.isArray(search.code) ? search.code[0] : search.code;
    return typeof raw === "string" ? { code: raw } : {};
  },
  component: JoinRoomPage,
});
