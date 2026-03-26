#!/bin/bash
set -euo pipefail

echo "=== Type Check ==="
bunx tsc --noEmit

echo "=== Unit + Integration Tests ==="
bun run test

echo "=== Build ==="
bun run build

echo "=== All checks passed ==="
