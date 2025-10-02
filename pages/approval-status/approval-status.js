// 审批状态页面
const app = getApp()

Page({
  data: {
    userStatus: 'pending', // pending, approved, rejected, suspended
    userInfo: null,
    statusMessage: '',
    showContactInfo: false,
    retryCount: 0,
    maxRetry: 3,
    
    // 状态配置
    statusConfig: {
      pending: {
        icon: '⏳',
        title: '审核中',
        description: '您的申请正在审核中',
        color: '#f39c12',
        showRetry: false,
        showContact: true
      },
      approved: {
        icon: '✅',
        title: '审核通过',
        description: '恭喜！您的申请已通过审核',
        color: '#27ae60',
        showRetry: false,
        showContact: false
      },
      rejected: {
        icon: '❌',
        title: '审核未通过',
        description: '很抱歉，您的申请未通过审核',
        color: '#e74c3c',
        showRetry: true,
        showContact: true
      },
      suspended: {
        icon: '⚠️',
        title: '账户暂停',
        description: '您的账户已被暂停使用',
        color: '#e67e22',
        showRetry: false,
        showContact: true
      }
    }
  },

  onLoad(options) {
    // 获取传递的状态参数
    if (options.status) {
      this.setData({ userStatus: options.status })
    }
    
    this.checkUserStatus()
    
    // 设置定时检查（仅在pending状态下）
    this.startStatusPolling()
  },

  onShow() {
    // 页面显示时重新检查状态
    this.checkUserStatus()
  },

  onUnload() {
    // 页面卸载时清除定时器
    this.stopStatusPolling()
  },

  // 检查用户状态
  async checkUserStatus() {
    try {
      wx.showLoading({ title: '检查状态中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'user-status',
        data: {
          action: 'checkStatus'
        }
      })
      
      if (result.result.success) {
        const { userStatus, userData, message } = result.result
        
        this.setData({
          userStatus: userStatus,
          userInfo: userData,
          statusMessage: message || this.getStatusMessage(userStatus)
        })
        
        // 如果状态已变为approved，跳转到首页
        if (userStatus === 'approved') {
          setTimeout(() => {
            this.goToHome()
          }, 2000)
        }
      } else {
        console.error('检查状态失败:', result.result.error)
        this.setData({
          statusMessage: '检查状态失败，请稍后重试'
        })
      }
    } catch (error) {
      console.error('检查用户状态失败:', error)
      this.setData({
        statusMessage: '网络错误，请检查网络连接'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 开始状态轮询
  startStatusPolling() {
    // 清除之前的定时器
    this.stopStatusPolling()
    
    // 只在pending状态下进行轮询
    if (this.data.userStatus === 'pending') {
      this.statusTimer = setInterval(() => {
        this.checkUserStatus()
      }, 30000) // 每30秒检查一次
    }
  },

  // 停止状态轮询
  stopStatusPolling() {
    if (this.statusTimer) {
      clearInterval(this.statusTimer)
      this.statusTimer = null
    }
  },

  // 获取状态描述
  getStatusMessage(status) {
    const config = this.data.statusConfig[status]
    return config ? config.description : '未知状态'
  },

  // 重新提交申请
  async retryApplication() {
    if (this.data.retryCount >= this.data.maxRetry) {
      wx.showModal({
        title: '重试次数已达上限',
        content: '您已达到最大重试次数，请联系客服处理',
        showCancel: false
      })
      return
    }

    wx.showModal({
      title: '重新申请',
      content: '确定要重新提交申请吗？我们会重新审核您的资料。',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            retryCount: this.data.retryCount + 1,
            userStatus: 'pending',
            statusMessage: '重新提交申请成功，请等待审核'
          })
          
          // 重新开始轮询
          this.startStatusPolling()
          
          // 这里可以调用重新提交的云函数
          this.resubmitApplication()
        }
      }
    })
  },

  // 重新提交申请
  async resubmitApplication() {
    try {
      // 这里可以实现重新提交申请的逻辑
      wx.showToast({
        title: '已重新提交申请',
        icon: 'success'
      })
    } catch (error) {
      console.error('重新提交申请失败:', error)
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    }
  },

  // 显示联系信息
  showContact() {
    wx.showModal({
      title: '联系客服',
      content: '如有疑问，请联系我们：\n\n微信客服：LanguageTechSupport\n邮箱：support@languagetech.com\n工作时间：9:00-18:00',
      confirmText: '复制微信号',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'LanguageTechSupport',
            success: () => {
              wx.showToast({
                title: '微信号已复制',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  },

  // 刷新状态
  onRefreshStatus() {
    this.checkUserStatus()
  },

  // 跳转到首页
  goToHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 返回注册页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },

  // 查看使用条款
  showTerms() {
    wx.showModal({
      title: '使用条款',
      content: '感谢使用语伴君！\n\n1. 本应用致力于提供优质的日语学习服务\n2. 请遵守相关法律法规，文明使用\n3. 我们会保护您的个人隐私和数据安全\n4. 如有违规行为，我们保留处理权利\n\n更多详情请查看完整使用条款。',
      showCancel: false
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.checkUserStatus().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})