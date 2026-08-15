import { getRouteApi } from "@tanstack/react-router";
import { LandingHero } from "~/features/room/components/LandingHero";
import { RoomPreview } from "~/features/room/components/RoomPreview";
import { useCreateRoom } from "~/features/room/hooks/useCreateRoom";

const route = getRouteApi("/");

// The three-step strip below the hero — how the whole thing works, in one glance.
const STEPS = [
  { n: "01", title: "Create a room", detail: "Pick how long it lives — 1 hour to 7 days." },
  { n: "02", title: "Share the code or QR", detail: "They join from any device, no account." },
  { n: "03", title: "Chat, then it's gone", detail: "Text and files vanish when the timer ends." },
] as const;

/**
 * The landing: a wide hero with the create action built in and a decorative live
 * Room previewing beside it. Unlike the app's other screens it breaks the centered
 * narrow column for a full-bleed two-column shell, like the live Room does.
 */
export function LandingPage() {
  const { create, isPending, isError } = useCreateRoom();
  // Arrived via the PWA "Paste text" shortcut — point the lead at that intent.
  const { compose } = route.useSearch();

  return (
    <main className="bg-background relative flex min-h-dvh flex-col justify-center overflow-hidden">
      {/* Signature glow behind the hero; primary carries the theme, so it adapts. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-20%] right-[-10%] h-[90%] w-[60%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_72%)] blur-[10px]"
      />

      <div className="relative mx-auto w-full max-w-[72rem] px-[clamp(1.375rem,5vw,3.75rem)] py-[clamp(2.5rem,6vw,4.5rem)]">
        <div className="grid grid-cols-1 items-center gap-[30px] min-[900px]:grid-cols-[1.15fr_0.85fr] min-[900px]:gap-[44px]">
          <LandingHero
            onCreate={create}
            pending={isPending}
            error={isError}
            pasteIntent={compose === "text"}
          />
          <RoomPreview />
        </div>

        <div className="border-border mt-[46px] flex flex-wrap gap-[26px] border-t pt-[26px]">
          {STEPS.map((step) => (
            <div key={step.n} className="flex min-w-[180px] flex-1 gap-[11px]">
              <span className="text-primary font-mono text-[12px] font-semibold">{step.n}</span>
              <div>
                <div className="text-[13.5px] font-medium">{step.title}</div>
                <div className="text-muted-foreground mt-[3px] text-[12.5px] leading-[1.45]">
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
