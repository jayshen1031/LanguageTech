// 用户行为追踪工具
// 记录用户的真实学习行为：查看、学习、复习等

const BEHAVIOR_TYPES = {
  VIEW: 'view',          // 查看内容
  STUDY: 'study',        // 学习（设置掌握度）
  REVIEW: 'review',      // 复习（重复查看）
  FAVORITE: 'favorite',  // 收藏
  SEARCH: 'search',      // 搜索
  PLAY_AUDIO: 'play_audio' // 播放音频
}

const CONTENT_TYPES = {
  SENTENCE: 'sentence',     // 句子
  WORD: 'word',            // 单词
  GRAMMAR: 'grammar',      // 语法点
  STRUCTURE: 'structure',  // 句子结构
  PARSER_RECORD: 'parser_record', // 解析记录
  VOCABULARY_LIST: 'vocabulary_list', // 词汇列表
  KANA: 'kana',           // 假名
  DIALOGUE: 'dialogue'     // 对话
}

/**
 * 记录用户行为
 * @param {string} behaviorType - 行为类型 (BEHAVIOR_TYPES)
 * @param {string} contentType - 内容类型 (CONTENT_TYPES)
 * @param {string} contentId - 内容ID
 * @param {object} extraData - 额外数据
 */
function recordUserBehavior(behaviorType, contentType, contentId, extraData = {}) {
  try {
    const timestamp = new Date().getTime()
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    const behaviorRecord = {
      behaviorType,
      contentType,
      contentId,
      timestamp,
      date,
      ...extraData
    }
    
    // 保存到本地存储
    const storageKey = 'user_behavior_log'
    const existingLog = wx.getStorageSync(storageKey) || []
    
    // 添加新记录到开头
    existingLog.unshift(behaviorRecord)
    
    // 保持最近1000条记录
    if (existingLog.length > 1000) {
      existingLog.splice(1000)
    }
    
    wx.setStorageSync(storageKey, existingLog)
    
    // 更新日统计
    updateDailyStats(date, behaviorType, contentType)
    
    console.log('📊 用户行为记录:', behaviorRecord)
    
    // 自动同步学习数据到云端
    autoSyncLearningData(existingLog)
    
  } catch (error) {
    console.error('记录用户行为失败:', error)
  }
}

/**
 * 更新日统计
 */
function updateDailyStats(date, behaviorType, contentType) {
  try {
    const statsKey = 'daily_behavior_stats'
    const stats = wx.getStorageSync(statsKey) || {}
    
    if (!stats[date]) {
      stats[date] = {
        totalActions: 0,
        behaviors: {},
        contents: {}
      }
    }
    
    const dayStats = stats[date]
    dayStats.totalActions++
    
    // 行为类型统计
    if (!dayStats.behaviors[behaviorType]) {
      dayStats.behaviors[behaviorType] = 0
    }
    dayStats.behaviors[behaviorType]++
    
    // 内容类型统计
    if (!dayStats.contents[contentType]) {
      dayStats.contents[contentType] = 0
    }
    dayStats.contents[contentType]++
    
    // 只保留最近30天的统计
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]
    
    Object.keys(stats).forEach(statsDate => {
      if (statsDate < cutoffDate) {
        delete stats[statsDate]
      }
    })
    
    wx.setStorageSync(statsKey, stats)
    
  } catch (error) {
    console.error('更新日统计失败:', error)
  }
}

/**
 * 获取复习统计数据
 * @param {number} days - 统计天数，默认7天
 * @returns {object} 复习统计数据
 */
function getReviewStats(days = 7) {
  try {
    const behaviorLog = wx.getStorageSync('user_behavior_log') || []
    const cutoffTime = new Date().getTime() - (days * 24 * 60 * 60 * 1000)
    const recentBehaviors = behaviorLog.filter(record => record.timestamp >= cutoffTime)
    
    // 复习行为分析
    const reviewBehaviors = recentBehaviors.filter(record => record.behaviorType === BEHAVIOR_TYPES.REVIEW)
    
    const reviewStats = {
      totalReviews: reviewBehaviors.length,
      reviewedContent: new Set(),
      reviewFrequency: {},
      reviewAccuracy: 0,
      consistentDays: 0,
      bestReviewDay: null,
      reviewPatterns: {
        byContentType: {},
        byTimeOfDay: {},
        byDayOfWeek: {}
      }
    }
    
    // 分析复习内容
    reviewBehaviors.forEach(review => {
      const contentKey = `${review.contentType}_${review.contentId}`
      reviewStats.reviewedContent.add(contentKey)
      
      // 统计复习频次
      if (!reviewStats.reviewFrequency[contentKey]) {
        reviewStats.reviewFrequency[contentKey] = 0
      }
      reviewStats.reviewFrequency[contentKey]++
      
      // 按内容类型统计
      if (!reviewStats.reviewPatterns.byContentType[review.contentType]) {
        reviewStats.reviewPatterns.byContentType[review.contentType] = 0
      }
      reviewStats.reviewPatterns.byContentType[review.contentType]++
      
      // 按时间段统计
      const hour = new Date(review.timestamp).getHours()
      const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
      if (!reviewStats.reviewPatterns.byTimeOfDay[timeSlot]) {
        reviewStats.reviewPatterns.byTimeOfDay[timeSlot] = 0
      }
      reviewStats.reviewPatterns.byTimeOfDay[timeSlot]++
      
      // 按星期统计
      const dayOfWeek = new Date(review.timestamp).getDay()
      if (!reviewStats.reviewPatterns.byDayOfWeek[dayOfWeek]) {
        reviewStats.reviewPatterns.byDayOfWeek[dayOfWeek] = 0
      }
      reviewStats.reviewPatterns.byDayOfWeek[dayOfWeek]++
    })
    
    reviewStats.reviewedContentCount = reviewStats.reviewedContent.size
    delete reviewStats.reviewedContent
    
    // 计算连续复习天数
    const reviewDates = new Set(reviewBehaviors.map(r => r.date))
    reviewStats.consistentDays = reviewDates.size
    
    // 找出复习最多的一天
    const dailyReviews = {}
    reviewBehaviors.forEach(review => {
      if (!dailyReviews[review.date]) {
        dailyReviews[review.date] = 0
      }
      dailyReviews[review.date]++
    })
    
    if (Object.keys(dailyReviews).length > 0) {
      reviewStats.bestReviewDay = Object.keys(dailyReviews).reduce((a, b) => 
        dailyReviews[a] > dailyReviews[b] ? a : b
      )
    }
    
    return reviewStats
    
  } catch (error) {
    console.error('获取复习统计失败:', error)
    return null
  }
}

/**
 * 获取学习统计数据
 * @param {number} days - 统计天数，默认7天
 * @returns {object} 统计数据
 */
function getLearningStats(days = 7) {
  try {
    const behaviorLog = wx.getStorageSync('user_behavior_log') || []
    const dailyStats = wx.getStorageSync('daily_behavior_stats') || {}
    
    const cutoffTime = new Date().getTime() - (days * 24 * 60 * 60 * 1000)
    const recentBehaviors = behaviorLog.filter(record => record.timestamp >= cutoffTime)
    
    // 基础统计
    const stats = {
      totalViewed: 0,        // 总查看数
      totalStudied: 0,       // 总学习数（设置了掌握度）
      totalReviewed: 0,      // 总复习数
      uniqueContent: new Set(), // 唯一内容数
      studyDays: 0,          // 学习天数
      avgDailyActions: 0,    // 日均操作数
      contentBreakdown: {    // 内容类型分解
        sentence: { viewed: 0, studied: 0, reviewed: 0 },
        word: { viewed: 0, studied: 0, reviewed: 0 },
        grammar: { viewed: 0, studied: 0, reviewed: 0 },
        structure: { viewed: 0, studied: 0, reviewed: 0 }
      },
      dailyActivity: []      // 每日活动数据
    }
    
    // 统计行为数据
    recentBehaviors.forEach(record => {
      const contentKey = `${record.contentType}_${record.contentId}`
      stats.uniqueContent.add(contentKey)
      
      switch(record.behaviorType) {
        case BEHAVIOR_TYPES.VIEW:
          stats.totalViewed++
          if (stats.contentBreakdown[record.contentType]) {
            stats.contentBreakdown[record.contentType].viewed++
          }
          break
        case BEHAVIOR_TYPES.STUDY:
          stats.totalStudied++
          if (stats.contentBreakdown[record.contentType]) {
            stats.contentBreakdown[record.contentType].studied++
          }
          break
        case BEHAVIOR_TYPES.REVIEW:
          stats.totalReviewed++
          if (stats.contentBreakdown[record.contentType]) {
            stats.contentBreakdown[record.contentType].reviewed++
          }
          break
      }
    })
    
    // 统计学习天数和日均数据
    const recentDates = new Set(recentBehaviors.map(r => r.date))
    stats.studyDays = recentDates.size
    
    if (stats.studyDays > 0) {
      stats.avgDailyActions = Math.round(recentBehaviors.length / stats.studyDays)
    }
    
    // 生成每日活动数据
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayStats = dailyStats[dateStr] || { totalActions: 0 }
      stats.dailyActivity.push({
        date: dateStr,
        actions: dayStats.totalActions,
        behaviors: dayStats.behaviors || {},
        weekday: date.getDay()
      })
    }
    
    stats.uniqueContentCount = stats.uniqueContent.size
    delete stats.uniqueContent // 删除Set对象，避免序列化问题
    
    return stats
    
  } catch (error) {
    console.error('获取学习统计失败:', error)
    return null
  }
}

/**
 * 获取内容查看记录
 * @param {string} contentType - 内容类型
 * @param {string} contentId - 内容ID
 * @returns {object} 查看记录统计
 */
function getContentViewStats(contentType, contentId) {
  try {
    const behaviorLog = wx.getStorageSync('user_behavior_log') || []
    
    const contentRecords = behaviorLog.filter(record => 
      record.contentType === contentType && record.contentId === contentId
    )
    
    return {
      totalViews: contentRecords.length,
      firstView: contentRecords.length > 0 ? contentRecords[contentRecords.length - 1].timestamp : null,
      lastView: contentRecords.length > 0 ? contentRecords[0].timestamp : null,
      viewHistory: contentRecords.map(r => ({
        behaviorType: r.behaviorType,
        timestamp: r.timestamp,
        date: r.date
      }))
    }
    
  } catch (error) {
    console.error('获取内容查看记录失败:', error)
    return { totalViews: 0, firstView: null, lastView: null, viewHistory: [] }
  }
}

/**
 * 清理旧的行为记录
 */
function cleanupOldBehaviorRecords() {
  try {
    const cutoffTime = new Date().getTime() - (30 * 24 * 60 * 60 * 1000) // 30天前
    
    const behaviorLog = wx.getStorageSync('user_behavior_log') || []
    const filteredLog = behaviorLog.filter(record => record.timestamp >= cutoffTime)
    
    wx.setStorageSync('user_behavior_log', filteredLog)
    
    console.log(`🧹 清理行为记录: ${behaviorLog.length} -> ${filteredLog.length}`)
    
  } catch (error) {
    console.error('清理行为记录失败:', error)
  }
}

// 便捷方法
const trackView = (contentType, contentId, extraData) => 
  recordUserBehavior(BEHAVIOR_TYPES.VIEW, contentType, contentId, extraData)

const trackStudy = (contentType, contentId, extraData) => 
  recordUserBehavior(BEHAVIOR_TYPES.STUDY, contentType, contentId, extraData)

const trackReview = (contentType, contentId, extraData) => 
  recordUserBehavior(BEHAVIOR_TYPES.REVIEW, contentType, contentId, extraData)

const trackFavorite = (contentType, contentId, extraData) => 
  recordUserBehavior(BEHAVIOR_TYPES.FAVORITE, contentType, contentId, extraData)

const trackSearch = (contentType, contentId, extraData) => 
  recordUserBehavior(BEHAVIOR_TYPES.SEARCH, contentType, contentId, extraData)

const trackAudio = (contentType, contentId, extraData) => 
  recordUserBehavior(BEHAVIOR_TYPES.PLAY_AUDIO, contentType, contentId, extraData)

/**
 * 自动同步学习数据到云端
 * 使用智能同步策略，避免频繁请求
 */
function autoSyncLearningData(behaviorLog) {
  try {
    // 获取同步配置
    const syncConfig = {
      minBehaviorCount: 10,      // 最少累积10条行为记录才同步
      maxTimeSinceLastSync: 30 * 60 * 1000, // 最长30分钟同步一次
      enableAutoSync: true       // 是否启用自动同步
    }
    
    if (!syncConfig.enableAutoSync) {
      return
    }
    
    // 获取上次同步时间和同步状态
    const lastSyncTime = wx.getStorageSync('lastAutoSyncTime') || 0
    const currentTime = new Date().getTime()
    const timeSinceLastSync = currentTime - lastSyncTime
    
    // 检查是否需要同步
    const shouldSyncByCount = behaviorLog.length >= syncConfig.minBehaviorCount
    const shouldSyncByTime = timeSinceLastSync >= syncConfig.maxTimeSinceLastSync
    
    if (shouldSyncByCount || shouldSyncByTime) {
      console.log(`🔄 触发自动同步 - 行为数量: ${behaviorLog.length}, 距离上次同步: ${Math.round(timeSinceLastSync / 1000 / 60)}分钟`)
      
      // 异步执行同步，不阻塞当前操作
      setTimeout(() => {
        performAutoSync()
      }, 1000) // 延迟1秒执行，避免影响用户操作
    }
  } catch (error) {
    console.error('自动同步检查失败:', error)
  }
}

/**
 * 执行自动同步
 */
async function performAutoSync() {
  try {
    // 检查用户是否登录
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      console.log('🔕 用户未登录，跳过自动同步')
      return
    }
    
    // 检查网络状态
    const networkType = await wx.getNetworkType()
    if (networkType.networkType === 'none') {
      console.log('🔕 网络不可用，跳过自动同步')
      return
    }
    
    console.log('📤 开始自动同步学习数据...')
    
    // 获取全局的userService
    const app = getApp()
    if (app && app.globalData && app.globalData.userService) {
      const result = await app.globalData.userService.syncLearningDataToCloud()
      
      if (result.success) {
        // 更新最后同步时间
        wx.setStorageSync('lastAutoSyncTime', new Date().getTime())
        console.log('✅ 自动同步成功')
      } else {
        console.log('❌ 自动同步失败:', result.error)
      }
    } else {
      console.log('🔕 userService 不可用，跳过自动同步')
    }
  } catch (error) {
    console.error('执行自动同步失败:', error)
  }
}

module.exports = {
  BEHAVIOR_TYPES,
  CONTENT_TYPES,
  recordUserBehavior,
  getLearningStats,
  getReviewStats,
  getContentViewStats,
  cleanupOldBehaviorRecords,
  // 便捷方法
  trackView,
  trackStudy,
  trackReview,
  trackFavorite,
  trackSearch,
  trackAudio
}