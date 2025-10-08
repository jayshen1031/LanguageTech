const audioCache = require('../../utils/audioCache')
const app = getApp()

Page({
  data: {
    cacheStats: {
      fileCount: 0,
      totalSizeMB: '0.00'
    },
    userInfo: null,
    userProfile: null,
    isLoggedIn: false,
    isAdmin: false,
    lastSyncTime: '', // 最后同步时间
    learningStats: {
      studyDays: 0,
      totalWords: 0,
      masteredWords: 0,
      todayStudyTime: 0
    }
  },

  onLoad() {
    // 初始化云环境
    wx.cloud.init({
      env: 'cloud1-2g49srond2b01891'
    })
    
    // 获取缓存统计
    this.updateCacheStats()
    
    // 加载用户信息
    this.loadUserInfo()
    
    // 加载学习统计
    this.loadLearningStats()
  },
  
  onShow() {
    // 每次显示页面时更新缓存统计
    this.updateCacheStats()
    
    // 重新加载用户信息（可能在注册页面更新了）
    this.loadUserInfo()
    this.loadLearningStats()
  },

  // 跳转到学习进度页面
  goToLearningProgress() {
    wx.navigateTo({
      url: '/pages/learning-progress/learning-progress'
    })
  },

  // 显示学习管理选项
  showLearningManagement() {
    wx.showActionSheet({
      itemList: [
        '重置词汇掌握状态',
        '重置句子结构掌握状态', 
        '清理重复数据',
        '导出学习数据'
      ],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.resetVocabularyMastery()
            break
          case 1:
            this.resetStructureMastery()
            break
          case 2:
            this.cleanDuplicateData()
            break
          case 3:
            this.exportLearningData()
            break
        }
      }
    })
  },

  // 重置词汇掌握状态
  async resetVocabularyMastery() {
    wx.showModal({
      title: '重置词汇掌握状态',
      content: '确定要将所有已掌握的词汇重新标记为未掌握吗？此操作无法撤销。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '重置中...' })
            
            const db = wx.cloud.database()
            const _ = db.command
            const result = await db.collection('vocabulary_integrated')
              .where({ totalOccurrences: _.gte(3) })
              .update({
                data: {
                  totalOccurrences: 1,
                  masteryReset: true,
                  masteryResetTime: new Date()
                }
              })

            wx.showToast({
              title: `已重置 ${result.stats.updated} 个词汇`,
              icon: 'success'
            })
          } catch (error) {
            console.error('重置失败:', error)
            wx.showToast({ title: '重置失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 重置句子结构掌握状态
  async resetStructureMastery() {
    wx.showModal({
      title: '重置句子结构掌握状态', 
      content: '确定要将所有已掌握的句子结构重新标记为未掌握吗？此操作无法撤销。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '重置中...' })
            
            const db = wx.cloud.database()
            const _ = db.command
            const result = await db.collection('sentence_structures_integrated')
              .where({ totalOccurrences: _.gte(3) })
              .update({
                data: {
                  totalOccurrences: 1,
                  masteryReset: true,
                  masteryResetTime: new Date()
                }
              })

            wx.showToast({
              title: `已重置 ${result.stats.updated} 个结构`,
              icon: 'success'
            })
          } catch (error) {
            console.error('重置失败:', error)
            wx.showToast({ title: '重置失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 清理重复数据
  cleanDuplicateData() {
    wx.showModal({
      title: '数据清理',
      content: '这是维护功能，会清理系统中的重复数据。确定要执行吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 导出学习数据
  exportLearningData() {
    wx.showToast({
      title: '导出功能开发中',
      icon: 'none'
    })
  },
  
  // 加载用户信息
  loadUserInfo() {
    try {
      let userInfo = wx.getStorageSync('userInfo')
      let userProfile = wx.getStorageSync('userProfile')
      
      // 头像信息同步：确保头像数据一致性
      if (userInfo && userProfile) {
        // 如果userProfile中没有头像但userInfo中有，则同步过去
        if (userInfo.avatarUrl && !userProfile.avatarUrl) {
          console.log('🔄 同步头像信息到用户资料')
          userProfile = {
            ...userProfile,
            avatarUrl: userInfo.avatarUrl
          }
          wx.setStorageSync('userProfile', userProfile)
        }
        // 如果userProfile中有头像但userInfo中没有，则反向同步
        else if (userProfile.avatarUrl && !userInfo.avatarUrl) {
          console.log('🔄 同步头像信息到用户信息')
          userInfo = {
            ...userInfo,
            avatarUrl: userProfile.avatarUrl
          }
          wx.setStorageSync('userInfo', userInfo)
        }
      }
      
      // 更新全局用户信息
      const app = getApp()
      if (app.globalData && userInfo) {
        app.globalData.userInfo = userInfo
      }
      if (app.globalData && userProfile) {
        app.globalData.userProfile = userProfile
      }
      
      // 检查是否为管理员
      const isAdmin = this.checkIfAdmin(userInfo)
      
      // 获取最后同步时间
      const lastSyncTime = this.getLastSyncTimeString()
      
      this.setData({
        userInfo: userInfo,
        userProfile: userProfile,
        isLoggedIn: !!userInfo,
        isAdmin: isAdmin,
        lastSyncTime: lastSyncTime
      })
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },
  
  // 加载学习统计
  loadLearningStats() {
    try {
      const learningProgress = wx.getStorageSync('learningProgress') || {}
      const userVocabulary = wx.getStorageSync('userVocabulary') || []
      const studyHistory = wx.getStorageSync('studyHistory') || []
      
      // 计算掌握的词汇数量
      const masteredWords = userVocabulary.filter(word => 
        word.masteryLevel >= 4
      ).length
      
      // 计算学习天数
      const studyDates = [...new Set(studyHistory.map(record => 
        new Date(record.date).toDateString()
      ))]
      
      // 计算今日学习时间（分钟）
      const today = new Date().toDateString()
      const todayRecords = studyHistory.filter(record => 
        new Date(record.date).toDateString() === today
      )
      const todayStudyTime = todayRecords.reduce((total, record) => 
        total + (record.studyTime || 0), 0
      )
      
      this.setData({
        learningStats: {
          studyDays: studyDates.length,
          totalWords: userVocabulary.length,
          masteredWords: masteredWords,
          todayStudyTime: Math.round(todayStudyTime)
        }
      })
    } catch (error) {
      console.error('加载学习统计失败:', error)
    }
  },
  
  // 跳转到注册/登录页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },
  
  // 跳转到掌握程度统计页面
  goToMasteryStats() {
    wx.navigateTo({
      url: '/pages/mastery-stats/mastery-stats'
    })
  },
  
  // 同步学习数据
  async syncLearningData() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: '同步中...' })
      
      const result = await app.globalData.userService.syncLearningDataToCloud()
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: result.localOnly ? '本地数据已保存' : '同步成功',
          icon: 'success'
        })
        // 更新最后同步时间显示
        this.setData({
          lastSyncTime: this.getLastSyncTimeString()
        })
      } else {
        wx.showToast({
          title: '同步失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('同步学习数据失败:', error)
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  },
  
  // 更新缓存统计信息
  updateCacheStats() {
    const stats = audioCache.getCacheStats()
    this.setData({
      cacheStats: stats
    })
  },
  
  // 清理音频缓存
  clearAudioCache() {
    wx.showModal({
      title: '清理缓存',
      content: `确定要清理所有音频缓存吗？当前缓存：${this.data.cacheStats.fileCount}个文件，${this.data.cacheStats.totalSizeMB}MB`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' })
          
          const result = await audioCache.clearAllCache()
          
          wx.hideLoading()
          
          if (result) {
            wx.showToast({
              title: '清理成功',
              icon: 'success'
            })
            
            // 更新统计信息
            this.updateCacheStats()
          } else {
            wx.showToast({
              title: '清理失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 检查是否为管理员
  checkIfAdmin(userInfo) {
    if (!userInfo) return false
    
    const adminNicknames = [
      '项目负责人', 
      '管理员',
      'Jay',
      'Admin',
      '测试用户',
      'TestUser',
      '13818425406' // 您的微信号
    ]
    
    // 管理员微信号列表
    const adminWeChatNumbers = [
      '13818425406' // 您的微信号
    ]
    
    // 检查微信昵称
    if (userInfo.nickName && adminNicknames.includes(userInfo.nickName)) {
      return true
    }
    
    // 检查微信号（如果昵称就是微信号）
    if (userInfo.nickName && adminWeChatNumbers.includes(userInfo.nickName)) {
      return true
    }
    
    // 检查是否包含管理员微信号
    if (userInfo.nickName) {
      for (let wechatNumber of adminWeChatNumbers) {
        if (userInfo.nickName.includes(wechatNumber)) {
          return true
        }
      }
    }
    
    // 通过openid判断管理员
    const adminOpenIds = [
      'oyehIvjzBJ8kK-KbqRBCa4anbc7Y', // 你的真实openid
      'admin', // 测试环境
      '13818425406' // 备用标识
    ]
    
    if (userInfo.openid && adminOpenIds.includes(userInfo.openid)) {
      return true
    }
    
    if (userInfo.openid && userInfo.openid.includes('temp_')) {
      return true
    }
    
    return false
  },

  // 用户管理
  goToUserManagement() {
    wx.navigateTo({
      url: '/pages/user-management/user-management'
    })
  },

  // 获取最后同步时间的显示字符串
  getLastSyncTimeString() {
    try {
      const lastSyncTime = wx.getStorageSync('lastSyncTime') || wx.getStorageSync('lastAutoSyncTime')
      if (lastSyncTime) {
        const syncDate = new Date(lastSyncTime)
        const now = new Date()
        const diffInMinutes = Math.floor((now - syncDate) / 1000 / 60)
        
        if (diffInMinutes < 1) {
          return '刚刚'
        } else if (diffInMinutes < 60) {
          return `${diffInMinutes}分钟前`
        } else if (diffInMinutes < 24 * 60) {
          const hours = Math.floor(diffInMinutes / 60)
          return `${hours}小时前`
        } else {
          const days = Math.floor(diffInMinutes / 60 / 24)
          return `${days}天前`
        }
      }
      return ''
    } catch (error) {
      console.error('获取同步时间失败:', error)
      return ''
    }
  },

  // 显示账号管理选项
  showAccountManagement() {
    wx.showActionSheet({
      itemList: [
        '修改个人资料',
        '切换微信账号',
        '退出当前登录'
      ],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.goToRegister()
            break
          case 1:
            this.switchAccount()
            break
          case 2:
            this.logout()
            break
        }
      }
    })
  },

  // 切换微信账号
  switchAccount() {
    wx.showModal({
      title: '切换账号',
      content: '确定要切换微信账号吗？当前学习数据已云端同步，下次使用相同微信账号登录时可以恢复。',
      confirmText: '确定切换',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除当前登录状态但保留学习数据
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userProfile')
          wx.removeStorageSync('openid')
          
          // 更新页面状态
          this.setData({
            userInfo: null,
            userProfile: null,
            isLoggedIn: false,
            isAdmin: false
          })
          
          // 清除全局状态
          const app = getApp()
          if (app.globalData) {
            app.globalData.userInfo = null
            app.globalData.userProfile = null
            app.globalData.isLoggedIn = false
          }
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          // 跳转到注册页面重新登录
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/register/register'
            })
          }, 1500)
        }
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？学习记录已云端同步，下次登录相同账号可恢复数据。',
      confirmText: '确定退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除所有用户数据
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userProfile')
          wx.removeStorageSync('openid')
          wx.removeStorageSync('userStatus')
          
          // 更新页面状态
          this.setData({
            userInfo: null,
            userProfile: null,
            isLoggedIn: false,
            isAdmin: false
          })
          
          // 清除全局状态
          const app = getApp()
          if (app.globalData) {
            app.globalData.userInfo = null
            app.globalData.userProfile = null
            app.globalData.isLoggedIn = false
          }
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 跳转到注册页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },

  // 管理员调试（隐藏功能，长按触发）
  goToAdminDebug() {
    wx.navigateTo({
      url: '/pages/admin-debug/admin-debug'
    })
  }
})