/**
 * 检查最新解析记录的词态变化显示情况
 * 用于调试词态变化功能是否正常工作
 */

// 这个函数将在小程序开发者工具的控制台中运行
function checkLatestParseRecords() {
  console.log('🔍 检查最新解析记录的词态变化显示情况...')
  
  const db = wx.cloud.database()
  
  // 获取最新的5条解析记录
  db.collection('parser_history')
    .orderBy('createTime', 'desc')
    .limit(5)
    .get()
    .then(res => {
      console.log(`📚 获取到 ${res.data.length} 条最新解析记录`)
      
      res.data.forEach((record, index) => {
        console.log(`\n📖 记录 ${index + 1}: ${record.title || record.articleTitle || '无标题'}`)
        console.log(`   创建时间: ${record.createTime}`)
        console.log(`   句子数量: ${record.sentences ? record.sentences.length : 0}`)
        
        if (record.sentences && Array.isArray(record.sentences)) {
          // 检查每个句子是否包含词态变化信息
          record.sentences.forEach((sentence, sentenceIndex) => {
            console.log(`\n   📝 句子 ${sentenceIndex + 1}: ${sentence.originalText}`)
            
            // 检查是否包含词态变化相关字段
            const hasInflection = sentence.inflection || 
                                  sentence.wordInflection || 
                                  sentence.morphology ||
                                  (sentence.originalText && sentence.originalText.includes('词形变化')) ||
                                  (sentence.translation && sentence.translation.includes('词形变化')) ||
                                  (sentence.analysis && sentence.analysis.includes('词形变化')) ||
                                  (sentence.analysis && sentence.analysis.includes('变化形')) ||
                                  (sentence.analysis && sentence.analysis.includes('活用'))
            
            if (hasInflection) {
              console.log(`   ✅ 包含词态变化信息`)
              if (sentence.inflection) console.log(`      inflection: ${sentence.inflection}`)
              if (sentence.wordInflection) console.log(`      wordInflection: ${sentence.wordInflection}`)
              if (sentence.morphology) console.log(`      morphology: ${sentence.morphology}`)
            } else {
              console.log(`   ❌ 缺少词态变化信息`)
            }
            
            // 检查解析内容中是否提到词态变化
            const analysisText = sentence.analysis || ''
            if (analysisText.includes('词形变化') || analysisText.includes('变化形') || analysisText.includes('活用')) {
              console.log(`   📋 解析内容包含词态变化描述:`)
              console.log(`      ${analysisText.substring(0, 100)}...`)
            }
          })
        }
        
        console.log(`   ────────────────────────`)
      })
      
      // 检查特定句子
      const targetSentences = res.data.flatMap(record => 
        (record.sentences || []).filter(sentence => 
          sentence.originalText && (
            sentence.originalText.includes('82') ||
            sentence.originalText.includes('歳') ||
            sentence.originalText.includes('岁')
          )
        )
      )
      
      if (targetSentences.length > 0) {
        console.log(`\n🎯 找到包含年龄的句子:`)
        targetSentences.forEach(sentence => {
          console.log(`   原文: ${sentence.originalText}`)
          console.log(`   翻译: ${sentence.translation}`)
          console.log(`   分析: ${sentence.analysis ? sentence.analysis.substring(0, 200) : '无分析'}`)
        })
      } else {
        console.log(`\n⚠️  未找到包含"82岁"的句子`)
      }
    })
    .catch(error => {
      console.error('❌ 查询失败:', error)
    })
}

// 检查Azure GPT-4o云函数的提示词设置
function checkAzureGPTPrompt() {
  console.log('🔍 检查Azure GPT-4o云函数的词态变化提示词...')
  
  wx.cloud.callFunction({
    name: 'azure-gpt4o',
    data: {
      action: 'get_prompt_info' // 如果有这个功能的话
    }
  }).then(result => {
    console.log('✅ 云函数信息:', result)
  }).catch(error => {
    console.log('❌ 无法获取提示词信息，这是正常的')
    console.log('💡 建议直接测试一个简单句子来验证词态变化功能')
  })
}

console.log('📋 解析记录检查工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   checkLatestParseRecords() - 检查最新解析记录')
console.log('   checkAzureGPTPrompt() - 检查云函数提示词设置')