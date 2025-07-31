// AI语法讲解页面
const { hunyuanAI } = require('../../utils/ai')
// const tcbAI = require('../../utils/tcbAI')
const tcbAI = {
  analyzeGrammar: require('../../utils/tcbAI').analyzeGrammar,
  generateExamples: require('../../utils/tcbAI').generateExamples
}

Page({
  data: {
    inputSentence: '',
    analysisResult: null,
    isAnalyzing: false,
    examples: [],
    aiProvider: 'tcb' // 'openai' 或 'hunyuan' 或 'tcb'
  },

  onLoad(options) {
    // 如果从其他页面传入句子
    if (options.sentence) {
      this.setData({
        inputSentence: decodeURIComponent(options.sentence)
      })
      // 自动分析
      this.analyzeSentence()
    }
  },

  // 输入句子
  onInputChange(e) {
    this.setData({
      inputSentence: e.detail.value
    })
  },

  // 分析句子语法
  async analyzeSentence() {
    const { inputSentence, aiProvider } = this.data
    
    if (!inputSentence.trim()) {
      wx.showToast({
        title: '请输入日语句子',
        icon: 'none'
      })
      return
    }

    this.setData({
      isAnalyzing: true,
      analysisResult: null
    })

    try {
      let result
      
      if (aiProvider === 'tcb') {
        // 使用腾讯云AI SDK
        console.log('🤖 使用腾讯云AI SDK分析语法...')
        const analysisText = await tcbAI.analyzeGrammar(inputSentence, 'ja')
        
        // 格式化结果
        this.setData({
          analysisResult: this.formatTcbResult(analysisText, inputSentence)
        })
      } else if (aiProvider === 'hunyuan') {
        // 使用腾讯混元
        console.log('🤖 使用腾讯混元分析语法...')
        result = await hunyuanAI.analyzeGrammar(inputSentence)
        
        // 格式化结果
        this.setData({
          analysisResult: this.formatHunyuanResult(result)
        })
      } else {
        // 使用OpenAI（保留原有逻辑）
        console.log('🤖 使用OpenAI分析语法...')
        // 这里调用原有的OpenAI接口
      }

      wx.showToast({
        title: '分析完成',
        icon: 'success'
      })

    } catch (error) {
      console.error('语法分析失败:', error)
      wx.showToast({
        title: '分析失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({
        isAnalyzing: false
      })
    }
  },

  // 格式化腾讯云AI的返回结果
  formatTcbResult(analysisText, sentence) {
    const sections = {
      breakdown: '',
      grammar: '',
      vocabulary: '',
      translation: ''
    }

    // 解析AI返回的文本
    const lines = analysisText.split('\n')
    let currentSection = ''
    
    lines.forEach(line => {
      if (line.includes('词性分析') || line.includes('词汇分解')) {
        currentSection = 'breakdown'
      } else if (line.includes('语法结构') || line.includes('语法分析')) {
        currentSection = 'grammar'
      } else if (line.includes('词汇说明') || line.includes('单词解释')) {
        currentSection = 'vocabulary'
      } else if (line.includes('整句翻译') || line.includes('中文翻译')) {
        currentSection = 'translation'
      } else if (line.trim() && currentSection) {
        sections[currentSection] += line + '\n'
      }
    })

    return {
      sentence: sentence,
      sections: sections,
      rawAnalysis: analysisText
    }
  },

  // 格式化腾讯混元的返回结果
  formatHunyuanResult(result) {
    // 将混元返回的文本解析为结构化数据
    const analysis = result.analysis || ''
    const sections = {
      breakdown: '',
      grammar: '',
      vocabulary: '',
      translation: ''
    }

    // 简单的文本解析（实际使用时可能需要更复杂的解析逻辑）
    const parts = analysis.split(/\d+\.\s+/)
    if (parts.length > 1) {
      sections.breakdown = parts[1] || ''
      sections.grammar = parts[2] || ''
      sections.vocabulary = parts[3] || ''
      sections.translation = parts[4] || ''
    } else {
      // 如果没有按格式返回，直接显示原文
      sections.breakdown = analysis
    }

    return {
      sentence: result.sentence,
      sections: sections,
      rawAnalysis: analysis
    }
  },

  // 生成例句
  async generateExamples() {
    const { inputSentence, aiProvider } = this.data
    
    if (!inputSentence.trim()) {
      wx.showToast({
        title: '请先输入句子',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '生成例句中...'
    })

    try {
      // 从句子中提取主要词汇（简单实现）
      const mainWord = inputSentence.split(/[は、。]/)[0]
      
      if (aiProvider === 'tcb') {
        // 使用腾讯云AI生成例句
        const examples = await tcbAI.generateExamples(mainWord, 3)
        this.setData({ examples })
      } else if (aiProvider === 'hunyuan') {
        const result = await hunyuanAI.generateExamples(mainWord, 3)
        
        // 解析例句（这里需要根据实际返回格式调整）
        const examples = this.parseExamples(result.examples)
        this.setData({ examples })
      }

      wx.hideLoading()
    } catch (error) {
      console.error('生成例句失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      })
    }
  },

  // 解析例句文本
  parseExamples(examplesText) {
    // 简单的例句解析逻辑
    const examples = []
    const lines = examplesText.split('\n')
    let currentExample = {}

    lines.forEach(line => {
      if (line.includes('例句')) {
        if (currentExample.sentence) {
          examples.push(currentExample)
        }
        currentExample = {
          sentence: line.replace(/例句\d+：/, '').trim()
        }
      } else if (line.includes('读音：')) {
        currentExample.reading = line.replace('读音：', '').trim()
      } else if (line.includes('翻译：')) {
        currentExample.translation = line.replace('翻译：', '').trim()
      }
    })

    if (currentExample.sentence) {
      examples.push(currentExample)
    }

    return examples
  },

  // 切换AI提供商
  switchAIProvider(e) {
    const provider = e.currentTarget.dataset.provider
    this.setData({
      aiProvider: provider,
      analysisResult: null,
      examples: []
    })
    
    let providerName = ''
    switch(provider) {
      case 'tcb':
        providerName = '腾讯云AI'
        break
      case 'hunyuan':
        providerName = '腾讯混元'
        break
      case 'openai':
        providerName = 'OpenAI'
        break
    }
    
    wx.showToast({
      title: `切换到${providerName}`,
      icon: 'none'
    })
  },

  // 复制分析结果
  copyAnalysis() {
    const { analysisResult } = this.data
    if (!analysisResult) return

    wx.setClipboardData({
      data: analysisResult.rawAnalysis || '',
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: 'AI语法讲解 - 语伴君',
      path: '/pages/ai-grammar/ai-grammar'
    }
  }
})