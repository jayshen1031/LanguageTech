/**
 * 修复学习界面例句罗马音显示问题
 * 调用云函数的例句罗马音修复功能
 */

const cloud = require('@cloudbase/node-sdk')

// 初始化云开发
const app = cloud.init({
  env: 'cloud1-2g49srond2b01891',
  secretId: process.env.SECRET_ID,
  secretKey: process.env.SECRET_KEY
})

const db = app.database()

async function fixExampleRomaji() {
  console.log('🔧 开始修复例句罗马音显示问题...')
  
  try {
    // 调用云函数的修复功能
    console.log('📞 调用词汇整合云函数的例句罗马音修复功能...')
    
    const result = await app.callFunction({
      name: 'vocabulary-integration',
      data: {
        action: 'fix_example_romaji'
      }
    })
    
    if (result.result.success) {
      console.log('✅ 例句罗马音修复完成！')
      console.log(`📊 修复统计:`)
      console.log(`   - 处理词汇数: ${result.result.totalProcessed}`)
      console.log(`   - 修复例句数: ${result.result.examplesFixed}`)
      console.log(`   - 更新记录数: ${result.result.recordsUpdated}`)
      
      // 验证修复效果
      await verifyRomajiFix()
    } else {
      console.error('❌ 修复失败:', result.result.error)
    }
    
  } catch (error) {
    console.error('❌ 调用云函数失败:', error)
  }
}

async function verifyRomajiFix() {
  console.log('\n🔍 验证修复效果...')
  
  try {
    // 检查词汇表中例句的罗马音完整性
    const vocabulary = await db.collection('vocabulary_integrated')
      .limit(20)
      .get()
    
    let totalExamples = 0
    let examplesWithRomaji = 0
    let examplesWithoutRomaji = 0
    
    vocabulary.data.forEach(word => {
      if (word.examples && Array.isArray(word.examples)) {
        word.examples.forEach(example => {
          totalExamples++
          if (example.romaji && example.romaji.trim() !== '') {
            examplesWithRomaji++
          } else {
            examplesWithoutRomaji++
            console.log(`⚠️  缺少罗马音: ${word.word} - ${example.jp}`)
          }
        })
      }
    })
    
    console.log(`\n📈 验证结果:`)
    console.log(`   - 总例句数: ${totalExamples}`)
    console.log(`   - 有罗马音: ${examplesWithRomaji} (${Math.round(examplesWithRomaji/totalExamples*100)}%)`)
    console.log(`   - 缺罗马音: ${examplesWithoutRomaji} (${Math.round(examplesWithoutRomaji/totalExamples*100)}%)`)
    
    if (examplesWithoutRomaji === 0) {
      console.log('🎉 所有例句都有罗马音！修复成功！')
    } else {
      console.log('⚠️  仍有例句缺少罗马音，可能需要进一步处理')
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error)
  }
}

// 运行修复
fixExampleRomaji()