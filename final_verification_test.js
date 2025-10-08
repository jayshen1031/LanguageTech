/**
 * 最终验证测试 - 确保词形变化功能完整工作
 * 这个测试将验证：
 * 1. azure-gpt4o 云函数输出词形变化详解
 * 2. azure-gpt4o-batch 云函数输出词形变化详解
 * 3. 前端正确解析和显示词形变化
 */

// 在小程序开发者工具控制台运行
function finalVerificationTest() {
  console.log('🔥 最终验证测试开始...')
  console.log('📋 测试目标：确保词形变化功能完整工作')
  
  // 测试句子 - 包含用户提到的例子
  const testSentence = '彼は82歳になりました。'
  
  console.log(`🎯 测试句子: ${testSentence}`)
  console.log('📝 期待包含的词形变化：なる → なりました（过去时敬语形）')
  
  // 先测试 azure-gpt4o 云函数
  console.log('\\n=== 测试1: azure-gpt4o 云函数 ===')
  
  wx.cloud.callFunction({
    name: 'azure-gpt4o',
    data: {
      action: 'grammar',
      sentence: testSentence
    }
  }).then(result1 => {
    console.log('✅ azure-gpt4o 调用成功')
    
    if (result1.result.success) {
      const analysis1 = result1.result.data.analysis
      const hasInflection1 = analysis1.includes('【词形变化详解】')
      
      console.log(`📊 azure-gpt4o 结果:`)
      console.log(`   词形变化详解: ${hasInflection1 ? '✅ 已包含' : '❌ 缺失'}`)
      
      if (hasInflection1) {
        const match1 = analysis1.match(/【词形变化详解】\\s*(.*?)(?=【词汇明细表】|$)/s)
        if (match1) {
          const inflectionContent1 = match1[1].trim()
          console.log('   词形变化内容:', inflectionContent1.substring(0, 200) + '...')
          
          // 检查是否包含期待的变化
          const hasExpected1 = inflectionContent1.includes('なる') || inflectionContent1.includes('なりました')
          console.log(`   包含期待变化: ${hasExpected1 ? '✅ 是' : '❌ 否'}`)
        }
      }
      
      // 接着测试 azure-gpt4o-batch 云函数
      console.log('\\n=== 测试2: azure-gpt4o-batch 云函数 ===')
      
      wx.cloud.callFunction({
        name: 'azure-gpt4o-batch',
        data: {
          sentence: testSentence
        }
      }).then(result2 => {
        console.log('✅ azure-gpt4o-batch 调用成功')
        
        if (result2.result.success) {
          const analysis2 = result2.result.data.analysis
          const hasInflection2 = analysis2.includes('【词形变化详解】')
          
          console.log(`📊 azure-gpt4o-batch 结果:`)
          console.log(`   词形变化详解: ${hasInflection2 ? '✅ 已包含' : '❌ 缺失'}`)
          
          if (hasInflection2) {
            const match2 = analysis2.match(/【词形变化详解】\\s*(.*?)(?=【词汇明细表】|$)/s)
            if (match2) {
              const inflectionContent2 = match2[1].trim()
              console.log('   词形变化内容:', inflectionContent2.substring(0, 200) + '...')
              
              // 检查是否包含期待的变化
              const hasExpected2 = inflectionContent2.includes('なる') || inflectionContent2.includes('なりました')
              console.log(`   包含期待变化: ${hasExpected2 ? '✅ 是' : '❌ 否'}`)
            }
          }
          
          // 测试前端解析
          console.log('\\n=== 测试3: 前端解析功能 ===')
          
          // 假设我们有页面实例，测试parseSentenceResponse方法
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]
          
          if (currentPage && currentPage.parseSentenceResponse) {
            console.log('✅ 找到当前页面的解析方法')
            
            const parsed = currentPage.parseSentenceResponse(analysis2)
            
            if (parsed && parsed.sentences && parsed.sentences.length > 0) {
              console.log(`📊 前端解析结果:`)
              console.log(`   解析出句子数: ${parsed.sentences.length}`)
              
              const firstSentence = parsed.sentences[0]
              const hasInflectionField = !!(firstSentence.inflection || firstSentence.wordInflection || firstSentence.morphology)
              
              console.log(`   词形变化字段: ${hasInflectionField ? '✅ 已提取' : '❌ 缺失'}`)
              
              if (hasInflectionField) {
                const inflectionValue = firstSentence.inflection || firstSentence.wordInflection || firstSentence.morphology
                console.log('   提取的词形变化:', inflectionValue.substring(0, 150) + '...')
              }
              
              // 综合评估
              console.log('\\n=== 📊 最终测试结果 ===')
              const score1 = hasInflection1 ? 30 : 0
              const score2 = hasInflection2 ? 30 : 0
              const score3 = hasInflectionField ? 40 : 0
              const totalScore = score1 + score2 + score3
              
              console.log(`azure-gpt4o: ${hasInflection1 ? '✅' : '❌'} (${score1}分)`)
              console.log(`azure-gpt4o-batch: ${hasInflection2 ? '✅' : '❌'} (${score2}分)`)
              console.log(`前端解析: ${hasInflectionField ? '✅' : '❌'} (${score3}分)`)
              console.log(`总分: ${totalScore}/100`)
              
              // 显示最终结果
              wx.showModal({
                title: '词形变化功能验证',
                content: `测试完成！\\n\\n总分: ${totalScore}/100\\n\\nazure-gpt4o: ${hasInflection1 ? '✅' : '❌'}\\nazure-gpt4o-batch: ${hasInflection2 ? '✅' : '❌'}\\n前端解析: ${hasInflectionField ? '✅' : '❌'}\\n\\n${totalScore >= 90 ? '🎉 完美通过！' : totalScore >= 60 ? '⚠️ 基本通过，有待改进' : '❌ 测试失败，需要修复'}`,
                showCancel: false,
                confirmText: totalScore >= 60 ? '查看详情' : '重新测试',
                success: (res) => {
                  if (res.confirm) {
                    if (totalScore >= 60) {
                      console.log('\\n📋 完整的测试日志:')
                      console.log('azure-gpt4o 分析:', analysis1.substring(0, 500) + '...')
                      console.log('azure-gpt4o-batch 分析:', analysis2.substring(0, 500) + '...')
                      console.log('前端解析对象:', firstSentence)
                    } else {
                      // 重新测试
                      setTimeout(() => finalVerificationTest(), 1000)
                    }
                  }
                }
              })
              
            } else {
              console.log('❌ 前端解析失败')
            }
          } else {
            console.log('⚠️ 当前页面不是解析页面，无法测试前端解析')
            
            // 仍然显示云函数测试结果
            wx.showModal({
              title: '云函数测试结果',
              content: `azure-gpt4o: ${hasInflection1 ? '✅' : '❌'}\\nazure-gpt4o-batch: ${hasInflection2 ? '✅' : '❌'}\\n\\n请在日语解析页面运行前端测试`,
              showCancel: false
            })
          }
          
        } else {
          console.error('❌ azure-gpt4o-batch 调用失败:', result2.result.error)
        }
      }).catch(error2 => {
        console.error('❌ azure-gpt4o-batch 网络错误:', error2)
      })
      
    } else {
      console.error('❌ azure-gpt4o 调用失败:', result1.result.error)
    }
  }).catch(error1 => {
    console.error('❌ azure-gpt4o 网络错误:', error1)
  })
}

// 快速检查云函数状态
function quickCheck() {
  console.log('⚡ 快速检查云函数状态...')
  
  const testText = '私は学生です。'
  
  // 同时调用两个云函数
  Promise.all([
    wx.cloud.callFunction({
      name: 'azure-gpt4o',
      data: { action: 'grammar', sentence: testText }
    }),
    wx.cloud.callFunction({
      name: 'azure-gpt4o-batch', 
      data: { sentence: testText }
    })
  ]).then(results => {
    console.log('✅ 两个云函数都可调用')
    
    const [result1, result2] = results
    const hasInflection1 = result1.result.success && result1.result.data.analysis.includes('【词形变化详解】')
    const hasInflection2 = result2.result.success && result2.result.data.analysis.includes('【词形变化详解】')
    
    console.log(`azure-gpt4o 词形变化: ${hasInflection1 ? '✅' : '❌'}`)
    console.log(`azure-gpt4o-batch 词形变化: ${hasInflection2 ? '✅' : '❌'}`)
    
    wx.showToast({
      title: `状态: ${hasInflection1 && hasInflection2 ? '正常' : '异常'}`,
      icon: hasInflection1 && hasInflection2 ? 'success' : 'error'
    })
  }).catch(error => {
    console.error('❌ 云函数调用失败:', error)
  })
}

console.log('🔥 最终验证测试工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   finalVerificationTest() - 完整验证测试')
console.log('   quickCheck() - 快速状态检查')