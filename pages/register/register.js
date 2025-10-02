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
    hasUserProfile: false,
    agreedToTerms: false // 是否同意条款
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
  onWechatLogin(e) {
    console.log('用户授权信息:', e.detail)
    
    // 检查用户是否同意授权
    if (e.detail.errMsg === 'getUserInfo:ok') {
      // 获取登录凭证
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            try {
              // 使用按钮返回的用户信息
              const userInfo = {
                openid: 'temp_' + Date.now(), // 临时openid
                nickName: e.detail.userInfo.nickName,
                avatarUrl: e.detail.userInfo.avatarUrl,
                code: loginRes.code,
                loginTime: new Date()
              }
              
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
              
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              })
            } catch (error) {
              console.error('保存用户信息失败:', error)
              wx.showToast({
                title: '登录失败，请重试',
                icon: 'none'
              })
            }
          } else {
            wx.showToast({
              title: '获取登录凭证失败',
              icon: 'none'
            })
          }
        },
        fail: (error) => {
          console.error('微信登录失败:', error)
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
        }
      })
    } else if (e.detail.errMsg === 'getUserInfo:fail auth deny') {
      // 用户拒绝授权
      wx.showToast({
        title: '需要授权才能登录',
        icon: 'none'
      })
    } else {
      // 其他错误
      console.error('获取用户信息失败:', e.detail)
      wx.showToast({
        title: '获取用户信息失败',
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

    // 验证必填信息
    if (!this.validateProfile()) {
      return
    }

    try {
      wx.showLoading({ title: '提交申请中...' })

      const userInfo = wx.getStorageSync('userInfo')
      const profileData = {
        nickname: this.data.nickname.trim(),
        learningGoal: this.data.learningGoal,
        studyTimePerDay: this.data.studyTimePerDay,
        currentLevel: this.data.currentLevel,
        // 添加用户头像信息
        avatarUrl: userInfo ? userInfo.avatarUrl : '',
        // 添加更多注册信息
        deviceInfo: this.getDeviceInfo(),
        appVersion: this.getAppVersion()
      }

      // 管理员审核系统：检查是否为管理员
      const isAdmin = this.checkIfAdmin(userInfo)
      
      const userStatus = isAdmin ? 'approved' : 'pending'
      
      // 保存到本地存储
      wx.setStorageSync('userProfile', profileData)
      wx.setStorageSync('userStatus', userStatus)
      
      // 更新app全局数据
      const app = getApp()
      if (app.globalData) {
        app.globalData.userProfile = profileData
        console.log('✅ 已更新app.globalData.userProfile:', profileData)
      }
      
      // 如果不是管理员，保存到注册列表供管理员审核
      if (!isAdmin) {
        this.saveToRegistrationList(userInfo, profileData)
      }
      
      this.setData({
        hasUserProfile: true
      })

      wx.hideLoading()
      
      // 根据状态跳转到不同页面
      if (userStatus === 'approved') {
        wx.showToast({
          title: isAdmin ? '管理员自动通过' : '注册成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }, 1500)
      } else {
        wx.showToast({
          title: '申请已提交，等待管理员审核',
          icon: 'success'
        })
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/approval-status/approval-status?status=${userStatus}`
          })
        }, 1500)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('用户注册失败:', error)
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
    }
  },

  // 检查是否为管理员
  checkIfAdmin(userInfo) {
    if (!userInfo) return false
    
    // 管理员判断逻辑：根据昵称或其他标识
    const adminNicknames = [
      '项目负责人', 
      '管理员',
      'Jay',
      'Admin',
      // 请在这里添加您的微信昵称作为管理员
    ]
    
    if (adminNicknames.includes(userInfo.nickName)) {
      return true
    }
    
    // 通过openid判断（您的特定openid可以设为管理员）
    // 注意：temp_开头的都是临时openid，仅用于开发测试
    if (userInfo.openid && userInfo.openid.includes('temp_')) {
      return true
    }
    
    return false
  },

  // 保存到注册列表供管理员审核
  saveToRegistrationList(userInfo, profileData) {
    try {
      // 获取现有的注册列表
      let registrationList = wx.getStorageSync('registrationList') || []
      
      // 创建注册记录
      const registrationRecord = {
        id: 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        userInfo: userInfo,
        profile: profileData,
        status: 'pending', // pending, approved, rejected
        submitTime: new Date().toISOString(),
        approveTime: null,
        approvedBy: null
      }
      
      // 检查是否已经存在相同openid的申请
      const existingIndex = registrationList.findIndex(item => 
        item.userInfo.openid === userInfo.openid
      )
      
      if (existingIndex >= 0) {
        // 更新现有申请
        registrationList[existingIndex] = registrationRecord
      } else {
        // 添加新申请
        registrationList.push(registrationRecord)
      }
      
      // 保存到本地存储
      wx.setStorageSync('registrationList', registrationList)
      
      console.log('注册申请已保存，等待管理员审核')
    } catch (error) {
      console.error('保存注册申请失败:', error)
    }
  },

  // 验证用户资料
  validateProfile() {
    if (!this.data.nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return false
    }

    if (this.data.nickname.trim().length < 2) {
      wx.showToast({
        title: '昵称至少2个字符',
        icon: 'none'
      })
      return false
    }

    if (this.data.nickname.trim().length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'none'
      })
      return false
    }

    // 检查昵称是否包含敏感词（简单示例）
    const sensitiveWords = ['admin', '管理员', '客服', 'test']
    const nickname = this.data.nickname.toLowerCase()
    if (sensitiveWords.some(word => nickname.includes(word))) {
      wx.showToast({
        title: '昵称包含不允许的词汇',
        icon: 'none'
      })
      return false
    }

    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      })
      return false
    }

    return true
  },

  // 条款同意状态改变
  onTermsChange(e) {
    this.setData({
      agreedToTerms: e.detail.value.length > 0
    })
  },

  // 显示用户协议
  showUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: `欢迎使用语伴君！

1. 服务内容
本应用提供AI驱动的日语学习服务，包括但不限于：
• 智能语法分析和句子解析
• 个性化学习计划和复习提醒
• 语音对话练习和发音纠正
• 学习进度追踪和统计分析

2. 用户义务
• 提供真实、准确的个人信息
• 遵守法律法规，文明使用服务
• 不得恶意攻击或破坏系统
• 尊重他人权益，维护社区秩序

3. 服务规范
• 我们致力于提供稳定、优质的服务
• 定期更新内容和功能优化
• 建立用户反馈和问题处理机制
• 保护用户隐私和数据安全

4. 责任声明
• 学习效果因人而异，需要持续努力
• 技术故障造成的影响我们会及时修复
• 用户违规使用造成的后果由用户承担

如有疑问，请联系客服。`,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: `我们非常重视您的隐私保护：

1. 信息收集
我们会收集以下信息：
• 基本信息：昵称、学习偏好等
• 设备信息：设备型号、系统版本等
• 使用数据：学习记录、操作日志等

2. 信息使用
收集的信息仅用于：
• 提供个性化学习服务
• 改进产品功能和用户体验
• 统计分析和服务优化
• 必要的技术支持和客服

3. 信息保护
• 采用加密技术保护数据传输
• 严格限制数据访问权限
• 定期进行安全检查和更新
• 不会向第三方出售个人信息

4. 用户权利
• 查看和更新个人信息
• 删除账户和相关数据
• 选择不参与数据分析
• 随时联系我们处理隐私问题

5. 政策更新
我们可能会更新本政策，重大变更会提前通知。

联系方式：privacy@languagetech.com`,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 获取设备信息
  getDeviceInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      return {
        platform: systemInfo.platform,
        system: systemInfo.system,
        version: systemInfo.version,
        model: systemInfo.model,
        brand: systemInfo.brand
      }
    } catch (error) {
      return {}
    }
  },

  // 获取应用版本
  getAppVersion() {
    try {
      const accountInfo = wx.getAccountInfoSync()
      return accountInfo.miniProgram.version || 'unknown'
    } catch (error) {
      return 'unknown'
    }
  },

  // 跳过注册
  onSkipRegister() {
    wx.reLaunch({
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