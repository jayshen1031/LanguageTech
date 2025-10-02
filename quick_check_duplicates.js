// 快速检查重复词汇
// 在微信开发者工具控制台运行

const quickCheckDuplicates = async () => {
  console.log('🔍 快速检查词汇库重复情况...')
  
  try {
    // 1. 总数统计
    const totalCount = await wx.cloud.database().collection('vocabulary_integrated').count()
    console.log(`📊 词汇库总数: ${totalCount.total}条`)
    
    // 2. 获取前200条数据检查重复
    const sampleData = await wx.cloud.database().collection('vocabulary_integrated')
      .limit(200)
      .get()
    
    console.log(`🔍 检查前${sampleData.data.length}条数据...`)
    
    // 3. 统计重复词汇
    const wordCount = new Map()
    const duplicates = []
    
    sampleData.data.forEach(vocab => {
      const word = vocab.word
      if (wordCount.has(word)) {
        wordCount.set(word, wordCount.get(word) + 1)
        if (wordCount.get(word) === 2) {
          duplicates.push(word)
        }
      } else {
        wordCount.set(word, 1)
      }
    })
    
    console.log(`⚠️ 在前${sampleData.data.length}条中发现${duplicates.length}个重复词汇`)
    
    if (duplicates.length > 0) {
      console.log('🔍 重复词汇示例:')
      duplicates.slice(0, 10).forEach((word, index) => {
        console.log(`${index + 1}. ${word} (出现${wordCount.get(word)}次)`)
      })
      
      // 估算总重复比例
      const duplicateRatio = duplicates.length / sampleData.data.length
      const estimatedUniqueWords = Math.round(totalCount.total * (1 - duplicateRatio))
      
      console.log(`📊 估算统计:`)
      console.log(`   - 重复比例: ${Math.round(duplicateRatio * 100)}%`)
      console.log(`   - 估算真实词汇数: ${estimatedUniqueWords}个`)
      
      wx.showModal({
        title: '发现重复数据',
        content: `词汇库有重复！总数${totalCount.total}，估算真实词汇约${estimatedUniqueWords}个。需要清理吗？`,
        confirmText: '立即清理',
        cancelText: '稍后处理',
        success: (res) => {
          if (res.confirm) {
            // 直接运行完整重新整合
            if (window.completeReintegration) {
              window.completeReintegration()
            } else {
              console.log('⚠️ completeReintegration 函数不存在，请先运行 complete_reintegration.js')
              wx.showToast({
                title: '请先运行清理脚本',
                icon: 'none'
              })
            }
          }
        }
      })
    } else {
      console.log('✅ 在样本中未发现重复，数据可能正常')
      wx.showToast({
        title: `词汇库正常：${totalCount.total}个`,
        icon: 'success'
      })
    }
    
  } catch (error) {
    console.error('检查失败:', error)
  }
}

// 执行检查
quickCheckDuplicates()

console.log('📱 手动执行: quickCheckDuplicates()')