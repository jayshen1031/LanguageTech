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
    // 方案1：强制使用腾讯云TTS（已配置密钥）
    console.log('🔍 使用腾讯云TTS生成音频...')
    try {
      const tencentUrl = await getTencentTTSUrl(text, lang, voice)
      if (tencentUrl) {
        console.log('✅ 腾讯云TTS生成成功')
        return {
          success: true,
          audioUrl: tencentUrl,
          alternatives: [], // 不提供备选，确保使用腾讯云
          source: 'tencent-tts',
          cached: false
        }
      } else {
        console.log('⚠️ 腾讯云TTS返回空结果')
        // 继续尝试备选方案
      }
    } catch (tencentError) {
      console.error('❌ 腾讯云TTS调用失败:', tencentError.message, tencentError.stack)
      // 继续尝试备选方案
    }
    
    // 方案2：仅在腾讯云失败时使用Google TTS（紧急备选）
    console.log('⚠️ 腾讯云TTS不可用，使用Google TTS作为紧急备选')
    const googleUrl = getGoogleTTSUrl(text, lang)
    
    return {
      success: true,
      audioUrl: googleUrl,
      alternatives: [], // 已经是最后的选择了
      source: 'google-tts-fallback',
      cached: false,
      warning: '腾讯云TTS暂时不可用，使用备选方案'
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
  
  // 尝试从本地配置文件读取
  try {
    const config = require('./config.js')
    secretId = secretId || config.TENCENT_SECRET_ID
    secretKey = secretKey || config.TENCENT_SECRET_KEY
    console.log('✅ 腾讯云密钥已加载')
  } catch (e) {
    console.log('⚠️ 配置文件不存在，使用环境变量')
  }
  
  if (!secretId || !secretKey) {
    console.error('❌ 腾讯云密钥未配置')
    return null
  }
  
  try {
    // 使用腾讯云SDK生成音频
    console.log(`📝 调用腾讯云TTS: text="${text}", lang="${lang}", voice="${voice}"`)
    const { generateWithTencentTTS } = require('./tencent-tts-config')
    const result = await generateWithTencentTTS(text, lang, voice)
    
    if (result && result.audioUrl) {
      console.log('✅ 腾讯云TTS返回音频数据')
      
      // 如果是base64数据，上传到云存储
      if (result.audioUrl.startsWith('data:')) {
        console.log('📤 上传音频到云存储...')
        const base64Data = result.audioUrl.split(',')[1]
        const fileName = `tts/${lang}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`
        
        const uploadResult = await cloud.uploadFile({
          cloudPath: fileName,
          fileContent: Buffer.from(base64Data, 'base64')
        })
        console.log('✅ 音频上传成功:', uploadResult.fileID)
        
        // 获取临时URL（有效期1小时）
        const { fileList } = await cloud.getTempFileURL({
          fileList: [{
            fileId: uploadResult.fileID,
            maxAge: 3600 // 1小时有效期
          }]
        })
        
        const tempUrl = fileList[0].tempFileURL
        console.log('✅ 获取临时URL成功')
        return tempUrl
      }
      
      return result.audioUrl
    }
    
    console.log('⚠️ 腾讯云TTS未返回音频数据')
    return null
  } catch (error) {
    console.error('❌ 腾讯云TTS处理错误:', error.message)
    console.error('错误详情:', error.stack)
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