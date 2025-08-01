// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo

              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    })

    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-2g49srond2b01891',
        traceUser: true,
      })
      console.log('云开发环境初始化成功')
    }
  },

  // 获取云开发实例的方法
  getCloud() {
    return wx.cloud
  },

  globalData: {
    userInfo: null,
    apiBase: 'https://api.languagetech.com',
    todayWords: [],
    reviewWords: [],
    learningProgress: {
      totalWords: 0,
      masteredWords: 0,
      studyDays: 0,
      lastStudyDate: null
    }
  }
})