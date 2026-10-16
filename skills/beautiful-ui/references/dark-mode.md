# Dark mode

Dark mode is a class on the root element. Every token has a dark value in the `.dark` block, so components do not need separate dark styles. Write components once, with tokens, and both themes work.

## Mechanism

| Part | Detail |
| --- | --- |
| Switch | `.dark` class on `<html>` |
| Storage | `localStorage` key `bui-theme`. Value `"light"` means light. Any other value, or no value, means dark. |
| Default | Dark |
| Tailwind variant | `@custom-variant dark (&:where(.dark, .dark *));` so `dark:` utilities match inside `.dark` |
| Token flip | `:root` for light, `.dark` for dark |
| Transition guard | `.theme-switching` on `<html>` for two frames during a switch |

## Set up the pre-paint script

Put this in `<head>` so the page paints in the right theme on first load. It runs before the body renders, which prevents a flash.

```html
<script>
(function () {
  try {
    var t = localStorage.getItem("bui-theme");
    document.documentElement.classList.toggle("dark", t !== "light");
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
</script>
```

## Re-apply after hydration (React 19)

React 19 can overwrite the class on `<html>` during hydration. Re-apply the stored theme after the first effect runs:

```tsx
"use client";
import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem("bui-theme");
      document.documentElement.classList.toggle("dark", theme !== "light");
    } catch {
      document.documentElement.classList.add("dark");
    }
  }, []);
  return null;
}
```

Render `<ThemeSync />` once in the root layout.

## Toggle

Two icon buttons in a pill. The left button is light mode, the right is dark mode. The thumb slides under the active one.

Logic:

```tsx
function apply(next: boolean) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", next);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove("theme-switching")),
  );
  try {
    localStorage.setItem("bui-theme", next ? "dark" : "light");
  } catch {}
}
```

Read `localStorage` in an effect, not during render. Otherwise server and client markup differ.

Markup and styling are in `components.md` under "Theme toggle".

## What changes between themes

| Area | Light | Dark |
| --- | --- | --- |
| Canvas and surfaces | Near-white surfaces on a light gray page | Raised blue-gray surfaces on a dark page |
| Ink | Dark text | Light text |
| Ink-3 | Light gray | Mid gray (darker than ink-2 in dark) |
| Borders | Light solid lines | Dark solid lines |
| Shadows | Dark-tinted ambient shadows with a dark ring | Light hairline rings (white, low alpha) with black drop shadows |
| Accent | Medium blue | Lighter blue, with a lighter accent-ink for text |
| Status | Pastel tint, deeper text | Translucent tint, lighter text |
| Primary button | Dark fill, light text | Light fill, dark text (inverts through `bg-ink text-canvas`) |
| Records tags | Soft tint, base-colored text | Saturated fill (34%), near-white text, no border |
| Tooltip | Dark bubble | Darker bubble |

Status tints in dark mode use `oklch(… / 0.14)` alpha, so they stay soft on the dark surface.

## Rules

- Use tokens. Do not write `dark:bg-…` with a hard-coded color. Use `dark:` only for structural changes, and only when a token cannot express the difference.
- Elevation rings in dark mode are light and low alpha. Do not swap them for dark rings.
- Do not use `prefers-color-scheme` for the app theme. The stored choice is the source of truth. The default is dark.
- Test both themes after any color change. Check text contrast, borders, and status pills in each.
- Shadows in dark mode need a visible edge. A pure black drop shadow on a near-black page disappears. The light ring is what keeps the edge visible.
- Put `.dark` on `<html>`. The pre-paint script and the Tailwind `dark:` variant both assume it. On a child element, the flip only affects that subtree.

## Checklist for a new page

1. Pre-paint script is in `<head>`.
2. `ThemeSync` (or the equivalent) runs once after hydration.
3. Every color is a token. A grep for hex, `rgb(`, or palette classes finds nothing.
4. Toggle the class in the browser and check each card, menu, and status pill.
5. The primary button is readable in both themes.
