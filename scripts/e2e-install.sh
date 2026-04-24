#!/usr/bin/env bash
# End-to-end smoke test for `@conductor-kit/install`.
#
# Creates a scratch repo, runs `npx @conductor-kit/install` for each agent
# variant, and asserts the files each adapter is supposed to copy actually
# land in the right places. Uses the published npm package, so this is a
# real post-publish canary — if it passes, users running `npx` in their own
# repos will see the same layout.
#
# Usage:
#   scripts/e2e-install.sh            # all 3 agents
#   scripts/e2e-install.sh claude     # single agent
#
# Exits non-zero with a readable diff if any expected file is missing.

set -euo pipefail

AGENTS_TO_TEST=("${1:-all}")
TMP_ROOT="$(mktemp -d -t cnd-e2e-XXXXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILED=1; }
FAILED=0

run_install() {
  local agent="$1" repo="$2"
  (
    cd "$repo"
    git init -q
    git commit -q --allow-empty -m "init"
    npx --yes @conductor-kit/install \
      --agent "$agent" \
      --project-key E2E \
      --jira-url "https://example.atlassian.net" \
      --label "E2E" \
      > "$repo/.install.log" 2>&1
  )
}

assert_file() {
  local repo="$1" rel="$2" label="$3"
  if [ -f "$repo/$rel" ]; then
    pass "$label: $rel"
  else
    fail "$label: missing $rel"
  fi
}

assert_contains() {
  local file="$1" needle="$2" label="$3"
  if grep -qF "$needle" "$file"; then
    pass "$label: contains \"$needle\""
  else
    fail "$label: expected \"$needle\" in $file"
  fi
}

test_claude() {
  local repo="$TMP_ROOT/claude"
  mkdir -p "$repo"
  printf '\n[claude]\n'
  run_install claude "$repo"
  for cmd in init where pick ship land recap draft tune autopilot; do
    assert_file "$repo" ".claude/commands/conductor-$cmd.md" "claude"
  done
  assert_file "$repo" ".conductor/workflow.yml" "claude/seed"
  assert_contains "$repo/.conductor/workflow.yml" "E2E" "claude/seed"
}

test_codex() {
  local repo="$TMP_ROOT/codex"
  mkdir -p "$repo"
  printf '\n[codex]\n'
  run_install codex "$repo"
  for cmd in init where pick ship land recap draft tune autopilot; do
    assert_file "$repo" ".codex/prompts/conductor-$cmd.md" "codex"
  done
  assert_file "$repo" "AGENTS.md" "codex/fragment-merge"
  assert_contains "$repo/AGENTS.md" "<!-- conductor-kit begin -->" "codex/markers"
  assert_contains "$repo/AGENTS.md" "<!-- conductor-kit end -->" "codex/markers"
}

test_cursor() {
  local repo="$TMP_ROOT/cursor"
  mkdir -p "$repo"
  printf '\n[cursor]\n'
  run_install cursor "$repo"
  for rule in conductor-workflow conductor-ui conductor-conventions; do
    assert_file "$repo" ".cursor/rules/$rule.mdc" "cursor/rules"
  done
  for cmd in init where pick ship land recap draft tune autopilot; do
    assert_file "$repo" ".cursor/commands/conductor-$cmd.md" "cursor/commands"
  done
}

case "${AGENTS_TO_TEST[0]}" in
  all)     test_claude; test_codex; test_cursor ;;
  claude)  test_claude ;;
  codex)   test_codex ;;
  cursor)  test_cursor ;;
  *) echo "usage: $0 [all|claude|codex|cursor]" >&2; exit 2 ;;
esac

printf '\n'
if [ "$FAILED" -eq 0 ]; then
  printf '\033[32mOK\033[0m — all adapters installed the expected files.\n'
  exit 0
else
  printf '\033[31mFAIL\033[0m — see failures above. Tmp dir: %s\n' "$TMP_ROOT"
  trap - EXIT   # keep the dir around for inspection
  exit 1
fi
