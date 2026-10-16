#!/usr/bin/env bash
# repo-inventory.sh — deterministic shape data for a codebase deep dive.
#
# Usage: repo-inventory.sh [REPO_PATH] > inventory.txt
#        REPO_PATH defaults to the current directory.
#
# Read-only. Runs no build, no test, no install. Output is plain text so it
# can be read with the Read tool, or filtered with head/grep, without
# burning context. Every section is independent: a missing tool prints
# "(unavailable)" and the run continues — a partial inventory beats none.

set -uo pipefail

REPO="${1:-.}"
cd "$REPO" 2>/dev/null || { echo "FATAL: cannot enter '$REPO'"; exit 1; }
ROOT="$(pwd)"

hr()  { printf '\n===== %s =====\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }
IS_GIT=0
have git && git rev-parse --git-dir >/dev/null 2>&1 && IS_GIT=1

# Everything that is never hand-written project logic. One ERE, reused by
# every find/grep so the exclusions cannot drift apart. Directory names match
# at any depth and at either end of the path, so no trailing slash is needed.
EX='(^|/)(\.git|node_modules|vendor|venv|\.venv|__pycache__|\.mypy_cache|\.pytest_cache|\.ruff_cache|\.cache|\.gradle|dist|build|target|out|coverage|\.next|\.nuxt|\.idea|\.vscode|site-packages|bower_components|\.tox|htmlcov|__snapshots__|__mocks__|fixtures|testdata|[^/]*\.egg-info|\.temp)(/|$)|\.min\.(js|css)$|\.lock$|/(package-lock\.json|yarn\.lock|poetry\.lock|Cargo\.lock|uv\.lock|pnpm-lock\.yaml|composer\.lock|flake\.lock)$|\.(pyc|pyo|so|dylib|dll|class|jar|zip|tar|gz|whl|egg)$'

SRC_EXT_RE='\.(py|ts|tsx|js|jsx|mjs|cjs|go|rs|java|kt|kts|rb|php|c|h|cc|cpp|hpp|cs|swift|scala|ex|exs|erl|clj|lua|pl|sh|bash|sql|vue|svelte|zig|jl|vim)$'
TEST_RE='(^|/)(test_[^/]*|[^/]*_test|conftest|.*\.(test|spec))\.(py|ts|tsx|js|jsx|mjs|go|rb|java|kt)$'

srcfind() { find . -type f -regextype posix-extended -regex ".*${SRC_EXT_RE}" 2>/dev/null | grep -vE "$EX"; }

# ---------- 0. identity -----------------------------------------------------
hr "IDENTITY"
echo "repo_root: $ROOT"
if [ "$IS_GIT" = 1 ]; then
  echo "git_head: $(git rev-parse --short HEAD 2>/dev/null)"
  echo "git_branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  echo "git_dirty_files: $(git status --porcelain 2>/dev/null | grep -c . )"
  echo "commits_total: $(git rev-list --count HEAD 2>/dev/null)"
  echo "first_commit: $(git log --reverse --format='%ad %s' --date=short 2>/dev/null | head -1)"
  echo "last_commit: $(git log -1 --format='%ad %s' --date=short 2>/dev/null)"
else
  echo "git: (not a git repo)"
fi

# ---------- 1. layout -------------------------------------------------------
hr "TOP-LEVEL LAYOUT"
ls -A1 2>/dev/null | grep -vE '^(\.git|\.DS_Store)$' | head -60
echo
echo "--- depth-2 directories (structure signal) ---"
find . -maxdepth 2 -type d 2>/dev/null | grep -vE "$EX" | sort | head -80

hr "SOURCE FILES BY SIZE (largest 60 = the reading order that matters)"
srcfind | xargs -r wc -l 2>/dev/null | awk '$2!="total"' | sort -rn | head -60

hr "LINES BY EXTENSION (hand-written source only)"
for ext in py ts tsx js jsx go rs java kt rb php c cpp h cs swift sh sql vue svelte; do
  n=$(find . -type f -name "*.$ext" 2>/dev/null | grep -vE "$EX" \
        | xargs -r wc -l 2>/dev/null | awk '$2=="total"{s+=$1} END{print s+0}')
  [ "${n:-0}" -gt 0 ] && printf '%8d  .%s\n' "$n" "$ext"
done | sort -rn

hr "SOURCE FILE COUNT BY TOP-LEVEL DIRECTORY (candidate section seams)"
srcfind | awk -F/ 'NF>2{print $2} NF==2{print "(root)"}' | sort | uniq -c | sort -rn | head -40

# ---------- 2. build, entry points, config ----------------------------------
hr "MANIFESTS AND BUILD FILES"
find . -maxdepth 3 -type f \
  \( -name 'package.json' -o -name 'pyproject.toml' -o -name 'setup.py' -o -name 'setup.cfg' \
     -o -name 'requirements*.txt' -o -name 'Pipfile*' -o -name 'Cargo.toml' -o -name 'go.mod' \
     -o -name 'pom.xml' -o -name 'build.gradle*' -o -name 'settings.gradle*' -o -name 'Gemfile*' \
     -o -name 'composer.json' -o -name 'mix.exs' -o -name 'Makefile' -o -name 'makefile' \
     -o -name 'Taskfile*' -o -name 'justfile' -o -name 'Dockerfile*' -o -name 'docker-compose*.y*ml' \
     -o -name 'tox.ini' -o -name 'noxfile.py' -o -name '*.csproj' -o -name '*.sln' -o -name 'Procfile' \) \
  2>/dev/null | grep -vE "$EX" | sort

hr "ENTRY POINTS"
find . -maxdepth 4 -type f \
  \( -name 'main.py' -o -name '__main__.py' -o -name 'app.py' -o -name 'wsgi.py' -o -name 'asgi.py' \
     -o -name 'manage.py' -o -name 'cli.py' -o -name 'run.py' -o -name 'server.py' -o -name 'worker.py' \
     -o -name 'index.js' -o -name 'index.ts' -o -name 'main.go' -o -name 'main.rs' \
     -o -name 'main.ts' -o -name 'main.js' -o -name 'program.cs' -o -name 'Main.java' \) \
  2>/dev/null | grep -vE "$EX" | sort
echo "--- declared console entry points (manifest lines, scripts/bin/entry_points) ---"
grep -rnE '(console_scripts|entry_points|project\.scripts|tool\.poetry\.scripts|^\s*"bin"|^\s*\[bin\])' \
  --include='pyproject.toml' --include='setup.py' --include='setup.cfg' --include='package.json' . 2>/dev/null \
  | grep -vE "$EX" -A2 | head -30
echo "--- bin/ cmd/ scripts/ dirs ---"
ls -1 ./bin ./cmd ./scripts ./cmd/* 2>/dev/null | head -30

hr "CONFIG AND DATA FILES (names only — never print secret values)"
find . -maxdepth 4 -type f \
  \( -name '*.yml' -o -name '*.yaml' -o -name '*.toml' -o -name '*.ini' -o -name '*.cfg' \
     -o -name '*.json' -o -name '.env*' -o -name '*.conf' -o -name '*.graphql' -o -name '*.proto' \
     -o -name '*.tf' -o -name '*.feature' \) \
  2>/dev/null | grep -vE "$EX" | sort | head -60

# ---------- 3. tests, docs, CI ---------------------------------------------
hr "TEST FILES AND SHAPE"
TESTLIST="$(mktemp 2>/dev/null || echo /tmp/cdd_tests.$$)"
find . -type f -regextype posix-extended -regex ".*${TEST_RE}" 2>/dev/null | grep -vE "$EX" | sort > "$TESTLIST"
head -60 "$TESTLIST"
echo "--- test file count / total test source lines ---"
wc -l < "$TESTLIST" | tr -d ' '
xargs -r wc -l < "$TESTLIST" 2>/dev/null | awk '$2=="total"{print $1}'
rm -f "$TESTLIST"
echo "--- fixtures / mocks / factories / snapshots dirs ---"
find . -type d \( -iname 'fixtures' -o -iname 'mocks' -o -iname '__mocks__' -o -iname 'factories' \
  -o -iname 'testdata' -o -iname '__snapshots__' -o -iname 'golden' \) 2>/dev/null | grep -vE "$EX" | head -20

hr "DOCS: promise-vs-code reconciliation input"
find . -maxdepth 3 -type f \
  \( -iname 'README*' -o -iname '*.md' -o -iname '*.rst' -o -iname '*.adoc' -o -iname 'CONTRIBUTING*' \
     -o -iname 'ARCHITECTURE*' -o -iname 'DESIGN*' -o -iname 'CHANGELOG*' -o -iname 'ROADMAP*' \
     -o -iname '*SPEC*' -o -iname 'CLAUDE.md' -o -iname 'AGENTS.md' \) \
  2>/dev/null | grep -vE "$EX" | xargs -r wc -l 2>/dev/null | awk '$2!="total"' | sort -rn | head -30

hr "CI AND AUTOMATION"
find . -maxdepth 5 -type f \
  \( -path '*/.github/workflows/*' -o -path '*/.github/actions/*' -o -name '.gitlab-ci*' \
     -o -path '*/.circleci/*' -o -name 'Jenkinsfile' -o -name '.pre-commit-config.yaml' \
     -o -name 'azure-pipelines*' -o -name '*.service' -o -name 'crontab*' -o -name '*.timer' \) \
  2>/dev/null | grep -vE "$EX" | sort | head -40

# ---------- 4. history and intent -------------------------------------------
hr "GIT ACTIVITY: HOTSPOTS"
if [ "$IS_GIT" = 1 ]; then
  SINCE=''
  if [ "$(git log --since='6 months ago' --oneline 2>/dev/null | grep -c .)" -gt 0 ]; then
    SINCE='--since=6.months.ago'
    echo "window: last 6 months"
  else
    echo "window: ALL history (no commits in the last 6 months)"
  fi
  git log --name-only --format='' $SINCE 2>/dev/null | grep -vE '^$' | grep -vE "$EX" \
    | sort | uniq -c | sort -rn | head -30
  echo "--- 20 most-recently-modified source files ---"
  srcfind | xargs -r ls -lt --time-style=+%Y-%m-%d 2>/dev/null \
    | head -20 | awk '{$1=$2=$3=$4=$5=""; sub(/^ +/,""); print "  " $0}'
else
  echo "(not a git repo — hotspot and intent signals unavailable)"
fi

hr "RECENT HISTORY (intent and evolution)"
if [ "$IS_GIT" = 1 ]; then
  git log -20 --format='%ad %h %s' --date=short 2>/dev/null
  echo "--- file churn by month ---"
  git log --format='%ad' --date=format:'%Y-%m' 2>/dev/null | sort | uniq -c | tail -24
else
  echo "(unavailable)"
fi

# ---------- 5. cross-cutting code signals ----------------------------------
hr "INTENT MARKERS IN SOURCE (what authors flagged as unfinished)"
srcfind | xargs -r grep -nEI \
  '(TODO|FIXME|XXX|HACK|DEPRECATED|NOT[[:space:]]+IMPLEMENTED|coming soon|placeholder|for now|temporary|workaround)' \
  2>/dev/null | head -40

hr "SIDE-EFFECT SURFACE (which files reach outside the process)"
probe() {
  local label="$1" pattern="$2"; shift 2
  echo "--- $label ---"
  grep -rlIE "$pattern" "$@" . 2>/dev/null | grep -vE "$EX" | sort | head -15
}
probe "subprocess / shell"        '\b(subprocess|os\.system|execSync|spawnSync|child_process|shell_exec|popen)\b'     --include='*.py' --include='*.ts' --include='*.js' --include='*.go' --include='*.rb'
probe "network clients"           '\b(requests\.|httpx|urllib|aiohttp|fetch\(|axios|http\.Client|net/http|OkHttp|RestTemplate)\b' --include='*.py' --include='*.ts' --include='*.js' --include='*.go' --include='*.java'
probe "database / persistence"    '\b(sqlalchemy|psycopg|pymysql|sqlite3|redis|prisma|typeorm|sequelize|mongoose|knex|sql\.Open|diesel|ActiveRecord|migrate)\b' --include='*.py' --include='*.ts' --include='*.js' --include='*.go' --include='*.rb'
probe "filesystem writes"         '\b(write_text|writeFile|writeFileSync|fs\.write|fs\.promises\.write|makedirs|mkdirAll|to_csv|savefig|open\([^)]*,[^)]*[wax])\b' --include='*.py' --include='*.ts' --include='*.js' --include='*.go'
probe "env / secrets access"      '\b(process\.env|os\.environ|getenv|SecretKey|System\.getenv|ENV\[)\b'               --include='*.py' --include='*.ts' --include='*.js' --include='*.go' --include='*.rb'
probe "global / module state"     '(^\s*global |^\s*static |^[A-Z][A-Z0-9_]{2,}\s*[:=]|let [a-z][A-Za-z]*\s*=\s*(new Map|new Set|\{\}|\[\]))' --include='*.py' --include='*.ts' --include='*.js' --include='*.go'
probe "concurrency primitives"    '\b(asyncio|threading|ThreadPool|ProcessPool|concurrent\.futures|go func|sync\.Mutex|Worker|Channel|@task|effect)\b' --include='*.py' --include='*.ts' --include='*.js' --include='*.go'
probe "logging / observability"   '\b(logging|logger|pino|winston|log4j|slog|print\(|console\.log|tracing|metrics)\b'  --include='*.py' --include='*.ts' --include='*.js' --include='*.go'

hr "DECLARED DEPENDENCIES (direct only, from manifests)"
for m in package.json pyproject.toml requirements.txt setup.py Cargo.toml go.mod Gemfile; do
  [ -f "$m" ] && { echo "### $m"; grep -nE '^\s*("?[a-zA-Z@][^"]*"?\s*[:=]|dependencies|install_requires|requires)' "$m" 2>/dev/null | head -25; }
done

hr "DONE"
echo "Next: choose section seams from 'LINES BY EXTENSION' and 'SOURCE FILE COUNT BY"
echo "TOP-LEVEL DIRECTORY', then build a coverage ledger assigning every source file"
echo "to exactly one section before dispatching Wave 1."
