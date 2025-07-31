Page({
  data: {},

  onLoad() {
    console.log('个人中心页面加载')
    // 初始化云环境
    wx.cloud.init({
      env: 'cloud1-2g49srond2b01891'
    })
  },

  // 跳转到管理页面
  goToAdmin() {
    console.log('点击了词汇管理按钮')
    
    // 先显示加载提示
    wx.showLoading({
      title: '正在跳转...',
      mask: true
    })
    
    // 延迟一下再跳转，确保页面准备好
    setTimeout(() => {
      wx.hideLoading()
      
      wx.navigateTo({
        url: '/pages/admin/admin',
        success: (res) => {
          console.log('跳转成功:', res)
        },
        fail: (err) => {
          console.error('跳转失败详情:', err)
          
          // 尝试使用 redirectTo
          wx.redirectTo({
            url: '/pages/admin/admin',
            fail: (err2) => {
              console.error('redirectTo 也失败:', err2)
              
              // 显示详细错误信息
              wx.showModal({
                title: '跳转失败',
                content: `错误信息: ${err.errMsg}\n错误码: ${err.errno || '无'}`,
                showCancel: false
              })
            }
          })
        }
      })
    }, 100)
  }
})