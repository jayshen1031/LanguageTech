// Azure GPT-4o 快速云函数 - 使用原生 https 模块避免 axios 加载时间
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// Azure OpenAI 配置
let AZURE_API_KEY = process.env.AZURE_API_KEY || ''

// 尝试从本地配置文件读取（仅开发环境）
try {
  const config = require('./config.js')
  AZURE_API_KEY = AZURE_API_KEY || config.AZURE_API_KEY
} catch (e) {
  console.log('配置文件不存在，请设置环境变量或创建config.js')
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
  const { action, messages, sentence, imageUrl, temperature, maxTokens } = event
  
  try {
    // 简化的文本分析
    if (action === 'grammar' && sentence && !imageUrl) {
      const requestMessages = [{
        role: 'user',
        content: `请将以下日语文本逐句进行结构化解析，严格按照以下格式输出：

输入文本：${sentence}

输出要求：
1. 将文本按句子分割（以。！？等为分隔符）
2. 每个句子都要包含以下所有模块内容：
   - 日文原文
   - 罗马音（完整标注）
   - 中文翻译
   - 精简句子结构（抽象化，如：主语+谓语+宾语）
   - 句子结构分析（详细列出每个成分）
   - 语法点说明（详细说明所有语法点，包括助词用法、动词变形等）
   - 词汇明细表（每个词单独列出）

输出格式示例：
---
📘 第1句
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语 + 主题助词 + 表语 + 系动词
【句子结构分析】
• 私（わたし）- 主语，第一人称代词
• は - 主题助词，标记主题
• 学生（がくせい）- 表语，名词
• です - 系动词，表示"是"的敬语形式
【语法点说明】
• は：主题助词，用于标记句子的主题，读作"wa"
• です：系动词，名词句的敬语形式，相当于"だ"的敬语
• 名词+です：表示"是..."的基本句型
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生

请严格按照以上格式解析每一个句子，不要省略任何模块。`
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
        max_tokens: 3000
      }
      
      const result = await httpsPost(options, requestBody)
      
      return {
        success: true,
        data: {
          analysis: result.choices[0].message.content
        }
      }
    }
    
    // 如果是图片模式，返回错误提示使用完整版
    if (imageUrl) {
      return {
        success: false,
        error: '图片分析请使用 azure-gpt4o 云函数'
      }
    }
    
    // 其他操作暂不支持
    return {
      success: false,
      error: '此云函数仅支持文本语法分析'
    }
    
  } catch (error) {
    console.error('Azure GPT-4o Fast 处理失败:', error)
    return {
      success: false,
      error: error.message || '调用失败'
    }
  }
}