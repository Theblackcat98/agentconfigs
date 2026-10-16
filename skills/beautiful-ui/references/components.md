# Components

Recipes for the building blocks. Each one lists the classes to copy. Use the token values from `tokens.md`. Tailwind v4 syntax is shown first. A plain CSS translation follows the Tailwind classes where the mapping is not obvious.

## Buttons

Base classes for every button:

```
inline-flex items-center justify-center font-medium select-none
transition-[transform,background-color,opacity] duration-150 ease-out
active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none
```

### Variants

| Variant | Classes | Role |
| --- | --- | --- |
| `primary` | `bg-ink text-canvas hover:opacity-90` plus the filled highlight | Main action on a surface that has no accent. Inverts in dark mode. |
| `accent` | `bg-accent text-white hover:bg-accent-ink` plus the filled highlight | The one blue action on a surface |
| `secondary` | `bg-surface text-ink shadow-btn hover:bg-inset aria-expanded:bg-hover` | Default. Alternatives, configure, neutral actions |
| `ghost` | `bg-hover-2 text-ink hover:bg-line-strong` | Skip, dismiss, low-emphasis action beside a primary |
| `success` | `bg-green text-white hover:brightness-95` plus the filled highlight | Confirmed or completed state |
| `quiet` | `text-ink hover:bg-hover` | Dense toolbars, icon-adjacent actions |

The filled highlight is `shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]`. Apply it to filled variants only.

### Sizes

| Size | Classes | Use |
| --- | --- | --- |
| `xs` | `h-7 rounded-full px-2.5 text-[12px] font-normal leading-none gap-1` | Compact toolbar |
| `sm` | `h-[27px] px-3 text-[13px] leading-none rounded-full gap-1.5` | Canonical action pill, cards |
| `md` | `px-4 py-[9px] text-sm leading-none rounded-full gap-2` | Standalone actions, composer send |

Rules: one filled button (`primary` or `accent`) per surface. Pills are `rounded-full`. Do not set a fixed height on `md`. Padding keeps the top and bottom equal.

Plain CSS translation for `secondary sm`:

```css
.btn-secondary-sm {
  display: inline-flex; align-items: center; justify-content: center;
  height: 27px; padding: 0 12px; gap: 6px;
  border-radius: 9999px; font: 500 13px/1 var(--font-sans);
  background: var(--surface); color: var(--ink);
  box-shadow: var(--shadow-btn);
  transition: transform 150ms ease-out, background-color 150ms ease-out;
}
.btn-secondary-sm:hover { background: var(--inset); }
.btn-secondary-sm:active { transform: scale(0.96); }
```

## Status pill

```
inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium leading-none
```

| Tone | Pill classes | Dot classes |
| --- | --- | --- |
| `green` | `bg-green-tint text-green` | `bg-green` |
| `orange` | `bg-orange-tint text-orange` | `bg-orange` |
| `red` | `bg-red-tint text-red` | `bg-red` |
| `accent` | `bg-accent-tint text-accent-ink` | `bg-accent` |
| `neutral` | `bg-inset text-ink-2` | `bg-ink-3` |

The dot is `size-1.5 rounded-full` and is optional. Use it for live state. Omit it for a plain label.

## Chip (monospace token)

For code values such as identifiers, file names, and keys.

```
inline rounded-md px-1.5 py-0.5 font-mono text-[12px] leading-none align-[-1px]
```

| Tone | Classes |
| --- | --- |
| neutral | `bg-inset text-ink-2` |
| accent | `bg-accent-tint text-accent-ink` |
| orange | `bg-orange-tint text-orange` |

## Value pill

A plain value set inside running text: a date, a name, a count. It has no dot and no state.

```
mx-0.5 inline-flex items-center rounded-full px-1.5 py-0 align-middle text-[12px] font-medium
```

Neutral uses `bg-field text-ink-2` with `shadow-hairline`. Tinted tones use `bg-<tone>-tint text-<tone>` with a 1px ring from `color-mix(in oklch, var(--<tone>) 28%, transparent)`.

## Entity chip

A monogram and a name in a soft pill. Use it for suppliers, people, or records mentioned in text.

```
mx-0.5 inline-flex items-center gap-1 rounded-full bg-field py-px pl-[3px] pr-1.5 align-middle shadow-hairline
```

Monogram: `flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold leading-none text-white`. Pass the disc color as a prop. Name: `text-[12px] font-medium text-ink`.

## Switch

```
relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200
```

On: `bg-ink`. Off: `bg-line-strong`. Knob: `absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]`, moving 16px with `transform: translateX(16px)`. Motion: `cubic-bezier(0.23, 1, 0.32, 1)` over 200ms.

## Segmented control

```
relative inline-grid h-8 select-none rounded-full bg-line/60 p-0.5
```

Thumb: `absolute inset-y-0.5 rounded-full bg-surface shadow-hairline`, width `calc((100% - 4px) / N)`, moved with `translateX(index * 100%)`, 200ms.
Segment: `relative z-10 rounded-full px-3 text-[13px] font-medium transition-colors duration-150`. Selected: `text-ink`. Other: `text-ink-3 hover:text-ink-2`.

## Theme toggle

Container `relative inline-grid h-9 grid-cols-2 items-center rounded-full bg-field p-0.5`. Thumb `absolute inset-y-0.5 left-0.5 w-8 rounded-full bg-surface shadow-btn`. Each icon button is `flex size-8 items-center justify-center rounded-full`. Icons are 13px. See `dark-mode.md` for the logic.

## Progress ring

Small circular progress with a label in the center.

- Default size 28px, stroke 2px, round line cap.
- Track: `var(--line)`. Progress: `var(--orange)`, `var(--green)`, `var(--red)`, or `var(--accent)`.
- Label: `text-[12px] font-semibold tabular-nums`.
- Animate `stroke-dashoffset` over 400ms with `cubic-bezier(0.23, 1, 0.32, 1)`.

## Shimmer text

Use for "working" labels. The gradient runs through the text.

```css
background-image: linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%);
background-size: 200% 100%;
background-clip: text; color: transparent;
animation: shimmer-text 1.8s linear infinite;
```

Tailwind: `bg-clip-text text-transparent`, with the same `backgroundImage` and animation set in `style`.

## Text row

Label on the left, value on the right. Use it inside cards for key-value data.

```
flex min-h-11 items-center justify-between gap-4 py-2
```

Label: `text-sm text-ink-2`. Value: `text-sm font-medium text-ink tabular-nums`. Meta: `text-[13px] text-ink-3`. Group rows with `flex flex-col divide-y divide-line`.

## Card and tile

Surface: `overflow-hidden rounded-card bg-surface shadow-card`. Do not add a border. The shadow token supplies the ring.

Tile with title bar:

```
<div class="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
  <div class="primitive-card-bar border-b border-line">
    <h3 class="text-[13px] font-semibold text-ink">Title</h3>
  </div>
  <div class="primitive-card-pad flex flex-1 flex-col justify-center">…</div>
</div>
```

Padding helpers from the foundation: `primitive-card-pad` (12px), `primitive-card-bar` (10px 12px), `primitive-card-footer` (10px), `primitive-table-cell` (10px 12px), `primitive-icon-button` (28 by 28, radius control).

## Menus and popovers

Menu panel: `rounded-card bg-surface p-1.5 shadow-overlay`. The overlay shadow already includes the hairline ring, so do not add a border. The records filter menu is 190px wide with 6px padding and uses `pop-in` at 160ms with `transform-origin: top left`.

Menu label: `px-2 pt-[5px] pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-ink-3`.

Menu row: `flex w-full items-center gap-[7px] rounded-chip px-2 py-[7px] text-[12px] text-ink-2 hover:bg-hover hover:text-ink`. Selected: `bg-hover text-ink`. Check mark: `w-[13px] text-center text-[12px] font-medium text-accent-ink`.

## Tooltip (chart)

```
flex items-center gap-3 rounded-lg border border-line-strong bg-[var(--tooltip-bg)] px-[9px] py-[5px]
text-[11.5px] tabular-nums text-[var(--tooltip-fg)] shadow-overlay whitespace-nowrap
```

Series dot: `size-2 shrink-0 rounded-full`. Crosshair: 1px wide, full height, `bg-ink`, opacity 0.26.

## Checkbox

Visual box: `inline-flex size-[18px] items-center justify-center rounded-[6px] border border-[oklch(0.845_0.011_247.953)] bg-white`. Checked: `border-accent bg-accent text-white`. Indeterminate: a 8 by 1.5px white dash. Hover darkens the border. Pressed scales to 0.96. In dark mode, the box is `oklch(0.346 0.015 252.294)` fill with a `oklch(0.45 0.017 254.711)` border. These values appear in the records table CSS block.

## Icons

- Size 12 to 16px inline. 14px is the most common.
- `fill="none" stroke="currentColor"` with `stroke-width` 2. Use 2.2 to 2.5 below 14px.
- `stroke-linecap="round" stroke-linejoin="round"`.
- Color comes from the surrounding text class (`text-ink-3`, `text-ink-2`).
- Decorative icons get `aria-hidden`.

## Focus and hover states

- Focus: the global `:focus-visible` rule draws `2px solid var(--accent)` with `outline-offset: 2px`. Keep it.
- Inputs use `outline: none` and a container focus state instead. The container uses `focus-within:border-line-strong`.
- Hover on rows: `hover:bg-hover` or `hover:bg-hover-2`. Text goes from `text-ink-2` to `text-ink`.
- Touch devices: hover fills on table rows are disabled by a `@media (hover: none)` rule.

## Prompt composer

Container: `flex flex-col gap-2 rounded-control border border-line bg-field p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.035)] transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong`.

Input: `min-h-4.5 bg-transparent text-[13px] leading-[1.4] text-ink outline-none placeholder:text-ink-3`.

Send button: `flex size-7 items-center justify-center rounded-[8px] transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96]`. Enabled: `bg-ink text-surface`. Disabled: `bg-line-strong text-ink-2`.

## Streaming text

The newest characters carry a blur that clears as they settle. Use it for live model output.

- Tail: `filter: blur(1.6px)` plus a left-to-right mask fade from opaque to 20% alpha.
- Caret: `inline-block w-[2px] h-[1.05em] ml-[1.5px] rounded-[1px] bg-ink`, blinking at `1s step-end` after the text settles. Solid while streaming.
- Default reveal is 2 characters every 9ms, with the last 6 characters blurred.

## Approval card (human-in-the-loop)

- Container: `w-full max-w-80 overflow-hidden rounded-card bg-surface shadow-card`, entering with `fade-up 380ms`.
- Question: `pr-7 text-[14px] font-medium text-ink`.
- Option row: `relative z-10 flex items-center gap-1.5 rounded-control py-1 pl-1 pr-2 text-left`.
- Option label: `text-[13px] leading-none text-ink-2`. Selected: `text-ink`.
- Radio indicator: `size-4 rounded-full`. Checkbox indicator: `size-4 rounded-[5px]`. Selected: `bg-ink text-canvas`. Unselected: `shadow-[inset_0_0_0_1.5px_var(--line-strong)]`.
- Footer: `primitive-card-footer flex items-center justify-between gap-3`. Left: a step counter with `text-[12px] font-medium tabular-nums text-ink-3`. Right: a `ghost sm` Skip button and an `accent sm` Continue button.
- Sent state: `inline-flex items-center gap-1.5 rounded-full bg-green-tint py-1 pr-2.5 pl-1 text-[12.5px] font-medium text-green`, with a green disc that holds a check mark.

## Thinking state (agent trace)

- Header button: `-mx-1.5 flex w-fit items-center gap-2 rounded-control px-1.5 py-1 hover:bg-hover-2`. Label is `text-[13px] font-medium` with shimmer while working, `text-ink-2` once done. Chevron is `text-ink-3`.
- Trace rail: a 1px `bg-line` vertical line, indented `ml-[5px] pl-4` from the header.
- Row: `flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left`. Hover: `hover:bg-hover`.
- Row text: `min-w-0 truncate text-[12.5px] font-medium text-ink`. Reasoning text uses `whitespace-normal leading-relaxed text-ink-2`.
- Secondary text: `shrink-0 text-[11.5px] text-ink-3`. File names use `font-mono`.
- Diff counts: `font-mono text-[11px] tabular-nums` with `text-green` for added and `text-red` for removed.

## Tool chips (agent run summary)

- Run header: `-mx-1.5 flex w-fit items-center gap-1.5 rounded-control px-1.5 py-1 text-[12.5px] text-ink-2 hover:bg-hover-2`.
- Tool row: `group/row -mx-[3px] flex h-7 w-[calc(100%+6px)] items-center gap-2 rounded-control px-[3px] text-left hover:bg-hover-2`.
- Label: `shrink-0 text-[12.5px] font-medium text-ink`.
- Argument chip: `inline-flex h-5.5 min-w-0 flex-1 items-center truncate rounded-chip bg-field px-1.5 text-[11.5px] text-ink-2 shadow-hairline hover:bg-hover-2`. Add `font-mono` for code.
- Expanded detail: `ml-2 border-l border-line py-0.5 pl-3.5 text-[11.5px] leading-[1.6] text-ink-2`. Added lines use `text-green`.
- File chip: `inline-flex h-7 items-center gap-2 rounded-chip bg-surface px-2 font-mono text-[11.5px] text-ink shadow-btn`.
- Diff preview: `w-72 overflow-hidden rounded-[10px] bg-surface shadow-overlay`. Header row: `border-b border-line px-2.5 py-1.5 font-mono text-[11px]`. Lines: `px-2.5 font-mono text-[11px] leading-[1.8] whitespace-pre`. Added: `bg-green-tint text-green`. Removed: `bg-red-tint text-red`.

## Chat panel

- Panel: `flex h-[288px] w-full max-w-95 flex-col overflow-hidden rounded-[14px] bg-surface shadow-card`.
- Header: `flex items-center justify-between border-b border-line p-1.5`. Tabs: `rounded-[6px] px-2 py-[3px] text-[13px] text-ink`. Active tab: `bg-field`. Inactive: `opacity-50 hover:opacity-75`. Icon buttons: `flex size-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink-2`.
- User bubble: `flex justify-end pl-14` wrapper, bubble `rounded-xl bg-field px-3 py-1.5 text-[13px] leading-[1.4] text-ink`.
- Agent section: label row `flex items-center gap-1 text-[12px] leading-[1.3]`. Title `font-medium text-ink`, subtitle `text-ink-2`, duration `text-ink`. Body `text-[13px] leading-normal text-ink`.
- Entering sections use `fade-up 400ms`.

## Records table (data grid)

The table is the largest component. Its CSS block sits in `assets/beautiful-ui.css`. Key values:

- Shell: `rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_oklch(0_0_0_/_0.06)]`. In fill mode, drop the border, radius, and shadow.
- Toolbar: `min-h-[52px] px-2.5 py-2 border-b border-line-strong bg-surface`.
- Toolbar buttons: `h-8 gap-[7px] rounded-control px-2.5 text-[12px] font-medium`. Primary is `bg-accent text-white`.
- Column header: height 35px, `text-[12.5px] font-medium text-ink-2`, sticky to the top.
- Cell: height 35px, `px-2 text-[13px] font-medium text-ink`, one-line with ellipsis.
- Grid lines: `border-right` and `border-bottom` with `color-mix(in srgb, var(--line) 78%, transparent)`.
- Frozen first column: sticky left, `surface` background, `box-shadow: 5px 0 8px -10px oklch(0 0 0 / 0.4)`.
- Row hover: `var(--hover)`. Selected row: `color-mix(in srgb, var(--accent) 7%, var(--surface))`.
- Selected column: header `color-mix(in srgb, var(--accent) 8%, var(--surface))` with a 2px accent top inset.
- Tags: height 23px, `rounded-[8px] px-[7px] text-[13px] font-medium`. Color comes from `--tag-base` through `color-mix`. Fill: 18% of base over surface. Border: 32% of base. Dark mode raises the fill to 34%.
- Footer row: `bg-inset`, height 35px, `text-[14px] font-medium text-ink-2`. Footer strip: `text-[11.5px] text-ink-3`.
- Column widths: company 270px, category 275px, last 190px, strength 210px, link 175px. Minimum table width 990px. Body max height 438px before it scrolls.
- Below 640px the toolbar stacks vertically and the footer hint hides.

## Sidebar nav

- Rail: 52px collapsed, 224px expanded. Rows are 208px wide, and 36px when collapsed.
- Glide highlight inset 8px from each side. Collapsed highlight is 36px wide.
- Labels fade and slide left by `--sidebar-copy-offset` when collapsed. Duration and easing come from the `--sidebar-copy-duration` and `--sidebar-easing` variables that the component sets.
- Glyphs stay centered at x=26 in both states, so the rail does not jump.

## Glide menu

Used for option lists. A single highlight element slides between rows. Pass the highlight classes as a prop, for example `inset-x-0 rounded-control bg-hover`. Rows carry `data-menu-row`.

## Shared surface rules

- Panels that hold content: `bg-surface shadow-card`, radius 10 to 14px.
- Page sections: no background. They sit on the page.
- Nested panels: `bg-inset` or `bg-field`, no shadow.
- Never put a shadow inside a shadow. Pick one level of elevation per element.
