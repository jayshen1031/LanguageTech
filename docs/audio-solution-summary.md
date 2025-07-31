# 语伴君音频功能解决方案总结

## 🚫 微信小程序的限制

1. **域名白名单限制**
   - 只能访问在小程序后台配置的合法域名
   - 开发时可以关闭域名校验，但生产环境必须配置

2. **音频资源限制**
   - 不能直接播放未配置域名的外部音频
   - 需要HTTPS协议
   - 需要在小程序后台配置downloadFile合法域名

3. **本地服务限制**
   - 真机调试时无法访问localhost
   - 需要使用本机IP且在同一网络

## ✅ 可行的解决方案

### 方案1：云函数 + 云存储（推荐）
```javascript
// 1. 上传音频文件到云存储
// 2. 云函数返回云存储的临时URL
// 3. 小程序播放云存储的音频

wx.cloud.callFunction({
  name: 'getAudioUrl',
  data: { word: '食べる' },
  success: (res) => {
    // 播放云存储的音频
    playAudio(res.result.tempFileURL)
  }
})
```

### 方案2：使用小程序插件
- 微信同声传译插件（需要申请权限）
- 讯飞语音插件
- 百度语音插件

### 方案3：自建音频服务
```javascript
// 1. 部署音频服务到云服务器（需要HTTPS）
// 2. 在小程序后台配置域名白名单
// 3. 小程序访问自己的音频服务

const audioUrl = 'https://yourdomain.com/api/audio/taberu.mp3'
```

### 方案4：本地音频文件
```javascript
// 将常用音频文件放在小程序包内
const localAudio = '/audio/taberu.mp3'

// 注意：会增加小程序包大小
```

## 🎯 当前实现（最简单）

```javascript
// 显示读音信息弹窗
wx.showModal({
  title: word.word,
  content: `读音：${word.kana}\n罗马音：${word.romaji}`,
  confirmText: '知道了'
})
```

## 📋 实施步骤

### 开发阶段
1. ✅ 使用读音弹窗（已实现）
2. ⏳ 本地MCP服务（可选，调试用）

### 生产阶段
1. 申请云开发环境 ✅
2. 部署云函数
3. 上传音频到云存储
4. 配置小程序域名

## 🔧 云函数示例

```javascript
// cloudfunctions/audio-service/index.js
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { word } = event
  
  // 方案A：返回云存储中的音频
  const audioMap = {
    '食べる': 'cloud://env-id/audio/taberu.mp3'
  }
  
  if (audioMap[word]) {
    // 获取临时链接
    const res = await cloud.getTempFileURL({
      fileList: [audioMap[word]]
    })
    return {
      success: true,
      audioUrl: res.fileList[0].tempFileURL
    }
  }
  
  // 方案B：使用腾讯云TTS生成
  // ... TTS生成逻辑
  
  return {
    success: false,
    message: '暂无音频'
  }
}
```

## 📱 小程序端调用

```javascript
// 使用云函数获取音频
async getCloudAudio(word) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'audio-service',
      data: { word }
    })
    
    if (res.result.success) {
      // 播放音频
      this.playAudioFile(res.result.audioUrl)
    } else {
      // 显示读音
      this.showReadingInfo()
    }
  } catch (err) {
    console.error('获取音频失败:', err)
    this.showReadingInfo()
  }
}
```

## 🚀 推荐的技术栈

1. **音频存储**：腾讯云COS / 微信云存储
2. **TTS服务**：腾讯云语音合成 / 讯飞TTS
3. **CDN加速**：腾讯云CDN
4. **音频格式**：MP3（兼容性好，文件小）

## 💡 最佳实践

1. **缓存策略**
   - 本地缓存已播放的音频URL
   - 使用storage存储常用词汇

2. **性能优化**
   - 预加载下一个单词的音频
   - 批量获取音频URL

3. **用户体验**
   - 加载时显示loading
   - 失败时优雅降级到读音显示
   - 提供重试机制

## 📊 成本估算

- **云存储**：约0.1元/GB/月
- **CDN流量**：约0.2元/GB
- **TTS调用**：约10元/百万字符
- **云函数**：前100万次免费

## 🎉 总结

虽然微信小程序有诸多限制，但通过合理的架构设计，仍然可以实现良好的音频学习体验。建议先用最简单的方案（读音弹窗）上线，后续逐步优化音频功能。