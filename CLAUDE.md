# 语伴君 项目记忆

## 项目概述
语伴君是一款基于微信小程序的日语/英语学习应用，结合 GPT 智能语法分析、对话生成与记忆曲线的语言学习工具。

## 技术栈
- **前端**: 微信小程序原生框架 + Vant Weapp UI
- **后端**: 微信云开发（云函数 + 云数据库）
- **云环境ID**: cloud1-2g49srond2b01891
- **AI服务**: 
  - Azure OpenAI GPT-4o（主要，支持图片识别和长文本）
  - DeepSeek AI（备选，支持文本分析）
  - 腾讯混元AI（备选）
- **数据库**: 微信云开发数据库（MongoDB风格）
- **音频处理**: MCP服务 + 云函数TTS + 腾讯云语音识别

## 项目结构
```
LanguageTech/
├── pages/              # 页面文件夹
│   ├── index/         # 首页
│   ├── learn/         # 学习页
│   ├── review/        # 复习页
│   ├── wordbook/      # 生词本
│   ├── voice-dialogue/ # 语音对话
│   ├── profile/       # 个人中心
│   ├── admin/         # 管理页面（词汇管理）
│   ├── japanese-parser/ # 日语解析（支持歌词分批处理）
│   ├── parser-history/ # 解析历史记录
│   ├── parser-review/  # 解析内容复习
│   ├── todo-manage/   # 项目待办管理（新增）
│   ├── grammar-study/ # 语法学习
│   └── kana-merged/   # 假名学习（合并版）
├── components/         # 自定义组件
│   ├── word-card/     # 单词卡片
│   ├── progress-bar/  # 进度条
│   ├── dialogue-box/  # 对话框
│   └── voice-recorder/ # 录音组件（新增）
├── cloudfunctions/    # 云函数目录
│   ├── azure-gpt4o/   # Azure GPT-4o主云函数
│   ├── azure-gpt4o-batch/ # GPT-4o批处理云函数
│   ├── azure-gpt4o-fast/ # GPT-4o快速云函数
│   ├── deepseek-ai/   # DeepSeek AI云函数
│   ├── tts-service/   # TTS语音合成服务
│   ├── asr-service/   # ASR语音识别
│   ├── todo-manage/   # 待办事项管理（新增）
│   └── init-vocabulary/ # 词汇初始化
├── utils/             # 工具函数
│   ├── request.js     # 网络请求封装
│   ├── auth.js        # 授权相关
│   ├── ai.js          # AI接口封装
│   ├── audioMCP.js    # MCP音频客户端
│   ├── voiceService.js # 语音服务封装（新增）
│   ├── memory.js      # 记忆曲线算法
│   ├── audioData.js   # 音频数据
│   ├── deepseekAI.js  # DeepSeek AI接口
│   ├── grammarData.js # 语法数据
│   ├── kanaData.js    # 假名数据
│   └── tcbAI.js       # 腾讯云AI接口
├── audio-mcp-server/  # MCP音频服务器（开发用）
├── data/              # 数据文件
├── images/            # 图片资源
├── app.js             # 小程序入口
├── app.json           # 小程序配置
├── app.wxss           # 全局样式
└── project.config.json # 项目配置
```

## 常用命令
```bash
# 启动MCP音频服务（开发环境）
./start-audio-mcp.sh

# 测试MCP服务
cd audio-mcp-server && node ../test-mcp.js

# 微信开发者工具中编译预览
# 需要使用微信开发者工具打开项目

# 云函数部署（在微信开发者工具中）
# 右键点击云函数 -> 上传并部署：云端安装依赖

# 上传体验版
# 微信开发者工具 -> 上传 -> 上传为体验版
```

## 核心功能模块

### 1. 每日学习
- 每日推送5-10个单词/句子
- 包含假名、罗马音、例句、发音
- 支持标记掌握状态

### 2. 间隔复习
- 基于艾宾浩斯记忆曲线
- 自动安排复习时间
- 支持自测和状态更新

### 3. 语音对话（新功能）
- 支持语音输入和识别（ASR）
- AI自动回复并语音播放（TTS）
- 预设多种日常场景（日常、购物、餐厅、旅行、工作）
- 支持语音/文字输入模式切换
- 支持中英日多语言对话

### 4. 生词本管理
- 自定义添加生词
- 支持笔记和标签
- 可编辑和导出

## 开发注意事项

### 1. API密钥管理
- OpenAI API Key 必须存储在云托管环境变量中
- 不要在前端代码中暴露任何密钥

### 2. 微信小程序限制
- 必须使用正式AppID才能使用云开发功能
- 第三方插件需要在微信公众平台授权（如WechatSI插件）
- 音频功能需要用户授权
- 注意包大小限制（主包不超过2MB）

### 3. 音频功能策略
- **开发环境**：使用MCP音频服务（edge-tts）
- **生产环境**：云函数TTS或授权插件
- **降级方案**：MCP -> 云函数 -> 显示读音
- **启动命令**：`./start-audio-mcp.sh`

### 4. 性能优化
- 使用分包加载减少首屏加载时间
- 图片资源使用CDN或云存储
- 合理使用缓存减少API调用
- 音频预加载提升体验

### 5. 日语句子解析
- 支持文本/图片输入
- 智能分析句子语法结构
- 提供词性、变形等详细解释
- 解析结果自动保存可复习
- **分批处理长文本**：歌词等长文本自动分批（每批4行），避免超时
- **进度显示**：显示当前处理批次（如"解析中 3/7"）
- **智能降级**：单批失败不影响整体，失败批次使用本地解析

### 6. 用户体验
- 适配iPhone和Android主流机型
- 考虑网络延迟，添加加载状态
- 语音识别需要良好的错误处理
- 多重降级确保功能可用性

## 版本更新记录
- **V1.0**: MVP版本 - 学习、生词本、GPT语法、打卡
- **V1.1**: 加入假名学习、语法学习、日语解析
- **V1.2**: 实现语音对话功能（ASR+TTS+AI） ✅
- **V1.3**: 实现日语解析存储和复习功能 ✅
  - 解析结果自动保存到数据库
  - 支持查看解析历史记录
  - 收藏/取消收藏解析记录
  - 多种复习模式：随机、收藏、最近
  - 卡片式复习界面，支持显示/隐藏答案
  - 掌握程度标记功能
- **V1.4**: 2025-08-12更新 ✅
  - 添加项目待办管理功能（todo-manage）
  - 优化日语解析：支持歌词等长文本分批处理
  - 分批处理避免60秒超时问题
  - 添加解析进度显示
  - 失败批次智能降级到本地解析
- **V1.5**: 计划：听力训练、跟读打分、学习报告

## 数据库设计

### n2_vocabulary 集合
词汇数据表，存储JLPT N2级别的日语词汇：
```javascript
{
  _id: 'auto',           // 自动生成ID
  word: '影響',          // 日语单词
  kana: 'えいきょう',    // 假名
  romaji: 'eikyou',     // 罗马音
  meaning: '影响',       // 中文含义
  type: '名词',         // 词性（动词/名词/形容词/副词等）
  level: 'N2',          // JLPT级别
  examples: [           // 例句数组
    {
      jp: '悪い影響を与える。',
      cn: '产生不良影响。'
    }
  ],
  tags: ['因果'],       // 标签分类
  random: 0.5,          // 随机排序字段（0-1）
  createTime: Date,     // 创建时间
  updateTime: Date      // 更新时间
}
```

### project_todos 集合
项目待办事项表，用于管理开发任务：
```javascript
{
  _id: 'auto',           // 自动生成ID
  title: '任务标题',     // 任务名称
  description: '描述',   // 详细描述
  status: 'pending',     // 状态：pending/in_progress/completed
  priority: 1,           // 优先级：1-4（1最高）
  tags: ['前端'],        // 标签数组
  assignee: '',          // 负责人
  dueDate: Date,         // 截止日期
  createTime: Date,      // 创建时间
  updateTime: Date,      // 更新时间
  createdBy: 'openid'    // 创建者
}
```

### japanese_parser_history 集合
日语解析历史记录表，存储用户的解析记录用于复习：
```javascript
{
  _id: 'auto',           // 自动生成ID
  _openid: 'user_openid', // 用户标识
  inputText: '私は学生です。', // 输入的原文（文本模式）
  inputMethod: 'text',    // 输入方式：text/image
  sentences: [           // 解析出的句子数组
    {
      originalText: '私は学生です。',
      romaji: 'watashi wa gakusei desu',
      translation: '我是学生。',
      structure: '主语 + 主题助词 + 表语 + 系动词',
      analysis: '• 私（わたし）- 主语...',
      grammar: '• は：主题助词...',
      vocabulary: [
        {
          japanese: '私',
          romaji: 'watashi',
          chinese: '我'
        }
      ]
    }
  ],
  favorite: false,       // 是否收藏
  createTime: Date,      // 创建时间
  updateTime: Date       // 更新时间
}
```

## 批量导入功能

### 支持的文件格式

1. **JSON格式**（推荐）
```json
[
  {
    "word": "影響",
    "kana": "えいきょう",
    "romaji": "eikyou",
    "meaning": "影响",
    "type": "名词",
    "level": "N2",
    "examples": [
      { "jp": "悪い影響を与える。", "cn": "产生不良影响。" }
    ],
    "tags": ["因果"]
  }
]
```

2. **CSV格式**
```csv
word,kana,romaji,meaning,type,level
影響,えいきょう,eikyou,影响,名词,N2
```

3. **TXT格式**（简单格式）
```
影響 えいきょう 影响
解決 かいけつ 解决
```

### 导入流程
1. 进入学习页面，如果词汇库为空会提示
2. 选择"批量导入"进入导入页面
3. 选择文件并预览
4. 确认后开始导入

## 腾讯云配置

### 云函数配置
- 超时时间：20秒
- 内存：256MB  
- 环境：cloud1-2g49srond2b01891
- AppId: 1257812720

### 密钥配置

#### 腾讯云
- 子账号ID: 100002574906
- 用户名: jayshen
- SecretId: （请在环境变量或config.js中配置）
- SecretKey: （请在环境变量或config.js中配置）

#### DeepSeek AI
- API Key: （请在环境变量或config.js中配置）
- 配置文件: cloudfunctions/deepseek-ai/config.js

#### Azure OpenAI (GPT-4o)
- API Key: （请在环境变量或config.js中配置）
- Endpoint: https://bondex.openai.azure.com
- Deployment: global-gpt-4o
- 配置文件: cloudfunctions/azure-gpt4o/config.js

### 需要配置密钥的云函数
- ocr-service：OCR文字识别
- hunyuan-ai：腾讯混元AI对话
- tts-service：语音合成
- asr-service：语音识别

### 配置方式
1. **开发环境**：各云函数目录下的config.js文件（已添加到.gitignore）
2. **生产环境**：使用云函数环境变量配置TENCENT_SECRET_ID和TENCENT_SECRET_KEY
3. **注意**: 不要在代码中硬编码密钥，所有config.js文件已被gitignore

## 最新功能：语音对话

### 功能特点
1. **语音输入**：集成录音组件，支持实时录音和波形显示
2. **语音识别**：通过腾讯云ASR将语音转为文字
3. **AI对话**：接入GPT-4o生成自然对话回复
4. **语音合成**：多源TTS服务确保语音播放稳定性
5. **场景化学习**：预设5种对话场景，贴近实际应用

### 技术实现
- **前端**：微信小程序原生录音API + 自定义组件
- **后端**：云函数处理ASR/TTS，确保安全性
- **降级策略**：TTS多源备选，ASR失败时提示文字输入
- **性能优化**：音频缓存、预加载、临时文件自动清理

### 使用流程
1. 进入"语音对话"页面
2. 选择对话场景和语言
3. 点击麦克风录音或切换文字输入
4. AI自动识别、回复并朗读
5. 可重播历史对话音频

## 重要开发规范

### UI设计原则
1. **不添加多余的说明性文字**：不要在产品UI中添加解释功能位置或操作方法的提示（如"主要功能已整合到底部导航栏"）
2. **保持界面简洁**：用户能够理解界面，无需额外说明
3. **功能优于说明**：通过良好的设计让功能不言自明

### 代码规范
1. **不创建不必要的文件**：优先编辑现有文件
2. **不主动创建文档**：除非用户明确要求
3. **只做被要求的事**：不多不少，精准完成任务

## 常见问题解决

### 1. 云函数调用超时
- **问题**：处理长文本时出现60秒超时错误
- **解决**：使用分批处理，每批4行，批次间延迟500ms

### 2. 云函数未找到错误
- **问题**：errCode: -501000 FUNCTION_NOT_FOUND
- **解决**：在微信开发者工具中右键云函数，选择"上传并部署：云端安装依赖"

### 3. 日语解析优化
- **歌词处理**：检测到假名标注自动启用分批处理模式
- **进度显示**：实时显示处理进度（如"解析中 3/7"）
- **降级策略**：单批失败使用本地解析，不影响其他批次

## 相关文档
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [Azure OpenAI文档](https://learn.microsoft.com/azure/ai-services/openai/)
- [Vant Weapp组件库](https://vant-contrib.gitee.io/vant-weapp/)
- [腾讯云语音合成](https://cloud.tencent.com/document/product/1073)
- [腾讯云语音识别](https://cloud.tencent.com/document/product/1093)

---
*最后更新：2025-08-12*