# 语伴君 - AI驱动的语言学习小程序

## 项目简介
语伴君是一款基于微信小程序的日语/英语学习应用，结合 GPT 智能语法分析、对话生成与记忆曲线的语言学习工具。

## 功能特点
- 📚 **每日学习**：每日推送5-10个精选词汇
- 🔄 **智能复习**：基于艾宾浩斯记忆曲线的复习系统
- 📝 **生词本**：个性化词汇收藏和管理
- 🎯 **AI语法讲解**：GPT-4驱动的智能语法分析
- 💬 **场景对话**：AI角色扮演对话练习
- 🎤 **听力训练**：跟读打分和发音纠正

## 技术架构
- **前端**：微信小程序原生框架
- **后端**：微信云托管（Node.js + Express）
- **AI服务**：OpenAI GPT-4 API
- **数据库**：微信云开发数据库

## 开发环境设置
1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 使用微信开发者工具导入项目
3. 配置AppID（在project.config.json中）
4. 安装依赖（如需要）

## 项目结构
```
LanguageTech/
├── pages/              # 页面文件
├── components/         # 自定义组件
├── utils/             # 工具函数
├── images/            # 图片资源
├── cloud/             # 云函数
└── app.*              # 小程序入口文件
```

## 开发指南
- 查看 [CLAUDE.md](./CLAUDE.md) 了解详细的项目记忆
- 查看 [PROJECT_ITERATION_LOG.md](./PROJECT_ITERATION_LOG.md) 了解开发历程

## 版本计划
- V1.0：MVP版本 - 基础学习功能
- V1.1：加入听力训练
- V1.2：AI对话功能
- V1.3：多语言支持