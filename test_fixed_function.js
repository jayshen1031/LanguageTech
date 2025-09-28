// 测试修复后的云函数
console.log('🚀 测试修复后的云函数...')

wx.cloud.callFunction({
  name: 'vocabulary-integration',
  data: {
    action: 'rebuild_all'
  }
}).then(result => {
  console.log('✅ 云函数执行成功!')
  console.log('📡 完整结果:', result)
  
  if (result.result && result.result.success) {
    console.log(`🎉 成功创建词汇库! 总词汇: ${result.result.totalWords}`)
    console.log(`📊 统计信息:`, result.result.statistics)
    
    // 验证数据库是否真的创建了
    setTimeout(() => {
      wx.cloud.database().collection('vocabulary_integrated').count().then(countRes => {
        console.log(`📊 数据库验证: vocabulary_integrated 表有 ${countRes.total} 条记录`)
        
        if (countRes.total > 0) {
          console.log('🎉 确认成功! 数据库集合已创建并有数据')
          
          // 获取几条样本数据看看
          wx.cloud.database().collection('vocabulary_integrated').limit(3).get().then(sampleRes => {
            console.log('📝 样本数据:')
            sampleRes.data.forEach((word, index) => {
              console.log(`${index + 1}. ${word.word} (${word.romaji}) - ${word.meaning}`)
            })
          })
        } else {
          console.log('❌ 奇怪，云函数说成功了但数据库还是空的')
        }
      }).catch(err => {
        console.log('❌ 数据库验证失败:', err)
      })
    }, 2000)
    
  } else {
    console.log('❌ 云函数执行失败:')
    console.log('错误信息:', result.result ? result.result.error : '未知错误')
  }
  
}).catch(error => {
  console.error('❌ 云函数调用失败:', error)
  console.log('错误代码:', error.errCode)
  console.log('错误信息:', error.errMsg)
})