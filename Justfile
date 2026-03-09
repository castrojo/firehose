set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    just --list

# Rebuild the full pipeline: Go binary → feeds JSON → Astro → Pagefind
build:
    npm ci
    cd firehose-go && go build -o firehose cmd/firehose/main.go && ./firehose
    npm run build

# Serve the built output and open a browser (foreground server, browser in background)
# main branch: port 4321, base '/firehose'; worktree branches use port 4322, base '/'
serve:
    xdg-open http://localhost:4321/firehose & sleep 1 && npm run preview -- --port 4321

# Dev server with hot reload (skips Pagefind — search won't work)
dev:
    npm run dev -- --port 4321
