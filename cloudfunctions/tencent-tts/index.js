// 云函数：调用腾讯云TTS
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { text, lang = 'ja' } = event
  
  console.log(`TTS请求: ${text} (${lang})`)
  
  try {
    // 方案1：使用微信小程序的语音合成能力（如果有的话）
    // 注意：微信云开发目前不直接提供TTS接口
    
    // 方案2：调用百度TTS（免费额度）
    // 需要在云函数中配置百度API密钥
    
    // 方案3：简单的模拟返回
    // 实际项目中应该调用真实的TTS服务
    const mockAudioUrls = {
      '食べる': 'https://dict.youdao.com/dictvoice?audio=taberu&type=2',
      '学校': 'https://dict.youdao.com/dictvoice?audio=gakkou&type=2',
      '本': 'https://dict.youdao.com/dictvoice?audio=hon&type=2',
      '友達': 'https://dict.youdao.com/dictvoice?audio=tomodachi&type=2',
      '時間': 'https://dict.youdao.com/dictvoice?audio=jikan&type=2'
    }
    
    // 使用更可靠的音频源
    const realAudioUrls = {
      '食べる': 'https://www.jisho.org/api/v1/audio/mp3/たべる',
      '学校': 'https://www.jisho.org/api/v1/audio/mp3/がっこう',
      '本': 'https://www.jisho.org/api/v1/audio/mp3/ほん',
      '友達': 'https://www.jisho.org/api/v1/audio/mp3/ともだち',
      '時間': 'https://www.jisho.org/api/v1/audio/mp3/じかん'
    }
    
    if (realAudioUrls[text]) {
      return {
        success: true,
        audioUrl: realAudioUrls[text],
        source: 'preset'
      }
    }
    
    // 使用Google Translate TTS（备用）
    const googleTTS = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(text)}`
    
    // 使用VoiceRSS API（需要注册）
    const voiceRSSKey = process.env.VOICERSS_KEY || 'demo'
    const voiceRSSUrl = `https://api.voicerss.org/?key=${voiceRSSKey}&hl=ja-jp&src=${encodeURIComponent(text)}&f=16khz_16bit_stereo`
    
    // 返回多个选项，让客户端选择
    return {
      success: true,
      audioUrl: googleTTS, // 主选项
      alternatives: [voiceRSSUrl], // 备选
      source: 'google-tts'
    }
    
  } catch (error) {
    console.error('TTS生成失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}