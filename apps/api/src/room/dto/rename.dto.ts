import { z } from 'zod';
import { MAX_DISPLAY_NAME_CHARS } from '../../domain/participant/participant-identity';

// A Participant emits this over the socket to edit their display name. An empty
// string is allowed and clears the override (reverting to the auto name); the
// server sanitizes and caps the value, so this only rejects a wildly oversized
// frame before it reaches the identity logic.
export const renameSchema = z.object({
  name: z
    .string()
    .max(MAX_DISPLAY_NAME_CHARS * 10, `Name is over the ${MAX_DISPLAY_NAME_CHARS} character limit`),
});

export type RenameRequest = z.infer<typeof renameSchema>;
