import { QRCodeSVG } from "qrcode.react";

/**
 * The join link as a scannable QR — the second way into the Room, for the person
 * standing next to the Sender's screen (docs/design points at "share the code or
 * QR"). It encodes the very link "Copy link" hands out, so a phone camera drops
 * straight onto /join with the code prefilled.
 *
 * Always a dark-on-white tile regardless of theme: a QR needs high, fixed contrast
 * to read, and inverting it in dark mode would make it unscannable. The white
 * padding is the quiet zone scanners rely on. The `title` gives the code an
 * accessible name without a screen reader narrating the module grid.
 */
export function RoomQrCode({ value, label }: { value: string; label: string }) {
  return (
    <div
      data-testid="room-qr"
      className="rounded-[var(--radius-lg)] bg-white p-2.5 shadow-[var(--shadow-sm)]"
    >
      <QRCodeSVG
        value={value}
        title={label}
        size={112}
        level="M"
        bgColor="#ffffff"
        fgColor="#0b0b0b"
      />
    </div>
  );
}
