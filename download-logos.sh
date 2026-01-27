#!/bin/bash
# Download CNCF project logos from cncf/artwork repository
# Simplified version with better error handling

ARTWORK_BASE="https://raw.githubusercontent.com/cncf/artwork/main/projects"
LOGOS_DIR="public/logos"

# List of artwork directory names (these exist in cncf/artwork repo)
ARTWORK_DIRS=(
  "argo" "cert-manager" "cilium" "cloudevents" "containerd" "coredns" "crio"
  "crossplane" "cubefs" "dapr" "dragonfly" "envoy" "etcd" "falco" "fluentd"
  "flux" "harbor" "grpc" "helm" "in-toto" "istio" "jaeger" "keda" "knative"
  "kubeedge" "kubernetes" "linkerd" "opa" "prometheus" "rook" "spiffe"
  "spire" "tuf" "tikv" "vitess" "backstage" "buildpacks" "chaosmesh"
  "cloudcustodian" "cni" "contour" "cortex" "emissary" "karmada" "keycloak"
  "kubevela" "kubevirt" "kubeflow" "kyverno" "litmus" "longhorn" "metal3"
  "nats" "notary" "openfeature" "openkruise" "opentelemetry"
  "operatorframework" "strimzi" "thanos" "volcano"
)

SUCCESS=0
FAILED=0

echo "Downloading logos for ${#ARTWORK_DIRS[@]} projects..."

for DIR in "${ARTWORK_DIRS[@]}"; do
  mkdir -p "$LOGOS_DIR/$DIR"
  URL="$ARTWORK_BASE/$DIR/icon/color/${DIR}-icon-color.svg"
  OUTPUT="$LOGOS_DIR/$DIR/icon-color.svg"
  
  if curl -f -s -m 10 -L "$URL" -o "$OUTPUT" 2>/dev/null && [ -s "$OUTPUT" ]; then
    echo "✓ $DIR"
    ((SUCCESS++))
  else
    echo "✗ $DIR"
    rm -f "$OUTPUT"
    ((FAILED++))
  fi
done

# Create placeholder
cat > "$LOGOS_DIR/placeholder.svg" <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#E5E5E5" stroke="#999" stroke-width="2"/>
  <text x="50" y="60" font-family="Arial" font-size="40" fill="#666" text-anchor="middle">?</text>
</svg>
EOF

echo ""
echo "Summary: $SUCCESS succeeded, $FAILED failed"
echo "Placeholder created"
