// 强制触发词汇整合测试
// 在微信开发者工具控制台中运行此代码

const forceIntegration = async () => {
  console.log('🚀 开始强制触发词汇整合...')
  
  try {
    // 1. 检查解析历史
    const historyRes = await wx.cloud.database().collection('japanese_parser_history').count()
    console.log(`📚 解析历史记录: ${historyRes.total}条`)
    
    if (historyRes.total === 0) {
      console.log('❌ 没有解析历史，无法进行整合')
      return
    }
    
    // 2. 直接调用云函数进行整合
    console.log('🔄 正在调用云函数进行整合...')
    const result = await wx.cloud.callFunction({
      name: 'vocabulary-integration',
      data: {
        action: 'rebuild_all'
      }
    })
    
    if (result.result.success) {
      console.log(`✅ 整合成功！共整合了 ${result.result.totalWords} 个词汇`)
      console.log('📋 整合详情:', result.result)
      
      // 3. 验证数据库集合是否创建
      try {
        const vocabularyRes = await wx.cloud.database().collection('vocabulary_integrated').count()
        console.log(`🎯 vocabulary_integrated 集合已创建，包含 ${vocabularyRes.total} 条记录`)
      } catch (error) {
        console.error('❌ vocabulary_integrated 集合仍不存在:', error)
      }
      
    } else {
      console.error('❌ 整合失败:', result.result.error)
    }
    
  } catch (error) {
    console.error('❌ 强制整合过程出错:', error)
    
    if (error.errCode === -1) {
      console.log('💡 云函数不存在，请先部署 vocabulary-integration 云函数')
    }
  }
}

// 执行测试
forceIntegration()

// 如果成功，然后测试首页数据加载
setTimeout(async () => {
  console.log('\n🔄 测试首页数据加载...')
  try {
    const allWords = await wx.cloud.database().collection('vocabulary_integrated').get()
    console.log(`📊 首页应该显示的统计数据:`)
    console.log(`   - 总词汇量: ${allWords.data.length}`)
    console.log(`   - 新词汇: ${allWords.data.filter(w => w.totalOccurrences <= 1).length}`)
    console.log(`   - 复习词汇: ${allWords.data.filter(w => w.totalOccurrences > 1).length}`)
  } catch (error) {
    console.log('❌ 无法加载词汇统计:', error)
  }
}, 3000)