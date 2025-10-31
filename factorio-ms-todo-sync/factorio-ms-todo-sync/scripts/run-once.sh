#!/usr/bin/env bash
set -euo pipefail
CHANGES="${1:-./test/sample_changes.jsonl}"
export CHANGELOG_FILE="$(realpath "$CHANGES")"
npm run start
