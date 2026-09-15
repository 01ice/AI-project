#!/usr/bin/env node
'use strict';

/**
 * 创建 / 更新 内部账号（走 HTTP 接口，不动 JSON 文件）。
 *
 * 用法：
 *   node tools/create-user.js <账号> <密码> <昵称> [部门]
 *
 * 行为：
 *   - 账号不存在 → 调 POST /api/v1/auth/register 新建
 *   - 账号已存在 → 用给定密码登录一次以确认密码，然后 PUT /api/v1/users/me
 *                  把昵称/部门刷成给的值（密码不会被改）
 *   - 所以重复执行是安全的（幂等）
 *
 * 可选环境变量：
 *   API_BASE_URL   后端地址，默认 http://127.0.0.1:8080
 *
 * 为什么不用脚本直接写 data/db.json：服务端把库缓存在内存里，
 * 直接改文件会被下一次写入覆盖，所以一律走接口。
 */

const BASE = (process.env.API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');

const [account, password, nickname, department = ''] = process.argv.slice(2);

function usage() {
  console.log('用法：node tools/create-user.js <账号> <密码> <昵称> [部门]');
  console.log('示例：node tools/create-user.js zhaoliu 123456 赵六 市场部');
  process.exit(2);
}

if (!account || !password || !nickname) usage();
if (password.length < 6) {
  console.error('× 密码至少 6 位');
  process.exit(2);
}

async function call(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* 非 JSON 响应 */
  }
  return { status: res.status, json };
}

async function main() {
  // 1) 先试注册
  const reg = await call('POST', '/api/v1/auth/register', {
    account,
    password,
    nickname,
    department
  });

  if (reg.status === 200) {
    console.log(`✓ 已创建账号  ${account}（${nickname}${department ? ' / ' + department : ''}）`);
    console.log(`  腾讯云 userId  ${'u_' + account.replace(/[^0-9A-Za-z]/g, '_')}`);
    return;
  }

  // 2) 已存在 → 登录确认密码，再刷新昵称/部门
  if (reg.status === 409) {
    const login = await call('POST', '/api/v1/auth/login', { account, password });
    if (login.status !== 200) {
      console.error(`× 账号 ${account} 已存在，但用给定密码登录失败（密码不对？）`);
      process.exit(1);
    }

    const token = login.json.data.token;
    const put = await call('PUT', '/api/v1/users/me', { nickname, department }, token);
    if (put.status !== 200) {
      console.error(`× 更新资料失败：${put.json && put.json.message}`);
      process.exit(1);
    }
    console.log(`✓ 账号已存在，已刷新昵称/部门  ${account}（${nickname}${department ? ' / ' + department : ''}）`);
    console.log('  密码未改动');
    return;
  }

  console.error(`× 创建失败：${reg.json && reg.json.message}（HTTP ${reg.status}）`);
  process.exit(1);
}

main().catch((e) => {
  console.error('× 请求后端失败：' + e.message);
  console.error(`  当前后端地址 ${BASE}（用 API_BASE_URL 覆盖）`);
  console.error('  后端没启动？在 server 目录执行：node src/index.js');
  process.exit(1);
});
