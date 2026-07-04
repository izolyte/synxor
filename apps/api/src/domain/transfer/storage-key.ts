// Object key scheme for a file Transfer. Chunks land as individual objects so a
// Receiver can start streaming before the upload finishes; assembly replaces
// them with one object at the final key.
export function fileObjectKey(roomId: string, transferId: string): string {
  return `rooms/${roomId}/transfers/${transferId}/file`;
}

export function chunkObjectKey(roomId: string, transferId: string, chunkIndex: number): string {
  // Zero-padded so lexicographic listing matches chunk order.
  return `rooms/${roomId}/transfers/${transferId}/chunks/${String(chunkIndex).padStart(5, '0')}`;
}
