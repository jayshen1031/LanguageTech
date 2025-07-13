// 授权相关工具函数

// 获取用户信息
const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        resolve(res.userInfo)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// 微信登录
const wxLogin = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('登录失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// 检查授权状态
const checkAuth = (scope) => {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting[scope]) {
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// 请求授权
const requestAuth = (scope) => {
  return new Promise((resolve, reject) => {
    wx.authorize({
      scope: scope,
      success: () => {
        resolve(true)
      },
      fail: () => {
        // 用户拒绝授权，引导到设置页
        wx.showModal({
          title: '授权提示',
          content: '需要您的授权才能使用该功能',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting[scope]) {
                    resolve(true)
                  } else {
                    resolve(false)
                  }
                }
              })
            } else {
              resolve(false)
            }
          }
        })
      }
    })
  })
}

// 获取录音权限
const getRecordAuth = async () => {
  const hasAuth = await checkAuth('scope.record')
  if (!hasAuth) {
    return await requestAuth('scope.record')
  }
  return true
}

// 保存token
const saveToken = (token) => {
  wx.setStorageSync('token', token)
}

// 获取token
const getToken = () => {
  return wx.getStorageSync('token')
}

// 清除token
const clearToken = () => {
  wx.removeStorageSync('token')
}

// 检查是否已登录
const isLoggedIn = () => {
  const token = getToken()
  return !!token
}

module.exports = {
  getUserProfile,
  wxLogin,
  checkAuth,
  requestAuth,
  getRecordAuth,
  saveToken,
  getToken,
  clearToken,
  isLoggedIn
}