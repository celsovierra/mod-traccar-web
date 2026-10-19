#!/bin/bash
BACKUP_DIR="/tmp/backup_extras"
rm -rf $BACKUP_DIR && mkdir -p $BACKUP_DIR
cp -r /etc/systemd/system/*.service $BACKUP_DIR/ 2>/dev/null
cp -r /etc/letsencrypt/live $BACKUP_DIR/ 2>/dev/null
cp -r /etc/letsencrypt/renewal $BACKUP_DIR/ 2>/dev/null
cp /etc/fail2ban/jail.local $BACKUP_DIR/ 2>/dev/null
cp /var/spool/cron/crontabs/root $BACKUP_DIR/ 2>/dev/null
cp /opt/telegram-bot/.env $BACKUP_DIR/ 2>/dev/null
tar -czf /tmp/backup_extras.tar.gz -C /tmp backup_extras 2>/dev/null || true