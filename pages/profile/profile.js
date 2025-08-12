const audioCache = require('../../utils/audioCache')

Page({
  data: {
    cacheStats: {
      fileCount: 0,
      totalSizeMB: '0.00'
    }
  },

  onLoad() {
    console.log('个人中心页面加载')
    // 初始化云环境
    wx.cloud.init({
      env: 'cloud1-2g49srond2b01891'
    })
    
    // 获取缓存统计
    this.updateCacheStats()
  },
  
  onShow() {
    // 每次显示页面时更新缓存统计
    this.updateCacheStats()
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
  }
})