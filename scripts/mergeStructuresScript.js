// 句子结构去重合并脚本
// 在小程序开发者工具控制台直接运行此脚本

console.log('🚀 开始句子结构去重合并...')

// 初始化云开发
if (!wx.cloud) {
  console.error('请使用 2.2.3 或以上的基础库以使用云能力')
} else {
  wx.cloud.init({
    env: 'cloud1-2g49srond2b01891',
    traceUser: true
  })
}

const db = wx.cloud.database()

async function mergeDuplicateStructures() {
  try {
    console.log('🔄 开始合并重复的句子结构...')
    
    // 获取所有句子结构
    let allStructures = []
    let hasMore = true
    let skip = 0
    const batchSize = 100
    
    while (hasMore) {
      const res = await db.collection('sentence_structures_integrated')
        .skip(skip)
        .limit(batchSize)
        .get()
      
      if (res.data.length > 0) {
        allStructures.push(...res.data)
        skip += batchSize
        console.log(`📥 已获取${allStructures.length}条句子结构记录...`)
      } else {
        hasMore = false
      }
    }
    
    console.log(`📊 总共${allStructures.length}条句子结构记录`)
    
    // 按structure字段分组找重复
    const structureGroups = new Map()
    
    allStructures.forEach(item => {
      const key = item.structure.trim()
      if (!structureGroups.has(key)) {
        structureGroups.set(key, [])
      }
      structureGroups.get(key).push(item)
    })
    
    // 找出重复的组
    const duplicateGroups = []
    let totalDuplicates = 0
    
    structureGroups.forEach((group, structure) => {
      if (group.length > 1) {
        duplicateGroups.push({ structure, items: group })
        totalDuplicates += group.length - 1 // 减1是因为要保留一个
      }
    })
    
    console.log(`🔍 发现${duplicateGroups.length}个重复的句子结构，共${totalDuplicates}条重复记录`)
    
    if (duplicateGroups.length === 0) {
      console.log('✅ 没有发现重复记录')
      return {
        success: true,
        message: '没有发现重复记录',
        mergedCount: 0,
        deletedCount: 0
      }
    }
    
    // 开始合并
    let mergedCount = 0
    let deletedCount = 0
    
    for (const group of duplicateGroups) {
      try {
        console.log(`🔄 合并重复结构: ${group.structure} (${group.items.length}条重复)`)
        
        // 选择保留的记录（选择examples最多的，或者最早创建的）
        const keepItem = group.items.reduce((best, current) => {
          if (current.examples && best.examples) {
            return current.examples.length > best.examples.length ? current : best
          }
          return current.firstSeen < best.firstSeen ? current : best
        })
        
        // 合并所有examples
        const allExamples = []
        const seenExamples = new Set()
        
        group.items.forEach(item => {
          if (item.examples && Array.isArray(item.examples)) {
            item.examples.forEach(example => {
              // 使用日文原文作为去重标识
              const exampleKey = example.jp
              if (!seenExamples.has(exampleKey)) {
                seenExamples.add(exampleKey)
                allExamples.push(example)
              }
            })
          }
        })
        
        // 合并sources
        const allSources = new Set()
        group.items.forEach(item => {
          if (item.sources && Array.isArray(item.sources)) {
            item.sources.forEach(source => allSources.add(source))
          }
        })
        
        // 计算合并后的数据
        const mergedData = {
          examples: allExamples,
          sources: Array.from(allSources),
          totalOccurrences: allExamples.length,
          firstSeen: group.items.reduce((earliest, item) => 
            item.firstSeen < earliest ? item.firstSeen : earliest, 
            group.items[0].firstSeen
          ),
          lastSeen: group.items.reduce((latest, item) => 
            item.lastSeen > latest ? item.lastSeen : latest, 
            group.items[0].lastSeen
          ),
          // 保持原有的category、difficulty、tags
          category: keepItem.category,
          difficulty: keepItem.difficulty,
          tags: keepItem.tags
        }
        
        // 更新保留的记录
        await db.collection('sentence_structures_integrated')
          .doc(keepItem._id)
          .update({
            data: mergedData
          })
        
        console.log(`✅ 更新保留记录: ${keepItem._id}, 合并后examples: ${allExamples.length}个`)
        mergedCount++
        
        // 删除其他重复记录
        for (const item of group.items) {
          if (item._id !== keepItem._id) {
            await db.collection('sentence_structures_integrated')
              .doc(item._id)
              .remove()
            console.log(`🗑️ 删除重复记录: ${item._id}`)
            deletedCount++
          }
        }
        
      } catch (error) {
        console.error(`❌ 合并失败: ${group.structure}`, error)
      }
    }
    
    console.log(`🎉 合并完成! 合并了${mergedCount}个结构，删除了${deletedCount}条重复记录`)
    console.log(`📊 原始数量: ${allStructures.length}条 → 合并后: ${allStructures.length - deletedCount}条`)
    
    return {
      success: true,
      message: `合并完成! 合并了${mergedCount}个结构，删除了${deletedCount}条重复记录`,
      mergedCount: mergedCount,
      deletedCount: deletedCount,
      originalCount: allStructures.length,
      finalCount: allStructures.length - deletedCount
    }
    
  } catch (error) {
    console.error('❌ 合并重复句子结构失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 执行合并
mergeDuplicateStructures().then(result => {
  if (result.success) {
    console.log('✅ 句子结构去重合并完成!')
    console.log(`📈 统计结果:`)
    console.log(`   原始数量: ${result.originalCount}条`)
    console.log(`   合并后: ${result.finalCount}条`)
    console.log(`   删除重复: ${result.deletedCount}条`)
    console.log(`   合并结构: ${result.mergedCount}个`)
  } else {
    console.log('❌ 合并失败:', result.error)
  }
})