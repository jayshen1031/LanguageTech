# 腾讯云服务配置指南

## 已知信息
- AppId: 1257812720
- SecretId: （请从腾讯云控制台获取）
- SecretKey: （请从腾讯云控制台获取）

## 配置步骤

### 1. 获取 SecretKey
1. 登录[腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入"访问管理" → "访问密钥" → "API密钥管理"
3. 找到对应的 SecretId，查看或重置 SecretKey

### 2. 配置云函数

#### OCR服务配置
编辑 `cloudfunctions/ocr-service/config.js`:
```javascript
module.exports = {
  TENCENT_SECRET_ID: '你的SecretId',
  TENCENT_SECRET_KEY: '你的SecretKey'
}
```

#### AI服务配置
编辑 `cloudfunctions/hunyuan-ai/config.js`:
```javascript
module.exports = {
  TENCENT_SECRET_ID: '你的SecretId',
  TENCENT_SECRET_KEY: '你的SecretKey'
}
```

#### TTS服务配置
编辑 `cloudfunctions/tts-service/config.js`:
```javascript
module.exports = {
  TENCENT_SECRET_ID: '你的SecretId',
  TENCENT_SECRET_KEY: '你的SecretKey'
}
```

#### ASR服务配置
编辑 `cloudfunctions/asr-service/config.js`:
```javascript
module.exports = {
  TENCENT_SECRET_ID: '你的SecretId',
  TENCENT_SECRET_KEY: '你的SecretKey'
}
```

### 3. 部署云函数
在微信开发者工具中：
1. 右键点击各个云函数文件夹
2. 选择"上传并部署：云端安装依赖"

### 4. 测试功能
- OCR：在日语解析页面测试图片识别
- AI：在语音对话页面测试对话功能
- TTS：测试语音合成
- ASR：测试语音识别

## 安全注意事项
- 不要将 SecretKey 提交到 Git
- config.js 文件已添加到 .gitignore
- 生产环境建议使用云函数环境变量配置

## 故障排查
如果遇到"请配置腾讯云密钥"错误：
1. 检查 config.js 文件是否正确配置
2. 确认云函数已重新部署
3. 查看云函数日志排查具体错误