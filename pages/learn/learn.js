const app = getApp()
const audioMCP = require('../../utils/audioMCP')

const db = wx.cloud.database()

Page({
  data: {
    wordList: [],
    currentIndex: 0,
    currentWord: {},
    showExample: true,
    inWordbook: false,
    showComplete: false,
    showSetup: true, // 显示设置界面
    selectedCount: 10, // 默认学习数量
    masteredCount: 0,
    fuzzyCount: 0,
    forgotCount: 0,
    learningRecord: {}, // 记录每个单词的学习状态
    mcpAvailable: false, // MCP服务是否可用
    isPlaying: false, // 是否正在播放音频
    learningPlan: null, // 学习计划信息
    learningStats: null // 学习统计
  },
  
  // 页面实例属性
  timers: [], // 存储所有定时器
  isPageUnloaded: false, // 页面是否已卸载

  onLoad(options) {
    // 检查MCP服务（可选）
    // this.checkMCPService()
    
    // 临时跳过MCP，直接使用云函数或读音显示
    this.setData({ mcpAvailable: false })
    console.log('⚠️ 跳过MCP服务，使用备用方案')
    
    // 初始化音频上下文
    this.initAudioContext()
    
    // 检查自动开始学习设置
    const autoStart = wx.getStorageSync('autoStartLearning') || false
    this.setData({
      autoStartLearning: autoStart
    })
    
    // 清理过期的音频缓存
    this.cleanExpiredAudioCache()
    
    // 检查是否有传入的学习数量，如果有则自动开始
    if (options && options.count) {
      const count = parseInt(options.count)
      if (count > 0) {
        this.setData({ 
          selectedCount: count,
          showSetup: false 
        })
        this.loadTodayWords(count)
        return
      }
    }
    
    // 检查是否要自动开始（使用默认数量）
    if (autoStart) {
      const defaultCount = wx.getStorageSync('defaultLearningCount') || 10
      this.setData({
        selectedCount: defaultCount,
        showSetup: false
      })
      this.loadTodayWords(defaultCount)
    }
  },

  // 选择学习数量
  selectWordCount(e) {
    const count = parseInt(e.currentTarget.dataset.count)
    this.setData({
      selectedCount: count,
      showSetup: false
    })
    
    // 保存用户选择的数量作为默认值
    wx.setStorageSync('defaultLearningCount', count)
    
    // 加载指定数量的单词
    this.loadTodayWords(count)
  },
  
  // 设置自动开始学习
  toggleAutoStart(e) {
    const autoStart = e.detail.value
    
    // 保存到本地存储
    wx.setStorageSync('autoStartLearning', autoStart)
    
    // 更新页面数据
    this.setData({
      autoStartLearning: autoStart
    })
    
    console.log('自动开始学习设置:', autoStart)
  },
  
  // 初始化音频上下文
  initAudioContext() {
    // 创建全局音频上下文
    this.innerAudioContext = wx.createInnerAudioContext()
    
    // 设置音频事件监听器
    this.innerAudioContext.onPlay(() => {
      console.log('✅ 音频开始播放')
      this.setData({ isPlaying: true })
    })
    
    this.innerAudioContext.onEnded(() => {
      console.log('✅ 音频播放完成')
      this.setData({ isPlaying: false })
    })
    
    this.innerAudioContext.onError((err) => {
      console.error('❌ 音频播放失败:', err)
      this.setData({ isPlaying: false })
    })
    
    this.innerAudioContext.onStop(() => {
      console.log('⏹️ 音频停止播放')
      this.setData({ isPlaying: false })
    })
  },

  // 清理过期的音频缓存
  cleanExpiredAudioCache() {
    try {
      const cacheExpireDays = 7
      const expireTime = Date.now() - (cacheExpireDays * 24 * 60 * 60 * 1000)
      
      // 获取所有缓存的音频文件
      const storageInfo = wx.getStorageInfoSync()
      let cleanedCount = 0
      
      storageInfo.keys.forEach(key => {
        if (key.startsWith('audio_file_')) {
          try {
            const fileInfo = wx.getStorageSync(key)
            if (fileInfo && fileInfo.timestamp && fileInfo.timestamp < expireTime) {
              wx.removeStorageSync(key)
              cleanedCount++
            }
          } catch (err) {
            // 清理失效的缓存键
            wx.removeStorageSync(key)
            cleanedCount++
          }
        }
      })
      
      if (cleanedCount > 0) {
        console.log(`🧹 清理了${cleanedCount}个过期音频缓存`)
      }
    } catch (err) {
      console.error('音频缓存清理失败:', err)
    }
  },

  // 音频预加载（可选）
  async preloadAudio() {
    try {
      const { wordList } = this.data
      if (wordList.length === 0) return
      
      // 预加载前3个单词的音频
      const preloadWords = wordList.slice(0, 3)
      
      for (const word of preloadWords) {
        const audioUrl = this.getAudioUrl(word.word)
        if (audioUrl) {
          // 创建临时音频对象测试连接
          const tempAudio = wx.createInnerAudioContext()
          tempAudio.src = audioUrl
          tempAudio.destroy()
        }
      }
      
      console.log(`🎵 预加载了${preloadWords.length}个单词的音频`)
    } catch (err) {
      console.error('音频预加载失败:', err)
    }
  },

  // 智能学习计划加载
  async loadTodayWords(count = 10) {
    wx.showLoading({
      title: '生成学习计划...'
    })
    
    try {
      // 从页面参数获取学习类型和配置
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const options = currentPage.options || {}
      
      const learningType = options.type || 'mixed'  // new, review, mixed
      const learningCount = parseInt(options.count) || count
      
      console.log(`🎯 生成${learningType}学习计划，数量：${learningCount}`)
      
      // 调用智能学习计划云函数
      const result = await wx.cloud.callFunction({
        name: 'vocabulary-integration',
        data: {
          action: 'get_smart_plan',
          totalCount: learningCount,
          newRatio: 1,
          reviewRatio: 3,
          type: learningType
        }
      })
      
      if (result.result.success && result.result.words && result.result.words.length > 0) {
        const wordList = result.result.words
        const plan = result.result.plan
        const stats = result.result.statistics
        
        console.log(`📊 学习计划: 新学${plan.newCount}个, 复习${plan.reviewCount}个, 总计${plan.totalCount}个`)
        console.log(`📈 词汇统计: 总库存${stats.totalAvailable}个, 可新学${stats.newWordsAvailable}个, 可复习${stats.reviewWordsAvailable}个`)
        
        // 显示学习计划信息
        let planInfo = ''
        if (learningType === 'new') {
          planInfo = `新学计划: ${plan.newCount}个词汇`
        } else if (learningType === 'review') {
          planInfo = `复习计划: ${plan.reviewCount}个词汇`
        } else {
          planInfo = `智能计划: 新学${plan.newCount} + 复习${plan.reviewCount}`
        }
        
        wx.showToast({
          title: planInfo,
          icon: 'success',
          duration: 2000
        })
        
        this.setData({
          wordList,
          currentWord: wordList[0] || {},
          currentIndex: 0,
          learningPlan: plan,
          learningStats: stats
        })

        // 存储到全局数据
        app.globalData.todayWords = wordList
        app.globalData.learningPlan = plan
        
        // 预加载音频
        this.preloadAudio()
        
      } else {
        // 词汇库为空，引导用户去解析
        console.log('❌ 词汇库为空或学习计划生成失败')
        wx.hideLoading()
        wx.showModal({
          title: '词汇库为空',
          content: result.result.error || '还没有解析过的词汇，请先去"日语解析"页面输入一些日语内容进行解析',
          confirmText: '去解析',
          cancelText: '了解',
          success: (res) => {
            if (res.confirm) {
              // 跳转到日语解析页面
              wx.navigateTo({
                url: '/packageB/pages/japanese-parser/japanese-parser'
              })
            }
          }
        })
        return
      }
      
    } catch (error) {
      console.error('❌ 生成学习计划失败:', error)
      wx.hideLoading()
      wx.showModal({
        title: '加载失败',
        content: '学习计划生成失败，请重试或检查网络连接',
        showCancel: false
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 播放音频
  async playAudio() {
    console.log('🎵 播放音频被点击')
    console.log('当前单词:', this.data.currentWord)
    
    const { currentWord, isPlaying } = this.data
    
    if (isPlaying) {
      console.log('⏸️ 停止播放')
      this.innerAudioContext.stop()
      return
    }
    
    if (!currentWord || !currentWord.word) {
      console.log('❌ 没有可播放的单词')
      return
    }
    
    // 检查音频缓存
    const cacheKey = `audio_file_${currentWord.word}_ja`
    const cachedFileManager = wx.getStorageSync(cacheKey)
    
    if (cachedFileManager) {
      console.log('✅ 使用缓存音频播放')
      this.setData({ isPlaying: true })
      this.innerAudioContext.src = cachedFileManager
      this.innerAudioContext.play()
      return
    }
    
    // 没有缓存，使用TTS并尝试保存
    const word = encodeURIComponent(currentWord.word)
    const ttsUrl = `https://fanyi.baidu.com/gettts?lan=jp&text=${word}&spd=3&source=web`
    
    console.log('🎵 播放TTS并尝试缓存:', currentWord.word)
    this.setData({ isPlaying: true })
    
    // 播放成功时保存到本地文件系统
    this.innerAudioContext.onCanplay(() => {
      console.log('📱 TTS准备就绪，保存音频缓存')
      wx.setStorageSync(cacheKey, ttsUrl) // 先保存URL作为缓存标记
    })
    
    this.innerAudioContext.onError((err) => {
      console.error('❌ TTS播放失败:', err)
      this.setData({ isPlaying: false })
      console.log('🔄 降级到云函数方案')
      this.playJapaneseAudio(currentWord)
    })
    
    this.innerAudioContext.src = ttsUrl
    this.innerAudioContext.play()
  },

  // 获取音频URL
  getAudioUrl(word) {
    if (!word) return null
    const encodedWord = encodeURIComponent(word)
    return `https://fanyi.baidu.com/gettts?lan=jp&text=${encodedWord}&spd=3&source=web`
  },

  // 播放日语音频（云函数方案）
  async playJapaneseAudio(word) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'tts-service',
        data: {
          text: word.word,
          language: 'ja'
        }
      })
      
      if (result.result && result.result.audioUrl) {
        this.innerAudioContext.src = result.result.audioUrl
        this.innerAudioContext.play()
      } else {
        wx.showToast({
          title: '音频生成失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('云函数音频播放失败:', error)
      wx.showToast({
        title: '音频播放失败',
        icon: 'none'
      })
    }
  },

  // 上一个单词
  prevWord() {
    const { currentIndex, wordList } = this.data
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      this.setData({
        currentIndex: newIndex,
        currentWord: wordList[newIndex],
        isPlaying: false
      })
      this.innerAudioContext.stop()
    }
  },

  // 下一个单词
  nextWord() {
    const { currentIndex, wordList } = this.data
    if (currentIndex < wordList.length - 1) {
      const newIndex = currentIndex + 1
      this.setData({
        currentIndex: newIndex,
        currentWord: wordList[newIndex],
        isPlaying: false
      })
      this.innerAudioContext.stop()
    }
  },

  // 切换例句显示
  toggleExample() {
    this.setData({
      showExample: !this.data.showExample
    })
  },

  // 添加到生词本
  addToWordbook() {
    const { currentWord } = this.data
    if (!currentWord || !currentWord.word) {
      return
    }

    // 这里可以调用云函数或直接操作数据库
    wx.showToast({
      title: '已添加到生词本',
      icon: 'success'
    })
    
    this.setData({
      inWordbook: true
    })
  },

  // 标记掌握状态
  markStatus(e) {
    const status = e.currentTarget.dataset.status
    const { currentWord, currentIndex, learningRecord } = this.data
    
    // 记录学习状态
    learningRecord[currentWord.id] = status
    this.setData({ learningRecord })
    
    // 更新统计
    this.updateLearningStats(status)
    
    // 自动切换到下一个单词
    if (currentIndex < this.data.wordList.length - 1) {
      setTimeout(() => {
        this.nextWord()
      }, 500)
    } else {
      // 完成所有单词学习
      this.showLearningComplete()
    }
  },

  // 更新学习统计
  updateLearningStats(status) {
    const { masteredCount, fuzzyCount, forgotCount } = this.data
    
    switch (status) {
      case 'mastered':
        this.setData({ masteredCount: masteredCount + 1 })
        break
      case 'fuzzy':
        this.setData({ fuzzyCount: fuzzyCount + 1 })
        break
      case 'forgot':
        this.setData({ forgotCount: forgotCount + 1 })
        break
    }
  },

  // 显示学习完成
  showLearningComplete() {
    this.setData({
      showComplete: true
    })
  },

  // 学习更多
  learnMore() {
    const { selectedCount } = this.data
    this.setData({
      showComplete: false,
      masteredCount: 0,
      fuzzyCount: 0,
      forgotCount: 0,
      learningRecord: {}
    })
    this.loadTodayWords(selectedCount)
  },

  // 结束学习
  goBack() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 跳转到日语解析页面
  goToParser() {
    wx.navigateTo({
      url: '/packageB/pages/japanese-parser/japanese-parser'
    })
  },

  onUnload() {
    this.isPageUnloaded = true
    
    // 清理定时器
    this.timers.forEach(timer => {
      clearTimeout(timer)
    })
    this.timers = []
    
    // 销毁音频上下文
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '语伴君 - 智能日语学习',
      path: '/pages/learn/learn'
    }
  }
})