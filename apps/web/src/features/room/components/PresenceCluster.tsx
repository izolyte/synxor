import type { ParticipantIdentity } from "~/features/room/constants/transfer";
import { ParticipantAvatar } from "~/features/room/components/ParticipantAvatar";
import { cn } from "~/shared/utils/cn";

// Beyond this the stack gets noisy, so extra Participants collapse into a "+N"
// chip rather than crowding the header.
const MAX_AVATARS = 4;

// Overlap chips and ring each one in the header background so the stack reads as
// one cluster; the leading chip needs no pull.
const CHIP = "ring-2 ring-[var(--background)]";
const OVERLAP = "-ml-2";

/**
 * The header presence cluster: a stacked row of Participant avatars plus a live
 * count, both updated as people join and leave. Each avatar reuses
 * ParticipantAvatar so it carries that Participant's identity (name + colour); the
 * viewer's own chip is ringed and named "(you)". Alone in the Room, an empty
 * dashed slot sits beside your avatar as the "waiting for someone" cue.
 *
 * Presence here is *activity in this Room*, not an account being "online" — the
 * group's accessible name says so, and there's no persistent identity behind it.
 * Renders nothing until the first roster arrives (before that the header's waiting
 * line carries the state).
 */
export function PresenceCluster({
  roster,
  self,
}: {
  roster: ParticipantIdentity[];
  self: ParticipantIdentity | undefined;
}) {
  if (roster.length === 0) return null;

  // Order others first, the viewer last, so "you" sits on top at the trailing edge
  // of the stack — matching where the eye expects its own chip.
  const others = self ? roster.filter((p) => p.key !== self.key) : roster;
  const me = self ? roster.find((p) => p.key === self.key) : undefined;
  const ordered = me ? [...others, me] : others;
  const alone = others.length === 0;

  const shown = ordered.slice(0, MAX_AVATARS);
  const overflow = ordered.length - shown.length;

  const label = alone
    ? "You're the only one active in this Room — waiting for someone to join"
    : `${roster.length} people active in this Room`;
  const count = alone ? "Just you" : `${roster.length} here`;

  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <div className="flex items-center">
        {alone && <EmptySlot />}
        {shown.map((p, i) => (
          <ParticipantAvatar
            key={p.key}
            name={p.name}
            colorKey={p.colorKey}
            size="sm"
            label={me && p.key === me.key ? `${p.name} (you)` : p.name}
            className={cn(
              CHIP,
              (alone || i > 0) && OVERLAP,
              me && p.key === me.key && "ring-[var(--color-primary)]",
            )}
          />
        ))}
        {overflow > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              CHIP,
              OVERLAP,
              "inline-flex size-6 items-center justify-center rounded-full",
              "bg-[var(--color-surface-raised)] text-[0.625rem] font-semibold text-[var(--color-ink-muted)]",
            )}
          >
            +{overflow}
          </span>
        )}
      </div>
      <span aria-hidden="true" className="text-xs text-[var(--color-ink-muted)]">
        {count}
      </span>
    </div>
  );
}

// The open seat while you wait — a dashed placeholder the size of an avatar,
// decorative (the group label already says you're alone).
function EmptySlot() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        CHIP,
        "inline-flex size-6 items-center justify-center rounded-full border border-dashed",
        "border-[var(--color-room-empty)] text-[0.625rem] text-[var(--color-room-empty)]",
      )}
    >
      +
    </span>
  );
}
