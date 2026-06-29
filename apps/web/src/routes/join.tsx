import { createFileRoute } from "@tanstack/react-router";
import { JoinRoomPage } from "~/features/room/pages/JoinRoomPage";

export const Route = createFileRoute("/join")({
  component: JoinRoomPage,
});
