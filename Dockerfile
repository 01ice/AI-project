# ===== 构建阶段 =====
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Nitro 的构建产物是自包含的（依赖会被打包进 .output）
COPY --from=build /app/.output ./.output

# 运行时还需要读取：数据库迁移 SQL 与 Markdown 文章目录
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/content ./content

# 本地图片上传目录（部署后挂数据卷；正式上线建议改用 COS）
RUN mkdir -p /app/public/uploads

# 用非 root 用户运行
RUN addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
