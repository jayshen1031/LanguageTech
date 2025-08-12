// 百度TTS备用方案（免费）
function getBaiduTTSUrl(text, lang) {
  const langMap = {
    'ja': 'jp',     // 日语
    'en': 'en',     // 英语  
    'zh': 'zh'      // 中文
  }
  
  const baiduLang = langMap[lang] || 'jp'
  
  // 百度翻译的TTS接口（免费，稳定）
  return `https://fanyi.baidu.com/gettts?lan=${baiduLang}&text=${encodeURIComponent(text)}&spd=3&source=web`
}

// 有道词典TTS（日语效果好）
function getYoudaoTTSUrl(text, lang) {
  if (lang === 'ja') {
    return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`
  }
  return null
}

module.exports = {
  getBaiduTTSUrl,
  getYoudaoTTSUrl
}