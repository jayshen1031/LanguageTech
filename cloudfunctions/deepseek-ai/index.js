// DeepSeek AI 云函数
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

// 检查环境变量配置
if (!DEEPSEEK_API_KEY) {
  console.warn('DeepSeek API Key未在环境变量中配置，请在云函数环境变量中设置DEEPSEEK_API_KEY')
}

const API_BASE_URL = 'https://api.deepseek.com/v1'

// 调用 DeepSeek API
async function callDeepSeekAPI(messages, options = {}) {
  const requestBody = {
    model: options.model || 'deepseek-chat',
    messages: messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 2000,
    stream: false
  }
  
  // // console.log('DeepSeek API 请求参数:', JSON.stringify(requestBody, null, 2))
  
  try {
    const response = await axios.post(`${API_BASE_URL}/chat/completions`, requestBody, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    // // console.log('DeepSeek API 响应成功')
    return response.data
  } catch (error) {
    console.error('DeepSeek API 调用失败:')
    console.error('状态码:', error.response?.status)
    console.error('错误信息:', error.response?.data)
    console.error('请求URL:', `${API_BASE_URL}/chat/completions`)
    throw error
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, messages, temperature, model } = event
  
  try {
    // // console.log('DeepSeek云函数被调用，action:', action)
    
    if (!DEEPSEEK_API_KEY) {
      console.error('DeepSeek API Key未配置')
      return {
        success: false,
        error: '请配置DeepSeek API Key'
      }
    }
    
    switch (action) {
      case 'chat':
        // 通用对话
        const chatResult = await callDeepSeekAPI(messages, {
          temperature,
          model
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
        // // console.log('处理grammar请求，参数:', { 
        //   sentence: event.sentence, 
        //   imageUrl: event.imageUrl 
        // })
        
        let analysisMessages = []
        
        if (event.imageUrl) {
          // // console.log('处理图片模式')
          // DeepSeek 目前可能不支持图片输入，需要先使用 OCR
          // // console.log('DeepSeek 暂不支持图片，改用 OCR + 文本分析')
          
          // 调用 OCR 服务识别文字
          const ocrResult = await wx.cloud.callFunction({
            name: 'ocr-service',
            data: {
              imageUrl: event.imageUrl,
              languageType: 'jap'
            }
          })
          
          if (!ocrResult.result.success) {
            throw new Error('图片识别失败：' + ocrResult.result.error)
          }
          
          const recognizedText = ocrResult.result.data.text || ''
          // // console.log('OCR 识别结果:', recognizedText)
          
          if (!recognizedText) {
            throw new Error('未能识别到图片中的文字')
          }
          
          // 使用识别出的文字进行分析
          analysisMessages = [{
            role: 'user',
            content: `请分析以下日语句子的语法结构，包括词性、语法点、变形等：
句子：${recognizedText}

请按以下格式回答：
1. 句子分解：（逐词分析）
2. 语法要点：（主要语法结构）
3. 词汇解释：（重点词汇）
4. 句子翻译：（中文翻译）`
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
        
        // 对于图片内容，DeepSeek 可能需要使用特定的模型
        const modelToUse = event.imageUrl ? 'deepseek-chat' : 'deepseek-chat'
        
        const grammarResult = await callDeepSeekAPI(analysisMessages, {
          temperature: 0.3,
          model: modelToUse
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
        
        const translateResult = await callDeepSeekAPI(translateMessages, {
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
    console.error('DeepSeek处理失败:', error)
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || '调用失败'
    }
  }
}