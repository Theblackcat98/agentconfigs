#!/usr/bin/env bash
# Install the Beautiful UI stylesheet into a project.
#
# Usage: install.sh <project-dir> [--mode tailwind|plain] [--dest <path>] [--force]
#
#   --mode tailwind  Tailwind v4 project (default). Copies the full stylesheet
#                    and drops its own @import "tailwindcss" line, so the main
#                    stylesheet imports Tailwind once.
#   --mode plain     No Tailwind. Writes custom properties and plain rules only.
#                    Drops @import, @custom-variant, and the utility mapping.
#                    Keeps the radius, easing, and font variables.
#   --dest <path>    Output path relative to <project-dir>.
#                    Default: styles/beautiful-ui.css
#   --force          Overwrite an existing file.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$SKILL_DIR/assets/beautiful-ui.css"

die() {
  echo "error: $*" >&2
  exit 1
}

usage() {
  local code="${1:-2}"
  cat <<'EOF'
Usage: install.sh <project-dir> [--mode tailwind|plain] [--dest <path>] [--force]

  --mode tailwind  Tailwind v4 project (default)
  --mode plain     Plain CSS custom properties and rules, no Tailwind
  --dest <path>    Output path relative to <project-dir> (default: styles/beautiful-ui.css)
  --force          Overwrite an existing file
EOF
  exit "$code"
}

PROJECT=""
MODE="tailwind"
DEST="styles/beautiful-ui.css"
FORCE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --mode)
      [ "$#" -ge 2 ] || usage
      MODE="$2"
      shift 2
      ;;
    --dest)
      [ "$#" -ge 2 ] || usage
      DEST="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage 0
      ;;
    -*)
      echo "unknown option: $1" >&2
      usage
      ;;
    *)
      [ -z "$PROJECT" ] || { echo "unexpected argument: $1" >&2; usage; }
      PROJECT="$1"
      shift
      ;;
  esac
done

[ -n "$PROJECT" ] || usage
[ -d "$PROJECT" ] || die "project directory not found: $PROJECT"
[ -f "$SOURCE" ] || die "source stylesheet missing: $SOURCE"
case "$MODE" in
  tailwind|plain) ;;
  *) die "--mode must be tailwind or plain" ;;
esac

TARGET="$PROJECT/$DEST"
if [ -e "$TARGET" ] && [ "$FORCE" -ne 1 ]; then
  die "destination exists: $TARGET (pass --force to overwrite)"
fi
mkdir -p "$(dirname "$TARGET")"

if [ "$MODE" = "tailwind" ]; then
  awk '!done && /^@import "tailwindcss";/ { done = 1; next } { print }' "$SOURCE" > "$TARGET"
else
  awk '
    /^@import "tailwindcss";/ { next }
    /^@custom-variant / { next }
    /^@theme inline [{]/ { inline = 1; print ":root {"; next }
    inline && /^[}]/ { inline = 0; print "}"; next }
    inline { if ($0 ~ /^  --(radius|ease|font)-/) print; next }
    /^@theme [{]/ { sub(/^@theme [{]/, ":root {") }
    { print }
  ' "$SOURCE" > "$TARGET"

  if grep -Eq '^@(theme|import|custom-variant)' "$TARGET"; then
    die "plain build still contains Tailwind at-rules: $TARGET"
  fi
fi

[ -s "$TARGET" ] || die "output is empty: $TARGET"

echo "installed: $TARGET ($MODE)"

if [ "$MODE" = "tailwind" ]; then
  if ! grep -Eq '"tailwindcss"[[:space:]]*:[[:space:]]*"[~^]?4' "$PROJECT/package.json" 2>/dev/null; then
    echo "warning: tailwindcss v4 not found in $PROJECT/package.json (install with: npm install tailwindcss@^4)"
  fi
  echo "next: in your main stylesheet, directly after @import \"tailwindcss\";, add an import"
  echo "      that points to $DEST (the path must be relative to that stylesheet)."
else
  echo "next: load $DEST before your own styles, then write CSS with var(--token) values."
fi

echo "note: the stylesheet uses --font-inter and --font-mono-face when they exist."
echo "      Otherwise it falls back to the font names \"Inter\" and \"JetBrains Mono\"."
echo "      Load both fonts in the project, or accept the fallback."
