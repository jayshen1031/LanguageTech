// 腾讯云TTS配置
const tencentcloud = require('tencentcloud-sdk-nodejs')
const TtsClient = tencentcloud.tts.v20190823.Client

// 创建腾讯云TTS客户端
function createTencentTTSClient() {
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
    console.warn('腾讯云密钥未配置，将使用备选TTS服务')
    return null
  }
  
  const clientConfig = {
    credential: {
      secretId: secretId,
      secretKey: secretKey
    },
    region: 'ap-beijing',
    profile: {
      httpProfile: {
        endpoint: 'tts.tencentcloudapi.com',
        timeout: 10 // 10秒超时
      }
    }
  }
  
  return new TtsClient(clientConfig)
}

// 使用腾讯云TTS生成音频
async function generateWithTencentTTS(text, lang, voice) {
  const client = createTencentTTSClient()
  if (!client) {
    return null
  }
  
  try {
    const params = {
      Text: text,
      SessionId: `${Date.now()}`,
      VoiceType: getVoiceType(lang, voice),
      Codec: 'mp3'
      // 不指定ModelType，使用默认值
      // 不指定Speed和Volume，使用默认值
    }
    
    console.log('调用腾讯云TTS:', { text, lang, voice, VoiceType: params.VoiceType })
    
    const response = await client.TextToVoice(params)
    if (response.Audio) {
      // 将base64音频数据转换为数据URL
      const audioDataUrl = `data:audio/mp3;base64,${response.Audio}`
      return {
        audioUrl: audioDataUrl,
        duration: response.Duration,
        source: 'tencent-tts'
      }
    }
    
    return null
  } catch (error) {
    console.error('腾讯云TTS错误:', error)
    return null
  }
}

// 获取声音类型
function getVoiceType(lang, voice) {
  const voiceMap = {
    'ja': {
      'default': 3, // 日语女声
      'male': 3     // 暂时只有女声
    },
    'en': {
      'default': 0, // 英语女声 
      'male': 1     // 英语男声
    },
    'zh': {
      'default': 0, // 中文女声
      'male': 1     // 中文男声
    }
  }
  
  // 根据腾讯云文档，基础音色：
  // 0-云小宁，中英文女声
  // 1-云小奇，中英文男声
  // 2-云小晚，中英文女声
  // 3-云小叶，日语女声
  // 4-云小欣，中英文女声
  // 5-云小龙，中英文男声
  // 6-云小曼，中英文女声
  // 7-云小婧，中英文女声
  
  return voiceMap[lang]?.[voice] || voiceMap[lang]?.['default'] || 0
}

module.exports = {
  createTencentTTSClient,
  generateWithTencentTTS
}