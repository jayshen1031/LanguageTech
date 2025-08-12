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
    progressPercent: 0,
    showDevTools: true, // 显示开发工具
    gridCols: 4 // 默认4列布局
  },

  onLoad() {
    this.getUserInfo()
    this.loadStudyData()
    this.loadUserPreferences()
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
          avatarUrl: ''
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
    wx.switchTab({
      url: '/pages/learn/learn'
    })
  },

  // 跳转到复习页
  goToReview() {
    wx.navigateTo({
      url: '/pages/review/review'
    })
  },


  // 跳转到语法学习计划
  goToGrammarStudy() {
    wx.navigateTo({
      url: '/pages/grammar-study/grammar-study'
    })
  },

  // 跳转到语法库
  goToGrammarLibrary() {
    wx.navigateTo({
      url: '/pages/grammar-library/grammar-library'
    })
  },

  
  
  
  // 跳转到假名对照学习
  goToKanaMerged() {
    wx.navigateTo({
      url: '/pages/kana-merged/kana-merged'
    })
  },
  
  // 跳转到生词本
  goToWordbook() {
    wx.switchTab({
      url: '/pages/wordbook/wordbook'
    })
  },
  
  // 加载用户偏好设置
  loadUserPreferences() {
    try {
      const gridCols = wx.getStorageSync('gridCols') || 4;
      this.setData({ gridCols });
    } catch (error) {
      console.log('加载用户偏好失败:', error);
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
      console.log('保存用户偏好失败:', error);
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

  // 跳转到日语解析工具
  goToParser() {
    wx.navigateTo({
      url: '/pages/japanese-parser/japanese-parser'
    })
  },
  
  // 跳转到解析复习
  goToParserReview() {
    wx.navigateTo({
      url: '/pages/parser-review/parser-review'
    })
  },


  // 跳转到语音对话页面
  goToVoiceDialogue() {
    wx.navigateTo({
      url: '/pages/voice-dialogue/voice-dialogue'
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
  }
})