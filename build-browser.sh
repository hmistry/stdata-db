#!/bin/bash

# Build script for browser application
# Compiles TypeScript and bundles into a single ES module

set -e

echo "🔨 Building browser application..."

# Create dist directory
mkdir -p dist

# Compile TypeScript to JavaScript
echo "📦 Compiling TypeScript..."
npx tsc --project browser/tsconfig.json

# Bundle with esbuild
echo "📚 Bundling with esbuild..."
npx esbuild browser/assets/js/main.ts \
  --bundle \
  --platform=browser \
  --format=esm \
  --outfile=browser/dist/bundle.js \
  --external:dexie \
  --external:drizzle-orm \
  --minify=false \
  --sourcemap

# Generate minified version
echo "📉 Creating minified version..."
npx esbuild browser/assets/js/main.ts \
  --bundle \
  --platform=browser \
  --format=esm \
  --outfile=browser/dist/bundle.min.js \
  --external:dexie \
  --external:drizzle-orm \
  --minify=true

echo "✅ Build complete!"
echo ""
echo "📁 Output files:"
echo "  - browser/dist/bundle.js (development)"
echo "  - browser/dist/bundle.min.js (production)"
echo ""
echo "💡 To use, add to HTML:"
echo "  <script type='importmap'>"
echo "    {"
echo "      \"imports\": {"
echo "        \"dexie\": \"https://cdn.jsdelivr.net/npm/dexie@4.4.2/+esm\","
echo "        \"drizzle-orm\": \"https://cdn.jsdelivr.net/npm/drizzle-orm@1.0.0/+esm\""
echo "      }"
echo "    }"
echo "  </script>"
echo "  <script type='module' src='dist/bundle.js'></script>"
