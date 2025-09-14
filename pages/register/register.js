// 用户注册页面
const app = getApp()

Page({
  data: {
    userInfo: null,
    nickname: '',
    learningGoal: 'daily', // daily, exam, business, travel
    studyTimePerDay: 30, // 分钟
    currentLevel: 'beginner', // beginner, intermediate, advanced
    isLoggedIn: false,
    hasUserProfile: false
  },

  onLoad() {
    // 检查登录状态
    this.checkLoginStatus()
  },

  // 检查用户登录状态
  async checkLoginStatus() {
    try {
      // 获取本地存储的用户信息
      const userInfo = wx.getStorageSync('userInfo')
      const userProfile = wx.getStorageSync('userProfile')
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          isLoggedIn: true,
          hasUserProfile: !!userProfile
        })
        
        if (userProfile) {
          this.setData({
            nickname: userProfile.nickname,
            learningGoal: userProfile.learningGoal,
            studyTimePerDay: userProfile.studyTimePerDay,
            currentLevel: userProfile.currentLevel
          })
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
    }
  },

  // 微信授权登录
  async onWechatLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      
      // 获取微信授权
      const loginRes = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'login'
        }
      })

      if (loginRes.result.success) {
        const userInfo = loginRes.result.data
        
        // 保存用户信息到本地存储
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('openid', userInfo.openid)
        
        this.setData({
          userInfo: userInfo,
          isLoggedIn: true,
          nickname: userInfo.nickName || ''
        })
        
        // 更新全局用户信息
        app.globalData.userInfo = userInfo
        
        wx.hideLoading()
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('微信登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  // 选择学习目标
  onLearningGoalChange(e) {
    this.setData({
      learningGoal: e.detail.value
    })
  },

  // 学习时长改变
  onStudyTimeChange(e) {
    this.setData({
      studyTimePerDay: parseInt(e.detail.value)
    })
  },

  // 选择当前水平
  onLevelChange(e) {
    this.setData({
      currentLevel: e.detail.value
    })
  },

  // 完成注册/更新资料
  async onCompleteProfile() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!this.data.nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const userProfile = {
        nickname: this.data.nickname.trim(),
        learningGoal: this.data.learningGoal,
        studyTimePerDay: this.data.studyTimePerDay,
        currentLevel: this.data.currentLevel,
        registerTime: new Date(),
        updateTime: new Date()
      }

      // 调用云函数保存用户资料
      const result = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'updateProfile',
          profile: userProfile
        }
      })

      if (result.result.success) {
        // 保存到本地存储
        wx.setStorageSync('userProfile', userProfile)
        
        this.setData({
          hasUserProfile: true
        })

        wx.hideLoading()
        wx.showToast({
          title: this.data.hasUserProfile ? '资料已更新' : '注册成功',
          icon: 'success'
        })

        // 延迟跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 1500)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('保存用户资料失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 跳过注册
  onSkipRegister() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 退出登录
  async onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出登录后，学习记录将只保存在本地',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userProfile')
          wx.removeStorageSync('openid')
          
          // 重置页面数据
          this.setData({
            userInfo: null,
            isLoggedIn: false,
            hasUserProfile: false,
            nickname: ''
          })
          
          // 清除全局用户信息
          app.globalData.userInfo = null
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  }
})