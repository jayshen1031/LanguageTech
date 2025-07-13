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

module.exports = {
  analyzeGrammar,
  chatWithAI,
  generateExamples,
  evaluatePronunciation,
  getReviewPlan,
  cloudAI
}