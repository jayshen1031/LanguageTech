// 音频MCP客户端
class AudioMCP {
  constructor() {
    // 开发环境使用localhost，生产环境需要改为实际服务器地址
    this.baseUrl = 'http://localhost:3456'
    this.cache = new Map() // 本地缓存
  }
  
  // 生成音频
  async generateAudio(text, lang = 'ja') {
    // 检查本地缓存
    const cacheKey = `${text}_${lang}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.baseUrl}/tts`,
        method: 'POST',
        data: { text, lang },
        header: {
          'content-type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const audioUrl = res.data.audioUrl
            if (audioUrl) {
              // 缓存结果
              this.cache.set(cacheKey, audioUrl)
              resolve(audioUrl)
            } else {
              // 如果没有音频URL，返回读音信息
              resolve(res.data.readingInfo)
            }
          } else {
            reject(new Error('TTS服务请求失败'))
          }
        },
        fail: (err) => {
          console.error('MCP请求失败:', err)
          reject(err)
        }
      })
    })
  }
  
  // 获取支持的声音列表
  async getVoices() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.baseUrl}/voices`,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.voices)
          } else {
            reject(new Error('获取声音列表失败'))
          }
        },
        fail: reject
      })
    })
  }
  
  // 检查服务状态
  async checkHealth() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.baseUrl}/health`,
        method: 'GET',
        success: (res) => {
          resolve(res.statusCode === 200)
        },
        fail: () => resolve(false)
      })
    })
  }
  
  // 播放音频
  playAudio(audioUrl, callbacks = {}) {
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = audioUrl
    
    // 设置回调
    if (callbacks.onPlay) {
      innerAudioContext.onPlay(callbacks.onPlay)
    }
    
    if (callbacks.onError) {
      innerAudioContext.onError(callbacks.onError)
    }
    
    if (callbacks.onEnded) {
      innerAudioContext.onEnded(() => {
        callbacks.onEnded()
        innerAudioContext.destroy()
      })
    }
    
    // 开始播放
    innerAudioContext.play()
    
    return innerAudioContext
  }
}

// 导出单例
module.exports = new AudioMCP()