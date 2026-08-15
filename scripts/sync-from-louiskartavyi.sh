#!/usr/bin/env bash
# Re-copy static pipeline from LouisKartavyi monorepo into this standalone repo.
# Usage: ./scripts/sync-from-louiskartavyi.sh [/path/to/LouisKartavyi]
set -euo pipefail

LOUIS="${1:-$(cd "$(dirname "$0")/../.." && pwd)/LouisKartavyi}"
SRC="$LOUIS/DeepGlitchFiles"
DEST="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$SRC/pipeline/templates/episode" ]]; then
  echo "Missing $SRC — pass LouisKartavyi path as arg"
  exit 1
fi

echo "Syncing from $SRC → $DEST"

cp "$SRC/pipeline/src/lib/fal.ts" "$SRC/pipeline/src/lib/kie.ts" "$SRC/pipeline/src/lib/episode-gates.ts" "$DEST/src/lib/"
cp "$SRC/pipeline/templates/episode/"*.ts "$DEST/templates/episode/"
cp "$SRC/canon/VISUAL_CANON.md" "$SRC/canon/EPISODE_STRUCTURE.md" "$DEST/canon/"
cp "$SRC/canon/wrap-with-bumpers.ts" "$SRC/canon/upload-youtube.ts" "$DEST/canon/"
cp "$SRC/canon/gen-cast.ts" "$SRC/canon/gen-bumpers.ts" "$DEST/canon/"
cp "$SRC/pipeline/STATIC_PIPELINE_REFERENCE.md" "$DEST/reference/"
cp "$SRC/.cursor/rules/static-mode.mdc" "$DEST/reference/rules/"

# Path patches (monorepo → standalone)
for f in "$DEST/templates/episode"/*.ts; do
  sed -i '' \
    -e 's|resolve(HERE, '\''../../../../.env'\'')|resolve(HERE, '\''../../.env'\'')|g' \
    -e 's|resolve(HERE, '\''../../../music|resolve(HERE, '\''../../music|g' \
    -e 's|resolve(HERE, '\''../../../canon|resolve(HERE, '\''../../canon|g' \
    -e 's|npx tsx ../../../canon/|npx tsx ../../canon/|g' \
    "$f"
done
for f in "$DEST/src/lib/fal.ts" "$DEST/src/lib/kie.ts"; do
  sed -i '' "s|'../../../../.env'|'../../.env'|g" "$f"
done
sed -i '' \
  -e "s|resolve(HERE, '../..')|resolve(HERE, '..')|g" \
  -e "s|secrets/youtube|\.secrets/youtube|g" \
  "$DEST/canon/upload-youtube.ts"
sed -i '' "s|'../pipeline/src/lib/episode-gates.js'|'../src/lib/episode-gates.js'|g" "$DEST/canon/wrap-with-bumpers.ts"

echo "✅ Sync done. Review README + git diff before commit."
