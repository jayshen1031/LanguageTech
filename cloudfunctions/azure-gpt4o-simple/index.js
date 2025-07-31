// 超简化的 Azure GPT-4o 云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 直接使用内置的 https 模块
exports.main = async (event) => {
  const https = require('https')
  
  // 获取API密钥
  let apiKey = process.env.AZURE_API_KEY
  try {
    const config = require('./config.js')
    apiKey = apiKey || config.AZURE_API_KEY
  } catch (e) {
    // 配置文件不存在
  }
  
  if (!apiKey) {
    return { success: false, error: '请配置Azure API Key' }
  }
  
  return new Promise((resolve) => {
    const data = JSON.stringify({
      messages: [{
        role: 'user',
        content: event.prompt || '你好'
      }],
      temperature: 0.3,
      max_tokens: 1000
    })
    
    const options = {
      hostname: 'bondex.openai.azure.com',
      path: '/openai/deployments/global-gpt-4o/chat/completions?api-version=2025-01-01-preview',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }
    
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          resolve({
            success: true,
            content: result.choices?.[0]?.message?.content || '无响应'
          })
        } catch (e) {
          resolve({ success: false, error: '解析失败' })
        }
      })
    })
    
    req.on('error', () => {
      resolve({ success: false, error: '网络错误' })
    })
    
    req.write(data)
    req.end()
  })
}