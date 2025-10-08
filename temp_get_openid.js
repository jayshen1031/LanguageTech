// 临时获取openid的测试文件
// 在微信开发者工具的控制台运行这段代码

// 方法1：通过云函数获取
wx.cloud.callFunction({
  name: 'user-auth',
  data: {
    action: 'login'
  }
}).then(result => {
  console.log('🔑 您的openid是:', result.result.openid)
  console.log('📋 完整结果:', result)
  
  // 生成代码片段
  const codeSnippet = `// 将以下代码添加到管理员openid列表中：
const adminOpenIds = [
  'oyehIvjzBJ8kK-KbqRBCa4anbc7Y', // 原管理员openid
  '${result.result.openid}' // 您的openid
]`
  
  console.log('📝 代码片段:')
  console.log(codeSnippet)
}).catch(error => {
  console.error('❌ 获取openid失败:', error)
})

// 方法2：检查本地存储
const userInfo = wx.getStorageSync('userInfo')
if (userInfo && userInfo.openid) {
  console.log('💾 本地存储的openid:', userInfo.openid)
} else {
  console.log('❌ 本地没有找到openid')
}