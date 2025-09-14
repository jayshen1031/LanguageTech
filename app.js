// app.js
const userService = require('./utils/userService')

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 延迟初始化云开发环境，等待登录状态稳定
    setTimeout(() => {
      this.initCloudDev()
    }, 1000)

    // 初始化用户服务
    this.initUserService()
  },

  // 初始化用户服务
  async initUserService() {
    try {
      await userService.init()
      this.globalData.userService = userService
      this.globalData.isLoggedIn = userService.checkLoginStatus()
      this.globalData.userInfo = userService.getUserInfo()
      this.globalData.userProfile = userService.getProfile()
      
      // 如果用户已登录，启动自动同步
      if (this.globalData.isLoggedIn) {
        this.startAutoSync()
      }
    } catch (error) {
      console.error('初始化用户服务失败:', error)
    }
  },

  // 启动自动同步
  startAutoSync() {
    // 每30分钟自动同步一次学习数据
    setInterval(async () => {
      try {
        await this.globalData.userService.autoSync()
      } catch (error) {
        console.error('自动同步失败:', error)
      }
    }, 1800000) // 30分钟
  },

  // 云开发初始化方法
  initCloudDev() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    try {
      wx.cloud.init({
        env: 'cloud1-2g49srond2b01891',
        traceUser: true,
      })
      // 云开发环境初始化成功
      this.globalData.cloudReady = true
    } catch (error) {
      console.error('云开发初始化失败:', error)
      // 重试初始化
      setTimeout(() => {
        try {
          wx.cloud.init({
            env: 'cloud1-2g49srond2b01891',
            traceUser: true,
          })
          // 云开发环境重试初始化成功
          this.globalData.cloudReady = true
        } catch (retryError) {
          console.error('云开发重试初始化失败:', retryError)
          this.globalData.cloudReady = false
        }
      }, 3000)
    }
  },

  // 获取云开发实例的方法
  getCloud() {
    return wx.cloud
  },

  globalData: {
    userInfo: null,
    userProfile: null,
    userService: null,
    isLoggedIn: false,
    apiBase: 'https://api.languagetech.com',
    todayWords: [],
    reviewWords: [],
    cloudReady: false,
    learningProgress: {
      totalWords: 0,
      masteredWords: 0,
      studyDays: 0,
      lastStudyDate: null
    }
  }
})