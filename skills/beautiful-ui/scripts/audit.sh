#!/usr/bin/env bash
# Flag values that bypass the Beautiful UI tokens.
#
# Usage: audit.sh <file-or-dir> [more paths...]
#
#   ERROR  hard-coded color (hex, rgb, hsl, oklch, Tailwind palette class).
#   WARN   default radius names, transition-all, font-serif, pure white or black.
#   INFO   arbitrary radius or shadow values. Review by hand.
#
# Exit 0 when there are no errors. Warnings and info never fail the run.
# Matches in comments and strings are reported too. Review each hit.

set -uo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: audit.sh <file-or-dir> [more paths...]" >&2
  exit 2
fi

TARGETS=("$@")
for target in "${TARGETS[@]}"; do
  [ -e "$target" ] || { echo "not found: $target" >&2; exit 2; }
done

GREP_OPTS=(
  -rnoEH
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist
  --exclude-dir=build --exclude-dir=out --exclude-dir=.git --exclude-dir=.turbo
  --exclude=beautiful-ui.css --exclude=package-lock.json
  --include='*.tsx' --include='*.jsx' --include='*.ts' --include='*.js'
  --include='*.css' --include='*.scss' --include='*.html' --include='*.vue'
  --include='*.svelte' --include='*.mdx'
)

COLOR_RE='#[0-9a-fA-F]{3,8}\b|(^|[^a-zA-Z0-9])(rgba?|hsla?|oklch|oklab|lab|lch)\('
PALETTE_RE='\b(bg|text|border|ring|fill|stroke|from|via|to|outline|shadow|divide|placeholder|decoration|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b'
NAMED_RE='\b((bg|border|ring|fill|stroke|divide|outline)-(white|black)|text-black)\b'
RADIUS_RE='\brounded(-[trbl]{1,2})?-(sm|md|lg|xl|2xl|3xl)\b'
ARB_RE='\b(rounded|shadow)(-[trbl]{1,2})?-\[[^]]+\]'
FONT_RE='\bfont-serif\b'
TRANSITION_RE='\btransition-all\b'

ERRORS=0
WARNINGS=0
INFOS=0

scan() {
  local level="$1" pattern="$2" message="$3" hits count
  hits="$(grep "${GREP_OPTS[@]}" -e "$pattern" "${TARGETS[@]}" 2>/dev/null || true)"
  [ -n "$hits" ] || return 0
  count="$(printf '%s\n' "$hits" | wc -l)"
  case "$level" in
    ERROR) ERRORS=$((ERRORS + count)) ;;
    WARN) WARNINGS=$((WARNINGS + count)) ;;
    INFO) INFOS=$((INFOS + count)) ;;
  esac
  while IFS= read -r hit; do
    printf '%-5s %s\n      %s\n' "$level" "$hit" "$message"
  done <<< "$hits"
}

suggest_for() {
  case "$1" in
    *-blue-*|*-sky-*|*-indigo-*|*-cyan-*|*-violet-*|*-purple-*) echo "use accent, accent-ink, or accent-tint" ;;
    *-green-*|*-emerald-*|*-teal-*|*-lime-*) echo "use green or green-tint" ;;
    *-red-*|*-rose-*|*-pink-*) echo "use red or red-tint" ;;
    *-orange-*|*-amber-*|*-yellow-*) echo "use orange or orange-tint" ;;
    text-*) echo "use text-ink, text-ink-2, or text-ink-3" ;;
    border-*|divide-*|ring-*|outline-*) echo "use border-line or border-line-strong" ;;
    *) echo "use bg-surface, bg-inset, bg-hover, or bg-field" ;;
  esac
}

palette_hits="$(grep "${GREP_OPTS[@]}" -e "$PALETTE_RE" "${TARGETS[@]}" 2>/dev/null || true)"
if [ -n "$palette_hits" ]; then
  ERRORS=$((ERRORS + $(printf '%s\n' "$palette_hits" | wc -l)))
  while IFS= read -r hit; do
    printf 'ERROR %s\n      hard-coded palette class; %s\n' "$hit" "$(suggest_for "${hit##*:}")"
  done <<< "$palette_hits"
fi

scan ERROR "$COLOR_RE" "hard-coded color; use a token from references/tokens.md (may be a false positive for a CSS id or anchor)"
scan WARN "$NAMED_RE" "pure white or black; use bg-surface, text-ink, or a token unless it sits on a filled accent or status fill"
scan WARN "$RADIUS_RE" "default radius name; use rounded-chip (6px), rounded-control (8px), rounded-card (10px), rounded-window (14px), or rounded-full for pills"
scan WARN "$TRANSITION_RE" "transition-all animates every property; name them, for example transition-[transform,background-color]"
scan WARN "$FONT_RE" "the system uses Inter and JetBrains Mono only; use font-sans or font-mono"
scan INFO "$ARB_RE" "arbitrary radius or shadow; keep it only if the value is intentional, otherwise use a token"

echo
echo "summary: $ERRORS error(s), $WARNINGS warning(s), $INFOS info"
[ "$ERRORS" -eq 0 ]
