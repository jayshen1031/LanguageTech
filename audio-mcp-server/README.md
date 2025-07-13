# 语伴君音频MCP服务

## 概述
这是为语伴君小程序提供TTS（文字转语音）功能的本地MCP服务。

## 功能特点
- 支持日语和英语的文字转语音
- 自动缓存生成的音频文件
- 提供RESTful API接口
- 支持macOS系统原生TTS

## 安装和启动

### 方法1：使用启动脚本
```bash
cd /Users/jay/Documents/baidu/projects/LanguageTech
./start-audio-mcp.sh
```

### 方法2：手动启动
```bash
cd audio-mcp-server
npm install
npm start
```

## API接口

### 1. 生成音频
```
POST http://localhost:3456/tts
Content-Type: application/json

{
  "text": "こんにちは",
  "lang": "ja"
}
```

响应：
```json
{
  "audioUrl": "http://localhost:3456/audio/xxx.mp3",
  "cached": false
}
```

### 2. 获取支持的声音
```
GET http://localhost:3456/voices
```

### 3. 健康检查
```
GET http://localhost:3456/health
```

## 小程序配置

1. 在微信开发者工具中，打开项目设置
2. 勾选"不校验合法域名"（仅限开发环境）
3. 确保音频MCP服务正在运行

## 注意事项

1. **开发环境**：需要关闭域名校验
2. **生产环境**：需要部署到HTTPS服务器并配置合法域名
3. **macOS限制**：目前仅支持macOS的系统TTS
4. **缓存管理**：音频文件会自动缓存在`audio-cache`目录

## 扩展支持

如需支持更多平台，可以：
1. 集成edge-tts（跨平台）
2. 使用Google TTS API
3. 接入阿里云或腾讯云TTS服务

## 故障排除

### 服务无法启动
- 检查3456端口是否被占用
- 确保Node.js版本 >= 14

### 音频无法生成
- 检查系统是否为macOS
- 验证日语语音包是否已安装
- 查看服务日志获取详细错误信息

### 小程序无法播放
- 确保已关闭域名校验
- 检查网络连接
- 查看控制台错误信息