import { createRootRouteWithContext, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import "../styles/globals.css";
import { Button } from "~/shared/ui/button";
import { Wordmark } from "~/shared/components/Wordmark";
import { CenteredScreen } from "~/shared/components/CenteredScreen";
import { ThemeToggle } from "~/shared/components/ThemeToggle";
import type { RouterAppContext } from "~/shared/services/trpc";

// Runs before first paint so a returning dark-mode user never sees a light flash.
// Stored choice wins; otherwise follow the OS. `.dark` is the single source of
// truth (docs/design/12-dark-mode.md) — the runtime toggle keys off the same class.
const themeScript = `(function(){var d=document.documentElement,s=null;try{s=localStorage.getItem("theme")}catch(_){}(s==="dark"||(!s&&matchMedia("(prefers-color-scheme:dark)").matches))&&d.classList.add("dark")})()`;

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#1a1a1a", media: "(prefers-color-scheme: dark)" },
      { title: "Synxor" },
    ],
  }),
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
  component: RootComponent,
});

/**
 * Renders the root HTML shell for the application.
 *
 * @remarks
 * Includes router-managed head content, the theme initialization script, the active route outlet, and router scripts.
 */
function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Outlet />
        {/* Global control, so it lives outside the route Outlet. Fixed to the
            top-right corner past the safe-area inset; placed after the Outlet so
            it falls last in the tab order per docs/design/09-focus-keyboard.md. */}
        <div
          className="fixed top-0 right-0 z-[var(--z-sticky)] p-[var(--space-3)]"
          style={{
            paddingTop: "calc(var(--space-3) + env(safe-area-inset-top))",
            paddingRight: "calc(var(--space-3) + env(safe-area-inset-right))",
          }}
        >
          <ThemeToggle />
        </div>
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Renders the 404 not-found page.
 *
 * @returns The not-found page layout.
 */
function NotFoundPage() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CenteredScreen className="gap-4">
          <Wordmark>404</Wordmark>
          <p className="text-foreground text-sm">Page not found.</p>
          <Link
            to="/"
            className="text-primary focus-visible:ring-ring rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Go home
          </Link>
        </CenteredScreen>
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Renders the root error page.
 *
 * @param error - The error to display in development mode.
 * @param reset - Handles the retry action.
 * @returns The error page document.
 */
function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CenteredScreen className="gap-4">
          <Wordmark>Error</Wordmark>
          <p className="text-foreground max-w-sm text-center text-sm">
            {import.meta.env.DEV && error.message ? error.message : "Something went wrong."}
          </p>
          <Button variant="ghost" onClick={reset}>
            Try again
          </Button>
        </CenteredScreen>
        <Scripts />
      </body>
    </html>
  );
}
