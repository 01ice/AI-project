#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 拉取腾讯云 TUIRoomKit（含 UI 低代码集成）源码组件到工程根目录。
# 组件不走 Maven，必须作为本地模块参与构建。
#
# 用法（Windows 用 Git Bash，项目根目录下执行）：
#     bash tools/fetch_tuikit.sh
#
# 拉完后在 Android Studio 里重新 Sync，:tuiroomkit / :atomic_x / :chatuikit 会被自动引入。
# ---------------------------------------------------------------------------
set -euo pipefail

HERE="${BASH_SOURCE[0]%/*}"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

REPO="https://github.com/Tencent-RTC/TUIKit_Android.git"
# 国内网络慢可以用 CNB 镜像：
# REPO="https://cnb.cool/tencent/cloud/trtc/TUIKit_Android.git"

echo ">>> 工作目录：$ROOT"
echo ">>> 稀疏克隆 $REPO"

rm -rf .tuikit_tmp
git clone --depth=1 --filter=blob:none --sparse "$REPO" .tuikit_tmp

cd .tuikit_tmp
git sparse-checkout set --no-cone /room/ /atomic_x/ /chat/uikit/
cd "$ROOT"

rm -rf room atomic_x chat
mv .tuikit_tmp/room ./room
mv .tuikit_tmp/atomic_x ./atomic_x
mv .tuikit_tmp/chat ./chat
rm -rf .tuikit_tmp

echo ">>> 应用类型修补（tuiroomkit 源码 vs atomicx-core 4.3.x）"
bash "$HERE/patch_tuikit.sh"

echo ">>> 完成，已就位："
echo "      room/tuiroomkit   →  :tuiroomkit"
echo "      atomic_x          →  :atomic_x"
echo "      chat/uikit        →  :chatuikit"
echo ">>> 现在回到 Android Studio 点 Sync Now。"
