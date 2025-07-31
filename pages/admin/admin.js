// 管理页面
Page({
  data: {
    isLoading: false,
    message: ''
  },
  
  onLoad() {
    console.log('管理页面加载成功')
    // 初始化云环境
    wx.cloud.init({
      env: 'cloud1-2g49srond2b01891'
    })
  },

  // 初始化词汇数据库
  async initVocabulary() {
    this.setData({ isLoading: true })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'init-vocabulary',
        data: {
          action: 'init'
        }
      })
      
      if (res.result.success) {
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        })
        this.setData({
          message: res.result.message
        })
      } else {
        wx.showToast({
          title: '初始化失败',
          icon: 'none'
        })
      }
      
    } catch (error) {
      console.error('初始化失败:', error)
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },
  
  // 更新随机排序
  async updateRandom() {
    this.setData({ isLoading: true })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'init-vocabulary',
        data: {
          action: 'updateRandom'
        }
      })
      
      if (res.result.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
        this.setData({
          message: res.result.message
        })
      }
      
    } catch (error) {
      console.error('更新失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },
  
  // 查看词汇数量
  async checkCount() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('n2_vocabulary').count()
      
      wx.showModal({
        title: '词汇统计',
        content: `当前数据库中有 ${res.total} 个N2词汇`,
        showCancel: false
      })
      
    } catch (error) {
      console.error('查询失败:', error)
    }
  }
})