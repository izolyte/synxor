import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "~/shared/ui/button";
import type { RoomCloseAck } from "~/features/room/constants/room-events";

/**
 * Sender-only teardown: a destructive action tucked at the edge of the Room, so
 * it never sits in the primary send flow. First click arms an inline confirm
 * (no modal); confirming closes the Room, and on success the Sender is sent home
 * — the Room it's looking at no longer exists.
 */
export function DeleteRoomControl({ onClose }: { onClose: () => Promise<RoomCloseAck> }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    setDeleting(true);
    setFailed(false);
    const ack = await onClose();
    if ("error" in ack) {
      // Server refused (or no live socket) — keep the Room and let the Sender retry.
      setDeleting(false);
      setFailed(true);
      return;
    }
    navigate({ to: "/" });
  };

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="self-end text-[var(--destructive)] hover:text-[var(--destructive)]"
        onClick={() => setConfirming(true)}
      >
        Delete Room
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Delete this Room? Everyone is kicked out and all files, links, and text are removed.
      </p>
      <div className="flex gap-3 self-end">
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
          Keep Room
        </Button>
        <Button variant="destructive" size="sm" onClick={remove} loading={deleting}>
          Yes, delete
        </Button>
      </div>
      {failed && (
        <p className="self-end text-sm text-[var(--destructive)]">
          Couldn&apos;t close the Room — try again.
        </p>
      )}
    </div>
  );
}
