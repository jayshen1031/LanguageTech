// ASR服务密钥配置模板
// 请复制此文件为 config.js 并填写你的腾讯云密钥

module.exports = {
  // 腾讯云密钥
  TENCENT_SECRET_ID: 'YOUR_SECRET_ID_HERE',
  TENCENT_SECRET_KEY: 'YOUR_SECRET_KEY_HERE'
}

// 获取密钥的步骤：
// 1. 登录腾讯云控制台：https://console.cloud.tencent.com/
// 2. 访问API密钥管理：https://console.cloud.tencent.com/cam/capi
// 3. 创建密钥或使用已有密钥
// 4. 复制SecretId和SecretKey填写到上面

// 注意事项：
// - config.js 文件已添加到 .gitignore，不会被提交到代码仓库
// - 生产环境建议使用云函数环境变量配置密钥
// - 不要将密钥硬编码在代码中或提交到版本控制系统