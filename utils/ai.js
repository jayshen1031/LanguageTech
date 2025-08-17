// AI接口封装
const request = require('./request')

// GPT语法解析
const analyzeGrammar = (sentence) => {
  return request.post('/api/ai/grammar', {
    sentence,
    model: 'gpt-4',
    language: 'japanese'
  })
}

// AI对话
const chatWithAI = (message, context = []) => {
  return request.post('/api/ai/chat', {
    message,
    context,
    scene: 'language_learning',
    model: 'gpt-4'
  })
}

// 生成例句
const generateExamples = (word, count = 3) => {
  return request.post('/api/ai/examples', {
    word,
    count,
    difficulty: 'beginner',
    model: 'gpt-3.5-turbo'
  })
}

// 语音评分
const evaluatePronunciation = (audioUrl, targetText) => {
  return request.post('/api/ai/pronunciation', {
    audioUrl,
    targetText,
    language: 'japanese'
  })
}

// 智能复习计划
const getReviewPlan = (userId) => {
  return request.get('/api/ai/review-plan', {
    userId,
    algorithm: 'spaced_repetition'
  })
}

// 云函数调用封装（用于微信云开发）
const callCloudFunction = (name, data) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        if (res.result.code === 0) {
          resolve(res.result.data)
        } else {
          wx.showToast({
            title: res.result.message || '请求失败',
            icon: 'none'
          })
          reject(res.result)
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

// 使用云函数的AI接口
const cloudAI = {
  // 语法解析
  analyzeGrammar: (sentence) => {
    return callCloudFunction('ai-grammar', { sentence })
  },
  
  // AI对话
  chat: (message, context) => {
    return callCloudFunction('ai-chat', { message, context })
  },
  
  // 生成例句
  generateExamples: (word, count) => {
    return callCloudFunction('ai-examples', { word, count })
  }
}


// Azure GPT-4o 接口
const azureGPT4o = {
  // 对话
  chat: async (messages, options = {}) => {
    try {
      const res = await callCloudFunction('azure-gpt4o', {
        action: 'chat',
        messages: messages,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000
      })
      return res.data
    } catch (error) {
      console.error('Azure GPT-4o 对话失败:', error)
      throw error
    }
  },
  
  // 语法分析（支持图片）
  analyzeGrammar: async (sentence, imageUrl) => {
    try {
      const res = await callCloudFunction('azure-gpt4o', {
        action: 'grammar',
        sentence: sentence,
        imageUrl: imageUrl
      })
      return res.data
    } catch (error) {
      console.error('Azure GPT-4o 语法分析失败:', error)
      throw error
    }
  },
  
  // 简化的对话接口
  simpleChat: async (message) => {
    try {
      // 使用超简化云函数
      const res = await wx.cloud.callFunction({
        name: 'azure-gpt4o',
        data: { prompt: message }
      })
      
      if (res.result.success) {
        return res.result.content
      } else {
        throw new Error(res.result.error || 'AI调用失败')
      }
    } catch (error) {
      console.error('Azure GPT-4o 简单调用失败:', error)
      throw error
    }
  }
}


// 通用的发送消息接口（用于语音对话）
const sendMessage = async (prompt) => {
  try {
    // 使用 Azure GPT-4o
    return await azureGPT4o.simpleChat(prompt)
  } catch (error) {
    console.error('Azure GPT-4o 调用失败:', error)
    
    // 降级方案：返回简单的回复
    const fallbackResponses = {
      '日常对话': '很抱歉，我现在无法理解您的话。请稍后再试。',
      '购物': '对不起，系统暂时出现问题。请稍后再来。',
      '餐厅': '抱歉，我们的系统暂时无法响应。',
      '旅行': '很抱歉，服务暂时不可用。',
      '工作': '系统繁忙，请稍后重试。'
    }
    
    // 从prompt中提取场景信息
    for (const scene in fallbackResponses) {
      if (prompt.includes(scene)) {
        return fallbackResponses[scene]
      }
    }
    
    return '很抱歉，AI服务暂时不可用，请稍后再试。'
  }
}

module.exports = {
  analyzeGrammar,
  chatWithAI,
  generateExamples,
  evaluatePronunciation,
  getReviewPlan,
  cloudAI,
  azureGPT4o,
  sendMessage
}