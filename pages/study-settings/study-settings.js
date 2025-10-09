// 学习设置页面
Page({
  data: {
    // 词汇设置
    vocabularySettings: {
      totalCount: 10,
      newWordPercent: 70,
      reviewPercent: 30
    },

    // 语法结构设置
    structureSettings: {
      totalCount: 5,
      newStructurePercent: 60,
      reviewPercent: 40
    },

    // 学习目标设置
    studyGoals: {
      dailyVocabulary: 10,
      dailyStructures: 5,
      studyTime: 30, // 分钟
      weeklyGoal: 70 // 词汇数
    },

    // 复习间隔设置
    reviewSettings: {
      firstReview: 1,  // 1天后
      secondReview: 3, // 3天后
      thirdReview: 7,  // 7天后
      finalReview: 15  // 15天后
    },

    // 统计数据
    stats: {
      totalVocabulary: 0,
      masteredVocabulary: 0,
      totalStructures: 0,
      masteredStructures: 0
    },

    // 来源标签相关
    availableTags: [],
    selectedTag: '',

    // 学习次数要求
    requiredLearningCount: 5 // 默认5次
  },

  onLoad() {
    this.loadSettings()
    this.loadStats()
    this.loadAvailableTags()
  },

  // 加载设置
  loadSettings() {
    try {
      const studyPlanConfig = wx.getStorageSync('studyPlanConfig') || {}
      const userPreferences = wx.getStorageSync('userPreferences') || {}

      // 加载学习次数要求
      const requiredCount = wx.getStorageSync('requiredLearningCount') || 5

      // 合并设置
      this.setData({
        vocabularySettings: {
          totalCount: studyPlanConfig.selectedTotal || 10,
          newWordPercent: studyPlanConfig.newWordPercent || 70,
          reviewPercent: studyPlanConfig.reviewPercent || 30
        },
        structureSettings: userPreferences.structureSettings || this.data.structureSettings,
        studyGoals: userPreferences.studyGoals || this.data.studyGoals,
        reviewSettings: userPreferences.reviewSettings || this.data.reviewSettings,
        selectedTag: studyPlanConfig.selectedTag || '',
        requiredLearningCount: requiredCount
      })
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  },

  // 加载可用的来源标签
  async loadAvailableTags() {
    try {
      const tags = new Set()

      // 优先从云数据库获取
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        const db = wx.cloud.database()
        const res = await db.collection('japanese_parser_history')
          .field({ categoryTag: true })
          .get()

        res.data.forEach(record => {
          if (record.categoryTag && record.categoryTag.trim()) {
            tags.add(record.categoryTag.trim())
          }
        })
      }

      // 从本地存储获取
      const localHistory = wx.getStorageSync('parser_history') || []
      localHistory.forEach(item => {
        if (item.categoryTag && item.categoryTag.trim()) {
          tags.add(item.categoryTag.trim())
        }
      })

      this.setData({
        availableTags: Array.from(tags).sort()
      })
    } catch (error) {
      console.error('加载可用标签失败:', error)
    }
  },

  // 选择来源标签
  onSelectTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ selectedTag: tag })
  },

  // 加载统计数据
  async loadStats() {
    try {
      const db = wx.cloud.database()
      
      // 获取词汇统计
      const vocabRes = await db.collection('vocabulary_integrated').count()
      const masteredVocabRes = await db.collection('vocabulary_integrated')
        .where({ totalOccurrences: db.command.gte(3) })
        .count()
      
      // 获取语法结构统计
      const structureRes = await db.collection('sentence_structures_integrated').count()
      const masteredStructureRes = await db.collection('sentence_structures_integrated')
        .where({ totalOccurrences: db.command.gte(3) })
        .count()
      
      this.setData({
        'stats.totalVocabulary': vocabRes.total,
        'stats.masteredVocabulary': masteredVocabRes.total,
        'stats.totalStructures': structureRes.total,
        'stats.masteredStructures': masteredStructureRes.total
      })
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  },

  // 词汇数量调节
  onVocabularyCountChange(e) {
    const value = parseInt(e.detail.value)
    this.setData({
      'vocabularySettings.totalCount': value
    })
    this.updateVocabularyBreakdown()
  },

  // 词汇新学比例调节
  onNewWordPercentChange(e) {
    const value = parseInt(e.detail.value)
    this.setData({
      'vocabularySettings.newWordPercent': value,
      'vocabularySettings.reviewPercent': 100 - value
    })
    this.updateVocabularyBreakdown()
  },

  // 语法结构数量调节
  onStructureCountChange(e) {
    const value = parseInt(e.detail.value)
    this.setData({
      'structureSettings.totalCount': value
    })
  },

  // 语法结构新学比例调节
  onNewStructurePercentChange(e) {
    const value = parseInt(e.detail.value)
    this.setData({
      'structureSettings.newStructurePercent': value,
      'structureSettings.reviewPercent': 100 - value
    })
  },

  // 更新词汇分配
  updateVocabularyBreakdown() {
    const { totalCount, newWordPercent } = this.data.vocabularySettings
    const newCount = Math.floor(totalCount * newWordPercent / 100)
    const reviewCount = totalCount - newCount

    this.setData({
      vocabularyBreakdown: { newCount, reviewCount }
    })
  },

  // 学习次数要求调节
  onRequiredCountChange(e) {
    const value = parseInt(e.detail.value)
    this.setData({
      requiredLearningCount: value
    })
    console.log('学习次数要求已更新:', value)
  },

  // 保存设置
  saveSettings() {
    try {
      // 保存到本地存储
      const studyPlanConfig = {
        selectedTotal: this.data.vocabularySettings.totalCount,
        newWordPercent: this.data.vocabularySettings.newWordPercent,
        reviewPercent: this.data.vocabularySettings.reviewPercent,
        selectedTag: this.data.selectedTag,
        availableTotals: [5, 10, 15, 20, 30],
        lastUpdated: new Date()
      }

      const userPreferences = {
        structureSettings: this.data.structureSettings,
        studyGoals: this.data.studyGoals,
        reviewSettings: this.data.reviewSettings,
        lastUpdated: new Date()
      }

      // 保存学习次数要求
      wx.setStorageSync('requiredLearningCount', this.data.requiredLearningCount)

      wx.setStorageSync('studyPlanConfig', studyPlanConfig)
      wx.setStorageSync('userPreferences', userPreferences)

      wx.showToast({
        title: '设置已保存',
        icon: 'success'
      })

      // 延迟返回，让用户看到保存成功的提示
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)

    } catch (error) {
      console.error('保存设置失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 恢复默认设置
  resetToDefault() {
    wx.showModal({
      title: '恢复默认',
      content: '确定要恢复所有设置为默认值吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            vocabularySettings: {
              totalCount: 10,
              newWordPercent: 70,
              reviewPercent: 30
            },
            structureSettings: {
              totalCount: 5,
              newStructurePercent: 60,
              reviewPercent: 40
            },
            studyGoals: {
              dailyVocabulary: 10,
              dailyStructures: 5,
              studyTime: 30,
              weeklyGoal: 70
            },
            reviewSettings: {
              firstReview: 1,
              secondReview: 3,
              thirdReview: 7,
              finalReview: 15
            }
          })
          
          wx.showToast({
            title: '已恢复默认',
            icon: 'success'
          })
        }
      }
    })
  }
})