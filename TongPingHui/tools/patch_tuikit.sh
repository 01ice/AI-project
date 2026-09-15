#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 修补腾讯 TUIRoomKit 源码里与 atomicx-core 4.3.x 不一致的 8 处类型问题。
#
# 背景：
#   tuiroomkit 源码（main 分支）是按旧版 atomicx-core 写的，把「预约会议」的
#   scheduledStartTime / scheduledEndTime 当作 Int 用；而 4.3.0.25 起这两个字段
#   是 Long。类型不一致会导致编译失败：
#       e: RoomHomeActivity.kt:33:34 Argument type mismatch: actual type is 'Int',
#          but 'Long' was expected.
#       e: RoomScheduleView.kt:389:33 Assignment type mismatch: actual type is 'Int',
#          but 'Long' was expected.
#   （官方 demo 用 latest.release 自动跟最新引擎，所以这个窗口期在官方仓库里
#     也可能是坏的；我们固定用 4.3.0.25，就把源码对齐到 Long。）
#
# 顺带修掉一个真 bug：RoomScheduleView 用 putExtra(..., Long) 写入，
# RoomHomeActivity 却用 getIntExtra 读取，改成 getLongExtra 才是配对的。
#
# 幂等：已修补过的文件再跑一次不会有任何变化。
# 用法（Git Bash，项目根目录）：bash tools/patch_tuikit.sh
# fetch_tuikit.sh 会在拉取完成后自动调用本脚本。
# ---------------------------------------------------------------------------
set -euo pipefail

HERE="${BASH_SOURCE[0]%/*}"
ROOT="$(cd "$HERE/.." && pwd)"

HOME_ACT="$ROOT/room/tuiroomkit/src/main/java/com/trtc/uikit/roomkit/RoomHomeActivity.kt"
SCHEDULE_VIEW="$ROOT/room/tuiroomkit/src/main/java/com/trtc/uikit/roomkit/view/schedule/RoomScheduleView.kt"

for f in "$HOME_ACT" "$SCHEDULE_VIEW"; do
    if [ ! -f "$f" ]; then
        echo ">>> 找不到 $f"
        echo ">>> 请先执行 bash tools/fetch_tuikit.sh 拉取组件源码"
        exit 1
    fi
done

# 1) Bundle 读取：Int -> Long（与 putExtra(..., Long) 配对）
sed -i \
    -e 's|getIntExtra(RoomScheduleView\.EXTRA_SCHEDULED_START_TIME, 0)|getLongExtra(RoomScheduleView.EXTRA_SCHEDULED_START_TIME, 0L)|' \
    -e 's|getIntExtra(RoomScheduleView\.EXTRA_SCHEDULED_END_TIME, 0)|getLongExtra(RoomScheduleView.EXTRA_SCHEDULED_END_TIME, 0L)|' \
    "$HOME_ACT"

# 2) 时间字段：toInt() -> toLong()；函数签名 Int -> Long
sed -i \
    -e 's|scheduleStartTime = (calendar.timeInMillis / 1000).toInt()|scheduleStartTime = (calendar.timeInMillis / 1000).toLong()|' \
    -e 's|scheduleEndTime = ((calendar.timeInMillis + selectedDuration \* MILLIS_PER_MINUTE) / 1000).toInt()|scheduleEndTime = ((calendar.timeInMillis + selectedDuration * MILLIS_PER_MINUTE) / 1000).toLong()|' \
    -e 's|val newStart = (calendar.timeInMillis / 1000).toInt()|val newStart = (calendar.timeInMillis / 1000).toLong()|' \
    -e 's|val newEnd = ((calendar.timeInMillis + selectedDuration \* MILLIS_PER_MINUTE) / 1000).toInt()|val newEnd = ((calendar.timeInMillis + selectedDuration * MILLIS_PER_MINUTE) / 1000).toLong()|' \
    -e 's|^        newStart: Int,$|        newStart: Long,|' \
    -e 's|^        newEnd: Int,$|        newEnd: Long,|' \
    "$SCHEDULE_VIEW"

echo ">>> 已应用 TUIRoomKit 源码补丁（atomicx-core 4.3.x 的 Long 时间字段）"

# 校验：修补后不应再出现 Int 版本
if grep -n "getIntExtra(RoomScheduleView.EXTRA_SCHEDULED" "$HOME_ACT" >/dev/null 2>&1; then
    echo ">>> [警告] RoomHomeActivity.kt 仍有 getIntExtra，请人工检查"
    exit 1
fi
if grep -n "scheduleStartTime = .*\.toInt()\|scheduleEndTime = .*\.toInt()\|newStart: Int\|newEnd: Int" "$SCHEDULE_VIEW" >/dev/null 2>&1; then
    echo ">>> [警告] RoomScheduleView.kt 仍有 Int 版本代码，请人工检查"
    exit 1
fi
echo ">>> 校验通过：8 处类型已全部对齐 Long"
