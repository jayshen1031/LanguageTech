// 腾讯混元大模型云函数
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

// 腾讯云API配置
let SECRET_ID = process.env.TENCENT_SECRET_ID || ''
let SECRET_KEY = process.env.TENCENT_SECRET_KEY || ''

// 尝试从本地配置文件读取（仅开发环境）
try {
  const config = require('./config.js')
  SECRET_ID = SECRET_ID || config.TENCENT_SECRET_ID
  SECRET_KEY = SECRET_KEY || config.TENCENT_SECRET_KEY
} catch (e) {
  // 配置文件不存在，使用环境变量
  console.log('配置文件不存在，请设置环境变量或创建config.js')
}
const SERVICE = 'hunyuan'
const HOST = 'hunyuan.tencentcloudapi.com'
const REGION = 'ap-beijing'
const VERSION = '2023-09-01'

// 生成签名
function getSignature(params, timestamp) {
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json\nhost:${HOST}\n`
  const signedHeaders = 'content-type;host'
  const hashedRequestPayload = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex')
  
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n')
  
  const algorithm = 'TC3-HMAC-SHA256'
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]
  const credentialScope = `${date}/${SERVICE}/tc3_request`
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n')
  
  const kDate = crypto.createHmac('sha256', `TC3${SECRET_KEY}`).update(date).digest()
  const kService = crypto.createHmac('sha256', kDate).update(SERVICE).digest()
  const kSigning = crypto.createHmac('sha256', kService).update('tc3_request').digest()
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')
  
  return `${algorithm} Credential=${SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

// 调用腾讯混元API
async function callHunyuanAPI(action, params) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000)
    const authorization = getSignature(params, timestamp)
    
    const options = {
      hostname: HOST,
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': HOST,
        'X-TC-Action': action,
        'X-TC-Version': VERSION,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': REGION,
        'Authorization': authorization
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.Response.Error) {
            reject(result.Response.Error)
          } else {
            resolve(result.Response)
          }
        } catch (error) {
          reject(error)
        }
      })
    })
    
    req.on('error', reject)
    req.write(JSON.stringify(params))
    req.end()
  })
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, messages, temperature = 0.7, topP = 0.9, model = 'hunyuan-standard' } = event
  
  try {
    console.log('混元AI云函数被调用，action:', action)
    console.log('密钥配置状态:', {
      SECRET_ID: SECRET_ID ? SECRET_ID.substring(0, 10) + '...' : '未配置',
      SECRET_KEY: SECRET_KEY ? '已配置' : '未配置'
    })
    
    if (!SECRET_ID || !SECRET_KEY) {
      console.error('密钥未配置')
      return {
        success: false,
        error: '请配置腾讯云密钥'
      }
    }
    
    let result
    
    switch (action) {
      case 'chat':
        // 对话接口
        result = await callHunyuanAPI('ChatCompletions', {
          Model: model,
          Messages: messages,
          Temperature: temperature,
          TopP: topP,
          Stream: false
        })
        
        return {
          success: true,
          data: {
            content: result.Choices[0].Message.Content,
            usage: result.Usage,
            model: model
          }
        }
        
      case 'grammar':
        // 语法分析 - 支持文本或图片
        console.log('处理grammar请求，参数:', { 
          sentence: event.sentence, 
          imageUrl: event.imageUrl 
        })
        
        let grammarMessages = []
        
        if (event.imageUrl) {
          console.log('处理图片模式，下载图片:', event.imageUrl)
          // 如果有图片，先下载并转换为base64
          const imageRes = await cloud.downloadFile({
            fileID: event.imageUrl
          })
          console.log('图片下载成功，大小:', imageRes.fileContent.length)
          const base64Image = imageRes.fileContent.toString('base64')
          console.log('Base64编码完成，长度:', base64Image.length)
          
          // 腾讯混元目前可能不支持图片输入，需要先使用OCR识别文字
          console.log('混元AI可能不支持直接图片输入，先调用OCR识别')
          
          // 调用OCR云函数识别文字
          const ocrRes = await wx.cloud.callFunction({
            name: 'ocr-service',
            data: {
              imageUrl: event.imageUrl,
              languageType: 'jap'
            }
          })
          
          if (!ocrRes.result.success) {
            throw new Error('图片识别失败：' + ocrRes.result.error)
          }
          
          const recognizedText = ocrRes.result.data.text || ''
          console.log('OCR识别结果:', recognizedText)
          
          if (!recognizedText) {
            throw new Error('未能识别到图片中的文字')
          }
          
          // 使用识别出的文字进行语法分析
          const grammarPrompt = `请分析以下日语句子的语法结构，包括词性、语法点、变形等：
句子：${recognizedText}

请按以下格式回答：
1. 句子分解：（逐词分析）
2. 语法要点：（主要语法结构）
3. 词汇解释：（重点词汇）
4. 句子翻译：（中文翻译）`
          
          grammarMessages = [{
            Role: 'user',
            Content: grammarPrompt
          }]
        } else {
          // 纯文本分析
          const grammarPrompt = `请分析以下日语句子的语法结构，包括词性、语法点、变形等：
句子：${event.sentence}

请按以下格式回答：
1. 句子分解：（逐词分析）
2. 语法要点：（主要语法结构）
3. 词汇解释：（重点词汇）
4. 句子翻译：（中文翻译）`
          
          grammarMessages = [{
            Role: 'user',
            Content: grammarPrompt
          }]
        }
        
        result = await callHunyuanAPI('ChatCompletions', {
          Model: model,
          Messages: grammarMessages,
          Temperature: 0.3,
          TopP: 0.8
        })
        
        return {
          success: true,
          data: {
            analysis: result.Choices[0].Message.Content,
            sentence: event.sentence
          }
        }
        
      case 'examples':
        // 生成例句
        const examplesPrompt = `请为日语单词"${event.word}"生成${event.count || 3}个例句。
要求：
1. 例句要符合初级学习者水平
2. 每个例句都要包含中文翻译
3. 标注假名读音

格式：
例句1：[日语句子]
读音：[假名]
翻译：[中文]`
        
        result = await callHunyuanAPI('ChatCompletions', {
          Model: model,
          Messages: [{
            Role: 'user',
            Content: examplesPrompt
          }],
          Temperature: 0.8,
          TopP: 0.9
        })
        
        return {
          success: true,
          data: {
            examples: result.Choices[0].Message.Content,
            word: event.word
          }
        }
        
      default:
        return {
          success: false,
          error: '不支持的操作'
        }
    }
    
  } catch (error) {
    console.error('腾讯混元API调用失败:', error)
    return {
      success: false,
      error: error.message || '调用失败'
    }
  }
}