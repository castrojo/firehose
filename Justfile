set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    just --list

# Rebuild the full pipeline: Go binary → feeds JSON → Astro → Pagefind
build:
    npm ci
    cd firehose-go && go build -o firehose cmd/firehose/main.go && ./firehose
    npm run build

# Run the Astro build with wall-clock timing — shows aggregate build time without reconstructing from log timestamps
time-build:
    time npm run build

# Serve the built output and open a browser (foreground server, browser in background)
# main branch: port 4321, base '/firehose'; worktree branches use port 4322, base '/'
serve:
    xdg-open http://localhost:4321/firehose & sleep 1 && npm run preview -- --port 4321

# Dev server with hot reload (skips Pagefind — search won't work)
dev:
    npm run dev -- --port 4321

# Build the production container image locally
container-build:
    podman build -t ghcr.io/castrojo/firehose:local -f Containerfile .

# Run the locally built container and open a browser
# Site is served at http://localhost:8080/firehose/ (matches GitHub Pages base path)
container-run:
    xdg-open http://localhost:8080/firehose & sleep 1 && podman run --rm -p 8080:8080 ghcr.io/castrojo/firehose:local

