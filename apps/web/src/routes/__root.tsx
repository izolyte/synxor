import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "../styles/globals.css";
import { Button } from "~/components/ui/button";

const themeScript = `(function(){var d=document.documentElement,s=localStorage.getItem("theme");(s==="dark"||(!s&&matchMedia("(prefers-color-scheme:dark)").matches))&&(d.classList.add("dark"),d.setAttribute("data-theme","dark"))})()`;

export const Route = createRootRoute({
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

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-4">
          <span className="text-muted-foreground font-mono text-xs font-medium tracking-[0.2em] uppercase">
            404
          </span>
          <p className="text-foreground text-sm">Page not found.</p>
          <Link
            to="/"
            className="text-primary focus-visible:ring-ring rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Go home
          </Link>
        </main>
        <Scripts />
      </body>
    </html>
  );
}

function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-4">
          <span className="text-muted-foreground font-mono text-xs font-medium tracking-[0.2em] uppercase">
            Error
          </span>
          <p className="text-foreground max-w-sm text-center text-sm">
            {error.message || "Something went wrong."}
          </p>
          <Button variant="ghost" onClick={reset}>
            Try again
          </Button>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
