// 云函数：TTS服务（腾讯云优先，Google兜底）
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { text, lang = 'ja', voice = null, batch = false, texts = [] } = event
  
  // 支持批量请求
  if (batch && texts.length > 0) {
    console.log(`批量TTS请求: ${texts.length}个`)
    const results = []
    
    for (const t of texts) {
      try {
        const result = await generateSingleAudio(t, lang, voice)
        results.push(result)
      } catch (err) {
        results.push({
          success: false,
          text: t,
          error: err.message
        })
      }
    }
    
    return {
      success: true,
      batch: true,
      results: results
    }
  }
  
  // 单个请求
  try {
    // 参数验证
    if (!text) {
      console.error('❌ 文本参数缺失')
      return {
        success: false,
        error: '文本参数不能为空'
      }
    }
    
    console.log(`TTS请求: "${text}" (${lang})`)
    return await generateSingleAudio(text, lang, voice)
  } catch (error) {
    console.error('❌ TTS生成失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 生成单个音频
async function generateSingleAudio(text, lang, voice) {
  try {
    // 方案1：优先尝试腾讯云TTS（需要配置密钥）
    console.log('🔍 尝试使用腾讯云TTS...')
    try {
      const tencentUrl = await getTencentTTSUrl(text, lang, voice)
      if (tencentUrl) {
        console.log('✅ 使用腾讯云TTS成功')
        return {
          success: true,
          audioUrl: tencentUrl,
          alternatives: [getGoogleTTSUrl(text, lang)], // Google作为备选
          source: 'tencent-tts',
          cached: false
        }
      } else {
        console.log('⚠️ 腾讯云TTS返回空')
      }
    } catch (tencentError) {
      console.warn('⚠️ 腾讯云TTS不可用:', tencentError.message)
    }
    
    // 方案2：使用Google TTS作为兜底（免费，稳定）
    const googleUrl = getGoogleTTSUrl(text, lang)
    console.log('✅ 使用Google TTS（兜底）')
    
    return {
      success: true,
      audioUrl: googleUrl,
      alternatives: [], // 已经是最后的选择了
      source: 'google-tts',
      cached: false
    }
    
  } catch (error) {
    console.error('❌ 生成音频失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 获取腾讯云TTS URL
async function getTencentTTSUrl(text, lang, voice) {
  // 检查是否配置了腾讯云密钥
  let secretId = process.env.TENCENT_SECRET_ID || ''
  let secretKey = process.env.TENCENT_SECRET_KEY || ''
  
  // 尝试从本地配置文件读取（仅开发环境）
  try {
    const config = require('./config.js')
    secretId = secretId || config.TENCENT_SECRET_ID
    secretKey = secretKey || config.TENCENT_SECRET_KEY
  } catch (e) {
    // 配置文件不存在
  }
  
  if (!secretId || !secretKey) {
    console.log('腾讯云密钥未配置')
    return null
  }
  
  try {
    // 使用腾讯云SDK生成音频
    const { generateWithTencentTTS } = require('./tencent-tts-config')
    const result = await generateWithTencentTTS(text, lang, voice)
    
    if (result && result.audioUrl) {
      // 如果是base64数据，上传到云存储
      if (result.audioUrl.startsWith('data:')) {
        const base64Data = result.audioUrl.split(',')[1]
        const fileName = `tts/${lang}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`
        
        const uploadResult = await cloud.uploadFile({
          cloudPath: fileName,
          fileContent: Buffer.from(base64Data, 'base64')
        })
        
        // 获取临时URL
        const { fileList } = await cloud.getTempFileURL({
          fileList: [uploadResult.fileID]
        })
        
        return fileList[0].tempFileURL
      }
      
      return result.audioUrl
    }
    
    return null
  } catch (error) {
    console.error('腾讯云TTS错误:', error)
    return null
  }
}

// 获取Google TTS URL
function getGoogleTTSUrl(text, lang) {
  // Google TTS的语言代码映射
  const langMap = {
    'ja': 'ja',     // 日语
    'en': 'en',     // 英语
    'zh': 'zh-CN'  // 中文
  }
  
  const googleLang = langMap[lang] || 'ja'
  
  // Google TTS URL（稳定可用）
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${googleLang}&client=tw-ob&q=${encodeURIComponent(text)}`
}

// 导出函数供测试
module.exports.getGoogleTTSUrl = getGoogleTTSUrl
module.exports.getTencentTTSUrl = getTencentTTSUrl