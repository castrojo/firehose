#!/bin/bash
# Update CNCF project logos from the cncf/artwork repository
# This script fetches logos for all projects tracked in The Firehose
# 
# Usage:
#   ./scripts/update-logos.sh [--force]
#
# Options:
#   --force    Re-download all logos even if they exist

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGOS_DIR="$PROJECT_ROOT/public/logos"
ARTWORK_BASE_URL="https://raw.githubusercontent.com/cncf/artwork/main/projects"

FORCE_UPDATE=false
DOWNLOADED=0
SKIPPED=0
FAILED=0

# Parse arguments
if [[ "$1" == "--force" ]]; then
  FORCE_UPDATE=true
fi

echo "🎨 CNCF Logo Updater"
echo "================================"
echo "Logos directory: $LOGOS_DIR"
echo "Force update: $FORCE_UPDATE"
echo ""

# Create logos directory if it doesn't exist
mkdir -p "$LOGOS_DIR"

# Function to normalize project name to match cncf/artwork structure
normalize_project_name() {
  local name="$1"
  echo "$name" | tr '[:upper:]' '[:lower:]' | sed -e 's/ /-/g' -e 's/[()]//g' -e 's/\.//g'
}

# Function to get artwork name (handles special cases)
get_artwork_name() {
  local normalized="$1"
  
  case "$normalized" in
    "open-policy-agent") echo "opa" ;;
    "the-update-framework") echo "tuf" ;;
    "in-toto") echo "in-toto" ;;
    "service-mesh-interface") echo "smi" ;;
    "open-container-initiative") echo "oci" ;;
    "cloud-native-network-function") echo "cnf" ;;
    "spec") echo "cloudevents" ;;
    "cri-o") echo "crio" ;;
    *) echo "$normalized" ;;
  esac
}

# Function to download logo
download_logo() {
  local project_name="$1"
  local normalized=$(normalize_project_name "$project_name")
  local logo_dir="$LOGOS_DIR/$normalized"
  local logo_file="$logo_dir/icon-color.svg"
  
  # Check if logo already exists (unless force update)
  if [[ -f "$logo_file" && "$FORCE_UPDATE" == "false" ]]; then
    echo "  ✓ $project_name (exists)"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi
  
  # Create directory
  mkdir -p "$logo_dir"
  
  # Get artwork name
  local artwork_name=$(get_artwork_name "$normalized")
  local url="$ARTWORK_BASE_URL/$artwork_name/icon/color/${artwork_name}-icon-color.svg"
  
  # Try downloading
  if curl -s -f -L "$url" -o "$logo_file" 2>/dev/null; then
    # Verify it's actually an SVG
    if grep -q "<svg" "$logo_file" 2>/dev/null; then
      echo "  ✓ $project_name (downloaded)"
      DOWNLOADED=$((DOWNLOADED + 1))
      return 0
    else
      rm -f "$logo_file"
    fi
  fi
  
  echo "  ✗ $project_name (not found)"
  FAILED=$((FAILED + 1))
  # Keep empty directory as marker
}

# Read project names from feeds.ts
echo "Reading project list from src/config/feeds.ts..."
FEEDS_FILE="$PROJECT_ROOT/src/config/feeds.ts"

if [[ ! -f "$FEEDS_FILE" ]]; then
  echo "Error: feeds.ts not found"
  exit 1
fi

# Extract project names from GitHub URLs
PROJECT_NAMES=$(grep -oP "https://github\.com/[^/]+/\K[^/]+" "$FEEDS_FILE" | sed 's|/releases\.atom||g')

echo "Found $(echo "$PROJECT_NAMES" | wc -l) projects to process"
echo ""

# Process each project
while IFS= read -r project; do
  if [[ -n "$project" ]]; then
    download_logo "$project"
  fi
done <<< "$PROJECT_NAMES"

echo ""
echo "================================"
echo "✓ Downloaded: $DOWNLOADED"
echo "⊘ Skipped (exists): $SKIPPED"
echo "✗ Failed (not found): $FAILED"
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo "Note: Failed logos are expected for:"
  echo "  - Sandbox projects without official artwork"
  echo "  - Projects with non-standard naming in cncf/artwork"
  echo "  - New projects not yet added to cncf/artwork"
  echo ""
  echo "These projects will display without logos (graceful degradation)."
fi

echo "✓ Logo update complete!"
