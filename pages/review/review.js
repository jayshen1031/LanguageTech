const authGuard = require('../../utils/authGuard')

Page({
  data: {},
  async onLoad() {
    // 检查基础登录状态
    const isAuthenticated = await authGuard.requireBasicAuth(this)
    if (!isAuthenticated) {
      return
    }
  }
})