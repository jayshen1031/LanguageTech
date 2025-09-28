// 语音对话页面
const app = getApp()
const voiceService = require('../../../utils/voiceService.js')
const aiService = require('../../../utils/ai.js')

Page({
  data: {
    // 对话相关
    messages: [], // 对话消息列表
    currentScene: '日常对话', // 当前场景
    scenes: ['日常对话', '购物', '餐厅', '旅行', '工作'],
    language: 'ja', // 当前语言
    
    // 录音相关
    isRecording: false,
    recordingTime: 0,
    
    // UI状态
    isProcessing: false, // 处理中
    inputMode: 'voice', // 输入模式: voice/text
    textInput: '', // 文字输入内容
    
    // 音频状态
    isPlaying: false,
    currentPlayingId: null
  },

  onLoad(options) {
    // 从参数获取场景和语言
    if (options.scene) {
      this.setData({ currentScene: options.scene })
    }
    if (options.lang) {
      this.setData({ language: options.lang })
    }
    
    // 初始化语音服务
    this.initVoiceService()
    
    // 添加欢迎消息
    this.addSystemMessage()
  },

  // 初始化语音服务
  async initVoiceService() {
    wx.showLoading({ title: '初始化中...' })
    
    try {
      const result = await voiceService.init()
      if (!result) {
        wx.showToast({
          title: '语音服务初始化失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('初始化失败:', error)
    } finally {
      wx.hideLoading()
    }
  },

  // 添加系统欢迎消息
  addSystemMessage() {
    const welcomeMessages = {
      '日常对话': '你好！让我们开始练习日常对话吧。你可以和我聊任何话题。',
      '购物': '欢迎来到商店！需要买什么吗？',
      '餐厅': '欢迎光临！请问几位用餐？',
      '旅行': '你好！需要什么旅行帮助吗？',
      '工作': '早上好！今天有什么工作安排吗？'
    }
    
    const message = {
      id: Date.now(),
      type: 'ai',
      text: welcomeMessages[this.data.currentScene] || '你好！',
      time: this.formatTime(new Date()),
      audioUrl: null
    }
    
    this.setData({
      messages: [message]
    })
    
    // 播放欢迎语音
    this.playMessageAudio(message)
  },

  // 录音状态变化处理
  onRecordStart() {
    // 开始录音
    this.setData({ isRecording: true })
  },

  onRecordStop(e) {
    // 录音结束
    this.setData({ isRecording: false })
    
    // 处理录音文件
    if (e.detail.tempFilePath) {
      this.processVoiceInput(e.detail.tempFilePath)
    }
  },

  onRecordError(e) {
    console.error('录音错误:', e.detail)
    this.setData({ isRecording: false })
    
    wx.showToast({
      title: '录音失败，请重试',
      icon: 'none'
    })
  },

  // 处理语音输入
  async processVoiceInput(tempFilePath) {
    this.setData({ isProcessing: true })
    
    try {
      // 语音对话流程
      const result = await voiceService.voiceConversation(tempFilePath, {
        lang: this.data.language,
        onRecognized: (text, isMock = false) => {
          // 添加用户消息
          this.addUserMessage(text, isMock)
        },
        onResponse: async (userText) => {
          // 获取AI回复
          const prompt = this.buildPrompt(userText)
          const response = await aiService.sendMessage(prompt)
          
          // 添加AI消息
          this.addAIMessage(response)
          
          return response
        },
        onAudioReady: (audioResult) => {
          // 更新消息的音频URL
          if (audioResult.success && audioResult.audioUrl) {
            const messages = this.data.messages
            const lastMessage = messages[messages.length - 1]
            if (lastMessage && lastMessage.type === 'ai') {
              lastMessage.audioUrl = audioResult.audioUrl
              this.setData({ messages })
            }
          }
        }
      })
      
      // 对话完成
      
    } catch (error) {
      console.error('处理语音失败:', error)
      wx.showToast({
        title: '处理失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isProcessing: false })
    }
  },

  // 构建AI提示词
  buildPrompt(userText) {
    const scenePrompts = {
      '日常对话': `你是一个友好的对话伙伴。请用${this.data.language === 'ja' ? '日语' : '英语'}自然地回复。`,
      '购物': `你是商店店员。顾客说："${userText}"。请用${this.data.language === 'ja' ? '日语' : '英语'}友好地回应。`,
      '餐厅': `你是餐厅服务员。顾客说："${userText}"。请用${this.data.language === 'ja' ? '日语' : '英语'}礼貌地回应。`,
      '旅行': `你是旅行顾问。游客说："${userText}"。请用${this.data.language === 'ja' ? '日语' : '英语'}提供帮助。`,
      '工作': `你是同事。同事说："${userText}"。请用${this.data.language === 'ja' ? '日语' : '英语'}专业地回应。`
    }
    
    return scenePrompts[this.data.currentScene] + '\n用户: ' + userText
  },

  // 添加用户消息
  addUserMessage(text, isMock = false) {
    const message = {
      id: Date.now(),
      type: 'user',
      text: text,
      time: this.formatTime(new Date()),
      isMock: isMock // 标记是否为模拟数据
    }
    
    this.setData({
      messages: [...this.data.messages, message]
    })
    
    // 如果是模拟数据，显示提示
    if (isMock) {
      wx.showToast({
        title: '开发工具模拟数据',
        icon: 'none',
        duration: 1500
      })
    }
    
    // 滚动到底部
    this.scrollToBottom()
  },

  // 添加AI消息
  addAIMessage(text) {
    const message = {
      id: Date.now(),
      type: 'ai',
      text: text,
      time: this.formatTime(new Date()),
      audioUrl: null
    }
    
    this.setData({
      messages: [...this.data.messages, message]
    })
    
    // 生成并播放语音
    this.playMessageAudio(message)
    
    // 滚动到底部
    this.scrollToBottom()
  },

  // 播放消息音频
  async playMessageAudio(message) {
    if (message.type !== 'ai') return
    
    try {
      const result = await voiceService.textToSpeech(message.text, {
        lang: this.data.language,
        autoPlay: true
      })
      
      // 检查是否在开发者工具环境中被禁用
      if (result.disabled) {
        console.log('开发者工具环境：跳过音频播放')
        return
      }
      
      // 更新音频URL
      if (result.success && result.audioUrl) {
        const messages = this.data.messages
        const targetMessage = messages.find(m => m.id === message.id)
        if (targetMessage) {
          targetMessage.audioUrl = result.audioUrl
          this.setData({ messages })
        }
      }
    } catch (error) {
      console.error('播放音频失败:', error)
    }
  },

  // 切换输入模式
  toggleInputMode() {
    this.setData({
      inputMode: this.data.inputMode === 'voice' ? 'text' : 'voice'
    })
  },

  // 文字输入变化
  onTextInput(e) {
    this.setData({
      textInput: e.detail.value
    })
  },

  // 发送文字消息
  async sendTextMessage() {
    const text = this.data.textInput.trim()
    if (!text) return
    
    // 清空输入框
    this.setData({
      textInput: '',
      isProcessing: true
    })
    
    // 添加用户消息
    this.addUserMessage(text)
    
    try {
      // 获取AI回复
      const prompt = this.buildPrompt(text)
      const response = await aiService.sendMessage(prompt)
      
      // 添加AI消息
      this.addAIMessage(response)
      
    } catch (error) {
      console.error('发送消息失败:', error)
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isProcessing: false })
    }
  },

  // 重播音频
  replayAudio(e) {
    const { id } = e.currentTarget.dataset
    const message = this.data.messages.find(m => m.id === parseInt(id))
    
    if (message && message.audioUrl) {
      voiceService.playAudio(message.audioUrl).catch(err => {
        console.error('重播失败:', err)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      })
    }
  },

  // 切换场景
  onSceneChange(e) {
    const scene = this.data.scenes[e.detail.value]
    this.setData({
      currentScene: scene,
      messages: []
    })
    
    // 添加新场景的欢迎消息
    this.addSystemMessage()
  },

  // 切换语言
  switchLanguage() {
    const lang = this.data.language === 'ja' ? 'en' : 'ja'
    this.setData({
      language: lang,
      messages: []
    })
    
    // 重新添加欢迎消息
    this.addSystemMessage()
    
    wx.showToast({
      title: `切换到${lang === 'ja' ? '日语' : '英语'}`,
      icon: 'none'
    })
  },

  // 清空对话
  clearMessages() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有对话吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [] })
          this.addSystemMessage()
        }
      }
    })
  },

  // 滚动到底部
  scrollToBottom() {
    wx.nextTick(() => {
      wx.pageScrollTo({
        scrollTop: 9999,
        duration: 300
      })
    })
  },

  // 格式化时间
  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  onUnload() {
    // 清理资源
    voiceService.clearCache()
  }
})