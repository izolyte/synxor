import { getRouteApi } from "@tanstack/react-router";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ScreenColumn } from "~/shared/components/ScreenColumn";
import { ScreenHeader } from "~/shared/components/ScreenHeader";
import { RoomShareView } from "~/features/room/components/RoomShareView";
import { RoomNotice } from "~/features/room/components/RoomNotice";
import { useRoomSession } from "~/features/room/hooks/useRoomSession";
import { useRoomTransferHistory } from "~/features/room/hooks/useTransferLog";
import { sessionRole } from "~/features/room/services/room-session.service";

const route = getRouteApi("/room/$roomCode");

/**
 * Sender Room view: resolves the per-tab session for the code, then shows the share
 * view, the missing-session notice, or a brief neutral shell while it resolves.
 */
export function RoomPage() {
  const { roomCode } = route.useParams();
  const session = useRoomSession(roomCode);
  // Fetched at the route so the Transfer Log's history rides the router's query
  // context; RoomShareView (also rendered bare in tests) takes it as a prop.
  const transferHistory = useRoomTransferHistory(roomCode);

  return (
    <CenteredScreen>
      <ScreenColumn>
        {session.status === "loading" ? (
          <ScreenHeader title="Room" description="Preparing Room…" />
        ) : session.status === "ready" ? (
          <RoomShareView
            roomCode={roomCode}
            expiresAt={session.session.expiresAt}
            token={session.session.token}
            role={sessionRole(session.session)}
            transferHistory={transferHistory}
          />
        ) : (
          <RoomNotice
            title="Room unavailable"
            message="Open this Room on the device and tab where you created it. To send files from here, start a new Room."
          />
        )}
      </ScreenColumn>
    </CenteredScreen>
  );
}
