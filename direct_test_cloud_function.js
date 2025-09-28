// 直接测试云函数执行
// 在微信开发者工具控制台粘贴运行

console.log('🚀 直接测试云函数执行...')

wx.cloud.callFunction({
  name: 'vocabulary-integration',
  data: {
    action: 'rebuild_all'
  }
}).then(result => {
  console.log('📡 云函数返回完整结果:', result)
  console.log('📡 result.result:', result.result)
  
  if (result.result) {
    if (result.result.success) {
      console.log(`✅ 成功! 总词汇: ${result.result.totalWords}`)
      console.log(`📊 详细统计:`, result.result.statistics)
    } else {
      console.log(`❌ 失败: ${result.result.error}`)
    }
  } else {
    console.log('❌ 返回格式异常，没有result字段')
  }
  
  // 立即检查数据库
  setTimeout(() => {
    wx.cloud.database().collection('vocabulary_integrated').count().then(res => {
      console.log(`📊 数据库检查: vocabulary_integrated 有 ${res.total} 条记录`)
      if (res.total > 0) {
        console.log('🎉 数据库集合创建成功!')
      } else {
        console.log('❌ 数据库集合仍然为空')
      }
    }).catch(err => {
      console.log('❌ 数据库集合不存在:', err)
    })
  }, 2000)
  
}).catch(error => {
  console.error('❌ 云函数调用失败:', error)
  console.error('错误详情:', {
    errCode: error.errCode,
    errMsg: error.errMsg
  })
  
  if (error.errCode === -1) {
    console.log('💡 云函数不存在或未正确部署')
  } else if (error.errCode === -502005) {
    console.log('💡 数据库权限问题')
  }
})