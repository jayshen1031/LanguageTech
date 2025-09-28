// 🚀 无限制词汇整合修复脚本 - 支持处理上万条数据
// 在微信开发者工具控制台运行此代码

const fixAllVocabularyUnlimited = async () => {
  console.log('🚀 开始无限制词汇整合修复，支持上万条数据...')
  
  try {
    // 1. 检查当前数据状态
    console.log('1️⃣ 检查当前数据状态...')
    
    const historyCount = await wx.cloud.database().collection('japanese_parser_history').count()
    console.log(`📚 解析历史总数: ${historyCount.total}条`)
    
    const vocabCount = await wx.cloud.database().collection('vocabulary_integrated').count()
    console.log(`📊 当前词汇库总数: ${vocabCount.total}条`)
    
    if (historyCount.total === 0) {
      console.log('❌ 没有解析历史数据，无法修复')
      return
    }
    
    // 2. 开始无限制前端整合
    console.log('2️⃣ 开始无限制前端整合...')
    
    // 先清空现有词汇表
    try {
      wx.showLoading({ title: '清理旧数据...' })
      const existingVocab = await wx.cloud.database().collection('vocabulary_integrated').get()
      for (const word of existingVocab.data) {
        await wx.cloud.database().collection('vocabulary_integrated').doc(word._id).remove()
      }
      console.log(`🗑️ 清理了${existingVocab.data.length}个旧词汇记录`)
    } catch (error) {
      console.log('⚠️ 清理旧记录失败，继续执行...')
    }
    
    wx.hideLoading()
    wx.showLoading({ title: '正在处理大量数据...' })
    
    // 分批获取所有解析历史（无限制）
    let allHistoryData = []
    let hasMore = true
    let skip = 0
    const batchSize = 100
    
    console.log('📥 分批获取所有解析历史...')
    
    while (hasMore) {
      const batchRes = await wx.cloud.database().collection('japanese_parser_history')
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(batchSize)
        .get()
      
      if (batchRes.data.length > 0) {
        allHistoryData.push(...batchRes.data)
        skip += batchSize
        console.log(`📥 已获取${allHistoryData.length}条记录...`)
        
        // 更新loading提示
        wx.showLoading({ title: `已获取${allHistoryData.length}条记录...` })
        
        // 每获取500条暂停一下，避免小程序卡死
        if (allHistoryData.length % 500 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } else {
        hasMore = false
      }
    }
    
    console.log(`🎉 总共获取到${allHistoryData.length}条解析记录`)
    
    // 3. 提取所有词汇（无限制）
    console.log('3️⃣ 提取所有词汇（无限制）...')
    wx.showLoading({ title: '提取词汇中...' })
    
    const vocabularyMap = new Map()
    let processedRecords = 0
    
    for (const record of allHistoryData) {
      if (record.sentences && Array.isArray(record.sentences)) {
        for (const sentence of record.sentences) {
          if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
            for (const vocab of sentence.vocabulary) {
              if (vocab.japanese && vocab.romaji && vocab.chinese) {
                const key = vocab.japanese
                
                if (!vocabularyMap.has(key)) {
                  vocabularyMap.set(key, {
                    word: vocab.japanese,
                    romaji: vocab.romaji,
                    meaning: vocab.chinese,
                    examples: [],
                    sources: [],
                    totalOccurrences: 0,
                    firstSeen: record.createTime || new Date(),
                    lastSeen: record.createTime || new Date(),
                    level: 'user_parsed',
                    tags: ['解析获得']
                  })
                }
                
                const wordData = vocabularyMap.get(key)
                
                // 添加例句（检查重复）
                if (!wordData.sources.includes(record._id)) {
                  wordData.examples.push({
                    jp: sentence.originalText,
                    cn: sentence.translation,
                    source: record.title || '解析记录',
                    recordId: record._id
                  })
                  wordData.sources.push(record._id)
                  wordData.totalOccurrences++
                  
                  if (record.createTime > wordData.lastSeen) {
                    wordData.lastSeen = record.createTime
                  }
                  if (record.createTime < wordData.firstSeen) {
                    wordData.firstSeen = record.createTime
                  }
                }
              }
            }
          }
        }
      }
      
      processedRecords++
      
      // 每处理100条记录更新一次进度
      if (processedRecords % 100 === 0) {
        wx.showLoading({ title: `处理中 ${processedRecords}/${allHistoryData.length}` })
        console.log(`📊 已处理${processedRecords}/${allHistoryData.length}条记录，提取到${vocabularyMap.size}个词汇`)
        
        // 防止小程序卡死
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    console.log(`🎯 词汇提取完成! 共提取到${vocabularyMap.size}个不重复词汇`)
    
    // 4. 批量插入到数据库（优化性能）
    console.log('4️⃣ 批量插入到数据库...')
    wx.showLoading({ title: '插入词汇到数据库...' })
    
    const vocabularyArray = Array.from(vocabularyMap.values())
    let insertedCount = 0
    const insertBatchSize = 10 // 控制插入速度，避免数据库压力过大
    
    for (let i = 0; i < vocabularyArray.length; i += insertBatchSize) {
      const batch = vocabularyArray.slice(i, i + insertBatchSize)
      
      // 并发插入一批
      const insertPromises = batch.map(async (wordData) => {
        try {
          // 限制例句数量，避免数据过大
          wordData.examples = wordData.examples.slice(0, 5)
          
          await wx.cloud.database().collection('vocabulary_integrated').add({
            data: wordData
          })
          return true
        } catch (error) {
          console.error(`❌ 插入词汇失败: ${wordData.word}`, error)
          return false
        }
      })
      
      const results = await Promise.all(insertPromises)
      insertedCount += results.filter(r => r).length
      
      // 更新进度
      if (insertedCount % 50 === 0 || i + insertBatchSize >= vocabularyArray.length) {
        wx.showLoading({ title: `已插入${insertedCount}/${vocabularyArray.length}` })
        console.log(`✅ 已插入${insertedCount}/${vocabularyArray.length}个词汇`)
      }
      
      // 防止插入过快导致数据库压力
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`🎉 数据库插入完成! 成功插入${insertedCount}个词汇`)
    
    // 5. 刷新首页显示
    console.log('5️⃣ 刷新首页显示...')
    wx.hideLoading()
    
    const pages = getCurrentPages()
    const indexPage = pages.find(page => page.route === 'pages/index/index')
    
    if (indexPage && typeof indexPage.loadVocabularyStats === 'function') {
      await indexPage.loadVocabularyStats()
      console.log('🔄 首页数据已刷新')
    }
    
    // 显示最终结果
    const finalVocabCount = await wx.cloud.database().collection('vocabulary_integrated').count()
    
    console.log('🎊 无限制词汇整合完成!')
    console.log(`📊 处理统计:`)
    console.log(`   - 解析记录: ${allHistoryData.length}条`)
    console.log(`   - 提取词汇: ${vocabularyMap.size}个`)
    console.log(`   - 成功插入: ${insertedCount}个`)
    console.log(`   - 最终词汇库: ${finalVocabCount.total}个`)
    
    wx.showModal({
      title: '🎉 词汇整合完成',
      content: `成功处理了${allHistoryData.length}条解析记录，整合出${finalVocabCount.total}个词汇！`,
      showCancel: false,
      confirmText: '太棒了!'
    })
    
  } catch (error) {
    console.error('🔧 无限制修复过程出错:', error)
    wx.hideLoading()
    wx.showModal({
      title: '修复失败',
      content: `错误: ${error.message}`,
      showCancel: false
    })
  }
}

// 执行无限制修复
console.log('🚀🚀🚀 准备执行无限制词汇整合修复...')
console.log('⚠️ 注意: 这个脚本会处理你的所有解析数据，可能需要几分钟时间')
console.log('💡 建议在WiFi环境下运行，避免移动网络流量消耗')

// 给用户一个确认提示
wx.showModal({
  title: '🚀 无限制词汇整合',
  content: '这将处理你的全部解析数据（可能有上万条），预计需要几分钟时间。确定继续吗？',
  confirmText: '开始处理',
  cancelText: '取消',
  success: (res) => {
    if (res.confirm) {
      fixAllVocabularyUnlimited()
    } else {
      console.log('❌ 用户取消了无限制词汇整合')
    }
  }
})

// 提供手动执行方法
window.fixAllVocabularyUnlimited = fixAllVocabularyUnlimited
console.log('\n📱 如需手动执行，可运行: window.fixAllVocabularyUnlimited()')