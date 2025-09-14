const app = getApp()
// const plugin = requirePlugin("WechatSI") // 暂时注释掉插件
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
    isPlaying: false // 是否正在播放音频
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
  
  
  // 清理过期的音频缓存
  cleanExpiredAudioCache() {
    try {
      console.log('🧹 清理过期音频缓存...')
      
      const storage = wx.getStorageInfoSync()
      const keys = storage.keys
      
      let cleanedCount = 0
      
      // 找到所有音频缓存key
      const audioCacheKeys = keys.filter(key => key.startsWith('audio_'))
      
      // 限制最多保留30个音频缓存
      if (audioCacheKeys.length > 30) {
        // 删除最老的缓存（简单按key排序）
        const toDelete = audioCacheKeys.sort().slice(0, audioCacheKeys.length - 30)
        
        toDelete.forEach(key => {
          wx.removeStorageSync(key)
          cleanedCount++
        })
        
        console.log(`🗑️ 清理了${cleanedCount}个过期音频缓存`)
      }
      
    } catch (error) {
      console.error('❌ 清理缓存失败:', error)
    }
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
          content: '需要先导入词汇数据',
          confirmText: '快速导入',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              // 使用新的批量导入云函数
              this.batchImportVocabulary()
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
        let wordList = res.data
        
        // 为所有词汇补充解析历史中的例句
        console.log('🔍 为所有词汇补充解析历史例句...')
        for (let word of wordList) {
          // 如果词汇有sourceRecordId，直接从对应记录获取例句
          if (word.sourceRecordId && (!word.examples || word.examples.length === 0)) {
            console.log(`🎯 词汇 "${word.word}" 有出处记录，直接获取: ${word.sourceRecordId}`)
            const sourceExamples = await this.getExamplesFromSourceRecord(word.sourceRecordId, word.word)
            if (sourceExamples.length > 0) {
              word.examples = sourceExamples
              console.log(`✅ 从出处记录为词汇 "${word.word}" 添加了${sourceExamples.length}个例句`)
            }
          }
          
          // 如果仍然没有例句，再从解析历史搜索
          if (!word.examples || word.examples.length === 0) {
            const examplesFromHistory = await this.getExamplesFromHistory(word.word)
            
            if (examplesFromHistory.length > 0) {
              word.examples = examplesFromHistory.slice(0, 3)
              console.log(`✅ 从解析历史为词汇 "${word.word}" 添加了${word.examples.length}个例句`)
            } else {
              word.examples = []
              console.log(`⚠️ 词汇 "${word.word}" 暂无例句，建议通过日语解析添加语境`)
            }
          }
        }
        
        // 调试：输出词汇数据结构
        console.log('📚 加载的词汇列表：', wordList)
        if (wordList[0]) {
          console.log('📖 当前词汇详情：', wordList[0])
          console.log('🔍 例句信息：', wordList[0].examples)
          console.log('🔍 出处信息：', {
            source: wordList[0].source,
            sourceRecordId: wordList[0].sourceRecordId,
            primarySource: wordList[0].primarySource,
            sources: wordList[0].sources
          })
        }
        
        // 统计有例句的词汇数量
        const wordsWithExamples = wordList.filter(w => w.examples && w.examples.length > 0).length
        const historyWords = wordList.filter(w => w.source === 'history').length
        console.log(`📊 统计：${wordsWithExamples}/${wordList.length} 个词汇有例句，${historyWords} 个来自解析历史`)
        
        // 手机端调试：显示统计信息
        wx.showToast({
          title: `${wordsWithExamples}/${wordList.length}词汇有例句`,
          icon: 'none',
          duration: 3000
        })
        
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
                url: '/packageAdmin/pages/admin/import-n2'
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
  
  // 从特定记录ID获取例句
  async getExamplesFromSourceRecord(recordId, word) {
    try {
      const db = wx.cloud.database()
      
      console.log(`🎯 从记录ID获取例句: ${recordId} -> ${word}`)
      
      // 根据记录ID查找特定解析记录
      const res = await db.collection('japanese_parser_history')
        .doc(recordId)
        .get()
      
      if (res.data && res.data.sentences) {
        const examples = []
        
        // 查找包含目标词汇的句子
        for (const sentence of res.data.sentences) {
          if (sentence.originalText && sentence.originalText.includes(word)) {
            examples.push({
              jp: sentence.originalText,
              cn: sentence.translation || '',
              source: res.data.articleTitle || '解析记录',
              romaji: sentence.romaji || '',
              structure: sentence.structure || '',
              analysis: sentence.analysis || '',
              grammar: sentence.grammar || ''
            })
          }
        }
        
        console.log(`✅ 从记录ID为词汇 "${word}" 找到${examples.length}个例句`)
        return examples
      }
      
      console.log(`❌ 记录ID ${recordId} 未找到或无句子数据`)
      return []
      
    } catch (error) {
      console.error('从记录ID获取例句失败:', error)
      return []
    }
  },
  
  // 从解析历史中获取例句
  async getExamplesFromHistory(word) {
    try {
      const db = wx.cloud.database()
      
      console.log(`🔍 搜索词汇 "${word}" 的解析历史例句...`)
      
      // 查找包含此词汇的解析记录
      const res = await db.collection('japanese_parser_history')
        .where({
          _openid: db.command.eq(db.command.openid())
        })
        .orderBy('createTime', 'desc')
        .limit(20)  // 增加查找范围
        .get()
      
      console.log(`📚 找到${res.data.length}条解析记录`)
      
      const examples = []
      
      // 遍历解析记录，查找包含目标词汇的句子
      for (const record of res.data) {
        if (record.sentences && Array.isArray(record.sentences)) {
          for (const sentence of record.sentences) {
            // 检查句子中是否包含目标词汇（支持多种匹配方式）
            if (sentence.originalText) {
              const originalText = sentence.originalText
              const vocabulary = sentence.vocabulary || []
              
              // 方式1：直接文本包含
              const directMatch = originalText.includes(word)
              
              // 方式2：词汇表匹配
              const vocabMatch = vocabulary.some(v => 
                v.japanese === word || v.romaji === word || v.chinese === word
              )
              
              if (directMatch || vocabMatch) {
                examples.push({
                  jp: originalText,
                  cn: sentence.translation || '',
                  source: record.articleTitle || '解析记录',
                  romaji: sentence.romaji || '',
                  structure: sentence.structure || '',
                  analysis: sentence.analysis || '',
                  grammar: sentence.grammar || ''
                })
                
                console.log(`✅ 为词汇 "${word}" 找到例句: ${originalText}`)
                
                // 每个词汇最多3个例句
                if (examples.length >= 3) {
                  break
                }
              }
            }
          }
          
          if (examples.length >= 3) {
            break
          }
        }
      }
      
      return examples
    } catch (error) {
      console.error('获取例句失败:', error)
      return []
    }
  },
  
  // 批量导入词汇（使用新的batch-import云函数）
  async batchImportVocabulary() {
    wx.showLoading({
      title: '正在导入词汇...'
    })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'batch-import',
        data: {
          action: 'import',
          clearExisting: false
        }
      })
      
      wx.hideLoading()
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: `成功导入${res.result.successCount}个词汇`,
          icon: 'success',
          duration: 2000
        })
        
        // 导入成功后重新加载词汇
        setTimeout(() => {
          this.loadTodayWords(this.data.selectedCount)
        }, 2000)
      } else {
        wx.showToast({
          title: '导入失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('批量导入失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '导入失败，请重试',
        icon: 'none'
      })
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
      console.log('⏸️ 正在播放中，强制重置状态')
      // 强制重置状态，允许重新播放
      this.setData({ isPlaying: false })
      // 停止当前播放
      if (this.innerAudioContext) {
        this.innerAudioContext.stop()
      }
    }
    
    // 检查是否有缓存的音频
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
  
  // 单词被点击时自动播放
  onWordTap() {
    console.log('📱 单词被点击，自动播放')
    this.playAudio()
  },
  
  // 播放日语音频（优先使用云函数缓存）
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
      // 方案1: 优先调用云函数（支持缓存）
      console.log('🔍 尝试云函数TTS（支持缓存）...')
      const res = await wx.cloud.callFunction({
        name: 'tts-service',
        data: {
          text: word.word,
          lang: 'ja'
        }
      })
      
      console.log('云函数返回:', res.result)
      
      if (res.result && res.result.success && res.result.audioUrl) {
        console.log(`✅ 使用${res.result.cached ? '缓存' : '新生成'}音频`)
        
        // 检查是否是base64数据，如果是且播放失败，降级到直链
        if (res.result.audioUrl.startsWith('data:audio')) {
          console.log('🎵 播放base64音频')
          // 给base64音频添加错误处理
          this.playBase64Audio(res.result.audioUrl, word)
        } else {
          this.playAudioUrl(res.result.audioUrl, word)
        }
        return
      }
      
      // 方案2: 云函数失败时使用百度TTS备选
      console.log('⚠️ 云函数无可用音频，使用百度TTS备选')
      const baiduUrl = `https://fanyi.baidu.com/gettts?lan=jp&text=${encodeURIComponent(word.word)}&spd=3&source=web`
      console.log('尝试百度TTS:', baiduUrl)
      
      // 使用全局音频上下文播放
      if (this.innerAudioContext) {
        this.innerAudioContext.src = baiduUrl
        this.innerAudioContext.play()
        return
      }
      
    } catch (error) {
      console.error('音频播放失败:', error)
      // 最终降级方案
      this.testSimpleAudio(word)
    }
  },
  
  // 播放base64音频（带降级处理）
  playBase64Audio(base64Url, word) {
    console.log('🎵 尝试播放base64音频')
    
    // 停止之前的音频
    if (this.innerAudioContext) {
      this.innerAudioContext.stop()
    }
    
    const audio = wx.createInnerAudioContext()
    audio.src = base64Url
    
    // 设置3秒播放超时
    const playTimeout = setTimeout(() => {
      console.log('⏰ base64音频播放超时，降级到直链')
      audio.destroy()
      this.fallbackToDirectUrl(word)
    }, 3000)
    
    audio.onPlay(() => {
      console.log('✅ base64音频开始播放')
      clearTimeout(playTimeout)
    })
    
    audio.onError((err) => {
      console.error('❌ base64音频播放失败:', err)
      clearTimeout(playTimeout)
      audio.destroy()
      // 降级到直链播放
      this.fallbackToDirectUrl(word)
    })
    
    audio.onEnded(() => {
      console.log('✅ base64音频播放结束')
      clearTimeout(playTimeout)
      this.setData({ isPlaying: false })
      audio.destroy()
    })
    
    audio.play()
  },
  
  // 降级到直链播放
  fallbackToDirectUrl(word) {
    console.log('🔄 降级到百度TTS直链播放')
    const baiduUrl = `https://fanyi.baidu.com/gettts?lan=jp&text=${encodeURIComponent(word.word)}&spd=3&source=web`
    this.playAudioUrl(baiduUrl, word)
  },
  
  // 播放音频URL
  playAudioUrl(url, word) {
    console.log('📻 播放音频URL:', url.substring(0, 100) + '...')
    
    // 停止之前的音频
    if (this.innerAudioContext) {
      this.innerAudioContext.stop()
    }
    
    const audio = wx.createInnerAudioContext()
    audio.src = url
    
    audio.onPlay(() => {
      console.log('✅ 开始播放')
    })
    
    audio.onError((err) => {
      console.error('❌ 播放失败:', err)
      this.setData({ isPlaying: false })
      // 清理音频对象
      audio.destroy()
      // 网络音频失败时，直接显示读音信息
      this.showReadingInfo()
    })
    
    audio.onEnded(() => {
      console.log('✅ 播放结束')
      this.setData({ isPlaying: false })
      // 清理音频对象
      audio.destroy()
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
    
    // 保存学习记录到数据库
    this.saveLearningRecord(masteredCount, fuzzyCount, forgotCount)
  },
  
  // 保存学习记录
  async saveLearningRecord(masteredCount, fuzzyCount, forgotCount) {
    try {
      const db = wx.cloud.database()
      await db.collection('learning_records').add({
        data: {
          date: new Date().toDateString(),
          totalWords: this.data.wordList.length,
          masteredCount,
          fuzzyCount, 
          forgotCount,
          completedAt: new Date()
        }
      })
      console.log('学习记录保存成功')
    } catch (error) {
      console.error('保存学习记录失败:', error)
    }
  },
  
  // 学习更多词汇
  learnMore() {
    // 清空当前学习状态
    this.setData({
      showComplete: false,
      learningRecord: {},
      masteredCount: 0,
      fuzzyCount: 0,
      forgotCount: 0
    })
    
    // 重新加载词汇（使用相同数量）
    const count = this.data.selectedCount || 10
    this.loadTodayWords(count)
  },
  
  // 结束学习
  finishLearning() {
    // 返回首页或显示成就
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  
  
  // 返回首页
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
  
  // 学习更多
  learnMore() {
    // 重置学习状态
    this.setData({
      showComplete: false,
      currentIndex: 0,
      showExample: true,
      learningRecord: {},
      inWordbook: false,
      masteredCount: 0,
      fuzzyCount: 0,
      forgotCount: 0
    })
    
    // 显示设置界面，让用户选择数量
    this.setData({
      showSetup: true
    })
  }
})