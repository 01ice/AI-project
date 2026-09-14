#!/bin/bash
# 栈桥服务器备份脚本：导出数据库，并打包上传的图片
# 用法：部署后执行 chmod +x deploy/backup.sh，再挂到 crontab
set -euo pipefail

PROJECT_DIR="/opt/zhanqiao"
BACKUP_DIR="$PROJECT_DIR/backups"
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

STAMP=$(date +%F)

# 数据库（用 -T 关闭伪终端，保证可以重定向）
sudo docker compose exec -T db pg_dump -U zhanqiao zhanqiao | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"
echo "[$(date '+%F %T')] 数据库备份完成: db-$STAMP.sql.gz ($(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1))"

# 上传的图片（数据卷）
sudo docker run --rm \
  -v zhanqiao_uploads:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/uploads-$STAMP.tar.gz" -C /data . 2>/dev/null || \
  echo "[$(date '+%F %T')] 图片备份跳过（数据卷可能还不存在）"

# 只保留最近 N 天
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +$KEEP_DAYS -delete

echo "[$(date '+%F %T')] 备份结束，当前备份文件："
ls -lh "$BACKUP_DIR" | tail -n +2
