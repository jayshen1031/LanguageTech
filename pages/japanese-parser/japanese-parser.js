// 日语解析工具页面
const { azureGPT4o } = require('../../utils/ai')

Page({
  data: {
    inputText: '', // 输入的文本
    imageUrl: '', // 上传的图片
    isAnalyzing: false, // 是否正在分析
    analysisResult: [], // 解析结果
    showResult: false, // 是否显示结果
    inputMethod: 'text', // 输入方式：text或image
    // 历史记录相关功能已移至独立页面
  },

  onLoad() {
    // 页面加载时初始化云数据库
    this.db = wx.cloud.database()
  },


  // 生成友好的标题摘要
  generateTitle(data) {
    if (data.inputMethod === 'image') {
      return '图片解析'
    }
    
    if (!data.analysisResult || data.analysisResult.length === 0) {
      return data.inputText ? data.inputText.substring(0, 15) + '...' : '解析记录'
    }
    
    const sentences = data.analysisResult
    
    // 如果只有一句话，直接用日文原文
    if (sentences.length === 1) {
      const text = sentences[0].originalText || data.inputText || '解析记录'
      return text.length > 20 ? text.substring(0, 20) + '...' : text
    }
    
    // 多句话，取第一句 + 显示总数
    const firstSentence = sentences[0].originalText || ''
    if (firstSentence.length > 15) {
      return firstSentence.substring(0, 15) + `...等${sentences.length}句`
    } else {
      return `${firstSentence} 等${sentences.length}句`
    }
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
          
          // 从AI响应中提取识别出的原始文本
          // AI会返回包含日文原文的解析结果
          const extractedText = this.extractOriginalTextFromAnalysis(result)
          if (extractedText) {
            // 保存提取的原始文本，用于后续存储
            this.setData({ extractedImageText: extractedText })
          }
        } else {
          throw new Error(res.result.error || 'AI解析失败')
        }
      } else {
        // 文本模式
        const lines = inputText.split('\n').filter(line => line.trim())
        console.log(`输入文本共${lines.length}行`)
        
        // 检查是否需要分批处理：行数超过8行 或 总字符数超过800字符
        const totalChars = inputText.length
        const needsBatch = lines.length > 8 || totalChars > 800
        
        // 如果是歌词格式（包含假名标注），使用分批处理
        if (inputText.includes('（') || inputText.includes('(')) {
          console.log('检测到歌词格式，使用分批处理')
          await this.batchProcessLyrics(inputText)
          return
        }
        
        if (needsBatch) {
          console.log(`文本较长，使用分批处理模式：${lines.length}行，${totalChars}字符`)
          wx.showLoading({ title: `分批解析中(${totalChars}字符)...` })
          
          const res = await wx.cloud.callFunction({
            name: 'azure-gpt4o-batch',
            data: {
              sentence: inputText
            }
          })
          
          if (res.result.success) {
            result = res.result.data.analysis
            console.log(`分批处理完成，共${res.result.data.batches}批，${res.result.data.totalLines}行`)
          } else {
            throw new Error(res.result.error || '分批处理失败')
          }
        } else {
          // 行数较少，使用快速模式
          console.log('使用azure-gpt4o-fast进行全文语法分析')
          wx.showLoading({ title: '全文解析中...' })
          
          const res = await wx.cloud.callFunction({
            name: 'azure-gpt4o-fast',
            data: {
              action: 'grammar',
              sentence: inputText
            }
          })
          
          if (res.result.success) {
            result = res.result.data.analysis
            
            // 显示调试信息
            if (res.result.data.debug) {
              const debug = res.result.data.debug
              console.log('=== 解析调试信息 ===')
              console.log('输入行数:', debug.inputLines)
              console.log('输出长度:', debug.outputLength)
              console.log('Token使用:', debug.tokenUsage)
              console.log('解析句子数:', debug.parsedSentences)
              
              // 如果解析数量不匹配，显示警告
              if (debug.parsedSentences < debug.inputLines) {
                console.warn(`警告：输入${debug.inputLines}行，但只解析了${debug.parsedSentences}句`)
              }
            }
          } else {
            // 如果快速函数失败，回退到简单函数
            console.log('回退到simpleChat')
            const prompt = this.buildAnalysisPrompt(inputText)
            result = await azureGPT4o.simpleChat(prompt)
          }
        }
      }
      
      // 解析AI返回的结果
      console.log('AI返回的原始结果长度:', result ? result.length : 0)
      console.log('AI返回的原始结果前500字符:', result ? result.substring(0, 500) : 'null')
      
      // 确保result是字符串
      if (typeof result !== 'string') {
        console.error('AI返回的不是字符串:', typeof result)
        result = JSON.stringify(result)
      }
      
      // 过滤掉AI可能生成的确认提示
      result = result.replace(/由于.*文本.*长.*确认.*继续.*?/g, '')
                     .replace(/文本太长.*确认继续.*?/g, '')
                     .replace(/是否继续.*?/g, '')
                     .replace(/\(文本未完.*?\)/g, '')
      
      // 根据输入类型解析响应
      // 对于图片模式，默认使用句子解析；对于文本模式，检测输入类型
      const inputType = inputMethod === 'image' ? 'sentence' : this.detectInputType(inputText);
      const analysisResult = inputType === 'word' || inputType === 'wordlist' 
        ? this.parseWordResponse(result) 
        : this.parseSentenceResponse(result);
      console.log('解析后的结果:', analysisResult)
      
      // 如果解析结果为空，显示原始结果
      if (!analysisResult || analysisResult.length === 0) {
        console.warn('解析结果为空，显示原始结果')
        // 创建一个默认的显示格式
        const defaultResult = [{
          index: 1,
          originalText: '解析失败',
          romaji: '',
          translation: '无法解析AI返回的结果',
          structure: '',
          analysis: result,  // 显示完整的原始结果
          grammar: '请检查控制台查看完整响应',
          vocabulary: []
        }]
        
        this.setData({
          analysisResult: defaultResult,
          showResult: true,
          isAnalyzing: false
        })
      } else {
        this.setData({
          analysisResult,
          showResult: true,
          isAnalyzing: false
        })
        
        // 注释掉自动保存，改为手动保存
        // this.saveParseResult({
        //   inputText: inputMethod === 'text' ? inputText : (this.data.extractedImageText || '图片识别'),
        //   inputMethod,
        //   imageUrl: inputMethod === 'image' ? this.data.imageUrl : '', // 保存图片URL
        //   extractedText: inputMethod === 'image' ? this.data.extractedImageText : '', // 保存从图片提取的文本
        //   analysisResult
        // })
        
        console.log('解析完成，不自动保存到历史')
      }
      
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

  // 检测输入类型（单词还是句子）
  detectInputType(text) {
    // 去除空格和换行
    const cleanText = text.trim();
    
    // 判断是否为句子的标准：
    // 1. 包含句号、问号、感叹号
    // 2. 长度超过15个字符
    // 3. 包含助词（は、が、を、に、で、と、も等）
    // 4. 包含动词词尾（る、た、ます、です等）
    
    const sentenceMarkers = /[。！？、]/;
    const particles = /[はがをにでとも]/;
    const verbEndings = /[るたますです]$/;
    
    if (sentenceMarkers.test(cleanText) || 
        cleanText.length > 15 || 
        particles.test(cleanText) ||
        verbEndings.test(cleanText)) {
      return 'sentence';
    }
    
    // 如果包含多个换行分隔的短词，判断为词汇列表
    const lines = cleanText.split(/\n/).filter(line => line.trim());
    if (lines.length > 1 && lines.every(line => line.length < 10)) {
      return 'wordlist';
    }
    
    return 'word';
  },

  // 从AI解析结果中提取原始文本
  extractOriginalTextFromAnalysis(analysisText) {
    if (!analysisText) return ''
    
    // 尝试提取所有【日文原文】后面的内容
    const originalTexts = []
    const regex = /【日文原文】([^\n【]+)/g
    let match
    
    while ((match = regex.exec(analysisText)) !== null) {
      const text = match[1].trim()
      if (text) {
        originalTexts.push(text)
      }
    }
    
    // 如果成功提取，返回合并的文本
    if (originalTexts.length > 0) {
      return originalTexts.join('')
    }
    
    // 如果没有找到标准格式，尝试其他方式
    // 查找包含日文字符的行
    const lines = analysisText.split('\n')
    for (const line of lines) {
      // 检查是否包含日文字符（平假名、片假名、汉字）
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(line)) {
        // 排除包含特定标记的行
        if (!line.includes('【') && !line.includes('•') && !line.includes('｜')) {
          return line.trim()
        }
      }
    }
    
    return ''
  },

  // 构建解析提示词
  buildAnalysisPrompt(text) {
    const inputType = this.detectInputType(text);
    console.log('检测到输入类型:', inputType);
    
    if (inputType === 'word' || inputType === 'wordlist') {
      return this.buildWordAnalysisPrompt(text);
    } else {
      return this.buildSentenceAnalysisPrompt(text);
    }
  },

  // 构建单词解析提示词
  buildWordAnalysisPrompt(text) {
    return `请对以下日语词汇进行详细解析。

输入词汇：${text}

请按照以下格式解析每个词汇：

---
📘 词汇1
【日文】（原词）
【假名】（平假名读音）
【罗马音】（罗马字）
【词性】（名词/动词/形容词/副词等）
【中文含义】（详细解释）
【词源说明】（如果有汉字，解释汉字含义）
【常用搭配】
• 搭配1：日文｜假名｜中文
• 搭配2：日文｜假名｜中文
【例句】
1. 日文例句
   假名：（假名标注）
   中文：（中文翻译）
2. 日文例句
   假名：（假名标注）
   中文：（中文翻译）
【近义词】词1、词2、词3
【反义词】词1、词2、词3
【记忆技巧】（提供记忆方法或联想）

请确保每个词汇都详细解析，适合用于单词学习。`;
  },

  // 构建句子解析提示词（原有的）
  buildSentenceAnalysisPrompt(text) {
    return `请将我输入的图片或者文章、句子逐句进行结构化解析，输出格式请使用"紧凑型卡片式样"，要求包含以下模块内容，不要省略，也不要压缩简写：

1. 日文原文  
2. 罗马音  
3. 中文翻译  
4. 精简句子结构（将主要结构抽象总结输出，不要具体句子内容，只要抽象的部分，例如：主语 + 谓语 + 宾语，若有其他成分请补齐）  
5. 句子结构分析（每句成分逐条列出）  
6. 语法点说明（**保持完整详细**，包括助词、动词原形、变形说明、句型结构，不能简写）  
7. 词汇明细表：每个词单独列出，包含【日文｜罗马音｜中文翻译】

输入文本：${text}

格式请使用如下样式（参考）：

---
📘 第X句  
日文原文  
罗马音  
中文翻译  
【精简结构】：……  
【句子结构分析】：……  
【语法点说明】：……  
【词汇明细表】（表格样式：日文｜罗马音｜中文）

请保持所有格式结构一致，语法说明不要精简。适合用于日语学习笔记排版。
请直接输出全部句子，不用跟我逐句确认。`
  },

  // 解析单词类型的AI响应
  parseWordResponse(response) {
    console.log('开始解析单词响应...')
    
    if (!response || typeof response !== 'string') {
      console.error('AI响应为空或格式错误:', response)
      return []
    }
    
    const words = []
    
    // 按"---"分割词汇
    let sections = response.split('---').filter(s => s.trim())
    if (sections.length === 0) {
      sections = [response]
    }
    
    sections.forEach((section, index) => {
      if (section.includes('📘') || section.includes('词汇')) {
        const wordData = {
          index: index + 1,
          isWord: true, // 标记为单词类型
          word: this.extractContent(section, '【日文】', '\n') || this.extractContent(section, '日文', '\n'),
          kana: this.extractContent(section, '【假名】', '\n') || this.extractContent(section, '假名', '\n'),
          romaji: this.extractContent(section, '【罗马音】', '\n') || this.extractContent(section, '罗马音', '\n'),
          partOfSpeech: this.extractContent(section, '【词性】', '\n') || this.extractContent(section, '词性', '\n'),
          meaning: this.extractContent(section, '【中文含义】', '\n') || this.extractContent(section, '中文含义', '\n'),
          etymology: this.extractContent(section, '【词源说明】', '\n') || this.extractContent(section, '词源说明', '\n'),
          collocations: this.extractCollocations(section),
          examples: this.extractWordExamples(section),
          synonyms: this.extractContent(section, '【近义词】', '\n') || this.extractContent(section, '近义词', '\n'),
          antonyms: this.extractContent(section, '【反义词】', '\n') || this.extractContent(section, '反义词', '\n'),
          memoryTip: this.extractContent(section, '【记忆技巧】', '\n') || this.extractContent(section, '记忆技巧', '\n')
        }
        
        if (wordData.word) {
          words.push(wordData)
        }
      }
    })
    
    return words
  },

  // 提取常用搭配
  extractCollocations(section) {
    const collocationSection = this.extractContent(section, '【常用搭配】', '【')
    if (!collocationSection) return []
    
    const collocations = []
    const lines = collocationSection.split('\n').filter(line => line.trim())
    
    lines.forEach(line => {
      if (line.includes('｜')) {
        const parts = line.split('｜').map(p => p.trim())
        if (parts.length >= 3) {
          collocations.push({
            japanese: parts[0].replace(/[•·・]/, '').trim(),
            kana: parts[1],
            chinese: parts[2]
          })
        }
      }
    })
    
    return collocations
  },

  // 提取单词例句
  extractWordExamples(section) {
    const exampleSection = this.extractContent(section, '【例句】', '【')
    if (!exampleSection) return []
    
    const examples = []
    const parts = exampleSection.split(/\d+\./).filter(p => p.trim())
    
    parts.forEach(part => {
      const lines = part.split('\n').filter(line => line.trim())
      if (lines.length > 0) {
        const example = {
          jp: lines[0].trim(),
          kana: '',
          cn: ''
        }
        
        lines.forEach(line => {
          if (line.includes('假名：')) {
            example.kana = line.replace('假名：', '').trim()
          } else if (line.includes('中文：')) {
            example.cn = line.replace('中文：', '').trim()
          }
        })
        
        if (example.jp) {
          examples.push(example)
        }
      }
    })
    
    return examples
  },

  // 解析句子类型的AI响应（原parseAIResponse）
  parseSentenceResponse(response) {
    console.log('开始解析AI响应...')
    console.log('响应长度:', response?.length)
    console.log('响应前200字符:', response?.substring(0, 200))
    
    // 如果响应为空，返回空数组
    if (!response || typeof response !== 'string') {
      console.error('AI响应为空或格式错误:', response)
      return []
    }
    
    // 将AI返回的文本按句子分割并结构化
    const sentences = []
    
    // 尝试按"---"分割，如果没有，就把整个响应作为一个部分
    let sections = response.split('---').filter(s => s.trim())
    if (sections.length === 0) {
      sections = [response]
    }
    
    console.log('分割后的sections数量:', sections.length)
    
    sections.forEach((section, sectionIndex) => {
      console.log(`处理第${sectionIndex}个section:`, section.substring(0, 100) + '...')
      
      // 更灵活的句子标记检测
      // 检查是否包含句子标记（📘、第X句、【日文原文】等）
      const hasSentenceMarker = 
        section.includes('📘') || 
        (section.includes('第') && section.includes('句')) ||
        section.includes('【日文原文】') ||
        section.includes('日文原文');
      
      console.log(`Section ${sectionIndex} 有句子标记:`, hasSentenceMarker)
      console.log(`Section ${sectionIndex} 包含内容:`, {
        '📘': section.includes('📘'),
        '第...句': section.includes('第') && section.includes('句'),
        '【日文原文】': section.includes('【日文原文】'),
        '日文原文': section.includes('日文原文')
      })
      
      if (hasSentenceMarker) {
        // 尝试提取句子编号
        let sentenceIndex = sentences.length + 1;
        const indexMatch = section.match(/第(\d+)句/);
        if (indexMatch) {
          sentenceIndex = parseInt(indexMatch[1]);
        }
        
        const sentenceData = {
          index: sentenceIndex,
          originalText: this.extractContent(section, '【日文原文】', '\n') || this.extractContent(section, '日文原文', '\n'),
          romaji: this.extractContent(section, '【罗马音】', '\n') || this.extractContent(section, '罗马音', '\n'),
          translation: this.extractContent(section, '【中文翻译】', '\n') || this.extractContent(section, '中文翻译', '\n'),
          structure: this.extractContent(section, '【精简结构】', '\n') || this.extractContent(section, '精简结构', '\n') || this.extractContent(section, '【句子结构】', '\n'),
          analysis: this.extractContent(section, '【句子结构分析】', '【词汇明细表】') || this.extractContent(section, '句子结构分析', '【词汇明细表】') || this.extractContent(section, '【分析】', '【词汇明细表】'),
          grammar: this.extractContent(section, '【语法点说明】', '【词汇明细表】') || this.extractContent(section, '语法点说明', '【词汇明细表】') || this.extractContent(section, '【语法】', '【词汇明细表】'),
          vocabulary: this.extractVocabulary(section)
        }
        
        console.log(`解析出的句子数据 ${sentenceIndex}:`, {
          originalText: sentenceData.originalText?.substring(0, 50),
          romaji: sentenceData.romaji?.substring(0, 50),
          translation: sentenceData.translation?.substring(0, 50),
          structure: sentenceData.structure?.substring(0, 50),
          analysis: sentenceData.analysis?.substring(0, 100),
          grammar: sentenceData.grammar?.substring(0, 100),
          vocabularyCount: sentenceData.vocabulary?.length
        })
        
        // 只有当至少有原文时才添加
        if (sentenceData.originalText) {
          sentences.push(sentenceData)
        }
      } else if (section.length > 50) {
        // 如果没有明显的标记但内容较长，尝试作为整体解析
        console.log('尝试整体解析无标记的section')
        const sentenceData = {
          index: sentences.length + 1,
          originalText: this.extractFirstJapaneseLine(section),
          romaji: this.extractContent(section, 'romaji', '\n') || '',
          translation: this.extractContent(section, '翻译', '\n') || this.extractContent(section, 'translation', '\n') || '',
          structure: '',
          analysis: section, // 将整个section作为分析内容
          grammar: '',
          vocabulary: this.extractVocabulary(section)
        }
        
        if (sentenceData.originalText) {
          sentences.push(sentenceData)
        }
      }
    })
    
    console.log('最终解析出的句子数量:', sentences.length)
    
    // 打印所有解析出的句子原文，用于调试
    sentences.forEach((s, i) => {
      console.log(`句子${i + 1}: ${s.originalText}`)
    })
    
    // 如果解析结果太少，尝试按行解析
    if (sentences.length < 3 && response.includes('\n')) {
      console.log('句子数量过少，尝试按行解析')
      const additionalSentences = this.parseByLines(response, sentences.length)
      sentences.push(...additionalSentences)
    }
    
    return sentences
  },
  
  // 提取第一行日文
  extractFirstJapaneseLine(text) {
    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      // 检查是否包含日文字符
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(trimmed) && trimmed.length > 2) {
        return trimmed
      }
    }
    return ''
  },
  
  // 按行解析（备用方案）
  parseByLines(response, startIndex) {
    const sentences = []
    const lines = response.split('\n').filter(line => line.trim())
    
    let currentSentence = null
    let sentenceIndex = startIndex
    
    lines.forEach(line => {
      const trimmed = line.trim()
      
      // 检测新句子开始
      if (trimmed.includes('第') && trimmed.includes('句')) {
        if (currentSentence && currentSentence.originalText) {
          sentences.push(currentSentence)
        }
        sentenceIndex++
        currentSentence = {
          index: sentenceIndex,
          originalText: '',
          romaji: '',
          translation: '',
          structure: '',
          analysis: '',
          grammar: '',
          vocabulary: []
        }
      } else if (currentSentence) {
        // 填充当前句子的内容
        if (trimmed.includes('日文原文') || trimmed.includes('【日文原文】')) {
          currentSentence.originalText = trimmed.replace(/.*[:：】]/, '').trim()
        } else if (trimmed.includes('罗马音') || trimmed.includes('【罗马音】')) {
          currentSentence.romaji = trimmed.replace(/.*[:：】]/, '').trim()
        } else if (trimmed.includes('中文翻译') || trimmed.includes('【中文翻译】')) {
          currentSentence.translation = trimmed.replace(/.*[:：】]/, '').trim()
        }
      }
    })
    
    // 添加最后一个句子
    if (currentSentence && currentSentence.originalText) {
      sentences.push(currentSentence)
    }
    
    return sentences
  },

  // 提取内容
  extractContent(text, startMarker, endMarker = '\n') {
    const startIndex = text.indexOf(startMarker)
    if (startIndex === -1) return ''
    
    const contentStart = startIndex + startMarker.length
    let endIndex = -1
    
    // 特殊处理多行内容（如句子结构分析和语法点说明）
    if (startMarker.includes('句子结构分析') || startMarker.includes('语法点说明')) {
      // 如果指定了具体的结束标记（如【词汇明细表】），使用它
      if (endMarker !== '\n' && endMarker !== '【') {
        endIndex = text.indexOf(endMarker, contentStart)
      } else {
        // 查找下一个【开头的位置作为结束
        const nextBracket = text.indexOf('【', contentStart)
        endIndex = nextBracket > contentStart ? nextBracket : -1
      }
    } else if (endMarker === '\n') {
      // 查找下一个【开头的位置或双换行
      const nextBracket = text.indexOf('【', contentStart)
      const doubleNewline = text.indexOf('\n\n', contentStart)
      const singleNewline = text.indexOf('\n', contentStart)
      
      // 选择最近的作为结束位置
      const positions = [nextBracket, doubleNewline, singleNewline].filter(p => p > contentStart)
      endIndex = positions.length > 0 ? Math.min(...positions) : -1
    } else {
      endIndex = text.indexOf(endMarker, contentStart)
    }
    
    if (endIndex === -1) {
      return text.substring(contentStart).trim()
    }
    
    return text.substring(contentStart, endIndex).trim()
  },

  // 提取词汇表
  extractVocabulary(text) {
    // 尝试多种标记
    let vocabSection = this.extractContent(text, '【词汇明细表】', '---')
    if (!vocabSection) {
      vocabSection = this.extractContent(text, '词汇明细表', '\n\n')
    }
    
    if (!vocabSection) {
      console.log('未找到词汇表部分')
      return []
    }
    
    // 分割行并过滤包含分隔符的行
    const lines = vocabSection.split('\n').filter(line => {
      return line.includes('｜') || line.includes('|') || line.includes('】')
    })
    
    return lines.map(line => {
      // 支持多种分隔符
      let parts = []
      if (line.includes('｜')) {
        parts = line.split('｜').map(p => p.trim())
      } else if (line.includes('|')) {
        parts = line.split('|').map(p => p.trim())
      } else if (line.includes('】')) {
        // 处理【日文】【罗马音】【中文】格式
        parts = line.split('】').map(p => p.replace('【', '').trim()).filter(p => p)
      }
      
      return {
        japanese: parts[0] || '',
        romaji: parts[1] || '',
        chinese: parts[2] || ''
      }
    }).filter(vocab => vocab.japanese) // 过滤掉空词汇
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

  // 保存单词到生词本
  saveWordToWordbook(e) {
    const { word } = e.currentTarget.dataset
    
    // 构建生词本数据
    const wordData = {
      word: word.word,
      reading: word.kana,
      romaji: word.romaji,
      meaning: word.meaning,
      partOfSpeech: word.partOfSpeech,
      source: 'parser',
      createTime: new Date()
    }
    
    // 保存到本地存储（实际应该保存到数据库）
    const wordbook = wx.getStorageSync('wordbook') || []
    
    // 检查是否已存在
    const exists = wordbook.some(w => w.word === wordData.word)
    if (!exists) {
      wordbook.push(wordData)
      wx.setStorageSync('wordbook', wordbook)
      
      wx.showToast({
        title: '已添加到生词本',
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: '该词已在生词本中',
        icon: 'none'
      })
    }
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

  // 手动保存到历史
  async manualSaveToHistory() {
    const { inputText, inputMethod, imageUrl, analysisResult } = this.data
    
    if (!analysisResult || analysisResult.length === 0) {
      wx.showToast({
        title: '没有可保存的内容',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '保存确认',
      content: '是否保存当前解析结果到历史记录？',
      success: async (res) => {
        if (res.confirm) {
          await this.saveParseResult({
            inputText: inputMethod === 'text' ? inputText : (this.data.extractedImageText || '图片识别'),
            inputMethod,
            imageUrl: inputMethod === 'image' ? this.data.imageUrl : '',
            extractedText: inputMethod === 'image' ? this.data.extractedImageText : '',
            analysisResult
          })
        }
      }
    })
  },

  // 保存解析结果到数据库
  async saveParseResult(data) {
    try {
      // 先检查是否已存在相同内容的记录
      const isDuplicate = await this.checkDuplicateRecord(data)
      if (isDuplicate) {
        console.log('检测到重复记录，跳过保存')
        wx.showToast({
          title: '该内容已存在',
          icon: 'none',
          duration: 1500
        })
        return
      }
      
      // 生成友好的标题摘要
      const title = this.generateTitle(data)
      
      const saveData = {
        ...data,
        title, // 添加标题字段
        createTime: new Date(),
        favorite: false, // 默认不收藏
        sentences: data.analysisResult.map(item => ({
          originalText: item.originalText,
          romaji: item.romaji,
          translation: item.translation,
          structure: item.structure,
          analysis: item.analysis,
          grammar: item.grammar,
          vocabulary: item.vocabulary
        }))
      }
      
      delete saveData.analysisResult // 避免重复存储
      
      console.log('准备保存的数据:', saveData)
      
      const res = await this.db.collection('japanese_parser_history').add({
        data: saveData
      })
      
      console.log('解析结果保存成功:', res._id)
      
      wx.showToast({
        title: '已保存到历史',
        icon: 'success',
        duration: 1500
      })
      
      // 历史记录功能已移至独立页面
    } catch (error) {
      console.error('保存解析结果失败:', error)
      
      if (error.errCode === -502005) {
        // 集合不存在，使用本地存储作为备选
        console.log('云数据库集合不存在，使用本地存储')
        this.saveToLocalStorage(data)
      } else {
        wx.showToast({
          title: '保存失败: ' + (error.message || '未知错误'),
          icon: 'none',
          duration: 3000
        })
      }
    }
  },

  // 检查是否存在重复记录
  async checkDuplicateRecord(data) {
    try {
      const db = this.db
      let query = {}
      
      // 根据输入方式构建查询条件
      if (data.inputMethod === 'text' && data.inputText) {
        // 文本输入：检查输入文本
        query.inputText = data.inputText.trim()
        query.inputMethod = 'text'
      } else if (data.inputMethod === 'image' && data.analysisResult && data.analysisResult.length > 0) {
        // 图片输入：检查第一个句子的原文
        const firstSentence = data.analysisResult[0].originalText
        if (firstSentence) {
          // 在sentences数组中查找匹配的记录
          query['sentences.0.originalText'] = firstSentence
          query.inputMethod = 'image'
        }
      }
      
      if (Object.keys(query).length === 0) {
        return false // 无法构建查询条件，允许保存
      }
      
      // 查询最近24小时内的记录（避免误判太久远的记录）
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      query.createTime = db.command.gte(yesterday)
      
      console.log('重复检查查询条件:', query)
      
      const res = await db.collection('japanese_parser_history')
        .where(query)
        .limit(1)
        .get()
      
      const isDuplicate = res.data.length > 0
      console.log('重复检查结果:', isDuplicate)
      
      return isDuplicate
    } catch (error) {
      console.error('重复检查失败:', error)
      return false // 检查失败时允许保存
    }
  },

  // 本地存储备选方案
  saveToLocalStorage(data) {
    try {
      // 获取现有本地历史记录
      const localHistory = wx.getStorageSync('parser_history') || []
      
      // 检查本地是否已存在重复记录
      const isDuplicate = localHistory.some(item => {
        if (data.inputMethod === 'text' && data.inputText) {
          return item.inputText && item.inputText.trim() === data.inputText.trim()
        } else if (data.inputMethod === 'image' && data.analysisResult && data.analysisResult.length > 0) {
          const firstSentence = data.analysisResult[0].originalText
          return item.sentences && item.sentences.length > 0 && 
                 item.sentences[0].originalText === firstSentence
        }
        return false
      })
      
      if (isDuplicate) {
        console.log('本地存储检测到重复记录，跳过保存')
        wx.showToast({
          title: '该内容已存在',
          icon: 'none',
          duration: 1500
        })
        return
      }
      
      // 生成友好的标题摘要
      const title = this.generateTitle(data)
      
      const saveData = {
        _id: 'local_' + Date.now(),
        ...data,
        title, // 添加标题字段
        createTime: new Date(),
        favorite: false,
        sentences: data.analysisResult.map(item => ({
          originalText: item.originalText,
          romaji: item.romaji,
          translation: item.translation,
          structure: item.structure,
          analysis: item.analysis,
          grammar: item.grammar,
          vocabulary: item.vocabulary
        }))
      }
      
      delete saveData.analysisResult
      
      localHistory.unshift(saveData) // 添加到开头
      
      // 限制最多保存50条
      if (localHistory.length > 50) {
        localHistory.splice(50)
      }
      
      // 保存到本地
      wx.setStorageSync('parser_history', localHistory)
      
      wx.showToast({
        title: '已保存到本地',
        icon: 'success',
        duration: 1500
      })
      
      // 历史记录功能已移至独立页面
    } catch (error) {
      console.error('本地存储失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 查看历史记录
  viewHistory() {
    wx.switchTab({
      url: '/pages/parser-history/parser-history'
    })
  },



  // 进入复习模式
  enterReviewMode() {
    // 跳转到复习页面，传递收藏的解析记录
    wx.navigateTo({
      url: '/pages/parser-review/parser-review'
    })
  },

  /* 已删除测试数据函数
  createTestData() {
    const testData = {
      inputText: '私は学生です。今日は良い天気です。',
      inputMethod: 'text',
      analysisResult: [
        {
          index: 1,
          originalText: '私は学生です。',
          romaji: 'watashi wa gakusei desu',
          translation: '我是学生。',
          structure: '主语 + 主题助词 + 表语 + 系动词',
          analysis: '• 私（わたし）- 主语，第一人称代词\n• は - 主题助词，标记主题\n• 学生（がくせい）- 表语，名词\n• です - 系动词，表示"是"的敬语形式',
          grammar: '• は：主题助词，用于标记句子的主题，读作"wa"\n• です：系动词，名词句的敬语形式，相当于"だ"的敬语\n• 名词+です：表示"是..."的基本句型',
          vocabulary: [
            { japanese: '私', romaji: 'watashi', chinese: '我' },
            { japanese: '学生', romaji: 'gakusei', chinese: '学生' }
          ]
        },
        {
          index: 2,
          originalText: '今日は良い天気です。',
          romaji: 'kyou wa yoi tenki desu',
          translation: '今天天气很好。',
          structure: '时间词 + 主题助词 + 形容词 + 名词 + 系动词',
          analysis: '• 今日（きょう）- 时间词\n• は - 主题助词\n• 良い（よい）- 形容词，表示"好的"\n• 天気（てんき）- 名词\n• です - 系动词敬语形式',
          grammar: '• 今日は：时间词作为主题的用法\n• 良い：い形容词，表示性质或状态\n• 形容词+名词+です：形容词修饰名词的句型',
          vocabulary: [
            { japanese: '今日', romaji: 'kyou', chinese: '今天' },
            { japanese: '良い', romaji: 'yoi', chinese: '好的' },
            { japanese: '天気', romaji: 'tenki', chinese: '天气' }
          ]
        }
      ]
    }

    // 模拟解析完成，保存数据
    this.setData({
      analysisResult: testData.analysisResult,
      showResult: true
    })

    // 保存到数据库
    this.saveParseResult(testData)
  }, */


  // 格式化时间显示
  formatTime(date) {
    if (!date) return ''
    
    const now = new Date()
    const createTime = new Date(date)
    const diff = now - createTime
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    }
    
    // 小于1天
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前'
    }
    
    // 小于7天
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前'
    }
    
    // 超过7天显示具体日期
    const year = createTime.getFullYear()
    const month = (createTime.getMonth() + 1).toString().padStart(2, '0')
    const day = createTime.getDate().toString().padStart(2, '0')
    
    // 如果是今年，不显示年份
    if (year === now.getFullYear()) {
      return `${month}-${day}`
    }
    
    return `${year}-${month}-${day}`
  },

  // 分批处理歌词
  async batchProcessLyrics(text) {
    const lines = text.split('\n').filter(line => line.trim())
    const BATCH_SIZE = 4 // 每批处理4行
    const batches = []
    
    // 将歌词分批
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE)
      batches.push(batch.join('\n'))
    }
    
    console.log(`歌词共${lines.length}行，分成${batches.length}批处理`)
    
    const allSentences = []
    let successCount = 0
    let failCount = 0
    
    // 逐批处理
    for (let i = 0; i < batches.length; i++) {
      wx.showLoading({ 
        title: `解析中 ${i + 1}/${batches.length}`,
        mask: true
      })
      
      try {
        console.log(`处理第${i + 1}批，内容：`, batches[i].substring(0, 50) + '...')
        
        const res = await wx.cloud.callFunction({
          name: 'azure-gpt4o',
          data: {
            action: 'grammar',
            sentence: batches[i]
          }
        })
        
        if (res.result.success) {
          const parsedBatch = this.parseBatchResult(res.result.data.analysis, batches[i])
          allSentences.push(...parsedBatch)
          successCount++
          console.log(`第${i + 1}批解析成功`)
        } else {
          console.error(`第${i + 1}批解析失败:`, res.result.error)
          // 失败的批次使用本地解析
          const localParsed = this.parseLocalBatch(batches[i])
          allSentences.push(...localParsed)
          failCount++
        }
        
      } catch (error) {
        console.error(`第${i + 1}批处理出错:`, error)
        // 出错的批次使用本地解析
        const localParsed = this.parseLocalBatch(batches[i])
        allSentences.push(...localParsed)
        failCount++
      }
      
      // 每批之间稍微延迟，避免请求过快
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    wx.hideLoading()
    
    // 显示处理结果
    const analysisResult = {
      inputMethod: 'text',
      sentences: allSentences,
      batchInfo: {
        total: batches.length,
        success: successCount,
        fail: failCount
      }
    }
    
    // 注释掉自动保存
    // await this.saveParsedToHistory(analysisResult)
    console.log('批处理完成，不自动保存')
    
    // 显示提示
    if (failCount > 0) {
      wx.showToast({
        title: `完成(${failCount}批需手动校对)`,
        icon: 'none',
        duration: 2000
      })
    } else {
      wx.showToast({
        title: '解析完成',
        icon: 'success'
      })
    }
    
    this.setData({
      isAnalyzing: false,
      analysisResult
    })
  },
  
  // 解析批次结果
  parseBatchResult(analysisText, originalText) {
    // 将GPT返回的结果按句子分割
    const sentences = []
    const sections = analysisText.split(/📘|第\d+句/).filter(s => s.trim())
    
    for (let section of sections) {
      if (!section.trim()) continue
      
      const sentence = {
        originalText: '',
        romaji: '',
        translation: '',
        structure: '',
        analysis: '',
        grammar: '',
        vocabulary: []
      }
      
      // 提取各部分内容
      const lines = section.split('\n')
      for (let line of lines) {
        if (line.includes('【日文原文】') || line.includes('日文原文')) {
          sentence.originalText = line.replace(/.*[】】]/, '').trim()
        } else if (line.includes('【罗马音】') || line.includes('罗马音')) {
          sentence.romaji = line.replace(/.*[】】]/, '').trim()
        } else if (line.includes('【中文翻译】') || line.includes('中文翻译')) {
          sentence.translation = line.replace(/.*[】】]/, '').trim()
        } else if (line.includes('【精简结构】') || line.includes('精简结构')) {
          sentence.structure = line.replace(/.*[】】]/, '').trim()
        } else if (line.includes('【句子结构分析】') || line.includes('句子结构分析')) {
          sentence.analysis = section.substring(section.indexOf('句子结构分析'))
        } else if (line.includes('【语法点说明】') || line.includes('语法点说明')) {
          sentence.grammar = section.substring(section.indexOf('语法点说明'))
        }
      }
      
      // 提取词汇
      const vocabSection = section.match(/【词汇明细表】[\s\S]*?(?=\n\n|$)/);
      if (vocabSection) {
        const vocabLines = vocabSection[0].split('\n').slice(1)
        for (let vocabLine of vocabLines) {
          if (vocabLine.includes('｜')) {
            const parts = vocabLine.split('｜')
            if (parts.length >= 3) {
              sentence.vocabulary.push({
                japanese: parts[0].trim(),
                romaji: parts[1].trim(),
                chinese: parts[2].trim()
              })
            }
          }
        }
      }
      
      if (sentence.originalText) {
        sentences.push(sentence)
      }
    }
    
    // 如果解析失败，返回原始文本
    if (sentences.length === 0) {
      sentences.push({
        originalText: originalText,
        romaji: this.extractFurigana(originalText),
        translation: '解析中...',
        structure: '',
        analysis: analysisText,
        grammar: ''
      })
    }
    
    return sentences
  },
  
  // 本地解析批次（降级方案）
  parseLocalBatch(text) {
    const lines = text.split('\n').filter(line => line.trim())
    return [{
      originalText: text,
      romaji: this.extractFurigana(text),
      translation: '需要人工翻译',
      structure: '歌词段落',
      analysis: lines.map(l => `• ${l}`).join('\n'),
      grammar: '云函数暂时不可用'
    }]
  },
  
  // 本地歌词解析（云函数不可用时的备用方案）
  async parseLocalLyrics(text) {
    wx.showLoading({ title: '本地解析中...' })
    
    const lines = text.split('\n').filter(line => line.trim())
    const parsedSentences = []
    
    // 按空行分段
    let currentBlock = []
    for (let i = 0; i < lines.length; i++) {
      currentBlock.push(lines[i])
      // 每4行或遇到空行分一段
      if (currentBlock.length >= 4 || i === lines.length - 1) {
        if (currentBlock.length > 0) {
          parsedSentences.push({
            originalText: currentBlock.join('\n'),
            romaji: this.extractFurigana(currentBlock.join('\n')),
            translation: '请部署云函数以获取翻译',
            structure: '歌词段落',
            analysis: currentBlock.map(l => `• ${l}`).join('\n'),
            grammar: '云函数未部署，无法提供语法分析'
          })
          currentBlock = []
        }
      }
    }
    
    const analysisResult = {
      inputMethod: 'text',
      sentences: parsedSentences
    }
    
    // 保存到数据库
    try {
      const db = wx.cloud.database()
      await db.collection('japanese_parser_history').add({
        data: {
          inputText: text,
          inputMethod: 'text',
          sentences: parsedSentences,
          favorite: false,
          createTime: new Date(),
          updateTime: new Date()
        }
      })
      
      wx.showToast({
        title: '已保存到历史',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存到历史失败:', error)
    }
    
    wx.hideLoading()
    this.setData({
      isAnalyzing: false,
      analysisResult
    })
  },
  
  // 提取假名读音
  extractFurigana(text) {
    const matches = text.match(/[（(]([^)）]+)[)）]/g)
    if (matches) {
      return matches.map(m => m.replace(/[（()）]/g, '')).join(' / ')
    }
    return ''
  },
  
  // 处理Azure GPT-4o返回的结果
  parseAzureResult(analysisText, originalText) {
    const lines = analysisText.split('\n').filter(line => line.trim())
    const sentences = []
    
    // 将解析结果分段
    let currentSentence = {
      originalText: originalText,
      romaji: '',
      translation: '',
      structure: '',
      analysis: analysisText,
      grammar: ''
    }
    
    // 尝试从结果中提取各部分
    for (let line of lines) {
      if (line.includes('句子分解') || line.includes('分解')) {
        currentSentence.structure = line
      } else if (line.includes('翻译') || line.includes('译文')) {
        currentSentence.translation = line.replace(/.*[:：]/, '').trim()
      } else if (line.includes('语法')) {
        currentSentence.grammar = line
      }
    }
    
    sentences.push(currentSentence)
    
    return {
      inputMethod: 'text',
      sentences: sentences
    }
  },
  
  // 保存解析结果到历史（带重复检查）
  async saveParsedToHistory(analysisResult) {
    try {
      const db = wx.cloud.database()
      
      // 检查是否已存在相同内容
      const inputText = analysisResult.sentences[0].originalText
      const existingQuery = {
        inputText: inputText,
        inputMethod: analysisResult.inputMethod
      }
      
      const existing = await db.collection('japanese_parser_history')
        .where(existingQuery)
        .limit(1)
        .get()
      
      if (existing.data.length > 0) {
        console.log('歌词解析结果已存在，跳过保存')
        return
      }
      
      await db.collection('japanese_parser_history').add({
        data: {
          inputText: inputText,
          inputMethod: analysisResult.inputMethod,
          sentences: analysisResult.sentences,
          favorite: false,
          createTime: new Date(),
          updateTime: new Date()
        }
      })
      console.log('已保存到历史记录')
    } catch (error) {
      console.error('保存到历史失败:', error)
    }
  },
  
  // 分享
  onShareAppMessage() {
    return {
      title: '日语解析工具 - 语伴君',
      path: '/pages/japanese-parser/japanese-parser'
    }
  }
})