// 修复词汇总数显示问题
// 在微信开发者工具控制台运行此代码

const fixVocabularyCount = async () => {
  console.log('🔧 开始修复词汇总数显示问题...')
  
  try {
    // 1. 检查当前状态
    console.log('1️⃣ 检查当前数据状态...')
    
    const historyCount = await wx.cloud.database().collection('japanese_parser_history').count()
    console.log(`📚 解析历史总数: ${historyCount.total}条`)
    
    const vocabCount = await wx.cloud.database().collection('vocabulary_integrated').count()
    console.log(`📊 当前词汇库总数: ${vocabCount.total}条`)
    
    if (historyCount.total === 0) {
      console.log('❌ 没有解析历史数据，无法修复')
      return
    }
    
    // 2. 如果词汇库数量明显少于预期，重新整合
    if (vocabCount.total < historyCount.total * 0.5) {
      console.log('⚠️ 词汇库数量疑似偏少，开始重新整合...')
      
      // 方案1：尝试云函数重建（如果部署了的话）
      try {
        console.log('🔄 尝试云函数重建...')
        const result = await wx.cloud.callFunction({
          name: 'vocabulary-integration',
          data: { action: 'rebuild_all' }
        })
        
        if (result.result.success) {
          console.log(`✅ 云函数重建成功: ${result.result.totalWords}个词汇`)
          
          // 刷新首页数据
          const pages = getCurrentPages()
          const indexPage = pages.find(page => page.route === 'pages/index/index')
          if (indexPage && typeof indexPage.loadVocabularyStats === 'function') {
            await indexPage.loadVocabularyStats()
            console.log('🔄 首页数据已刷新')
          }
          return
        }
      } catch (cloudError) {
        console.log('❌ 云函数方式失败，尝试前端整合...')
      }
      
      // 方案2：前端直接整合
      console.log('🚀 执行前端整合...')
      
      // 获取更多解析历史（增加到100条）
      const historyRes = await wx.cloud.database().collection('japanese_parser_history')
        .orderBy('createTime', 'desc')
        .limit(100)
        .get()
      
      console.log(`📥 获取到${historyRes.data.length}条解析记录`)
      
      // 清空现有词汇表（可选，确保完全重新整合）
      try {
        const existingVocab = await wx.cloud.database().collection('vocabulary_integrated').get()
        for (const word of existingVocab.data) {
          await wx.cloud.database().collection('vocabulary_integrated').doc(word._id).remove()
        }
        console.log(`🗑️ 清理了${existingVocab.data.length}个旧词汇记录`)
      } catch (error) {
        console.log('⚠️ 清理旧记录失败，继续执行...')
      }
      
      const vocabularyMap = new Map()
      
      // 提取词汇
      historyRes.data.forEach(record => {
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
                  
                  // 添加例句
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
      
      console.log(`📝 提取到${vocabularyMap.size}个不重复词汇`)
      
      // 批量插入
      const vocabularyArray = Array.from(vocabularyMap.values())
      let insertedCount = 0
      
      for (const wordData of vocabularyArray) {
        try {
          await wx.cloud.database().collection('vocabulary_integrated').add({
            data: wordData
          })
          insertedCount++
          
          if (insertedCount % 10 === 0) {
            console.log(`✅ 已插入${insertedCount}/${vocabularyArray.length}个词汇`)
          }
        } catch (error) {
          console.error(`❌ 插入词汇失败: ${wordData.word}`, error)
        }
      }
      
      console.log(`🎉 前端整合完成! 成功插入${insertedCount}个词汇`)
      
    } else {
      console.log('✅ 词汇库数量正常，无需重新整合')
    }
    
    // 3. 刷新首页显示
    console.log('3️⃣ 刷新首页显示...')
    const pages = getCurrentPages()
    const indexPage = pages.find(page => page.route === 'pages/index/index')
    
    if (indexPage && typeof indexPage.loadVocabularyStats === 'function') {
      await indexPage.loadVocabularyStats()
      console.log('🔄 首页数据已刷新')
      
      // 显示最新统计
      const newVocabCount = await wx.cloud.database().collection('vocabulary_integrated').count()
      console.log(`📊 修复后词汇库总数: ${newVocabCount.total}条`)
      
      wx.showToast({
        title: `词汇库已更新：${newVocabCount.total}个词汇`,
        icon: 'success',
        duration: 3000
      })
    } else {
      console.log('❌ 无法找到首页实例，请手动刷新页面')
    }
    
  } catch (error) {
    console.error('🔧 修复过程出错:', error)
    wx.showModal({
      title: '修复失败',
      content: `错误: ${error.message}`,
      showCancel: false
    })
  }
}

// 执行修复
fixVocabularyCount()

// 提供手动刷新方法
console.log('\n📱 如需手动刷新首页数据，可运行:')
console.log('getCurrentPages().find(p => p.route === "pages/index/index").loadVocabularyStats()')