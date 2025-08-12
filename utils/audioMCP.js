// 音频服务客户端（云函数版本）
const audioCache = require('./audioCache')

class AudioService {
  constructor() {
    this.cache = new Map() // 内存缓存
    this.fileCache = audioCache // 文件缓存系统
    this.preloadQueue = new Map() // 预加载队列
    this.audioContextPool = [] // 音频上下文池
    this.maxPoolSize = 5 // 最大池大小
    console.log('🎵 AudioService初始化（云函数版本 + 本地缓存）')
    this.initAudioPool()
  }
  
  // 初始化音频上下文池
  initAudioPool() {
    // 不需要预创建，按需创建
  }
  
  // 从池中获取可用的音频上下文
  getAudioContext() {
    // 每次创建新的，确保状态干净
    const ctx = wx.createInnerAudioContext()
    ctx.obeyMuteSwitch = false // 不受静音键影响
    ctx.autoplay = false
    return ctx
  }
  
  // 生成音频（调用云函数）
  async generateAudio(text, lang = 'ja', voice = null) {
    console.log(`🎤 生成音频: "${text}" (${lang})`)
    
    const options = { voice, lang }
    
    // 1. 先检查文件缓存
    const cachedFilePath = await this.fileCache.checkCache(text, options)
    if (cachedFilePath) {
      console.log('✅ 使用文件缓存:', cachedFilePath)
      return {
        success: true,
        audioUrl: cachedFilePath,
        cached: true,
        source: 'file_cache'
      }
    }
    
    // 2. 检查内存缓存
    const cacheKey = `${text}_${lang}_${voice || 'default'}`
    if (this.cache.has(cacheKey)) {
      console.log('✅ 使用内存缓存')
      return this.cache.get(cacheKey)
    }
    
    // 3. 调用云函数生成新音频
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'tts-service',
        data: { text, lang, voice },
        success: async (res) => {
          console.log('🎵 云函数调用成功:', res.result)
          
          if (res.result && res.result.success) {
            const audioUrl = res.result.audioUrl
            if (audioUrl) {
              console.log('✅ 获得音频URL:', audioUrl)
              console.log('🔄 备选源数量:', res.result.alternatives?.length || 0)
              
              // 保存到文件缓存（异步，不阻塞）
              this.fileCache.saveToCache(text, audioUrl, options)
                .then(localPath => {
                  console.log('💾 已保存到文件缓存:', localPath)
                  // 更新内存缓存，使用本地路径
                  const cachedResult = {
                    ...res.result,
                    audioUrl: localPath,
                    originalUrl: audioUrl,
                    cached: true,
                    source: 'local_file'
                  }
                  this.cache.set(cacheKey, cachedResult)
                })
                .catch(err => {
                  console.warn('保存到文件缓存失败:', err)
                })
              
              // 先保存到内存缓存
              this.cache.set(cacheKey, res.result)
              resolve(res.result) // 返回完整结果
            } else {
              console.log('⚠️ 无音频URL，返回读音信息:', res.result.readingInfo)
              resolve(res.result.readingInfo)
            }
          } else {
            console.error('❌ 云函数返回失败:', res.result)
            reject(new Error(res.result?.error || '云函数调用失败'))
          }
        },
        fail: (err) => {
          console.error('❌ 云函数调用失败:', err)
          reject(err)
        }
      })
    })
  }
  
  // 批量生成音频
  async batchGenerateAudio(items, lang = 'ja', voice = null) {
    console.log('🎵 批量生成音频:', items.length, '个')
    const results = []
    
    // 简单实现：逐个调用（可优化为真正的批量处理）
    for (const item of items) {
      try {
        const text = typeof item === 'string' ? item : item.text
        const result = await this.generateAudio(text, lang, voice)
        
        let audioUrl = null
        if (typeof result === 'string' && result.startsWith('http')) {
          audioUrl = result
        } else if (result && typeof result === 'object' && result.audioUrl) {
          audioUrl = result.audioUrl
        }
        
        results.push({
          text: text,
          audioUrl: audioUrl,
          alternatives: result?.alternatives || [],
          cached: this.cache.has(`${text}_${lang}_${voice || 'default'}`)
        })
      } catch (error) {
        results.push({
          text: typeof item === 'string' ? item : item.text,
          audioUrl: null,
          error: error.message
        })
      }
    }
    
    return results
  }
  
  // 检查服务状态（云函数版本直接返回true）
  async checkHealth() {
    try {
      // 尝试调用一个简单的云函数测试
      const result = await this.generateAudio('test', 'ja')
      console.log('✅ 云函数服务健康检查通过')
      return true
    } catch (error) {
      console.warn('⚠️ 云函数服务检查失败:', error)
      return false
    }
  }
  
  // 预加载音频
  async preloadAudio(text, lang = 'ja', voice = null) {
    const cacheKey = `${text}_${lang}_${voice || 'default'}`
    
    // 已经在缓存中
    if (this.cache.has(cacheKey)) {
      return
    }
    
    // 已经在预加载中
    if (this.preloadQueue.has(cacheKey)) {
      return
    }
    
    // 添加到预加载队列
    this.preloadQueue.set(cacheKey, true)
    
    try {
      // 在后台获取音频URL
      const result = await this.generateAudio(text, lang, voice)
      
      // 预加载音频文件（优化：不实际播放，只设置src触发下载）
      if (result && result.audioUrl) {
        const ctx = wx.createInnerAudioContext()
        ctx.src = result.audioUrl
        ctx.volume = 0 // 静音
        
        // 监听可播放事件，表示音频已加载
        ctx.onCanplay(() => {
          console.log('✅ 音频已缓存:', text)
          // 立即销毁，避免占用资源
          ctx.destroy()
        })
        
        // 错误处理
        ctx.onError((err) => {
          console.warn('⚠️ 预加载出错:', text, err)
          ctx.destroy()
        })
        
        // 不调用play()，避免与实际播放冲突
        console.log('📥 开始预加载:', text)
      }
    } catch (error) {
      console.warn('⚠️ 预加载失败:', text, error)
    } finally {
      this.preloadQueue.delete(cacheKey)
    }
  }
  
  // 批量预加载
  async batchPreload(items, lang = 'ja', voice = null) {
    const promises = items.map(item => {
      const text = typeof item === 'string' ? item : item.text
      return this.preloadAudio(text, lang, voice)
    })
    await Promise.all(promises)
  }
  
  // 播放音频（支持备选源）
  playAudio(audioUrl, callbacks = {}, alternatives = []) {
    console.log('🎵 开始播放音频:', audioUrl)
    
    if (!audioUrl || audioUrl === 'null' || audioUrl === 'undefined') {
      console.warn('⚠️ 音频URL无效')
      if (callbacks.onError) {
        callbacks.onError(new Error('音频URL无效'))
      }
      return null
    }
    
    const tryPlayAudio = (url, altUrls = []) => {
      const innerAudioContext = this.getAudioContext()
      innerAudioContext.src = url
      innerAudioContext.startTime = 0 // 从头开始播放
      
      // 设置所有回调前先清理旧的
      innerAudioContext.offPlay()
      innerAudioContext.offError()
      innerAudioContext.offEnded()
      innerAudioContext.offCanplay()
      
      // 设置新的回调
      let hasPlayed = false
      
      innerAudioContext.onCanplay(() => {
        console.log('🎵 音频可以播放')
      })
      
      innerAudioContext.onPlay(() => {
        if (!hasPlayed) {
          hasPlayed = true
          console.log('🔊 音频开始播放:', url)
          if (callbacks.onPlay) callbacks.onPlay()
        }
      })
      
      innerAudioContext.onError((err) => {
        console.error('❌ 音频播放失败:', err, 'URL:', url)
        
        // 尝试备选音频源
        if (altUrls.length > 0) {
          console.log('🔄 尝试备选音频源:', altUrls[0])
          innerAudioContext.destroy()
          tryPlayAudio(altUrls[0], altUrls.slice(1))
        } else {
          console.error('❌ 所有音频源都播放失败')
          if (callbacks.onError) callbacks.onError(err)
          innerAudioContext.destroy()
        }
      })
      
      innerAudioContext.onEnded(() => {
        console.log('✅ 音频播放完成')
        if (callbacks.onEnded) callbacks.onEnded()
        setTimeout(() => {
          innerAudioContext.destroy()
        }, 100)
      })
      
      // 开始播放
      try {
        // 尝试立即播放
        innerAudioContext.play()
        
        // 设置超时处理
        setTimeout(() => {
          if (!hasPlayed && innerAudioContext.paused) {
            console.warn('⚠️ 播放超时，尝试备选源')
            innerAudioContext.destroy()
            if (altUrls.length > 0) {
              tryPlayAudio(altUrls[0], altUrls.slice(1))
            } else if (callbacks.onError) {
              callbacks.onError(new Error('播放超时'))
            }
          }
        }, 3000) // 3秒超时
        
      } catch (error) {
        console.error('❌ 播放启动失败:', error)
        innerAudioContext.destroy()
        if (altUrls.length > 0) {
          console.log('🔄 尝试备选音频源:', altUrls[0])
          tryPlayAudio(altUrls[0], altUrls.slice(1))
        } else {
          if (callbacks.onError) callbacks.onError(error)
          return null
        }
      }
      
      return innerAudioContext
    }
    
    return tryPlayAudio(audioUrl, alternatives)
  }
  
  // 直接播放文本（生成音频并播放）
  async playText(text, lang = 'ja', voice = null) {
    console.log(`🎤 请求播放文本: "${text}" (${lang})`)
    
    try {
      // 生成音频（现在可能返回云函数的完整结果）
      const result = await this.generateAudio(text, lang, voice)
      
      let audioUrl = null
      let alternatives = []
      
      if (typeof result === 'string' && result.startsWith('http')) {
        // 兼容旧格式：直接返回URL
        audioUrl = result
      } else if (result && typeof result === 'object' && result.audioUrl) {
        // 新格式：从云函数返回的完整结果中提取
        audioUrl = result.audioUrl
        alternatives = result.alternatives || []
      }
      
      if (audioUrl && audioUrl.startsWith('http')) {
        // 成功获取音频URL，播放音频（支持备选源）
        console.log('✅ 准备播放音频:', audioUrl)
        console.log('🔄 备选音频源:', alternatives.length)
        
        return this.playAudio(audioUrl, {
          onPlay: () => {
            console.log('🔊 音频开始播放')
          },
          onError: (err) => {
            console.error('❌ 音频播放失败:', err)
            this.showFallbackMessage(text, lang)
          },
          onEnded: () => {
            console.log('✅ 音频播放完成')
          }
        }, alternatives)
      } else {
        // 没有音频URL，显示读音信息
        console.log('⚠️ 无法生成音频，显示读音信息')
        this.showFallbackMessage(text, lang)
        return null
      }
    } catch (error) {
      console.error('❌ 播放文本失败:', error)
      this.showFallbackMessage(text, lang)
      return null
    }
  }
  
  // 显示降级信息
  showFallbackMessage(text, lang) {
    const langName = {
      'ja': '日语',
      'en': '英语', 
      'zh': '中文'
    }[lang] || '未知语言'
    
    wx.showToast({
      title: `${langName}读音：${text}`,
      icon: 'none',
      duration: 2000
    })
  }
  
  // 获取支持的声音列表（简化版本）
  async getVoices() {
    return {
      ja: [
        { id: 'default', name: '日语女声', gender: 'female', provider: 'cloud' },
        { id: 'male', name: '日语男声', gender: 'male', provider: 'cloud' }
      ],
      en: [
        { id: 'default', name: '英语女声', gender: 'female', provider: 'cloud' },
        { id: 'male', name: '英语男声', gender: 'male', provider: 'cloud' }
      ],
      zh: [
        { id: 'default', name: '中文女声', gender: 'female', provider: 'cloud' },
        { id: 'male', name: '中文男声', gender: 'male', provider: 'cloud' }
      ]
    }
  }
}

// 导出单例
module.exports = new AudioService()