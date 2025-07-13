const app = getApp()

Page({
  data: {
    userInfo: {},
    studyDays: 0,
    todayCompleted: false,
    totalWords: 0,
    masteredWords: 0,
    todayWords: 5,
    reviewCount: 0,
    progressPercent: 0
  },

  onLoad() {
    this.getUserInfo()
    this.loadStudyData()
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadStudyData()
  },

  getUserInfo() {
    // 获取用户信息
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    } else {
      // 使用默认用户信息
      this.setData({
        userInfo: {
          nickName: '语伴君用户',
          avatarUrl: '/images/default-avatar.png'
        }
      })
    }
  },

  loadStudyData() {
    // 加载学习数据（这里使用模拟数据）
    const studyData = {
      studyDays: 15,
      todayCompleted: false,
      totalWords: 150,
      masteredWords: 85,
      todayWords: 5,
      reviewCount: 12
    }

    // 计算进度百分比
    const progressPercent = Math.round((studyData.masteredWords / studyData.totalWords) * 100)

    this.setData({
      ...studyData,
      progressPercent
    })

    // 存储到全局数据
    app.globalData.learningProgress = {
      totalWords: studyData.totalWords,
      masteredWords: studyData.masteredWords,
      studyDays: studyData.studyDays,
      lastStudyDate: new Date().toDateString()
    }
  },

  // 跳转到学习页
  goToLearn() {
    wx.navigateTo({
      url: '/pages/learn/learn'
    })
  },

  // 跳转到复习页
  goToReview() {
    wx.navigateTo({
      url: '/pages/review/review'
    })
  },

  // 跳转到对话页
  goToDialogue() {
    wx.navigateTo({
      url: '/pages/dialogue/dialogue'
    })
  },

  // 跳转到AI语法讲解
  goToAIGrammar() {
    wx.navigateTo({
      url: '/pages/ai-grammar/ai-grammar'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStudyData()
    wx.stopPullDownRefresh()
  }
})