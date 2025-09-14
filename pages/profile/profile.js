const audioCache = require('../../utils/audioCache')
const app = getApp()

Page({
  data: {
    cacheStats: {
      fileCount: 0,
      totalSizeMB: '0.00'
    },
    userInfo: null,
    userProfile: null,
    isLoggedIn: false,
    learningStats: {
      studyDays: 0,
      totalWords: 0,
      masteredWords: 0,
      todayStudyTime: 0
    }
  },

  onLoad() {
    // 初始化云环境
    wx.cloud.init({
      env: 'cloud1-2g49srond2b01891'
    })
    
    // 获取缓存统计
    this.updateCacheStats()
    
    // 加载用户信息
    this.loadUserInfo()
    
    // 加载学习统计
    this.loadLearningStats()
  },
  
  onShow() {
    // 每次显示页面时更新缓存统计
    this.updateCacheStats()
    
    // 重新加载用户信息（可能在注册页面更新了）
    this.loadUserInfo()
    this.loadLearningStats()
  },
  
  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const userProfile = wx.getStorageSync('userProfile')
      
      this.setData({
        userInfo: userInfo,
        userProfile: userProfile,
        isLoggedIn: !!userInfo
      })
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },
  
  // 加载学习统计
  loadLearningStats() {
    try {
      const learningProgress = wx.getStorageSync('learningProgress') || {}
      const userVocabulary = wx.getStorageSync('userVocabulary') || []
      const studyHistory = wx.getStorageSync('studyHistory') || []
      
      // 计算掌握的词汇数量
      const masteredWords = userVocabulary.filter(word => 
        word.masteryLevel >= 4
      ).length
      
      // 计算学习天数
      const studyDates = [...new Set(studyHistory.map(record => 
        new Date(record.date).toDateString()
      ))]
      
      // 计算今日学习时间（分钟）
      const today = new Date().toDateString()
      const todayRecords = studyHistory.filter(record => 
        new Date(record.date).toDateString() === today
      )
      const todayStudyTime = todayRecords.reduce((total, record) => 
        total + (record.studyTime || 0), 0
      )
      
      this.setData({
        learningStats: {
          studyDays: studyDates.length,
          totalWords: userVocabulary.length,
          masteredWords: masteredWords,
          todayStudyTime: Math.round(todayStudyTime)
        }
      })
    } catch (error) {
      console.error('加载学习统计失败:', error)
    }
  },
  
  // 跳转到注册/登录页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },
  
  // 跳转到掌握程度统计页面
  goToMasteryStats() {
    wx.navigateTo({
      url: '/pages/mastery-stats/mastery-stats'
    })
  },
  
  // 同步学习数据
  async syncLearningData() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: '同步中...' })
      
      const result = await app.globalData.userService.syncLearningDataToCloud()
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '同步失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('同步学习数据失败:', error)
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  },
  
  // 更新缓存统计信息
  updateCacheStats() {
    const stats = audioCache.getCacheStats()
    this.setData({
      cacheStats: stats
    })
  },
  
  // 清理音频缓存
  clearAudioCache() {
    wx.showModal({
      title: '清理缓存',
      content: `确定要清理所有音频缓存吗？当前缓存：${this.data.cacheStats.fileCount}个文件，${this.data.cacheStats.totalSizeMB}MB`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' })
          
          const result = await audioCache.clearAllCache()
          
          wx.hideLoading()
          
          if (result) {
            wx.showToast({
              title: '清理成功',
              icon: 'success'
            })
            
            // 更新统计信息
            this.updateCacheStats()
          } else {
            wx.showToast({
              title: '清理失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})