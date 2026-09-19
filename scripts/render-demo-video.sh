#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
FRONTEND_DIR="$ROOT_DIR/frontend"
PORTFOLIO_BASE_URL=${PORTFOLIO_BASE_URL:-http://127.0.0.1:3001}
OUTPUT_DIR="$FRONTEND_DIR/portfolio-video"
WEBM_FILE="$OUTPUT_DIR/engineering-demo.webm"
MP4_FILE="$OUTPUT_DIR/engineering-demo.mp4"

for command_name in ffmpeg npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s\n' "Required command is missing: $command_name" >&2
    exit 1
  fi
done

cd "$FRONTEND_DIR"

printf '%s\n' 'Recording production commerce demo...'
PORTFOLIO_BASE_URL="$PORTFOLIO_BASE_URL" npm run portfolio:video

if [ ! -s "$WEBM_FILE" ]; then
  printf '%s\n' 'Playwright did not create the expected WebM recording.' >&2
  exit 1
fi

printf '%s\n' 'Encoding portfolio MP4...'
ffmpeg -hide_banner -loglevel error -y \
  -i "$WEBM_FILE" \
  -an \
  -c:v libx264 \
  -preset medium \
  -crf 24 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "$MP4_FILE"

if [ ! -s "$MP4_FILE" ]; then
  printf '%s\n' 'FFmpeg did not create the expected MP4.' >&2
  exit 1
fi

printf '%s\n' 'Demo video files:'
ls -lh "$WEBM_FILE" "$MP4_FILE"
