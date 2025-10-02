// 用户认证守卫
const authGuard = {
  // 检查用户是否已登录且审核通过
  async checkUserStatus() {
    try {
      // 1. 检查本地登录状态
      const userInfo = wx.getStorageSync('userInfo')
      const userProfile = wx.getStorageSync('userProfile')
      const userStatus = wx.getStorageSync('userStatus')
      
      if (!userInfo) {
        return { isValid: false, redirectTo: '/pages/register/register', reason: '未登录' }
      }
      
      if (!userProfile) {
        return { isValid: false, redirectTo: '/pages/register/register', reason: '未完善资料' }
      }
      
      // 2. 检查审核状态
      if (!userStatus || userStatus === 'pending') {
        return { 
          isValid: false, 
          redirectTo: '/pages/approval-status/approval-status?status=' + (userStatus || 'pending'), 
          reason: '等待审核' 
        }
      }
      
      if (userStatus === 'rejected') {
        return { 
          isValid: false, 
          redirectTo: '/pages/approval-status/approval-status?status=rejected', 
          reason: '审核未通过' 
        }
      }
      
      if (userStatus === 'suspended') {
        return { 
          isValid: false, 
          redirectTo: '/pages/approval-status/approval-status?status=suspended', 
          reason: '账户已暂停' 
        }
      }
      
      // 3. 验证服务器端状态（可选）
      if (userStatus === 'approved') {
        try {
          const result = await wx.cloud.callFunction({
            name: 'user-status',
            data: {
              action: 'checkStatus'
            }
          })
          
          if (result.result.success && result.result.status !== 'approved') {
            // 服务器状态与本地不一致，更新本地状态
            wx.setStorageSync('userStatus', result.result.status)
            return { 
              isValid: false, 
              redirectTo: `/pages/approval-status/approval-status?status=${result.result.status}`, 
              reason: '状态已变更' 
            }
          }
        } catch (error) {
          console.warn('验证服务器状态失败，使用本地状态:', error)
        }
      }
      
      return { isValid: true, userInfo, userProfile, userStatus }
      
    } catch (error) {
      console.error('检查用户状态失败:', error)
      return { isValid: false, redirectTo: '/pages/register/register', reason: '状态检查失败' }
    }
  },
  
  // 基础登录检查（只需要微信授权）
  async requireBasicAuth(context, options = {}) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      
      if (!userInfo) {
        if (options.showToast !== false) {
          wx.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 2000
          })
        }
        
        setTimeout(() => {
          wx.switchTab({ url: '/pages/profile/profile' })
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/register/register' })
          }, 100)
        }, options.delay || 1500)
        
        return false
      }
      
      // 设置用户信息到页面context
      if (context && context.setData) {
        context.setData({
          currentUser: userInfo,
          isAuthenticated: true
        })
      }
      
      return true
    } catch (error) {
      console.error('基础认证检查失败:', error)
      return false
    }
  },

  // 强制登录检查（用于页面onLoad）- 兼容旧方法
  async requireAuth(context, options = {}) {
    return this.requireBasicAuth(context, options)
  },

  // 高级功能认证检查（需要审核通过）
  async requireAdvancedAuth(context, options = {}) {
    const result = await this.checkUserStatus()
    
    if (!result.isValid) {
      if (options.showToast !== false) {
        wx.showToast({
          title: result.reason || '请先完成认证',
          icon: 'none',
          duration: 2000
        })
      }
      
      setTimeout(() => {
        if (result.redirectTo) {
          if (result.redirectTo.includes('approval-status')) {
            wx.redirectTo({ url: result.redirectTo })
          } else {
            wx.switchTab({ url: '/pages/profile/profile' })
            setTimeout(() => {
              wx.navigateTo({ url: result.redirectTo })
            }, 100)
          }
        }
      }, options.delay || 1500)
      
      return false
    }
    
    // 设置用户信息到页面context
    if (context && context.setData) {
      context.setData({
        currentUser: result.userInfo,
        userProfile: result.userProfile,
        userStatus: result.userStatus,
        isAuthenticated: true,
        isAdvancedUser: true
      })
    }
    
    return true
  },
  
  // 可选认证检查（用于某些功能）
  async optionalAuth() {
    const result = await this.checkUserStatus()
    return result.isValid ? result : null
  },
  
  // 显示登录引导
  showLoginGuide(message = '此功能需要登录后使用') {
    wx.showModal({
      title: '登录提示',
      content: message,
      confirmText: '去登录',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/profile/profile' })
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/register/register' })
          }, 100)
        }
      }
    })
  }
}

module.exports = authGuard