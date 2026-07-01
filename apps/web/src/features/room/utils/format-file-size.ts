const UNITS = ["B", "KB", "MB", "GB", "TB"];

/**
 * IEC-based (1024) file size formatting, per docs/design/15-edge-cases.md: no
 * trailing ".0", and a zero-byte file reads "Empty file" rather than "0 B".
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "Empty file";

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const digits = unitIndex === 0 ? 0 : 1;
  const formatted = value.toFixed(digits).replace(/\.0$/, "");
  return `${formatted} ${UNITS[unitIndex]}`;
}
