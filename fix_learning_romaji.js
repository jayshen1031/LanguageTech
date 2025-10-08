/**
 * 修复智能学习页面例句罗马音显示问题
 * 在小程序开发者工具控制台运行此工具
 */

// 修复例句罗马音的函数
function fixLearningRomaji() {
  console.log('🔧 开始修复智能学习页面的例句罗马音...')
  
  wx.showLoading({
    title: '修复例句罗马音...'
  })
  
  // 调用词汇整合云函数的修复功能
  wx.cloud.callFunction({
    name: 'vocabulary-integration',
    data: {
      action: 'fix_example_romaji'
    }
  }).then(result => {
    wx.hideLoading()
    
    console.log('✅ 修复例句罗马音完成')
    console.log('修复结果:', result.result)
    
    if (result.result.success) {
      const { totalProcessed, examplesFixed, recordsUpdated } = result.result
      
      console.log(`📊 修复统计:`)
      console.log(`   处理词汇总数: ${totalProcessed}`)
      console.log(`   修复例句数量: ${examplesFixed}`)
      console.log(`   更新记录数量: ${recordsUpdated}`)
      
      wx.showModal({
        title: '例句罗马音修复完成',
        content: `成功修复了 ${examplesFixed} 个例句的罗马音\\n\\n处理词汇: ${totalProcessed} 个\\n更新记录: ${recordsUpdated} 个\\n\\n现在智能学习页面的例句应该可以正常显示罗马音了！`,
        showCancel: false,
        confirmText: '测试效果',
        success: (res) => {
          if (res.confirm) {
            console.log('💡 提示：返回智能学习页面刷新数据，查看修复效果')
            wx.showToast({
              title: '请刷新智能学习页面',
              icon: 'success',
              duration: 3000
            })
          }
        }
      })
    } else {
      console.error('❌ 修复失败:', result.result.error)
      wx.showModal({
        title: '修复失败',
        content: result.result.error || '例句罗马音修复失败，请重试',
        showCancel: false
      })
    }
  }).catch(error => {
    wx.hideLoading()
    console.error('❌ 云函数调用失败:', error)
    wx.showModal({
      title: '修复失败',
      content: '云函数调用失败，请检查网络连接后重试',
      showCancel: false
    })
  })
}

// 验证修复效果的函数
function testLearningRomaji() {
  console.log('🧪 测试智能学习页面罗马音显示效果...')
  
  wx.showLoading({
    title: '测试数据加载...'
  })
  
  // 获取智能学习计划来测试
  wx.cloud.callFunction({
    name: 'vocabulary-integration',
    data: {
      action: 'get_smart_plan',
      totalCount: 5,
      newRatio: 1,
      reviewRatio: 1,
      type: 'mixed'
    }
  }).then(result => {
    wx.hideLoading()
    
    if (result.result.success && result.result.words) {
      const words = result.result.words
      console.log(`📋 获取到 ${words.length} 个测试词汇`)
      
      let totalExamples = 0
      let romajiExamples = 0
      let sampleExamples = []
      
      words.forEach((word, index) => {
        if (word.examples && Array.isArray(word.examples)) {
          word.examples.forEach(example => {
            totalExamples++
            if (example.romaji && example.romaji.trim() !== '') {
              romajiExamples++
            }
            
            // 收集样本用于显示
            if (sampleExamples.length < 3) {
              sampleExamples.push({
                word: word.word,
                jp: example.jp,
                romaji: example.romaji || '❌ 缺失',
                cn: example.cn
              })
            }
          })
        }
      })
      
      const romajiRate = totalExamples > 0 ? Math.round((romajiExamples / totalExamples) * 100) : 0
      
      console.log(`📊 测试结果:`)
      console.log(`   总例句数: ${totalExamples}`)
      console.log(`   有罗马音: ${romajiExamples}`)
      console.log(`   罗马音覆盖率: ${romajiRate}%`)
      
      // 显示样本例句
      console.log(`\\n📝 样本例句:`)
      sampleExamples.forEach((sample, index) => {
        console.log(`   ${index + 1}. 单词: ${sample.word}`)
        console.log(`      日文: ${sample.jp}`)
        console.log(`      罗马音: ${sample.romaji}`)
        console.log(`      中文: ${sample.cn}`)
        console.log(`      ---`)
      })
      
      wx.showModal({
        title: '罗马音测试结果',
        content: `测试完成！\\n\\n总例句数: ${totalExamples}\\n有罗马音: ${romajiExamples}\\n覆盖率: ${romajiRate}%\\n\\n${romajiRate >= 80 ? '✅ 罗马音显示正常' : romajiRate >= 50 ? '⚠️ 部分例句缺少罗马音' : '❌ 大部分例句缺少罗马音'}`,
        showCancel: romajiRate < 80,
        cancelText: '重新修复',
        confirmText: '查看详情',
        success: (res) => {
          if (res.confirm) {
            console.log('\\n📋 详细的测试数据已输出到控制台')
          } else if (res.cancel && romajiRate < 80) {
            // 重新修复
            fixLearningRomaji()
          }
        }
      })
      
    } else {
      console.log('❌ 获取学习计划失败:', result.result.error)
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    }
  }).catch(error => {
    wx.hideLoading()
    console.error('❌ 测试失败:', error)
  })
}

// 快速检查当前词汇库状态
function quickCheckVocabulary() {
  console.log('⚡ 快速检查词汇库状态...')
  
  wx.cloud.callFunction({
    name: 'vocabulary-integration',
    data: {
      action: 'get_smart_plan',
      totalCount: 1,
      type: 'mixed'
    }
  }).then(result => {
    if (result.result.success) {
      const stats = result.result.statistics
      console.log('📊 词汇库状态:')
      console.log(`   总词汇数: ${stats.totalAvailable}`)
      console.log(`   可新学: ${stats.newWordsAvailable}`)
      console.log(`   可复习: ${stats.reviewWordsAvailable}`)
      
      wx.showToast({
        title: `词汇库: ${stats.totalAvailable}个`,
        icon: 'success'
      })
    } else {
      console.log('❌ 词汇库为空或获取失败')
      wx.showToast({
        title: '词汇库为空',
        icon: 'none'
      })
    }
  })
}

console.log('🔧 智能学习罗马音修复工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   fixLearningRomaji() - 修复例句罗马音')
console.log('   testLearningRomaji() - 测试修复效果')
console.log('   quickCheckVocabulary() - 快速检查词汇库状态')