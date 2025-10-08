// 词汇整合云函数 - 从解析历史中提取并去重词汇
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, recordId } = event
  
  try {
    switch (action) {
      case 'integrate_new_record':
        // 整合新的解析记录
        return await integrateNewRecord(recordId)
        
      case 'rebuild_all':
        // 重建整个词汇表
        return await rebuildVocabularyTable()
        
      case 'get_learning_words':
        // 获取学习词汇
        return await getLearningWords(event.count || 10)
        
      case 'get_smart_plan':
        // 获取智能学习计划
        return await getSmartLearningPlan(event)
        
      case 'test_connection':
        // 测试连接
        return { success: true, message: '云函数连接正常', timestamp: new Date() }
        
      default:
        return { success: false, error: '不支持的操作' }
    }
  } catch (error) {
    console.error('词汇整合失败:', error)
    return { success: false, error: error.message }
  }
}

// 整合新的解析记录
async function integrateNewRecord(recordId) {
  console.log(`开始整合记录: ${recordId}`)
  
  // 1. 获取解析记录
  const record = await db.collection('japanese_parser_history')
    .doc(recordId)
    .get()
  
  if (!record.data) {
    throw new Error('解析记录不存在')
  }
  
  const parseData = record.data
  const newWords = []
  
  // 2. 从句子中提取所有词汇
  if (parseData.sentences && Array.isArray(parseData.sentences)) {
    for (const sentence of parseData.sentences) {
      if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
        for (const vocab of sentence.vocabulary) {
          if (vocab.japanese && vocab.romaji && vocab.chinese) {
            newWords.push({
              word: vocab.japanese,
              romaji: vocab.romaji,
              meaning: vocab.chinese,
              sourceRecordId: recordId,
              sourceSentence: sentence.originalText,
              sourceRomaji: sentence.romaji,  // 📝 添加句子罗马音
              sourceTranslation: sentence.translation,
              sourceStructure: sentence.structure,
              sourceAnalysis: sentence.analysis,
              sourceGrammar: sentence.grammar,
              articleTitle: parseData.articleTitle || parseData.title || '解析记录',
              extractTime: new Date()
            })
          }
        }
      }
    }
  }
  
  console.log(`从记录中提取到${newWords.length}个词汇`)
  
  // 3. 整合到vocabulary_integrated表
  let addedCount = 0
  let updatedCount = 0
  
  for (const newWord of newWords) {
    // 检查是否已存在
    const existing = await db.collection('vocabulary_integrated')
      .where({
        word: newWord.word
      })
      .get()
    
    if (existing.data.length === 0) {
      // 新词汇，直接添加（如果集合不存在会自动创建）
      try {
        await db.collection('vocabulary_integrated').add({
        data: {
          ...newWord,
          examples: [{
            jp: newWord.sourceSentence,
            romaji: newWord.sourceRomaji,  // 📝 添加例句罗马音
            cn: newWord.sourceTranslation,
            source: newWord.articleTitle,
            recordId: newWord.sourceRecordId,
            structure: newWord.sourceStructure,
            analysis: newWord.sourceAnalysis,
            grammar: newWord.sourceGrammar
          }],
          totalOccurrences: 1,
          sources: [newWord.sourceRecordId],
          firstSeen: new Date(),
          lastSeen: new Date(),
          level: 'user_parsed', // 用户解析词汇
          tags: ['解析获得']
        }
      })
      addedCount++
      console.log(`✅ 新增词汇: ${newWord.word}`)
      } catch (addError) {
        console.error(`❌ 添加词汇失败: ${newWord.word}`, addError)
        throw addError
      }
      
    } else {
      // 已存在，更新例句和来源
      const existingWord = existing.data[0]
      
      // 检查是否已有此来源
      if (!existingWord.sources.includes(newWord.sourceRecordId)) {
        // 添加新例句
        const newExample = {
          jp: newWord.sourceSentence,
          romaji: newWord.sourceRomaji,  // 📝 添加例句罗马音
          cn: newWord.sourceTranslation,
          source: newWord.articleTitle,
          recordId: newWord.sourceRecordId,
          structure: newWord.sourceStructure,
          analysis: newWord.sourceAnalysis,
          grammar: newWord.sourceGrammar
        }
        
        const updatedExamples = [...(existingWord.examples || []), newExample].slice(0, 5) // 最多5个例句
        const updatedSources = [...existingWord.sources, newWord.sourceRecordId]
        
        await db.collection('vocabulary_integrated')
          .doc(existingWord._id)
          .update({
            data: {
              examples: updatedExamples,
              sources: updatedSources,
              totalOccurrences: existingWord.totalOccurrences + 1,
              lastSeen: new Date()
            }
          })
        
        updatedCount++
        console.log(`🔄 更新词汇: ${newWord.word} (新增例句)`)
      } else {
        console.log(`⏭️ 跳过重复: ${newWord.word} (已有此来源)`)
      }
    }
  }
  
  return {
    success: true,
    message: `成功整合词汇`,
    addedCount,
    updatedCount,
    totalExtracted: newWords.length
  }
}

// 重建整个词汇表
async function rebuildVocabularyTable() {
  console.log('开始重建词汇表...')
  
  // 1. 清空现有数据（如果表存在的话）
  try {
    const existingWords = await db.collection('vocabulary_integrated').get()
    
    for (const word of existingWords.data) {
      await db.collection('vocabulary_integrated').doc(word._id).remove()
    }
    
    console.log(`清理了${existingWords.data.length}个旧记录`)
  } catch (error) {
    if (error.errCode === -502005) {
      console.log('vocabulary_integrated 表不存在，跳过清理步骤')
    } else {
      throw error
    }
  }
  
  // 2. 获取所有解析历史（无限制，分批处理）
  let allRecords = { data: [] }
  let hasMore = true
  let skip = 0
  const batchSize = 100
  
  console.log('📊 开始分批获取所有解析记录...')
  
  while (hasMore) {
    const batchRes = await db.collection('japanese_parser_history')
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(batchSize)
      .get()
    
    if (batchRes.data.length > 0) {
      allRecords.data.push(...batchRes.data)
      skip += batchSize
      console.log(`📥 已获取${allRecords.data.length}条记录...`)
    } else {
      hasMore = false
    }
  }
  
  console.log(`🎉 总共找到${allRecords.data.length}条解析记录`)
  
  const wordMap = new Map() // 用于去重
  
  // 3. 遍历所有记录提取词汇
  for (const record of allRecords.data) {
    if (record.sentences && Array.isArray(record.sentences)) {
      for (const sentence of record.sentences) {
        if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
          for (const vocab of sentence.vocabulary) {
            if (vocab.japanese && vocab.romaji && vocab.chinese) {
              const wordKey = vocab.japanese
              
              if (!wordMap.has(wordKey)) {
                // 新词汇
                wordMap.set(wordKey, {
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
              
              const wordData = wordMap.get(wordKey)
              
              // 添加例句（检查是否已存在此记录的例句）
              const hasThisSource = wordData.sources.includes(record._id)
              if (!hasThisSource) {
                wordData.examples.push({
                  jp: sentence.originalText,
                  romaji: sentence.romaji,  // 📝 添加例句罗马音
                  cn: sentence.translation,
                  source: record.articleTitle || record.title || '解析记录',
                  recordId: record._id,
                  structure: sentence.structure,
                  analysis: sentence.analysis,
                  grammar: sentence.grammar
                })
                wordData.sources.push(record._id)
                wordData.totalOccurrences++
                
                // 更新时间
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
  }
  
  console.log(`去重后共有${wordMap.size}个独特词汇`)
  
  // 4. 批量插入到数据库
  let insertedCount = 0
  const insertBatchSize = 20
  const wordArray = Array.from(wordMap.values())
  
  for (let i = 0; i < wordArray.length; i += insertBatchSize) {
    const batch = wordArray.slice(i, i + insertBatchSize)
    
    for (const wordData of batch) {
      // 限制例句数量
      wordData.examples = wordData.examples.slice(0, 5)
      
      await db.collection('vocabulary_integrated').add({
        data: {
          ...wordData,
          createTime: new Date()
        }
      })
      insertedCount++
    }
    
    console.log(`📤 已插入${Math.min(i + insertBatchSize, wordArray.length)}/${wordArray.length}个词汇`)
  }
  
  return {
    success: true,
    message: '词汇表重建完成',
    totalWords: insertedCount,
    processedRecords: allRecords.data.length
  }
}

// 获取学习词汇
async function getLearningWords(count) {
  console.log(`获取${count}个学习词汇`)
  
  // 从整合表中获取词汇，优先最近遇到的
  const words = await db.collection('vocabulary_integrated')
    .orderBy('lastSeen', 'desc')
    .limit(count)
    .get()
  
  // 转换为学习格式
  const learningWords = words.data.map((word, index) => ({
    id: word._id,
    word: word.word,
    kana: word.romaji, // 使用罗马音作为假名显示
    romaji: word.romaji,
    meaning: word.meaning,
    type: word.level || 'user_parsed',
    level: `解析词汇 (${word.totalOccurrences}次)`,
    examples: word.examples || [],
    source: 'integrated',
    sourceCount: word.sources ? word.sources.length : 1,
    firstSeen: word.firstSeen,
    lastSeen: word.lastSeen,
    tags: word.tags || ['解析获得']
  }))
  
  return {
    success: true,
    words: learningWords,
    totalAvailable: words.data.length
  }
}

// 智能学习计划 - 根据3:1比例分配新学和复习
async function getSmartLearningPlan(options) {
  const {
    totalCount = 12,
    newRatio = 1,
    reviewRatio = 3,
    type = 'mixed', // 'new', 'review', 'mixed'
    sourceTag = '' // 来源标签筛选
  } = options

  console.log(`🧠 生成智能学习计划: ${totalCount}个词汇, ${newRatio}:${reviewRatio}比例, 类型:${type}, 来源:${sourceTag || '全部'}`)

  try {
    // 🔍 如果指定了来源标签，需要先从解析历史中获取相关记录ID
    let sourceRecordIds = []
    if (sourceTag && sourceTag.trim()) {
      const historyRes = await db.collection('japanese_parser_history')
        .where({
          categoryTag: sourceTag.trim()
        })
        .field({ _id: true })
        .get()

      sourceRecordIds = historyRes.data.map(record => record._id)
      console.log(`📚 找到${sourceRecordIds.length}个标签为"${sourceTag}"的解析记录`)

      if (sourceRecordIds.length === 0) {
        return {
          success: false,
          error: `没有找到标签为"${sourceTag}"的解析内容`,
          words: [],
          plan: null
        }
      }
    }

    // 获取所有整合词汇，按学习情况分类
    let allWords
    if (sourceRecordIds.length > 0) {
      // 筛选指定来源的词汇
      const _ = db.command
      allWords = await db.collection('vocabulary_integrated')
        .where({
          sources: _.elemMatch(_.in(sourceRecordIds))
        })
        .get()
      console.log(`📖 从指定来源筛选出${allWords.data.length}个词汇`)
    } else {
      // 获取全部词汇
      allWords = await db.collection('vocabulary_integrated')
        .get()
    }
    
    if (allWords.data.length === 0) {
      return {
        success: false,
        error: '还没有解析过的词汇，请先去日语解析页面学习',
        words: [],
        plan: null
      }
    }
    
    // 按掌握程度分类词汇
    const newWords = []      // 新词汇：只出现1次
    const reviewWords = []   // 复习词汇：出现2次以上
    
    allWords.data.forEach(word => {
      if (word.totalOccurrences <= 1) {
        newWords.push(word)
      } else {
        reviewWords.push(word)
      }
    })
    
    console.log(`📊 词汇分类: ${newWords.length}个新词, ${reviewWords.length}个复习词`)
    
    let selectedWords = []
    let plan = {
      totalCount: 0,
      newCount: 0,
      reviewCount: 0,
      type: type
    }
    
    // 根据类型选择词汇
    if (type === 'new') {
      // 只要新词汇
      selectedWords = shuffleArray(newWords).slice(0, totalCount)
      plan.newCount = selectedWords.length
      
    } else if (type === 'review') {
      // 只要复习词汇
      selectedWords = shuffleArray(reviewWords).slice(0, totalCount)
      plan.reviewCount = selectedWords.length
      
    } else {
      // 混合模式：按比例分配
      const newCount = Math.floor(totalCount * newRatio / (newRatio + reviewRatio))
      const reviewCount = totalCount - newCount
      
      const selectedNew = shuffleArray(newWords).slice(0, newCount)
      const selectedReview = shuffleArray(reviewWords).slice(0, reviewCount)
      
      // 合并并打乱顺序
      selectedWords = shuffleArray([...selectedNew, ...selectedReview])
      
      plan.newCount = selectedNew.length
      plan.reviewCount = selectedReview.length
    }
    
    plan.totalCount = selectedWords.length
    
    // 转换为学习格式
    const learningWords = selectedWords.map((word, index) => ({
      id: word._id,
      word: word.word,
      kana: word.romaji,
      romaji: word.romaji,
      meaning: word.meaning,
      type: word.totalOccurrences <= 1 ? '新学词汇' : '复习词汇',
      level: `${word.totalOccurrences}次遇到`,
      examples: word.examples || [],
      source: 'integrated',
      sourceCount: word.sources ? word.sources.length : 1,
      firstSeen: word.firstSeen,
      lastSeen: word.lastSeen,
      tags: [...(word.tags || []), word.totalOccurrences <= 1 ? '新学' : '复习'],
      totalOccurrences: word.totalOccurrences
    }))
    
    console.log(`✅ 学习计划生成完成: 新学${plan.newCount}个, 复习${plan.reviewCount}个, 总计${plan.totalCount}个`)
    
    return {
      success: true,
      words: learningWords,
      plan: plan,
      statistics: {
        totalAvailable: allWords.data.length,
        newWordsAvailable: newWords.length,
        reviewWordsAvailable: reviewWords.length
      }
    }
    
  } catch (error) {
    console.error('生成学习计划失败:', error)
    return {
      success: false,
      error: error.message,
      words: [],
      plan: null
    }
  }
}

// 数组打乱工具函数
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}