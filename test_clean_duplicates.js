// 测试重复清理云函数
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

// 测试清理重复结构
async function testCleanDuplicates() {
  try {
    console.log('🧹 测试清理重复句子结构...')
    
    const result = await wx.cloud.callFunction({
      name: 'clean-duplicate-structures'
    })
    
    console.log('✅ 清理结果:', result.result)
    
    if (result.result.success) {
      console.log(`📊 原始记录: ${result.result.originalCount}`)
      console.log(`🔄 合并了: ${result.result.mergedCount}个结构`)
      console.log(`🗑️ 删除了: ${result.result.deletedCount}条重复记录`)
      console.log(`📈 最终记录: ${result.result.finalCount}`)
    } else {
      console.error('❌ 清理失败:', result.result.error)
    }
    
  } catch (error) {
    console.error('❌ 调用云函数失败:', error)
  }
}

// 导出测试函数
module.exports = {
  testCleanDuplicates
}