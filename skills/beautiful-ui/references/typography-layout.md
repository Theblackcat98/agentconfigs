# Typography, spacing, and layout

## Typeface

- UI text: Inter. Use tight tracking and tabular numerals for values.
- Code, identifiers, and file names: JetBrains Mono.
- Do not add other families. The system has no serif or display face.

Load the fonts in the host project. The stylesheet reads two variables:

| Variable | Set to | Fallback in the stylesheet |
| --- | --- | --- |
| `--font-inter` | Inter font stack | `"Inter"` |
| `--font-mono-face` | JetBrains Mono font stack | `"JetBrains Mono"` |

Any framework can define them. In Next.js, the font loader sets them on `<body>` as `inter.variable` and `mono.variable`. In plain HTML, load Inter and JetBrains Mono with a `<link>` or `@font-face`, then define the variables on `:root`.

## Base text

Applied to `body` by the stylesheet:

| Property | Value |
| --- | --- |
| Font | `font-sans` |
| Size | 14px |
| Line height | 1.5 |
| Letter spacing | -0.01em |
| Feature settings | `"cv11", "ss01"` |
| Smoothing | antialiased (WebKit and Firefox) |
| Color | `var(--ink)` |

Headings (`h1` to `h4`) use `text-wrap: balance`. Paragraphs use `text-wrap: pretty`.

## Type scale

The system uses many half-pixel sizes. Match them exactly. Do not round to the Tailwind scale.

| Size | Class | Used for |
| --- | --- | --- |
| 24px | `text-2xl` | Hero or display value. Add `font-semibold tracking-[-0.02em]`. |
| 14px | `text-sm` or `text-[14px]` | Body, card title, approval question, button (md), section headings |
| 13px | `text-[13px]` | Most UI labels, status pills, buttons (sm), tabs, chat body, menu items |
| 12.5px | `text-[12.5px]` | Tool and thinking rows, table headers, run headers |
| 12px | `text-xs` or `text-[12px]` | Captions, chip text, step counters, entity names, badges |
| 11.5px | `text-[11.5px]` | Secondary metadata, detail lines, footer text, tooltips |
| 11px | `text-[11px]` | Diff lines, small mono output |
| 10.5px | `text-[10.5px]` | Uppercase menu labels, tracking `0.04em` |
| 10px | `text-[10px]` | Scale labels and tiny markers |
| 9px | `text-[9px]` | Monogram letter inside a disc |

Section heading pattern: `text-sm font-semibold text-ink`, followed by a 13px subtitle in `text-ink-3`.

## Weights

| Weight | Class | Use |
| --- | --- | --- |
| 400 | `font-normal` | Body text, button (xs) |
| 500 | `font-medium` | Labels, buttons, values, table cells. This is the most common weight. |
| 600 | `font-semibold` | Headings, tile titles, monogram |

Secondary text gets a lighter color, not a lighter weight. Use `text-ink-2` for secondary and `text-ink-3` for tertiary.

## Numbers

- Use `tabular-nums` on any value that changes or sits in a column: counters, deltas, amounts, timestamps.
- Use `font-mono` with `tabular-nums` for diff counts.

## Line height

| Use | Value |
| --- | --- |
| Body | 1.5 |
| Pill and button label | `leading-none` (1) |
| Chat or prose body | `leading-normal` (1.5) or `leading-relaxed` (1.625) |
| Mono diff lines | `leading-[1.6]` to `leading-[1.8]` |

## Tracking

| Use | Value |
| --- | --- |
| Body | -0.01em (set on `body`) |
| Display | -0.02em |
| Uppercase label | +0.04em |

## Spacing

The base unit is 4px. Common values: 4, 6, 8, 10, 12, 14, 16, 20, 24, 32. Half steps such as 2px or 6px are fine inside components.

| Context | Value |
| --- | --- |
| Inside a card body | 12px (`primitive-card-pad`) |
| Card title bar | 10px 12px (`primitive-card-bar`) |
| Card footer | 10px (`primitive-card-footer`) |
| Table cell | 10px 12px (`primitive-table-cell`) |
| Icon button | 28 by 28px, radius control (`primitive-icon-button`) |
| Gap between list items | 4px to 8px |
| Gap between grouped controls | 6px to 12px |
| Gap between grid cards | 20px (`gap-5`) |
| Approval question stack | 26px |

Use the `primitive-*` helpers instead of hand-tuned values when a helper exists.

## Radii

See `tokens.md` for the scale. The rule is nesting: the inner element is smaller than its container, separated by the container's padding.

| Container | Child |
| --- | --- |
| Window, 14px | Card, 10px; control, 8px |
| Card, 10px | Control, 8px; chip, 6px |
| Control, 8px | Chip, 6px |

## Page shell

- The body has a diagonal stripe backdrop, pinned to the viewport with `background-attachment: fixed`. Keep it for full-page showcases. For dense product screens, you may set the body background to `var(--canvas)` instead. Say so when you make that choice.
- Showcase section: `mx-auto w-full max-w-6xl px-6 pb-14`.
- Showcase grid: `grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3`.
- Panels sit on the backdrop as white surfaces with `shadow-card`.

## Widths

| Element | Width |
| --- | --- |
| Approval card, tool run | `max-w-80` (320px) |
| Thinking trace | `max-w-95` (380px) |
| Chat panel | `max-w-95` (380px) |
| Records table minimum | 990px |
| Sidebar, collapsed | 52px |
| Sidebar, expanded | 224px |
| Sidebar row | 208px (36px collapsed) |

## Breakpoints

| Width | Behavior |
| --- | --- |
| 640px and below | Records toolbar stacks. Footer hint hides. |
| 1024px and up (`64rem`) | Sidebar scroll mask applies. |
| `sm`, `lg` (Tailwind) | Grid column counts change. |

## Icons

- 12 to 16px. 14px is the default.
- Line style: `fill="none" stroke="currentColor"`, round caps and joins.
- Stroke 2. Use 2.2 to 2.5 at 12px or smaller.
- Color comes from the text color around the icon.
- Decorative icons: `aria-hidden`.

## Converting a plain CSS value to a token

| Value | Token |
| --- | --- |
| `color: #1a1a1a` or similar near-black | `var(--ink)` |
| Gray text, 2 steps lighter | `var(--ink-2)` |
| Gray text, placeholder level | `var(--ink-3)` |
| White background | `var(--surface)` |
| Light gray background | `var(--inset)` or `var(--field)` |
| 1px gray border | `1px solid var(--line)` |
| Stronger border | `1px solid var(--line-strong)` |
| `border-radius: 6px` | `var(--radius-chip)` |
| `border-radius: 8px` | `var(--radius-control)` |
| `border-radius: 10px` | `var(--radius-card)` |
| `border-radius: 14px` | `var(--radius-window)` |
| Blue button or link | `var(--accent)` with `var(--accent-ink)` for text |
| Card shadow | `var(--shadow-card)` |
| Menu shadow | `var(--shadow-overlay)` |
