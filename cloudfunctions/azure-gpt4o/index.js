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
    max_tokens: options.maxTokens || 2000,
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
                text: `请识别图片中的日语文字，并分析其语法结构。

请按以下格式回答：
1. 识别文本：（图片中的完整日语文本）
2. 句子分解：（逐词分析）
3. 语法要点：（主要语法结构）
4. 词汇解释：（重点词汇）
5. 句子翻译：（中文翻译）`
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
            content: `请分析以下日语句子的语法结构，包括词性、语法点、变形等：
句子：${event.sentence}

请按以下格式回答：
1. 句子分解：（逐词分析）
2. 语法要点：（主要语法结构）
3. 词汇解释：（重点词汇）
4. 句子翻译：（中文翻译）`
          }]
        }
        
        const grammarResult = await callAzureGPT4o(analysisMessages, {
          temperature: 0.3,
          maxTokens: 3000
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