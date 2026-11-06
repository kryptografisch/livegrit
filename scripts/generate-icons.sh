#!/usr/bin/env bash
# Renders the PWA PNG icons from the hand-written SVGs in public/ (ImageMagick 7 with
# librsvg). Run after changing public/icon.svg or public/icon-maskable.svg; the PNGs are
# committed.
set -euo pipefail
cd "$(dirname "$0")/../public"

render() { # <svg> <size> <out.png>
  magick -background none -density 384 "$1" -resize "$2x$2" -strip "PNG32:$3"
}

render icon.svg 192 pwa-192x192.png
render icon.svg 512 pwa-512x512.png
render icon-maskable.svg 512 maskable-512x512.png
# iOS rounds the corners itself and wants an opaque icon: use the full-bleed variant.
render icon-maskable.svg 180 apple-touch-icon-180x180.png
