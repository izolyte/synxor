import { Download } from "lucide-react";
import { Button } from "~/shared/ui/button";
import { usePwaInstall } from "~/shared/hooks/usePwaInstall";

/**
 * Discreet "Install app" control for returning Chromium visitors. It only paints
 * once the browser has handed us a deferred prompt (see usePwaInstall), so it's
 * absent on first paint, on unsupported browsers, and once installed. Clicking it
 * fires the real prompt; the hook clears the deferred event afterwards, hiding it.
 */
export function InstallButton() {
  const { canInstall, promptInstall } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <Button variant="outline" size="sm" onClick={promptInstall}>
      <Download aria-hidden="true" size={16} />
      Install app
    </Button>
  );
}
