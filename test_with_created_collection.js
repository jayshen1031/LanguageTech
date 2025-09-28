// 测试已创建集合后的云函数
console.log('🎉 vocabulary_integrated 集合已创建，开始测试...')

wx.cloud.callFunction({
  name: 'vocabulary-integration',
  data: {
    action: 'rebuild_all'
  }
}).then(result => {
  console.log('✅ 云函数执行完成!')
  console.log('📡 完整返回:', result)
  
  if (result.result && result.result.success) {
    console.log(`🎉 成功! 创建了 ${result.result.totalWords} 个词汇`)
    console.log('📊 详细统计:', result.result.statistics)
    
    // 立即验证数据库
    setTimeout(() => {
      wx.cloud.database().collection('vocabulary_integrated').count().then(res => {
        console.log(`📊 数据库确认: ${res.total} 条词汇记录`)
        
        if (res.total > 0) {
          console.log('🎉 完美! 数据库有数据了!')
          
          // 看看样本数据
          wx.cloud.database().collection('vocabulary_integrated').limit(5).get().then(sample => {
            console.log('📝 前5个词汇:')
            sample.data.forEach((word, i) => {
              console.log(`${i+1}. ${word.word} (${word.romaji}) - ${word.meaning}`)
            })
            
            console.log('🎯 现在首页应该能正常显示词汇统计了!')
          })
        } else {
          console.log('❌ 奇怪，集合存在但没有数据')
        }
      })
    }, 1500)
    
  } else {
    console.log('❌ 云函数执行失败')
    console.log('错误:', result.result ? result.result.error : '未知错误')
  }
  
}).catch(error => {
  console.error('❌ 调用失败:', error)
})