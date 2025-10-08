// pages/mastery-stats/mastery-stats.js
const app = getApp()
const { getLearningStats, getReviewStats } = require('../../utils/userBehavior')


Page({
  data: {
    loading: true,
    // 原有的解析统计数据
    totalStats: {
      sentence: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      word: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      analysis: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 }
    },
    historyList: [],
    filterType: 'all', // all, favorite, recent
    chartData: null,
    // 新增：真实学习行为统计
    learningBehaviorStats: {
      totalViewed: 0,
      totalStudied: 0,
      totalReviewed: 0,
      uniqueContentCount: 0,
      studyDays: 0,
      avgDailyActions: 0,
      contentBreakdown: {
        sentence: { viewed: 0, studied: 0, reviewed: 0 },
        word: { viewed: 0, studied: 0, reviewed: 0 },
        grammar: { viewed: 0, studied: 0, reviewed: 0 },
        structure: { viewed: 0, studied: 0, reviewed: 0 }
      },
      dailyActivity: []
    },
    // 新增：复习统计数据
    reviewStats: {
      totalReviews: 0,
      reviewedContentCount: 0,
      consistentDays: 0,
      bestReviewDay: null,
      reviewPatterns: {
        byContentType: {},
        byTimeOfDay: {},
        byDayOfWeek: {}
      }
    },
    statsMode: 'behavior' // behavior: 真实行为统计, mastery: 掌握度统计
  },

  onLoad() {
    this.loadHistoryData()
    this.loadLearningBehaviorStats()
    this.loadReviewStats()
  },

  onShow() {
    // 每次显示页面时重新加载，确保数据最新
    this.loadHistoryData()
    this.loadLearningBehaviorStats()
    this.loadReviewStats()
  },

  // 加载所有历史数据
  async loadHistoryData() {
    this.setData({ loading: true })
    
    try {
      // 从云数据库加载
      const cloudData = await this.loadCloudHistory()
      
      // 从本地存储加载
      const localData = this.loadLocalHistory()
      
      // 合并数据
      const allHistory = [...cloudData, ...localData]
      
      this.setData({ 
        historyList: allHistory,
        loading: false 
      })
      
      // 计算统计数据
      this.calculateTotalStats()
      
    } catch (error) {
      console.error('加载历史数据失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 从云数据库加载历史
  async loadCloudHistory() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('japanese_parser_history')
        .orderBy('createTime', 'desc')
        .limit(100) // 限制100条记录
        .get()
      
      return res.data.map(item => ({
        ...item,
        source: 'cloud'
      }))
    } catch (error) {
      console.error('加载云端历史失败:', error)
      return []
    }
  },

  // 从本地存储加载历史
  loadLocalHistory() {
    try {
      const localHistory = wx.getStorageSync('japanese_parser_history') || []
      return localHistory.map(item => ({
        ...item,
        source: 'local'
      }))
    } catch (error) {
      console.error('加载本地历史失败:', error)
      return []
    }
  },

  // 计算总体统计数据
  calculateTotalStats() {
    const { historyList } = this.data
    
    const stats = {
      sentence: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      word: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      analysis: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 }
    }
    
    historyList.forEach(historyItem => {
      if (!historyItem.sentences) return
      
      // 加载该记录的掌握度数据
      const masteryKey = `mastery_${historyItem._id}`
      const masteryLevels = wx.getStorageSync(masteryKey) || {}
      
      historyItem.sentences.forEach((sentence, sIndex) => {
        // 句子统计
        stats.sentence.total++
        const sentenceLevel = masteryLevels[`s${sIndex}_sentence`] || 0
        this.updateStatCount(stats.sentence, sentenceLevel)
        
        // 词汇统计
        if (sentence.vocabulary) {
          sentence.vocabulary.forEach((word, wIndex) => {
            stats.word.total++
            const wordLevel = masteryLevels[`s${sIndex}_word_${wIndex}`] || 0
            this.updateStatCount(stats.word, wordLevel)
          })
        }
        
        // 分析统计
        if (sentence.analysis) {
          const analysisPoints = this.parseAnalysisPoints(sentence.analysis)
          analysisPoints.forEach((_, aIndex) => {
            stats.analysis.total++
            const analysisLevel = masteryLevels[`s${sIndex}_analysis_${aIndex}`] || 0
            this.updateStatCount(stats.analysis, analysisLevel)
          })
        }
      })
    })
    
    // 计算百分比
    Object.keys(stats).forEach(type => {
      const typeStats = stats[type]
      if (typeStats.total > 0) {
        typeStats.unseenPercent = Math.round((typeStats.unseen / typeStats.total) * 100)
        typeStats.unfamiliarPercent = Math.round((typeStats.unfamiliar / typeStats.total) * 100)
        typeStats.partialPercent = Math.round((typeStats.partial / typeStats.total) * 100)
        typeStats.masteredPercent = Math.round((typeStats.mastered / typeStats.total) * 100)
      }
    })
    
    this.setData({ 
      totalStats: stats,
      chartData: this.generateChartData(stats)
    })
  },

  // 更新统计计数
  updateStatCount(stat, level) {
    switch(level) {
      case 0: stat.unseen++; break
      case 1: stat.unfamiliar++; break
      case 2: stat.partial++; break
      case 3: stat.mastered++; break
    }
  },

  // 解析分析点
  parseAnalysisPoints(analysisText) {
    if (!analysisText) return []
    
    let points = []
    const lines = analysisText.split('\n').filter(line => line.trim())
    
    lines.forEach(line => {
      if (line.includes('•')) {
        const bulletPoints = line.split('•').filter(p => p.trim())
        points.push(...bulletPoints.map(p => p.trim()))
      } else if (/^\d+\./.test(line.trim())) {
        points.push(line.trim())
      } else if (line.includes('、')) {
        const commaPoints = line.split('、').filter(p => p.trim())
        points.push(...commaPoints.map(p => p.trim()))
      } else {
        points.push(line.trim())
      }
    })
    
    return points.filter(point => point.length >= 3)
  },

  // 生成图表数据
  generateChartData(stats) {
    const categories = ['句子', '词汇', '语法分析']
    const types = ['sentence', 'word', 'analysis']
    
    return {
      categories,
      series: [
        {
          name: '已掌握',
          data: types.map(type => stats[type].mastered),
          color: '#4caf50'
        },
        {
          name: '略懂',
          data: types.map(type => stats[type].partial),
          color: '#2196f3'
        },
        {
          name: '未掌握',
          data: types.map(type => stats[type].unfamiliar),
          color: '#ff9800'
        },
        {
          name: '未看',
          data: types.map(type => stats[type].unseen),
          color: '#e0e0e0'
        }
      ]
    }
  },

  // 筛选类型切换
  onFilterChange(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ filterType: type })
    this.filterHistoryData(type)
  },

  // 筛选历史数据
  filterHistoryData(filterType) {
    let filteredList = [...this.data.historyList]
    
    switch(filterType) {
      case 'favorite':
        filteredList = filteredList.filter(item => item.favorite)
        break
      case 'recent':
        // 最近7天的记录
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        filteredList = filteredList.filter(item => {
          const itemDate = new Date(item.createTime)
          return itemDate >= sevenDaysAgo
        })
        break
      case 'all':
      default:
        // 不筛选
        break
    }
    
    // 重新计算筛选后的统计数据
    this.calculateFilteredStats(filteredList)
  },

  // 计算筛选后的统计数据
  calculateFilteredStats(filteredList) {
    const stats = {
      sentence: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      word: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      analysis: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 }
    }
    
    filteredList.forEach(historyItem => {
      if (!historyItem.sentences) return
      
      const masteryKey = `mastery_${historyItem._id}`
      const masteryLevels = wx.getStorageSync(masteryKey) || {}
      
      historyItem.sentences.forEach((sentence, sIndex) => {
        // 句子统计
        stats.sentence.total++
        const sentenceLevel = masteryLevels[`s${sIndex}_sentence`] || 0
        this.updateStatCount(stats.sentence, sentenceLevel)
        
        // 词汇统计
        if (sentence.vocabulary) {
          sentence.vocabulary.forEach((word, wIndex) => {
            stats.word.total++
            const wordLevel = masteryLevels[`s${sIndex}_word_${wIndex}`] || 0
            this.updateStatCount(stats.word, wordLevel)
          })
        }
        
        // 分析统计
        if (sentence.analysis) {
          const analysisPoints = this.parseAnalysisPoints(sentence.analysis)
          analysisPoints.forEach((_, aIndex) => {
            stats.analysis.total++
            const analysisLevel = masteryLevels[`s${sIndex}_analysis_${aIndex}`] || 0
            this.updateStatCount(stats.analysis, analysisLevel)
          })
        }
      })
    })
    
    // 计算百分比
    Object.keys(stats).forEach(type => {
      const typeStats = stats[type]
      if (typeStats.total > 0) {
        typeStats.unseenPercent = Math.round((typeStats.unseen / typeStats.total) * 100)
        typeStats.unfamiliarPercent = Math.round((typeStats.unfamiliar / typeStats.total) * 100)
        typeStats.partialPercent = Math.round((typeStats.partial / typeStats.total) * 100)
        typeStats.masteredPercent = Math.round((typeStats.mastered / typeStats.total) * 100)
      }
    })
    
    this.setData({ 
      totalStats: stats,
      chartData: this.generateChartData(stats)
    })
  },

  // 加载真实学习行为统计
  loadLearningBehaviorStats() {
    try {
      const stats = getLearningStats(7) // 获取最近7天的统计
      if (stats) {
        this.setData({
          learningBehaviorStats: stats
        })
      }
    } catch (error) {
      console.error('加载学习行为统计失败:', error)
    }
  },

  // 加载复习统计
  loadReviewStats() {
    try {
      const stats = getReviewStats(7) // 获取最近7天的复习统计
      if (stats) {
        this.setData({
          reviewStats: stats
        })
      }
    } catch (error) {
      console.error('加载复习统计失败:', error)
    }
  },

  // 切换统计模式
  switchStatsMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      statsMode: mode
    })
  },

  // 跳转到历史详情
  onViewDetail(e) {
    const { item } = e.currentTarget.dataset
    app.globalData.currentHistoryItem = item
    wx.navigateTo({
      url: '/packageB/pages/parser-detail/parser-detail'
    })
  },

  // 返回
  onBack() {
    wx.navigateBack()
  }
})