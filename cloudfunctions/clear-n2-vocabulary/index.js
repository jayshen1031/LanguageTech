// 云函数：清空N2词汇数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

// 云函数入口函数 - 直接清空数据
exports.main = async (event, context) => {
  try {
    const collection = db.collection('n2_vocabulary')
    
    // 分批删除所有数据
    let totalDeleted = 0
    let hasMore = true
    const batchSize = 100
    
    while (hasMore) {
      // 获取一批数据的ID
      const batchData = await collection
        .limit(batchSize)
        .field({ _id: true })
        .get()
      
      if (batchData.data.length === 0) {
        hasMore = false
        break
      }
      
      // 批量删除
      const deletePromises = batchData.data.map(item => 
        collection.doc(item._id).remove()
      )
      
      await Promise.all(deletePromises)
      totalDeleted += batchData.data.length
      
      // console.log(`已删除 ${totalDeleted} 条数据`)
      
      // 如果这批数据少于batchSize，说明已经没有更多数据了
      if (batchData.data.length < batchSize) {
        hasMore = false
      }
    }
    
    return {
      success: true,
      totalDeleted: totalDeleted,
      message: `成功清空N2词汇库，共删除 ${totalDeleted} 条数据`
    }
    
  } catch (error) {
    console.error('清空N2词汇库失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}