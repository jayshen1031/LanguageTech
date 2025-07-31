// 腾讯云OCR云函数
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
const SERVICE = 'ocr'
const HOST = 'ocr.tencentcloudapi.com'
const REGION = 'ap-beijing'
const VERSION = '2018-11-19'

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

// 调用腾讯OCR API
async function callOCRAPI(action, params) {
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
          console.log('腾讯云API响应:', JSON.stringify(result, null, 2))
          if (result.Response.Error) {
            console.error('腾讯云API错误:', result.Response.Error)
            reject(result.Response.Error)
          } else {
            console.log('OCR识别成功')
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
  const { imageUrl, imageBase64, languageType = 'jap' } = event
  
  try {
    console.log('OCR云函数被调用，参数:', { imageUrl, imageBase64: imageBase64 ? '已提供' : '未提供', languageType })
    
    if (!SECRET_ID || !SECRET_KEY) {
      console.error('密钥未配置')
      return {
        success: false,
        error: '请配置腾讯云密钥'
      }
    }
    
    console.log('密钥已配置，SECRET_ID:', SECRET_ID.substring(0, 10) + '...')
    
    // 如果传入的是云存储路径，需要先下载
    let base64Image = imageBase64
    
    if (imageUrl && !imageBase64) {
      console.log('开始下载云存储图片:', imageUrl)
      // 从云存储下载图片
      const res = await cloud.downloadFile({
        fileID: imageUrl
      })
      console.log('图片下载成功，大小:', res.fileContent.length, '字节')
      base64Image = res.fileContent.toString('base64')
      console.log('Base64编码完成，长度:', base64Image.length)
    }
    
    // 调用通用OCR接口（支持多语言）
    const result = await callOCRAPI('GeneralBasicOCR', {
      ImageBase64: base64Image,
      LanguageType: languageType // JAP表示日语
    })
    
    // 提取识别的文本
    let recognizedText = ''
    if (result.TextDetections && result.TextDetections.length > 0) {
      recognizedText = result.TextDetections.map(item => item.DetectedText).join('')
    }
    
    return {
      success: true,
      data: {
        text: recognizedText,
        detections: result.TextDetections,
        language: languageType
      }
    }
    
  } catch (error) {
    console.error('OCR识别失败，详细错误:', error)
    console.error('错误类型:', error.constructor.name)
    console.error('错误堆栈:', error.stack)
    
    // 如果是腾讯云API返回的错误
    if (error.Code) {
      console.error('腾讯云错误代码:', error.Code)
      console.error('腾讯云错误信息:', error.Message)
    }
    
    return {
      success: false,
      error: error.Message || error.message || 'OCR识别失败',
      errorCode: error.Code || 'UNKNOWN_ERROR',
      errorDetail: error
    }
  }
}