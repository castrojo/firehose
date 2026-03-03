set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    just --list

# Rebuild the full pipeline: Go binary → feeds JSON → Astro → Pagefind
build:
    cd firehose-go && go build -o firehose cmd/firehose/main.go && ./firehose
    npm run build

# Serve the built output and open a browser (foreground server, browser in background)
serve:
    xdg-open http://localhost:4321/firehose & sleep 1 && npm run preview

# Dev server with hot reload (skips Pagefind — search won't work)
dev:
    npm run dev
