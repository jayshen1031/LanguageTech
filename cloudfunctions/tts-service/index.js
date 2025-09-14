// 云函数：TTS服务（支持缓存）
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { text, lang = 'ja', voice = null, batch = false, texts = [] } = event
  
  // 支持批量请求
  if (batch && texts.length > 0) {
    // 批量TTS请求
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
    
    // TTS请求
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
    // 步骤1：检查缓存和直连标记
    // 检查音频缓存
    const cachedAudio = await checkAudioCache(text, lang)
    if (cachedAudio) {
      // 检查是否标记为直连模式
      if (cachedAudio.directLink) {
        // 发现直连标记
        return {
          success: true,
          audioUrl: cachedAudio.directUrl,
          source: 'direct-link-cached',
          cached: true,
          cacheTime: cachedAudio.createTime
        }
      }
      
      // 普通音频文件缓存
      // 找到缓存音频文件
      
      // 直接下载云存储文件并返回base64数据
      try {
        const result = await cloud.downloadFile({
          fileID: cachedAudio.fileId
        })
        
        if (result.fileContent) {
          // 将文件内容转换为base64数据URL
          const base64Data = result.fileContent.toString('base64')
          const audioDataUrl = `data:audio/mpeg;base64,${base64Data}`
          
          // 缓存音频文件读取成功
          return {
            success: true,
            audioUrl: audioDataUrl,
            source: 'cache',
            cached: true,
            cacheTime: cachedAudio.createTime
          }
        }
      } catch (downloadError) {
        console.error('❌ 读取缓存文件失败:', downloadError)
        // 缓存文件可能已删除，删除无效缓存记录
        await deleteCacheRecord(cachedAudio._id)
      }
    }
    
    // 步骤2：优先使用直连模式，可选尝试下载
    // 缓存未命中，使用直连模式
    
    // 直接返回百度TTS直链并标记
    const baiduUrl = getBaiduTTSUrl(text, lang)
    
    // 可选：快速尝试一次下载（超时1秒）
    // 快速尝试百度TTS下载
    const audioBuffer = await downloadAudioFileQuick(baiduUrl)
    
    if (audioBuffer && audioBuffer.length > 0) {
      // 音频下载成功
      
      try {
        // 上传到云存储
        const fileName = `audio/${lang}/${encodeURIComponent(text)}_${Date.now()}.mp3`
        const uploadResult = await cloud.uploadFile({
          cloudPath: fileName,
          fileContent: audioBuffer
        })
        
        // 保存文件缓存
        await saveAudioCache(text, lang, uploadResult.fileID, 'baidu')
        
        // 返回base64音频
        const base64Data = audioBuffer.toString('base64')
        const audioDataUrl = `data:audio/mpeg;base64,${base64Data}`
        
        return {
          success: true,
          audioUrl: audioDataUrl,
          source: 'baidu-cached',
          cached: false,
          fileId: uploadResult.fileID
        }
      } catch (uploadError) {
        // 上传失败，降级到直连模式
      }
    }
    
    // 保存直连标记，下次直接使用
    // 保存直连标记
    await saveDirectLinkFlag(text, lang, baiduUrl)
    
    return {
      success: true,
      audioUrl: baiduUrl,
      source: 'direct-link-flagged', 
      cached: false,
      note: '已标记为直连模式，下次播放更快'
    }
    
  } catch (error) {
    console.error('❌ 生成音频失败:', error)
    
    // 降级到直接使用百度TTS URL
    const baiduUrl = getBaiduTTSUrl(text, lang)
    return {
      success: true,
      audioUrl: baiduUrl,
      source: 'baidu-tts-fallback',
      cached: false,
      warning: '云存储失败，使用直链'
    }
  }
}

// 获取百度TTS URL（国内网络更稳定）
function getBaiduTTSUrl(text, lang) {
  // 百度TTS语言代码映射
  const langMap = {
    'ja': 'jp',     // 日语
    'en': 'en',     // 英语
    'zh': 'zh'      // 中文
  }
  
  const baiduLang = langMap[lang] || 'jp'
  
  // 百度翻译TTS URL（国内访问速度快）
  return `https://fanyi.baidu.com/gettts?lan=${baiduLang}&text=${encodeURIComponent(text)}&spd=3&source=web`
}

// 获取Google TTS URL（备选方案）
function getGoogleTTSUrl(text, lang) {
  // Google TTS的语言代码映射
  const langMap = {
    'ja': 'ja',     // 日语
    'en': 'en',     // 英语
    'zh': 'zh-CN'  // 中文
  }
  
  const googleLang = langMap[lang] || 'ja'
  
  // Google TTS URL
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${googleLang}&client=tw-ob&q=${encodeURIComponent(text)}`
}

// 获取有道TTS URL（第三备选）
function getYoudaoTTSUrl(text, lang) {
  // 有道词典TTS（支持日语）
  const langMap = {
    'ja': '2',    // 日语
    'en': '1',    // 英语
    'zh': '0'     // 中文
  }
  
  const youdaoType = langMap[lang] || '2'
  
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${youdaoType}`
}

// 检查音频缓存
async function checkAudioCache(text, lang) {
  try {
    const db = cloud.database()
    const result = await db.collection('audio_cache').where({
      text: text,
      lang: lang
    }).orderBy('createTime', 'desc').limit(1).get()
    
    if (result.data && result.data.length > 0) {
      const cached = result.data[0]
      
      // 检查缓存是否过期（7天有效期）
      const now = new Date()
      const cacheTime = new Date(cached.createTime)
      const diffDays = (now - cacheTime) / (1000 * 60 * 60 * 24)
      
      if (diffDays <= 7) {
        // 缓存有效
        return cached
      } else {
        // 缓存已过期
        // 删除过期缓存
        await db.collection('audio_cache').doc(cached._id).remove()
        return null
      }
    }
    
    // 缓存未找到
    return null
  } catch (error) {
    console.error('❌ 检查缓存失败:', error)
    return null
  }
}

// 快速下载音频文件（1秒超时）
async function downloadAudioFileQuick(url) {
  try {
    // 快速下载音频
    
    const https = require('https')
    const http = require('http')
    const { URL } = require('url')
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url)
      const client = urlObj.protocol === 'https:' ? https : http
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        timeout: 1000,  // 1秒超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'audio/mpeg,audio/*,*/*'
        }
      }
      
      const req = client.get(options, (res) => {
        if (res.statusCode !== 200) {
          resolve(null)
          return
        }
        
        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          resolve(buffer.length > 0 ? buffer : null)
        })
        res.on('error', () => resolve(null))
      })
      
      req.on('error', () => resolve(null))
      req.on('timeout', () => {
        req.destroy()
        resolve(null)
      })
    })
  } catch (error) {
    return null
  }
}

// 下载音频文件
async function downloadAudioFile(url) {
  try {
    // 开始下载音频
    
    // 使用云函数的HTTP客户端下载文件
    const https = require('https')
    const http = require('http')
    const { URL } = require('url')
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url)
      const client = urlObj.protocol === 'https:' ? https : http
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        timeout: 3000,  // 减少到3秒
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://fanyi.baidu.com/',
          'Accept': 'audio/mpeg,audio/*,*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
      }
      
      const req = client.get(options, (res) => {
        // 处理重定向
        if (res.statusCode === 301 || res.statusCode === 302) {
          // 跟随重定向
          return downloadAudioFile(res.headers.location).then(resolve).catch(() => resolve(null))
        }
        
        if (res.statusCode !== 200) {
          console.error(`❌ 下载失败，状态码: ${res.statusCode}`)
          console.error('响应头:', res.headers)
          resolve(null)
          return
        }
        
        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          // 下载完成
          
          if (buffer.length === 0) {
            console.error('❌ 下载的文件为空')
            resolve(null)
            return
          }
          
          resolve(buffer)
        })
        res.on('error', err => {
          console.error('❌ 下载过程出错:', err)
          resolve(null)
        })
      })
      
      req.on('error', err => {
        console.error('❌ 请求出错:', err)
        resolve(null)
      })
      
      req.on('timeout', () => {
        console.error('❌ 下载超时')
        req.destroy()
        resolve(null)
      })
    })
  } catch (error) {
    console.error('❌ 下载音频文件失败:', error)
    return null
  }
}

// 删除无效缓存记录
async function deleteCacheRecord(recordId) {
  try {
    const db = cloud.database()
    await db.collection('audio_cache').doc(recordId).remove()
    // 已删除无效缓存记录
  } catch (error) {
    console.error('❌ 删除缓存记录失败:', error)
  }
}

// 保存音频到缓存（修改为保存fileId）
async function saveAudioCache(text, lang, fileId, source) {
  try {
    const db = cloud.database()
    await db.collection('audio_cache').add({
      data: {
        text: text,
        lang: lang,
        fileId: fileId,  // 保存云存储文件ID而不是URL
        source: source,
        directLink: false,  // 标记为文件缓存
        createTime: new Date(),
        updateTime: new Date()
      }
    })
    // 音频缓存保存成功
  } catch (error) {
    console.error('❌ 保存缓存失败:', error)
    // 缓存失败不影响主流程
  }
}

// 保存直连标记
async function saveDirectLinkFlag(text, lang, directUrl) {
  try {
    const db = cloud.database()
    await db.collection('audio_cache').add({
      data: {
        text: text,
        lang: lang,
        directLink: true,   // 标记为直连模式
        directUrl: directUrl, // 保存直连URL
        source: 'direct-link',
        createTime: new Date(),
        updateTime: new Date()
      }
    })
    // 直连标记保存成功
  } catch (error) {
    console.error('❌ 保存直连标记失败:', error)
    // 标记失败不影响主流程
  }
}