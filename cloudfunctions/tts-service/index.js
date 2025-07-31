// 云函数：TTS服务（集成腾讯云语音合成）
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

// 预设音频映射（常用词汇）
const PRESET_AUDIO_MAP = {
  // 日语常用词 - 暂时注释掉无效的URL
  // 'こんにちは': 'https://example.com/audio/konnichiwa.mp3',
  // 'ありがとう': 'https://example.com/audio/arigatou.mp3',
  // 'おはよう': 'https://example.com/audio/ohayou.mp3',
  // 'さようなら': 'https://example.com/audio/sayounara.mp3',
  // '食べる': 'https://example.com/audio/taberu.mp3',
  // '飲む': 'https://example.com/audio/nomu.mp3',
  // '学校': 'https://example.com/audio/gakkou.mp3',
  // '友達': 'https://example.com/audio/tomodachi.mp3',
  // '時間': 'https://example.com/audio/jikan.mp3',
  // '本': 'https://example.com/audio/hon.mp3'
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { text, lang = 'ja', voice = null, batch = false, texts = [] } = event
  const wxContext = cloud.getWXContext()
  
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
    console.log(`TTS请求: ${text} (${lang})`)
    return await generateSingleAudio(text, lang, voice)
    
    // 1. 检查预设音频
    if (PRESET_AUDIO_MAP[text]) {
      console.log('使用预设音频')
      return {
        success: true,
        audioUrl: PRESET_AUDIO_MAP[text],
        source: 'preset',
        cached: true
      }
    }
    
    // 2. 检查数据库缓存（暂时跳过以避免超时）
    /*
    try {
      const cacheResult = await db.collection('audio_cache').where({
        text: text,
        lang: lang,
        voice: voice || 'default'
      }).get()
      
      if (cacheResult.data.length > 0) {
        console.log('使用数据库缓存')
        return {
          success: true,
          audioUrl: cacheResult.data[0].audioUrl,
          source: 'database_cache',
          cached: true
        }
      }
    } catch (dbError) {
      console.warn('数据库查询失败:', dbError)
    }
    */
    
  } catch (error) {
    console.error('生成音频失败:', error)
    return {
      success: false,
      text: text,
      error: error.message,
      readingInfo: {
        text: text,
        lang: lang
      }
    }
  }
}

// 生成单个音频
async function generateSingleAudio(text, lang, voice) {
  try {
    // 1. 检查预设音频
    if (PRESET_AUDIO_MAP[text]) {
      console.log('使用预设音频')
      return {
        success: true,
        text: text,
        audioUrl: PRESET_AUDIO_MAP[text],
        source: 'preset',
        cached: true
      }
    }
    
    // 2. 多源音频服务（提高成功率）
    console.log('使用多源音频服务')
    
    // 优先级音频源
    const audioSources = [
      // 源1: Google TTS (主要)
      `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`,
      // 源2: 有道词典 (备选，对日语支持好)
      lang === 'ja' ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2` : null,
      // 源3: Baidu TTS (备选)
      `https://fanyi.baidu.com/gettts?lan=${lang}&text=${encodeURIComponent(text)}&spd=3&source=web`
    ].filter(Boolean)
    
    // 特殊处理：日语假名音频映射（简化版，使用可靠的TTS源）
    if (lang === 'ja' && text.length <= 3) {
      // 构建更可靠的假名音频URL
      const kanaToRomaji = {
        // 平假名
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
        'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
        'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
        'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
        'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
        'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
        'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
        'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
        'わ': 'wa', 'を': 'wo', 'ん': 'n',
        // 片假名
        'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
        'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
        'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
        'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
        'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
        'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
        'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
        'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
        'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
        'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n'
      }
      
      if (kanaToRomaji[text]) {
        console.log('使用假名专用音频源')
        const romaji = kanaToRomaji[text]
        
        // 多个音频源提高成功率
        const kanaAudioSources = [
          // 源1: Google TTS (主要，专门为假名优化)
          `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(text)}`,
          // 源2: 有道词典 (备选)
          `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`,
          // 源3: 百度翻译TTS
          `https://fanyi.baidu.com/gettts?lan=jp&text=${encodeURIComponent(text)}&spd=3&source=web`,
          // 源4: 使用罗马音的英语发音作为最后备选
          `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(romaji)}`
        ]
        
        return {
          success: true,
          text: text,
          audioUrl: kanaAudioSources[0],
          alternatives: kanaAudioSources.slice(1),
          source: 'kana-specialized',
          cached: false,
          ttl: 3600
        }
      }
    }
    
    return {
      success: true,
      text: text,
      audioUrl: audioSources[0], // 返回第一个可用源
      alternatives: audioSources.slice(1), // 其他备选源
      source: 'multi-source',
      cached: false,
      ttl: 3600 // 缓存时间(秒)
    }
    
    /* 腾讯云TTS实现 - 需要配置超时时间后再启用
    let audioUrl = null
    let audioData = null
    
    try {
      // 方案A: 使用腾讯云语音合成
      audioData = await generateWithTencentTTS(text, lang, voice)
      if (audioData && audioData.audioUrl) {
        audioUrl = audioData.audioUrl
      }
    } catch (ttsError) {
      console.warn('腾讯云TTS失败:', ttsError)
    }
    
    // 如果生成成功，保存到数据库缓存
    if (audioUrl) {
      try {
        await db.collection('audio_cache').add({
          data: {
            text: text,
            lang: lang,
            voice: voice || 'default',
            audioUrl: audioUrl,
            createTime: new Date(),
            openid: wxContext.OPENID
          }
        })
        console.log('音频缓存已保存')
      } catch (saveError) {
        console.warn('保存缓存失败:', saveError)
      }
      
      return {
        success: true,
        audioUrl: audioUrl,
        source: 'generated',
        cached: false
      }
    }
    */
    
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message,
      readingInfo: {
        text: text,
        lang: lang
      }
    }
  }
}

// 使用腾讯云语音合成（暂时注释）
/*
async function generateWithTencentTTS(text, lang, voice) {
  try {
    const tencentcloud = require('tencentcloud-sdk-nodejs')
    const TtsClient = tencentcloud.tts.v20190823.Client
    
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
    
    const clientConfig = {
      credential: {
        secretId: secretId,
        secretKey: secretKey
      },
      region: 'ap-beijing',
      profile: {
        httpProfile: {
          endpoint: 'tts.tencentcloudapi.com'
        }
      }
    }
    
    const client = new TtsClient(clientConfig)
    const params = {
      Text: text,
      SessionId: `${Date.now()}`,
      ModelType: 1,
      VoiceType: getVoiceType(lang, voice),
      Codec: 'mp3'
    }
    
    console.log('调用腾讯云TTS:', { text, lang, voice, VoiceType: params.VoiceType })
    
    const response = await client.TextToVoice(params)
    if (response.Audio) {
      // 将音频数据上传到云存储
      const fileID = await uploadAudioToStorage(response.Audio, text, lang)
      return {
        audioUrl: fileID,
        duration: response.Duration
      }
    }
    
    return null
    
  } catch (error) {
    console.error('腾讯云TTS错误:', error)
    
    // 降级到 Google TTS
    if (lang === 'ja' || lang === 'en' || lang === 'zh') {
      console.log('降级使用 Google TTS')
      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`
      return {
        audioUrl: googleUrl,
        source: 'google-tts-fallback'
      }
    }
    
    return null
  }
}
*/

// 获取声音类型
function getVoiceType(lang, voice) {
  const voiceMap = {
    'ja': {
      'default': 101001, // 日语女声
      'male': 101002     // 日语男声
    },
    'en': {
      'default': 101003, // 英语女声
      'male': 101004     // 英语男声
    },
    'zh': {
      'default': 101005, // 中文女声
      'male': 101006     // 中文男声
    }
  }
  
  return voiceMap[lang]?.[voice] || voiceMap[lang]?.['default'] || 101001
}

// 上传音频到云存储
async function uploadAudioToStorage(audioData, text, lang) {
  try {
    const fileName = `audio/${lang}_${Buffer.from(text).toString('base64')}_${Date.now()}.mp3`
    
    const result = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: Buffer.from(audioData, 'base64')
    })
    
    return result.fileID
  } catch (error) {
    console.error('上传音频失败:', error)
    throw error
  }
}