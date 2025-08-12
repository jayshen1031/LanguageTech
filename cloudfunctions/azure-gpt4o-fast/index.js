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
      // 预处理文本，明确标记每一行
      const lines = sentence.split('\n').filter(line => line.trim())
      const numberedText = lines.map((line, index) => `【第${index + 1}行】${line}`).join('\n')
      
      const requestMessages = [{
        role: 'user',
        content: `这个 GPT 虚拟员工专精于日语内容解析任务，能够根据用户上传的图片（含日语文本）或提供的日语对话内容，结构化提取句子信息、提供罗马音、中文翻译、语法讲解及句子成分分析。适用于日语学习者、翻译从业者、语言研究者等场景，助力提升对日语文本的深入理解与语言能力。

请将我输入的文本逐句进行结构化解析，输出格式请使用"紧凑型卡片式样"，要求包含以下模块内容，不要省略，也不要压缩简写：

1. 日文原文  
2. 罗马音  
3. 中文翻译  
4. 精简句子结构（将主要结构抽象总结输出，不要具体句子内容，只要抽象的部分，例如：主语 + 谓语 + 宾语，若有其他成分请补齐）  
5. 句子结构分析（每句成分逐条列出）  
6. 语法点说明（**保持完整详细**，包括助词、动词原形、变形说明、句型结构，不能简写）  
7. 词汇明细表：每个词单独列出，包含【日文｜罗马音｜中文翻译】

输入文本（共${lines.length}行，每行都需要解析）：
${numberedText}

【重要指令】：
1. 上面标记了【第X行】的文本共有${lines.length}行，你必须输出${lines.length}个句子的解析
2. 必须从【第1行】解析到【第${lines.length}行】，一行都不能遗漏
3. 即使文本很长也要全部解析完成，不要只解析前几行
4. 每一行都是独立的句子，需要单独解析
5. 输出时请保持完整，不要中途停止
6. 绝对不要在输出中包含任何"文本太长"、"确认继续"、"是否继续"等提示性文字
7. 直接输出所有${lines.length}个句子的解析结果
8. 检查：输出必须包含${lines.length}个"📘 第X句"的标记

格式请使用如下样式（参考）：

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

请保持所有格式结构一致，语法说明不要精简。适合用于日语学习笔记排版。

重要：请一次性输出所有句子的完整解析，不管文本有多长。不要询问是否继续，不要分批输出，不要省略任何句子。请直接输出全部内容。`
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
      
      // 根据输入长度动态调整token限制
      const inputLength = sentence.length
      let maxTokens = 8000  // 基础token数
      
      // 根据输入长度增加token限制
      if (inputLength > 1000) {
        maxTokens = 16000
      } else if (inputLength > 500) {
        maxTokens = 12000
      }
      
      const requestBody = {
        messages: requestMessages,
        temperature: 0.3,
        max_tokens: maxTokens
      }
      
      const result = await httpsPost(options, requestBody)
      
      // 调试日志
      console.log('=== Azure GPT-4o 响应调试 ===')
      console.log('输入行数:', sentence.split('\n').filter(line => line.trim()).length)
      console.log('输出长度:', result.choices[0].message.content.length)
      console.log('输出前1000字符:', result.choices[0].message.content.substring(0, 1000))
      console.log('Token使用情况:', result.usage)
      
      // 检查是否包含所有句子
      const outputLines = result.choices[0].message.content.split('第').filter(s => s.includes('句'))
      console.log('解析出的句子数量:', outputLines.length)
      
      return {
        success: true,
        data: {
          analysis: result.choices[0].message.content,
          debug: {
            inputLines: sentence.split('\n').filter(line => line.trim()).length,
            outputLength: result.choices[0].message.content.length,
            tokenUsage: result.usage,
            parsedSentences: outputLines.length
          }
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