// 语音服务封装（整合TTS和ASR）
const audioService = require('./audioMCP.js')

class VoiceService {
  constructor() {
    this.isInitialized = false
    this.tempFileCache = new Map() // 临时文件缓存
  }

  // 初始化服务
  async init() {
    if (this.isInitialized) return true
    
    try {
      // 检查音频服务健康状态
      const health = await audioService.checkHealth()
      this.isInitialized = health
      // console.log('🎤 语音服务初始化:', health ? '成功' : '失败')
      return health
    } catch (error) {
      console.error('语音服务初始化失败:', error)
      return false
    }
  }

  // 文字转语音（TTS）
  async textToSpeech(text, options = {}) {
    const { 
      lang = 'ja',
      voice = null,
      autoPlay = false 
    } = options
    
    try {
      // console.log(`🔊 TTS: "${text}" (${lang})`)
      
      // 检测运行环境
      const systemInfo = wx.getSystemInfoSync()
      const isDevTool = systemInfo.platform === 'devtools'
      
      if (isDevTool) {
        // 开发者工具环境 - 禁用音频播放
        console.warn('开发者工具环境：音频播放功能受限')
        
        return {
          success: true,
          audioUrl: null,
          alternatives: [],
          cached: false,
          disabled: true // 标记为禁用状态
        }
      }
      
      // 生成音频
      const result = await audioService.generateAudio(text, lang, voice)
      
      // 自动播放
      if (autoPlay && result.audioUrl) {
        await this.playAudio(result.audioUrl, result.alternatives)
      }
      
      return {
        success: true,
        audioUrl: result.audioUrl,
        alternatives: result.alternatives || [],
        cached: result.cached || false
      }
      
    } catch (error) {
      console.error('TTS失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 语音转文字（ASR）
  async speechToText(tempFilePath, options = {}) {
    const { 
      lang = 'ja',
      format = 'mp3' 
    } = options
    
    try {
      // console.log(`🎙️ ASR: ${tempFilePath} (${lang})`)
      
      // 检测运行环境
      const systemInfo = wx.getSystemInfoSync()
      const isDevTool = systemInfo.platform === 'devtools'
      
      if (isDevTool) {
        // 开发者工具环境 - 使用模拟数据
        console.warn('开发者工具环境：语音识别功能受限，返回模拟数据')
        
        // 根据语言返回不同的模拟文本
        const mockTexts = {
          'ja': 'こんにちは、元気ですか？',
          'zh': '你好，最近怎么样？',
          'en': 'Hello, how are you?'
        }
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        return {
          success: true,
          text: mockTexts[lang] || mockTexts['ja'],
          confidence: 0.85,
          mock: true // 标记为模拟数据
        }
      }
      
      // 1. 先上传文件到云存储
      const fileID = await this.uploadAudioFile(tempFilePath)
      
      // 2. 调用ASR云函数
      const result = await wx.cloud.callFunction({
        name: 'asr-service',
        data: {
          fileID: fileID,
          format: format,
          lang: lang
        }
      })
      
      // 3. 清理临时文件
      this.cleanupTempFile(fileID)
      
      if (result.result && result.result.success) {
        // console.log('✅ ASR识别成功:', result.result.text)
        return {
          success: true,
          text: result.result.text,
          confidence: result.result.confidence
        }
      } else {
        throw new Error(result.result?.error || 'ASR识别失败')
      }
      
    } catch (error) {
      console.error('ASR失败:', error)
      
      // 降级提示
      wx.showToast({
        title: '语音识别失败，请重试',
        icon: 'none'
      })
      
      return {
        success: false,
        error: error.message,
        fallback: true
      }
    }
  }

  // 上传音频文件到云存储
  async uploadAudioFile(tempFilePath) {
    try {
      const timestamp = Date.now()
      const cloudPath = `voice/asr_${timestamp}.mp3`
      
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      })
      
      // console.log('✅ 音频文件上传成功:', uploadResult.fileID)
      
      // 缓存文件ID，用于后续清理
      this.tempFileCache.set(uploadResult.fileID, {
        uploadTime: timestamp,
        localPath: tempFilePath
      })
      
      return uploadResult.fileID
      
    } catch (error) {
      console.error('上传音频文件失败:', error)
      throw new Error('无法上传音频文件')
    }
  }

  // 清理临时文件
  async cleanupTempFile(fileID) {
    try {
      // 延迟清理，避免影响处理
      setTimeout(async () => {
        await wx.cloud.deleteFile({
          fileList: [fileID]
        })
        this.tempFileCache.delete(fileID)
        // console.log('🗑️ 临时文件已清理:', fileID)
      }, 60000) // 60秒后清理
      
    } catch (error) {
      console.warn('清理临时文件失败:', error)
    }
  }

  // 播放音频
  async playAudio(audioUrl, alternatives = []) {
    return new Promise((resolve, reject) => {
      const context = audioService.playAudio(audioUrl, {
        onPlay: () => {
          // console.log('🔊 开始播放音频')
          resolve({ success: true })
        },
        onError: (err) => {
          console.error('❌ 播放失败:', err)
          reject(err)
        },
        onEnded: () => {
          // console.log('✅ 播放完成')
        }
      }, alternatives)
      
      if (!context) {
        reject(new Error('无法创建音频上下文'))
      }
    })
  }

  // 语音对话流程
  async voiceConversation(tempFilePath, options = {}) {
    const {
      lang = 'ja',
      onRecognized = null,
      onResponse = null,
      onAudioReady = null
    } = options
    
    try {
      // 1. 语音识别
      const asrResult = await this.speechToText(tempFilePath, { lang })
      
      if (!asrResult.success) {
        throw new Error('语音识别失败')
      }
      
      const userText = asrResult.text
      // console.log('👤 用户说:', userText)
      
      // 触发识别完成回调
      if (onRecognized) {
        onRecognized(userText, asrResult.mock)
      }
      
      // 2. 获取AI回复（需要外部传入）
      if (onResponse) {
        const aiResponse = await onResponse(userText)
        // console.log('🤖 AI回复:', aiResponse)
        
        // 3. 生成回复语音
        const ttsResult = await this.textToSpeech(aiResponse, {
          lang: lang,
          autoPlay: true
        })
        
        // 触发音频准备完成回调
        if (onAudioReady) {
          onAudioReady(ttsResult)
        }
        
        return {
          success: true,
          userText: userText,
          aiResponse: aiResponse,
          audioUrl: ttsResult.audioUrl
        }
      }
      
      return {
        success: true,
        userText: userText
      }
      
    } catch (error) {
      console.error('语音对话失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 批量预加载音频
  async preloadAudioList(textList, lang = 'ja') {
    try {
      await audioService.batchPreload(textList, lang)
      // console.log('✅ 批量预加载完成')
    } catch (error) {
      console.warn('批量预加载失败:', error)
    }
  }

  // 获取支持的语言和声音
  async getSupportedVoices() {
    return await audioService.getVoices()
  }

  // 清理所有缓存
  clearCache() {
    this.tempFileCache.clear()
    // audioService的缓存由其自行管理
    // console.log('🗑️ 缓存已清理')
  }
}

// 导出单例
module.exports = new VoiceService()