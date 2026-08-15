import type { PresenceChange } from "~/features/room/hooks/useRoomSocket";
import type { ParticipantIdentity } from "~/features/room/constants/transfer";
import { usePresenceNotice } from "~/features/room/hooks/usePresenceNotice";
import { ParticipantAvatar } from "~/features/room/components/ParticipantAvatar";

/**
 * Ephemeral join/leave nudge: "{name} joined" / "{name} left" surfaces once as a
 * Participant comes or goes, then clears itself — nothing persisted, in step with
 * the other house notices. The identity's avatar carries its colour so it reads as
 * *that* person. role="status" (not alert): presence is ambient, so a screen
 * reader hears it politely without stealing focus. Non-interactive, and reduced
 * motion skips the entrance. Renders nothing between notices.
 */
export function PresenceNotice({
  change,
  self,
  /** Test seam — how long each notice stays up. */
  displayMs,
}: {
  change: PresenceChange | null;
  self: ParticipantIdentity | undefined;
  displayMs?: number;
}) {
  const notice = usePresenceNotice(change, self, displayMs);
  if (!notice) return null;

  const verb = notice.type === "join" ? "joined" : "left";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-toast)] flex justify-center p-[var(--space-4)]"
      style={{ paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))" }}
    >
      <div
        // Re-keyed per change so a back-to-back notice replays the entrance.
        key={notice.seq}
        role="status"
        className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-surface-raised)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-ink)] shadow-[var(--shadow-lg)] motion-safe:animate-[delivery-flash-in_var(--duration-slow)_var(--ease-out)]"
      >
        <ParticipantAvatar name={notice.identity.name} colorKey={notice.identity.colorKey} size="sm" />
        <span>
          <span className="font-medium">{notice.identity.name}</span> {verb}
        </span>
      </div>
    </div>
  );
}
