// 管理员调试页面 - 获取开发者openid
Page({
  data: {
    openid: '',
    isAdmin: false,
    userInfo: null,
    adminRecord: null,
    loading: false,
    debugInfo: ''
  },

  onLoad() {
    this.getCurrentOpenid()
    this.loadLocalUserInfo()
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

  // 加载本地用户信息
  loadLocalUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        const debugInfo = `
当前登录用户信息：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OpenID: ${userInfo.openid || '未获取'}
昵称: ${userInfo.nickName || '未设置'}
头像: ${userInfo.avatarUrl ? '已设置' : '未设置'}

⚠️  重要说明：
请将您的OpenID添加到以下文件的管理员列表中：
1. utils/authGuard.js (第176行)
2. pages/user-management/user-management.js (第67行)

替换：
// TODO: 添加开发者微信号13818425406对应的openid

为：
'${userInfo.openid || 'YOUR_OPENID_HERE'}'

注意：在openid前面加逗号！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `
        
        this.setData({
          debugInfo: debugInfo.trim(),
          userInfo: userInfo
        })
      } else {
        this.setData({
          debugInfo: '请先在个人中心完成微信授权登录'
        })
      }
    } catch (error) {
      console.error('加载本地用户信息失败:', error)
      this.setData({
        debugInfo: '加载用户信息失败: ' + error.message
      })
    }
  },

  // 复制完整的代码片段
  copyCodeSnippet() {
    if (!this.data.userInfo || !this.data.userInfo.openid) {
      wx.showToast({
        title: '请先登录获取OpenID',
        icon: 'none'
      })
      return
    }

    const codeSnippet = `// 管理员的openid（仅限开发者账户）
const adminOpenIds = [
  'oyehIvjzBJ8kK-KbqRBCa4anbc7Y', // 原管理员openid  
  '${this.data.userInfo.openid}' // 开发者微信号13818425406对应的openid
]`

    wx.setClipboardData({
      data: codeSnippet,
      success: () => {
        wx.showToast({
          title: '代码片段已复制',
          icon: 'success',
          duration: 2000
        })
        
        wx.showModal({
          title: '下一步操作',
          content: '请将复制的代码片段替换到以下文件中：\n\n1. utils/authGuard.js (第175-178行)\n2. pages/user-management/user-management.js (第66-69行)',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  // 刷新状态
  refresh() {
    this.getCurrentOpenid()
    this.loadLocalUserInfo()
  },

  // 修复例句罗马音
  async fixExampleRomaji() {
    wx.showLoading({ title: '修复中...' })
    
    try {
      console.log('🔧 开始修复例句罗马音...')
      
      const result = await wx.cloud.callFunction({
        name: 'vocabulary-integration',
        data: {
          action: 'fix_example_romaji'
        }
      })
      
      wx.hideLoading()
      
      if (result.result.success) {
        console.log('✅ 修复成功:', result.result)
        
        wx.showModal({
          title: '修复完成',
          content: `成功修复 ${result.result.examplesFixed} 个例句的罗马音显示\n\n处理词汇: ${result.result.totalProcessed} 个\n更新记录: ${result.result.recordsUpdated} 个`,
          showCancel: false,
          confirmText: '验证效果',
          success: (res) => {
            if (res.confirm) {
              this.verifyRomajiFix()
            }
          }
        })
      } else {
        console.error('❌ 修复失败:', result.result.error)
        wx.showModal({
          title: '修复失败',
          content: result.result.error || '未知错误',
          showCancel: false
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 调用失败:', error)
      wx.showModal({
        title: '调用失败',
        content: '云函数调用失败，请检查网络连接',
        showCancel: false
      })
    }
  },

  // 验证修复效果
  async verifyRomajiFix() {
    wx.showLoading({ title: '验证中...' })
    
    try {
      const db = wx.cloud.database()
      
      // 检查前30个词汇的例句罗马音情况
      const res = await db.collection('vocabulary_integrated')
        .limit(30)
        .get()
      
      let totalExamples = 0
      let examplesWithRomaji = 0
      let examplesWithoutRomaji = 0
      const missingRomajiWords = []
      
      res.data.forEach(word => {
        if (word.examples && Array.isArray(word.examples)) {
          let wordMissingCount = 0
          word.examples.forEach(example => {
            totalExamples++
            if (example.romaji && example.romaji.trim() !== '') {
              examplesWithRomaji++
            } else {
              examplesWithoutRomaji++
              wordMissingCount++
            }
          })
          
          if (wordMissingCount > 0) {
            missingRomajiWords.push({
              word: word.word,
              missingCount: wordMissingCount,
              totalCount: word.examples.length
            })
          }
        }
      })
      
      wx.hideLoading()
      
      const completionRate = totalExamples > 0 ? Math.round(examplesWithRomaji/totalExamples*100) : 0
      
      console.log(`📈 验证结果:`)
      console.log(`   - 总例句数: ${totalExamples}`)
      console.log(`   - 有罗马音: ${examplesWithRomaji} (${completionRate}%)`)
      console.log(`   - 缺罗马音: ${examplesWithoutRomaji}`)
      
      if (missingRomajiWords.length > 0) {
        console.log('⚠️  仍缺少罗马音的词汇:')
        missingRomajiWords.forEach(item => {
          console.log(`     ${item.word}: ${item.missingCount}/${item.totalCount} 例句缺罗马音`)
        })
      }
      
      let statusIcon = 'success'
      let title = '验证完成'
      if (completionRate < 80) {
        statusIcon = 'none'
        title = '仍需改进'
      }
      
      wx.showModal({
        title: title,
        content: `例句罗马音完整率: ${completionRate}%\n\n✅ 有罗马音: ${examplesWithRomaji} 个\n⚠️  缺罗马音: ${examplesWithoutRomaji} 个\n📚 检查词汇: ${res.data.length} 个`,
        showCancel: false,
        confirmText: completionRate < 100 ? '查看学习页面' : '完成',
        success: (res) => {
          if (res.confirm && completionRate < 100) {
            // 跳转到学习页面查看效果
            wx.navigateTo({
              url: '/pages/learn/learn?count=5'
            })
          }
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 验证失败:', error)
      wx.showModal({
        title: '验证失败',
        content: '数据库查询失败: ' + error.message,
        showCancel: false
      })
    }
  }
})