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
    // 认证状态
    isAuthenticated: false,
    
    // 学习轨迹数据
    learningTimeline: [],
    totalStudyDays: 0,
    consecutiveDays: 0,
    todayProgress: {
      parsed: 0,
      learned: 0,
      reviewed: 0,
      newWords: 0,
      structures: 0
    },
    
    // 成就数据
    achievements: [],
    
    // 统计数据
    weeklyStats: [],
    weekTotalCount: 0,
    totalParseCount: 0,
    totalWordCount: 0,
    totalStructureCount: 0,
    monthlyStats: {
      totalWords: 0,
      totalStructures: 0,
      totalParsed: 0,
      averageDaily: 0
    },
    
    // 显示控制
    showDetail: {},
    currentTab: 0, // 0: 时间线, 1: 统计, 2: 成就
    
    // 加载状态
    loading: true
  },

  async onLoad() {
    // 检查基础登录状态
    const isAuthenticated = await authGuard.requireBasicAuth(this, { showToast: false })
    
    if (!isAuthenticated) {
      wx.showModal({
        title: '需要登录',
        content: '查看学习进度需要登录，是否前往登录？',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/profile' })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }
    
    this.setData({ isAuthenticated: true })
    this.loadLearningProgress()
  },

  // 加载学习进度数据
  async loadLearningProgress() {
    try {
      wx.showLoading({ title: '加载学习轨迹...' })
      
      await Promise.all([
        this.loadLearningTimeline(),
        this.loadTodayProgress(),
        this.loadWeeklyStats(),
        this.loadAchievements()
      ])
      
    } catch (error) {
      console.error('加载学习进度失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  // 加载学习时间线
  async loadLearningTimeline() {
    try {
      // 获取解析历史
      const parserHistory = await db.collection('japanese_parser_history')
        .orderBy('createTime', 'desc')
        .limit(100)
        .get()

      // 按日期组织数据
      const dailyData = new Map()
      let totalDays = 0
      let consecutiveDays = 0

      parserHistory.data.forEach(record => {
        const date = new Date(record.createTime).toDateString()
        
        if (!dailyData.has(date)) {
          dailyData.set(date, {
            date: date,
            displayDate: this.formatDate(new Date(record.createTime)),
            activities: [],
            wordCount: 0,
            structureCount: 0,
            parseCount: 0
          })
        }

        const dayData = dailyData.get(date)
        dayData.parseCount++
        
        // 统计词汇数量
        if (record.sentences) {
          record.sentences.forEach(sentence => {
            if (sentence.vocabulary) {
              dayData.wordCount += sentence.vocabulary.length
            }
          })
        }

        dayData.activities.push({
          time: this.formatTime(new Date(record.createTime)),
          type: 'parse',
          title: record.title || '解析内容',
          content: `解析了${record.sentences ? record.sentences.length : 0}个句子`,
          wordCount: record.sentences ? 
            record.sentences.reduce((sum, s) => sum + (s.vocabulary ? s.vocabulary.length : 0), 0) : 0
        })
      })

      // 转换为数组并排序
      const timeline = Array.from(dailyData.values())
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      // 计算连续学习天数
      const today = new Date().toDateString()
      let currentDate = new Date()
      consecutiveDays = 0

      while (consecutiveDays < 365) { // 最多检查365天
        const dateStr = currentDate.toDateString()
        if (dailyData.has(dateStr)) {
          consecutiveDays++
          currentDate.setDate(currentDate.getDate() - 1)
        } else if (dateStr === today) {
          // 今天没有学习记录，但继续检查昨天
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          break
        }
      }

      this.setData({
        learningTimeline: timeline,
        totalStudyDays: dailyData.size,
        consecutiveDays: consecutiveDays
      })

      console.log(`📊 学习轨迹: 总计${dailyData.size}天, 连续${consecutiveDays}天`)

    } catch (error) {
      console.error('加载学习时间线失败:', error)
    }
  },

  // 加载今日进度
  async loadTodayProgress() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 获取今日解析记录
      const todayParsed = await db.collection('japanese_parser_history')
        .where({
          createTime: db.command.gte(today).and(db.command.lt(tomorrow))
        })
        .get()

      let newWords = 0
      let structures = 0

      todayParsed.data.forEach(record => {
        if (record.sentences) {
          record.sentences.forEach(sentence => {
            if (sentence.vocabulary) {
              newWords += sentence.vocabulary.length
            }
            if (sentence.structure) {
              structures++
            }
          })
        }
      })

      this.setData({
        todayProgress: {
          parsed: todayParsed.data.length,
          learned: 0, // 暂时没有单独的学习记录
          reviewed: 0, // 暂时没有单独的复习记录
          newWords: newWords,
          structures: structures
        }
      })

    } catch (error) {
      console.error('加载今日进度失败:', error)
    }
  },

  // 加载周统计
  async loadWeeklyStats() {
    try {
      const weekData = []
      const today = new Date()
      let weekTotalCount = 0
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const dayRecords = await db.collection('japanese_parser_history')
          .where({
            createTime: db.command.gte(date).and(db.command.lt(nextDate))
          })
          .get()

        let wordCount = 0
        dayRecords.data.forEach(record => {
          if (record.sentences) {
            record.sentences.forEach(sentence => {
              if (sentence.vocabulary) {
                wordCount += sentence.vocabulary.length
              }
            })
          }
        })

        weekTotalCount += dayRecords.data.length

        weekData.push({
          date: this.formatShortDate(date),
          count: dayRecords.data.length,
          words: wordCount,
          active: dayRecords.data.length > 0,
          barHeight: Math.max(10, (dayRecords.data.length / 5) * 60)
        })
      }

      // 计算总统计
      const { learningTimeline } = this.data
      let totalParseCount = 0
      let totalWordCount = 0
      let totalStructureCount = 0

      learningTimeline.forEach(day => {
        totalParseCount += day.parseCount
        totalWordCount += day.wordCount
        totalStructureCount += day.structureCount
      })

      this.setData({ 
        weeklyStats: weekData,
        weekTotalCount,
        totalParseCount,
        totalWordCount,
        totalStructureCount
      })

    } catch (error) {
      console.error('加载周统计失败:', error)
    }
  },

  // 加载成就数据
  async loadAchievements() {
    try {
      const { totalStudyDays, consecutiveDays } = this.data
      
      // 获取词汇库统计
      const vocabularyCount = await db.collection('vocabulary_integrated').count()
      const structureCount = await db.collection('sentence_structures_integrated').count()
      
      const achievements = [
        {
          id: 'first_parse',
          title: '初次解析',
          description: '完成第一次句子解析',
          icon: '🌟',
          unlocked: totalStudyDays > 0,
          progress: totalStudyDays > 0 ? 100 : 0,
          progressText: totalStudyDays > 0 ? 100 : 0
        },
        {
          id: 'consecutive_7',
          title: '坚持一周',
          description: '连续学习7天',
          icon: '🔥',
          unlocked: consecutiveDays >= 7,
          progress: Math.min(100, (consecutiveDays / 7) * 100),
          progressText: Math.round(Math.min(100, (consecutiveDays / 7) * 100))
        },
        {
          id: 'consecutive_30',
          title: '坚持一月',
          description: '连续学习30天',
          icon: '💪',
          unlocked: consecutiveDays >= 30,
          progress: Math.min(100, (consecutiveDays / 30) * 100),
          progressText: Math.round(Math.min(100, (consecutiveDays / 30) * 100))
        },
        {
          id: 'words_100',
          title: '词汇收集家',
          description: '收集100个词汇',
          icon: '📚',
          unlocked: vocabularyCount.total >= 100,
          progress: Math.min(100, (vocabularyCount.total / 100) * 100),
          progressText: Math.round(Math.min(100, (vocabularyCount.total / 100) * 100))
        },
        {
          id: 'words_500',
          title: '词汇大师',
          description: '收集500个词汇',
          icon: '🎓',
          unlocked: vocabularyCount.total >= 500,
          progress: Math.min(100, (vocabularyCount.total / 500) * 100),
          progressText: Math.round(Math.min(100, (vocabularyCount.total / 500) * 100))
        },
        {
          id: 'structures_50',
          title: '语法专家',
          description: '掌握50个句子结构',
          icon: '🧠',
          unlocked: structureCount.total >= 50,
          progress: Math.min(100, (structureCount.total / 50) * 100),
          progressText: Math.round(Math.min(100, (structureCount.total / 50) * 100))
        }
      ]

      this.setData({ achievements })

    } catch (error) {
      console.error('加载成就失败:', error)
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab)
    this.setData({ currentTab: tab })
  },

  // 切换详情显示
  toggleDetail(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const key = `showDetail[${index}]`
    this.setData({
      [key]: !this.data.showDetail[index]
    })
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

  // 格式化时间
  formatTime(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  },

  // 格式化短日期
  formatShortDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadLearningProgress().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})