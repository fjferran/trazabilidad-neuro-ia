#!/usr/bin/env bash

set -euo pipefail

TARGET_HOST=192.168.0.100 \
TARGET_USER=root \
TARGET_PATH=/opt/trazabilidad \
SSH_IDENTITY="$HOME/.ssh/trazabilidad_minipc_ed25519" \
RUN_INSTALL=1 \
RUN_BUILD=1 \
RESTART_SERVICE=1 \
SERVICE_NAME=trazabilidad.service \
bash "$(dirname "$0")/deploy-via-ssh.sh"
