#!/usr/bin/env sh
# Run FolLand locally on macOS/Linux (installs, builds when needed, starts).
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js is not installed. Get the LTS from https://nodejs.org"; exit 1; }
exec node scripts/serve.mjs "$@"
