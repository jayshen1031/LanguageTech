// app.js
const userService = require('./utils/userService')

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 立即初始化云开发环境，不延迟
    this.initCloudDev()

    // 初始化用户服务
    this.initUserService()
  },

  // 初始化用户服务
  async initUserService() {
    try {
      await userService.init()
      this.globalData.userService = userService
      this.globalData.isLoggedIn = userService.checkLoginStatus()
      
      // 确保头像数据同步
      const userInfo = userService.getUserInfo()
      const userProfile = userService.getProfile()
      
      // 头像信息同步
      if (userInfo && userProfile) {
        if (userInfo.avatarUrl && !userProfile.avatarUrl) {
          userProfile.avatarUrl = userInfo.avatarUrl
          wx.setStorageSync('userProfile', userProfile)
        } else if (userProfile.avatarUrl && !userInfo.avatarUrl) {
          userInfo.avatarUrl = userProfile.avatarUrl
          wx.setStorageSync('userInfo', userInfo)
        }
      }
      
      this.globalData.userInfo = userInfo
      this.globalData.userProfile = userProfile
      
      // 如果用户已登录，启动时从云端同步一次数据
      if (this.globalData.isLoggedIn) {
        this.syncDataFromCloud()
      }
    } catch (error) {
      console.error('初始化用户服务失败:', error)
    }
  },


  // 从云端同步数据
  async syncDataFromCloud() {
    try {
      console.log('📥 启动时从云端同步学习数据...')
      const result = await this.globalData.userService.syncFromCloud()
      if (result.success && !result.localOnly) {
        console.log('✅ 云端数据同步成功')
      } else if (result.localOnly) {
        console.log('📱 使用本地数据')
      } else {
        console.log('❌ 云端数据同步失败:', result.error)
      }
    } catch (error) {
      console.error('从云端同步数据失败:', error)
    }
  },

  // 云开发初始化方法
  initCloudDev() {
    if (!wx.cloud) {
      console.error('❌ 请使用 2.2.3 或以上的基础库以使用云能力')
      this.globalData.cloudReady = false
      return
    }

    console.log('🔄 开始初始化云开发...')
    this.doCloudInit()
  },

  // 执行云开发初始化
  doCloudInit() {
    try {
      wx.cloud.init({
        env: 'cloud1-2g49srond2b01891',
        traceUser: true
      })
      
      this.globalData.cloudReady = true
      console.log('✅ 云开发初始化成功')
      
      // 验证云开发是否正常工作
      this.verifyCloudFunction()
    } catch (error) {
      console.error('❌ 云开发初始化失败:', error)
      
      // 重试初始化（不追踪用户）
      console.log('🔄 尝试重试初始化...')
      setTimeout(() => {
        try {
          wx.cloud.init({
            env: 'cloud1-2g49srond2b01891',
            traceUser: false
          })
          
          this.globalData.cloudReady = true
          console.log('✅ 云开发重试初始化成功')
          this.verifyCloudFunction()
        } catch (retryError) {
          console.error('❌ 云开发重试初始化失败:', retryError)
          this.globalData.cloudReady = false
        }
      }, 2000)
    }
  },

  // 验证云函数是否可用
  async verifyCloudFunction() {
    try {
      console.log('🔍 验证云函数连接...')
      const result = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'ping'
        }
      })
      console.log('✅ 云函数连接正常')
    } catch (error) {
      console.warn('⚠️ 云函数连接测试失败:', error.message)
      // 不影响应用启动，只是记录警告
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