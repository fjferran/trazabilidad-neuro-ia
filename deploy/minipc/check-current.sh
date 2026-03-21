#!/usr/bin/env bash

set -euo pipefail

SSH_IDENTITY="${SSH_IDENTITY:-$HOME/.ssh/trazabilidad_minipc_ed25519}"
TARGET_HOST="${TARGET_HOST:-192.168.0.100}"
TARGET_USER="${TARGET_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
SERVICE_NAME="${SERVICE_NAME:-trazabilidad.service}"
APP_URL="${APP_URL:-http://192.168.0.100:3001}"

SSH_CMD=(ssh -p "$SSH_PORT" -i "$SSH_IDENTITY" "$TARGET_USER@$TARGET_HOST")

printf "\n==> systemd status\n"
"${SSH_CMD[@]}" "systemctl status --no-pager '$SERVICE_NAME' | sed -n '1,18p'"

printf "\n==> últimos logs\n"
"${SSH_CMD[@]}" "journalctl -u '$SERVICE_NAME' -n 40 --no-pager"

printf "\n==> health\n"
curl -s --max-time 10 "$APP_URL/api/health" | python3 -m json.tool

printf "\n==> iot health\n"
curl -s --max-time 10 "$APP_URL/api/iot/health" | python3 -m json.tool
