'use strict';

const path = require('path');

// ⚠️ 按「server 目录」定位 .env 与数据文件，而不是 process.cwd()：
// 否则在别的目录下执行 `node server/src/index.js` 会读不到 .env（密钥变空、
// UserSig 签发失败），还会把 db.json 建到当前目录去。
const SERVER_ROOT = path.resolve(__dirname, '..');

require('dotenv').config({ path: path.join(SERVER_ROOT, '.env') });

module.exports = {
  serverRoot: SERVER_ROOT,
  port: parseInt(process.env.PORT || '8080', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  trtc: {
    sdkAppId: parseInt(process.env.TRTC_SDK_APP_ID || '1600162594', 10),
    // ⚠️ 只能在服务端出现，绝不能下发到客户端
    secretKey: process.env.TRTC_SDK_SECRET_KEY || '',
    userSigExpire: parseInt(process.env.TRTC_USER_SIG_EXPIRE || '604800', 10)
  },

  dataFile: path.resolve(
    SERVER_ROOT,
    process.env.DATA_FILE || './data/db.json'
  )
};
