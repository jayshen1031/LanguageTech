# 语伴君 项目记忆

## 项目概述
语伴君是一款基于微信小程序的日语/英语学习应用，结合 GPT 智能语法分析、对话生成与记忆曲线的语言学习工具。

## 技术栈
- **前端**: 微信小程序原生框架 + Vant Weapp UI
- **后端**: 微信云托管（Node.js + Express）
- **AI服务**: OpenAI GPT-4o API
- **数据库**: 微信云开发数据库（MongoDB风格）
- **音频处理**: 微信录音接口 + 腾讯云语音识别

## 项目结构
```
LanguageTech/
├── pages/              # 页面文件夹
│   ├── index/         # 首页
│   ├── learn/         # 学习页
│   ├── review/        # 复习页
│   ├── wordbook/      # 生词本
│   ├── ai-grammar/    # AI语法讲解
│   ├── dialogue/      # 对话练习
│   └── profile/       # 个人中心
├── components/         # 自定义组件
│   ├── word-card/     # 单词卡片
│   ├── progress-bar/  # 进度条
│   └── dialogue-box/  # 对话框
├── utils/             # 工具函数
│   ├── request.js     # 网络请求封装
│   ├── auth.js        # 授权相关
│   ├── ai.js          # AI接口封装
│   └── memory.js      # 记忆曲线算法
├── images/            # 图片资源
├── cloud/             # 云函数目录
├── app.js             # 小程序入口
├── app.json           # 小程序配置
├── app.wxss           # 全局样式
└── project.config.json # 项目配置
```

## 常用命令
```bash
# 微信开发者工具中编译预览
# 需要使用微信开发者工具打开项目

# 云函数部署
wx cloud functions deploy

# 上传体验版
wx miniprogram upload
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

### 3. AI语法讲解
- 调用GPT-4o接口
- 智能分析句子语法结构
- 提供词性、变形等详细解释

### 4. 场景对话
- 预设多种日常场景
- AI角色扮演对话
- 支持语音输入输出

### 5. 生词本管理
- 自定义添加生词
- 支持笔记和标签
- 可编辑和导出

## 开发注意事项

### 1. API密钥管理
- OpenAI API Key 必须存储在云托管环境变量中
- 不要在前端代码中暴露任何密钥

### 2. 微信小程序限制
- 必须使用正式AppID才能使用云开发功能
- 音频功能需要用户授权
- 注意包大小限制（主包不超过2MB）

### 3. 性能优化
- 使用分包加载减少首屏加载时间
- 图片资源使用CDN或云存储
- 合理使用缓存减少API调用

### 4. 用户体验
- 适配iPhone和Android主流机型
- 考虑网络延迟，添加加载状态
- 语音识别需要良好的错误处理

## 版本规划
- **V1.0**: MVP版本 - 学习、生词本、GPT语法、打卡
- **V1.1**: 加入听力训练和跟读打分
- **V1.2**: 场景AI对话功能
- **V1.3**: 多语言支持和学习报告

## 相关文档
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [OpenAI API文档](https://platform.openai.com/docs)
- [Vant Weapp组件库](https://vant-contrib.gitee.io/vant-weapp/)