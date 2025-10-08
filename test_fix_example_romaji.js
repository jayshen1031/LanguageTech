/**
 * 测试例句罗马音修复功能
 * 这个脚本将在小程序中运行，用于测试云函数
 */

// 这个函数将在小程序开发者工具的控制台中运行
function testFixExampleRomaji() {
  console.log('🔧 开始测试例句罗马音修复功能...')
  
  // 调用云函数
  wx.cloud.callFunction({
    name: 'vocabulary-integration',
    data: {
      action: 'fix_example_romaji'
    }
  }).then(result => {
    console.log('✅ 云函数调用成功:', result)
    
    if (result.result.success) {
      console.log('🎉 例句罗马音修复完成！')
      console.log(`📊 修复统计:`)
      console.log(`   - 处理词汇数: ${result.result.totalProcessed}`)
      console.log(`   - 修复例句数: ${result.result.examplesFixed}`)
      console.log(`   - 更新记录数: ${result.result.recordsUpdated}`)
      
      wx.showModal({
        title: '修复完成',
        content: `成功修复 ${result.result.examplesFixed} 个例句的罗马音显示`,
        showCancel: false
      })
    } else {
      console.error('❌ 修复失败:', result.result.error)
      wx.showModal({
        title: '修复失败',
        content: result.result.error,
        showCancel: false
      })
    }
  }).catch(error => {
    console.error('❌ 云函数调用失败:', error)
    wx.showModal({
      title: '调用失败',
      content: '云函数调用失败，请检查网络连接',
      showCancel: false
    })
  })
}

// 验证修复效果
function verifyRomajiFix() {
  console.log('🔍 验证修复效果...')
  
  const db = wx.cloud.database()
  
  // 检查前20个词汇的例句罗马音情况
  db.collection('vocabulary_integrated')
    .limit(20)
    .get()
    .then(res => {
      let totalExamples = 0
      let examplesWithRomaji = 0
      let examplesWithoutRomaji = 0
      const missingRomajiExamples = []
      
      res.data.forEach(word => {
        if (word.examples && Array.isArray(word.examples)) {
          word.examples.forEach(example => {
            totalExamples++
            if (example.romaji && example.romaji.trim() !== '') {
              examplesWithRomaji++
            } else {
              examplesWithoutRomaji++
              missingRomajiExamples.push({
                word: word.word,
                example: example.jp
              })
            }
          })
        }
      })
      
      console.log(`📈 验证结果:`)
      console.log(`   - 总例句数: ${totalExamples}`)
      console.log(`   - 有罗马音: ${examplesWithRomaji} (${Math.round(examplesWithRomaji/totalExamples*100)}%)`)
      console.log(`   - 缺罗马音: ${examplesWithoutRomaji} (${Math.round(examplesWithoutRomaji/totalExamples*100)}%)`)
      
      if (examplesWithoutRomaji > 0) {
        console.log('⚠️  缺少罗马音的例句:')
        missingRomajiExamples.forEach(item => {
          console.log(`     ${item.word}: ${item.example}`)
        })
      }
      
      const completionRate = Math.round(examplesWithRomaji/totalExamples*100)
      wx.showModal({
        title: '验证结果',
        content: `例句罗马音完整率: ${completionRate}%\n有罗马音: ${examplesWithRomaji}个\n缺罗马音: ${examplesWithoutRomaji}个`,
        showCancel: false
      })
    })
    .catch(error => {
      console.error('❌ 验证失败:', error)
    })
}

console.log('📋 例句罗马音修复工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   testFixExampleRomaji() - 运行修复')
console.log('   verifyRomajiFix() - 验证结果')