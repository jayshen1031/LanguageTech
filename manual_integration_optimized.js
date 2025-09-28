// 手动词汇整合 - 优化版本
console.log('🚀 开始优化版手动词汇整合...')

// 先测试云函数连接
wx.cloud.callFunction({
  name: 'vocabulary-integration',
  data: { action: 'test_connection' }
}).then(testResult => {
  console.log('✅ 云函数连接测试:', testResult)
  
  if (testResult.result && testResult.result.success) {
    console.log('📡 云函数连接正常，开始分步整合...')
    
    // 步骤1：先清空vocabulary_integrated表（如果有数据）
    wx.cloud.database().collection('vocabulary_integrated').get().then(existingRes => {
      
      if (existingRes.data.length > 0) {
        console.log(`🗑️ 清理${existingRes.data.length}条旧记录...`)
        
        // 分批删除旧记录
        const deletePromises = existingRes.data.map(record => 
          wx.cloud.database().collection('vocabulary_integrated').doc(record._id).remove()
        )
        
        Promise.all(deletePromises).then(() => {
          console.log('✅ 清理完成，开始重新整合')
          startOptimizedIntegration()
        }).catch(err => {
          console.error('❌ 清理失败:', err)
        })
        
      } else {
        console.log('📝 表为空，直接开始整合')
        startOptimizedIntegration()
      }
    })
    
  } else {
    console.error('❌ 云函数连接失败')
  }
}).catch(error => {
  console.error('❌ 云函数测试失败:', error)
})

// 优化的整合流程
function startOptimizedIntegration() {
  console.log('🔧 开始优化整合流程...')
  
  // 先获取解析历史数量
  wx.cloud.database().collection('japanese_parser_history').count().then(countRes => {
    console.log(`📚 总共${countRes.total}条解析记录`)
    
    if (countRes.total === 0) {
      console.log('❌ 没有解析历史，无法整合')
      return
    }
    
    // 分批处理：每次处理10条记录
    const batchSize = 10
    const totalBatches = Math.ceil(countRes.total / batchSize)
    
    console.log(`📦 将分${totalBatches}批处理，每批${batchSize}条记录`)
    
    processBatch(0, batchSize, totalBatches)
  })
}

// 分批处理函数
function processBatch(skip, limit, totalBatches) {
  const currentBatch = Math.floor(skip / limit) + 1
  console.log(`🔄 处理第${currentBatch}/${totalBatches}批...`)
  
  // 获取这一批的解析记录
  wx.cloud.database().collection('japanese_parser_history')
    .skip(skip)
    .limit(limit)
    .get()
    .then(batchRes => {
      console.log(`📥 获取到${batchRes.data.length}条记录`)
      
      // 从这批记录中提取词汇
      const vocabularySet = new Set()
      const vocabularyData = []
      
      batchRes.data.forEach(record => {
        if (record.sentences && Array.isArray(record.sentences)) {
          record.sentences.forEach(sentence => {
            if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
              sentence.vocabulary.forEach(vocab => {
                if (vocab.japanese && vocab.romaji && vocab.chinese) {
                  const key = vocab.japanese
                  if (!vocabularySet.has(key)) {
                    vocabularySet.add(key)
                    vocabularyData.push({
                      word: vocab.japanese,
                      romaji: vocab.romaji,
                      meaning: vocab.chinese,
                      examples: [{
                        jp: sentence.originalText,
                        cn: sentence.translation,
                        source: record.title || '解析记录',
                        recordId: record._id
                      }],
                      sources: [record._id],
                      totalOccurrences: 1,
                      firstSeen: record.createTime || new Date(),
                      lastSeen: record.createTime || new Date(),
                      level: 'user_parsed',
                      tags: ['解析获得']
                    })
                  }
                }
              })
            }
          })
        }
      })
      
      console.log(`📝 从第${currentBatch}批提取到${vocabularyData.length}个词汇`)
      
      // 批量插入这些词汇
      if (vocabularyData.length > 0) {
        const insertPromises = vocabularyData.map(vocab => 
          wx.cloud.database().collection('vocabulary_integrated').add({ data: vocab })
        )
        
        Promise.all(insertPromises).then(() => {
          console.log(`✅ 第${currentBatch}批插入完成`)
          
          // 处理下一批
          if (currentBatch < totalBatches) {
            setTimeout(() => {
              processBatch(skip + limit, limit, totalBatches)
            }, 1000) // 延迟1秒避免过载
          } else {
            // 全部完成
            console.log('🎉 所有批次处理完成!')
            checkFinalResult()
          }
        }).catch(err => {
          console.error(`❌ 第${currentBatch}批插入失败:`, err)
        })
      } else {
        console.log(`⚠️ 第${currentBatch}批没有有效词汇`)
        // 继续下一批
        if (currentBatch < totalBatches) {
          processBatch(skip + limit, limit, totalBatches)
        } else {
          checkFinalResult()
        }
      }
    })
    .catch(err => {
      console.error(`❌ 获取第${currentBatch}批记录失败:`, err)
    })
}

// 检查最终结果
function checkFinalResult() {
  wx.cloud.database().collection('vocabulary_integrated').count().then(finalRes => {
    console.log(`🎉 整合完成! 总共创建了${finalRes.total}个词汇`)
    
    if (finalRes.total > 0) {
      console.log('✅ 现在可以刷新首页查看词汇统计了!')
      
      // 获取几个样本
      wx.cloud.database().collection('vocabulary_integrated').limit(5).get().then(sampleRes => {
        console.log('📝 样本词汇:')
        sampleRes.data.forEach((word, i) => {
          console.log(`${i+1}. ${word.word} (${word.romaji}) - ${word.meaning}`)
        })
      })
    }
  })
}