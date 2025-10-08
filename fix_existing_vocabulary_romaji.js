// 修复现有词汇库中例句缺少罗马音的问题
// 通过匹配原始解析记录来补充例句的罗马音数据

const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

async function fixExistingVocabularyRomaji() {
  console.log('🔧 开始修复现有词汇库中的罗马音数据...')
  
  try {
    // 1. 获取所有词汇记录
    const vocabularyRes = await db.collection('vocabulary_integrated').get()
    console.log(`📚 找到 ${vocabularyRes.data.length} 个词汇记录`)
    
    // 2. 获取所有解析历史记录（用于匹配例句）
    const historyRes = await db.collection('japanese_parser_history').get()
    console.log(`📝 找到 ${historyRes.data.length} 个解析历史记录`)
    
    // 3. 创建解析记录的索引，方便快速查找
    const historyMap = new Map()
    historyRes.data.forEach(record => {
      if (record.sentences && Array.isArray(record.sentences)) {
        record.sentences.forEach(sentence => {
          if (sentence.originalText) {
            historyMap.set(sentence.originalText, {
              romaji: sentence.romaji,
              recordId: record._id,
              title: record.title || record.articleTitle
            })
          }
        })
      }
    })
    
    console.log(`🗂️ 创建了 ${historyMap.size} 个句子索引`)
    
    let fixedCount = 0
    let processedCount = 0
    
    // 4. 处理每个词汇记录
    for (const vocab of vocabularyRes.data) {
      processedCount++
      let needsUpdate = false
      let updatedExamples = []
      
      if (vocab.examples && Array.isArray(vocab.examples)) {
        updatedExamples = vocab.examples.map(example => {
          // 如果例句已经有罗马音，跳过
          if (example.romaji) {
            return example
          }
          
          // 尝试从解析历史中匹配例句的罗马音
          const matchedSentence = historyMap.get(example.jp)
          if (matchedSentence && matchedSentence.romaji) {
            needsUpdate = true
            return {
              ...example,
              romaji: matchedSentence.romaji
            }
          }
          
          return example
        })
      }
      
      // 5. 如果有更新，保存到数据库
      if (needsUpdate) {
        try {
          await db.collection('vocabulary_integrated')
            .doc(vocab._id)
            .update({
              data: {
                examples: updatedExamples,
                updateTime: new Date()
              }
            })
          
          fixedCount++
          console.log(`✅ 修复词汇: ${vocab.word} (${updatedExamples.filter(e => e.romaji).length}/${updatedExamples.length} 例句有罗马音)`)
        } catch (error) {
          console.error(`❌ 修复词汇失败: ${vocab.word}`, error)
        }
      }
      
      // 显示进度
      if (processedCount % 10 === 0) {
        console.log(`📊 进度: ${processedCount}/${vocabularyRes.data.length} (已修复: ${fixedCount})`)
      }
    }
    
    console.log('🎉 修复完成!')
    console.log(`📊 处理词汇: ${processedCount} 个`)
    console.log(`✅ 修复词汇: ${fixedCount} 个`)
    console.log(`📈 修复率: ${((fixedCount / processedCount) * 100).toFixed(1)}%`)
    
    return {
      success: true,
      processedCount,
      fixedCount,
      fixRate: ((fixedCount / processedCount) * 100).toFixed(1) + '%'
    }
    
  } catch (error) {
    console.error('❌ 修复过程出错:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 如果是作为云函数运行
exports.main = async (event, context) => {
  return await fixExistingVocabularyRomaji()
}

// 如果是本地运行
if (require.main === module) {
  fixExistingVocabularyRomaji().then(result => {
    console.log('最终结果:', result)
    process.exit(0)
  }).catch(error => {
    console.error('运行失败:', error)
    process.exit(1)
  })
}