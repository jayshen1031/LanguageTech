// 测试腾讯云OCR API
const crypto = require('crypto')
const https = require('https')
const config = require('./config.js')

const SECRET_ID = config.TENCENT_SECRET_ID
const SECRET_KEY = config.TENCENT_SECRET_KEY
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

// 测试简单的文本图片
const testBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAoACgDASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAAcEBQYDAv/EAC0QAAIBAwQBAwMDBQAAAAAAAAECAwQFEQAGITESBxNBUWGBInGRFDKhscH/xAAYAQADAQEAAAAAAAAAAAAAAAACAwQBAP/EAB4RAAICAgIDAAAAAAAAAAAAAAABAhEDIRIxE0FR/9oADAMBAA