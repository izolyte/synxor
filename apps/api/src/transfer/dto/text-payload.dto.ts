import { z } from 'zod';
import { MAX_TEXT_PAYLOAD_CHARS } from '../../domain/transfer/text-payload';

// The Sender emits this over the socket; the gateway validates it before
// classifying and broadcasting. Length is bounded so one client can't flood the
// Room with an oversized frame.
export const sendTextSchema = z.object({
  text: z
    .string()
    .min(1, 'Enter text or a link to send')
    .max(
      MAX_TEXT_PAYLOAD_CHARS,
      `Text is over the ${MAX_TEXT_PAYLOAD_CHARS.toLocaleString()} character limit`,
    ),
});

export type SendTextRequest = z.infer<typeof sendTextSchema>;
