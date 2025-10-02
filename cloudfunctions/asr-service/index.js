// 云函数：ASR服务（腾讯云语音识别）
const cloud = require('wx-server-sdk')
const tencentcloud = require('tencentcloud-sdk-nodejs')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

// 导入ASR客户端
const AsrClient = tencentcloud.asr.v20190614.Client

// 云函数入口函数
exports.main = async (event, context) => {
  const { fileID, format = 'mp3', lang = 'ja' } = event
  const wxContext = cloud.getWXContext()
  
  try {
    // console.log('ASR请求:', { fileID, format, lang })
    
    // 1. 下载音频文件
    const fileContent = await downloadFile(fileID)
    
    // 2. 调用腾讯云ASR进行识别
    const result = await recognizeSpeech(fileContent, format, lang)
    
    return {
      success: true,
      text: result.text,
      confidence: result.confidence,
      duration: result.duration
    }
    
  } catch (error) {
    console.error('ASR识别失败:', error)
    
    // 降级方案：返回错误信息
    return {
      success: false,
      error: error.message,
      fallback: '语音识别暂时不可用，请使用文字输入'
    }
  }
}

// 下载云存储文件
async function downloadFile(fileID) {
  try {
    const res = await cloud.downloadFile({
      fileID: fileID
    })
    return res.fileContent
  } catch (error) {
    console.error('下载文件失败:', error)
    throw new Error('无法下载音频文件')
  }
}

// 语音识别
async function recognizeSpeech(audioData, format, lang) {
  try {
    // 获取密钥配置
    let secretId = process.env.TENCENT_SECRET_ID || ''
    let secretKey = process.env.TENCENT_SECRET_KEY || ''
    
    // 尝试从本地配置文件读取（仅开发环境）
    try {
      const config = require('./config.js')
      secretId = secretId || config.TENCENT_SECRET_ID
      secretKey = secretKey || config.TENCENT_SECRET_KEY
    } catch (e) {
      // 配置文件不存在，使用环境变量
    }
    
    if (!secretId || !secretKey) {
      throw new Error('请配置腾讯云密钥')
    }
    
    // 创建ASR客户端配置
    const clientConfig = {
      credential: {
        secretId: secretId,
        secretKey: secretKey
      },
      region: 'ap-beijing',
      profile: {
        httpProfile: {
          endpoint: 'asr.tencentcloudapi.com',
          reqTimeout: 30 // 增加超时时间
        }
      }
    }
    
    const client = new AsrClient(clientConfig)
    
    // 语言映射
    const engineModelType = {
      'zh': '16k_zh',      // 中文
      'en': '16k_en',      // 英文
      'ja': '16k_ja',      // 日语
      'ko': '16k_ko'       // 韩语
    }[lang] || '16k_zh'
    
    // 构建请求参数
    const params = {
      EngineModelType: engineModelType,
      EngSerViceType: engineModelType, // 服务类型，与引擎模型类型保持一致
      ChannelNum: 1,
      ResTextFormat: 0,
      SourceType: 1,
      Data: audioData.toString('base64'),
      DataLen: audioData.length
    }
    
    // console.log('调用腾讯云ASR:', {
    //   EngineModelType: engineModelType,
    //   EngSerViceType: engineModelType,
    //   DataLen: params.DataLen
    // })
    
    // 调用一句话识别接口
    const response = await client.SentenceRecognition(params)
    
    if (response.Result) {
      return {
        text: response.Result,
        confidence: response.Confidence || 0,
        duration: response.AudioDuration || 0
      }
    } else {
      throw new Error('识别结果为空')
    }
    
  } catch (error) {
    console.error('腾讯云ASR错误:', error)
    
    // 如果是日语，尝试使用备选方案
    if (lang === 'ja') {
      // 可以集成其他日语识别服务作为备选
      // console.log('尝试备选日语识别方案')
    }
    
    throw error
  }
}

// 批量识别（扩展功能）
async function batchRecognize(audioFiles) {
  const results = []
  
  for (const file of audioFiles) {
    try {
      const result = await exports.main({
        fileID: file.fileID,
        format: file.format,
        lang: file.lang
      })
      results.push(result)
    } catch (error) {
      results.push({
        success: false,
        fileID: file.fileID,
        error: error.message
      })
    }
  }
  
  return results
}