# 音频MCP设计方案

## 概述
为微信小程序设计一个音频MCP服务，提供TTS（文字转语音）和音频管理功能。

## 架构设计

### 1. MCP服务端（本地运行）
```
audio-mcp-server/
├── server.js          # MCP服务主程序
├── tts/              # TTS引擎
│   ├── japanese.js   # 日语TTS
│   └── english.js    # 英语TTS
├── audio-cache/      # 音频缓存目录
└── config.json       # 配置文件
```

### 2. 小程序端集成
```javascript
// utils/audioMCP.js
class AudioMCP {
  constructor() {
    this.baseUrl = 'http://localhost:3456' // MCP服务地址
  }
  
  async generateAudio(text, lang = 'ja') {
    // 调用MCP生成音频
    const res = await wx.request({
      url: `${this.baseUrl}/tts`,
      method: 'POST',
      data: { text, lang }
    })
    return res.data.audioUrl
  }
}
```

## 实现方案

### 方案1：使用edge-tts（推荐）
```bash
npm install edge-tts
```

优点：
- 免费使用微软Azure的TTS服务
- 支持多种语言和声音
- 音质优秀

### 方案2：使用Google TTS
```javascript
const googleTTS = require('google-tts-api');
```

### 方案3：使用本地TTS引擎
- Mac: 使用系统的`say`命令
- Windows: 使用SAPI
- Linux: 使用espeak

## MCP服务实现示例

```javascript
// server.js
const express = require('express');
const { EdgeTTS } = require('edge-tts');
const app = express();

app.post('/tts', async (req, res) => {
  const { text, lang } = req.body;
  
  // 使用edge-tts生成音频
  const tts = new EdgeTTS();
  await tts.synthesize(text, 'audio.mp3', {
    voice: lang === 'ja' ? 'ja-JP-NanamiNeural' : 'en-US-AriaNeural'
  });
  
  // 返回音频URL
  res.json({
    audioUrl: `http://localhost:3456/audio/${filename}`,
    cached: false
  });
});

app.listen(3456);
```

## 小程序集成步骤

1. **开发环境配置**
   - 在小程序开发工具中配置本地服务器地址
   - 开发时关闭域名校验

2. **生产环境部署**
   - 将MCP服务部署到云服务器
   - 配置HTTPS和域名
   - 添加到小程序合法域名列表

## 优势

1. **灵活性高**：可以随时切换TTS引擎
2. **成本可控**：可以使用免费或付费服务
3. **性能优化**：本地缓存已生成的音频
4. **离线支持**：缓存常用词汇的音频

## 快速开始

```bash
# 1. 创建MCP服务
mkdir audio-mcp-server
cd audio-mcp-server
npm init -y
npm install express edge-tts cors

# 2. 创建服务文件
touch server.js

# 3. 启动服务
node server.js
```

## 注意事项

1. 开发时需要在小程序项目设置中关闭"不校验合法域名"
2. 生产环境必须使用HTTPS
3. 考虑音频文件的存储和清理策略
4. 注意API调用频率限制