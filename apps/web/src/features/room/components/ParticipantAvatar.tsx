import { identityColorVar, identityInitials } from "~/features/room/constants/identity";
import { cn } from "~/shared/utils/cn";

// Avatar sizes as fixed square dimensions; the initials scale with the chip.
const SIZES = {
  sm: "h-6 w-6 text-[0.625rem]",
  md: "h-8 w-8 text-xs",
} as const;

export type ParticipantAvatarSize = keyof typeof SIZES;

/**
 * A Participant's identity as a coloured chip of initials — the shared avatar
 * primitive for the stream (author of a message) and, later, the presence roster.
 * The chip is filled with the identity colour and the initials use --identity-ink,
 * a mode-aware on-colour that clears 4.5:1 against every palette hue in both
 * themes.
 *
 * Decorative by default (the name usually sits beside it); pass `label` when the
 * avatar stands alone so screen readers still announce who it is.
 */
export function ParticipantAvatar({
  name,
  colorKey,
  size = "md",
  label,
  className,
}: {
  name: string;
  colorKey: string;
  size?: ParticipantAvatarSize;
  label?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      title={label}
      style={{ backgroundColor: identityColorVar(colorKey), color: "var(--identity-ink)" }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none",
        SIZES[size],
        className,
      )}
    >
      {identityInitials(name)}
    </span>
  );
}
