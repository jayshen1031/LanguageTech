/**
 * 强制重建词汇表确保例句包含罗马音
 * 这个脚本会先完全清空词汇表，然后重新整合所有数据
 */

// 强制重建词汇表并验证罗马音
function forceRebuildWithRomaji() {
  console.log('🔧 强制重建词汇表，确保例句包含罗马音...')
  
  wx.showModal({
    title: '确认重建词汇表',
    content: '将清空现有词汇表并重新整合所有解析记录，确保例句包含罗马音。\n\n此操作不可撤销，确认继续？',
    confirmText: '确认重建',
    cancelText: '取消',
    success: function(res) {
      if (res.confirm) {
        performForceRebuild()
      }
    }
  })
}

function performForceRebuild() {
  wx.showLoading({
    title: '强制重建中...'
  })
  
  console.log('🗑️ 开始强制重建流程...')
  
  // 调用云函数强制重建
  wx.cloud.callFunction({
    name: 'vocabulary-integration',
    data: { action: 'rebuild_all' }
  }).then(result => {
    wx.hideLoading()
    console.log('🎉 强制重建完成:', result.result)
    
    if (result.result.success) {
      const { addedCount, processedRecords } = result.result
      
      wx.showModal({
        title: '重建完成',
        content: `强制重建成功！\n\n处理记录: ${processedRecords || 0}\n重建词汇: ${addedCount || 0}\n\n立即验证罗马音效果？`,
        confirmText: '验证效果',
        cancelText: '稍后验证',
        success: function(res) {
          if (res.confirm) {
            // 等待2秒确保数据库写入完成
            setTimeout(() => {
              verifyRomajiAfterRebuild()
            }, 2000)
          }
        }
      })
    } else {
      wx.showModal({
        title: '重建失败',
        content: result.result.error || '重建过程中出现错误',
        showCancel: false
      })
    }
  }).catch(error => {
    wx.hideLoading()
    console.error('❌ 强制重建失败:', error)
    
    wx.showModal({
      title: '重建失败',
      content: '网络错误或云函数超时，请稍后重试',
      showCancel: false
    })
  })
}

// 验证重建后的罗马音效果
function verifyRomajiAfterRebuild() {
  console.log('🧪 验证重建后的罗马音效果...')
  
  wx.showLoading({
    title: '验证罗马音...'
  })
  
  wx.cloud.callFunction({
    name: 'vocabulary-integration',
    data: {
      action: 'get_smart_plan',
      totalCount: 5,
      type: 'mixed'
    }
  }).then(result => {
    wx.hideLoading()
    
    if (result.result.success && result.result.words) {
      const words = result.result.words
      let totalExamples = 0
      let romajiExamples = 0
      let sampleData = []
      
      console.log('=== 验证结果详情 ===')
      
      words.forEach((word, wordIndex) => {
        console.log(`\n词汇 ${wordIndex + 1}: ${word.word} (${word.meaning})`)
        
        if (word.examples && Array.isArray(word.examples)) {
          word.examples.forEach((example, exIndex) => {
            totalExamples++
            const hasRomaji = example.romaji && example.romaji.trim() !== ''
            
            console.log(`  例句 ${exIndex + 1}:`)
            console.log(`    日文: ${example.jp}`)
            console.log(`    罗马音: ${hasRomaji ? example.romaji : '❌ 缺失'}`)
            console.log(`    中文: ${example.cn}`)
            console.log(`    罗马音状态: ${hasRomaji ? '✅' : '❌'}`)
            
            if (hasRomaji) {
              romajiExamples++
            }
            
            // 收集样本用于显示
            if (sampleData.length < 5) {
              sampleData.push({
                word: word.word,
                jp: example.jp,
                romaji: hasRomaji ? example.romaji : '❌ 缺失',
                hasRomaji: hasRomaji
              })
            }
          })
        } else {
          console.log(`  ⚠️ 该词汇没有例句`)
        }
      })
      
      const successRate = totalExamples > 0 ? Math.round((romajiExamples / totalExamples) * 100) : 0
      
      console.log(`\n📊 验证统计结果:`)
      console.log(`   检查词汇: ${words.length} 个`)
      console.log(`   总例句数: ${totalExamples} 个`)
      console.log(`   有罗马音: ${romajiExamples} 个`)
      console.log(`   成功率: ${successRate}%`)
      
      // 显示样本数据
      console.log(`\n📝 样本数据:`)
      sampleData.forEach((sample, index) => {
        console.log(`   ${index + 1}. ${sample.word}`)
        console.log(`      ${sample.jp}`)
        console.log(`      ${sample.romaji}`)
      })
      
      let statusMsg = ''
      let statusIcon = ''
      
      if (successRate >= 90) {
        statusMsg = '🎉 完美！罗马音显示正常'
        statusIcon = 'success'
      } else if (successRate >= 70) {
        statusMsg = '⚠️ 大部分例句有罗马音'
        statusIcon = 'success'
      } else if (successRate >= 30) {
        statusMsg = '⚠️ 部分例句有罗马音'
        statusIcon = 'none'
      } else {
        statusMsg = '❌ 大部分例句缺少罗马音'
        statusIcon = 'error'
      }
      
      wx.showModal({
        title: '罗马音验证完成',
        content: `验证结果:\n\n词汇数: ${words.length}\n例句数: ${totalExamples}\n罗马音覆盖率: ${successRate}%\n\n${statusMsg}\n\n详细信息请查看控制台。\n\n${successRate >= 70 ? '现在可以回到智能学习页面查看效果！' : '如果仍有问题，可能需要检查解析历史数据。'}`,
        showCancel: false,
        confirmText: '知道了'
      })
      
    } else {
      console.log('❌ 获取验证数据失败:', result.result.error)
      wx.showToast({
        title: '验证失败',
        icon: 'error'
      })
    }
  }).catch(error => {
    wx.hideLoading()
    console.error('❌ 验证过程失败:', error)
  })
}

// 快速检查数据库中的例句结构
function quickCheckDatabaseStructure() {
  console.log('🔍 快速检查数据库中的例句结构...')
  
  // 直接查询词汇表检查结构
  wx.cloud.database().collection('vocabulary_integrated')
    .limit(3)
    .get()
    .then(res => {
      console.log('=== 数据库例句结构检查 ===')
      
      res.data.forEach((word, index) => {
        console.log(`\n词汇 ${index + 1}: ${word.word}`)
        console.log('完整数据结构:', word)
        
        if (word.examples && Array.isArray(word.examples)) {
          word.examples.forEach((example, exIndex) => {
            console.log(`  例句 ${exIndex + 1} 结构:`)
            console.log('    jp:', example.jp)
            console.log('    romaji:', example.romaji)
            console.log('    cn:', example.cn)
            console.log('    完整例句对象:', example)
          })
        }
      })
      
      wx.showToast({
        title: '检查完成，查看控制台',
        icon: 'success'
      })
    })
    .catch(error => {
      console.error('数据库检查失败:', error)
    })
}

console.log('🔧 强制重建罗马音工具已加载')
console.log('📝 可用命令:')
console.log('   forceRebuildWithRomaji() - 强制重建词汇表')
console.log('   quickCheckDatabaseStructure() - 检查数据库结构')
console.log('   verifyRomajiAfterRebuild() - 验证罗马音效果')