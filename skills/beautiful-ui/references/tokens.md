# Tokens

Every token is a CSS custom property in `assets/beautiful-ui.css`. Light values live in `:root`. Dark values live in `.dark`. Copy values exactly. Do not round or substitute them.

## How to use a token

| Context | Syntax |
| --- | --- |
| Plain CSS | `color: var(--ink);` |
| Tailwind v4 | `text-ink`, `bg-surface`, `border-line` |
| Tailwind, token without a utility | `bg-[var(--tooltip-bg)]` |

Tailwind utilities exist only for tokens mapped in the `@theme inline` block. The tokens without a utility are listed in the last section of this file.

## Surfaces

| Token | Utility | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--page` | `bg-page` | `oklch(0.985 0.001 286.376)` | `oklch(0.209 0.004 264.477)` | Page background |
| `--canvas` | `bg-canvas` | `oklch(0.961 0.002 247.84)` | `oklch(0.231 0.004 264.487)` | Canvas behind panels; also primary button text |
| `--surface` | `bg-surface` | `oklch(1 0 0)` | `oklch(0.26 0.006 271.191)` | Cards, menus, inputs on white |
| `--inset` | `bg-inset` | `oklch(0.979 0.002 247.839)` | `oklch(0.243 0.004 264.492)` | Recessed areas, neutral chips, table footers |
| `--hover` | `bg-hover` | `oklch(0.97 0.002 247.839)` | `oklch(0.289 0.006 271.22)` | Hover fill on rows and quiet buttons |
| `--hover-2` | `bg-hover-2` | `oklch(0.933 0.003 247.86)` | `oklch(0.318 0.007 274.747)` | Stronger hover; ghost button fill |
| `--field` | `bg-field` | `oklch(0.961 0.001 286.375)` | `oklch(0.293 0.006 271.223)` | Input fields, entity chips, user bubbles, neutral value pills |

## Ink (text)

| Token | Utility | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--ink` | `text-ink` | `oklch(0.247 0.006 258.361)` | `oklch(0.964 0.002 247.839)` | Primary text, headings |
| `--ink-2` | `text-ink-2` | `oklch(0.506 0.01 264.477)` | `oklch(0.731 0.008 260.731)` | Secondary text, labels, inactive tabs |
| `--ink-3` | `text-ink-3` | `oklch(0.695 0.009 264.505)` | `oklch(0.541 0.01 264.484)` | Tertiary text, captions, placeholders, icons at rest |

## Borders

| Token | Utility | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--line` | `border-line` | `oklch(0.946 0.003 264.542)` | `oklch(0.308 0.006 258.354)` | Default dividers and borders |
| `--line-strong` | `border-line-strong` | `oklch(0.912 0.005 258.326)` | `oklch(0.356 0.007 264.474)` | Header rules, menu borders, input focus |
| `--line-soft` | none | `oklch(0.966 0.002 264.542)` | `oklch(0.278 0.006 258.354)` | Faintest rule. Use `border-[var(--line-soft)]` |
| `--grid-line` | none | `color-mix(in srgb, var(--line) 78%, transparent)` | inherits | Table grid lines. Use `var(--grid-line)` |
| `--stripe` | none | `oklch(0.405 0 0 / 0.075)` | `oklch(1 0 0 / 0.055)` | Body stripe pattern |
| `--stripe-bg` | none | `oklch(0.97 0 0)` | `oklch(0.226 0.004 264.485)` | Body stripe base color |

Borders are solid. Do not use alpha borders such as `border-black/10`.

## Accent (blue)

| Token | Utility | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| `--accent` | `bg-accent`, `text-accent` | `oklch(0.626 0.205 254.947)` | `oklch(0.68 0.173 253.301)` | Primary action fill, focus ring, selection indicators |
| `--accent-ink` | `text-accent-ink` | `oklch(0.556 0.187 255.617)` | `oklch(0.788 0.113 248.33)` | Accent text, hover on accent controls |
| `--accent-tint` | `bg-accent-tint` | `oklch(0.96 0.019 252.878)` | `oklch(0.68 0.173 253.301 / 0.16)` | Soft accent background, text selection, active quiet button |

## Semantic status

Use these only for meaning: state, delta, or a single positive or negative value.

| Token | Utility | Light | Dark |
| --- | --- | --- | --- |
| `--green` | `text-green`, `bg-green` | `oklch(0.603 0.155 150.883)` | `oklch(0.705 0.154 153.814)` |
| `--green-tint` | `bg-green-tint` | `oklch(0.958 0.017 159.118)` | `oklch(0.705 0.154 153.814 / 0.14)` |
| `--orange` | `text-orange`, `bg-orange` | `oklch(0.689 0.179 49.902)` | `oklch(0.746 0.156 55.642)` |
| `--orange-tint` | `bg-orange-tint` | `oklch(0.964 0.021 67.581)` | `oklch(0.746 0.156 55.642 / 0.14)` |
| `--red` | `text-red`, `bg-red` | `oklch(0.621 0.192 23.042)` | `oklch(0.666 0.18 21.433)` |
| `--red-tint` | `bg-red-tint` | `oklch(0.956 0.017 17.462)` | `oklch(0.666 0.18 21.433 / 0.14)` |

## Tooltip overlay

Tooltips stay dark in light mode and darker in dark mode. These have no Tailwind utility.

| Token | Light | Dark |
| --- | --- | --- |
| `--tooltip-bg` | `oklch(0.272 0.008 264.435)` | `oklch(0.182 0.004 264.459)` |
| `--tooltip-fg` | `oklch(0.976 0.002 247.839)` | `oklch(0.964 0.002 247.839)` |
| `--tooltip-muted` | `oklch(0.731 0.008 260.731)` | `oklch(0.731 0.008 260.731)` |
| `--tooltip-border` | `oklch(0.356 0.007 264.474)` | `oklch(0.308 0.006 258.354)` |

## Shadows

Elevation is a 1px ring plus a soft stack. The ring is the token's first layer, so an element that uses a shadow token does not need a `border`.

| Token | Utility | Light | Dark |
| --- | --- | --- | --- |
| `--shadow-hairline` | `shadow-hairline` | `0 0 0 1px var(--line)` | same as light |
| `--shadow-btn` | `shadow-btn` | `0 0 0 1px var(--line-strong), var(--shadow-xs)` | `0 0 0 1px oklch(1 0 0 / 0.1), 0 1px 2px oklch(0 0 0 / 0.3)` |
| `--shadow-card` | `shadow-card` | `0 0 0 1px var(--line), var(--shadow-sm)` | `0 0 0 1px oklch(1 0 0 / 0.11), 0 1px 2px oklch(0 0 0 / 0.2), 0 2px 6px oklch(0 0 0 / 0.2)` |
| `--shadow-raised` | `shadow-raised` | `0 0 0 1px var(--line), var(--shadow-md)` | `0 0 0 1px oklch(1 0 0 / 0.13), 0 2px 10px oklch(0 0 0 / 0.22)` |
| `--shadow-overlay` | `shadow-overlay` | `0 0 0 1px var(--line), var(--shadow-lg)` | `0 0 0 1px oklch(1 0 0 / 0.15), 0 8px 28px oklch(0 0 0 / 0.34)` |
| `--shadow-inset-field` | `shadow-inset-field` | `inset 0 1px 2px oklch(0 0 0 / 0.12)` | `inset 0 1px 2px oklch(0 0 0 / 0.4)` |

Choose by role:

- `shadow-hairline`: a flat chip or pill that needs an edge but no lift.
- `shadow-btn`: a secondary button or small control.
- `shadow-card`: the default card, panel, or result block.
- `shadow-raised`: a floating element that sits above a card.
- `shadow-overlay`: menus, popovers, tooltips, and diff previews.
- `shadow-inset-field`: a recessed input well.

### Smooth scale (`--shadow-xs` to `--shadow-2xl`)

These are the layered stacks the semantic tokens build on. Use them directly only when a semantic token does not fit. `shadow-xs` is a single 4px blur. `shadow-sm`, `md`, `lg`, `xl`, and `2xl` are multi-layer stacks at 0.01 to 0.07 opacity per layer. Their values are in the `@theme {}` block near the top of `assets/beautiful-ui.css`.

## Radii

| Token | Utility | Value | Use |
| --- | --- | --- | --- |
| `--radius-chip` | `rounded-chip` | 6px | Chips, tags, checkboxes, small icon buttons, diff chips |
| `--radius-control` | `rounded-control` | 8px | Inputs, menu rows, toolbar buttons, tool row hover |
| `--radius-card` | `rounded-card` | 10px | Cards, menus, overlays, records table shell |
| `--radius-window` | `rounded-window` | 14px | Large windows such as the chat panel |
| pill | `rounded-full` | 9999px | Buttons, status pills, switches, segmented controls, value pills |

Radii nest. A child inside a card uses a smaller radius than its parent. A pill inside a 14px window is still a pill.

## Easing

| Token | Utility | Value | Use |
| --- | --- | --- | --- |
| `--ease-out-strong` | `ease-out-strong` | `cubic-bezier(0.23, 1, 0.32, 1)` | Default for almost all UI motion |
| `--ease-in-out-strong` | `ease-in-out-strong` | `cubic-bezier(0.77, 0, 0.175, 1)` | Movement that starts and ends at rest |
| `--ease-link` | `ease-link` | `cubic-bezier(0.16, 1, 0.3, 1)` | Animated link underline |

## Fonts

| Token | Utility | Value |
| --- | --- | --- |
| `--font-sans` | `font-sans` | `var(--font-inter, "Inter"), ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | `font-mono` | `var(--font-mono-face, "JetBrains Mono"), ui-monospace, "SF Mono", monospace` |

The `var(--font-inter, "Inter")` form gives a fallback when the project does not define the variable. Without the fallback, an undefined variable invalidates the whole `font-family` declaration.

## Tokens without a Tailwind utility

| Token | Use with |
| --- | --- |
| `--line-soft` | `border-[var(--line-soft)]` |
| `--grid-line` | `border-[var(--grid-line)]` |
| `--stripe`, `--stripe-bg` | Body background only |
| `--tooltip-bg`, `--tooltip-fg`, `--tooltip-muted`, `--tooltip-border` | `bg-[var(--tooltip-bg)]`, `text-[var(--tooltip-fg)]`, and so on |

## Constants that are not tokens

| Value | Where it appears | Note |
| --- | --- | --- |
| `#e08a3c` | Default monogram color in entity chips | Entity colors are user data. Pass the color in as a prop. |
| `oklch(1 0 0)` and `white` | Text on filled accent or green fills | Fine on a filled accent, success, or status fill. Elsewhere use `text-surface` or `bg-surface`. |
| `oklch(0 0 0 / 0.06)` | Records table shell shadow | Component-specific. Keep it inside the component's CSS block. |
