// 用户管理页面（管理员专用）
Page({
  data: {
    isAdmin: false,
    currentUser: null,
    registrationList: [],
    filteredList: [],
    filterStatus: 'all', // all, pending, approved, rejected
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0
  },

  onLoad() {
    this.checkAdminPermission()
  },

  onShow() {
    if (this.data.isAdmin) {
      this.loadRegistrationList()
    }
  },

  // 检查管理员权限
  checkAdminPermission() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showModal({
        title: '权限不足',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    const isAdmin = this.checkIfAdmin(userInfo)
    if (!isAdmin) {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    this.setData({
      isAdmin: true,
      currentUser: userInfo
    })
  },

  // 检查是否为管理员（与register.js中的逻辑保持一致）
  checkIfAdmin(userInfo) {
    if (!userInfo) return false
    
    const adminNicknames = [
      '项目负责人', 
      '管理员',
      'Jay',
      'Admin'
    ]
    
    if (adminNicknames.includes(userInfo.nickName)) {
      return true
    }
    
    if (userInfo.openid && userInfo.openid.includes('temp_')) {
      return true
    }
    
    return false
  },

  // 加载注册申请列表
  loadRegistrationList() {
    try {
      const registrationList = wx.getStorageSync('registrationList') || []
      
      // 按提交时间倒序排列
      registrationList.sort((a, b) => new Date(b.submitTime) - new Date(a.submitTime))
      
      // 统计各状态数量
      const pendingCount = registrationList.filter(item => item.status === 'pending').length
      const approvedCount = registrationList.filter(item => item.status === 'approved').length
      const rejectedCount = registrationList.filter(item => item.status === 'rejected').length
      
      this.setData({
        registrationList: registrationList,
        totalCount: registrationList.length,
        pendingCount: pendingCount,
        approvedCount: approvedCount,
        rejectedCount: rejectedCount
      })
      
      // 应用当前筛选
      this.applyFilter()
    } catch (error) {
      console.error('加载注册列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 筛选状态改变
  onFilterChange(e) {
    this.setData({
      filterStatus: e.detail.value
    })
    this.applyFilter()
  },

  // 应用筛选
  applyFilter() {
    let filteredList = this.data.registrationList
    
    if (this.data.filterStatus !== 'all') {
      filteredList = this.data.registrationList.filter(item => 
        item.status === this.data.filterStatus
      )
    }
    
    this.setData({
      filteredList: filteredList
    })
  },

  // 查看申请详情
  viewDetail(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.filteredList[index]
    
    const detail = `申请人：${item.userInfo.nickName}
提交时间：${new Date(item.submitTime).toLocaleString()}
学习目标：${this.getLearningGoalText(item.profile.learningGoal)}
当前水平：${this.getLevelText(item.profile.currentLevel)}
每日学习时间：${item.profile.studyTimePerDay}分钟
设备信息：${item.profile.deviceInfo ? item.profile.deviceInfo.platform : '未知'}
状态：${this.getStatusText(item.status)}`
    
    wx.showModal({
      title: '申请详情',
      content: detail,
      showCancel: false,
      confirmText: '关闭'
    })
  },

  // 审核通过
  async approveUser(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.filteredList[index]
    
    wx.showModal({
      title: '确认审核',
      content: `确定要通过 ${item.userInfo.nickName} 的申请吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateUserStatus(item.id, 'approved')
        }
      }
    })
  },

  // 审核拒绝
  async rejectUser(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.filteredList[index]
    
    wx.showModal({
      title: '确认审核',
      content: `确定要拒绝 ${item.userInfo.nickName} 的申请吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateUserStatus(item.id, 'rejected')
        }
      }
    })
  },

  // 删除申请
  deleteUser(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.filteredList[index]
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除 ${item.userInfo.nickName} 的申请记录吗？此操作不可恢复。`,
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          this.removeUserRecord(item.id)
        }
      }
    })
  },

  // 更新用户状态
  updateUserStatus(recordId, newStatus) {
    try {
      let registrationList = wx.getStorageSync('registrationList') || []
      const recordIndex = registrationList.findIndex(item => item.id === recordId)
      
      if (recordIndex >= 0) {
        registrationList[recordIndex].status = newStatus
        registrationList[recordIndex].approveTime = new Date().toISOString()
        registrationList[recordIndex].approvedBy = this.data.currentUser.nickName
        
        wx.setStorageSync('registrationList', registrationList)
        
        wx.showToast({
          title: newStatus === 'approved' ? '已通过审核' : '已拒绝申请',
          icon: 'success'
        })
        
        // 重新加载列表
        this.loadRegistrationList()
      }
    } catch (error) {
      console.error('更新用户状态失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 删除用户记录
  removeUserRecord(recordId) {
    try {
      let registrationList = wx.getStorageSync('registrationList') || []
      registrationList = registrationList.filter(item => item.id !== recordId)
      
      wx.setStorageSync('registrationList', registrationList)
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      // 重新加载列表
      this.loadRegistrationList()
    } catch (error) {
      console.error('删除用户记录失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 批量操作
  batchApprove() {
    const pendingList = this.data.registrationList.filter(item => item.status === 'pending')
    
    if (pendingList.length === 0) {
      wx.showToast({
        title: '没有待审核的申请',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量审核',
      content: `确定要通过所有 ${pendingList.length} 个待审核申请吗？`,
      success: (res) => {
        if (res.confirm) {
          let registrationList = wx.getStorageSync('registrationList') || []
          let updateCount = 0
          
          registrationList.forEach(item => {
            if (item.status === 'pending') {
              item.status = 'approved'
              item.approveTime = new Date().toISOString()
              item.approvedBy = this.data.currentUser.nickName
              updateCount++
            }
          })
          
          wx.setStorageSync('registrationList', registrationList)
          
          wx.showToast({
            title: `已批量通过${updateCount}个申请`,
            icon: 'success'
          })
          
          this.loadRegistrationList()
        }
      }
    })
  },

  // 清空已处理记录
  clearProcessed() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有已通过和已拒绝的申请记录吗？此操作不可恢复。',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          let registrationList = wx.getStorageSync('registrationList') || []
          registrationList = registrationList.filter(item => item.status === 'pending')
          
          wx.setStorageSync('registrationList', registrationList)
          
          wx.showToast({
            title: '清空成功',
            icon: 'success'
          })
          
          this.loadRegistrationList()
        }
      }
    })
  },

  // 刷新数据
  onRefresh() {
    this.loadRegistrationList()
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    })
  },

  // 辅助方法
  getLearningGoalText(goal) {
    const goalMap = {
      'daily': '日常交流',
      'exam': '考试备考',
      'business': '商务日语',
      'travel': '旅游日语'
    }
    return goalMap[goal] || goal
  },

  getLevelText(level) {
    const levelMap = {
      'beginner': '初学者',
      'intermediate': '中级',
      'advanced': '高级'
    }
    return levelMap[level] || level
  },

  getStatusText(status) {
    const statusMap = {
      'pending': '待审核',
      'approved': '已通过',
      'rejected': '已拒绝'
    }
    return statusMap[status] || status
  },

  getStatusClass(status) {
    const statusClassMap = {
      'pending': 'status-pending',
      'approved': 'status-approved', 
      'rejected': 'status-rejected'
    }
    return statusClassMap[status] || ''
  }
})