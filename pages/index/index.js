const app = getApp()
const authGuard = require('../../utils/authGuard')

// 初始化云开发
if (!wx.cloud) {
  console.error('请使用 2.2.3 或以上的基础库以使用云能力')
} else {
  wx.cloud.init({
    env: 'cloud1-2g49srond2b01891',
    traceUser: true
  })
}

const db = wx.cloud.database()

Page({
  data: {
    userInfo: {},
    studyDays: 0,
    todayCompleted: false,
    
    // 认证状态
    isAuthenticated: false,
    showLoginPrompt: false,
    currentUser: null,
    userProfile: null,
    userStatus: null,
    
    // 词汇库统计
    totalWordsInLibrary: 0,     // 词汇库总量
    masteredWords: 0,           // 已掌握词汇数
    unmasteredWords: 0,         // 未掌握词汇数
    
    // 句子结构统计
    totalStructures: 0,         // 总句子结构数
    masteredStructures: 0,      // 已掌握结构数
    unmasteredStructures: 0,    // 未掌握结构数
    
    // 今日学习计划
    selectedTotal: 10,          // 用户选择的总学习量
    newWordsCount: 7,           // 新学词汇数（70%）
    reviewWordsCount: 3,        // 复习词汇数（30%）
    
    // 语法结构学习计划
    selectedStructures: 5,      // 用户选择的总结构量
    newStructuresCount: 3,      // 新学结构数（60%）
    reviewStructuresCount: 2,   // 复习结构数（40%）
    
    progressPercent: 0,
    showDevTools: true,
    gridCols: 4,
    
    // 学习计划配置
    studyPlanConfig: {
      // 词汇配置
      newWordPercent: 70,      // 新学占比70%
      reviewPercent: 30,       // 复习占比30%
      availableTotals: [5, 10, 15, 20, 30],  // 可选学习量
      
      // 语法结构配置
      newStructurePercent: 60, // 新学结构占比60%
      reviewStructurePercent: 40, // 复习结构占比40%
      availableStructureTotals: [3, 5, 8, 10, 15]  // 可选结构学习量
    }
  },

  async onLoad() {
    // 检查基础登录状态（只需要微信授权）
    const isAuthenticated = await authGuard.requireBasicAuth(this, { showToast: false })
    
    if (!isAuthenticated) {
      // 如果未认证，显示登录提示界面
      this.setData({
        showLoginPrompt: true,
        isAuthenticated: false
      })
      return
    }
    
    this.getUserInfo()
    this.loadStudyData()
    this.loadUserPreferences()
    
    // 检查是否需要清理重复数据
    setTimeout(() => {
      this.checkAndCleanDuplicates()
    }, 2000) // 延迟2秒执行，让页面先加载
  },

  onShow() {
    // 页面显示时刷新数据（包括句子结构统计和用户信息）
    this.getUserInfo()
    this.loadStudyData()
  },

  getUserInfo() {
    try {
      // 优先从本地存储获取用户资料
      const userProfile = wx.getStorageSync('userProfile') || app.globalData.userProfile
      const userInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo
      
      console.log('🔍 获取用户信息:', { 
        localProfile: wx.getStorageSync('userProfile'),
        globalProfile: app.globalData.userProfile,
        localInfo: wx.getStorageSync('userInfo'),
        globalInfo: app.globalData.userInfo,
        finalProfile: userProfile,
        finalInfo: userInfo
      })
      
      if (userProfile && userProfile.nickname) {
        // 如果有用户资料，优先使用资料中的昵称
        const finalUserInfo = {
          nickName: userProfile.nickname,
          avatarUrl: userInfo ? userInfo.avatarUrl : ''
        }
        console.log('✅ 使用用户资料昵称:', finalUserInfo)
        this.setData({ userInfo: finalUserInfo })
      } else if (userInfo && userInfo.nickName) {
        // 如果没有资料但有基础用户信息，使用微信昵称
        console.log('✅ 使用微信用户信息:', userInfo)
        this.setData({ userInfo })
      } else {
        // 都没有时使用默认
        const defaultUserInfo = {
          nickName: '语伴君用户',
          avatarUrl: ''
        }
        console.log('✅ 使用默认用户信息:', defaultUserInfo)
        this.setData({ userInfo: defaultUserInfo })
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      this.setData({
        userInfo: {
          nickName: '语伴君用户',
          avatarUrl: ''
        }
      })
    }
  },

  async loadStudyData() {
    try {
      wx.showLoading({ title: '加载学习数据...' })
      
      // 加载真实的学习统计数据
      await Promise.all([
        this.loadVocabularyStats(),
        this.loadStructureStats(),
        this.loadTodayPlan(),
        this.loadStudyDays()
      ])
      
    } catch (error) {
      console.error('加载学习数据失败:', error)
      // 使用默认数据
      this.setData({
        studyDays: 1,
        totalWords: 0,
        masteredWords: 0,
        progressPercent: 0
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载词汇库统计数据
  async loadVocabularyStats() {
    try {
      console.log('🔍 开始加载词汇库统计数据...')
      
      // 首先检查是否有解析历史
      const historyRes = await db.collection('japanese_parser_history').count()
      console.log(`📚 解析历史记录查询结果: ${historyRes.total}条`)
      
      if (historyRes.total === 0) {
        // 没有任何解析记录
        this.setData({
          totalWordsInLibrary: 0,
          newWordsAvailable: 0,
          reviewWordsAvailable: 0,
          progressPercent: 0
        })
        console.log('📝 还没有解析过任何内容，请先去日语解析页面')
        return
      }
      
      // 统计词汇库数量
      console.log('🔍 统计词汇库数量...')
      try {
        // 获取总数
        const totalCount = await db.collection('vocabulary_integrated').count()
        console.log(`📊 词汇库总数: ${totalCount.total}条记录`)
        
        // 获取已掌握词汇数量（出现3次以上认为已掌握）
        const masteredCount = await db.collection('vocabulary_integrated')
          .where({ totalOccurrences: db.command.gte(3) })
          .count()
        
        // 获取未掌握词汇数量（出现1-2次认为未掌握）
        const unmasteredCount = await db.collection('vocabulary_integrated')
          .where({ totalOccurrences: db.command.lt(3) })
          .count()
        
        if (totalCount.total > 0) {
          this.setData({
            totalWordsInLibrary: totalCount.total,
            masteredWords: masteredCount.total,
            unmasteredWords: unmasteredCount.total,
            progressPercent: totalCount.total > 0 ? 
              Math.round((masteredCount.total / totalCount.total) * 100) : 0
          })
          
          console.log(`📊 词汇库统计: 总计${totalCount.total}个, 已掌握${masteredCount.total}个, 未掌握${unmasteredCount.total}个`)
        } else {
          // 词汇整合表存在但为空，启动前端整合
          console.log('💡 词汇整合表为空，启动前端自动整合...')
          this.frontendIntegration(historyRes.total)
        }
      } catch (integrationError) {
        // 词汇整合表不存在，启动前端整合
        console.log('💡 词汇整合表不存在，启动前端自动整合...')
        this.frontendIntegration(historyRes.total)
      }
      
    } catch (error) {
      console.error('加载词汇统计失败:', error)
      this.setData({
        totalWordsInLibrary: 0,
        newWordsAvailable: 0,
        reviewWordsAvailable: 0,
        progressPercent: 0
      })
    }
  },

  // 加载句子结构统计数据
  async loadStructureStats() {
    try {
      console.log('🔍 开始加载句子结构统计数据...')
      
      // 首先检查是否有解析历史
      const historyRes = await db.collection('japanese_parser_history').count()
      console.log(`📚 解析历史记录查询结果: ${historyRes.total}条`)
      
      if (historyRes.total === 0) {
        // 没有任何解析记录
        this.setData({
          totalStructures: 0,
          masteredStructures: 0,
          unmasteredStructures: 0
        })
        console.log('📝 还没有解析过任何内容，句子结构为空')
        return
      }
      
      // 统计句子结构数量
      console.log('🔍 统计句子结构数量...')
      try {
        // 获取总数
        const totalCount = await db.collection('sentence_structures_integrated').count()
        console.log(`📊 句子结构总数: ${totalCount.total}条记录`)
        
        // 获取已掌握结构数量（出现3次以上认为已掌握）
        const masteredCount = await db.collection('sentence_structures_integrated')
          .where({ totalOccurrences: db.command.gte(3) })
          .count()
        
        // 获取未掌握结构数量（出现1-2次认为未掌握）
        const unmasteredCount = await db.collection('sentence_structures_integrated')
          .where({ totalOccurrences: db.command.lt(3) })
          .count()
        
        if (totalCount.total > 0) {
          this.setData({
            totalStructures: totalCount.total,
            masteredStructures: masteredCount.total,
            unmasteredStructures: unmasteredCount.total
          })
          
          console.log(`📊 句子结构统计: 总计${totalCount.total}个, 已掌握${masteredCount.total}个, 未掌握${unmasteredCount.total}个`)
        } else {
          // 句子结构整合表存在但为空，启动前端整合
          console.log('💡 句子结构整合表为空，启动前端自动整合...')
          this.frontendStructureIntegration(historyRes.total)
        }
      } catch (integrationError) {
        // 句子结构整合表不存在，启动前端整合
        console.log('💡 句子结构整合表不存在，启动前端自动整合...')
        this.frontendStructureIntegration(historyRes.total)
      }
      
    } catch (error) {
      console.error('加载句子结构统计失败:', error)
      this.setData({
        totalStructures: 0,
        masteredStructures: 0,
        unmasteredStructures: 0
      })
    }
  },

  // 前端句子结构整合（替代云函数）
  async frontendStructureIntegration(historyCount) {
    console.log(`🚀 前端句子结构整合开始，共${historyCount}条记录`)
    
    // 先设置加载状态
    this.setData({
      totalStructures: 0,
      masteredStructures: 0,
      unmasteredStructures: 0
    })
    
    try {
      // 获取所有解析历史（分批处理）
      let historyRes = { data: [] }
      let hasMore = true
      let skip = 0
      const batchSize = 50
      
      console.log('📊 开始分批获取所有解析记录...')
      
      while (hasMore) {
        const batchRes = await db.collection('japanese_parser_history')
          .orderBy('createTime', 'desc')
          .skip(skip)
          .limit(batchSize)
          .get()
        
        if (batchRes.data.length > 0) {
          historyRes.data.push(...batchRes.data)
          skip += batchSize
          console.log(`📥 已获取${historyRes.data.length}条记录...`)
        } else {
          hasMore = false
        }
      }
      
      console.log(`📥 获取到${historyRes.data.length}条解析记录`)
      
      const structureMap = new Map()
      
      // 提取句子结构
      historyRes.data.forEach(record => {
        if (record.sentences && Array.isArray(record.sentences)) {
          record.sentences.forEach((sentence, sentenceIndex) => {
            
            // 提取句子结构
            if (sentence.structure && sentence.structure.trim() && 
                sentence.structure !== '处理失败' && sentence.structure.length > 2) {
              const structureKey = sentence.structure.trim()
              
              if (!structureMap.has(structureKey)) {
                structureMap.set(structureKey, {
                  structure: structureKey,
                  examples: [],
                  sources: [],
                  totalOccurrences: 0,
                  firstSeen: record.createTime || new Date(),
                  lastSeen: record.createTime || new Date(),
                  category: this.categorizeStructure(structureKey),
                  difficulty: this.calculateDifficulty(structureKey),
                  tags: ['句子结构']
                })
              }
              
              const structureData = structureMap.get(structureKey)
              
              // 添加例句
              // 严格去重：检查是否已有相同的例句
              const newExample = {
                jp: sentence.originalText,
                romaji: sentence.romaji || '',
                cn: sentence.translation,
                source: record.title || '解析记录',
                recordId: record._id,
                sentenceIndex: sentenceIndex
              }
              
              const isDuplicateExample = structureData.examples.some(ex => 
                ex.jp === newExample.jp && ex.cn === newExample.cn
              )
              
              if (!isDuplicateExample) {
                structureData.examples.push(newExample)
                
                // 更新来源记录
                if (!structureData.sources.includes(record._id)) {
                  structureData.sources.push(record._id)
                }
                
                structureData.totalOccurrences = structureData.examples.length
                
                if (record.createTime > structureData.lastSeen) {
                  structureData.lastSeen = record.createTime
                }
              }
            }
            
            // 提取语法点
            if (sentence.grammar) {
              const grammarPoints = this.extractGrammarPoints(sentence.grammar)
              
              grammarPoints.forEach(grammarPoint => {
                const grammarKey = grammarPoint.trim()
                
                if (grammarKey && grammarKey.length > 2) {
                  if (!structureMap.has(grammarKey)) {
                    structureMap.set(grammarKey, {
                      structure: grammarKey,
                      examples: [],
                      sources: [],
                      totalOccurrences: 0,
                      firstSeen: record.createTime || new Date(),
                      lastSeen: record.createTime || new Date(),
                      category: 'grammar_point',
                      difficulty: this.calculateDifficulty(grammarKey),
                      tags: ['语法要点']
                    })
                  }
                  
                  const grammarData = structureMap.get(grammarKey)
                  
                  // 严格去重：检查是否已有相同的例句
                  const newGrammarExample = {
                    jp: sentence.originalText,
                    romaji: sentence.romaji || '',
                    cn: sentence.translation,
                    source: record.title || '解析记录',
                    recordId: record._id,
                    sentenceIndex: sentenceIndex
                  }
                  
                  const isDuplicateGrammarExample = grammarData.examples.some(ex => 
                    ex.jp === newGrammarExample.jp && ex.cn === newGrammarExample.cn
                  )
                  
                  if (!isDuplicateGrammarExample) {
                    grammarData.examples.push(newGrammarExample)
                    
                    // 更新来源记录
                    if (!grammarData.sources.includes(record._id)) {
                      grammarData.sources.push(record._id)
                    }
                    
                    grammarData.totalOccurrences = grammarData.examples.length
                    
                    if (record.createTime > grammarData.lastSeen) {
                      grammarData.lastSeen = record.createTime
                    }
                  }
                }
              })
            }
          })
        }
      })
      
      console.log(`📝 提取到${structureMap.size}个不重复句子结构`)
      
      // 分批插入到数据库
      const structureArray = Array.from(structureMap.values())
      let insertedCount = 0
      
      for (const structureData of structureArray) {
        try {
          await db.collection('sentence_structures_integrated').add({
            data: structureData
          })
          insertedCount++
          
          if (insertedCount % 5 === 0) {
            console.log(`✅ 已插入${insertedCount}/${structureArray.length}个句子结构`)
          }
        } catch (error) {
          console.error(`❌ 插入句子结构失败: ${structureData.structure}`, error)
        }
      }
      
      console.log(`🎉 前端句子结构整合完成! 成功插入${insertedCount}个结构`)
      
      // 重新加载统计
      setTimeout(() => {
        this.loadStructureStats()
      }, 500)
      
    } catch (error) {
      console.error('前端句子结构整合失败:', error)
      this.setData({
        totalStructures: 0,
        masteredStructures: 0,
        unmasteredStructures: 0
      })
    }
  },

  // 前端快速整合（替代云函数）
  async frontendIntegration(historyCount) {
    console.log(`🚀 前端快速整合开始，共${historyCount}条记录`)
    
    // 先设置加载状态
    this.setData({
      totalWordsInLibrary: 0,
      newWordsAvailable: 0,
      reviewWordsAvailable: 0,
      progressPercent: 0
    })
    
    try {
      // 获取所有解析历史（无限制，分批处理）
      let historyRes = { data: [] }
      let hasMore = true
      let skip = 0
      const batchSize = 100
      
      console.log('📊 开始分批获取所有解析记录...')
      
      while (hasMore) {
        const batchRes = await db.collection('japanese_parser_history')
          .orderBy('createTime', 'desc')
          .skip(skip)
          .limit(batchSize)
          .get()
        
        if (batchRes.data.length > 0) {
          historyRes.data.push(...batchRes.data)
          skip += batchSize
          console.log(`📥 已获取${historyRes.data.length}条记录...`)
        } else {
          hasMore = false
        }
      }
      
      console.log(`📥 获取到${historyRes.data.length}条解析记录`)
      
      const vocabularyMap = new Map()
      
      // 提取词汇
      historyRes.data.forEach(record => {
        if (record.sentences && Array.isArray(record.sentences)) {
          record.sentences.forEach(sentence => {
            if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
              sentence.vocabulary.forEach(vocab => {
                if (vocab.japanese && vocab.romaji && vocab.chinese) {
                  const key = vocab.japanese
                  
                  if (!vocabularyMap.has(key)) {
                    vocabularyMap.set(key, {
                      word: vocab.japanese,
                      romaji: vocab.romaji,
                      meaning: vocab.chinese,
                      examples: [],
                      sources: [],
                      totalOccurrences: 0,
                      firstSeen: record.createTime || new Date(),
                      lastSeen: record.createTime || new Date(),
                      level: 'user_parsed',
                      tags: ['解析获得']
                    })
                  }
                  
                  const wordData = vocabularyMap.get(key)
                  
                  // 添加例句
                  if (!wordData.sources.includes(record._id)) {
                    wordData.examples.push({
                      jp: sentence.originalText,
                      cn: sentence.translation,
                      source: record.title || '解析记录',
                      recordId: record._id
                    })
                    wordData.sources.push(record._id)
                    wordData.totalOccurrences++
                    
                    if (record.createTime > wordData.lastSeen) {
                      wordData.lastSeen = record.createTime
                    }
                  }
                }
              })
            }
          })
        }
      })
      
      console.log(`📝 提取到${vocabularyMap.size}个不重复词汇`)
      
      // 分批插入到数据库
      const vocabularyArray = Array.from(vocabularyMap.values())
      let insertedCount = 0
      
      for (const wordData of vocabularyArray) {
        try {
          await db.collection('vocabulary_integrated').add({
            data: wordData
          })
          insertedCount++
          
          if (insertedCount % 5 === 0) {
            console.log(`✅ 已插入${insertedCount}/${vocabularyArray.length}个词汇`)
          }
        } catch (error) {
          console.error(`❌ 插入词汇失败: ${wordData.word}`, error)
        }
      }
      
      console.log(`🎉 前端整合完成! 成功插入${insertedCount}个词汇`)
      
      // 重新加载统计
      setTimeout(() => {
        this.loadVocabularyStats()
      }, 500)
      
    } catch (error) {
      console.error('前端整合失败:', error)
      this.setData({
        totalWordsInLibrary: 0,
        newWordsAvailable: 0,
        reviewWordsAvailable: 0,
        progressPercent: 0
      })
    }
  },

  // 后台异步整合
  async backgroundIntegration(historyCount) {
    console.log(`🎯 backgroundIntegration 被调用，历史记录数: ${historyCount}`)
    
    // 先设置默认状态
    this.setData({
      totalWordsInLibrary: 0,
      newWordsAvailable: 0,
      reviewWordsAvailable: 0,
      progressPercent: 0
    })
    
    console.log(`🔄 发现${historyCount}条解析记录，开始后台异步整合...`)
    
    // 完全静默处理，不显示任何提示
    
    try {
      // 异步执行整合，不等待结果
      setTimeout(async () => {
        try {
          console.log('⚡ 开始调用 vocabulary-integration 云函数...')
          const result = await wx.cloud.callFunction({
            name: 'vocabulary-integration',
            data: {
              action: 'rebuild_all'
            }
          })
          console.log('📡 云函数调用结果:', result)
          
          if (result.result.success) {
            console.log(`✅ 后台整合完成: ${result.result.totalWords}个词汇`)
            
            // 整合完成后重新加载统计（不显示loading）
            await this.loadVocabularyStats()
            
            // 静默完成，只在控制台记录
            console.log(`🎉 词汇库整合完成，共${result.result.totalWords}个词汇，用户界面已自动更新`)
          }
        } catch (error) {
          console.error('后台整合失败:', error)
          // 静默失败，不打扰用户
        }
      }, 500) // 延迟500ms开始执行，让页面先渲染
      
    } catch (error) {
      console.error('启动后台整合失败:', error)
    }
  },

  // 手动触发词汇整合（保留用于调试或特殊情况）
  async startVocabularyIntegration() {
    wx.showLoading({ title: '正在手动整合词汇...' })
    
    try {
      // 先尝试重建词汇表（如果云函数存在）
      const result = await wx.cloud.callFunction({
        name: 'vocabulary-integration',
        data: {
          action: 'rebuild_all'
        }
      })
      
      if (result.result.success) {
        wx.showToast({
          title: `手动整合完成：${result.result.totalWords}个词汇`,
          icon: 'success',
          duration: 2000
        })
        
        // 重新加载统计
        setTimeout(() => {
          this.loadVocabularyStats()
        }, 1000)
      }
      
    } catch (error) {
      console.error('词汇整合失败:', error)
      wx.showModal({
        title: '整合失败',
        content: '词汇整合功能需要先部署云函数。请先部署 vocabulary-integration 云函数。',
        confirmText: '了解',
        showCancel: false
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载今日学习计划
  async loadTodayPlan() {
    try {
      // 从本地存储获取用户选择的学习量
      const savedTotal = wx.getStorageSync('selectedTotal') || 10
      
      // 按75%复习 + 25%新学分配
      const { newWordPercent, reviewPercent } = this.data.studyPlanConfig
      const newWordsCount = Math.floor(savedTotal * newWordPercent / 100)
      const reviewWordsCount = savedTotal - newWordsCount
      
      this.setData({
        selectedTotal: savedTotal,
        newWordsCount,
        reviewWordsCount
      })
      
      console.log(`📅 今日计划: 总计${savedTotal}个 (新学${newWordsCount}个[${newWordPercent}%], 复习${reviewWordsCount}个[${reviewPercent}%])`)
      
    } catch (error) {
      console.error('加载学习计划失败:', error)
    }
  },

  // 加载学习天数统计
  async loadStudyDays() {
    try {
      // 从解析历史统计学习天数
      const db = wx.cloud.database()
      const historyRes = await db.collection('japanese_parser_history')
        .field({ createTime: true })
        .get()
      
      if (historyRes.data.length > 0) {
        // 统计不同日期的学习记录
        const dates = new Set()
        const today = new Date().toDateString()
        let hasToday = false
        
        historyRes.data.forEach(record => {
          if (record.createTime) {
            const date = new Date(record.createTime).toDateString()
            dates.add(date)
            if (date === today) {
              hasToday = true
            }
          }
        })
        
        // 计算连续学习天数
        let consecutiveDays = 0
        const sortedDates = Array.from(dates).sort((a, b) => new Date(b) - new Date(a))
        let currentDate = new Date()
        
        for (let i = 0; i < 365; i++) { // 最多检查365天
          const dateStr = currentDate.toDateString()
          if (sortedDates.includes(dateStr)) {
            consecutiveDays++
            currentDate.setDate(currentDate.getDate() - 1)
          } else if (dateStr === today && !hasToday) {
            // 今天没学习，检查昨天
            currentDate.setDate(currentDate.getDate() - 1)
          } else {
            break
          }
        }
        
        this.setData({ 
          studyDays: consecutiveDays,
          todayCompleted: hasToday
        })
        console.log(`📈 连续学习${consecutiveDays}天, 今日${hasToday ? '已完成' : '待开始'}`)
      } else {
        this.setData({ 
          studyDays: 0,
          todayCompleted: false
        })
      }
    } catch (error) {
      console.error('加载学习天数失败:', error)
    }
  },

  // 跳转到新学页面
  goToNewWords() {
    const { newWordsCount, newWordsAvailable } = this.data
    
    if (newWordsAvailable === 0) {
      wx.showModal({
        title: '无新词可学',
        content: '当前没有新词汇可学习，去解析更多内容或选择复习模式',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/learn/learn?count=${newWordsCount}&type=new`
    })
  },

  // 跳转到复习页面  
  goToReviewWords() {
    const { reviewWordsCount, reviewWordsAvailable } = this.data
    
    if (reviewWordsAvailable === 0) {
      wx.showToast({
        title: '暂无词汇需要复习',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/review/review?count=${reviewWordsCount}&type=review`
    })
  },

  // 智能学习计划 - 混合新学和复习
  goToSmartPlan() {
    const { selectedTotal, totalWordsInLibrary } = this.data
    
    if (totalWordsInLibrary === 0) {
      wx.showModal({
        title: '词汇库为空',
        content: '请先去"日语解析"页面解析一些内容',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/learn/learn?count=${selectedTotal}&type=mixed`
    })
  },

  // 跳转到学习设置页面
  goToStudySettings() {
    wx.navigateTo({
      url: '/pages/study-settings/study-settings'
    })
  },

  // 词汇学习
  goToVocabularyLearning() {
    const { selectedTotal, newWordsCount, reviewWordsCount, totalWordsInLibrary } = this.data
    
    if (totalWordsInLibrary === 0) {
      wx.showModal({
        title: '词汇库为空',
        content: '请先去"日语解析"页面解析一些内容',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/learn/learn?count=${selectedTotal}&type=vocabulary&new=${newWordsCount}&review=${reviewWordsCount}`
    })
  },

  // 语法结构学习
  goToStructureLearning() {
    const { selectedStructures, newStructuresCount, reviewStructuresCount, totalStructures } = this.data
    
    if (totalStructures === 0) {
      wx.showModal({
        title: '语法结构库为空',
        content: '请先去"日语解析"页面解析一些内容，建立语法结构库',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/learn/learn?count=${selectedStructures}&type=structure&new=${newStructuresCount}&review=${reviewStructuresCount}`
    })
  },

  // 学习量选择（保留兼容性）
  showStudyAmountSelection() {
    const { totalWordsInLibrary, newWordsAvailable, reviewWordsAvailable, studyPlanConfig } = this.data
    
    if (totalWordsInLibrary === 0) {
      wx.showModal({
        title: '词汇库为空',
        content: '请先去"日语解析"页面解析一些内容，建立你的个性化词汇库',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    const options = studyPlanConfig.availableTotals.map(total => {
      const newCount = Math.floor(total * studyPlanConfig.newWordPercent / 100)
      const reviewCount = total - newCount
      return `${total}个词汇 (新学${newCount} + 复习${reviewCount})`
    })
    
    options.unshift(`词汇库：${totalWordsInLibrary}个 (可新学${newWordsAvailable} + 可复习${reviewWordsAvailable})`)
    options.push('自定义数量')
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        if (res.tapIndex === 0) return // 点击了统计信息
        
        if (res.tapIndex === options.length - 1) {
          // 自定义数量
          this.showCustomAmountSetting()
        } else {
          // 选择预设数量
          const selectedTotal = studyPlanConfig.availableTotals[res.tapIndex - 1]
          this.updateStudyAmount(selectedTotal)
        }
      }
    })
  },

  // 更新学习量
  updateStudyAmount(total) {
    const { newWordPercent, reviewPercent } = this.data.studyPlanConfig
    const newWordsCount = Math.floor(total * newWordPercent / 100)
    const reviewWordsCount = total - newWordsCount
    
    this.setData({
      selectedTotal: total,
      newWordsCount,
      reviewWordsCount
    })
    
    // 保存到本地存储
    wx.setStorageSync('selectedTotal', total)
    
    wx.showToast({
      title: `已设置${total}个词汇 (新学${newWordsCount} + 复习${reviewWordsCount})`,
      icon: 'success',
      duration: 2000
    })
  },

  // 显示自定义数量设置
  showCustomAmountSetting() {
    const { totalWordsInLibrary, newWordsAvailable, reviewWordsAvailable } = this.data
    const maxRecommended = Math.min(50, Math.floor((newWordsAvailable + reviewWordsAvailable) * 0.8))
    
    wx.showModal({
      title: '自定义学习数量',
      content: `词汇库共${totalWordsInLibrary}个\n推荐范围: 5-${maxRecommended}个\n(75%复习 + 25%新学)`,
      editable: true,
      placeholderText: `例如: ${Math.min(20, maxRecommended)}`,
      success: (res) => {
        if (res.confirm && res.content) {
          const total = parseInt(res.content)
          if (total >= 5 && total <= 100) {
            if (total > newWordsAvailable + reviewWordsAvailable) {
              wx.showModal({
                title: '数量超出库存',
                content: `当前最多可学习${newWordsAvailable + reviewWordsAvailable}个词汇`,
                showCancel: false
              })
            } else {
              this.updateStudyAmount(total)
            }
          } else {
            wx.showToast({
              title: '请输入5-100之间的数字',
              icon: 'none'
            })
          }
        }
      }
    })
  },


  // 跳转到语法学习计划
  goToGrammarStudy() {
    wx.navigateTo({
      url: '/packageA/pages/grammar-study/grammar-study'
    })
  },

  // 跳转到语法库
  goToGrammarLibrary() {
    wx.navigateTo({
      url: '/packageA/pages/grammar-library/grammar-library'
    })
  },

  
  
  
  // 跳转到假名对照学习
  goToKanaMerged() {
    wx.navigateTo({
      url: '/packageA/pages/kana-merged/kana-merged'
    })
  },
  
  // 加载用户偏好设置
  loadUserPreferences() {
    try {
      const gridCols = wx.getStorageSync('gridCols') || 4;
      
      // 加载学习计划配置
      const studyPlanConfig = wx.getStorageSync('studyPlanConfig') || this.data.studyPlanConfig;
      const userPreferences = wx.getStorageSync('userPreferences') || {};
      
      // 计算词汇分配
      const selectedTotal = studyPlanConfig.selectedTotal || 10;
      const newWordPercent = studyPlanConfig.newWordPercent || 70;
      const newWordsCount = Math.floor(selectedTotal * newWordPercent / 100);
      const reviewWordsCount = selectedTotal - newWordsCount;
      
      // 计算语法结构分配
      const selectedStructures = userPreferences.structureSettings?.totalCount || 5;
      const newStructurePercent = userPreferences.structureSettings?.newStructurePercent || 60;
      const newStructuresCount = Math.floor(selectedStructures * newStructurePercent / 100);
      const reviewStructuresCount = selectedStructures - newStructuresCount;
      
      this.setData({ 
        gridCols,
        studyPlanConfig,
        selectedTotal,
        newWordsCount,
        reviewWordsCount,
        selectedStructures,
        newStructuresCount,
        reviewStructuresCount
      });
    } catch (error) {
      console.error('加载用户偏好失败:', error);
    }
  },

  // 改变网格列数
  changeGridCols(e) {
    const cols = parseInt(e.currentTarget.dataset.cols);
    this.setData({ gridCols: cols });
    
    // 保存到本地存储
    try {
      wx.setStorageSync('gridCols', cols);
    } catch (error) {
      // 保存用户偏好失败
    }
  },

  // 显示学习统计
  showLearningStats() {
    const { totalWords, masteredWords, studyDays, progressPercent } = this.data;
    wx.showModal({
      title: '学习统计',
      content: `学习天数：${studyDays}天\n总词汇：${totalWords}个\n已掌握：${masteredWords}个\n掌握率：${progressPercent}%`,
      showCancel: false
    });
  },

  // 跳转到日语解析工具（需要高级认证）
  async goToParser() {
    // 检查高级功能权限
    const hasAdvancedAuth = await authGuard.requireAdvancedAuth(this, {
      showToast: false
    })
    
    if (!hasAdvancedAuth) {
      // 显示特殊提示
      wx.showModal({
        title: '功能提示',
        content: '句子解析功能需要完成用户认证，是否前往完善资料？',
        confirmText: '去认证',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' })
            setTimeout(() => {
              wx.navigateTo({ url: '/pages/register/register' })
            }, 100)
          }
        }
      })
      return
    }
    
    wx.navigateTo({
      url: '/packageB/pages/japanese-parser/japanese-parser'
    })
  },
  
  // 跳转到解析复习
  goToParserReview() {
    wx.navigateTo({
      url: '/packageB/pages/parser-review/parser-review'
    })
  },

  // 辅助方法：分类句子结构
  categorizeStructure(structure) {
    // 根据结构内容判断类别
    if (structure.includes('は') || structure.includes('が') || structure.includes('を')) {
      return 'sentence_structure'
    }
    if (structure.includes('形') || structure.includes('动词') || structure.includes('名词')) {
      return 'grammar_point'
    }
    if (structure.includes('修饰') || structure.includes('连接') || structure.includes('表示')) {
      return 'analysis_point'
    }
    return 'sentence_structure' // 默认分类
  },

  // 辅助方法：计算难度
  calculateDifficulty(structure) {
    const length = structure.length
    if (length <= 10) return 'basic'
    if (length <= 25) return 'intermediate'
    return 'advanced'
  },

  // 辅助方法：提取语法点
  extractGrammarPoints(grammarText) {
    if (!grammarText) return []
    
    // 按常见分隔符分割
    const points = []
    const lines = grammarText.split(/[。\n•・]/g)
      .filter(line => line.trim())
      .map(line => line.trim())
    
    lines.forEach(line => {
      if (line.length > 2 && line.length < 100) {
        points.push(line)
      }
    })
    
    return points
  },

  // 检查并清理重复数据（智能判断是否需要清理）
  async checkAndCleanDuplicates() {
    try {
      console.log('🔍 检查是否存在重复句子结构...')
      
      // 检查是否已经清理过
      const hasCleanedDuplicates = wx.getStorageSync('hasCleanedDuplicates')
      const lastCleanTime = wx.getStorageSync('lastCleanTime')
      const now = Date.now()
      
      // 如果最近24小时内清理过，跳过
      if (hasCleanedDuplicates && lastCleanTime && (now - lastCleanTime < 24 * 60 * 60 * 1000)) {
        console.log('✅ 最近已清理过，跳过检查')
        return
      }
      
      // 快速检查是否有重复（只取前100条记录检查）
      const sampleRes = await db.collection('sentence_structures_integrated')
        .limit(100)
        .get()
      
      if (sampleRes.data.length < 10) {
        console.log('📊 数据量太少，无需检查重复')
        return
      }
      
      // 检查样本中是否有重复
      const structures = new Set()
      let hasDuplicates = false
      
      for (const item of sampleRes.data) {
        const key = item.structure.trim()
        if (structures.has(key)) {
          hasDuplicates = true
          break
        }
        structures.add(key)
      }
      
      if (hasDuplicates) {
        console.log('⚠️ 发现重复数据，启动自动清理...')
        await this.cleanDuplicateStructures()
      } else {
        console.log('✅ 样本检查未发现明显重复')
        // 即使没发现重复也标记检查过，避免频繁检查
        wx.setStorageSync('hasCleanedDuplicates', true)
        wx.setStorageSync('lastCleanTime', now)
      }
      
    } catch (error) {
      console.error('❌ 检查重复失败:', error)
    }
  },

  // 清理重复的句子结构（临时方法，执行一次后自动禁用）
  async cleanDuplicateStructures() {
    try {
      console.log('🧹 开始自动清理重复句子结构...')
      
      // 先尝试云函数方式
      try {
        const result = await wx.cloud.callFunction({
          name: 'clean-duplicate-structures'
        })
        
        if (result.result.success) {
          console.log('✅ 云函数清理完成:', result.result)
          
          // 标记已清理，避免重复执行
          wx.setStorageSync('hasCleanedDuplicates', true)
          wx.setStorageSync('lastCleanTime', Date.now())
          
          // 重新加载统计数据
          setTimeout(() => {
            this.loadStructureStats()
          }, 1000)
          
          // 显示清理结果（可选）
          if (result.result.deletedCount > 0) {
            wx.showToast({
              title: `已自动清理${result.result.deletedCount}条重复记录`,
              icon: 'success',
              duration: 2000
            })
          }
          return
        }
      } catch (cloudError) {
        console.log('⚠️ 云函数清理失败，切换到前端清理方式:', cloudError.message)
      }
      
      // 云函数失败时，使用前端清理方式
      await this.forceCleanDuplicatesLocal()
      
    } catch (error) {
      console.error('❌ 调用清理功能失败:', error)
      // 静默失败，不影响用户体验
    }
  },

  // 强制前端清理重复记录
  async forceCleanDuplicatesLocal() {
    try {
      console.log('🧹 开始前端强制清理重复句子结构...')
      
      // 1. 获取所有记录
      let allStructures = []
      let hasMore = true
      let skip = 0
      const batchSize = 100
      
      while (hasMore) {
        const res = await db.collection('sentence_structures_integrated')
          .skip(skip)
          .limit(batchSize)
          .get()
        
        if (res.data.length > 0) {
          allStructures.push(...res.data)
          skip += batchSize
          console.log(`📥 已获取${allStructures.length}条记录...`)
        } else {
          hasMore = false
        }
      }
      
      console.log(`📊 总共获取到${allStructures.length}条记录`)
      
      // 2. 按structure分组
      const structureGroups = new Map()
      
      allStructures.forEach(item => {
        const key = item.structure.trim()
        if (!structureGroups.has(key)) {
          structureGroups.set(key, [])
        }
        structureGroups.get(key).push(item)
      })
      
      // 3. 找出重复的组
      const duplicateGroups = []
      structureGroups.forEach((group, structure) => {
        if (group.length > 1) {
          duplicateGroups.push({ structure, items: group })
        }
      })
      
      console.log(`🔍 发现${duplicateGroups.length}个重复的句子结构`)
      
      if (duplicateGroups.length === 0) {
        console.log('✅ 没有发现重复记录')
        wx.setStorageSync('hasCleanedDuplicates', true)
        return
      }
      
      // 4. 开始清理（限制处理数量，避免超时）
      let mergedCount = 0
      let deletedCount = 0
      const maxProcess = Math.min(duplicateGroups.length, 20) // 每次最多处理20个重复组
      
      for (let i = 0; i < maxProcess; i++) {
        const group = duplicateGroups[i]
        try {
          console.log(`🔄 处理重复结构: ${group.structure} (${group.items.length}条)`)
          
          // 选择保留的记录（examples最多的）
          const keepItem = group.items.reduce((best, current) => {
            const bestExamples = best.examples ? best.examples.length : 0
            const currentExamples = current.examples ? current.examples.length : 0
            return currentExamples > bestExamples ? current : best
          })
          
          // 合并所有examples
          const allExamples = []
          const seenExamples = new Set()
          
          group.items.forEach(item => {
            if (item.examples && Array.isArray(item.examples)) {
              item.examples.forEach(example => {
                const exampleKey = `${example.jp}|||${example.cn}`
                if (!seenExamples.has(exampleKey)) {
                  seenExamples.add(exampleKey)
                  allExamples.push(example)
                }
              })
            }
          })
          
          // 合并sources
          const allSources = new Set()
          group.items.forEach(item => {
            if (item.sources && Array.isArray(item.sources)) {
              item.sources.forEach(source => allSources.add(source))
            }
          })
          
          // 更新保留的记录
          await db.collection('sentence_structures_integrated')
            .doc(keepItem._id)
            .update({
              data: {
                examples: allExamples,
                sources: Array.from(allSources),
                totalOccurrences: allExamples.length,
                lastSeen: new Date()
              }
            })
          
          console.log(`✅ 更新保留记录: ${keepItem._id}, 合并后examples: ${allExamples.length}个`)
          mergedCount++
          
          // 删除其他重复记录
          for (const item of group.items) {
            if (item._id !== keepItem._id) {
              await db.collection('sentence_structures_integrated')
                .doc(item._id)
                .remove()
              console.log(`🗑️ 删除重复记录: ${item._id}`)
              deletedCount++
            }
          }
          
        } catch (error) {
          console.error(`❌ 处理失败: ${group.structure}`, error)
        }
      }
      
      // 标记已清理
      wx.setStorageSync('hasCleanedDuplicates', true)
      wx.setStorageSync('lastCleanTime', Date.now())
      
      console.log(`🎉 前端清理完成! 合并了${mergedCount}个结构，删除了${deletedCount}条重复记录`)
      
      // 重新加载统计数据
      setTimeout(() => {
        this.loadStructureStats()
      }, 1000)
      
      // 显示结果
      if (deletedCount > 0) {
        wx.showToast({
          title: `已清理${deletedCount}条重复记录`,
          icon: 'success',
          duration: 2000
        })
      }
      
    } catch (error) {
      console.error('❌ 前端清理失败:', error)
    }
  },

  // 手动触发清理（开发调试用）
  async manualCleanDuplicates() {
    wx.showModal({
      title: '清理重复数据',
      content: '确定要手动清理重复的句子结构吗？这个操作会合并相同的结构并删除重复记录。',
      success: async (res) => {
        if (res.confirm) {
          // 清除标志，允许重新清理
          wx.removeStorageSync('hasCleanedDuplicates')
          await this.cleanDuplicateStructures()
        }
      }
    })
  },

  // 跳转到词汇列表
  goToVocabularyList(e) {
    const type = e.currentTarget.dataset.type;
    const { totalWordsInLibrary, masteredWords, unmasteredWords } = this.data;
    
    // 检查是否有词汇可显示
    let count = 0;
    let title = '';
    
    switch(type) {
      case 'all':
        count = totalWordsInLibrary;
        title = '全部词汇';
        break;
      case 'mastered':
        count = masteredWords;
        title = '已掌握词汇';
        break;
      case 'unmastered':
        count = unmasteredWords;
        title = '未掌握词汇';
        break;
    }
    
    if (count === 0) {
      wx.showToast({
        title: '暂无词汇数据',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到词汇列表页面，传递类型参数
    wx.navigateTo({
      url: `/packageB/pages/vocabulary-list/vocabulary-list?type=${type}&title=${title}&count=${count}`
    });
  },

  // 跳转到句子结构列表
  goToStructureList(e) {
    const type = e.currentTarget.dataset.type;
    const { totalStructures, masteredStructures, unmasteredStructures } = this.data;
    
    // 检查是否有结构可显示
    let count = 0;
    let title = '';
    
    switch(type) {
      case 'all':
        count = totalStructures;
        title = '全部句子结构';
        break;
      case 'mastered':
        count = masteredStructures;
        title = '已掌握结构';
        break;
      case 'unmastered':
        count = unmasteredStructures;
        title = '未掌握结构';
        break;
    }
    
    if (count === 0) {
      wx.showToast({
        title: '暂无结构数据',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到句子结构列表页面，传递类型参数
    wx.navigateTo({
      url: `/packageB/pages/structure-list/structure-list?type=${type}&title=${title}&count=${count}`
    });
  },

  // 批量重置掌握状态（首页快捷入口）
  showMasteryResetOptions() {
    const { masteredWords, masteredStructures } = this.data;
    
    if (masteredWords === 0 && masteredStructures === 0) {
      wx.showToast({
        title: '暂无已掌握的内容',
        icon: 'none'
      });
      return;
    }
    
    const options = [];
    if (masteredWords > 0) {
      options.push(`重置已掌握词汇 (${masteredWords}个)`);
    }
    if (masteredStructures > 0) {
      options.push(`重置已掌握句子结构 (${masteredStructures}个)`);
    }
    options.push('取消');
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        if (res.tapIndex === options.length - 1) return; // 取消
        
        if (res.tapIndex === 0 && masteredWords > 0) {
          // 重置词汇
          this.showVocabularyResetConfirm();
        } else if ((res.tapIndex === 1 && masteredWords > 0) || (res.tapIndex === 0 && masteredWords === 0)) {
          // 重置句子结构
          this.showStructureResetConfirm();
        }
      }
    });
  },

  // 确认重置词汇掌握状态
  showVocabularyResetConfirm() {
    wx.showModal({
      title: '重置词汇掌握状态',
      content: `确定要将所有已掌握的词汇重新标记为未掌握吗？这将重置 ${this.data.masteredWords} 个词汇的学习进度。`,
      success: (res) => {
        if (res.confirm) {
          this.resetAllVocabularyMastery();
        }
      }
    });
  },

  // 确认重置句子结构掌握状态
  showStructureResetConfirm() {
    wx.showModal({
      title: '重置句子结构掌握状态',
      content: `确定要将所有已掌握的句子结构重新标记为未掌握吗？这将重置 ${this.data.masteredStructures} 个结构的学习进度。`,
      success: (res) => {
        if (res.confirm) {
          this.resetAllStructureMastery();
        }
      }
    });
  },

  // 重置所有词汇掌握状态
  async resetAllVocabularyMastery() {
    try {
      wx.showLoading({ title: '重置词汇中...' });
      
      // 将所有已掌握词汇的出现次数重置为1
      const _ = db.command;
      const result = await db.collection('vocabulary_integrated')
        .where({
          totalOccurrences: _.gte(3)
        })
        .update({
          data: {
            totalOccurrences: 1,
            masteryReset: true,
            masteryResetTime: new Date()
          }
        });
      
      console.log(`✅ 重置词汇掌握状态完成: ${result.stats.updated}个词汇`);
      
      // 重新加载统计
      await this.loadVocabularyStats();
      
      wx.showToast({
        title: `已重置 ${result.stats.updated} 个词汇`,
        icon: 'success'
      });
      
    } catch (error) {
      console.error('重置词汇掌握状态失败:', error);
      wx.showToast({
        title: '重置失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 重置所有句子结构掌握状态
  async resetAllStructureMastery() {
    try {
      wx.showLoading({ title: '重置句子结构中...' });
      
      // 将所有已掌握句子结构的出现次数重置为1
      const _ = db.command;
      const result = await db.collection('sentence_structures_integrated')
        .where({
          totalOccurrences: _.gte(3)
        })
        .update({
          data: {
            totalOccurrences: 1,
            masteryReset: true,
            masteryResetTime: new Date()
          }
        });
      
      console.log(`✅ 重置句子结构掌握状态完成: ${result.stats.updated}个结构`);
      
      // 重新加载统计
      await this.loadStructureStats();
      
      wx.showToast({
        title: `已重置 ${result.stats.updated} 个结构`,
        icon: 'success'
      });
      
    } catch (error) {
      console.error('重置句子结构掌握状态失败:', error);
      wx.showToast({
        title: '重置失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },


  // 跳转到语音对话页面
  goToVoiceDialogue() {
    wx.navigateTo({
      url: '/packageA/pages/voice-dialogue/voice-dialogue'
    })
  },

  // 跳转到学习计划页面
  goToLearningPlan() {
    wx.navigateTo({
      url: '/packageB/pages/learning-plan/learning-plan'
    })
  },

  // 显示学习统计
  showLearningStats() {
    wx.navigateTo({
      url: '/pages/learning-progress/learning-progress?tab=1'
    })
  },

  // 跳转到解析历史页面
  goToParserHistory() {
    wx.navigateTo({
      url: '/pages/parser-history/parser-history'
    })
  },

  // 显示更多功能
  showMore() {
    wx.showActionSheet({
      itemList: ['学习设置', '学习报告', '意见反馈', '关于我们'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showSettings();
            break;
          case 1:
            this.showLearningReport();
            break;
          case 2:
            this.showFeedback();
            break;
          case 3:
            this.showAbout();
            break;
        }
      }
    });
  },

  // 显示设置
  showSettings() {
    wx.showModal({
      title: '学习设置',
      content: '每日学习目标、提醒时间等设置功能开发中...',
      showCancel: false
    });
  },

  // 显示学习报告
  showLearningReport() {
    wx.showModal({
      title: '学习报告',
      content: '详细的学习进度分析和统计报告功能开发中...',
      showCancel: false
    });
  },

  // 显示反馈
  showFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '您可以通过以下方式联系我们：\n邮箱：feedback@example.com\n微信群：加群功能开发中',
      showCancel: false
    });
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于语伴君',
      content: '语伴君 v1.0\n一款智能日语学习助手\n\n功能特色：\n• AI语法分析\n• 间隔复习算法\n• 50音图学习\n• 对话练习',
      showCancel: false
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStudyData()
    wx.stopPullDownRefresh()
  },

  // 跳转到个人中心
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 跳转到学习进度页面
  goToLearningProgress() {
    wx.navigateTo({
      url: '/pages/learning-progress/learning-progress'
    })
  },

  // 显示今日学习详情
  async showTodayDetails() {
    try {
      wx.showLoading({ title: '加载今日数据...' })
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 获取今日解析记录
      const todayParsed = await db.collection('japanese_parser_history')
        .where({
          createTime: db.command.gte(today).and(db.command.lt(tomorrow))
        })
        .orderBy('createTime', 'desc')
        .get()

      let content = '📊 今日学习详情\n\n'
      
      if (todayParsed.data.length === 0) {
        content += '今天还没有学习记录\n\n'
        content += '💡 建议:\n'
        content += '• 去"句子解析"解析一些内容\n'
        content += '• 或者复习已有的词汇'
      } else {
        let totalWords = 0
        let totalStructures = 0
        
        content += `🎯 解析次数: ${todayParsed.data.length}次\n\n`
        
        content += '📝 解析记录:\n'
        todayParsed.data.forEach((record, index) => {
          const time = new Date(record.createTime)
          const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
          
          let wordCount = 0
          let structureCount = 0
          
          if (record.sentences) {
            record.sentences.forEach(sentence => {
              if (sentence.vocabulary) {
                wordCount += sentence.vocabulary.length
              }
              if (sentence.structure) {
                structureCount++
              }
            })
          }
          
          totalWords += wordCount
          totalStructures += structureCount
          
          content += `${index + 1}. ${timeStr} - ${record.title || '解析内容'}\n`
          content += `   📚 ${wordCount}个词汇 🧠 ${structureCount}个结构\n`
        })
        
        content += `\n📊 今日总计:\n`
        content += `• 新词汇: ${totalWords}个\n`
        content += `• 句子结构: ${totalStructures}个\n`
        content += `• 解析句子: ${todayParsed.data.reduce((sum, r) => sum + (r.sentences ? r.sentences.length : 0), 0)}个`
      }

      wx.showModal({
        title: `今日学习 ${this.formatDate(new Date())}`,
        content: content,
        showCancel: false,
        confirmText: '知道了'
      })

    } catch (error) {
      console.error('获取今日详情失败:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 格式化日期
  formatDate(date) {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 跳转到注册页面
  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  }
})