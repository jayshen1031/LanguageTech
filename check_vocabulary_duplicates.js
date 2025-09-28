// 检查词汇库重复情况和数据来源
// 在微信开发者工具控制台运行此代码

const checkVocabularyDuplicates = async () => {
  console.log('🔍 开始检查词汇库重复情况...')
  
  try {
    // 1. 检查词汇库总数
    const totalCount = await wx.cloud.database().collection('vocabulary_integrated').count()
    console.log(`📊 词汇库总数: ${totalCount.total}条`)
    
    // 2. 分批获取所有词汇数据
    let allVocabData = []
    let hasMore = true
    let skip = 0
    const batchSize = 100
    
    while (hasMore) {
      const batchRes = await wx.cloud.database().collection('vocabulary_integrated')
        .skip(skip)
        .limit(batchSize)
        .get()
      
      if (batchRes.data.length > 0) {
        allVocabData.push(...batchRes.data)
        skip += batchSize
        console.log(`📥 已获取${allVocabData.length}条词汇记录...`)
      } else {
        hasMore = false
      }
    }
    
    console.log(`🎯 总共获取到${allVocabData.length}条词汇记录`)
    
    // 3. 检查重复词汇
    const wordMap = new Map()
    const duplicates = []
    
    allVocabData.forEach(vocab => {
      const word = vocab.word
      
      if (wordMap.has(word)) {
        duplicates.push({
          word: word,
          first: wordMap.get(word),
          duplicate: vocab
        })
      } else {
        wordMap.set(word, vocab)
      }
    })
    
    console.log(`🔄 去重统计:`)
    console.log(`   - 数据库中总记录: ${allVocabData.length}条`)
    console.log(`   - 不重复词汇: ${wordMap.size}个`)
    console.log(`   - 重复记录: ${duplicates.length}个`)
    
    // 4. 分析重复词汇
    if (duplicates.length > 0) {
      console.log('⚠️ 发现重复词汇:')
      duplicates.slice(0, 10).forEach((dup, index) => {
        console.log(`${index + 1}. "${dup.word}" - 出现次数: ${dup.first.totalOccurrences} vs ${dup.duplicate.totalOccurrences}`)
      })
      
      if (duplicates.length > 10) {
        console.log(`... 还有${duplicates.length - 10}个重复词汇`)
      }
    }
    
    // 5. 分析数据来源和时间
    const sourceAnalysis = {
      byCreateTime: {},
      byLevel: {},
      byTags: {}
    }
    
    allVocabData.forEach(vocab => {
      // 按创建时间分组
      const createDate = vocab.createTime ? new Date(vocab.createTime).toDateString() : 'unknown'
      sourceAnalysis.byCreateTime[createDate] = (sourceAnalysis.byCreateTime[createDate] || 0) + 1
      
      // 按级别分组
      const level = vocab.level || 'unknown'
      sourceAnalysis.byLevel[level] = (sourceAnalysis.byLevel[level] || 0) + 1
      
      // 按标签分组
      if (vocab.tags && Array.isArray(vocab.tags)) {
        vocab.tags.forEach(tag => {
          sourceAnalysis.byTags[tag] = (sourceAnalysis.byTags[tag] || 0) + 1
        })
      }
    })
    
    console.log('📅 按创建时间分析:')
    Object.entries(sourceAnalysis.byCreateTime)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([date, count]) => {
        console.log(`   ${date}: ${count}个词汇`)
      })
    
    console.log('🏷️ 按级别分析:')
    Object.entries(sourceAnalysis.byLevel).forEach(([level, count]) => {
      console.log(`   ${level}: ${count}个词汇`)
    })
    
    console.log('🔖 按标签分析:')
    Object.entries(sourceAnalysis.byTags).forEach(([tag, count]) => {
      console.log(`   ${tag}: ${count}个词汇`)
    })
    
    // 6. 提供清理建议
    if (duplicates.length > 0) {
      console.log('\n💡 建议操作:')
      console.log('1. 完全清空词汇库重新整合')
      console.log('2. 或者保留数据，接受当前状态')
      
      wx.showModal({
        title: '发现重复数据',
        content: `词汇库中有${duplicates.length}个重复词汇。是否清空重新整合？`,
        confirmText: '清空重整',
        cancelText: '保持现状',
        success: (res) => {
          if (res.confirm) {
            console.log('🔄 用户选择清空重新整合')
            cleanAndReintegrate()
          } else {
            console.log('✅ 用户选择保持现状')
          }
        }
      })
    } else {
      console.log('✅ 没有发现重复词汇，数据库状态良好')
      wx.showToast({
        title: `词汇库正常：${wordMap.size}个词汇`,
        icon: 'success'
      })
    }
    
  } catch (error) {
    console.error('检查重复失败:', error)
  }
}

// 完全清空并重新整合
const cleanAndReintegrate = async () => {
  console.log('🧹 开始完全清空词汇库...')
  
  try {
    wx.showLoading({ title: '清空词汇库...' })
    
    // 分批删除所有词汇记录
    let deletedCount = 0
    let hasMore = true
    
    while (hasMore) {
      const batchRes = await wx.cloud.database().collection('vocabulary_integrated')
        .limit(100)
        .get()
      
      if (batchRes.data.length > 0) {
        for (const vocab of batchRes.data) {
          await wx.cloud.database().collection('vocabulary_integrated').doc(vocab._id).remove()
          deletedCount++
        }
        console.log(`🗑️ 已删除${deletedCount}个词汇记录...`)
        wx.showLoading({ title: `已删除${deletedCount}个记录...` })
      } else {
        hasMore = false
      }
    }
    
    console.log(`🧹 完全清空完成，删除了${deletedCount}个记录`)
    wx.hideLoading()
    
    // 重新运行无限制整合脚本
    wx.showModal({
      title: '清空完成',
      content: `已删除${deletedCount}个记录。现在重新整合？`,
      success: (res) => {
        if (res.confirm && window.fixAllVocabularyUnlimited) {
          window.fixAllVocabularyUnlimited()
        }
      }
    })
    
  } catch (error) {
    console.error('清空失败:', error)
    wx.hideLoading()
  }
}

// 执行检查
checkVocabularyDuplicates()

// 提供手动方法
window.checkVocabularyDuplicates = checkVocabularyDuplicates
window.cleanAndReintegrate = cleanAndReintegrate
console.log('\n📱 手动方法: window.checkVocabularyDuplicates()')
console.log('📱 清空方法: window.cleanAndReintegrate()')