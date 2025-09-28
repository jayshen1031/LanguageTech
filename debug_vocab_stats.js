// 调试词汇统计加载问题
// 在微信开发者工具控制台运行此代码

const debugVocabStats = async () => {
  console.log('🐛 开始调试词汇统计加载问题...')
  
  try {
    // 1. 检查解析历史
    console.log('1️⃣ 检查解析历史...')
    const historyRes = await wx.cloud.database().collection('japanese_parser_history').count()
    console.log(`📚 解析历史记录: ${historyRes.total}条`)
    
    if (historyRes.total === 0) {
      console.log('❌ 没有解析历史，这就是问题所在！')
      
      // 检查是否真的没有数据
      const historyData = await wx.cloud.database().collection('japanese_parser_history').limit(5).get()
      console.log('🔍 实际数据查询结果:', historyData)
      return
    }
    
    // 2. 检查词汇整合表
    console.log('2️⃣ 检查词汇整合表...')
    try {
      const vocabRes = await wx.cloud.database().collection('vocabulary_integrated').get()
      console.log(`📊 vocabulary_integrated: ${vocabRes.data.length}条记录`)
      if (vocabRes.data.length > 0) {
        console.log('✅ 词汇整合表已存在且有数据')
        console.log('📝 示例数据:', vocabRes.data.slice(0, 3))
      } else {
        console.log('⚠️ 词汇整合表存在但为空')
      }
    } catch (error) {
      console.log('❌ vocabulary_integrated 表不存在:', error.errMsg)
    }
    
    // 3. 测试云函数
    console.log('3️⃣ 测试云函数...')
    try {
      const result = await wx.cloud.callFunction({
        name: 'vocabulary-integration',
        data: { action: 'test_connection' }
      })
      console.log('✅ 云函数可以调用:', result)
    } catch (error) {
      console.log('❌ 云函数调用失败:', error)
    }
    
    // 4. 手动触发整合
    console.log('4️⃣ 手动触发整合...')
    const integrationResult = await wx.cloud.callFunction({
      name: 'vocabulary-integration',
      data: { action: 'rebuild_all' }
    })
    console.log('🔄 整合结果:', integrationResult)
    
  } catch (error) {
    console.error('🐛 调试过程出错:', error)
  }
}

// 执行调试
debugVocabStats()

// 还可以直接检查首页是否正确调用了loadVocabularyStats
console.log('\n📱 检查首页方法是否存在:')
const pages = getCurrentPages()
const currentPage = pages[pages.length - 1]
if (currentPage && typeof currentPage.loadVocabularyStats === 'function') {
  console.log('✅ loadVocabularyStats 方法存在')
  // 可以手动调用测试
  // currentPage.loadVocabularyStats()
} else {
  console.log('❌ loadVocabularyStats 方法不存在或页面未正确加载')
}