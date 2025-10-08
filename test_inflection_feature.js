/**
 * 测试词形变化功能是否正常显示
 * 用于验证最新的修复是否生效
 */

// 这个函数将在小程序开发者工具的控制台中运行
function testInflectionFeature() {
  console.log('🧪 测试词形变化功能...')
  
  // 测试句子：包含明显的词形变化
  const testSentences = [
    '私は学校に行きます。',      // 行く → 行きます
    '昨日、映画を見ました。',     // 見る → 見ました  
    '彼は82歳になりました。',     // なる → なりました
    '美しい花が咲いています。',   // 咲く → 咲いています
    '本を読んでいる。'           // 読む → 読んでいる
  ]
  
  console.log('📝 将测试以下句子的词形变化解析:')
  testSentences.forEach((sentence, index) => {
    console.log(`   ${index + 1}. ${sentence}`)
  })
  
  // 随机选择一个句子进行测试
  const randomIndex = Math.floor(Math.random() * testSentences.length)
  const testSentence = testSentences[randomIndex]
  
  console.log(`\n🎯 选择测试句子: ${testSentence}`)
  
  // 调用Azure GPT-4o进行解析
  wx.cloud.callFunction({
    name: 'azure-gpt4o',
    data: {
      sentence: testSentence
    }
  }).then(result => {
    console.log('✅ 云函数调用成功')
    
    if (result.result.success) {
      console.log('📋 AI返回的完整解析结果:')
      console.log(result.result.data.analysis)
      
      // 检查是否包含词形变化详解
      const analysisText = result.result.data.analysis
      const hasInflectionSection = analysisText.includes('【词形变化详解】') || 
                                   analysisText.includes('词形变化详解') ||
                                   analysisText.includes('【词形变化】') ||
                                   analysisText.includes('词形变化')
      
      if (hasInflectionSection) {
        console.log('✅ AI解析结果包含词形变化详解！')
        
        // 提取词形变化部分内容
        const inflectionMatch = analysisText.match(/【词形变化详解】\s*(.*?)(?=【|$)/s) ||
                               analysisText.match(/词形变化详解\s*(.*?)(?=【|$)/s)
        
        if (inflectionMatch) {
          console.log('📊 词形变化详解内容:')
          console.log(inflectionMatch[1].trim())
        }
        
        // 现在测试前端解析
        console.log('\n🔧 测试前端解析功能...')
        testFrontendParsing(result.result.data.analysis)
        
      } else {
        console.log('❌ AI解析结果不包含词形变化详解')
        console.log('💡 建议检查Azure GPT-4o云函数的提示词配置')
      }
    } else {
      console.error('❌ AI解析失败:', result.result.error)
    }
  }).catch(error => {
    console.error('❌ 云函数调用失败:', error)
  })
}

// 测试前端解析功能
function testFrontendParsing(aiResponse) {
  console.log('🧪 测试前端解析逻辑...')
  
  // 模拟日语解析页面的parseSentenceResponse方法
  // 这里简化版本，主要测试inflection字段的提取
  
  // 模拟提取词形变化详解的逻辑
  const extractContent = (text, startMarker, endMarker) => {
    const startIndex = text.indexOf(startMarker)
    if (startIndex === -1) return ''
    
    const contentStart = startIndex + startMarker.length
    let contentEnd = text.length
    
    if (endMarker) {
      const endIndex = text.indexOf(endMarker, contentStart)
      if (endIndex !== -1) {
        contentEnd = endIndex
      }
    }
    
    return text.substring(contentStart, contentEnd).trim()
  }
  
  // 测试词形变化详解提取
  const inflection = extractContent(aiResponse, '【词形变化详解】', '【词汇明细表】') ||
                     extractContent(aiResponse, '词形变化详解', '【词汇明细表】') ||
                     extractContent(aiResponse, '【词形变化】', '【词汇明细表】') ||
                     extractContent(aiResponse, '词形变化', '【词汇明细表】')
  
  if (inflection && inflection.length > 0) {
    console.log('✅ 前端成功提取词形变化详解:')
    console.log(inflection)
    
    // 模拟前端显示
    const mockSentenceData = {
      originalText: '测试句子',
      inflection: inflection
    }
    
    console.log('🎨 模拟前端显示数据:')
    console.log(mockSentenceData)
    
    wx.showModal({
      title: '词形变化功能测试',
      content: `测试成功！\n\n提取到的词形变化详解:\n${inflection.substring(0, 100)}${inflection.length > 100 ? '...' : ''}`,
      showCancel: false,
      confirmText: '查看完整结果',
      success: (res) => {
        if (res.confirm) {
          console.log('📋 完整的词形变化详解:')
          console.log(inflection)
        }
      }
    })
  } else {
    console.log('❌ 前端未能提取到词形变化详解')
    console.log('💡 可能的原因:')
    console.log('   1. AI输出中不包含【词形变化详解】标记')
    console.log('   2. 提取逻辑有误')
    console.log('   3. 标记格式不匹配')
    
    wx.showModal({
      title: '测试失败',
      content: '前端未能提取到词形变化详解，请检查控制台日志',
      showCancel: false
    })
  }
}

// 检查最新解析记录中的词形变化
function checkRecentInflectionRecords() {
  console.log('🔍 检查最近解析记录中的词形变化字段...')
  
  const db = wx.cloud.database()
  
  db.collection('parser_history')
    .orderBy('createTime', 'desc')
    .limit(3)
    .get()
    .then(res => {
      console.log(`📚 获取到 ${res.data.length} 条最新记录`)
      
      res.data.forEach((record, index) => {
        console.log(`\n📖 记录 ${index + 1}: ${record.title || '无标题'}`)
        
        if (record.sentences && Array.isArray(record.sentences)) {
          const hasInflectionField = record.sentences.some(sentence => 
            sentence.inflection || sentence.wordInflection || sentence.morphology
          )
          
          if (hasInflectionField) {
            console.log('✅ 发现包含词形变化字段的句子:')
            record.sentences.forEach((sentence, sentenceIndex) => {
              if (sentence.inflection || sentence.wordInflection || sentence.morphology) {
                console.log(`   句子 ${sentenceIndex + 1}: ${sentence.originalText}`)
                console.log(`   词形变化: ${sentence.inflection || sentence.wordInflection || sentence.morphology}`)
              }
            })
          } else {
            console.log('❌ 该记录中没有词形变化字段')
          }
        }
      })
    })
    .catch(error => {
      console.error('❌ 查询失败:', error)
    })
}

console.log('🧪 词形变化功能测试工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   testInflectionFeature() - 测试完整的词形变化功能')
console.log('   checkRecentInflectionRecords() - 检查最近记录的词形变化字段')