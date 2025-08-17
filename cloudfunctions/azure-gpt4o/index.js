// Azure GPT-4o 云函数
const cloud = require('wx-server-sdk')
// 延迟加载 axios，只在需要时加载
let axios = null

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// Azure OpenAI 配置
let AZURE_API_KEY = process.env.AZURE_API_KEY || ''
const AZURE_ENDPOINT = 'https://bondex.openai.azure.com'
const DEPLOYMENT_NAME = 'global-gpt-4o'
const API_VERSION = '2025-01-01-preview'

// 尝试从本地配置文件读取（仅开发环境）
try {
  const config = require('./config.js')
  AZURE_API_KEY = AZURE_API_KEY || config.AZURE_API_KEY
} catch (e) {
  console.log('配置文件不存在，请设置环境变量或创建config.js')
}

// 调用 Azure OpenAI API
async function callAzureGPT4o(messages, options = {}) {
  // 延迟加载 axios
  if (!axios) {
    axios = require('axios')
  }
  
  const url = `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=${API_VERSION}`
  
  const requestBody = {
    messages: messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 16000,  // 增加默认值以支持长文本
    stream: false
  }
  
  console.log('Azure GPT-4o API 请求URL:', url)
  console.log('请求参数:', JSON.stringify(requestBody, null, 2))
  
  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'api-key': AZURE_API_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Azure GPT-4o API 响应成功')
    return response.data
  } catch (error) {
    console.error('Azure GPT-4o API 调用失败:')
    console.error('状态码:', error.response?.status)
    console.error('错误信息:', error.response?.data)
    throw error
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, messages, temperature, maxTokens } = event
  
  try {
    console.log('Azure GPT-4o 云函数被调用，action:', action)
    
    if (!AZURE_API_KEY) {
      console.error('Azure API Key未配置')
      return {
        success: false,
        error: '请配置Azure API Key'
      }
    }
    
    switch (action) {
      case 'chat':
        // 通用对话
        const chatResult = await callAzureGPT4o(messages, {
          temperature,
          maxTokens
        })
        
        return {
          success: true,
          data: {
            content: chatResult.choices[0].message.content,
            usage: chatResult.usage,
            model: chatResult.model
          }
        }
        
      case 'grammar':
        // 日语语法分析 - 支持图片
        console.log('处理grammar请求，参数:', { 
          sentence: event.sentence, 
          imageUrl: event.imageUrl 
        })
        
        let analysisMessages = []
        
        if (event.imageUrl) {
          console.log('处理图片模式，下载图片:', event.imageUrl)
          // 下载图片并转换为base64
          const imageRes = await cloud.downloadFile({
            fileID: event.imageUrl
          })
          console.log('图片下载成功，大小:', imageRes.fileContent.length)
          const base64Image = imageRes.fileContent.toString('base64')
          
          // GPT-4o 支持多模态输入
          analysisMessages = [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `你是一个专业的日语教师。请识别图片中的所有日语文字，然后按照以下格式进行详细的语法解析。

【任务】：对图片中的日语内容进行完整的语法分析，包括每个句子的词汇分析、语法结构和语法点说明。

【输出格式要求】：
必须严格按照以下格式输出，每个部分都是必填项，不能省略：

【文章标题】（根据内容生成10字以内的中文标题）

---
📘 第1句
【日文原文】识别出的完整日语句子
【罗马音】完整的罗马音标注
【中文翻译】准确的中文翻译
【精简结构】主语+助词+宾语+动词（根据实际句子结构调整）
【句子结构分析】
• 词汇1（假名）- 词性，在句中的语法成分
• 词汇2（假名）- 词性，在句中的语法成分
• （列出句子中所有词汇的详细分析）
【语法点说明】
• 助词は：主题标记助词，表示句子的主题
• 动词ます形：敬语形式，表示礼貌
• （列出句子中所有重要语法点的详细解释）
【词汇明细表】
日语｜罗马音｜中文
私｜watashi｜我
学生｜gakusei｜学生

---
📘 第2句
（按照与第1句完全相同的格式）

【示例输出】：
【文章标题】自我介绍

---
📘 第1句
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语+主题助词+表语+系动词
【句子结构分析】
• 私（わたし）- 人称代词，作主语
• は - 主题助词，标记主题
• 学生（がくせい）- 名词，作表语
• です - 系动词，敬语形式
【语法点说明】
• は：主题助词，读作wa不是ha，用于标记句子主题
• です：相当于中文的"是"，是だ的敬语形式
• 名词+です：基本的判断句型，表示"A是B"
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生

请严格按照上述格式解析图片中的所有日语句子。每个部分都必须有内容，不能省略。`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }]
        } else {
          // 纯文本分析
          analysisMessages = [{
            role: 'user',
            content: `你是一个专业的日语教师。请对以下日语文本进行详细的语法解析。

【任务】：对文本中的每个句子进行完整的语法分析，包括词汇分析、语法结构和语法点说明。

【输入文本】：${event.sentence}

【输出格式要求】：
必须严格按照以下格式输出，每个部分都是必填项，不能省略：

---
📘 第1句
【日文原文】完整的日语句子
【罗马音】完整的罗马音标注
【中文翻译】准确的中文翻译
【精简结构】主语+助词+宾语+动词（根据实际句子结构调整）
【句子结构分析】
• 词汇1（假名）- 词性，在句中的语法成分
• 词汇2（假名）- 词性，在句中的语法成分
• （列出句子中所有词汇的详细分析）
【语法点说明】
• 助词は：主题标记助词，表示句子的主题
• 动词ます形：敬语形式，表示礼貌
• （列出句子中所有重要语法点的详细解释）
【词汇明细表】
日语｜罗马音｜中文
私｜watashi｜我
学生｜gakusei｜学生

---
📘 第2句
（按照与第1句完全相同的格式）

【示例输出】：
---
📘 第1句
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语+主题助词+表语+系动词
【句子结构分析】
• 私（わたし）- 人称代词，作主语
• は - 主题助词，标记主题
• 学生（がくせい）- 名词，作表语
• です - 系动词，敬语形式
【语法点说明】
• は：主题助词，读作wa不是ha，用于标记句子主题
• です：相当于中文的"是"，是だ的敬语形式
• 名词+です：基本的判断句型，表示"A是B"
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生

请严格按照上述格式解析所有日语句子。每个部分都必须有内容，不能省略。一次性输出所有句子的完整解析。`
          }]
        }
        
        const grammarResult = await callAzureGPT4o(analysisMessages, {
          temperature: 0.5,  // 提高温度，让模型更活跃
          maxTokens: 16000  // 大幅增加token限制确保完整输出
        })
        
        return {
          success: true,
          data: {
            analysis: grammarResult.choices[0].message.content
          }
        }
        
      case 'translate':
        // 翻译功能
        const translateMessages = [{
          role: 'user',
          content: `请将以下内容翻译成${event.targetLang || '中文'}：\n${event.text}`
        }]
        
        const translateResult = await callAzureGPT4o(translateMessages, {
          temperature: 0.3
        })
        
        return {
          success: true,
          data: {
            translation: translateResult.choices[0].message.content
          }
        }
        
      default:
        return {
          success: false,
          error: '不支持的操作'
        }
    }
    
  } catch (error) {
    console.error('Azure GPT-4o 处理失败:', error)
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || '调用失败'
    }
  }
}