import { Moon, Sun } from "lucide-react";
import { Button } from "~/shared/ui/button";
import { useTheme } from "~/shared/hooks/useTheme";

/**
 * Icon button that flips light/dark and persists the choice. Which glyph shows is
 * driven by the `.dark` class through CSS, not React state, so the correct icon
 * paints before hydration (the inline script sets the class first) with no flash
 * or mismatch. The label names the resulting action for screen readers.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      <Moon aria-hidden="true" size={20} className="dark:hidden" />
      <Sun aria-hidden="true" size={20} className="hidden dark:block" />
    </Button>
  );
}
