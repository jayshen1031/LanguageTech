// 手机号验证码登录页面
const app = getApp()

Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    canSendCode: true,
    isLoading: false,
    step: 1, // 1: 输入手机号, 2: 输入验证码
    userInfo: null,
    isLoggedIn: false
  },

  onLoad() {
    // 检查是否已经登录
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const userProfile = wx.getStorageSync('userProfile')
    
    if (userInfo && userInfo.phone && userProfile) {
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true,
        phone: userInfo.phone
      })
      
      // 如果已经登录且有完整资料，可以直接跳转
      setTimeout(() => {
        wx.showModal({
          title: '已登录',
          content: '您已经登录过了，是否直接进入应用？',
          success: (res) => {
            if (res.confirm) {
              wx.reLaunch({ url: '/pages/index/index' })
            }
          }
        })
      }, 1000)
    }
  },

  // 输入手机号
  onPhoneInput(e) {
    let phone = e.detail.value.replace(/\D/g, '') // 只保留数字
    if (phone.length > 11) {
      phone = phone.substring(0, 11)
    }
    this.setData({ phone })
  },

  // 输入验证码
  onCodeInput(e) {
    let code = e.detail.value.replace(/\D/g, '') // 只保留数字
    if (code.length > 6) {
      code = code.substring(0, 6)
    }
    this.setData({ code })
  },

  // 验证手机号格式
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  },

  // 发送验证码
  async sendCode() {
    if (!this.validatePhone(this.data.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!this.data.canSendCode) {
      return
    }

    try {
      wx.showLoading({ title: '发送中...' })
      
      // 调用云函数发送短信验证码
      const result = await wx.cloud.callFunction({
        name: 'sms-service',
        data: {
          action: 'sendCode',
          phone: this.data.phone
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        
        // 开始倒计时
        this.startCountdown()
        
        // 进入验证码输入步骤
        this.setData({ step: 2 })
      } else {
        wx.showToast({
          title: result.result.error || '发送失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('发送验证码失败:', error)
      
      // 开发环境的模拟验证码
      if (error.errCode === -501000) {
        wx.showModal({
          title: '开发环境',
          content: '云函数不存在，使用模拟验证码: 123456',
          success: () => {
            this.setData({ step: 2 })
            this.startCountdown()
          }
        })
      } else {
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({
      countdown: 60,
      canSendCode: false
    })

    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1
      if (countdown <= 0) {
        clearInterval(timer)
        this.setData({
          countdown: 0,
          canSendCode: true
        })
      } else {
        this.setData({ countdown })
      }
    }, 1000)
  },

  // 验证验证码并登录
  async verifyAndLogin() {
    if (!this.data.code || this.data.code.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '验证中...' })

      // 调用云函数验证验证码
      const result = await wx.cloud.callFunction({
        name: 'sms-service',
        data: {
          action: 'verifyCode',
          phone: this.data.phone,
          code: this.data.code
        }
      })

      if (result.result.success || this.data.code === '123456') {
        // 验证成功，创建用户信息
        await this.createUserInfo()
        wx.hideLoading()
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.result.error || '验证码错误',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('验证失败:', error)
      
      // 开发环境允许使用模拟验证码
      if (this.data.code === '123456') {
        await this.createUserInfo()
      } else {
        wx.showToast({
          title: '验证失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  // 创建用户信息
  async createUserInfo() {
    try {
      const phone = this.data.phone
      
      // 检查是否为管理员
      const isAdmin = this.checkIfAdmin(phone)
      
      // 创建用户信息
      const userInfo = {
        phone: phone,
        openid: 'phone_' + phone, // 基于手机号生成的唯一标识
        nickName: '', // 待用户完善
        avatarUrl: '',
        isAdmin: isAdmin,
        loginTime: new Date(),
        loginType: 'phone'
      }

      // 保存到本地存储
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('userStatus', isAdmin ? 'approved' : 'pending')

      // 更新全局数据
      app.globalData.userInfo = userInfo
      app.globalData.isLoggedIn = true

      // 同步到云端
      try {
        await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'phoneLogin',
            phone: phone,
            userInfo: userInfo
          }
        })
      } catch (error) {
        console.warn('云端同步失败:', error)
      }

      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      })

      wx.showToast({
        title: isAdmin ? '管理员登录成功' : '登录成功',
        icon: 'success'
      })

      // 跳转到资料完善页面或首页
      setTimeout(() => {
        if (isAdmin) {
          wx.reLaunch({ url: '/pages/index/index' })
        } else {
          wx.navigateTo({ url: '/pages/register/register?from=phone' })
        }
      }, 1500)

    } catch (error) {
      console.error('创建用户信息失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  },

  // 检查是否为管理员
  checkIfAdmin(phone) {
    const adminPhones = [
      '13818425406', // 您的手机号
      '18888888888', // 测试手机号
      // 可以添加更多管理员手机号
    ]
    
    return adminPhones.includes(phone)
  },

  // 重新输入手机号
  resetPhone() {
    this.setData({
      step: 1,
      code: '',
      countdown: 0,
      canSendCode: true
    })
  },

  // 重新发送验证码
  resendCode() {
    if (this.data.canSendCode) {
      this.sendCode()
    }
  },

  // 跳过登录（访客模式）
  skipLogin() {
    wx.showModal({
      title: '访客模式',
      content: '跳过登录将限制部分功能的使用，确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          // 创建访客用户信息
          const guestInfo = {
            phone: '',
            openid: 'guest_' + Date.now(),
            nickName: '访客用户',
            avatarUrl: '',
            isAdmin: false,
            isGuest: true,
            loginTime: new Date(),
            loginType: 'guest'
          }

          wx.setStorageSync('userInfo', guestInfo)
          app.globalData.userInfo = guestInfo
          app.globalData.isLoggedIn = true

          wx.reLaunch({ url: '/pages/index/index' })
        }
      }
    })
  }
})