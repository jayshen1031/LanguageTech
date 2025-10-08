// 存储调试页面 - 查看本地存储的注册数据
Page({
  data: {
    registrationList: [],
    storageInfo: '',
    userInfo: null,
    userProfile: null,
    userStatus: ''
  },

  onLoad() {
    this.loadStorageData()
  },

  onShow() {
    this.loadStorageData()
  },

  // 加载存储数据
  loadStorageData() {
    try {
      const registrationList = wx.getStorageSync('registrationList') || []
      const userInfo = wx.getStorageSync('userInfo') || null
      const userProfile = wx.getStorageSync('userProfile') || null
      const userStatus = wx.getStorageSync('userStatus') || ''

      const storageInfo = `
📊 本地存储数据统计：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 注册申请列表：${registrationList.length} 条记录
👤 当前用户信息：${userInfo ? '已存在' : '未登录'}
📄 用户资料：${userProfile ? '已完善' : '未完善'}
📊 用户状态：${userStatus || '未设置'}

📝 注册申请详情：
${registrationList.length > 0 ? registrationList.map((item, index) => `
${index + 1}. ${item.userInfo.nickName || '未知昵称'}
   OpenID: ${item.userInfo.openid || '未知'}
   状态: ${item.status}
   提交时间: ${new Date(item.submitTime).toLocaleString()}
   学习目标: ${this.getLearningGoalText(item.profile.learningGoal)}
`).join('') : '暂无注册申请记录'}

🔍 可能的问题：
${this.analyzeProblems(registrationList, userInfo, userProfile)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `

      this.setData({
        registrationList,
        userInfo,
        userProfile,
        userStatus,
        storageInfo: storageInfo.trim()
      })

    } catch (error) {
      console.error('加载存储数据失败:', error)
      this.setData({
        storageInfo: '加载存储数据失败: ' + error.message
      })
    }
  },

  // 分析可能的问题
  analyzeProblems(registrationList, userInfo, userProfile) {
    const problems = []

    if (!userInfo) {
      problems.push('❌ 当前用户未登录，无法查看申请记录')
    }

    if (registrationList.length === 0) {
      problems.push('❌ 注册申请列表为空，可能是：')
      problems.push('   - 所有用户都是管理员自动通过')
      problems.push('   - 注册流程没有正确保存到本地存储')
      problems.push('   - 本地存储被清理过')
    }

    if (userInfo && !userProfile) {
      problems.push('⚠️ 当前用户已登录但未完善资料')
    }

    if (userInfo && userProfile) {
      const currentUserInList = registrationList.find(item => 
        item.userInfo.openid === userInfo.openid
      )
      if (!currentUserInList) {
        problems.push('⚠️ 当前用户的申请记录不在列表中（可能是管理员）')
      }
    }

    return problems.length > 0 ? problems.join('\n') : '✅ 暂未发现明显问题'
  },

  // 获取学习目标文本
  getLearningGoalText(goal) {
    const goalMap = {
      'daily': '日常交流',
      'exam': '考试备考',
      'business': '商务日语',
      'travel': '旅游日语'
    }
    return goalMap[goal] || goal
  },

  // 刷新数据
  refreshData() {
    this.loadStorageData()
    wx.showToast({
      title: '数据已刷新',
      icon: 'success'
    })
  },

  // 清空注册列表（危险操作）
  clearRegistrationList() {
    wx.showModal({
      title: '危险操作',
      content: '确定要清空所有注册申请记录吗？此操作不可恢复！',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('registrationList', [])
          this.loadStorageData()
          wx.showToast({
            title: '已清空注册列表',
            icon: 'success'
          })
        }
      }
    })
  },

  // 导出数据
  exportData() {
    const data = {
      registrationList: this.data.registrationList,
      userInfo: this.data.userInfo,
      userProfile: this.data.userProfile,
      userStatus: this.data.userStatus,
      exportTime: new Date().toISOString()
    }

    wx.setClipboardData({
      data: JSON.stringify(data, null, 2),
      success: () => {
        wx.showToast({
          title: '数据已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  },

  // 模拟添加测试数据
  addTestData() {
    wx.showModal({
      title: '添加测试数据',
      content: '确定要添加一条测试注册申请记录吗？',
      success: (res) => {
        if (res.confirm) {
          const registrationList = wx.getStorageSync('registrationList') || []
          
          const testRecord = {
            id: 'reg_test_' + Date.now(),
            userInfo: {
              openid: 'test_openid_' + Date.now(),
              nickName: '测试用户_' + Date.now(),
              avatarUrl: ''
            },
            profile: {
              nickname: '测试用户',
              learningGoal: 'daily',
              studyTimePerDay: 30,
              currentLevel: 'beginner',
              deviceInfo: 'test_device',
              appVersion: '1.0.0'
            },
            status: 'pending',
            submitTime: new Date().toISOString(),
            approveTime: null,
            approvedBy: null
          }

          registrationList.push(testRecord)
          wx.setStorageSync('registrationList', registrationList)
          
          this.loadStorageData()
          wx.showToast({
            title: '测试数据已添加',
            icon: 'success'
          })
        }
      }
    })
  }
})