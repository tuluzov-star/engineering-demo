#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  printf '%s\n' 'Created .env from .env.example. Change demo credentials before exposing the stack publicly.'
fi

docker compose up -d --build db wordpress frontend
docker compose run --rm wp-cli /scripts/bootstrap-wp.sh

docker compose ps
