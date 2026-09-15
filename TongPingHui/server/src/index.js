'use strict';

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { randomUUID } = require('crypto');

const config = require('./config');
const store = require('./store/jsonStore');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const meetingRoutes = require('./routes/meetings');
const trtcRoutes = require('./routes/trtc');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 简单的请求日志，方便真机联调时确认请求到没到
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (req, res) => res.json({ code: 0, message: 'ok', data: 'alive' }));

// 头像等上传文件的静态访问（用户信息里返回的是 http://ip:port/uploads/xxx.jpg）
app.use('/uploads', express.static(path.resolve(process.cwd(), 'data/uploads'), { maxAge: '7d' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/trtc', trtcRoutes);

// 404
app.use((req, res) => res.status(404).json({ code: 404, message: '接口不存在', data: null }));

// 兜底异常
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ code: 500, message: err.message || '服务器内部错误', data: null });
});

/** 首次启动时建一个管理员账号，方便立刻联调 */
function bootstrapAdmin() {
  const account = 'admin';
  if (store.findUserByAccount(account)) return;

  const now = Date.now();
  store.insertUser({
    id: randomUUID(),
    account,
    passwordHash: bcrypt.hashSync('admin123', 10),
    nickname: '管理员',
    avatarUrl: '',
    department: 'IT',
    createdAt: now,
    updatedAt: now
  });
  console.log('[bootstrap] 已创建默认账号 admin / admin123（请尽快改密码）');
}

bootstrapAdmin();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`同屏会后端已启动： http://0.0.0.0:${config.port}`);
  console.log(`TRTC SDKAppID = ${config.trtc.sdkAppId}`);
  console.log(
    config.trtc.secretKey
      ? 'TRTC SDKSecretKey 已配置 ✓'
      : '⚠️  TRTC SDKSecretKey 未配置：/api/v1/trtc/usersig 会返回 500'
  );
});
