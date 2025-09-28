// 简单快速测试 - 只处理前10条记录
console.log('🚀 简单快速测试...')

wx.cloud.callFunction({
  name: 'vocabulary-integration',
  data: {
    action: 'test_connection' // 简单测试连接
  }
}).then(result => {
  console.log('✅ 简单测试结果:', result)
}).catch(error => {
  console.error('❌ 简单测试失败:', error)
})

// 同时试试手动添加一条测试数据
setTimeout(() => {
  console.log('📝 手动添加测试词汇...')
  
  wx.cloud.database().collection('vocabulary_integrated').add({
    data: {
      word: '測試',
      romaji: 'tesuto',
      meaning: '测试',
      examples: [],
      sources: [],
      totalOccurrences: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
      level: 'test',
      tags: ['手动测试']
    }
  }).then(addResult => {
    console.log('✅ 手动添加成功:', addResult)
    
    // 验证数据库
    wx.cloud.database().collection('vocabulary_integrated').count().then(countRes => {
      console.log(`📊 当前数据库有 ${countRes.total} 条记录`)
      
      if (countRes.total > 0) {
        console.log('🎉 数据库可以正常写入!')
        console.log('💡 现在可以尝试让首页调用后台整合了')
      }
    })
  }).catch(addError => {
    console.error('❌ 手动添加失败:', addError)
  })
}, 2000)