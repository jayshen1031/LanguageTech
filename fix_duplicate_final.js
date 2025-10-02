// 🧹 最终重复数据清理脚本
// 在微信开发者工具控制台运行

const fixDuplicateFinal = async () => {
  console.log('🧹 开始最终重复数据清理...')
  
  try {
    // 第一步：检查当前状态
    const currentTotal = await wx.cloud.database().collection('vocabulary_integrated').count()
    console.log(`📊 当前词汇库总数: ${currentTotal.total}条`)
    
    if (currentTotal.total === 0) {
      console.log('❌ 词汇库为空，无需清理')
      return
    }
    
    wx.showLoading({ title: '清理重复数据中...' })
    
    // 第二步：彻底清空
    console.log('🗑️ 彻底清空现有数据...')
    let deletedCount = 0
    let hasMore = true
    
    while (hasMore) {
      const batchRes = await wx.cloud.database().collection('vocabulary_integrated')
        .limit(100)
        .get()
      
      if (batchRes.data.length > 0) {
        const deletePromises = batchRes.data.map(vocab => 
          wx.cloud.database().collection('vocabulary_integrated').doc(vocab._id).remove()
        )
        await Promise.all(deletePromises)
        deletedCount += batchRes.data.length
        console.log(`🗑️ 已删除${deletedCount}条记录...`)
      } else {
        hasMore = false
      }
    }
    
    console.log(`✅ 清空完成，删除了${deletedCount}条记录`)
    
    // 第三步：获取解析历史
    console.log('📥 获取解析历史数据...')
    wx.showLoading({ title: '获取解析数据...' })
    
    const historyTotal = await wx.cloud.database().collection('japanese_parser_history').count()
    console.log(`📚 解析历史总数: ${historyTotal.total}条`)
    
    if (historyTotal.total === 0) {
      wx.hideLoading()
      wx.showModal({
        title: '无数据',
        content: '没有解析历史数据，无法重建词汇库',
        showCancel: false
      })
      return
    }
    
    // 分批获取所有解析数据
    let allHistory = []
    hasMore = true
    let skip = 0
    
    while (hasMore) {
      const batchRes = await wx.cloud.database().collection('japanese_parser_history')
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(100)
        .get()
      
      if (batchRes.data.length > 0) {
        allHistory.push(...batchRes.data)
        skip += 100
        console.log(`📥 已获取${allHistory.length}/${historyTotal.total}条解析记录`)
        wx.showLoading({ title: `获取${allHistory.length}/${historyTotal.total}条...` })
      } else {
        hasMore = false
      }
    }
    
    console.log(`📊 总共获取${allHistory.length}条解析记录`)
    
    // 第四步：提取并去重词汇
    console.log('🎯 提取并去重词汇...')
    wx.showLoading({ title: '提取词汇中...' })
    
    const vocabularyMap = new Map() // 用于去重
    
    allHistory.forEach((record, index) => {
      if (record.sentences && Array.isArray(record.sentences)) {
        record.sentences.forEach(sentence => {
          if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
            sentence.vocabulary.forEach(vocab => {
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
                    createTime: new Date()
                  })
                }
                
                const wordData = vocabularyMap.get(key)
                
                // 添加例句（避免重复）
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
            })
          }
        })
      }
      
      if ((index + 1) % 100 === 0) {
        console.log(`🔄 已处理${index + 1}/${allHistory.length}条记录`)
        wx.showLoading({ title: `处理${index + 1}/${allHistory.length}条...` })
      }
    })
    
    console.log(`🎯 提取完成，共${vocabularyMap.size}个不重复词汇`)
    
    // 第五步：批量插入
    console.log('💾 批量插入词汇数据...')
    wx.showLoading({ title: '插入词汇中...' })
    
    const vocabularyArray = Array.from(vocabularyMap.values())
    let insertedCount = 0
    
    for (let i = 0; i < vocabularyArray.length; i += 20) {
      const batch = vocabularyArray.slice(i, i + 20)
      
      const insertPromises = batch.map(async (wordData) => {
        try {
          // 限制例句数量避免数据过大
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
      
      if (insertedCount % 50 === 0 || i + 20 >= vocabularyArray.length) {
        console.log(`💾 已插入${insertedCount}/${vocabularyArray.length}个词汇`)
        wx.showLoading({ title: `已插入${insertedCount}/${vocabularyArray.length}` })
      }
    }
    
    // 第六步：验证结果
    console.log('✅ 验证最终结果...')
    const finalTotal = await wx.cloud.database().collection('vocabulary_integrated').count()
    
    wx.hideLoading()
    
    // 刷新首页
    const pages = getCurrentPages()
    const indexPage = pages.find(page => page.route === 'pages/index/index')
    if (indexPage && typeof indexPage.loadVocabularyStats === 'function') {
      await indexPage.loadVocabularyStats()
      console.log('🔄 首页数据已刷新')
    }
    
    console.log('🎊 重复数据清理完成！')
    console.log(`📊 清理统计:`)
    console.log(`   - 删除重复记录: ${deletedCount}条`)
    console.log(`   - 处理解析记录: ${allHistory.length}条`)
    console.log(`   - 提取去重词汇: ${vocabularyMap.size}个`)
    console.log(`   - 成功插入词汇: ${insertedCount}个`)
    console.log(`   - 最终数据库总数: ${finalTotal.total}个`)
    
    // 数据一致性检查
    if (insertedCount === finalTotal.total && insertedCount === vocabularyMap.size) {
      console.log('✅ 数据一致性验证通过，无重复数据')
      wx.showModal({
        title: '🎉 清理完成',
        content: `成功清理重复数据！\n词汇库现在有${finalTotal.total}个不重复词汇`,
        showCancel: false,
        confirmText: '完美!'
      })
    } else {
      console.log('⚠️ 数据可能不一致，需要检查')
      wx.showModal({
        title: '⚠️ 需要检查',
        content: `清理完成，但数据可能不一致:\n提取${vocabularyMap.size}个，插入${insertedCount}个，数据库${finalTotal.total}个`,
        showCancel: false
      })
    }
    
  } catch (error) {
    console.error('🚨 清理过程出错:', error)
    wx.hideLoading()
    wx.showModal({
      title: '清理失败',
      content: `错误: ${error.message}`,
      showCancel: false
    })
  }
}

// 开始清理
wx.showModal({
  title: '🧹 清理重复数据',
  content: '将彻底清空并重建词汇库，确保无重复数据。是否继续？',
  confirmText: '开始清理',
  cancelText: '取消',
  success: (res) => {
    if (res.confirm) {
      fixDuplicateFinal()
    } else {
      console.log('❌ 用户取消了清理操作')
    }
  }
})

// 提供手动方法
window.fixDuplicateFinal = fixDuplicateFinal
console.log('📱 手动执行: window.fixDuplicateFinal()')