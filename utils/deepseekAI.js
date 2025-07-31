// DeepSeek R1 AI 模型集成
// 支持思维链（reasoning）
// 注意：由于微信小程序端限制，需要通过云函数调用

// 通过云函数调用 DeepSeek
const callDeepSeekCloud = async (action, data) => {
  // 检查云开发是否可用
  if (!wx.cloud) {
    console.error('云开发未初始化');
    throw new Error('请先初始化云开发环境');
  }
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'deepseek-ai',
      data: {
        action,
        ...data
      }
    });
    
    if (res.result && res.result.error) {
      throw new Error(res.result.error);
    }
    
    return res.result;
  } catch (error) {
    console.error('调用 DeepSeek 云函数失败:', error);
    // 如果云函数不存在，返回模拟数据
    if (error.message && error.message.includes('找不到云函数')) {
      return getMockResponse(action, data);
    }
    throw error;
  }
};

// 获取模拟响应（用于开发测试）
const getMockResponse = (action, data) => {
  console.log('使用模拟数据响应');
  
  switch (action) {
    case 'chat':
      return {
        content: '这是一个模拟的对话响应。实际使用时需要部署云函数。',
        reasoning: '思考过程：这是模拟数据...',
        totalTokens: 100
      };
      
    case 'analyzeGrammar':
      return {
        content: `【语法分析】
句子：${data.sentence}

1. 词性标注
- 这是模拟的词性分析

2. 语法结构
- 这是模拟的语法结构分析

3. 注意事项
- 请部署云函数以获得真实的AI分析结果`,
        reasoning: '分析过程：识别句子成分...',
        sentence: data.sentence
      };
      
    default:
      return {
        content: '模拟响应内容',
        reasoning: '模拟思考过程'
      };
  }
};

// 模拟流式输出（实际通过云函数实现）
const streamChat = async function* (messages, options = {}) {
  try {
    // 调用云函数获取完整响应
    const result = await callDeepSeekCloud('chat', {
      messages,
      ...options
    });
    
    // 模拟流式输出思维链
    if (result.reasoning) {
      // 将思维链分成小块逐步输出
      const reasoningChunks = result.reasoning.match(/.{1,50}/g) || [];
      let accumulated = '';
      for (const chunk of reasoningChunks) {
        accumulated += chunk;
        yield {
          type: 'reasoning',
          content: accumulated,
          delta: chunk
        };
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    
    // 模拟流式输出内容
    if (result.content) {
      const contentChunks = result.content.match(/.{1,50}/g) || [];
      let accumulated = '';
      for (const chunk of contentChunks) {
        accumulated += chunk;
        yield {
          type: 'content',
          content: accumulated,
          delta: chunk
        };
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    
    return {
      reasoning: result.reasoning || '',
      content: result.content || '',
      totalTokens: result.totalTokens || 0
    };
    
  } catch (error) {
    console.error('流式对话失败:', error);
    throw error;
  }
};

// 解析流式响应（适配新的格式）
const parseStreamResponse = async (generator, callbacks = {}) => {
  let fullThinking = '';
  let fullContent = '';
  
  try {
    for await (const chunk of generator) {
      if (chunk.type === 'reasoning') {
        fullThinking = chunk.content;
        if (callbacks.onThinking) {
          callbacks.onThinking(chunk.delta, fullThinking);
        }
      } else if (chunk.type === 'content') {
        fullContent = chunk.content;
        if (callbacks.onContent) {
          callbacks.onContent(chunk.delta, fullContent);
        }
      }
    }
  } catch (error) {
    console.error('解析流式响应失败:', error);
    if (callbacks.onError) {
      callbacks.onError(error);
    }
  }
  
  return {
    thinking: fullThinking,
    content: fullContent
  };
};

// 语法分析 - 使用 DeepSeek R1 的思维链能力
const analyzeGrammarWithReasoning = async (sentence, language = 'japanese') => {
  try {
    const result = await callDeepSeekCloud('analyzeGrammar', {
      sentence,
      language
    });
    
    return {
      analysis: result.content || result.analysis,
      reasoning: result.reasoning,
      sentence: sentence
    };
  } catch (error) {
    console.error('语法分析失败:', error);
    throw error;
  }
};

// 智能对话练习
const practiceDialogue = async (scene, userMessage, context = []) => {
  try {
    const result = await callDeepSeekCloud('dialogue', {
      scene,
      userMessage,
      context
    });
    
    return {
      japanese: result.japanese || result.content,
      chinese: result.chinese,
      vocabulary: result.vocabulary || [],
      grammar: result.grammar || [],
      suggestions: result.suggestions || '',
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error('对话练习失败:', error);
    throw error;
  }
};

// 生成记忆曲线复习内容
const generateReviewContent = async (words, userLevel = 'N2') => {
  try {
    const result = await callDeepSeekCloud('review', {
      words,
      userLevel
    });
    
    return {
      content: result.content,
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error('生成复习内容失败:', error);
    throw error;
  }
};

// 导出模块
module.exports = {
  // 移除 createDeepSeekModel，因为不能在小程序端直接使用
  streamChat,
  parseStreamResponse,
  analyzeGrammarWithReasoning,
  practiceDialogue,
  generateReviewContent,
  
  // 简化接口
  quickChat: async (message) => {
    try {
      const result = await callDeepSeekCloud('chat', {
        messages: [{ role: "user", content: message }]
      });
      return result.content;
    } catch (error) {
      console.error('快速对话失败:', error);
      throw error;
    }
  }
};