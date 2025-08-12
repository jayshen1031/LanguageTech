const app = getApp()
// const plugin = requirePlugin("WechatSI") // 暂时注释掉插件
const audioMCP = require('../../utils/audioMCP')

// 初始化云环境
wx.cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

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
    isPlaying: false // 是否正在播放音频
  },
  
  // 页面实例属性
  timers: [], // 存储所有定时器
  isPageUnloaded: false, // 页面是否已卸载

  onLoad() {
    // 检查MCP服务（可选）
    // this.checkMCPService()
    
    // 临时跳过MCP，直接使用云函数或读音显示
    this.setData({ mcpAvailable: false })
    console.log('⚠️ 跳过MCP服务，使用备用方案')
    
    // 不立即加载单词，等待用户选择数量
    // this.loadTodayWords()
    
    // 初始化音频上下文
    this.initAudioContext()
  },

  // 选择学习数量
  selectWordCount(e) {
    const count = parseInt(e.currentTarget.dataset.count)
    this.setData({
      selectedCount: count,
      showSetup: false
    })
    
    // 加载指定数量的单词
    this.loadTodayWords(count)
  },
  
  // 初始化音频上下文
  initAudioContext() {
    // 创建全局音频上下文
    this.innerAudioContext = wx.createInnerAudioContext()
    this.innerAudioContext.autoplay = false
    
    // 设置音频事件监听
    this.innerAudioContext.onPlay(() => {
      console.log('✅ 音频开始播放')
    })
    
    this.innerAudioContext.onError((err) => {
      console.error('❌ 音频播放错误:', err)
      this.setData({ isPlaying: false })
      // 播放错误时显示读音
      this.showReadingInfo()
    })
    
    this.innerAudioContext.onEnded(() => {
      console.log('✅ 音频播放结束')
      this.setData({ isPlaying: false })
    })
  },
  
  onUnload() {
    // 页面卸载时销毁音频上下文
    if (this.innerAudioContext) {
      try {
        this.innerAudioContext.stop()
        this.innerAudioContext.destroy()
      } catch (e) {
        console.warn('销毁音频上下文失败:', e)
      }
    }
    
    // 清理所有定时器
    if (this.timers) {
      this.timers.forEach(timer => clearTimeout(timer))
      this.timers = []
    }
    
    // 标记页面已卸载
    this.isPageUnloaded = true
  },
  
  // 检查MCP服务是否可用
  async checkMCPService() {
    console.log('🔍 开始检查MCP服务...')
    try {
      const isAvailable = await audioMCP.checkHealth()
      console.log('🔧 MCP服务检查结果:', isAvailable)
      this.setData({ mcpAvailable: isAvailable })
      
      if (isAvailable) {
        console.log('✅ MCP音频服务可用')
        // 预加载音频
        this.preloadAudios()
      } else {
        console.log('❌ MCP音频服务不可用')
      }
    } catch (err) {
      console.error('❌ MCP服务检查失败:', err)
      this.setData({ mcpAvailable: false })
    }
  },
  
  // 预加载音频
  async preloadAudios() {
    const { wordList } = this.data
    if (!wordList.length) return
    
    try {
      // 批量生成前3个单词的音频
      const wordsToPreload = wordList.slice(0, 3).map(w => w.word)
      await audioMCP.batchGenerateAudio(wordsToPreload, 'ja')
    } catch (err) {
      console.error('音频预加载失败:', err)
    }
  },

  async loadTodayWords(count = 10) {
    wx.showLoading({
      title: '加载词汇中...'
    })
    
    try {
      // 先检查数据库是否有数据
      const countRes = await db.collection('n2_vocabulary').count()
      console.log('词汇数量:', countRes.total)
      
      if (countRes.total === 0) {
        // 如果没有数据，询问是否初始化
        wx.hideLoading()
        wx.showModal({
          title: '词汇库为空',
          content: '请选择导入方式',
          confirmText: '快速初始化',
          cancelText: '快速初始化',
          success: (res) => {
            if (res.confirm) {
              // 使用快速初始化
              this.initVocabulary()
            } else {
              // 使用快速初始化
              this.initVocabulary()
            }
          }
        })
        return
      }
      
      // 优先获取最近添加的解析词汇（取一半）
      const historyCount = Math.floor(count / 2)
      let res = await db.collection('n2_vocabulary')
        .where({
          source: 'history'
        })
        .orderBy('createTime', 'desc')
        .limit(historyCount)
        .get()
      
      const historyWords = res.data || []
      
      // 如果解析词汇不足，补充其他词汇
      if (historyWords.length < count) {
        const otherRes = await db.collection('n2_vocabulary')
          .where({
            source: db.command.neq('history')
          })
          .orderBy('random', 'asc')
          .limit(count - historyWords.length)
          .get()
        
        res.data = [...historyWords, ...(otherRes.data || [])]
      } else {
        res.data = historyWords.slice(0, count)
      }
      
      if (res.data && res.data.length > 0) {
        const wordList = res.data
        
        // 调试：输出词汇数据结构
        console.log('📚 加载的词汇列表：', wordList)
        if (wordList[0]) {
          console.log('📖 当前词汇详情：', wordList[0])
          console.log('🔍 语法信息：', {
            grammar: wordList[0].grammar,
            analysis: wordList[0].analysis,
            structure: wordList[0].structure,
            examples: wordList[0].examples
          })
        }
        
        this.setData({
          wordList,
          currentWord: wordList[0] || {},
          currentIndex: 0
        })

        // 存储到全局数据
        app.globalData.todayWords = wordList
        
        console.log(`从云数据库加载了${wordList.length}个N2词汇`)
      } else {
        // 如果云数据库没有数据，提示导入
        console.log('云数据库暂无数据')
        wx.showModal({
          title: '词汇库为空',
          content: '当前没有N2词汇数据，是否立即导入？',
          confirmText: '批量导入',
          cancelText: '使用默认',
          success: (res) => {
            if (res.confirm) {
              // 跳转到导入页面
              wx.navigateTo({
                url: '/pages/admin/import-n2'
              })
            } else {
              // 使用默认词汇
              this.loadDefaultWords()
            }
          }
        })
      }
      
    } catch (error) {
      console.error('加载词汇失败:', error)
      // 降级到默认词汇
      this.loadDefaultWords()
    } finally {
      wx.hideLoading()
    }
  },
  
  // 初始化词汇库
  async initVocabulary() {
    wx.showLoading({
      title: '初始化中...',
      mask: true
    })
    
    try {
      // 方案1：先尝试云函数
      console.log('尝试使用云函数初始化...')
      
      try {
        const res = await wx.cloud.callFunction({
          name: 'init-vocabulary',
          data: {
            action: 'init'
          }
        })
        
        console.log('云函数返回:', res.result)
        
        if (res.result && res.result.success && res.result.total > 0) {
          wx.showToast({
            title: `成功导入${res.result.total}个词汇`,
            icon: 'success'
          })
          const timer = setTimeout(() => {
            if (!this.isPageUnloaded) {
              this.loadTodayWords()
            }
          }, 1500)
          this.timers.push(timer)
          return
        }
      } catch (cloudError) {
        console.error('云函数调用失败:', cloudError)
      }
      
      // 方案2：本地直接插入
      console.log('使用本地方式初始化...')
      await this.initVocabularyLocal()
      
    } catch (error) {
      console.error('初始化失败:', error)
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      })
      this.loadDefaultWords()
    } finally {
      wx.hideLoading()
    }
  },
  
  // 本地初始化词汇
  async initVocabularyLocal() {
    const n2Words = [
      {
        word: '影響',
        kana: 'えいきょう',
        romaji: 'eikyou',
        meaning: '影响',
        type: '名词',
        examples: [
          { jp: '悪い影響を与える。', cn: '产生不良影响。' },
          { jp: '影響を受ける。', cn: '受到影响。' }
        ],
        level: 'N2',
        tags: ['因果']
      },
      {
        word: '解決',
        kana: 'かいけつ',
        romaji: 'kaiketsu',
        meaning: '解决',
        type: '名词',
        examples: [
          { jp: '問題を解決する。', cn: '解决问题。' },
          { jp: '円満解決。', cn: '圆满解决。' }
        ],
        level: 'N2',
        tags: ['处理']
      },
      {
        word: '環境',
        kana: 'かんきょう',
        romaji: 'kankyou',
        meaning: '环境',
        type: '名词',
        examples: [
          { jp: '環境問題。', cn: '环境问题。' },
          { jp: '職場環境。', cn: '工作环境。' }
        ],
        level: 'N2',
        tags: ['社会']
      },
      {
        word: '努力',
        kana: 'どりょく',
        romaji: 'doryoku',
        meaning: '努力',
        type: '名词',
        examples: [
          { jp: '努力する。', cn: '努力。' },
          { jp: '努力の成果。', cn: '努力的成果。' }
        ],
        level: 'N2',
        tags: ['态度']
      },
      {
        word: '判断',
        kana: 'はんだん',
        romaji: 'handan',
        meaning: '判断',
        type: '名词',
        examples: [
          { jp: '正しい判断。', cn: '正确的判断。' },
          { jp: '判断力。', cn: '判断力。' }
        ],
        level: 'N2',
        tags: ['思考']
      },
      {
        word: '慣れる',
        kana: 'なれる',
        romaji: 'nareru',
        meaning: '习惯，熟悉',
        type: '动词',
        examples: [
          { jp: '仕事に慣れる。', cn: '熟悉工作。' },
          { jp: '生活に慣れる。', cn: '习惯生活。' }
        ],
        level: 'N2',
        tags: ['适应']
      },
      {
        word: '案外',
        kana: 'あんがい',
        romaji: 'angai',
        meaning: '意外地',
        type: '副词',
        examples: [
          { jp: '案外簡単だった。', cn: '意外地简单。' },
          { jp: '案外早く着いた。', cn: '意外地早到了。' }
        ],
        level: 'N2',
        tags: ['程度']
      },
      {
        word: '明らか',
        kana: 'あきらか',
        romaji: 'akiraka',
        meaning: '明显的',
        type: '形容动词',
        examples: [
          { jp: '事実は明らかだ。', cn: '事实很明显。' },
          { jp: '明らかな間違い。', cn: '明显的错误。' }
        ],
        level: 'N2',
        tags: ['逻辑']
      },
      {
        word: '営業',
        kana: 'えいぎょう',
        romaji: 'eigyou',
        meaning: '营业，经营',
        type: '名词',
        examples: [
          { jp: '営業時間。', cn: '营业时间。' },
          { jp: '営業部。', cn: '营业部。' }
        ],
        level: 'N2',
        tags: ['商务']
      },
      {
        word: '完全',
        kana: 'かんぜん',
        romaji: 'kanzen',
        meaning: '完全的',
        type: '形容动词',
        examples: [
          { jp: '完全に理解する。', cn: '完全理解。' },
          { jp: '完全な失敗。', cn: '彻底的失败。' }
        ],
        level: 'N2',
        tags: ['程度']
      }
    ]
    
    let successCount = 0
    
    for (const word of n2Words) {
      try {
        await db.collection('n2_vocabulary').add({
          data: {
            ...word,
            random: Math.random(),
            createTime: new Date(),
            updateTime: new Date()
          }
        })
        successCount++
        console.log(`插入成功: ${word.word}`)
      } catch (err) {
        console.error(`插入失败 ${word.word}:`, err)
      }
    }
    
    if (successCount > 0) {
      wx.showToast({
        title: `成功导入${successCount}个词汇`,
        icon: 'success'
      })
      
      const timer = setTimeout(() => {
        if (!this.isPageUnloaded) {
          this.loadTodayWords()
        }
      }, 1500)
      this.timers.push(timer)
    } else {
      throw new Error('没有成功导入任何词汇')
    }
  },
  
  // 加载默认词汇（备用方案）
  loadDefaultWords() {
    const defaultWords = [
      {
        id: 'default_001',
        word: '影響',
        kana: 'えいきょう',
        romaji: 'eikyou',
        meaning: '影响',
        type: '名词',
        level: 'N2',
        examples: [
          { jp: '悪い影響を与える。', cn: '产生不良影响。' },
          { jp: '影響を受ける。', cn: '受到影响。' }
        ],
        tags: ['因果']
      },
      {
        id: 'default_002',
        word: '解決',
        kana: 'かいけつ',
        romaji: 'kaiketsu',
        meaning: '解决',
        type: '名词',
        level: 'N2',
        examples: [
          { jp: '問題を解決する。', cn: '解决问题。' },
          { jp: '円満解決。', cn: '圆满解决。' }
        ],
        tags: ['处理']
      },
      {
        id: 'default_003',
        word: '環境',
        kana: 'かんきょう',
        romaji: 'kankyou',
        meaning: '环境',
        type: '名词',
        level: 'N2',
        examples: [
          { jp: '環境問題。', cn: '环境问题。' },
          { jp: '職場環境。', cn: '工作环境。' }
        ],
        tags: ['社会']
      },
      {
        id: 'default_004',
        word: '努力',
        kana: 'どりょく',
        romaji: 'doryoku',
        meaning: '努力',
        type: '名词',
        level: 'N2',
        examples: [
          { jp: '努力する。', cn: '努力。' },
          { jp: '努力の成果。', cn: '努力的成果。' }
        ],
        tags: ['态度']
      },
      {
        id: 'default_005',
        word: '判断',
        kana: 'はんだん',
        romaji: 'handan',
        meaning: '判断',
        type: '名词',
        level: 'N2',
        examples: [
          { jp: '正しい判断。', cn: '正确的判断。' },
          { jp: '判断力。', cn: '判断力。' }
        ],
        tags: ['思考']
      }
    ]
    
    this.setData({
      wordList: defaultWords,
      currentWord: defaultWords[0],
      currentIndex: 0
    })
    
    app.globalData.todayWords = defaultWords
  },

  // 播放音频
  async playAudio() {
    console.log('🎵 播放音频被点击')
    console.log('当前单词:', this.data.currentWord)
    
    const { currentWord, isPlaying } = this.data
    
    if (isPlaying) {
      console.log('⏸️ 正在播放中，跳过')
      return
    }
    
    this.setData({ isPlaying: true })
    
    // 直接播放音频
    this.playJapaneseAudio(currentWord)
  },
  
  // 单词被点击时自动播放
  onWordTap() {
    console.log('📱 单词被点击，自动播放')
    this.playAudio()
  },
  
  // 播放日语音频（使用云函数）
  async playJapaneseAudio(word) {
    console.log('🎌 播放日语:', word.word)
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' })
    
    // 显示读音
    wx.showToast({
      title: word.kana,
      icon: 'none',
      duration: 2000
    })
    
    try {
      // 方案1: 尝试使用百度TTS（国内访问更快）
      const baiduUrl = `https://fanyi.baidu.com/gettts?lan=jp&text=${encodeURIComponent(word.word)}&spd=3&source=web`
      console.log('尝试百度TTS:', baiduUrl)
      
      // 使用全局音频上下文播放
      if (this.innerAudioContext) {
        this.innerAudioContext.src = baiduUrl
        this.innerAudioContext.play()
        return
      }
      
      // 方案2: 调用云函数获取音频URL
      const res = await wx.cloud.callFunction({
        name: 'tts-service',
        data: {
          text: word.word,
          lang: 'ja'
        }
      })
      
      console.log('云函数返回:', res.result)
      
      if (res.result && res.result.success && res.result.audioUrl) {
        this.playAudioUrl(res.result.audioUrl, word)
      } else {
        console.log('云函数无音频，使用本地TTS')
        this.testSimpleAudio(word)
      }
      
    } catch (error) {
      console.error('云函数调用失败:', error)
      // 降级到本地TTS
      this.testSimpleAudio(word)
    }
  },
  
  // 播放音频URL
  playAudioUrl(url, word) {
    console.log('📻 播放音频URL:', url)
    
    const audio = wx.createInnerAudioContext()
    audio.src = url
    
    audio.onPlay(() => {
      console.log('✅ 开始播放')
    })
    
    audio.onError((err) => {
      console.error('❌ 播放失败:', err)
      // 如果失败，尝试备选方案
      this.testSimpleAudio(word)
    })
    
    audio.onEnded(() => {
      console.log('✅ 播放结束')
      this.setData({ isPlaying: false })
    })
    
    audio.play()
  },
  
  // 本地TTS方案
  testSimpleAudio(word) {
    console.log('🎵 使用简单音频方案')
    
    // 方案1：使用系统提示音代替
    wx.playBackgroundAudio({
      dataUrl: '', // 空URL会播放系统默认音
      title: word.kana,
      success: () => {
        console.log('✅ 播放系统音成功')
      },
      fail: (err) => {
        console.log('系统音播放失败，使用震动提示')
        // 使用特殊的震动模式表示不同的音调
        this.playVibratePattern(word)
      },
      complete: () => {
        this.setData({ isPlaying: false })
      }
    })
    
    // 同时显示发音指导
    this.showPronunciationGuide(word)
  },
  
  // 震动模式（模拟音调）
  playVibratePattern(word) {
    // 根据假名创建不同的震动模式
    const patterns = {
      'た': [100, 50, 100], // 短-停-短
      'べ': [200], // 长
      'る': [50, 50, 50] // 短短短
    }
    
    // 逐字震动
    word.kana.split('').forEach((char, index) => {
      const timer = setTimeout(() => {
        if (!this.isPageUnloaded) {
          wx.vibrateShort({ type: index === 0 ? 'heavy' : 'light' })
        }
      }, index * 300)
      this.timers.push(timer)
    })
  },
  
  // 显示发音指导
  showPronunciationGuide(word) {
    // 创建发音指导文本
    const guides = {
      '食べる': 'ta-be-ru (像"他-杯-路")',
      '学校': 'ga-kkou (像"嘎-扣")',
      '本': 'hon (像"红")',
      '友達': 'to-mo-da-chi (像"拖-摸-达-其")',
      '時間': 'ji-kan (像"机-刊")'
    }
    
    const guide = guides[word.word] || word.romaji
    
    wx.showToast({
      title: guide,
      icon: 'none',
      duration: 3000
    })
  },
  
  // 使用插件播放（暂时禁用）
  playWithPlugin() {
    // 插件需要授权，暂时跳过，直接使用云函数
    this.playWithCloudFunction()
  },
  
  // 使用云函数播放音频
  playWithCloudFunction() {
    const { currentWord } = this.data
    
    console.log('尝试使用云函数TTS')
    
    wx.cloud.callFunction({
      name: 'tts-service',
      data: {
        text: currentWord.word,
        lang: 'ja'
      },
      success: (res) => {
        console.log('云函数调用成功:', res.result)
        
        if (res.result.success && res.result.audioUrl) {
          // 成功获取音频URL
          this.playAudioFile(res.result.audioUrl)
          
          // 显示音频来源信息
          if (res.result.source === 'preset') {
            console.log('使用预设音频')
          } else if (res.result.source === 'database_cache') {
            console.log('使用缓存音频')
          } else if (res.result.source === 'generated') {
            console.log('生成新音频')
          }
        } else {
          // 云函数执行成功但没有音频，显示读音信息
          this.setData({ isPlaying: false })
          if (res.result.readingInfo) {
            this.showReadingInfo(res.result.readingInfo)
          } else {
            this.showReadingInfo()
          }
        }
      },
      fail: (err) => {
        console.error('云函数调用失败:', err)
        this.setData({ isPlaying: false })
        
        // 云函数调用失败，显示错误信息
        wx.showToast({
          title: '音频服务暂不可用',
          icon: 'none',
          duration: 2000
        })
        
        // 显示读音作为备选方案
        this.showReadingInfo()
      }
    })
  },
  
  // 播放音频文件
  playAudioFile(src) {
    if (this.isPageUnloaded) return
    
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = src
    
    innerAudioContext.onPlay(() => {
      console.log('开始播放')
      if (!this.isPageUnloaded) {
        wx.showToast({
          title: '播放中',
          icon: 'none',
          duration: 1500
        })
      }
    })
    
    innerAudioContext.onError((res) => {
      console.error('播放错误:', res)
      if (!this.isPageUnloaded) {
        this.showReadingInfo()
      }
      try {
        innerAudioContext.destroy()
      } catch (e) {}
    })
    
    innerAudioContext.onEnded(() => {
      console.log('播放结束')
      try {
        innerAudioContext.destroy()
      } catch (e) {}
      if (!this.isPageUnloaded) {
        this.setData({ isPlaying: false })
      }
    })
    
    innerAudioContext.play()
  },
  
  // 显示读音信息（备用方案）
  showReadingInfo() {
    const { currentWord } = this.data
    
    // 使用震动反馈
    wx.vibrateShort({
      type: 'light'
    })
    
    // 显示读音信息
    wx.showModal({
      title: currentWord.word,
      content: `读音：${currentWord.kana}\n罗马音：${currentWord.romaji}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },
  
  // 直接播放音频
  async directPlayAudio(word) {
    console.log('🎵 === 开始播放音频流程 ===')
    console.log('单词:', word.word)
    console.log('假名:', word.kana)
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' })
    
    // 显示正在播放的提示
    wx.showToast({
      title: word.kana,
      icon: 'none',
      duration: 2000
    })
    
    try {
      console.log('📡 步骤1: 调用云函数...')
      // 方案1：调用云函数获取音频
      const res = await wx.cloud.callFunction({
        name: 'tts-service',
        data: {
          text: word.word,
          lang: 'ja'
        }
      })
      
      console.log('📡 云函数返回:', res)
      
      let audioUrl = null
      
      if (res.result && res.result.success && res.result.audioUrl) {
        console.log('✅ 云函数返回音频URL:', res.result.audioUrl)
        audioUrl = res.result.audioUrl
      } else {
        // 使用备用方案
        console.log('云函数无音频，显示读音')
        this.showReadingInfo()
        this.setData({ isPlaying: false })
        return
      }
      
      // 创建音频上下文并播放
      const innerAudioContext = wx.createInnerAudioContext()
      innerAudioContext.src = audioUrl
      
      innerAudioContext.onPlay(() => {
        console.log('✅ 开始播放')
      })
      
      innerAudioContext.onError((err) => {
        console.error('❌ 播放失败:', err)
        // 播放失败时显示读音
        this.showReadingInfo()
        this.setData({ isPlaying: false })
      })
      
      innerAudioContext.onEnded(() => {
        console.log('✅ 播放结束')
        this.setData({ isPlaying: false })
        innerAudioContext.destroy()
      })
      
      // 开始播放
      innerAudioContext.play()
      
    } catch (error) {
      console.error('播放出错:', error)
      
      // 云函数调用失败，使用本地模拟
      this.playLocalSimulation(word)
    }
  },
  
  // 本地模拟播放（使用系统声音）
  playLocalSimulation(word) {
    console.log('📢 使用本地模拟播放')
    
    // 播放系统提示音
    wx.playBackgroundAudio({
      dataUrl: '', // 空URL会播放默认提示音
      title: word.kana,
      fail: () => {
        // 如果背景音频也失败，显示读音
        this.showReadingInfo()
      },
      complete: () => {
        this.setData({ isPlaying: false })
      }
    })
    
    // 或者使用震动模拟节奏
    const pattern = [100, 100, 100, 200, 200] // 震动模式
    pattern.forEach((duration, index) => {
      const timer = setTimeout(() => {
        if (!this.isPageUnloaded) {
          wx.vibrateShort({ type: index % 2 === 0 ? 'heavy' : 'light' })
        }
      }, duration * index)
      this.timers.push(timer)
    })
  },
  
  // 显示读音信息并播放音频
  showReadingInfoWithAudio(word) {
    console.log('📝 显示读音信息:', word)
    
    // 使用震动反馈
    wx.vibrateShort({
      type: 'light'
    })
    
    // 创建一个更美观的读音展示
    const content = [
      `📖 ${word.word}`,
      '',
      `🗣️ 读音：${word.kana}`,
      `🔤 罗马音：${word.romaji}`,
      `💭 意思：${word.meaning}`,
      '',
      '💡 提示：点击"朗读"可以听发音'
    ].join('\n')
    
    wx.showModal({
      title: '单词详情',
      content: content,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '朗读',
      success: (res) => {
        if (res.confirm) {
          // 用户点击了朗读
          this.tryToSpeak(word)
        }
        this.setData({ isPlaying: false })
      }
    })
  },
  
  // 尝试朗读
  async tryToSpeak(word) {
    console.log('🔊 尝试朗读:', word.word)
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' })
    
    // 显示加载提示
    wx.showLoading({
      title: '正在生成语音...'
    })
    
    try {
      // 先尝试直接使用百度TTS（国内访问快）
      // 注意：需要在小程序后台配置域名
      const baiduTTSUrl = `https://fanyi.baidu.com/gettts?lan=jp&text=${encodeURIComponent(word.word)}&spd=3&source=web`
      
      console.log('尝试百度TTS:', baiduTTSUrl)
      wx.hideLoading()
      
      // 直接播放
      this.playTTSAudio(baiduTTSUrl, word)
      return
      
      // 备用方案：调用云函数获取TTS
      /*
      const res = await wx.cloud.callFunction({
        name: 'tts-service',
        data: {
          text: word.word,
          lang: 'ja'
        }
      })
      */
      
      
    } catch (error) {
      console.error('TTS请求失败:', error)
      wx.hideLoading()
      
      // 使用备用TTS方案
      this.playBackupTTS(word)
    }
  },
  
  // 播放TTS音频
  playTTSAudio(audioUrl, word) {
    console.log('🎵 播放TTS音频:', audioUrl)
    
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = audioUrl
    
    innerAudioContext.onCanplay(() => {
      console.log('音频可以播放')
    })
    
    innerAudioContext.onPlay(() => {
      console.log('开始播放TTS')
      wx.showToast({
        title: word.kana,
        icon: 'none',
        duration: 2000
      })
    })
    
    innerAudioContext.onError((err) => {
      console.error('TTS播放失败:', err)
      // 播放失败，尝试备用方案
      this.playBackupTTS(word)
    })
    
    innerAudioContext.onEnded(() => {
      console.log('TTS播放结束')
      innerAudioContext.destroy()
    })
    
    // 开始播放
    innerAudioContext.play()
  },
  
  // 备用TTS方案
  playBackupTTS(word) {
    console.log('🔄 使用备用TTS方案')
    
    // 使用有道词典的TTS（仅用于开发测试）
    // 注意：生产环境需要使用正规API
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.word)}&type=2`
    
    // 由于跨域限制，可能无法直接播放
    // 显示提示信息
    wx.showModal({
      title: '语音朗读',
      content: `${word.word}\n${word.kana}\n\n暂时无法播放语音，请参考罗马音：${word.romaji}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  
  // 切换例句显示
  toggleExample() {
    this.setData({
      showExample: !this.data.showExample
    })
  },

  // 添加到生词本
  addToWordbook() {
    const { inWordbook } = this.data
    
    if (!inWordbook) {
      // TODO: 保存到生词本
      wx.showToast({
        title: '已添加到生词本',
        icon: 'success'
      })
      
      this.setData({
        inWordbook: true
      })
    }
  },

  // 上一个单词
  prevWord() {
    const { currentIndex, wordList } = this.data
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      const prevWord = wordList[prevIndex]
      
      this.setData({
        currentIndex: prevIndex,
        currentWord: prevWord,
        showExample: true,
        inWordbook: false
      })
    }
  },

  // 下一个单词
  nextWord() {
    const { currentIndex, wordList } = this.data
    if (currentIndex < wordList.length - 1) {
      const nextIndex = currentIndex + 1
      const nextWord = wordList[nextIndex]
      
      this.setData({
        currentIndex: nextIndex,
        currentWord: nextWord,
        showExample: true,
        inWordbook: false
      })
    }
  },

  // 标记掌握状态
  markStatus(e) {
    const status = e.currentTarget.dataset.status
    const { currentIndex, currentWord, learningRecord } = this.data
    
    // 记录当前单词的学习状态
    learningRecord[currentWord.id] = status
    
    // 更新记录
    this.setData({ learningRecord })
    
    // 显示反馈
    wx.showToast({
      title: status === 'mastered' ? '已掌握' : status === 'fuzzy' ? '需复习' : '需加强',
      icon: 'none',
      duration: 1000
    })
    
    // 判断是否是最后一个单词
    if (currentIndex < this.data.wordList.length - 1) {
      // 延迟进入下一个单词
      setTimeout(() => {
        this.nextWord()
      }, 800)
    } else {
      // 学习完成，统计结果
      setTimeout(() => {
        this.showCompleteResult()
      }, 800)
    }
  },

  // 显示完成结果
  showCompleteResult() {
    const { learningRecord } = this.data
    let masteredCount = 0
    let fuzzyCount = 0
    let forgotCount = 0
    
    // 统计各状态数量
    Object.values(learningRecord).forEach(status => {
      if (status === 'mastered') masteredCount++
      else if (status === 'fuzzy') fuzzyCount++
      else if (status === 'forgot') forgotCount++
    })
    
    this.setData({
      showComplete: true,
      masteredCount,
      fuzzyCount,
      forgotCount
    })
    
    // TODO: 保存学习记录到数据库
  },

  
  
  // 返回首页
  goBack() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})