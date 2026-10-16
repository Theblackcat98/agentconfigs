---
name: beautiful-ui
description: Apply the Beautiful UI design system to the current work. Cool blue-tinted neutrals, hairline borders, layered soft shadows, Inter and JetBrains Mono, pill buttons, status pills, and light and dark tokens. Use when the user invokes beautiful-ui, asks to restyle or theme a UI in the Beautiful UI look, or builds AI chat, agent, approval, thinking, tool-call, records table, or prompt composer interfaces. Installs a tokens stylesheet and audits code for values that bypass the tokens.
metadata:
  opencode/slash: true
  opencode/autoinvoke: false
  type: style
  version: "1.0"
---

# Beautiful UI

Apply the Beautiful UI design system to the code the user is working on. The system has three parts:

1. A token layer: surfaces, ink, borders, accent, status colors, shadows, radii, easing, and fonts. Light and dark values.
2. Component recipes for buttons, pills, chips, cards, menus, and AI-native interfaces.
3. Rules for spacing, type, motion, and states.

The exact values are in `assets/beautiful-ui.css`. Do not guess values. Read the reference that matches the task.

## Step 1: Identify the target

1. Find the project root. Read `package.json` for `tailwindcss` (must be v4 for the Tailwind mode), `next`, and `react`.
2. Find the main stylesheet, for example `app/globals.css`, `src/index.css`, or a file under `styles/`.
3. Identify the file or component the user wants styled.
4. If the request does not name a screen, component, or the whole project, ask one short question. If the user asked for the whole project, proceed.

Choose the install mode:

| Project | Mode |
| --- | --- |
| Tailwind v4 | `tailwind` |
| Anything else (plain CSS, Tailwind v3, other frameworks) | `plain` |

## Step 2: Install the tokens (once per project)

Skip this step if the project already has the stylesheet. Check for `beautiful-ui.css` or a `--surface:` declaration in the project CSS.

Run the installer. `<skill-dir>` is this skill's base directory, shown in the loaded skill header:

```bash
bash <skill-dir>/scripts/install.sh <project-dir> --mode tailwind --dest <path-inside-project>
```

- Use a `--dest` inside the project's stylesheet folder, for example `app/beautiful-ui.css` or `src/styles/beautiful-ui.css`.
- Tailwind mode: add an import to the main stylesheet, directly after `@import "tailwindcss";`. The path must be relative to that stylesheet.
- Plain mode: load the file before the project's own styles, then write CSS with `var(--token)` values. Do not use Tailwind classes in plain mode.
- The script refuses to overwrite an existing file. Pass `--force` only when the user agrees.

The fonts Inter and JetBrains Mono must load in the project. See `references/typography-layout.md`.

## Step 3: Apply the system

Follow these rules. Read the reference named in the table for exact classes and values.

| Need | Read |
| --- | --- |
| Token values and Tailwind utility names | `references/tokens.md` |
| Recipes for buttons, pills, chips, inputs, cards, menus, AI components, records table, sidebar | `references/components.md` |
| Type sizes, weights, spacing, radii, widths, icons | `references/typography-layout.md` |
| Durations, easing, keyframes, reduced motion | `references/motion.md` |
| Light and dark themes, theme toggle, pre-paint script | `references/dark-mode.md` |
| Which parts of the stylesheet to keep when trimming | `references/source-map.md` |

### Rules

1. **Tokens only.** Do not write hex, `rgb()`, `hsl()`, `oklch()`, or Tailwind palette classes such as `gray-500` or `blue-600`. Use `text-ink`, `bg-surface`, `border-line`, and the other tokens.
2. **Layer surfaces.** The page sits on the body backdrop. Panels are `bg-surface` with `shadow-card`. Nested areas use `bg-inset` or `bg-field`.
3. **Do not add a border to a shadowed element.** The shadow token already includes a 1px ring. Adding a border doubles the edge.
4. **Borders are solid tokens.** Use `border-line` or `border-line-strong`. Never use alpha borders such as `border-black/10`.
5. **Radii nest.** Chips 6px (`rounded-chip`), controls 8px (`rounded-control`), cards 10px (`rounded-card`), windows 14px (`rounded-window`), pills `rounded-full`. An inner element has a smaller radius than its container.
6. **One filled action per surface.** Use `primary` (ink) or `accent` (blue) once. Other actions are `secondary`, `ghost`, or `quiet`.
7. **Color is a condiment.** Green, orange, red, and accent carry meaning: status, delta, or the single primary action. Everything else is ink on surface.
8. **Type.** Body is 14px. UI labels and buttons are 13px. Meta text is 12px or 11.5px. Weights are 400 for body, 500 for most UI, and 600 for headings. Use `tabular-nums` for any number that changes or sits in a column. Use JetBrains Mono (`font-mono`) for code, file names, and identifiers.
9. **Buttons are pills.** Use `rounded-full`. Scale to 0.96 on press (`active:scale-[0.96]`).
10. **Motion is short.** Use 100 to 400ms with `cubic-bezier(0.23, 1, 0.32, 1)`. Do not add bounce or overshoot. Name the animated properties. Do not use `transition-all`.
11. **Keep accessibility rules.** Keep the global focus ring and the reduced-motion rule. Do not remove outlines.
12. **Support both themes through tokens.** Do not add separate dark colors. The `.dark` class on `<html>` switches every token.
13. **Backdrop.** Keep the striped body backdrop for full-page showcases. For dense product screens, you may set the body background to `var(--canvas)`. Say so when you do.
14. **Gradients only for shimmer text.** Do not add gradient fills to buttons, cards, or backgrounds.
15. **No new fonts or icon sets.** Use Inter and JetBrains Mono. Use line icons with 2px stroke, round caps, and `currentColor`.

### Starting points

These components are the best base for new interfaces. Their recipes are in `references/components.md`:

- Atoms: Button, StatusPill, Chip, ValuePill, EntityChip, Switch, SegmentedControl, ThemeToggle, ProgressRing, Shimmer, TextRow, StreamText
- AI interfaces: ApprovalCard, ThinkingState, ToolChips, ChatComposer, streaming text
- Data: RecordsTable, FilterTable status pills, InsightCards tooltip
- Shell: SidebarNav, GlideMenu

## Step 4: Verify

1. Run the audit on every file you changed:

   ```bash
   bash <skill-dir>/scripts/audit.sh <changed-file-or-dir>
   ```

   Fix every ERROR. Review each WARN and INFO. The script exits 1 while errors remain.

2. If the project uses Tailwind, run its build command to confirm the classes compile. Use a timeout.
3. If a dev server is available, check both themes and keyboard focus on the changed screens.
4. Confirm that the token files are the only place that defines color values, except for documented exceptions such as entity colors passed as data.

## Step 5: Report

Keep the summary short:

- Which files were changed or created, and the install mode used.
- Which components or screens were restyled.
- The audit result, with the count of errors, warnings, and info lines.
- Any intentional exceptions, and why.

Do not add features the user did not ask for.

## Resources

- `assets/beautiful-ui.css`: the complete stylesheet. Tokens, base rules, component blocks, keyframes, and reduced-motion rules.
- `scripts/install.sh`: copies the stylesheet into a project. Modes: `tailwind` and `plain`.
- `scripts/audit.sh`: flags hard-coded colors, palette classes, default radius names, `transition-all`, and similar values.
- `references/`: token values, component recipes, typography and layout, motion, dark mode, and the stylesheet source map.

## License and credit

Beautiful UI is MIT licensed. The shadow scale in `assets/beautiful-ui.css` is adapted from the shadow-plugin package (MIT, by Florian Kiem).
