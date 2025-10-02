// 强制清理重复句子结构 - 直接在前端执行
const app = getApp()

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

async function forceCleanDuplicates() {
  try {
    console.log('🧹 开始强制清理重复句子结构...')
    wx.showLoading({ title: '正在清理重复记录...' })
    
    // 1. 获取所有记录
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
    
    console.log(`📊 总共获取到${allStructures.length}条记录`)
    
    // 2. 按structure分组
    const structureGroups = new Map()
    
    allStructures.forEach(item => {
      const key = item.structure.trim()
      if (!structureGroups.has(key)) {
        structureGroups.set(key, [])
      }
      structureGroups.get(key).push(item)
    })
    
    // 3. 找出重复的组
    const duplicateGroups = []
    structureGroups.forEach((group, structure) => {
      if (group.length > 1) {
        duplicateGroups.push({ structure, items: group })
      }
    })
    
    console.log(`🔍 发现${duplicateGroups.length}个重复的句子结构`)
    
    if (duplicateGroups.length === 0) {
      wx.hideLoading()
      wx.showToast({
        title: '没有发现重复记录',
        icon: 'success'
      })
      return
    }
    
    // 4. 开始清理
    let mergedCount = 0
    let deletedCount = 0
    
    for (const group of duplicateGroups) {
      try {
        console.log(`🔄 处理重复结构: ${group.structure} (${group.items.length}条)`)
        
        // 选择保留的记录（examples最多的）
        const keepItem = group.items.reduce((best, current) => {
          const bestExamples = best.examples ? best.examples.length : 0
          const currentExamples = current.examples ? current.examples.length : 0
          return currentExamples > bestExamples ? current : best
        })
        
        // 合并所有examples
        const allExamples = []
        const seenExamples = new Set()
        
        group.items.forEach(item => {
          if (item.examples && Array.isArray(item.examples)) {
            item.examples.forEach(example => {
              const exampleKey = `${example.jp}|||${example.cn}`
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
        
        // 更新保留的记录
        await db.collection('sentence_structures_integrated')
          .doc(keepItem._id)
          .update({
            data: {
              examples: allExamples,
              sources: Array.from(allSources),
              totalOccurrences: allExamples.length,
              lastSeen: new Date()
            }
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
        
        // 每处理10个组就休息一下，避免超时
        if (mergedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        console.error(`❌ 处理失败: ${group.structure}`, error)
      }
    }
    
    wx.hideLoading()
    
    // 设置清理完成标志
    wx.setStorageSync('hasCleanedDuplicates', true)
    
    console.log(`🎉 清理完成! 合并了${mergedCount}个结构，删除了${deletedCount}条重复记录`)
    
    wx.showModal({
      title: '清理完成',
      content: `成功清理了${deletedCount}条重复记录\n合并了${mergedCount}个句子结构\n\n原始记录: ${allStructures.length}\n最终记录: ${allStructures.length - deletedCount}`,
      showCancel: false,
      success: () => {
        // 刷新页面数据
        if (getCurrentPages().length > 0) {
          const currentPage = getCurrentPages()[getCurrentPages().length - 1]
          if (currentPage.loadStructureStats) {
            currentPage.loadStructureStats()
          }
        }
      }
    })
    
    return {
      success: true,
      originalCount: allStructures.length,
      mergedCount: mergedCount,
      deletedCount: deletedCount,
      finalCount: allStructures.length - deletedCount
    }
    
  } catch (error) {
    wx.hideLoading()
    console.error('❌ 强制清理失败:', error)
    wx.showModal({
      title: '清理失败',
      content: `清理过程中出现错误: ${error.message}`,
      showCancel: false
    })
    return { success: false, error: error.message }
  }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { forceCleanDuplicates }
}

// 在控制台直接运行
console.log('💡 使用方法: 在微信开发者工具控制台中运行 forceCleanDuplicates()')