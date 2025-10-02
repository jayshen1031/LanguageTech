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

## 首页词汇统计点击功能
 ⏺ ✅ 首页词汇统计可点击查看列表功能完成！

  实现功能：
  1. **首页统计卡片点击跳转** - 为总词汇量(271)、已掌握(31)、未掌握(240)添加点击事件
  2. **新建词汇列表页面** - 创建 `packageB/pages/vocabulary-list/vocabulary-list`
  3. **简洁词汇展示** - 列表显示：单词、罗马音、中文解释
  4. **分类显示支持** - 根据参数显示全部/已掌握/未掌握词汇
  5. **词汇详情弹窗** - 点击详情可查看完整信息和例句
  6. **发音播放功能** - 集成音频播放，支持单词发音
  7. **点击视觉反馈** - 统计卡片添加点击效果和动画

  页面特性：
  - 🎯 **智能分类**：根据出现次数判断掌握程度（≥3次为已掌握）
  - 📱 **响应式设计**：美观的卡片式布局
  - 🔊 **音频集成**：支持单词和例句发音
  - 📊 **学习统计**：显示出现次数、例句数量等信息
  - 🎨 **用户体验**：下拉刷新、上拉加载更多、空状态处理

  文件更新：
  - ✅ `pages/index/index.wxml` - 添加点击事件
  - ✅ `pages/index/index.js` - 添加跳转方法
  - ✅ `pages/index/index.wxss` - 添加点击样式
  - ✅ `packageB/pages/vocabulary-list/*` - 新建完整页面
  - ✅ `app.json` - 添加页面路由配置

## 句子结构管理系统
 ⏺ ✅ 句子结构管理系统完成！

  实现功能：
  1. **句子结构数据整合** - 从解析历史中提取并去重句子结构、语法要点、句法分析
  2. **智能分类系统** - 自动分类为：句子结构、语法要点、句法分析三大类别
  3. **难度级别划分** - 根据内容长度自动分级：基础、中级、高级
  4. **首页统计展示** - 新增句子结构统计卡片，支持点击查看
  5. **专业列表页面** - 创建 `packageB/pages/structure-list/structure-list`
  6. **高级筛选功能** - 支持按类别、难度、掌握程度筛选
  7. **学习计划集成** - 支持将句子结构加入学习计划

  数据结构特点：
  - 🎯 **智能去重**：相同结构自动合并，统计出现次数
  - 📊 **掌握度判断**：出现3次以上认为已掌握
  - 🔍 **例句关联**：每个结构保留原始例句和来源
  - 🏷️ **标签系统**：自动标记来源和类型
  - 📈 **使用统计**：记录首次/最后出现时间

  页面功能：
  - ✅ **分类筛选**：句子结构/语法要点/句法分析
  - ✅ **难度筛选**：基础/中级/高级
  - ✅ **掌握度显示**：已掌握/学习中状态
  - ✅ **例句预览**：显示第一个例句作为预览
  - ✅ **详情弹窗**：完整信息展示，包括所有例句
  - ✅ **发音播放**：支持例句发音
  - ✅ **一键加载**：支持一次性加载全部结构
  - ✅ **学习计划**：快速加入学习计划功能

  技术架构：
  - 📦 **云函数支持**：`sentence-structure-integration` 云函数
  - 🗄️ **数据库表**：`sentence_structures_integrated` 集合
  - 🔄 **前端整合**：支持前端自动整合，无需云函数部署
  - 📱 **响应式设计**：美观的移动端界面
  - ⚡ **性能优化**：分页加载、缓存机制

  文件创建：
  - ✅ `cloudfunctions/sentence-structure-integration/*` - 句子结构整合云函数
  - ✅ `pages/index/index.js` - 添加句子结构统计和整合逻辑
  - ✅ `pages/index/index.wxml` - 添加句子结构统计卡片
  - ✅ `pages/index/index.wxss` - 添加句子结构卡片样式
  - ✅ `packageB/pages/structure-list/*` - 完整的句子结构列表页面
  - ✅ `packageB/pages/japanese-parser/japanese-parser.js` - 添加增量整合逻辑
  - ✅ `app.json` - 添加新页面路由

## 数据库结构和增量更新机制
 ⏺ ✅ 完整的数据持久化和增量更新系统！

  **数据库集合**: `sentence_structures_integrated`
  
  **字段结构**:
  ```javascript
  {
    structure: "主语は動詞します", // 句子结构文本
    examples: [  // 例句数组
      {
        jp: "私は日本語を勉強します",
        romaji: "watashi wa nihongo wo benkyou shimasu", 
        cn: "我学习日语",
        source: "解析记录",
        recordId: "解析记录ID",
        sentenceIndex: 0
      }
    ],
    sources: ["record_id_1"], // 来源记录ID数组
    totalOccurrences: 3, // 出现总次数
    firstSeen: Date, // 首次出现时间
    lastSeen: Date,  // 最后出现时间
    category: "sentence_structure", // 类别
    difficulty: "basic", // 难度级别
    tags: ["句子结构"] // 标签数组
  }
  ```

  **增量更新机制**:
  1. **新解析触发更新** - 每次解析完成自动调用增量整合
  2. **智能去重合并** - 相同结构自动合并，新例句追加到examples数组
  3. **实时统计更新** - 统计totalOccurrences，更新lastSeen时间
  4. **首页统计刷新** - 整合完成后自动刷新首页数据
  5. **用户提示反馈** - 显示"已整合X个句子结构"提示

  **工作流程**:
  ```
  用户解析新内容 → japanese-parser保存历史 → 
  自动调用integrateStructuresToLearning → 
  提取句子结构+语法点 → 检查数据库是否存在 → 
  新增或更新记录 → 刷新首页统计 → 用户看到更新
  ```

  **支持的数据提取**:
  - 📝 **句子结构** - 从sentence.structure字段提取
  - 📚 **语法要点** - 从sentence.grammar字段解析提取  
  - 🔍 **句法分析** - 从sentence.analysis字段解析提取
  - 🏷️ **自动分类** - 根据内容特征自动归类
  - ⭐ **难度评级** - 根据长度自动评定难度等级

## 重复数据合并功能
 ⏺ ✅ 句子结构去重合并工具完成！

  **问题解决**: 
  - 🔍 **重复检测** - 718个句子结构中发现重复项
  - 🔄 **智能合并** - 相同结构自动合并，保留所有例句
  - 📊 **数据优化** - 减少冗余，提高数据质量

  **核心功能**:
  1. **重复检查** - 统计重复情况，显示详细报告
  2. **智能合并** - 保留最优记录，合并所有例句和来源
  3. **数据清理** - 删除重复记录，优化数据库结构
  4. **实时更新** - 合并完成后自动刷新首页统计

  **合并策略**:
  - 🎯 **保留策略** - 选择examples最多或创建时间最早的记录
  - 📚 **例句合并** - 合并所有不重复的例句
  - 🔗 **来源追踪** - 合并所有来源记录ID
  - ⏰ **时间优化** - 保留最早和最晚的时间戳
  - 📊 **统计更新** - 重新计算totalOccurrences

  **用户界面**:
  - 🔍 **检查重复按钮** - 首页句子结构卡片右上角
  - 🔄 **合并重复按钮** - 一键执行合并操作
  - 📋 **详细报告** - 显示合并前后的统计对比
  - ✅ **操作确认** - 重要操作需要用户确认

  **文件创建**:
  - ✅ `utils/mergeStructures.js` - 重复检查和合并工具
  - ✅ `pages/index/index.wxml` - 添加管理按钮
  - ✅ `pages/index/index.js` - 添加合并功能方法
  - ✅ `pages/index/index.wxss` - 添加按钮样式

[后续内容保持不变...]