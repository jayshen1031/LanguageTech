// Azure GPT-4o 分批处理云函数 - 用于处理长文本
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// Azure OpenAI 配置
const AZURE_API_KEY = process.env.AZURE_API_KEY || ''

// 检查环境变量配置
if (!AZURE_API_KEY) {
  console.warn('Azure API Key未在环境变量中配置，请在云函数环境变量中设置AZURE_API_KEY')
}

const AZURE_ENDPOINT = 'bondex.openai.azure.com'
const DEPLOYMENT_NAME = 'global-gpt-4o'
const API_VERSION = '2025-01-01-preview'

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
    
    // 动态计算批次大小：根据平均行长度调整
    const avgLineLength = sentence.length / lines.length
    let batchSize = 4 // 默认每批4行
    
    // 如果行很长，减少批次大小
    if (avgLineLength > 50) {
      batchSize = 3
    } else if (avgLineLength > 30) {
      batchSize = 4
    } else {
      batchSize = 6
    }
    
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
【词汇明细表】...

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
        max_tokens: 6000  // 增加token限制确保每批都能完整输出
      }
      
      const result = await httpsPost(options, requestBody)
      results.push(result.choices[0].message.content)
      
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