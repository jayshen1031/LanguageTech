// Azure GPT-4o 分批处理云函数 - 用于处理长文本
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// Azure OpenAI 配置
const AZURE_API_KEY = process.env.AZURE_API_KEY || ''
const AZURE_ENDPOINT = 'bondex.openai.azure.com'
const DEPLOYMENT_NAME = 'global-gpt-4o'
const API_VERSION = '2025-01-01-preview'

// 检查环境变量配置
console.log('Azure API Key状态:', AZURE_API_KEY ? `已配置(长度:${AZURE_API_KEY.length})` : '未配置')
console.log('Azure端点:', AZURE_ENDPOINT)
console.log('部署名称:', DEPLOYMENT_NAME)

if (!AZURE_API_KEY) {
  console.warn('Azure API Key未在环境变量中配置，请在云函数环境变量中设置AZURE_API_KEY')
}

// 使用原生 https 发送请求
function httpsPost(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.error?.message || body}`))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(JSON.stringify(data))
    req.end()
  })
}

// 云函数入口
exports.main = async (event, context) => {
  const { sentence } = event
  
  try {
    // 分批处理长文本
    const lines = sentence.split('\n').filter(line => line.trim())
    
    // 根据字符数来合理分批，目标每批300-400字符（减少批次大小避免超时）
    const totalChars = sentence.length
    const avgLineLength = totalChars / lines.length
    let targetCharsPerBatch = 300 // 从450减少到300字符，提高成功率
    let batchSize = Math.max(1, Math.floor(targetCharsPerBatch / avgLineLength))
    
    // 更严格的批次大小范围，避免超时
    if (batchSize > 6) {
      batchSize = 6  // 从12减少到6行，大幅降低超时风险
    } else if (batchSize < 2) {
      batchSize = 2  // 从3减少到2行，确保最小处理效率
    }
    
    console.log(`总字符数: ${totalChars}, 平均每行: ${Math.round(avgLineLength)}字符, 批次大小: ${batchSize}行`)
    
    const results = []
    // // console.log(`总共${lines.length}行，平均每行${Math.round(avgLineLength)}字符，每批${batchSize}行`)
    
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, Math.min(i + batchSize, lines.length))
      const batchText = batch.join('\n')
      const batchNum = Math.floor(i / batchSize) + 1
      
      // // console.log(`处理第${batchNum}批（第${i + 1}-${Math.min(i + batchSize, lines.length)}行）`)
      
      // 为每个批次的句子重新编号
      const startIndex = i + 1
      const numberedBatch = batch.map((line, idx) => 
        `【第${startIndex + idx}句】${line}`
      ).join('\n')
      
      const requestMessages = [{
        role: 'user',
        content: `请将以下日语文本逐句进行详细的语法解析。这是一个长文本的第${batchNum}部分。

输入文本（第${startIndex}到第${Math.min(i + batchSize, lines.length)}句）：
${numberedBatch}

要求：
1. 解析每一行文本，保持句子编号
2. 提供完整的罗马音、中文翻译、语法分析
3. 必须使用标准格式输出，保持编号连续性
4. 绝对不要省略任何句子
5. 输出${batch.length}个完整的句子解析

格式示例：
---
📘 第${startIndex}句  
【日文原文】...
【罗马音】...
【中文翻译】...
【精简结构】...
【句子结构分析】...
【语法点说明】...
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生
です｜desu｜是

🔥🔥🔥 词汇明细表格式要求 - 严格执行！！！：

❌ 绝对禁止的错误格式 - 用户会愤怒：
❌ コツコツと｜コツコツto｜词汇（包含助词と）
❌ 足音を踏み｜足音wo踏mi｜词汇（包含助词を）  
❌ 俺は俺で在｜俺ha俺de在｜词汇（包含助词は、で）
❌ り続けたい｜ri続ketai｜词汇（词汇变位）
❌ 任何包含"词汇"、"表示"、"动词"、"名词"、"助词"的行
❌ 任何复合助词形式
❌ 任何表头行
❌ 日文原文｜日文原文｜词汇

✅ 用户要求的正确格式（严格按照）：
コツコツ｜kotsu kotsu｜拟声词
アスファルト｜asufaruto｜柏油路  
刻む｜kizamu｜刻画
足音｜ashioto｜脚步声
俺｜ore｜我
愛｜ai｜爱

📋 词汇选择原则：
1. 从句子中选出独立的实词：名词、动词词干、形容词词干
2. 绝对不要助词：は、が、を、に、で、と等
3. 绝对不要复合助词：ついた、しめる、らい等
4. 绝对不要"词汇"这个词
5. 每个词汇必须有准确的罗马音和具体中文意思
6. 每句选择3-4个最重要的词汇

🔥 如果你输出错误格式，用户会非常愤怒！必须严格按照正确格式输出！

直接输出全部解析，不要询问确认。`
      }]
      
      const options = {
        hostname: AZURE_ENDPOINT,
        path: `/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=${API_VERSION}`,
        method: 'POST',
        headers: {
          'api-key': AZURE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
      
      const requestBody = {
        messages: requestMessages,
        temperature: 0.3,
        max_tokens: 4000  // 减少token限制加快处理速度
      }
      
      // 添加超时处理，减少超时时间提高响应速度
      const timeoutMs = Math.min(25000, 12000 + batchSize * 1500) // 基础12秒+每行1.5秒，最多25秒
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('单批次请求超时')), timeoutMs)
      })
      
      // 增加重试机制
      let retryCount = 0
      const maxRetries = 2
      let batchSuccess = false
      
      while (retryCount < maxRetries && !batchSuccess) {
        try {
          console.log(`第${batchNum}批处理尝试 ${retryCount + 1}/${maxRetries}`)
          const result = await Promise.race([
            httpsPost(options, requestBody),
            timeoutPromise
          ])
          results.push(result.choices[0].message.content)
          batchSuccess = true
          console.log(`第${batchNum}批处理成功`)
        } catch (error) {
          retryCount++
          console.error(`第${batchNum}批第${retryCount}次尝试失败:`, error.message)
          
          if (retryCount < maxRetries) {
            // 等待后重试，逐步增加等待时间
            const waitTime = 1000 * retryCount
            console.log(`等待${waitTime}ms后重试...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          } else {
            // 最终失败，添加降级处理
            console.error(`第${batchNum}批最终失败，使用降级处理`)
            results.push(`---\n📘 第${startIndex}句\n【日文原文】处理失败\n【处理说明】第${batchNum}批次(${batch.length}行)超时失败，请手动处理\n【原始内容】\n${batchText}`)
          }
        }
      }
      
      // 延迟避免请求过快
      if (i + batchSize < lines.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // 合并所有批次的结果
    const combinedResult = results.join('\n\n')
    
    return {
      success: true,
      data: {
        analysis: combinedResult,
        batches: results.length,
        totalLines: lines.length
      }
    }
    
  } catch (error) {
    console.error('Azure GPT-4o Batch 处理失败:', error)
    return {
      success: false,
      error: error.message || '调用失败'
    }
  }
}