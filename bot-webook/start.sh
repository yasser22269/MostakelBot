#!/bin/bash
node ./scripts/prepare_booking_info.js
exec node ./scripts/socket_listen.js
