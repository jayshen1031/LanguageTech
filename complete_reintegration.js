// 🔄 完整的清空和重新整合脚本
// 在微信开发者工具控制台运行此代码

const completeReintegration = async () => {
  console.log('🔄 开始完整的清空和重新整合...')
  
  try {
    // 第一步：完全清空词汇库
    console.log('1️⃣ 完全清空词汇库...')
    wx.showLoading({ title: '清空中...' })
    
    let deletedCount = 0
    let hasMore = true
    
    while (hasMore) {
      const batchRes = await wx.cloud.database().collection('vocabulary_integrated')
        .limit(100)
        .get()
      
      if (batchRes.data.length > 0) {
        // 批量删除
        const deletePromises = batchRes.data.map(vocab => 
          wx.cloud.database().collection('vocabulary_integrated').doc(vocab._id).remove()
        )
        await Promise.all(deletePromises)
        
        deletedCount += batchRes.data.length
        console.log(`🗑️ 已删除${deletedCount}个词汇记录...`)
        wx.showLoading({ title: `已删除${deletedCount}个记录...` })
      } else {
        hasMore = false
      }
    }
    
    console.log(`🧹 清空完成！删除了${deletedCount}个记录`)
    
    // 第二步：重新整合所有词汇
    console.log('2️⃣ 开始重新整合所有词汇...')
    wx.showLoading({ title: '重新整合中...' })
    
    // 分批获取所有解析历史
    let allHistoryData = []
    hasMore = true
    let skip = 0
    const batchSize = 100
    
    while (hasMore) {
      const batchRes = await wx.cloud.database().collection('japanese_parser_history')
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(batchSize)
        .get()
      
      if (batchRes.data.length > 0) {
        allHistoryData.push(...batchRes.data)
        skip += batchSize
        console.log(`📥 已获取${allHistoryData.length}条解析记录...`)
        wx.showLoading({ title: `获取记录中 ${allHistoryData.length}条...` })
      } else {
        hasMore = false
      }
    }
    
    console.log(`📚 总共获取到${allHistoryData.length}条解析记录`)
    
    // 第三步：提取词汇
    console.log('3️⃣ 提取词汇...')
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
                    tags: ['解析获得'],
                    createTime: new Date() // 添加创建时间标记
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
      if (processedRecords % 100 === 0) {
        wx.showLoading({ title: `处理中 ${processedRecords}/${allHistoryData.length}` })
      }
    }
    
    console.log(`🎯 提取完成！共${vocabularyMap.size}个不重复词汇`)
    
    // 第四步：插入到数据库
    console.log('4️⃣ 插入到数据库...')
    wx.showLoading({ title: '插入词汇中...' })
    
    const vocabularyArray = Array.from(vocabularyMap.values())
    let insertedCount = 0
    const insertBatchSize = 20
    
    for (let i = 0; i < vocabularyArray.length; i += insertBatchSize) {
      const batch = vocabularyArray.slice(i, i + insertBatchSize)
      
      const insertPromises = batch.map(async (wordData) => {
        try {
          // 限制例句数量
          wordData.examples = wordData.examples.slice(0, 5)
          
          await wx.cloud.database().collection('vocabulary_integrated').add({
            data: wordData
          })
          return true
        } catch (error) {
          console.error(`❌ 插入失败: ${wordData.word}`, error)
          return false
        }
      })
      
      const results = await Promise.all(insertPromises)
      insertedCount += results.filter(r => r).length
      
      if (insertedCount % 50 === 0) {
        wx.showLoading({ title: `已插入${insertedCount}/${vocabularyArray.length}` })
        console.log(`✅ 已插入${insertedCount}/${vocabularyArray.length}个词汇`)
      }
    }
    
    // 第五步：刷新首页
    console.log('5️⃣ 刷新首页显示...')
    wx.hideLoading()
    
    const pages = getCurrentPages()
    const indexPage = pages.find(page => page.route === 'pages/index/index')
    
    if (indexPage && typeof indexPage.loadVocabularyStats === 'function') {
      await indexPage.loadVocabularyStats()
      console.log('🔄 首页数据已刷新')
    }
    
    // 最终验证
    const finalCount = await wx.cloud.database().collection('vocabulary_integrated').count()
    
    console.log('🎊 完整重新整合完成！')
    console.log(`📊 最终统计:`)
    console.log(`   - 删除旧记录: ${deletedCount}个`)
    console.log(`   - 处理解析记录: ${allHistoryData.length}条`)
    console.log(`   - 提取词汇: ${vocabularyMap.size}个`)
    console.log(`   - 成功插入: ${insertedCount}个`)
    console.log(`   - 数据库验证: ${finalCount.total}个`)
    
    wx.showModal({
      title: '🎉 重新整合完成',
      content: `删除了${deletedCount}个旧记录，重新整合出${finalCount.total}个词汇！现在数据是准确的。`,
      showCancel: false,
      confirmText: '完美!'
    })
    
    // 验证数据一致性
    if (insertedCount === finalCount.total) {
      console.log('✅ 数据一致性验证通过')
    } else {
      console.log('⚠️ 数据可能存在不一致，建议再次检查')
    }
    
  } catch (error) {
    console.error('🔧 完整重新整合失败:', error)
    wx.hideLoading()
    wx.showModal({
      title: '重新整合失败',
      content: `错误: ${error.message}`,
      showCancel: false
    })
  }
}

// 询问用户是否开始
wx.showModal({
  title: '🔄 完整重新整合',
  content: '这会先清空所有词汇，然后重新整合。确定要继续吗？',
  confirmText: '开始',
  cancelText: '取消',
  success: (res) => {
    if (res.confirm) {
      completeReintegration()
    } else {
      console.log('❌ 用户取消了完整重新整合')
    }
  }
})

// 提供手动方法
window.completeReintegration = completeReintegration
console.log('📱 手动执行: window.completeReintegration()')