import { createFileRoute } from "@tanstack/react-router";
import { RoomPage } from "~/features/room/pages/RoomPage";

export const Route = createFileRoute("/room/$roomCode")({
  component: RoomPage,
});
