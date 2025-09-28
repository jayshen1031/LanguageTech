// 立即重新整合词汇库
console.log('🚀 开始立即重新整合词汇库...')

const performReintegration = async () => {
  try {
    // 1. 清空现有词汇表
    console.log('🗑️ 清空现有词汇表...')
    const existingWords = await wx.cloud.database().collection('vocabulary_integrated').get()
    
    if (existingWords.data.length > 0) {
      console.log(`删除${existingWords.data.length}条旧记录...`)
      const deletePromises = existingWords.data.map(word => 
        wx.cloud.database().collection('vocabulary_integrated').doc(word._id).remove()
      )
      await Promise.all(deletePromises)
      console.log('✅ 旧记录清理完成')
    }
    
    // 2. 获取解析历史
    console.log('📚 获取解析历史...')
    const historyRes = await wx.cloud.database().collection('japanese_parser_history')
      .orderBy('createTime', 'desc')
      .get()
    
    console.log(`📥 获取到${historyRes.data.length}条解析记录`)
    
    // 3. 提取词汇
    console.log('📝 开始提取词汇...')
    const vocabularyMap = new Map()
    
    historyRes.data.forEach((record, recordIndex) => {
      console.log(`处理第${recordIndex + 1}/${historyRes.data.length}条记录: ${record.title || 'untitled'}`)
      
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
                    tags: ['解析获得']
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
                }
              }
            })
          }
        })
      }
    })
    
    console.log(`📊 去重后共提取${vocabularyMap.size}个独特词汇`)
    
    // 4. 批量插入新词汇
    console.log('💾 开始批量插入词汇...')
    const vocabularyArray = Array.from(vocabularyMap.values())
    let insertedCount = 0
    
    // 分批插入，每批5个
    for (let i = 0; i < vocabularyArray.length; i += 5) {
      const batch = vocabularyArray.slice(i, i + 5)
      
      try {
        const insertPromises = batch.map(wordData => 
          wx.cloud.database().collection('vocabulary_integrated').add({
            data: wordData
          })
        )
        
        await Promise.all(insertPromises)
        insertedCount += batch.length
        
        console.log(`✅ 已插入${insertedCount}/${vocabularyArray.length}个词汇`)
        
        // 稍微延迟避免过载
        if (i + 5 < vocabularyArray.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`❌ 批量插入失败:`, error)
      }
    }
    
    // 5. 验证结果
    console.log('🔍 验证整合结果...')
    const finalCount = await wx.cloud.database().collection('vocabulary_integrated').count()
    
    console.log(`🎉 整合完成！`)
    console.log(`📊 最终统计: ${finalCount.total}个词汇`)
    
    if (finalCount.total > 0) {
      // 显示前5个词汇样本
      const sampleRes = await wx.cloud.database().collection('vocabulary_integrated').limit(5).get()
      console.log('📝 词汇样本:')
      sampleRes.data.forEach((word, index) => {
        console.log(`${index + 1}. ${word.word} (${word.romaji}) - ${word.meaning}`)
      })
      
      console.log('✅ 重新整合成功！现在可以刷新首页查看统计了')
    } else {
      console.log('❌ 整合后词汇数量为0，请检查解析历史数据格式')
    }
    
  } catch (error) {
    console.error('❌ 重新整合失败:', error)
  }
}

// 立即执行
performReintegration()