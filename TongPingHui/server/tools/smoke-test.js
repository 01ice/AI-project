'use strict';

/**
 * 后端冒烟测试：不依赖任何测试框架，直接 node tools/smoke-test.js
 * 用法：先 npm start，再另开一个终端跑这个脚本。
 *   node tools/smoke-test.js
 *   BASE=http://192.168.1.10:8080 node tools/smoke-test.js   # 换地址
 */

const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const ACCOUNT = process.env.ACCOUNT || 'admin';
const PASSWORD = process.env.PASSWORD || 'admin123';

let passed = 0;
let failed = 0;

async function call(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}  →  ${JSON.stringify(detail)}`);
  }
}

(async () => {
  console.log(`冒烟测试目标：${BASE}\n`);

  const health = await call('GET', '/health');
  check('GET /health', health.status === 200 && health.body.code === 0, health.body);
  if (health.status !== 200) {
    console.log('\n服务没起来，先执行 `npm start` 再来跑本脚本。');
    process.exit(1);
  }

  const cfg = await call('GET', '/api/v1/trtc/config');
  check('GET /api/v1/trtc/config', cfg.status === 200, cfg.body);
  console.log(
    `     TRTC SDKAppID=${cfg.body?.data?.sdkAppId}  SDKSecretKey已配置=${cfg.body?.data?.secretKeyConfigured}`
  );

  const badLogin = await call('POST', '/api/v1/auth/login', {
    account: ACCOUNT,
    password: 'wrong-password'
  });
  check('错误密码应被拒绝', badLogin.status === 401, badLogin.body);

  const login = await call('POST', '/api/v1/auth/login', {
    account: ACCOUNT,
    password: PASSWORD
  });
  check('POST /api/v1/auth/login', login.status === 200 && !!login.body.data?.token, login.body);

  const token = login.body?.data?.token;
  if (!token) {
    console.log('\n登录失败，后面的用例跳过。');
    process.exit(1);
  }

  const me = await call('GET', '/api/v1/users/me', null, token);
  check('GET /api/v1/users/me', me.status === 200 && me.body.data?.account === ACCOUNT, me.body);

  const updated = await call(
    'PUT',
    '/api/v1/users/me',
    { nickname: '管理员', avatarUrl: '', department: 'IT 部' },
    token
  );
  check('PUT /api/v1/users/me', updated.status === 200, updated.body);

  // 头像上传：构造一张 1x1 的 PNG
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const form = new FormData();
  form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'avatar.png');
  const uploadRes = await fetch(`${BASE}/api/v1/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const upload = { status: uploadRes.status, body: await uploadRes.json() };
  const avatarUrl = upload.body?.data?.avatarUrl || '';
  check(
    'POST /api/v1/users/me/avatar',
    upload.status === 200 && avatarUrl.includes('/uploads/'),
    upload.body
  );
  if (avatarUrl) {
    const img = await fetch(avatarUrl);
    check(
      '头像可通过 URL 访问',
      img.status === 200 && (img.headers.get('content-type') || '').startsWith('image/'),
      { status: img.status, type: img.headers.get('content-type') }
    );
  }

  const created = await call('POST', '/api/v1/meetings', { title: '冒烟测试会议' }, token);
  check(
    'POST /api/v1/meetings',
    created.status === 200 && /^\d{9}$/.test(created.body.data?.roomId || ''),
    created.body
  );

  const list = await call('GET', '/api/v1/meetings', null, token);
  check(
    'GET /api/v1/meetings',
    list.status === 200 && Array.isArray(list.body.data) && list.body.data.length >= 1,
    list.body
  );

  const meetingId = created.body?.data?.id;
  const detail = await call('GET', `/api/v1/meetings/${meetingId}`, null, token);
  check('GET /api/v1/meetings/{id}', detail.status === 200, detail.body);

  const noAuth = await call('GET', '/api/v1/users/me');
  check('未带 token 应返回 401', noAuth.status === 401, noAuth.body);

  // UserSig：密钥没配时允许失败，但要能明确区分原因
  const sig = await call('GET', `/api/v1/trtc/usersig?userId=u_${ACCOUNT}`, null, token);
  const secretReady = cfg.body?.data?.secretKeyConfigured;
  if (secretReady) {
    check('GET /api/v1/trtc/usersig', sig.status === 200 && !!sig.body.data?.userSig, sig.body);
    // 只检查「有没有」抓不出格式错误（例如少了 zlib 压缩，腾讯云会报 70003），
    // 所以这里把票据解回来，确认它真的是一份合法的 TLS-SHA256 票据。
    try {
      const { decodeUserSig } = require('../src/utils/userSig');
      const decoded = decodeUserSig(sig.body.data.userSig);
      const identifierOk = decoded.json['TLS.identifier'] === `u_${ACCOUNT}`;
      const appIdOk = Number(decoded.json['TLS.sdkappid']) === Number(cfg.body.data.sdkAppId);
      const hasSig = typeof decoded.json['TLS.sig'] === 'string' && decoded.json['TLS.sig'].length > 0;
      check(
        'UserSig 可解码（zlib+base64）且 identifier/sdkappid/TLS.sig 正确',
        identifierOk && appIdOk && hasSig,
        identifierOk && appIdOk && hasSig ? undefined : decoded.json
      );
    } catch (e) {
      check('UserSig 可解码（zlib+base64）', false, `解码失败：${e.message}（是不是漏了 zlib deflate？）`);
    }
  } else {
    console.log('  ! TRTC SDKSecretKey 未配置，UserSig 用例跳过（填入 server/.env 后再跑）');
  }

  const removed = await call('DELETE', `/api/v1/meetings/${meetingId}`, null, token);
  check('DELETE /api/v1/meetings/{id}', removed.status === 200, removed.body);

  console.log(`\n结果：通过 ${passed} 项，失败 ${failed} 项`);
  process.exit(failed === 0 ? 0 : 2);
})().catch((e) => {
  console.error('冒烟测试异常：', e);
  process.exit(1);
});
