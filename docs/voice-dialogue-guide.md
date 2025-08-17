# 语音对话功能使用指南

## 功能概述

语音对话功能支持用户通过语音或文字与AI进行多语言对话练习，包含以下核心特性：

- 🎤 **语音输入**：录音并自动识别（ASR）
- 🤖 **AI对话**：基于GPT-4o的智能回复
- 🔊 **语音合成**：将AI回复转为语音（TTS）
- 🌍 **多语言支持**：日语、英语、中文
- 🎭 **场景化学习**：日常、购物、餐厅、旅行、工作

## 使用步骤

### 1. 进入语音对话页面

从底部导航栏或主页功能入口进入"语音对话"页面。

### 2. 选择场景和语言

- **场景选择**：点击顶部场景选择器，选择适合的对话场景
- **语言切换**：点击语言按钮（🇯🇵/🇺🇸）切换对话语言

### 3. 开始对话

#### 语音输入模式（默认）
1. 点击麦克风按钮开始录音
2. 对着手机说话（最长30秒）
3. 再次点击停止录音
4. 系统自动识别并显示文字
5. AI生成回复并自动播放语音

#### 文字输入模式
1. 点击"⌨️ 文字"切换到文字输入
2. 在输入框输入内容
3. 点击"发送"或按回车键
4. AI生成回复并自动播放语音

### 4. 重播和管理

- **重播音频**：点击消息旁的"🔊 重播"按钮
- **清空对话**：点击顶部"清空"按钮重新开始

## 技术架构

### 前端组件

1. **页面文件**
   - `pages/voice-dialogue/voice-dialogue.js` - 主逻辑
   - `pages/voice-dialogue/voice-dialogue.wxml` - 界面结构
   - `pages/voice-dialogue/voice-dialogue.wxss` - 样式

2. **录音组件**
   - `components/voice-recorder/` - 自定义录音组件
   - 支持波形显示、暂停/继续、时间显示

3. **服务封装**
   - `utils/voiceService.js` - 语音服务统一封装
   - `utils/ai.js` - AI接口封装
   - `utils/audioMCP.js` - MCP音频客户端

### 云函数服务

1. **ASR服务** (`asr-service`)
   - 腾讯云语音识别
   - 支持日语、英语、中文
   - 自动处理音频格式转换

2. **TTS服务** (`tts-service`)
   - 腾讯云TTS（优先）
   - Google TTS（备选）
   - 批量生成支持

3. **AI服务** (`azure-gpt4o-simple`)
   - Azure OpenAI GPT-4o
   - 场景化提示词
   - 多语言对话支持

### 数据流程

```
用户录音 → 上传云存储 → ASR识别 → 显示文字
    ↓
AI处理 → 生成回复 → TTS合成 → 播放音频
```

## 配置要求

### 云函数配置

1. **ASR服务配置**
   ```javascript
   // cloudfunctions/asr-service/config.js
   module.exports = {
     TENCENT_SECRET_ID: 'your-secret-id',
     TENCENT_SECRET_KEY: 'your-secret-key'
   }
   ```

2. **TTS服务配置**
   ```javascript
   // cloudfunctions/tts-service/config.js
   module.exports = {
     TENCENT_SECRET_ID: 'your-secret-id',
     TENCENT_SECRET_KEY: 'your-secret-key'
   }
   ```

3. **Azure GPT配置**
   ```javascript
   // cloudfunctions/azure-gpt4o-simple/config.js
   module.exports = {
     AZURE_API_KEY: 'your-api-key'
   }
   ```

### 小程序权限

需要在 `app.json` 中声明以下权限：

```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于小程序位置接口的效果展示"
    },
    "scope.record": {
      "desc": "你的录音功能将用于语音对话练习"
    }
  }
}
```

## 测试方法

### 运行测试脚本

在微信开发者工具控制台执行：

```javascript
const test = require('./test-voice-dialogue.js')
test.runAllTests()
```

### 单项测试

```javascript
// 测试TTS服务
test.testTTSService()

// 测试AI服务
test.testAIService()

// 测试完整流程
test.testCompleteFlow()
```

## 常见问题

### 1. 录音权限问题
**问题**：提示"请授权使用麦克风"
**解决**：在微信设置中开启小程序的麦克风权限

### 2. 语音识别失败
**问题**：ASR识别返回空或错误
**解决**：
- 检查云函数是否部署成功
- 确认腾讯云密钥配置正确
- 使用文字输入模式作为备选

### 3. 音频无法播放
**问题**：TTS生成的音频无法播放
**解决**：
- 检查网络连接
- 确认音频URL有效
- 使用重播按钮重试

### 4. AI回复异常
**问题**：AI回复内容不相关或出错
**解决**：
- 检查Azure API密钥
- 确认云函数超时时间足够（建议20秒）
- 查看云函数日志排查错误

## 优化建议

1. **性能优化**
   - 预加载常用语音
   - 缓存AI回复
   - 优化音频文件大小

2. **用户体验**
   - 添加录音倒计时
   - 支持语音中断
   - 优化加载动画

3. **功能扩展**
   - 添加语音评分
   - 支持对话历史保存
   - 增加更多场景模板

## 部署清单

- [ ] 配置云函数密钥
- [ ] 部署所有云函数
- [ ] 设置云函数超时时间（20秒）
- [ ] 测试各项功能
- [ ] 确认权限申请流程
- [ ] 准备降级方案

## 更新日志

- **2025-08-14**: 完成语音对话功能开发
  - 实现语音输入和识别（ASR）
  - 集成GPT-4o AI对话
  - 实现语音合成播放（TTS）
  - 支持场景切换和多语言