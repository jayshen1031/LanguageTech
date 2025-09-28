// 简单测试云函数和数据库创建
// 在微信开发者工具控制台运行

const testSimpleIntegration = async () => {
  console.log('🚀 开始简单测试...')
  
  try {
    // 1. 直接测试云函数是否能调用
    console.log('1️⃣ 测试云函数基本调用...')
    const testResult = await wx.cloud.callFunction({
      name: 'vocabulary-integration',
      data: {
        action: 'rebuild_all'
      }
    })
    
    console.log('📡 云函数返回结果:', testResult)
    
    if (testResult.result) {
      if (testResult.result.success) {
        console.log(`✅ 成功！创建了 ${testResult.result.totalWords} 个词汇`)
      } else {
        console.log(`❌ 失败: ${testResult.result.error}`)
      }
    } else {
      console.log('❌ 云函数返回格式异常:', testResult)
    }
    
    // 2. 等待一下，然后检查数据库
    setTimeout(async () => {
      console.log('2️⃣ 检查数据库是否创建成功...')
      try {
        const vocabCheck = await wx.cloud.database().collection('vocabulary_integrated').count()
        console.log(`📊 vocabulary_integrated 表记录数: ${vocabCheck.total}`)
        
        if (vocabCheck.total > 0) {
          console.log('🎉 数据库集合创建成功！')
          
          // 获取几条样本数据
          const sampleData = await wx.cloud.database().collection('vocabulary_integrated').limit(3).get()
          console.log('📝 样本数据:', sampleData.data)
        } else {
          console.log('❌ 数据库集合仍然为空')
        }
      } catch (dbError) {
        console.log('❌ 数据库集合仍不存在:', dbError.errMsg)
      }
    }, 3000)
    
    // 3. 同时检查解析历史
    console.log('3️⃣ 检查解析历史数据...')
    const historyCheck = await wx.cloud.database().collection('japanese_parser_history').count()
    console.log(`📚 解析历史记录数: ${historyCheck.total}`)
    
    if (historyCheck.total === 0) {
      console.log('⚠️ 没有解析历史数据，无法进行整合')
      console.log('💡 需要先去日语解析页面解析一些内容')
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error)
    
    if (error.errCode === -1) {
      console.log('💡 可能的问题：')
      console.log('   1. 云函数未正确部署')
      console.log('   2. 云函数名称不匹配')
      console.log('   3. 云开发环境配置错误')
    }
  }
}

// 执行测试
testSimpleIntegration()

// 额外：手动创建一个测试记录来验证云函数
setTimeout(async () => {
  console.log('\n4️⃣ 如果上面成功了，我们再次手动触发整合...')
  try {
    const manualResult = await wx.cloud.callFunction({
      name: 'vocabulary-integration',
      data: { action: 'rebuild_all' }
    })
    console.log('🔄 手动触发结果:', manualResult)
  } catch (error) {
    console.log('❌ 手动触发失败:', error)
  }
}, 5000)