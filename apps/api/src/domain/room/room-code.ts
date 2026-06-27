// Room Code format — AC #6: 6 uppercase alphanumeric characters.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

// Distinct codes to try before giving up when generation keeps colliding.
export const ROOM_CODE_MAX_ATTEMPTS = 5;
