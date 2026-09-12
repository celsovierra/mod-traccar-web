#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p /opt/traccar/scripts
mkdir -p /etc/systemd/system

cp "$SCRIPT_DIR/track_logins.sh" /opt/traccar/scripts/track_logins.sh
chmod +x /opt/traccar/scripts/track_logins.sh

cp "$SCRIPT_DIR/traccar-login-tracker.service" /etc/systemd/system/traccar-login-tracker.service

systemctl daemon-reload
systemctl enable traccar-login-tracker
systemctl restart traccar-login-tracker
systemctl status traccar-login-tracker --no-pager
