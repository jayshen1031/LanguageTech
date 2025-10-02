// 管理员调试页面
Page({
  data: {
    openid: '',
    isAdmin: false,
    userInfo: null,
    adminRecord: null,
    loading: false
  },

  onLoad() {
    this.getCurrentOpenid()
  },

  // 获取当前用户openid
  async getCurrentOpenid() {
    try {
      wx.showLoading({ title: '获取信息中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'admin-init',
        data: {
          action: 'getOpenid'
        }
      })

      if (result.result.success) {
        this.setData({
          openid: result.result.openid
        })
        
        // 检查管理员状态
        await this.checkAdminStatus()
      } else {
        wx.showToast({
          title: result.result.error || '获取失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('获取openid失败:', error)
      wx.showToast({
        title: '获取失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 检查管理员状态
  async checkAdminStatus() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'admin-init',
        data: {
          action: 'checkAdmin'
        }
      })

      if (result.result.success) {
        this.setData({
          isAdmin: result.result.isAdmin,
          adminRecord: result.result.adminRecord,
          userInfo: result.result.userRecord
        })
      }
    } catch (error) {
      console.error('检查管理员状态失败:', error)
    }
  },

  // 复制openid
  copyOpenid() {
    if (this.data.openid) {
      wx.setClipboardData({
        data: this.data.openid,
        success: () => {
          wx.showToast({
            title: 'OpenID已复制',
            icon: 'success'
          })
        }
      })
    }
  },

  // 设置管理员权限
  async setAdminPermission() {
    if (this.data.isAdmin) {
      wx.showToast({
        title: '您已经是管理员',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '设置管理员权限',
      content: '确认要将当前账户设为管理员吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '设置中...' })
            
            const result = await wx.cloud.callFunction({
              name: 'admin-init',
              data: {
                action: 'setAdmin',
                data: {
                  nickname: '系统管理员',
                  role: 'super_admin',
                  permissions: ['all']
                }
              }
            })

            if (result.result.success) {
              wx.showToast({
                title: '设置成功',
                icon: 'success'
              })
              
              // 刷新状态
              await this.checkAdminStatus()
            } else {
              wx.showToast({
                title: result.result.error || '设置失败',
                icon: 'none'
              })
            }
          } catch (error) {
            console.error('设置管理员权限失败:', error)
            wx.showToast({
              title: '设置失败',
              icon: 'none'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 测试用户注册
  async testUserRegister() {
    try {
      wx.showLoading({ title: '测试注册中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'user-status',
        data: {
          action: 'register',
          data: {
            nickname: '测试管理员',
            learningGoal: 'exam',
            studyTimePerDay: 60,
            currentLevel: 'advanced'
          }
        }
      })

      wx.hideLoading()
      
      if (result.result.success) {
        wx.showModal({
          title: '注册测试结果',
          content: `状态: ${result.result.userStatus}\n消息: ${result.result.message}\n管理员: ${result.result.isAdmin ? '是' : '否'}`,
          showCancel: false
        })
      } else {
        wx.showToast({
          title: result.result.error || '测试失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('测试注册失败:', error)
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    }
  },

  // 查看详细信息
  showDetails() {
    const details = {
      openid: this.data.openid,
      isAdmin: this.data.isAdmin,
      adminRecord: this.data.adminRecord,
      userInfo: this.data.userInfo
    }
    
    wx.showModal({
      title: '详细信息',
      content: JSON.stringify(details, null, 2),
      showCancel: false
    })
  },

  // 刷新状态
  refresh() {
    this.getCurrentOpenid()
  }
})