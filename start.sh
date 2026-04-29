#!/bin/bash
node ./scripts/prepare_booking_info.js

RESTART_DELAY=5
while true; do
  echo "[$(date)] Starting socket_listen.js..."
  node ./scripts/socket_listen.js
  EXIT_CODE=$?
  echo "[$(date)] socket_listen.js exited with code $EXIT_CODE. Restarting in ${RESTART_DELAY}s..."
  sleep $RESTART_DELAY
done
