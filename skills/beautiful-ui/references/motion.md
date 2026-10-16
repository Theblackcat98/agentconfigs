# Motion

Motion in this system is short, quiet, and directional. It confirms an action. It never performs for its own sake.

## Easing

| Name | Value | Use |
| --- | --- | --- |
| Out strong | `cubic-bezier(0.23, 1, 0.32, 1)` | Default for entrances, sliding thumbs, height changes, and press feedback |
| In-out strong | `cubic-bezier(0.77, 0, 0.175, 1)` | Movement that starts and ends at rest |
| Link | `cubic-bezier(0.16, 1, 0.3, 1)` | Animated link underline |
| Count roll | `cubic-bezier(0.4, 0, 0.2, 1)` | Odometer digit roll in step counters |

Do not use the built-in `ease-in-out` or `ease` for UI motion. Their curves are too weak.

## Durations

| Interaction | Duration |
| --- | --- |
| Hover color or background | 100ms to 150ms |
| Press feedback (scale) | 140ms to 200ms |
| Menu and popover open (`pop-in`) | 160ms |
| Switch knob, segmented thumb | 200ms |
| Link underline | 280ms |
| Entrance (`fade-up`, `pop-in`) | 250ms to 400ms |
| Layout or height change | 300ms to 400ms |
| Progress ring fill | 400ms |
| Stagger step between list items | 80ms to 120ms |
| Shimmer loop | 1.4s to 1.8s |
| Caret blink | 1s |
| Pulse loop (calculating) | 1.1s |

Keep most UI motion under 300ms. Use 350ms to 400ms only for entrances and layout changes.

## Press feedback

Clickable elements scale down on press:

```
active:scale-[0.96]
```

Use it on buttons, icon buttons, send buttons, and any control that feels like a key.

## Keyframes

Defined in `assets/beautiful-ui.css`. Use them by name.

| Name | Motion | Typical use |
| --- | --- | --- |
| `fade-up` | opacity 0 to 1, moves up 8px | Entering cards, rows, and sections |
| `fade-in` | opacity 0 to 1 | Text swaps, late-arriving labels |
| `pop-in` | opacity 0 to 1, scale 0.95 to 1 | Menus, diff previews, status toasts |
| `shimmer-text` | background position sweep | Working labels |
| `spin` | rotate 360deg | Loading spinner |
| `pixel-on` | opacity pulse, staggered per cell | Pixel-grid loader |
| `caret-blink` | opacity 1 to 0 with `step-end` | Text caret |
| `records-pulse` | opacity and scale pulse | Calculating state in a table cell |
| `eq-bounce` | scaleY 0.35 to 1 | Equalizer bars. Use only for audio or live meters. |

### Stagger

Apply a delay per item index:

```css
animation: fade-up 320ms cubic-bezier(0.23, 1, 0.32, 1) calc(var(--i) * 120ms) both;
```

Or inline: `style={{ animation: \`fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both\` }}`.

Use `both` as the fill mode so the element stays hidden before it starts.

## Reduced motion

The stylesheet ends with a global rule. When `prefers-reduced-motion: reduce` matches, every animation and transition is collapsed to 0.01ms and runs once. Some components also read the media query in JavaScript and skip height or slide animations.

- Do not remove the global rule.
- New animations do not need their own query. The global rule covers them.
- Any movement you add with JavaScript (not CSS) must check the same query.
- Streaming text loses its blur and caret blink under reduced motion. Keep that behavior.

## Theme-switch freeze

When the theme changes, every token flips at once. Transitions would blend hundreds of mismatched colors. The class `theme-switching` on `<html>` sets `transition: none !important` on all elements. Remove the class two animation frames later.

## Hover on touch

Touch devices keep the hover state after a tap. The stylesheet disables row and header hover fills inside `@media (hover: none)`. Do not rely on hover to reveal essential controls. Show them by default on touch.

## Rules

- Animate `transform` and `opacity` where you can. Avoid animating `width`, `height`, or `top` unless the layout change is the point (the approval card height is an exception).
- Name the properties in `transition-[...]`. Do not use `transition-all`.
- Do not add bounce, overshoot, or spring curves.
- Do not animate on every render. Animate on user action, data change, or first appearance.
- Do not add motion to decorative elements that carry no meaning.
