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
├── pages/              # 主包页面
│   ├── index/         # 首页
│   ├── learn/         # 学习页
│   ├── review/        # 复习页
│   ├── wordbook/      # 生词本
│   ├── parser-history/ # 解析历史记录
│   ├── profile/       # 个人中心
│   └── mastery-stats/ # 学习统计页面
├── packageA/          # 分包A
│   └── pages/
│       ├── voice-dialogue/ # 语音对话
│       ├── kana-merged/   # 假名学习
│       ├── grammar-study/ # 语法学习
│       └── grammar-library/ # 语法库
├── packageB/          # 分包B
│   └── pages/
│       ├── japanese-parser/ # 日语解析（支持歌词分批处理）
│       ├── parser-detail/  # 解析详情
│       ├── parser-review/  # 解析内容复习
│       ├── history-vocabulary/ # 历史词汇
│       ├── vocabulary-search/ # 词汇搜索
│       └── learning-plan/  # 学习计划
├── packageAdmin/      # 管理分包
│   └── pages/
│       ├── admin/import-n2 # 词汇导入
│       └── todo-manage/    # 项目待办管理
├── components/         # 自定义组件
│   ├── word-card/     # 单词卡片
│   ├── progress-bar/  # 进度条
│   ├── dialogue-box/  # 对话框
│   └── voice-recorder/ # 录音组件
├── cloudfunctions/    # 云函数目录
│   ├── azure-gpt4o/   # Azure GPT-4o主云函数
│   ├── azure-gpt4o-batch/ # GPT-4o批处理云函数
│   ├── azure-gpt4o-fast/ # GPT-4o快速云函数
│   ├── deepseek-ai/   # DeepSeek AI云函数
│   ├── tts-service/   # TTS语音合成服务
│   ├── asr-service/   # ASR语音识别
│   ├── todo-manage/   # 待办事项管理
│   └── init-vocabulary/ # 词汇初始化
├── utils/             # 工具函数
│   ├── request.js     # 网络请求封装
│   ├── auth.js        # 授权相关
│   ├── ai.js          # AI接口封装
│   ├── audioMCP.js    # MCP音频客户端
│   ├── voiceService.js # 语音服务封装
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

## 音频缓存方案
 ⏺ ✅ 音频缓存方案完成！

  实现的简单有效方案：
  1. URL缓存 - 第一次播放成功后缓存TTS URL
  2. 智能重用 - 下次播放同一单词直接使用缓存的URL
  3. 系统优化 - 利用小程序自身的网络和音频缓存机制
  4. 降级保障 - TTS失败时自动降级到云函数方案

[后续内容保持不变...]