/**
 * 测试图片解析的词形变化功能
 * 验证azure-gpt4o-batch云函数是否正确输出词形变化详解
 */

// 在小程序开发者工具控制台运行
function testImageInflection() {
  console.log('🧪 测试图片解析的词形变化功能...')
  
  // 模拟一个简单的文本（如果没有图片的话）
  const testText = `私は学生です。
昨日映画を見ました。
明日学校に行きます。`
  
  console.log('📝 测试文本:')
  console.log(testText)
  
  // 调用azure-gpt4o-batch云函数（图片解析通常用这个）
  wx.cloud.callFunction({
    name: 'azure-gpt4o-batch',
    data: {
      sentence: testText
    }
  }).then(result => {
    console.log('✅ azure-gpt4o-batch云函数调用成功')
    
    if (result.result.success) {
      const analysisText = result.result.data.analysis
      
      console.log('📋 完整解析结果:')
      console.log(analysisText)
      
      // 检查是否包含词形变化详解
      const hasInflectionSection = analysisText.includes('【词形变化详解】')
      
      if (hasInflectionSection) {
        console.log('\\n✅ 发现词形变化详解区域！')
        
        // 提取所有词形变化详解
        const inflectionMatches = analysisText.matchAll(/【词形变化详解】\\s*(.*?)(?=【词汇明细表】)/gs)
        
        let inflectionCount = 0
        for (const match of inflectionMatches) {
          inflectionCount++
          console.log(`\\n📊 第${inflectionCount}个句子的词形变化详解:`)
          console.log(match[1].trim())
        }
        
        // 检查是否包含各种变化类型
        const checks = {
          '动词变化': /动词.*活用|动词.*变化/g.test(analysisText),
          '形容词变化': /形容词.*活用|形容词.*变化/g.test(analysisText),
          '时态变化': /现在时|过去时|将来时|时态/g.test(analysisText),
          '敬语变化': /敬语|丁宁语|ます形/g.test(analysisText),
          '格助词': /主格|宾格|格助词|助词/g.test(analysisText)
        }
        
        console.log('\\n🔍 变化类型检查:')
        let passedCount = 0
        Object.entries(checks).forEach(([type, passed]) => {
          console.log(`   ${passed ? '✅' : '❌'} ${type}: ${passed ? '已包含' : '未包含'}`)
          if (passed) passedCount++
        })
        
        const coverageRate = Math.round((passedCount / Object.keys(checks).length) * 100)
        
        // 显示测试结果
        wx.showModal({
          title: '图片解析词形变化测试',
          content: `测试完成！\\n\\n词形变化详解: ${hasInflectionSection ? '✅ 已包含' : '❌ 缺失'}\\n\\n变化类型覆盖率: ${coverageRate}%\\n\\n${coverageRate >= 80 ? '✅ 测试通过' : '⚠️ 需要改进'}\\n\\n详情请查看控制台输出`,
          showCancel: false,
          confirmText: '查看详情',
          success: (res) => {
            if (res.confirm) {
              console.log('\\n📋 完整的解析结果:')
              console.log(analysisText)
            }
          }
        })
        
      } else {
        console.log('❌ 未找到词形变化详解区域')
        wx.showModal({
          title: '测试失败',
          content: 'azure-gpt4o-batch未输出词形变化详解，可能需要重新部署云函数',
          showCancel: false
        })
      }
    } else {
      console.error('❌ azure-gpt4o-batch调用失败:', result.result.error)
    }
  }).catch(error => {
    console.error('❌ 云函数调用失败:', error)
    wx.showToast({
      title: '云函数调用失败',
      icon: 'none'
    })
  })
}

// 测试单个云函数
function testSingleFunction(functionName) {
  console.log(`🚀 测试 ${functionName} 云函数...`)
  
  const testSentence = '彼は82歳になりました。'
  console.log(`测试句子: ${testSentence}`)
  
  wx.cloud.callFunction({
    name: functionName,
    data: {
      sentence: testSentence
    }
  }).then(result => {
    if (result.result.success) {
      const analysis = result.result.data.analysis
      const hasInflection = analysis.includes('【词形变化详解】')
      
      console.log(`\\n📊 ${functionName} 测试结果:`)
      console.log(`   词形变化详解: ${hasInflection ? '✅ 已包含' : '❌ 缺失'}`)
      
      if (hasInflection) {
        const match = analysis.match(/【词形变化详解】\\s*(.*?)(?=【词汇明细表】|$)/s)
        if (match) {
          console.log('   详解内容:', match[1].trim().substring(0, 150) + '...')
        }
      }
    } else {
      console.log(`❌ ${functionName} 调用失败:`, result.result.error)
    }
  })
}

console.log('🧪 图片解析词形变化测试工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   testImageInflection() - 完整测试图片解析词形变化')
console.log('   testSingleFunction("azure-gpt4o") - 测试单个云函数')
console.log('   testSingleFunction("azure-gpt4o-batch") - 测试批处理云函数')