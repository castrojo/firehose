set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    just --list

# Rebuild the full pipeline: Go binary → feeds JSON → Astro → Pagefind
build:
    cd firehose-go && go build -o firehose cmd/firehose/main.go && ./firehose
    npm run build

# Serve the built output and open a browser (foreground server, browser in background)
# NOTE: worktree uses port 4322 and base '/'; main branch uses port 4321 and base '/firehose'
serve:
    xdg-open http://localhost:4322/ & sleep 1 && npm run preview -- --port 4322

# Dev server with hot reload (skips Pagefind — search won't work)
dev:
    npm run dev -- --port 4322
