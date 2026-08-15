import type { ParticipantIdentity } from "~/features/room/constants/transfer";
import { ParticipantAvatar } from "~/features/room/components/ParticipantAvatar";

// The three staggered dots read as "someone is composing" — the same delays as
// the design mock. Applied via `motion-safe:`, so under reduced motion the dots
// sit still instead of bouncing.
const DOT_DELAYS = ["0ms", "180ms", "360ms"] as const;

// Screen-reader caption for who's composing. The dots are decorative, so this is
// the only announcement — kept polite and terse.
function typingLabel(identities: ParticipantIdentity[]): string {
  const names = identities.map((i) => i.name);
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing…`;
}

/**
 * Ephemeral composing indicator at the foot of the stream: for each peer who's
 * typing, their identity avatar and a three-dot bubble in the shared incoming
 * style — never a message row, and never persisted. Renders nothing when the
 * Room is quiet.
 */
export function TypingIndicator({ identities }: { identities: ParticipantIdentity[] }) {
  if (identities.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 py-1" aria-label="Typing">
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {typingLabel(identities)}
      </span>
      {identities.map((identity) => (
        <div key={identity.key} className="flex items-end gap-2">
          <ParticipantAvatar name={identity.name} colorKey={identity.colorKey} size="sm" />
          <div
            aria-hidden="true"
            className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-surface-raised)] px-3 py-2.5"
          >
            {DOT_DELAYS.map((delay) => (
              <span
                key={delay}
                style={{ animationDelay: delay }}
                className="h-1.5 w-1.5 rounded-full bg-[var(--color-ink-muted)] motion-safe:animate-[typing-bounce_1.3s_var(--ease-out)_infinite]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
