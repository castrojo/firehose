# syntax=docker/dockerfile:1
# Multi-stage Chainguard build — Renovate updates all digests automatically.
#
# Stage 1: Build Go binary and fetch live CNCF feeds (~2 min, requires network)
# Stage 2: Build Astro static site
# Stage 3: Serve with Chainguard nginx (nonroot, port 8080)
#
# Local access: http://localhost:8080/firehose/  (matches GitHub Pages base path)

# ── Stage 1: Go pipeline ────────────────────────────────────────────────────
FROM cgr.dev/chainguard/go:latest@sha256:28e641f5949f6461ec0ee8d0036feeda7e3564eb43788c20ba57889de7d689b0 AS go-builder

WORKDIR /build
COPY firehose-go/ ./firehose-go/

RUN cd firehose-go && go build -o firehose cmd/firehose/main.go

# Binary writes to ../src/data/releases.json relative to its working directory
RUN mkdir -p src/data && cd firehose-go && ./firehose

# ── Stage 2: Astro site builder ─────────────────────────────────────────────
FROM cgr.dev/chainguard/node:latest-dev@sha256:35eba3b3a13163635bbdb31e3e93e1a1a80378b2b462bddd29d59e3184ff96b1 AS site-builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
COPY public/ ./public/
COPY astro.config.mjs tsconfig.json ./

# Inject live feed data from the Go stage
COPY --from=go-builder /build/src/data/releases.json ./src/data/releases.json

RUN npm run build

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM cgr.dev/chainguard/nginx:latest@sha256:245afcb4eb018784059cae8c28328d70576f2a6231b8c0e25594620a70a6aa72

# Copy into /firehose subdir — matches astro.config.mjs base: '/firehose'
COPY --from=site-builder /build/dist/ /usr/share/nginx/html/firehose/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
