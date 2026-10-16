# Stylesheet source map

`assets/beautiful-ui.css` is one file. It has a generic foundation that every component needs, plus component blocks that each serve one primitive. Copy the whole file for a full install. For a trimmed install, keep the foundation and only the blocks you use.

Line numbers refer to `assets/beautiful-ui.css` as shipped. Re-check them with `grep -n` if you edit the file.

## Generic foundation (always keep)

| Lines | Section | Contents |
| --- | --- | --- |
| 1 | Tailwind import | `@import "tailwindcss";` |
| 2 to 22 | Shadow scale | `@theme {}` with `--shadow-xs` to `--shadow-2xl`. Inlined from the shadow-plugin package. |
| 24 | Dark variant | `@custom-variant dark` |
| 30 to 36 | Header | Design notes |
| 37 to 89 | Light tokens | `:root` surfaces, ink, borders, accent, status, tooltip, shadows |
| 90 to 140 | Dark tokens | `.dark` overrides |
| 141 to 187 | Tailwind mapping | `@theme inline` mapping tokens to utilities, radii, easing, fonts |
| 189 to 218 | Base | `html`, `body`, `::selection`, heading and paragraph wrap, links |
| 220 to 248 | Hygiene | Theme-switch freeze, touch hover reset |
| 265 to 292 | Nav scroll | Hidden scrollbar, bottom mask on large screens |
| 293 to 345 | Touch demo rules | Selection and tap behavior for demo pages |
| 346 to 368 | Interaction | Pointer cursor on controls, focus ring, animated underline |
| 383 to 412 | Spacing helpers | `primitive-card-pad`, `primitive-card-bar`, `primitive-card-footer`, `primitive-table-cell`, `primitive-icon-button` |
| 413 to 434 | Keyframes | `shimmer-text`, `fade-up` |
| 435 to 440 | Reveal | `.home-reveal` |
| 1457 to 1475 | Keyframes | `fade-in`, `eq-bounce` |
| 1530 to 1559 | Keyframes | `pop-in`, `spin`, `pixel-on` |
| 1560 to end | Reduced motion | Global `prefers-reduced-motion` rule. Keep it. |

## Component blocks (keep only what you use)

| Lines | Block | Needed for |
| --- | --- | --- |
| 369 to 382 | StreamingText and ContextCards | `.source-avatar` ring on favicons |
| 441 to 515 | SidebarNav | `.sidebar-*` rules and the collapsed state |
| 523 to 1353 | RecordsTable | `.records-*` grid, toolbar, menus, tags, footer, AI column. About 830 lines. |
| 1354 to 1355 | Filter status header | Divider comment |
| 1356 to 1367 | FilterTable | `.filter-status-*` border reset |
| 1368 to 1426 | InsightCards | `.insight-chart-*` cursor and tooltip |
| 1427 to 1456 | FilterTable and RecordsTable | Status tones, plus the dark-mode tag fill |
| 1476 to 1529 | StreamText | `.stream-tail`, `.stream-caret`, and their reduced-motion rule |

The records block at lines 523 to 1353 is the largest component. Remove it if the project has no table.

## Inline dependencies

Some components read CSS variables that the stylesheet does not define. The component sets them:

- `--tag-base`: the record tag rules derive their fill, border, and text from it with `color-mix`. The stylesheet defines it only for the three filter status classes (`.filter-status-todo`, `-progress`, `-done`). For record tags, set it on the element. Without it, the tag colors do not compute.
- `--sidebar-copy-duration`, `--sidebar-copy-offset`, and `--sidebar-easing`: the sidebar rules read them. Set them on the sidebar container.

## Variables used directly in CSS

Plain-CSS installs must keep these variables. They come from the `@theme inline` block:

- `--radius-chip`, `--radius-control`, `--radius-card`, `--radius-window`
- `--ease-out-strong`, `--ease-in-out-strong`, `--ease-link`
- `--font-sans`, `--font-mono`

The install script keeps these when it builds the plain-CSS version.
