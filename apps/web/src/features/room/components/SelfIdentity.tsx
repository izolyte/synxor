import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ParticipantIdentity } from "~/features/room/constants/transfer";
import type { RoomRenameAck } from "~/features/room/constants/room-events";
import {
  MAX_DISPLAY_NAME_CHARS,
  identityColorVar,
} from "~/features/room/constants/identity";
import { ParticipantAvatar } from "~/features/room/components/ParticipantAvatar";
import { Button } from "~/shared/ui/button";
import { cn } from "~/shared/utils/cn";

/**
 * "You are {name}" for this Participant, with an inline edit for the display name.
 * The auto "Colour Noun" is always good enough, so editing is optional; saving a
 * blank name reverts to it. A small self-contained insert — it owns only its own
 * edit state and calls `onRename`, which broadcasts and persists the change.
 *
 * Renders nothing until the server assigns an identity (on connect).
 */
export function SelfIdentity({
  self,
  onRename,
}: {
  self: ParticipantIdentity | undefined;
  onRename: (name: string) => Promise<RoomRenameAck>;
}) {
  const [editing, setEditing] = useState(false);

  if (!self) return null;

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
        <ParticipantAvatar name={self.name} colorKey={self.colorKey} size="sm" />
        <span>
          You are{" "}
          <span className="font-semibold" style={{ color: identityColorVar(self.colorKey) }}>
            {self.name}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil aria-hidden="true" size={12} />
          Edit name
        </button>
      </div>
    );
  }

  return (
    <RenameForm
      current={self.name}
      onCancel={() => setEditing(false)}
      onSubmit={async (name) => {
        await onRename(name);
        setEditing(false);
      }}
    />
  );
}

function RenameForm({
  current,
  onSubmit,
  onCancel,
}: {
  current: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(current);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name);
      }}
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        value={name}
        maxLength={MAX_DISPLAY_NAME_CHARS}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        aria-label="Your display name"
        placeholder="Your name"
        className={cn(
          "min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm",
          "placeholder:text-[var(--color-ink-muted)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      />
      <Button type="submit" size="sm">
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
