import { z } from 'zod';

// A Participant emits this over the socket as they start or stop composing. The
// signal is ephemeral — the gateway only relays it — so this just rejects a frame
// that isn't the expected boolean before it's fanned out.
export const typingSchema = z.object({
  typing: z.boolean(),
});

export type TypingRequest = z.infer<typeof typingSchema>;
