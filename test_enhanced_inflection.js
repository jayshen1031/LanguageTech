/**
 * 测试增强后的词形变化功能
 * 验证是否包含详细的时态、语态、敬语等变化说明
 */

// 这个函数将在小程序开发者工具的控制台中运行
function testEnhancedInflection() {
  console.log('🧪 测试增强后的词形变化功能...')
  
  // 测试包含各种词形变化的句子
  const testSentences = [
    {
      text: '昨日、映画を見ました。',
      expected: ['見る → 見ました（过去时）', '映画 + を（宾格）']
    },
    {
      text: '彼は82歳になりました。',
      expected: ['なる → なりました（过去时）', '彼 + は（主格）', '82歳（名词）']
    },
    {
      text: '美しい花が咲いています。',
      expected: ['美しい（い形容词）', '咲く → 咲いています（现在进行时）', '花 + が（主格）']
    },
    {
      text: '本を読むことができます。',
      expected: ['読む（可能表现）', '本 + を（宾格）', 'できます（敬语形）']
    },
    {
      text: '先生に質問されました。',
      expected: ['質問する → されました（被动过去时）', '先生 + に（行为主体）']
    }
  ]
  
  console.log('📝 将测试以下句子的详细词形变化:')
  testSentences.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.text}`)
    console.log(`      期待包含: ${item.expected.join(', ')}`)
  })
  
  // 随机选择一个句子进行测试
  const randomIndex = Math.floor(Math.random() * testSentences.length)
  const testCase = testSentences[randomIndex]
  
  console.log(`\n🎯 选择测试句子: ${testCase.text}`)
  console.log(`📋 期待的变化类型: ${testCase.expected.join(', ')}`)
  
  // 调用Azure GPT-4o进行解析
  wx.cloud.callFunction({
    name: 'azure-gpt4o',
    data: {
      sentence: testCase.text
    }
  }).then(result => {
    console.log('✅ 云函数调用成功')
    
    if (result.result.success) {
      const analysisText = result.result.data.analysis
      
      console.log('📋 AI返回的完整解析结果:')
      console.log(analysisText)
      
      // 检查是否包含词形变化详解
      const hasInflectionSection = analysisText.includes('【词形变化详解】')
      
      if (hasInflectionSection) {
        console.log('\n✅ 发现词形变化详解区域！')
        
        // 提取词形变化部分
        const inflectionMatch = analysisText.match(/【词形变化详解】\s*(.*?)(?=【词汇明细表】|$)/s)
        
        if (inflectionMatch) {
          const inflectionContent = inflectionMatch[1].trim()
          console.log('📊 词形变化详解内容:')
          console.log(inflectionContent)
          
          // 检查是否包含期待的变化类型
          console.log('\n🔍 检查期待的变化类型:')
          let foundCount = 0
          testCase.expected.forEach(expectedItem => {
            const found = inflectionContent.includes(expectedItem.split('（')[0]) || 
                         inflectionContent.includes(expectedItem.split(' ')[0])
            console.log(`   ${found ? '✅' : '❌'} ${expectedItem}: ${found ? '已包含' : '未找到'}`)
            if (found) foundCount++
          })
          
          // 检查详细程度
          const hasTimeAspect = /现在时|过去时|将来时/.test(inflectionContent)
          const hasVoice = /被动|使役|可能/.test(inflectionContent)
          const hasPolite = /敬语|丁宁语|ます形/.test(inflectionContent)
          const hasCase = /主格|宾格|与格|方向格/.test(inflectionContent)
          
          console.log('\n📈 变化类型覆盖度分析:')
          console.log(`   时态变化: ${hasTimeAspect ? '✅' : '❌'}`)
          console.log(`   语态变化: ${hasVoice ? '✅' : '❌'}`)
          console.log(`   敬语变化: ${hasPolite ? '✅' : '❌'}`)
          console.log(`   格助词变化: ${hasCase ? '✅' : '❌'}`)
          
          const score = Math.round((foundCount / testCase.expected.length) * 100)
          const detailScore = [hasTimeAspect, hasVoice, hasPolite, hasCase].filter(Boolean).length * 25
          
          console.log(`\n📊 测试结果:`)
          console.log(`   期待内容匹配度: ${score}% (${foundCount}/${testCase.expected.length})`)
          console.log(`   变化类型详细度: ${detailScore}% (${[hasTimeAspect, hasVoice, hasPolite, hasCase].filter(Boolean).length}/4)`)
          
          // 显示结果
          wx.showModal({
            title: '词形变化测试结果',
            content: `测试句子: ${testCase.text}\n\n匹配度: ${score}%\n详细度: ${detailScore}%\n\n${score >= 80 && detailScore >= 75 ? '✅ 测试通过！' : '⚠️ 需要改进'}`,
            showCancel: false,
            confirmText: score >= 80 ? '查看详情' : '重新测试',
            success: (res) => {
              if (res.confirm) {
                if (score >= 80) {
                  console.log('📋 完整的词形变化详解:')
                  console.log(inflectionContent)
                } else {
                  // 重新测试
                  setTimeout(() => testEnhancedInflection(), 1000)
                }
              }
            }
          })
          
        } else {
          console.log('❌ 无法提取词形变化内容')
        }
      } else {
        console.log('❌ AI解析结果不包含【词形变化详解】区域')
        wx.showModal({
          title: '测试失败',
          content: 'AI输出中没有找到词形变化详解，可能提示词更新未生效',
          showCancel: false
        })
      }
    } else {
      console.error('❌ AI解析失败:', result.result.error)
    }
  }).catch(error => {
    console.error('❌ 云函数调用失败:', error)
  })
}

// 快速测试特定句子
function quickTestInflection(sentence) {
  if (!sentence) {
    sentence = '彼は82歳になりました。'
  }
  
  console.log(`🚀 快速测试: ${sentence}`)
  
  wx.cloud.callFunction({
    name: 'azure-gpt4o',
    data: {
      sentence: sentence
    }
  }).then(result => {
    if (result.result.success) {
      const analysisText = result.result.data.analysis
      const inflectionMatch = analysisText.match(/【词形变化详解】\s*(.*?)(?=【词汇明细表】|$)/s)
      
      if (inflectionMatch) {
        console.log('📊 词形变化详解:')
        console.log(inflectionMatch[1].trim())
        
        wx.showToast({
          title: '词形变化已提取',
          icon: 'success'
        })
      } else {
        console.log('❌ 未找到词形变化详解')
      }
    }
  })
}

console.log('🧪 增强词形变化测试工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   testEnhancedInflection() - 完整测试词形变化功能')
console.log('   quickTestInflection() - 快速测试默认句子')
console.log('   quickTestInflection("你的句子") - 测试指定句子')