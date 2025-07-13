// 网络请求封装
const app = getApp()

// 基础请求方法
const request = (options) => {
  const { url, method = 'GET', data = {}, header = {} } = options
  
  // 获取token
  const token = wx.getStorageSync('token')
  
  // 设置默认header
  const defaultHeader = {
    'content-type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
  
  // 合并header
  const finalHeader = Object.assign({}, defaultHeader, header)
  
  // 显示加载动画
  wx.showLoading({
    title: '加载中...',
    mask: true
  })
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.apiBase + url,
      method,
      data,
      header: finalHeader,
      success: (res) => {
        wx.hideLoading()
        
        if (res.statusCode === 200) {
          if (res.data.code === 0) {
            resolve(res.data.data)
          } else {
            // 业务错误
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            })
            reject(res.data)
          }
        } else if (res.statusCode === 401) {
          // token过期，需要重新登录
          wx.removeStorageSync('token')
          wx.showModal({
            title: '提示',
            content: '登录已过期，请重新登录',
            showCancel: false,
            success: () => {
              // 跳转到登录页
              wx.redirectTo({
                url: '/pages/login/login'
              })
            }
          })
          reject(res)
        } else {
          // 其他错误
          wx.showToast({
            title: `请求失败: ${res.statusCode}`,
            icon: 'none'
          })
          reject(res)
        }
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

// 导出各种请求方法
module.exports = {
  get: (url, data, header) => request({ url, method: 'GET', data, header }),
  post: (url, data, header) => request({ url, method: 'POST', data, header }),
  put: (url, data, header) => request({ url, method: 'PUT', data, header }),
  delete: (url, data, header) => request({ url, method: 'DELETE', data, header }),
  request
}