# 微信插件授权问题解决方案

## 问题描述
```
报错：插件未授权使用：user uin can not visit app
```

## 原因分析
微信同声传译插件（WechatSI）需要在微信公众平台进行正式授权才能使用，开发阶段无法直接使用。

## 解决方案

### 方案1：移除插件依赖（已实施）
```javascript
// 注释掉插件引用
// const plugin = requirePlugin("WechatSI")

// 移除app.json中的插件配置
// "plugins": {
//   "WechatSI": {
//     "version": "0.3.5", 
//     "provider": "wx069ba97219f66d99"
//   }
// }
```

### 方案2：优化音频播放策略
```
优先级调整：
MCP服务 -> 云函数 -> 显示读音信息

原策略：MCP -> 插件 -> 云函数 -> 读音
新策略：MCP -> 云函数 -> 读音
```

## 启动方法

### 1. 启动MCP音频服务
```bash
# 方法1：使用启动脚本
./start-audio-mcp.sh

# 方法2：手动启动
cd audio-mcp-server
npm install
npm start
```

### 2. 在微信开发者工具中
1. 打开项目
2. 设置 -> 本地设置 -> 不校验合法域名
3. 编译预览

## 功能验证

### MCP服务功能测试
```bash
cd audio-mcp-server
npm install axios
node ../test-mcp.js
```

### 小程序端测试
1. 进入学习页面
2. 点击播放按钮
3. 检查控制台日志确认音频来源

## 后续优化方案

### 1. 插件授权（生产环境）
- 在微信公众平台申请插件使用权限
- 正式AppID才能使用第三方插件

### 2. 云函数TTS（推荐）
- 部署腾讯云TTS云函数
- 使用微信云开发的语音能力
- 更稳定的生产环境方案

### 3. 原生录音API
```javascript
// 使用微信原生录音接口
const recorderManager = wx.getRecorderManager()
```

## 代码修改记录

### 文件：pages/learn/learn.js
- 注释插件引用
- 调整音频播放优先级
- 优化错误处理逻辑

### 文件：app.json
- 移除插件配置项

### 文件：utils/audioMCP.js
- 保持MCP服务集成
- 完善错误处理

## 注意事项

1. **开发环境**：使用MCP服务 + 本地edge-tts
2. **测试环境**：可以集成云函数TTS
3. **生产环境**：需要申请插件授权或使用云函数

## 最佳实践

1. **多重降级策略**：确保在任何情况下都有音频方案
2. **用户体验**：即使音频失败，也显示读音信息
3. **性能优化**：使用缓存减少重复生成
4. **错误监控**：记录音频失败情况，便于优化