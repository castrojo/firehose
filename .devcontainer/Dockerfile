# Chainguard wolfi-base — Renovate updates the digest automatically
FROM cgr.dev/chainguard/wolfi-base:latest@sha256:d19a19f43b4e67781aa0177c52a8a8b93bde751d70ce214f10fbd4aaebae6f90

RUN apk add --no-cache \
    bash \
    curl \
    git \
    go-1.26 \
    nodejs-25 \
    npm \
    just

ENV GOPATH=/root/go
ENV PATH="${GOPATH}/bin:/usr/local/go/bin:${PATH}"

WORKDIR /workspaces/firehose
