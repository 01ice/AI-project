---
title: 把两千个 Star 变成知识库：我怎么把成本压到每月 260 元
slug: star-map-cost
summary: 星图上线的第一版每月要花 800 多元，问题出在「每次都重新摘要」。这篇文章讲清楚我做了哪三件事，把成本砍到 260 元。
author: chenmo
date: 2026-08-18
tags:
  - 成本控制
  - RAG
  - 知识管理
projects:
  - star-map
---

## 先说我踩的坑

星图的第一版很朴素：每次打开首页，就把 Star 列表里的仓库挨个丢给模型生成摘要。
两千个仓库跑一遍，账单出来是 **800 多元**，而且这个钱每天都要再花一次。

问题的根子不是模型太贵，是**我把「不变的东西」当成「每次都变的东西」在算**。

## 三个改动

### 一、摘要只在 README 变化时重算

每个仓库记一个 `readmeSha`，和上次摘要时的值比对，一样就直接用缓存。

```ts
const cached = await cache.get(repo.fullName)
if (cached?.readmeSha === repo.readmeSha) return cached

const summary = await llm.chat({ model: 'deepseek-chat', prompt: buildPrompt(repo) })
await cache.set(repo.fullName, { readmeSha: repo.readmeSha, summary })
```

这一条把「每天的固定支出」变成了「只在新 Star 一个仓库时支出」。

### 二、摘要和向量用不同的模型

摘要要读懂 README，用贵的模型值；向量只是把摘要变成可检索的坐标，用小模型足够。

| 用途 | 模型 | 单价 |
| --- | --- | --- |
| 生成摘要 | deepseek-chat | 约 0.5 元 / 千次 |
| 生成向量 | bge-m3 本地部署 | 0（只花电费） |

把向量模型换成本地跑之后，成本直接降了一个数量级。

### 三、向量库从托管换成 pgvector

一开始我用的是独立的向量数据库，每月固定 150 元。后来发现我的数据量只有几万条，
PostgreSQL 的 pgvector 扩展完全够用，而这台数据库本来就在跑。

## 现在的账

| 项目 | 每月 |
| --- | --- |
| 服务器（应用 + 数据库） | 150 元 |
| 模型调用 | 约 110 元 |
| 对象存储与域名 | 少量 |
| **合计** | **约 260 元** |

## 一点感想

做 AI 产品最容易被忽略的是「重复计算」。如果每次请求都重新跑一遍模型，
成本是随着使用量线性上涨的；但只要把结果缓存住，它就变成了一次性投入。

> 星图目前完全免费，也不打算收费。这些数字贴出来，是希望别人少走一点弯路。
