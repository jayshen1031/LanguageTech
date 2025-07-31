// 腾讯云开发 AI 接口封装
// 用于调用微信云开发内置的 AI 能力

// 检查云开发是否已初始化
const ensureCloudInit = () => {
  if (!wx.cloud) {
    console.error('云开发未初始化');
    return false;
  }
  return true;
};

// 创建 AI 模型实例
const createModel = (modelName = 'deepseek') => {
  if (!ensureCloudInit()) {
    throw new Error('云开发未初始化');
  }
  
  try {
    return wx.cloud.extend.AI.createModel(modelName);
  } catch (error) {
    console.error('创建AI模型失败:', error);
    throw error;
  }
};

// 文本生成（非流式）
const generateText = async (prompt, options = {}) => {
  const model = createModel(options.model || 'deepseek');
  
  try {
    const res = await model.generateText({
      data: {
        model: options.modelVersion || "deepseek-r1-0528",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      }
    });
    
    return res.choices[0].message.content;
  } catch (error) {
    console.error('文本生成失败:', error);
    throw error;
  }
};

// 语法分析专用接口
const analyzeGrammar = async (sentence, language = 'japanese') => {
  const systemPrompt = `你是一个专业的${language === 'japanese' ? '日语' : '英语'}语法教师。
请详细分析句子的语法结构，包括：
1. 词性标注（每个词的词性）
2. 语法成分（主语、谓语、宾语等）
3. 时态和语态
4. 特殊语法点
5. 使用场景说明

请用中文解释，输出格式清晰易懂。`;

  const model = createModel('deepseek');
  
  try {
    const res = await model.generateText({
      data: {
        model: "deepseek-r1-0528",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `请分析这个句子：${sentence}` }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }
    });
    
    return {
      sentence,
      analysis: res.choices[0].message.content,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('语法分析失败:', error);
    throw error;
  }
};

// 对话接口
const chat = async (message, context = [], options = {}) => {
  const model = createModel(options.model || 'deepseek');
  
  const messages = [
    ...context,
    { role: "user", content: message }
  ];
  
  try {
    const res = await model.generateText({
      data: {
        model: options.modelVersion || "deepseek-r1-0528",
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      }
    });
    
    return res.choices[0].message.content;
  } catch (error) {
    console.error('对话失败:', error);
    throw error;
  }
};

// 生成例句
const generateExamples = async (word, count = 3) => {
  const prompt = `请为日语单词"${word}"生成${count}个例句。
要求：
1. 每个例句要自然、实用
2. 难度适合N2-N3水平
3. 包含假名标注
4. 提供中文翻译
5. 标注重点语法

输出格式：
例句1：[日文]
假名：[假名标注]
中文：[翻译]
语法点：[说明]`;

  try {
    const content = await generateText(prompt, {
      temperature: 0.8,
      maxTokens: 800
    });
    
    // 简单解析返回的内容
    const examples = [];
    const lines = content.split('\n');
    let currentExample = {};
    
    for (const line of lines) {
      if (line.includes('例句') && line.includes('：')) {
        if (Object.keys(currentExample).length > 0) {
          examples.push(currentExample);
        }
        currentExample = { jp: line.split('：')[1].trim() };
      } else if (line.includes('假名：')) {
        currentExample.kana = line.split('：')[1].trim();
      } else if (line.includes('中文：')) {
        currentExample.cn = line.split('：')[1].trim();
      } else if (line.includes('语法点：')) {
        currentExample.grammar = line.split('：')[1].trim();
      }
    }
    
    if (Object.keys(currentExample).length > 0) {
      examples.push(currentExample);
    }
    
    return examples;
  } catch (error) {
    console.error('生成例句失败:', error);
    throw error;
  }
};

// 智能复习建议
const getReviewSuggestions = async (words, userLevel = 'N2') => {
  const prompt = `用户正在学习以下日语单词：${words.join('、')}
用户水平：${userLevel}

请提供：
1. 这些单词的关联性分析
2. 记忆技巧建议
3. 易混淆点提醒
4. 实用场景举例`;

  try {
    const content = await generateText(prompt, {
      temperature: 0.6,
      maxTokens: 1000
    });
    
    return {
      words,
      suggestions: content,
      level: userLevel
    };
  } catch (error) {
    console.error('获取复习建议失败:', error);
    throw error;
  }
};

// 导出模块
module.exports = {
  createModel,
  generateText,
  analyzeGrammar,
  chat,
  generateExamples,
  getReviewSuggestions,
  
  // 兼容旧接口
  simpleChat: chat,
  grammar: analyzeGrammar
};