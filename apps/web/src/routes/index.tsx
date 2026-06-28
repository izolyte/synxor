import { createFileRoute } from "@tanstack/react-router";
import { CreateRoomPage } from "~/features/room/pages/CreateRoomPage";

export const Route = createFileRoute("/")({
  component: CreateRoomPage,
});
