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
      console.log('🔍 检查登录状态...')
      // 获取本地存储的用户信息
      const userInfo = wx.getStorageSync('userInfo')
      const userProfile = wx.getStorageSync('userProfile')
      const userStatus = wx.getStorageSync('userStatus')
      
      console.log('💾 本地用户信息:', userInfo)
      console.log('📄 本地用户资料:', userProfile)
      console.log('📋 用户状态:', userStatus)
      
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
        
        // 如果用户已经审核通过，直接跳转到首页
        if (userProfile && userStatus === 'approved') {
          console.log('✅ 用户已审核通过，准备跳转首页')
          const app = getApp()
          if (app.globalData) {
            app.globalData.userInfo = userInfo
            app.globalData.userProfile = userProfile
          }
          
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/index/index'
            })
          }, 1000)
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
    }
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    try {
      // 更新用户信息中的头像
      let userInfo = this.data.userInfo || {}
      userInfo.avatarUrl = avatarUrl
      
      // 保存到本地存储
      wx.setStorageSync('userInfo', userInfo)
      
      // 更新页面数据
      this.setData({
        userInfo: userInfo
      })
      
      // 更新全局用户信息
      const app = getApp()
      if (app.globalData) {
        app.globalData.userInfo = userInfo
      }
      
      wx.showToast({
        title: '头像已选择',
        icon: 'success'
      })
    } catch (error) {
      console.error('选择头像失败:', error)
      wx.showToast({
        title: '选择头像失败',
        icon: 'none'
      })
    }
  },

  // 微信授权登录
  async onWechatLogin() {
    try {
      console.log('🚀 开始微信登录...')
      wx.showLoading({ title: '登录中...' })
      
      // 先检查是否已经有用户信息
      const existingUserInfo = wx.getStorageSync('userInfo')
      const existingUserProfile = wx.getStorageSync('userProfile')
      const userStatus = wx.getStorageSync('userStatus')
      
      if (existingUserInfo && existingUserProfile && userStatus === 'approved') {
        console.log('✅ 发现已有用户信息，直接登录')
        this.loginExistingUser(existingUserInfo, existingUserProfile)
        return
      }
      
      // 确保云开发已经初始化
      const app = getApp()
      if (!app.globalData.cloudReady) {
        console.log('⚠️ 云开发未就绪，等待初始化...')
        await this.waitForCloudReady()
      }
      
      // 获取登录凭证
      const loginRes = await this.getWxLoginCode()
      if (!loginRes.code) {
        throw new Error('获取登录凭证失败')
      }
      
      console.log('✅ 获取到登录code:', loginRes.code.substring(0, 10) + '...')
      
      // 通过云函数获取用户数据
      const userData = await this.getUserDataFromCloud(loginRes.code)
      
      if (userData) {
        // 已有完整用户资料，直接登录
        console.log('✅ 云端用户数据完整，直接登录')
        this.loginWithCloudData(userData, loginRes.code)
      } else {
        // 新用户或无完整资料，创建用户信息
        console.log('👤 新用户，创建用户信息')
        this.createNewUser(loginRes.code)
      }
      
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 微信登录失败:', error)
      
      let errorMsg = '登录失败，请重试'
      if (error.message.includes('云函数')) {
        errorMsg = '服务器连接失败，请检查网络'
      } else if (error.message.includes('授权')) {
        errorMsg = '授权失败，请重新授权'
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 等待云开发就绪
  async waitForCloudReady() {
    const app = getApp()
    let retryCount = 0
    const maxRetries = 10
    
    while (!app.globalData.cloudReady && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500))
      retryCount++
    }
    
    if (!app.globalData.cloudReady) {
      throw new Error('云开发初始化超时')
    }
    
    console.log('✅ 云开发已就绪')
  },

  // 获取微信登录code
  async getWxLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject,
        timeout: 10000
      })
    })
  },

  // 从云端获取用户数据
  async getUserDataFromCloud(code) {
    try {
      console.log('🔄 调用云函数获取用户数据...')
      const cloudResult = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'login',
          code: code
        }
      })
      
      console.log('☁️ 云函数返回:', {
        success: cloudResult.result?.success,
        hasProfile: !!cloudResult.result?.userData?.profile,
        openid: cloudResult.result?.openid?.substring(0, 10) + '...'
      })
      
      if (cloudResult.result?.success && cloudResult.result?.userData?.profile) {
        return {
          openid: cloudResult.result.openid,
          profile: cloudResult.result.userData.profile
        }
      }
      
      return null
    } catch (error) {
      console.error('💥 云函数调用失败:', error)
      throw new Error('云函数调用失败: ' + error.message)
    }
  },

  // 使用已有用户信息登录
  loginExistingUser(userInfo, userProfile) {
    this.setData({
      userInfo: userInfo,
      userProfile: userProfile,
      isLoggedIn: true,
      hasUserProfile: true,
      nickname: userProfile.nickname,
      learningGoal: userProfile.learningGoal,
      studyTimePerDay: userProfile.studyTimePerDay,
      currentLevel: userProfile.currentLevel
    })
    
    const app = getApp()
    app.globalData.userInfo = userInfo
    app.globalData.userProfile = userProfile
    
    const isAdmin = this.checkIfAdmin(userInfo)
    wx.hideLoading()
    wx.showToast({
      title: isAdmin ? '管理员登录成功' : '登录成功',
      icon: 'success'
    })
    
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/index/index'
      })
    }, 1500)
  },

  // 使用云端数据登录
  loginWithCloudData(userData, code) {
    const userInfo = {
      openid: userData.openid,
      nickName: userData.profile.nickname || '',
      avatarUrl: userData.profile.avatarUrl || '',
      code: code,
      loginTime: new Date()
    }
    
    // 保存到本地
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('userProfile', userData.profile)
    wx.setStorageSync('openid', userData.openid)
    wx.setStorageSync('userStatus', 'approved')
    
    this.setData({
      userInfo: userInfo,
      userProfile: userData.profile,
      isLoggedIn: true,
      hasUserProfile: true,
      nickname: userData.profile.nickname,
      learningGoal: userData.profile.learningGoal,
      studyTimePerDay: userData.profile.studyTimePerDay,
      currentLevel: userData.profile.currentLevel
    })
    
    const app = getApp()
    app.globalData.userInfo = userInfo
    app.globalData.userProfile = userData.profile
    
    const isAdmin = this.checkIfAdmin(userInfo)
    wx.showToast({
      title: isAdmin ? '管理员登录成功' : '欢迎回来',
      icon: 'success'
    })
    
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/index/index'
      })
    }, 1500)
  },

  // 创建新用户
  createNewUser(code) {
    const userInfo = {
      openid: 'temp_' + Date.now(),
      nickName: '',
      avatarUrl: '',
      code: code,
      loginTime: new Date()
    }
    
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('openid', userInfo.openid)
    
    this.setData({
      userInfo: userInfo,
      isLoggedIn: true,
      hasUserProfile: false,
      nickname: ''
    })
    
    const app = getApp()
    app.globalData.userInfo = userInfo
    
    wx.showToast({
      title: '登录成功，请完善资料',
      icon: 'success'
    })
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
        avatarUrl: userInfo && userInfo.avatarUrl ? userInfo.avatarUrl : '',
        // 添加更多注册信息
        deviceInfo: this.getDeviceInfo(),
        appVersion: this.getAppVersion()
      }

      // 管理员审核系统：检查是否为管理员
      // 特别检查：如果昵称是您的手机号，自动设为管理员
      const updatedUserInfo = { ...userInfo, nickName: profileData.nickname }
      const isAdmin = this.checkIfAdmin(updatedUserInfo)
      
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
      
      // 重要：将用户资料同步到云端
      try {
        console.log('🔄 开始同步用户资料到云端...')
        console.log('📤 同步的资料数据:', JSON.stringify(profileData, null, 2))
        
        const syncResult = await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'updateProfile',
            openid: userInfo.openid, // 直接传openid
            profile: profileData
          }
        })
        
        console.log('☁️ 资料同步返回结果:', JSON.stringify(syncResult, null, 2))
        
        if (syncResult.result && syncResult.result.success) {
          console.log('✅ 用户资料已成功同步到云端')
        } else {
          console.log('❌ 云端同步失败，但本地已保存:', syncResult.result?.error)
        }
      } catch (syncError) {
        console.log('💥 云端同步异常，但本地已保存:', syncError)
        console.log('💥 同步错误详情:', JSON.stringify(syncError, null, 2))
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

  // 检查是否为管理员（仅基于openid验证）
  checkIfAdmin(userInfo) {
    if (!userInfo || !userInfo.openid) {
      return false
    }
    
    // 管理员的openid（仅限开发者账户）
    const adminOpenIds = [
      'oyehIvjzBJ8kK-KbqRBCa4anbc7Y' // 原管理员openid
    ]
    
    // 精确匹配
    if (adminOpenIds.includes(userInfo.openid)) {
      return true
    }
    
    // 开发调试模式：临时openid也给予管理员权限
    const debugPrefixes = ['temp_', 'guest_']
    for (let prefix of debugPrefixes) {
      if (userInfo.openid.startsWith(prefix)) {
        console.log('🔧 开发调试模式：检测到调试openid，临时授予管理员权限')
        return true
      }
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

  // 跳转到手机号登录
  goToPhoneLogin() {
    wx.navigateTo({
      url: '/pages/phone-login/phone-login'
    })
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
      content: '退出登录后，学习记录已云端同步，下次登录相同账号可恢复数据',
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