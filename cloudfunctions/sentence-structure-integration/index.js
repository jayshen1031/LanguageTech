// 句子结构整合云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'rebuild_all':
        return await rebuildAllStructures()
      case 'get_stats':
        return await getStructureStats()
      case 'search':
        return await searchStructures(event)
      default:
        return { success: false, error: '未知的操作类型' }
    }
  } catch (error) {
    console.error('句子结构整合失败:', error)
    return { success: false, error: error.message }
  }
}

// 重建所有句子结构数据
async function rebuildAllStructures() {
  console.log('🚀 开始重建句子结构数据...')

  try {
    // 1. 清空现有的句子结构数据
    const existingStructures = await db.collection('sentence_structures_integrated').get()
    if (existingStructures.data.length > 0) {
      console.log(`🗑️ 清空现有的${existingStructures.data.length}条句子结构记录`)
      // 分批删除现有记录
      for (const item of existingStructures.data) {
        await db.collection('sentence_structures_integrated').doc(item._id).remove()
      }
    }

    // 2. 获取所有解析历史记录
    let allHistory = []
    let hasMore = true
    let skip = 0
    const batchSize = 100

    while (hasMore) {
      const historyRes = await db.collection('japanese_parser_history')
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(batchSize)
        .get()

      if (historyRes.data.length > 0) {
        allHistory.push(...historyRes.data)
        skip += batchSize
        console.log(`📥 已获取${allHistory.length}条解析记录...`)
      } else {
        hasMore = false
      }
    }

    console.log(`📚 总共获取${allHistory.length}条解析记录`)

    // 3. 提取和整合句子结构
    const structureMap = new Map() // 用于去重
    let processedSentences = 0

    allHistory.forEach(record => {
      if (record.sentences && Array.isArray(record.sentences)) {
        record.sentences.forEach((sentence, sentenceIndex) => {
          processedSentences++
          
          // 提取句子结构信息
          if (sentence.structure) {
            const structureKey = sentence.structure.trim()
            
            if (structureKey && structureKey !== '处理失败' && structureKey.length > 2) {
              if (!structureMap.has(structureKey)) {
                structureMap.set(structureKey, {
                  structure: structureKey,
                  examples: [],
                  sources: [],
                  totalOccurrences: 0,
                  firstSeen: record.createTime || new Date(),
                  lastSeen: record.createTime || new Date(),
                  category: categorizeStructure(structureKey),
                  difficulty: calculateDifficulty(structureKey),
                  tags: ['句子结构']
                })
              }

              const structureData = structureMap.get(structureKey)

              // 添加例句（避免重复）
              if (!structureData.sources.includes(record._id)) {
                structureData.examples.push({
                  jp: sentence.originalText,
                  romaji: sentence.romaji || '',
                  cn: sentence.translation,
                  source: record.title || '解析记录',
                  recordId: record._id,
                  sentenceIndex: sentenceIndex
                })
                structureData.sources.push(record._id)
                structureData.totalOccurrences++

                if (record.createTime > structureData.lastSeen) {
                  structureData.lastSeen = record.createTime
                }
              }
            }
          }

          // 提取语法点信息
          if (sentence.grammar) {
            const grammarPoints = extractGrammarPoints(sentence.grammar)
            
            grammarPoints.forEach(grammarPoint => {
              const grammarKey = grammarPoint.trim()
              
              if (grammarKey && grammarKey.length > 2) {
                if (!structureMap.has(grammarKey)) {
                  structureMap.set(grammarKey, {
                    structure: grammarKey,
                    examples: [],
                    sources: [],
                    totalOccurrences: 0,
                    firstSeen: record.createTime || new Date(),
                    lastSeen: record.createTime || new Date(),
                    category: 'grammar_point',
                    difficulty: calculateDifficulty(grammarKey),
                    tags: ['语法要点']
                  })
                }

                const grammarData = structureMap.get(grammarKey)

                // 添加例句（避免重复）
                if (!grammarData.sources.includes(record._id)) {
                  grammarData.examples.push({
                    jp: sentence.originalText,
                    romaji: sentence.romaji || '',
                    cn: sentence.translation,
                    source: record.title || '解析记录',
                    recordId: record._id,
                    sentenceIndex: sentenceIndex
                  })
                  grammarData.sources.push(record._id)
                  grammarData.totalOccurrences++

                  if (record.createTime > grammarData.lastSeen) {
                    grammarData.lastSeen = record.createTime
                  }
                }
              }
            })
          }

          // 提取分析要点
          if (sentence.analysis) {
            const analysisPoints = extractAnalysisPoints(sentence.analysis)
            
            analysisPoints.forEach(analysisPoint => {
              const analysisKey = analysisPoint.trim()
              
              if (analysisKey && analysisKey.length > 5) {
                if (!structureMap.has(analysisKey)) {
                  structureMap.set(analysisKey, {
                    structure: analysisKey,
                    examples: [],
                    sources: [],
                    totalOccurrences: 0,
                    firstSeen: record.createTime || new Date(),
                    lastSeen: record.createTime || new Date(),
                    category: 'analysis_point',
                    difficulty: calculateDifficulty(analysisKey),
                    tags: ['句法分析']
                  })
                }

                const analysisData = structureMap.get(analysisKey)

                // 添加例句（避免重复）
                if (!analysisData.sources.includes(record._id)) {
                  analysisData.examples.push({
                    jp: sentence.originalText,
                    romaji: sentence.romaji || '',
                    cn: sentence.translation,
                    source: record.title || '解析记录',
                    recordId: record._id,
                    sentenceIndex: sentenceIndex
                  })
                  analysisData.sources.push(record._id)
                  analysisData.totalOccurrences++

                  if (record.createTime > analysisData.lastSeen) {
                    analysisData.lastSeen = record.createTime
                  }
                }
              }
            })
          }
        })
      }
    })

    console.log(`📝 处理了${processedSentences}个句子，提取到${structureMap.size}个不重复的句子结构`)

    // 4. 分批插入到数据库
    const structureArray = Array.from(structureMap.values())
    let insertedCount = 0

    for (const structureData of structureArray) {
      try {
        await db.collection('sentence_structures_integrated').add({
          data: structureData
        })
        insertedCount++

        if (insertedCount % 10 === 0) {
          console.log(`✅ 已插入${insertedCount}/${structureArray.length}个句子结构`)
        }
      } catch (error) {
        console.error(`❌ 插入句子结构失败: ${structureData.structure}`, error)
      }
    }

    console.log(`🎉 句子结构整合完成! 成功插入${insertedCount}个结构`)

    return {
      success: true,
      totalStructures: insertedCount,
      processedSentences: processedSentences,
      message: `成功整合${insertedCount}个句子结构`
    }

  } catch (error) {
    console.error('重建句子结构失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取句子结构统计
async function getStructureStats() {
  try {
    // 获取总数
    const totalRes = await db.collection('sentence_structures_integrated').count()
    
    // 获取已掌握数量（出现3次以上）
    const masteredRes = await db.collection('sentence_structures_integrated')
      .where({ totalOccurrences: db.command.gte(3) })
      .count()
    
    // 获取未掌握数量
    const unmasteredRes = await db.collection('sentence_structures_integrated')
      .where({ totalOccurrences: db.command.lt(3) })
      .count()

    // 按类别统计
    const categoryStats = {}
    const categories = ['sentence_structure', 'grammar_point', 'analysis_point']
    
    for (const category of categories) {
      const categoryRes = await db.collection('sentence_structures_integrated')
        .where({ category: category })
        .count()
      categoryStats[category] = categoryRes.total
    }

    return {
      success: true,
      stats: {
        total: totalRes.total,
        mastered: masteredRes.total,
        unmastered: unmasteredRes.total,
        categories: categoryStats
      }
    }
  } catch (error) {
    console.error('获取统计失败:', error)
    return { success: false, error: error.message }
  }
}

// 搜索句子结构
async function searchStructures(event) {
  const { 
    keyword = '', 
    category = '', 
    page = 1, 
    pageSize = 20,
    orderBy = 'totalOccurrences',
    order = 'desc'
  } = event

  try {
    let query = db.collection('sentence_structures_integrated')

    // 添加筛选条件
    const conditions = []
    
    if (keyword) {
      conditions.push({ structure: db.RegExp({ regexp: keyword, options: 'i' }) })
    }
    
    if (category) {
      conditions.push({ category: category })
    }

    if (conditions.length > 0) {
      query = query.where(db.command.and(conditions))
    }

    // 添加排序
    query = query.orderBy(orderBy, order)

    // 分页
    const skip = (page - 1) * pageSize
    const res = await query.skip(skip).limit(pageSize).get()

    // 获取总数
    const countRes = await query.count()

    return {
      success: true,
      data: res.data,
      total: countRes.total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(countRes.total / pageSize)
    }
  } catch (error) {
    console.error('搜索失败:', error)
    return { success: false, error: error.message }
  }
}

// 辅助函数：分类句子结构
function categorizeStructure(structure) {
  // 根据结构内容判断类别
  if (structure.includes('は') || structure.includes('が') || structure.includes('を')) {
    return 'sentence_structure'
  }
  if (structure.includes('形') || structure.includes('动词') || structure.includes('名词')) {
    return 'grammar_point'
  }
  if (structure.includes('修饰') || structure.includes('连接') || structure.includes('表示')) {
    return 'analysis_point'
  }
  return 'sentence_structure' // 默认分类
}

// 辅助函数：计算难度
function calculateDifficulty(structure) {
  const length = structure.length
  if (length <= 10) return 'basic'
  if (length <= 25) return 'intermediate'
  return 'advanced'
}

// 辅助函数：提取语法点
function extractGrammarPoints(grammarText) {
  if (!grammarText) return []
  
  // 按常见分隔符分割
  const points = []
  const lines = grammarText.split(/[。\n•・]/g)
    .filter(line => line.trim())
    .map(line => line.trim())
  
  lines.forEach(line => {
    if (line.length > 2 && line.length < 100) {
      points.push(line)
    }
  })
  
  return points
}

// 辅助函数：提取分析要点
function extractAnalysisPoints(analysisText) {
  if (!analysisText) return []
  
  const points = []
  const lines = analysisText.split(/[。\n•・]/g)
    .filter(line => line.trim())
    .map(line => line.trim())
  
  lines.forEach(line => {
    if (line.length > 5 && line.length < 150) {
      points.push(line)
    }
  })
  
  return points
}