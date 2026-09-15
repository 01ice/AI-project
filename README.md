# AI-project

用 AI 生成的项目集合。每个项目独立放在自己的子文件夹中，互不影响。

## 项目列表

| 项目 | 目录 | 技术栈 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| 特价电影票小程序 | [`MovieTickets/`](./MovieTickets) | 原生微信小程序（WXML/WXSS/JS） | 前端演示版 | 电影购票全流程演示，纯前端 + 本地存储，无后端依赖 |
| 栈桥（项目收录社区） | [`Zhanqiao/`](./Zhanqiao) | Nuxt 4 + Vue 3 + Tailwind CSS 4 + PostgreSQL/Drizzle | 开发中 | 面向中文开发者的项目收录与分享社区：发布项目、评论互动、站主技术博客 |
| 同屏会（内部多人视频会议） | [`TongPingHui/`](./TongPingHui) | Kotlin + Jetpack Compose + 腾讯云 TRTC/TUIRoomKit；Node.js 后端 | 开发中 | 多人视频会议 + 屏幕共享 + 登录/个人信息，内部打包 APK 分发 |

## 添加新项目

1. 在仓库根新建子文件夹，用**纯英文项目名**（如 `MyNewProject`）
2. 把项目的完整源码放进去，包含它自己的 `README.md`
3. 在该项目 `README.md` 中明确区分「已完成」与「未完成」功能
4. 回到本文件，在「项目列表」表格中补一行
5. 提交：`git add MyNewProject && git commit -m "feat: 新增 XXX 项目"`

## 说明

- 仓库根只放索引（本 README）与全局 `.gitignore`，各项目源码一律放在子文件夹中
- 为避免仓库体积膨胀，构建产物、截图、依赖目录、编辑器私有配置等不应提交
