// 日语解析工具页面
const { azureGPT4o } = require('../../utils/ai')

Page({
  data: {
    inputText: '', // 输入的文本
    imageUrl: '', // 上传的图片
    isAnalyzing: false, // 是否正在分析
    analysisResult: [], // 解析结果
    showResult: false, // 是否显示结果
    inputMethod: 'text' // 输入方式：text或image
  },

  onLoad() {
    // 页面加载
  },

  // 切换输入方式
  switchInputMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({
      inputMethod: method,
      inputText: '',
      imageUrl: ''
    })
  },

  // 输入文本变化
  onTextInput(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.setData({
          imageUrl: tempFilePath,
          inputText: '' // 清空文本，因为混元AI会直接识别图片
        })
        
        wx.showToast({
          title: '图片已选择',
          icon: 'success',
          duration: 1500
        })
      }
    })
  },

  // OCR识别
  async performOCR(imagePath) {
    wx.showLoading({
      title: '识别中...'
    })

    try {
      // 使用微信OCR插件或云函数进行识别
      // 这里先模拟一个OCR结果
      const ocrText = await this.callOCRService(imagePath)
      
      this.setData({
        inputText: ocrText
      })
      
      wx.hideLoading()
      wx.showToast({
        title: '识别完成',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '识别失败',
        icon: 'none'
      })
    }
  },

  // 调用OCR服务
  async callOCRService(imagePath) {
    try {
      // 先上传图片到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `ocr/temp_${Date.now()}.jpg`,
        filePath: imagePath
      })
      
      // 调用OCR云函数
      const res = await wx.cloud.callFunction({
        name: 'ocr-service',
        data: {
          imageUrl: uploadRes.fileID,
          languageType: 'jap' // 日语（腾讯云OCR使用小写）
        }
      })
      
      if (res.result.success) {
        // 删除临时文件
        wx.cloud.deleteFile({
          fileList: [uploadRes.fileID]
        })
        
        return res.result.data.text || ''
      } else {
        console.error('OCR返回错误:', res.result)
        throw new Error(res.result.error || 'OCR识别失败')
      }
    } catch (error) {
      console.error('OCR服务调用失败:', error)
      
      // 提示用户手动输入
      wx.showToast({
        title: 'OCR识别失败，请手动输入文本',
        icon: 'none',
        duration: 3000
      })
      
      // 返回空字符串，让用户手动输入
      return ''
    }
  },

  // 开始解析
  async startAnalysis() {
    const { inputText, inputMethod, imageUrl } = this.data
    
    // 验证输入
    if (inputMethod === 'text' && !inputText.trim()) {
      wx.showToast({
        title: '请输入日语文本',
        icon: 'none'
      })
      return
    }
    
    if (inputMethod === 'image' && !imageUrl) {
      wx.showToast({
        title: '请上传图片',
        icon: 'none'
      })
      return
    }

    this.setData({
      isAnalyzing: true,
      showResult: false
    })

    try {
      let result
      
      if (inputMethod === 'image') {
        // 图片模式：直接使用Azure GPT-4o识别并解析
        wx.showLoading({ title: '识别并解析中...' })
        
        // 上传图片到云存储
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `japanese-parser/temp_${Date.now()}.jpg`,
          filePath: imageUrl
        })
        
        // 调用Azure GPT-4o的grammar接口（支持图片识别）
        const res = await wx.cloud.callFunction({
          name: 'azure-gpt4o',
          data: {
            action: 'grammar',
            imageUrl: uploadRes.fileID
          }
        })
        
        wx.hideLoading()
        
        // 删除临时文件
        wx.cloud.deleteFile({
          fileList: [uploadRes.fileID]
        })
        
        if (res.result.success) {
          result = res.result.data.analysis
        } else {
          throw new Error(res.result.error || 'AI解析失败')
        }
      } else {
        // 文本模式：分段处理以避免超时
        const sentences = inputText.split(/[。！？]/).filter(s => s.trim())
        
        if (sentences.length > 3) {
          // 句子太多，使用简化分析
          wx.showLoading({ title: '快速分析中...' })
          
          const simplifiedPrompt = `请简要分析以下日语文本的主要语法点和词汇：\n${inputText}\n\n输出格式：\n1. 主要句子（原文+翻译）\n2. 关键语法点\n3. 重点词汇`
          
          result = await azureGPT4o.simpleChat(simplifiedPrompt)
        } else {
          // 正常详细分析
          const prompt = this.buildAnalysisPrompt(inputText)
          result = await azureGPT4o.simpleChat(prompt)
        }
      }
      
      // 解析AI返回的结果
      const analysisResult = this.parseAIResponse(result)
      
      this.setData({
        analysisResult,
        showResult: true,
        isAnalyzing: false
      })
      
    } catch (error) {
      console.error('解析失败:', error)
      wx.showToast({
        title: '解析失败，请重试',
        icon: 'none'
      })
      this.setData({
        isAnalyzing: false
      })
    }
  },

  // 构建解析提示词
  buildAnalysisPrompt(text) {
    return `请将以下日语文本逐句进行结构化解析，严格按照以下格式输出：

输入文本：${text}

输出要求：
1. 将文本按句子分割（以。！？等为分隔符）
2. 每个句子都要包含以下所有模块内容：
   - 日文原文
   - 罗马音（完整标注）
   - 中文翻译
   - 精简句子结构（抽象化，如：主语+谓语+宾语）
   - 句子结构分析（详细列出每个成分）
   - 语法点说明（详细说明所有语法点，包括助词用法、动词变形等）
   - 词汇明细表（每个词单独列出）

输出格式示例：
---
📘 第1句
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语 + 主题助词 + 表语 + 系动词
【句子结构分析】
• 私（わたし）- 主语，第一人称代词
• は - 主题助词，标记主题
• 学生（がくせい）- 表语，名词
• です - 系动词，表示"是"的敬语形式
【语法点说明】
• は：主题助词，用于标记句子的主题，读作"wa"
• です：系动词，名词句的敬语形式，相当于"だ"的敬语
• 名词+です：表示"是..."的基本句型
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生

请严格按照以上格式解析每一个句子，不要省略任何模块。`
  },

  // 解析AI返回的结果
  parseAIResponse(response) {
    // 将AI返回的文本按句子分割并结构化
    const sentences = []
    const sections = response.split('---').filter(s => s.trim())
    
    sections.forEach((section, index) => {
      if (section.includes('📘')) {
        const sentenceData = {
          index: index + 1,
          originalText: this.extractContent(section, '【日文原文】', '【'),
          romaji: this.extractContent(section, '【罗马音】', '【'),
          translation: this.extractContent(section, '【中文翻译】', '【'),
          structure: this.extractContent(section, '【精简结构】', '【'),
          analysis: this.extractContent(section, '【句子结构分析】', '【'),
          grammar: this.extractContent(section, '【语法点说明】', '【'),
          vocabulary: this.extractVocabulary(section)
        }
        sentences.push(sentenceData)
      }
    })
    
    return sentences
  },

  // 提取内容
  extractContent(text, startMarker, endMarker) {
    const startIndex = text.indexOf(startMarker)
    if (startIndex === -1) return ''
    
    const contentStart = startIndex + startMarker.length
    const endIndex = text.indexOf(endMarker, contentStart)
    
    if (endIndex === -1) {
      return text.substring(contentStart).trim()
    }
    
    return text.substring(contentStart, endIndex).trim()
  },

  // 提取词汇表
  extractVocabulary(text) {
    const vocabSection = this.extractContent(text, '【词汇明细表】', '---')
    const lines = vocabSection.split('\n').filter(line => line.includes('｜'))
    
    return lines.map(line => {
      const parts = line.split('｜').map(p => p.trim())
      return {
        japanese: parts[0] || '',
        romaji: parts[1] || '',
        chinese: parts[2] || ''
      }
    })
  },

  // 复制解析结果
  copyResult() {
    const { analysisResult } = this.data
    let copyText = ''
    
    analysisResult.forEach(sentence => {
      copyText += `---\n📘 第${sentence.index}句\n`
      copyText += `【日文原文】${sentence.originalText}\n`
      copyText += `【罗马音】${sentence.romaji}\n`
      copyText += `【中文翻译】${sentence.translation}\n`
      copyText += `【精简结构】${sentence.structure}\n`
      copyText += `【句子结构分析】\n${sentence.analysis}\n`
      copyText += `【语法点说明】\n${sentence.grammar}\n`
      copyText += `【词汇明细表】\n`
      sentence.vocabulary.forEach(vocab => {
        copyText += `${vocab.japanese}｜${vocab.romaji}｜${vocab.chinese}\n`
      })
      copyText += '\n'
    })
    
    wx.setClipboardData({
      data: copyText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  },

  // 保存到生词本
  saveToWordbook(e) {
    const { sentence } = e.currentTarget.dataset
    
    // 将句子中的词汇添加到生词本
    const words = sentence.vocabulary.map(vocab => ({
      word: vocab.japanese,
      reading: vocab.romaji,
      meaning: vocab.chinese,
      example: sentence.originalText,
      source: 'parser',
      createTime: new Date()
    }))
    
    // 保存到本地存储（实际应该保存到数据库）
    const wordbook = wx.getStorageSync('wordbook') || []
    wordbook.push(...words)
    wx.setStorageSync('wordbook', wordbook)
    
    wx.showToast({
      title: '已添加到生词本',
      icon: 'success'
    })
  },

  // 清空内容
  clearContent() {
    this.setData({
      inputText: '',
      imageUrl: '',
      analysisResult: [],
      showResult: false
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '日语解析工具 - 语伴君',
      path: '/pages/japanese-parser/japanese-parser'
    }
  }
})