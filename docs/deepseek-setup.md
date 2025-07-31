# DeepSeek AI 配置指南

## 什么是 DeepSeek？

DeepSeek 是一个强大的多模态大语言模型，特点：
- 支持中文、英文、日文等多语言
- **支持图片识别和理解**（多模态）
- 性价比高，适合大规模应用
- API 兼容 OpenAI 格式，易于集成

## 获取 API Key

1. **注册账号**
   - 访问 [DeepSeek 官网](https://platform.deepseek.com/)
   - 注册并登录账号

2. **获取 API Key**
   - 进入控制台
   - 在 API Keys 页面创建新的 API Key
   - 复制并保存好你的 API Key

## 配置步骤

### 1. 配置云函数

编辑 `cloudfunctions/deepseek-ai/config.js`:
```javascript
module.exports = {
  DEEPSEEK_API_KEY: '你的DeepSeek API Key'
}
```

### 2. 部署云函数

在微信开发者工具中：
1. 右键点击 `cloudfunctions/deepseek-ai`
2. 选择"上传并部署：云端安装依赖"

### 3. 环境变量配置（推荐）

在云开发控制台：
1. 进入云函数管理
2. 找到 `deepseek-ai` 函数
3. 配置环境变量：
   - `DEEPSEEK_API_KEY`: 你的API Key

## 功能特点

### 1. 文本分析
```javascript
// 纯文本日语语法分析
const result = await deepseekAI.analyzeGrammar('私は学生です')
```

### 2. 图片识别（多模态）
```javascript
// 直接识别图片中的日语并分析
const result = await deepseekAI.analyzeGrammar(null, imageUrl)
```

### 3. 对话功能
```javascript
// 多轮对话
const messages = [
  { role: 'system', content: '你是一个日语老师' },
  { role: 'user', content: '这个句子是什么意思？' }
]
const result = await deepseekAI.chat(messages)
```

## 模型选择

DeepSeek 提供多个模型：
- `deepseek-chat`: 通用对话模型
- `deepseek-vl`: 视觉语言模型（支持图片）
- `deepseek-coder`: 代码生成模型

## 费用说明

- 注册送免费额度
- 按 token 计费，价格合理
- 支持预付费和后付费

## 与其他服务对比

| 功能 | DeepSeek | 腾讯混元 | OCR服务 |
|-----|----------|---------|---------|
| 图片识别 | ✅ 原生支持 | ❌ | ✅ |
| 语法分析 | ✅ | ✅ | ❌ |
| 多语言 | ✅ | ✅ | ✅ |
| 成本 | 低 | 中 | 高 |
| 易用性 | 高 | 中 | 低 |

## 故障排查

1. **API Key 无效**
   - 检查是否正确复制
   - 确认账户有余额

2. **图片识别失败**
   - 确保图片清晰
   - 图片大小不超过 4MB
   - 使用 JPG/PNG 格式

3. **响应超时**
   - 增加云函数超时时间
   - 减少图片大小

## 测试示例

在小程序中测试：
1. 进入"日语解析"页面
2. 选择图片模式
3. 上传包含日语的图片
4. 点击"开始解析"
5. DeepSeek 会自动识别并分析