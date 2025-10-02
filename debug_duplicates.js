// 调试重复句子结构问题
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

async function debugDuplicates() {
  try {
    console.log('🔍 开始调试重复句子结构问题...')
    
    // 1. 检查总数
    const totalRes = await db.collection('sentence_structures_integrated').count()
    console.log(`📊 总记录数: ${totalRes.total}`)
    
    // 2. 获取前10条记录看看数据格式
    const sampleRes = await db.collection('sentence_structures_integrated')
      .limit(10)
      .get()
    
    console.log('📝 样本数据:')
    sampleRes.data.forEach((item, index) => {
      console.log(`${index + 1}. ${item.structure} (examples: ${item.examples?.length || 0})`)
    })
    
    // 3. 查找真正的重复（完全相同的structure字段）
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
        console.log(`📥 已获取${allStructures.length}条记录...`)
      } else {
        hasMore = false
      }
    }
    
    // 4. 分析重复
    const structureMap = new Map()
    allStructures.forEach(item => {
      const key = item.structure.trim()
      if (!structureMap.has(key)) {
        structureMap.set(key, [])
      }
      structureMap.get(key).push(item)
    })
    
    // 5. 找出重复项
    const duplicates = []
    structureMap.forEach((items, structure) => {
      if (items.length > 1) {
        duplicates.push({
          structure: structure,
          count: items.length,
          ids: items.map(item => item._id)
        })
      }
    })
    
    console.log(`🔍 重复分析结果:`)
    console.log(`- 总记录: ${allStructures.length}`)
    console.log(`- 唯一结构: ${structureMap.size}`)
    console.log(`- 重复组数: ${duplicates.length}`)
    console.log(`- 重复记录数: ${duplicates.reduce((sum, dup) => sum + dup.count - 1, 0)}`)
    
    // 6. 显示前5个重复项详情
    console.log('\n📋 前5个重复项详情:')
    duplicates.slice(0, 5).forEach((dup, index) => {
      console.log(`${index + 1}. "${dup.structure}" - ${dup.count}条重复`)
      console.log(`   IDs: ${dup.ids.join(', ')}`)
    })
    
    return {
      total: allStructures.length,
      unique: structureMap.size,
      duplicateGroups: duplicates.length,
      duplicateRecords: duplicates.reduce((sum, dup) => sum + dup.count - 1, 0),
      duplicates: duplicates
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error)
    return { error: error.message }
  }
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { debugDuplicates }
}

// 如果在微信小程序环境中运行
if (typeof exports === 'undefined') {
  debugDuplicates().then(result => {
    console.log('🎯 最终结果:', result)
  })
}