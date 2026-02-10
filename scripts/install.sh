#!/usr/bin/env bash
set -euo pipefail

RAW_URL="${CLOCKMD_RAW_URL:-https://raw.githubusercontent.com/apollostreetcompany/clock.md/master/clock.md}"

usage() {
  cat <<'EOF'
Usage: scripts/install.sh [TARGET_PATH]

Downloads clock.md from GitHub and writes it to TARGET_PATH.

Defaults:
  TARGET_PATH: ./clock.md

Environment:
  CLOCKMD_RAW_URL  Override the source URL (defaults to the canonical raw URL).
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

target_path="${1:-./clock.md}"
target_dir="$(dirname "$target_path")"

mkdir -p "$target_dir"

tmp_file="$(mktemp)"
cleanup() { rm -f "$tmp_file"; }
trap cleanup EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$RAW_URL" -o "$tmp_file"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$tmp_file" "$RAW_URL"
else
  echo "error: curl or wget is required" >&2
  exit 1
fi

if [[ ! -s "$tmp_file" ]]; then
  echo "error: download failed or produced an empty file" >&2
  exit 1
fi

mv "$tmp_file" "$target_path"
trap - EXIT

echo "Installed clock.md -> $target_path"

