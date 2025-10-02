// 日语解析工具页面
const { azureGPT4o } = require('../../../utils/ai')
const authGuard = require('../../../utils/authGuard')


Page({
  data: {
    inputText: '', // 输入的文本
    originalInputText: '', // 原始完整文本（分批处理时保留）
    imageUrl: '', // 上传的图片（本地临时路径）
    cloudImageUrl: '', // 图片在云存储中的URL（永久保存用）
    userInputTitle: '', // 用户输入的标题（图片模式必填）
    isAnalyzing: false, // 是否正在分析
    analysisResult: [], // 解析结果
    showResult: false, // 是否显示结果
    inputMethod: 'text', // 输入方式：text或image
    extractedImageText: '', // 从图片中提取的文本
    articleTitle: '', // AI生成的文章标题
    // 历史记录相关功能已移至独立页面
  },

  async onLoad() {
    // 检查高级功能认证（需要审核通过）
    const isAdvancedUser = await authGuard.requireAdvancedAuth(this)
    if (!isAdvancedUser) {
      return
    }
    
    // 页面加载时初始化云数据库
    this.db = wx.cloud.database()
  },


  // 生成友好的标题摘要
  generateTitle(data) {
    // 优先使用用户输入的标题（两种模式都支持）
    if (data.articleTitle) {
      return data.articleTitle
    }
    
    // 如果是图片模式，使用AI生成的标题
    if (data.inputMethod === 'image') {
      return this.data.userInputTitle || this.data.articleTitle || '图片解析'
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

  // 标题输入变化
  onTitleInput(e) {
    this.setData({
      articleTitle: e.detail.value
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
        
        // 要求用户输入标题
        wx.showModal({
          title: '请输入文章标题',
          editable: true,
          placeholderText: '请输入标题（必填，10字以内）',
          success: (modalRes) => {
            if (modalRes.confirm) {
              const userTitle = modalRes.content?.trim() || ''
              if (!userTitle) {
                wx.showToast({
                  title: '标题不能为空',
                  icon: 'none'
                })
                return
              }
              if (userTitle.length > 10) {
                wx.showToast({
                  title: '标题不能超过10字',
                  icon: 'none'
                })
                return
              }
              
              this.setData({
                imageUrl: tempFilePath,
                inputText: '', // 清空文本
                userInputTitle: userTitle // 保存用户输入的标题
              })
              
              wx.showToast({
                title: '图片已选择',
                icon: 'success',
                duration: 1500
              })
            } else {
              // 用户取消，清除选择的图片
              wx.showToast({
                title: '已取消',
                icon: 'none'
              })
            }
          }
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
        // 不删除云存储文件，需要永久保存
        // wx.cloud.deleteFile({
        //   fileList: [uploadRes.fileID]
        // })
        
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
    
    // 检查云开发是否已初始化
    const app = getApp()
    if (!app.globalData.cloudReady) {
      wx.showToast({
        title: '云服务初始化中，请稍后重试',
        icon: 'none'
      })
      return
    }
    
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
        let cloudImageUrl = ''
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `japanese-parser/image_${Date.now()}.jpg`,
            filePath: imageUrl
          })
          
          // 验证上传是否成功
          if (!uploadRes.fileID) {
            throw new Error('图片上传失败：未获取到云存储文件ID')
          }
          
          cloudImageUrl = uploadRes.fileID
          
          // 保存云存储的文件ID，用于永久保存
          this.setData({
            cloudImageUrl: cloudImageUrl
          })
          
          // console.log('图片已成功上传到云存储:', cloudImageUrl)
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError)
          wx.hideLoading()
          wx.showModal({
            title: '上传失败',
            content: '图片上传到云存储失败，请检查网络后重试',
            showCancel: false
          })
          this.setData({ isAnalyzing: false })
          return
        }
        
        // 调用Azure GPT-4o的grammar接口（支持图片识别）
        console.log('开始调用云函数进行图片解析...')
        const functionStartTime = Date.now()
        
        try {
          const res = await wx.cloud.callFunction({
            name: 'azure-gpt4o',
            data: {
              action: 'grammar',
              imageUrl: cloudImageUrl,  // 使用前面保存的cloudImageUrl变量
              userTitle: this.data.userInputTitle // 传递用户输入的标题
            }
          })
          
          const functionEndTime = Date.now()
          console.log('云函数调用完成，耗时:', functionEndTime - functionStartTime, 'ms')
          
          wx.hideLoading()
          
          // 不删除云存储文件，需要永久保存
          // wx.cloud.deleteFile({
          //   fileList: [uploadRes.fileID]
          // })
          
          if (res.result.success) {
            result = res.result.data.analysis
            console.log('图片解析成功，结果长度:', result?.length || 0)
          } else {
            console.error('云函数返回错误:', res.result.error)
            throw new Error(res.result.error || 'AI解析失败')
          }
        } catch (functionError) {
          wx.hideLoading()
          console.error('云函数调用失败:', functionError)
          
          // 提供更详细的错误信息
          let errorMessage = '图片解析失败：'
          if (functionError.errCode === -504002) {
            errorMessage += '云函数超时，请尝试更小的图片'
          } else if (functionError.errCode === -502001) {
            errorMessage += '网络连接失败'
          } else if (functionError.errMsg && functionError.errMsg.includes('timeout')) {
            errorMessage += '请求超时，请重试'
          } else {
            errorMessage += (functionError.message || '未知错误')
          }
          
          wx.showModal({
            title: '解析失败',
            content: errorMessage + '\n\n建议：\n1. 检查网络连接\n2. 尝试更小尺寸的图片\n3. 稍后重试',
            showCancel: false
          })
          
          this.setData({ isAnalyzing: false })
          return
        }
        
        // 添加调试日志
        // console.log('图片解析原始返回内容（前1000字符）:', result?.substring(0, 1000))
        // console.log('图片解析完整返回长度:', result?.length)
        
        // 从AI响应中提取识别出的原始文本
        // AI会返回包含日文原文的解析结果
        const extractedText = this.extractOriginalTextFromAnalysis(result)
        if (extractedText) {
          // 保存提取的原始文本，用于后续存储
          this.setData({ extractedImageText: extractedText })
        }
        
        // 图片模式：直接处理结果
        await this.handleAnalysisResult(result, extractedText || this.data.userInputTitle || '图片识别', 'image')
        return
        
      } else {
        // 文本模式
        const lines = inputText.split('\n').filter(line => line.trim())
        // console.log(`输入文本共${lines.length}行`)
        
        // 检查是否需要分批处理：行数超过15行 或 总字符数超过1500字符
        const totalChars = inputText.length
        const needsBatch = lines.length > 15 || totalChars > 1500
        
        // 如果文本较长（超过8行），直接自动分段处理
        if (lines.length > 8) {
          // 直接自动分段处理，不再提示用户
          await this.autoSplitAndProcess(inputText, lines, totalChars)
          return
        }
        
        // 调用文本处理方法
        await this.processText(inputText, lines, totalChars, needsBatch)
      }
    } catch (error) {
      console.error('解析失败:', error)
      wx.hideLoading() // 修复：隐藏loading状态
      wx.showToast({
        title: '解析失败，请重试',
        icon: 'none'
      })
      this.setData({
        isAnalyzing: false
      })
    }
  },

  // 自动分段处理方法
  async autoSplitAndProcess(inputText, lines, totalChars) {
    try {
      // 保存原始文本用于显示
      this.setData({ originalInputText: inputText })
      
      // 按句子数分段：每段4行（句子）
      const maxLinesPerSegment = 4
      const segmentCount = Math.ceil(lines.length / maxLinesPerSegment)
      
      wx.showLoading({ 
        title: `按句子分段处理中...(${segmentCount}段)`,
        mask: true 
      })
      
      // 按句子数分段
      const segments = this.splitTextIntoSegments(inputText, maxLinesPerSegment)
      
      console.log(`原文${totalChars}字符，分成${segments.length}段处理`)
      
      const allResults = []
      let successCount = 0
      
      // 并行处理所有段落
      console.log(`🚀 开始并行处理${segments.length}个段落`)
      
      wx.showLoading({ 
        title: `并行处理${segments.length}段中...`,
        mask: true 
      })
      
      const processingPromises = segments.map(async (segment, i) => {
        const segmentIndex = i + 1
        const currentSegmentLines = segment.split('\n').filter(line => line.trim()).length
        
        console.log(`开始处理第${segmentIndex}段(${currentSegmentLines}句)`)
        
        let retryCount = 0
        const maxRetries = 2
        
        while (retryCount < maxRetries) {
          try {
            console.log(`第${segmentIndex}段处理尝试 ${retryCount + 1}/${maxRetries}`)
            
            const res = await wx.cloud.callFunction({
              name: 'azure-gpt4o-batch',
              data: {
                sentence: segment
              }
            })
            
            if (res.result.success) {
              const segmentResult = this.parseSentenceResponse(res.result.data.analysis)
              if (segmentResult.sentences && segmentResult.sentences.length > 0) {
                console.log(`✅ 第${segmentIndex}段处理成功，解析出${segmentResult.sentences.length}句`)
                console.log(`🔍 第${segmentIndex}段词汇情况:`, segmentResult.sentences.map(s => `第${s.index}句词汇数: ${s.vocabulary?.length || 0}`))
                return {
                  success: true,
                  index: i,
                  sentences: segmentResult.sentences
                }
              } else {
                throw new Error('AI返回的结果解析失败')
              }
            } else {
              throw new Error(res.result.error || '段落处理失败')
            }
            
          } catch (retryError) {
            retryCount++
            console.error(`❌ 第${segmentIndex}段第${retryCount}次尝试失败:`, retryError.message)
            
            if (retryCount < maxRetries) {
              // 等待后重试，添加随机延迟避免同时重试
              await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
            }
          }
        }
        
        // 所有重试都失败，生成降级结果
        console.error(`💀 第${segmentIndex}段最终处理失败`)
        const lines = segment.split('\n').filter(line => line.trim())
        
        if (lines.length <= 3) {
          // 短段落：每行生成一个条目
          const fallbackSentences = lines.map((line, lineIndex) => ({
            index: 0, // 临时索引，稍后重新编号
            originalText: line.trim(),
            romaji: '',
            translation: `处理失败，请手动处理`,
            structure: '处理失败',
            analysis: `第${segmentIndex}段第${lineIndex + 1}行处理失败`,
            grammar: '云函数调用失败',
            vocabulary: []
          }))
          return {
            success: false,
            index: i,
            sentences: fallbackSentences
          }
        } else {
          // 长段落：生成一个汇总条目
          return {
            success: false,
            index: i,
            sentences: [{
              index: 0, // 临时索引，稍后重新编号
              originalText: segment.substring(0, 100) + (segment.length > 100 ? '...' : ''),
              romaji: '',
              translation: `该段共${lines.length}行，处理失败`,
              structure: '处理失败',
              analysis: `第${segmentIndex}段处理失败\n\n原文内容：\n${segment}`,
              grammar: '请检查网络连接或稍后重试',
              vocabulary: []
            }]
          }
        }
      })
      
      // 等待所有段落处理完成
      const results = await Promise.all(processingPromises)
      console.log(`🎉 并行处理完成！`)
      
      // 按原始顺序合并结果并重新编号
      results.sort((a, b) => a.index - b.index)
      
      let sentenceIndex = 1
      results.forEach(result => {
        result.sentences.forEach(sentence => {
          sentence.index = sentenceIndex++
          allResults.push(sentence)
        })
        if (result.success) {
          successCount++
        }
      })
      
      wx.hideLoading()
      
      // 显示处理结果
      this.setData({
        analysisResult: allResults,
        showResult: true,
        isAnalyzing: false
      })
      
      // 显示处理统计
      const failCount = segments.length - successCount
      if (failCount > 0) {
        wx.showModal({
          title: '处理完成',
          content: `共${segments.length}段，成功${successCount}段，失败${failCount}段。失败的段落已保留原文，请手动检查处理。`,
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showToast({
          title: '自动分段处理完成',
          icon: 'success'
        })
      }
      
      // 自动保存结果
      const autoSaveData = {
        inputText: inputText,
        inputMethod: 'text',
        imageUrl: '',
        extractedText: '',
        articleTitle: this.data.articleTitle || `自动分段处理(${segments.length}段)`,
        title: '',
        analysisResult: allResults
      }
      
      this.saveParseResult(autoSaveData)
      
    } catch (error) {
      console.error('自动分段处理失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '自动分段处理失败',
        icon: 'none'
      })
      this.setData({
        isAnalyzing: false
      })
    }
  },

  // 将文本分割成段落，按句子数量分段
  splitTextIntoSegments(text, maxLinesPerSegment = 4) {
    const segments = []
    const lines = text.split('\n').filter(line => line.trim())
    
    console.log(`原文共${lines.length}行，按每段最多${maxLinesPerSegment}行分段`)
    
    // 按固定行数分段 - 就是简单的数学除法
    for (let i = 0; i < lines.length; i += maxLinesPerSegment) {
      const segmentLines = lines.slice(i, i + maxLinesPerSegment)
      const segment = segmentLines.join('\n')
      segments.push(segment.trim())
      console.log(`第${segments.length}段：${segmentLines.length}行 (第${i+1}-${Math.min(i+maxLinesPerSegment, lines.length)}行)`)
    }
    
    console.log(`分段完成：${lines.length}行 → ${segments.length}段`)
    return segments
  },

  // 文本处理方法
  async processText(inputText, lines, totalChars, needsBatch) {
    try {
      let result
      
      // 如果是歌词格式（包含假名标注），使用分批处理
      if (inputText.includes('（') || inputText.includes('(')) {
        // console.log('检测到歌词格式，使用分批处理')
        await this.batchProcessLyrics(inputText)
        return
      }
        
        if (needsBatch) {
          // 保存原始文本用于显示
          this.setData({ originalInputText: inputText })
          
          // console.log(`文本较长，使用分批处理模式：${lines.length}行，${totalChars}字符`)
          wx.showLoading({ title: `分批解析中(${totalChars}字符)...` })
          
          try {
            const res = await wx.cloud.callFunction({
              name: 'azure-gpt4o-batch',
              data: {
                sentence: inputText
              }
            })
            
            if (res.result.success) {
              result = res.result.data.analysis
              // console.log(`分批处理完成，共${res.result.data.batches}批，${res.result.data.totalLines}行`)
            } else {
              throw new Error(res.result.error || '分批处理失败')
            }
          } catch (batchError) {
            console.error('分批处理失败，自动切换到分段处理:', batchError)
            wx.hideLoading()
            
            // 直接自动分段处理，不再提示用户
            wx.showToast({
              title: '自动切换到分段处理模式',
              icon: 'none',
              duration: 2000
            })
            
            setTimeout(() => {
              this.autoSplitAndProcess(inputText, inputText.split('\n').filter(line => line.trim()), inputText.length)
            }, 500)
            return
          }
        } else {
          // 行数较少，使用快速模式
          // console.log('使用azure-gpt4o进行全文语法分析')
          wx.showLoading({ title: '全文解析中...' })
          
          const res = await wx.cloud.callFunction({
            name: 'azure-gpt4o',
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
              // console.log('=== 解析调试信息 ===')
              // console.log('输入行数:', debug.inputLines)
              // console.log('输出长度:', debug.outputLength)
              // console.log('Token使用:', debug.tokenUsage)
              // console.log('解析句子数:', debug.parsedSentences)
              
              // 如果解析数量不匹配，显示警告
              if (debug.parsedSentences < debug.inputLines) {
                console.warn(`警告：输入${debug.inputLines}行，但只解析了${debug.parsedSentences}句`)
              }
            }
          } else {
            // 如果快速函数失败，回退到简单函数
            // console.log('回退到simpleChat')
            const prompt = this.buildAnalysisPrompt(inputText)
            result = await azureGPT4o.simpleChat(prompt)
          }
        }
      
      // 处理返回结果
      await this.handleAnalysisResult(result, inputText, 'text')
      
    } catch (error) {
      console.error('文本处理失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '处理失败，请重试',
        icon: 'none'
      })
      this.setData({
        isAnalyzing: false
      })
    }
  },

  // 处理解析结果的通用方法
  async handleAnalysisResult(result, inputText, inputMethod) {
    try {
      wx.hideLoading()
      
      // 解析AI返回的结果
      // console.log('AI返回的原始结果长度:', result ? result.length : 0)
      // console.log('AI返回的原始结果前500字符:', result ? result.substring(0, 500) : 'null')
      
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
      let analysisResult, articleTitle = '';
      
      if (inputType === 'word' || inputType === 'wordlist') {
        analysisResult = this.parseWordResponse(result);
      } else {
        const parseResult = this.parseSentenceResponse(result);
        analysisResult = parseResult.sentences;
        articleTitle = parseResult.title;
      }
      
      // console.log('解析后的结果:', analysisResult)
      // console.log('文章标题:', articleTitle)
      
      // 如果是图片模式，优先使用用户输入的标题
      if (inputMethod === 'image') {
        const finalTitle = this.data.userInputTitle || articleTitle || '图片解析';
        this.setData({ articleTitle: finalTitle });
      }
      
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
        
        // 自动保存解析结果到历史
        const autoSaveData = {
          inputText: inputMethod === 'text' ? inputText : (this.data.extractedImageText || this.data.userInputTitle || '图片识别'),
          inputMethod,
          imageUrl: inputMethod === 'image' ? (this.data.cloudImageUrl || this.data.imageUrl) : '',  // 优先使用云存储URL
          extractedText: inputMethod === 'image' ? this.data.extractedImageText : '',
          articleTitle: inputMethod === 'image' ? (this.data.userInputTitle || articleTitle) : this.data.articleTitle,  // 两种模式都可以有标题
          title: '',  // 初始为空，用户可以后续添加
          analysisResult
        }
        
        // console.log('准备自动保存的数据:', {
        //   inputMethod,
        //   hasImageUrl: !!autoSaveData.imageUrl,
        //   articleTitle: autoSaveData.articleTitle,
        //   analysisResultCount: analysisResult.length
        // })
        
        // 自动保存到历史
        this.saveParseResult(autoSaveData)
        
        // 保存成功后，自动整合词汇和句子结构到学习库
        if (analysisResult && analysisResult.length > 0) {
          setTimeout(() => {
            this.integrateVocabularyToLearning(autoSaveData)
            this.integrateStructuresToLearning(autoSaveData)
          }, 1000) // 延迟1秒确保保存完成
        }
      }
      
    } catch (error) {
      console.error('解析失败:', error)
      wx.hideLoading() // 修复：隐藏loading状态
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
    // console.log('检测到输入类型:', inputType);
    
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
    // console.log('开始解析单词响应...')
    
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
    console.log('=== 开始解析AI响应 ===')
    console.log('响应长度:', response?.length)
    console.log('完整响应内容:')
    console.log(response)
    console.log('=== 响应内容结束 ===')
    
    // 如果响应为空，返回空数组
    if (!response || typeof response !== 'string') {
      console.error('AI响应为空或格式错误:', response)
      return { title: '', sentences: [] }
    }
    
    // 首先提取文章标题
    let title = ''
    const titleMatch = response.match(/【文章标题】\s*(.+?)(?:\n|$)/)
    if (titleMatch) {
      title = titleMatch[1].trim()
      // console.log('提取到标题:', title)
    }
    
    // 将AI返回的文本按句子分割并结构化
    const sentences = []
    
    // 首先尝试按"---"分割
    let sections = response.split('---').filter(s => s.trim())
    console.log('按---分割，找到', sections.length, '个部分')
    
    // 如果没有"---"分割符，尝试按"📘 第X句"分割
    if (sections.length <= 1) {
      // 使用正则表达式分割句子
      const sentenceRegex = /(?=📘\s*第\d+句)/g
      const altSections = response.split(sentenceRegex).filter(s => s.trim())
      console.log('按📘分割，找到', altSections.length, '个部分')
      if (altSections.length > 1) {
        sections = altSections
      }
    }
    
    // 如果还是只有一个部分，尝试其他分割方式
    if (sections.length <= 1) {
      // 尝试按【日文原文】分割（但保留标记）
      const jpRegex = /(?=【日文原文】)/g
      const jpSections = response.split(jpRegex).filter(s => s.trim())
      console.log('按【日文原文】分割，找到', jpSections.length, '个部分')
      if (jpSections.length > 1) {
        sections = jpSections
      }
    }
    
    // 最后的备用方案
    if (sections.length === 0) {
      sections = [response]
    }
    
    console.log('最终使用的分割结果：', sections.length, '个section')
    sections.forEach((section, i) => {
      console.log(`Section ${i + 1} 预览:`, section.substring(0, 100) + '...')
    })
    
    // console.log('分割后的sections数量:', sections.length)
    
    sections.forEach((section, sectionIndex) => {
      console.log(`处理第${sectionIndex + 1}个section:`, section.substring(0, 100) + '...')
      
      // 跳过包含文章标题和完整原文的section
      if (section.includes('【文章标题】') || section.includes('【完整原文】')) {
        console.log(`跳过第${sectionIndex + 1}个section：包含文章标题或完整原文`)
        return
      }
      
      // 更灵活的句子标记检测
      // 检查是否包含句子标记（📘、第X句、【日文原文】等）
      const hasSentenceMarker = 
        section.includes('📘') || 
        (section.includes('第') && section.includes('句')) ||
        section.includes('【日文原文】') ||
        section.includes('日文原文');
      
      console.log(`Section ${sectionIndex + 1} 有句子标记:`, hasSentenceMarker)
      
      if (hasSentenceMarker) {
        // 尝试提取句子编号
        let sentenceIndex = sentences.length + 1;
        const indexMatch = section.match(/第(\d+)句/);
        if (indexMatch) {
          sentenceIndex = parseInt(indexMatch[1]);
        }
        
        // 限制section内容，避免包含下一句的内容
        let limitedSection = section
        
        // 如果section包含多个"【日文原文】"，只取第一个句子的内容
        const japaneseMatches = [...section.matchAll(/【日文原文】([^【\n]+)/g)]
        if (japaneseMatches.length > 1) {
          // 找到第二个"【日文原文】"的位置，截取到这里
          const secondJapaneseIndex = section.indexOf('【日文原文】', section.indexOf('【日文原文】') + 1)
          if (secondJapaneseIndex > 0) {
            limitedSection = section.substring(0, secondJapaneseIndex).trim()
          }
        }
        
        const sentenceData = {
          index: sentenceIndex,
          originalText: this.extractContent(limitedSection, '【日文原文】', '\n') || this.extractContent(limitedSection, '日文原文', '\n'),
          romaji: this.extractContent(limitedSection, '【罗马音】', '\n') || this.extractContent(limitedSection, '罗马音', '\n'),
          translation: this.extractContent(limitedSection, '【中文翻译】', '\n') || this.extractContent(limitedSection, '中文翻译', '\n'),
          structure: this.extractContent(limitedSection, '【精简结构】', '\n') || this.extractContent(limitedSection, '精简结构', '\n') || this.extractContent(limitedSection, '【句子结构】', '\n'),
          analysis: this.extractContent(limitedSection, '【句子结构分析】', '【词汇明细表】') || this.extractContent(limitedSection, '句子结构分析', '【词汇明细表】') || this.extractContent(limitedSection, '【分析】', '【词汇明细表】'),
          grammar: this.extractContent(limitedSection, '【语法点说明】', '【词汇明细表】') || this.extractContent(limitedSection, '语法点说明', '【词汇明细表】') || this.extractContent(limitedSection, '【语法】', '【词汇明细表】'),
          vocabulary: this.extractVocabulary(limitedSection)
        }
        
        // console.log(`解析出的句子数据 ${sentenceIndex}:`, {
        //   originalText: sentenceData.originalText?.substring(0, 50),
        //   romaji: sentenceData.romaji?.substring(0, 50),
        //   translation: sentenceData.translation?.substring(0, 50),
        //   structure: sentenceData.structure?.substring(0, 50),
        //   analysis: sentenceData.analysis?.substring(0, 100),
        //   grammar: sentenceData.grammar?.substring(0, 100),
        //   vocabularyCount: sentenceData.vocabulary?.length
        // })
        
        // 只有当至少有原文时才添加，并且避免重复
        if (sentenceData.originalText) {
          // 检查是否已存在相同的原文
          const isDuplicate = sentences.some(existing => 
            existing.originalText === sentenceData.originalText
          )
          
          if (!isDuplicate) {
            sentences.push(sentenceData)
            console.log(`添加句子${sentenceIndex}:`, sentenceData.originalText)
          } else {
            console.log(`跳过重复句子:`, sentenceData.originalText)
          }
        }
      } else if (section.length > 50) {
        // 如果没有明显的标记但内容较长，尝试作为整体解析
        // console.log('尝试整体解析无标记的section')
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
    
    // console.log('最终解析出的句子数量:', sentences.length)
    
    // 打印所有解析出的句子原文，用于调试
    sentences.forEach((s, i) => {
      // console.log(`句子${i + 1}: ${s.originalText}`)
    })
    
    // 如果解析结果太少，尝试按行解析
    if (sentences.length < 3 && response.includes('\n')) {
      // console.log('句子数量过少，尝试按行解析')
      const additionalSentences = this.parseByLines(response, sentences.length)
      sentences.push(...additionalSentences)
    }
    
    return { title, sentences }
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
      // 对于单行内容，查找换行符或下一个【标记
      const nextBracket = text.indexOf('【', contentStart)
      const singleNewline = text.indexOf('\n', contentStart)
      
      // 选择最近的作为结束位置
      const positions = [nextBracket, singleNewline].filter(p => p > contentStart)
      endIndex = positions.length > 0 ? Math.min(...positions) : -1
    } else {
      endIndex = text.indexOf(endMarker, contentStart)
    }
    
    let content = ''
    if (endIndex === -1) {
      content = text.substring(contentStart).trim()
    } else {
      content = text.substring(contentStart, endIndex).trim()
    }
    
    // 清理内容：移除多余的标点符号和空格
    content = content.replace(/^[:：]\s*/, '') // 移除开头的冒号
    content = content.replace(/^\s*[】]\s*/, '') // 移除开头的右括号
    
    return content
  },

  // 提取词汇表 - 优先AI，兜底策略备用
  extractVocabulary(text) {
    console.log('🔍 开始提取词汇表')
    
    // 先尝试提取AI返回的词汇表
    const vocabulary = []
    
    // 查找词汇明细表部分
    const vocabMatch = text.match(/【词汇明细表】([\s\S]*?)(?=【|---|$)/i)
    if (vocabMatch) {
      const vocabSection = vocabMatch[1]
      console.log('🔍 找到词汇明细表:', vocabSection.substring(0, 200))
      
      // 按行分割，提取词汇
      const lines = vocabSection.split('\n').filter(line => line.trim())
      
      lines.forEach(line => {
        const trimmed = line.trim()
        
        // 跳过表头行和空行
        if (!trimmed || 
            trimmed.includes('日语｜罗马音｜中文') ||
            trimmed.includes('单词｜罗马音｜中文') ||
            trimmed.includes('日文原文｜日文原文｜词汇')) {
          return
        }
        
        // 解析格式：日语｜罗马音｜中文
        const parts = trimmed.split('｜')
        if (parts.length === 3) {
          const japanese = parts[0].trim()
          const romaji = parts[1].trim()
          const chinese = parts[2].trim()
          
          // 验证是否为有效词汇
          if (japanese && romaji && chinese && 
              japanese !== '日文原文' && 
              chinese !== '词汇' &&
              chinese !== '中文翻译') {
            vocabulary.push({ japanese, romaji, chinese })
            console.log(`✅ 提取词汇: ${japanese} | ${romaji} | ${chinese}`)
          }
        }
      })
    }
    
    // 如果AI词汇表无效，使用兜底策略
    if (vocabulary.length === 0) {
      console.log('🚨 AI词汇表无效，使用兜底策略')
      return this.extractFallbackVocabulary(text)
    }
    
    console.log('✅ AI词汇表提取成功，数量:', vocabulary.length)
    return vocabulary.slice(0, 6)
  },

  // 兜底词汇提取：从实际句子中智能提取
  extractFallbackVocabulary(text) {
    console.log('🔄 开始从实际句子智能提取词汇')
    const vocabulary = []
    
    // 🎯 策略1：从【日文原文】字段提取
    const originalMatches = text.match(/【日文原文】([^【\n]+)/g)
    if (originalMatches) {
      console.log('🔍 找到日文原文:', originalMatches.length, '个')
      
      originalMatches.slice(0, 3).forEach((match, index) => { // 只处理前3个句子，避免重复
        const sentence = match.replace('【日文原文】', '').trim()
        console.log(`📝 处理句子${index + 1}:`, sentence)
        
        // 智能分词并提取词汇
        const words = this.smartExtractWords(sentence)
        console.log(`🔪 分词结果:`, words)
        
        words.forEach(word => {
          if (word.length >= 2 && word.length <= 6) { // 合理长度的词汇
            const meaning = this.guessWordMeaning(word, sentence)
            if (meaning !== null && !vocabulary.some(v => v.japanese === word)) {
              vocabulary.push({
                japanese: word,
                romaji: this.generateBetterRomaji(word),
                chinese: meaning
              })
              console.log(`✅ 添加词汇: ${word} | ${this.generateBetterRomaji(word)} | ${meaning}`)
            }
          }
        })
      })
    }
    
    // 🎯 策略2：如果词汇不足，从整个文本中提取高频日语词汇
    if (vocabulary.length < 3) {
      console.log('⚠️ 词汇不足，从全文提取高频词汇')
      const allJapanese = text.match(/[一-龯ひ-ゟァ-ヿー]{2,6}/g)
      if (allJapanese) {
        // 统计词汇频率并选择高频词汇
        const wordCount = {}
        allJapanese.forEach(word => {
          if (this.isValidJapaneseWord(word)) {
            wordCount[word] = (wordCount[word] || 0) + 1
          }
        })
        
        // 按频率排序，选择前几个
        const sortedWords = Object.entries(wordCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(entry => entry[0])
        
        sortedWords.forEach(word => {
          if (!vocabulary.some(v => v.japanese === word)) {
            const meaning = this.guessWordMeaning(word, '')
            if (meaning !== null) {
              vocabulary.push({
                japanese: word,
                romaji: this.generateBetterRomaji(word),
                chinese: meaning
              })
              console.log(`✅ 添加高频词汇: ${word} | ${this.generateBetterRomaji(word)} | ${meaning}`)
            }
          }
        })
      }
    }
    
    // 🎯 策略3：最后的兜底保障
    if (vocabulary.length === 0) {
      console.log('⚠️ 使用默认兜底词汇')
      vocabulary.push(
        { japanese: '今日', romaji: 'kyou', chinese: '今天' },
        { japanese: '自分', romaji: 'jibun', chinese: '自己' },
        { japanese: '時間', romaji: 'jikan', chinese: '时间' }
      )
    }
    
    console.log('🔄 最终词汇结果:')
    vocabulary.slice(0, 6).forEach((vocab, index) => {
      console.log(`  ${index + 1}. ${vocab.japanese} | ${vocab.romaji} | ${vocab.chinese}`)
    })
    
    return vocabulary.slice(0, 6) // 限制为6个词汇
  },

  // 智能分词方法
  smartExtractWords(sentence) {
    console.log('🎯 智能分词:', sentence)
    
    // 基于已知词汇库的分词
    const words = []
    let i = 0
    
    while (i < sentence.length) {
      let matched = false
      
      // 从长到短匹配
      for (let len = Math.min(5, sentence.length - i); len >= 1; len--) {
        const candidate = sentence.substr(i, len)
        
        if (this.isKnownWord(candidate) || this.isValidJapaneseWord(candidate)) {
          words.push(candidate)
          i += len
          matched = true
          break
        }
      }
      
      if (!matched) {
        i++
      }
    }
    
    return words.filter(w => w.length >= 2) // 过滤掉单个字符
  },

  // 验证是否为有效的日语词汇
  isValidJapaneseWord(word) {
    if (!word || word.length < 2) return false
    
    // 检查是否包含日语字符
    const hasJapanese = /[一-龯ひ-ゟァ-ヿー]/.test(word)
    if (!hasJapanese) return false
    
    // 排除纯助词
    const particles = ['から', 'まで', 'では', 'には', 'とは', 'への', 'での']
    if (particles.includes(word)) return false
    
    // 排除纯标点符号
    if (/^[。、！？]+$/.test(word)) return false
    
    return true
  },

  // 从单个句子中提取词汇
  extractWordsFromSentence(sentence) {
    console.log('🎯 分析句子:', sentence)
    
    // 基于常见词汇边界的简单分词
    const words = []
    let i = 0
    
    while (i < sentence.length) {
      let matched = false
      
      // 从长到短匹配常见词汇
      for (let len = Math.min(4, sentence.length - i); len >= 1; len--) {
        const candidate = sentence.substr(i, len)
        
        // 检查是否是已知词汇
        if (this.isKnownWord(candidate)) {
          words.push(candidate)
          i += len
          matched = true
          break
        }
      }
      
      // 如果没有匹配到，跳过当前字符
      if (!matched) {
        i++
      }
    }
    
    return words.filter(w => w.length > 0)
  },

  // 检查是否是已知词汇
  isKnownWord(word) {
    const knownWords = new Set([
      // 基础词汇
      '私', '僕', '君', '彼', '彼女', 'あなた',
      
      // 常用名词
      '学校', '先生', '学生', '友達', '家族', '家', '会社', '駅', '本', '車', '花', '犬', '猫',
      '今日', '明日', '昨日', '時間', '映画', '音楽', '料理', '写真', '電話',
      
      // 常用动词
      '行く', '来る', '見る', '聞く', '話す', '読む', '書く', '食べる', '飲む', '寝る', '起きる',
      '働く', '遊ぶ', '買う', '売る', '作る', '歌う', '踊る', '笑う', '泣く',
      
      // 动词变位
      '行きます', '来ます', '見ます', '聞きます', '話します', '読みます', '書きます',
      '食べます', '飲みます', '寝ます', '起きます',
      
      // 形容词
      '好き', '嫌い', '新しい', '古い', '大きい', '小さい', '高い', '安い',
      '美しい', '楽しい', '悲しい', '怖い', '暖かい', '寒い', '忙しい',
      
      // 其他
      '愛', '心', '夢', '希望', '平和', '自由', '幸せ', '健康', '勇気', '力', '声'
    ])
    
    return knownWords.has(word)
  },

  // 改进的罗马音生成
  generateBetterRomaji(japanese) {
    // 首先查找已知词汇的罗马音
    const knownRomaji = this.getKnownWordRomaji(japanese)
    if (knownRomaji) {
      return knownRomaji
    }
    
    // 对于假名，使用转换表
    return this.kanaToRomaji(japanese)
  },

  // 获取已知词汇的罗马音
  getKnownWordRomaji(word) {
    const wordRomajiMap = {
      // 人称代词
      '私': 'watashi',
      '僕': 'boku', 
      '君': 'kimi',
      '彼': 'kare',
      '彼女': 'kanojo',
      
      // 常用名词
      '学校': 'gakkou',
      '先生': 'sensei',
      '学生': 'gakusei',
      '友達': 'tomodachi',
      '家族': 'kazoku',
      '家': 'ie',
      '会社': 'kaisha',
      '駅': 'eki',
      '本': 'hon',
      '車': 'kuruma',
      '花': 'hana',
      '犬': 'inu',
      '猫': 'neko',
      '魚': 'sakana',
      '鳥': 'tori',
      
      // 时间词汇
      '今日': 'kyou',
      '明日': 'ashita',
      '昨日': 'kinou',
      '時間': 'jikan',
      '朝': 'asa',
      '昼': 'hiru',
      '夜': 'yoru',
      
      // 地点
      '図書館': 'toshokan',
      '公園': 'kouen',
      '病院': 'byouin',
      '部屋': 'heya',
      '教室': 'kyoushitsu',
      '台所': 'daidokoro',
      
      // 物品
      '映画': 'eiga',
      '音楽': 'ongaku',
      '料理': 'ryouri',
      '電話': 'denwa',
      '写真': 'shashin',
      '手紙': 'tegami',
      
      // 动词
      '行く': 'iku',
      '来る': 'kuru',
      '見る': 'miru',
      '聞く': 'kiku',
      '話す': 'hanasu',
      '読む': 'yomu',
      '書く': 'kaku',
      '食べる': 'taberu',
      '飲む': 'nomu',
      '寝る': 'neru',
      '起きる': 'okiru',
      '働く': 'hataraku',
      '遊ぶ': 'asobu',
      '買う': 'kau',
      '売る': 'uru',
      '作る': 'tsukuru',
      '歌う': 'utau',
      '踊る': 'odoru',
      '笑う': 'warau',
      '泣く': 'naku',
      
      // 动词变位
      '行きます': 'ikimasu',
      '来ます': 'kimasu',
      '見ます': 'mimasu',
      '聞きます': 'kikimasu',
      '話します': 'hanashimasu',
      '読みます': 'yomimasu',
      '書きます': 'kakimasu',
      '食べます': 'tabemasu',
      '飲みます': 'nomimasu',
      '寝ます': 'nemasu',
      '起きます': 'okimasu',
      
      // 形容词
      '好き': 'suki',
      '嫌い': 'kirai',
      '新しい': 'atarashii',
      '古い': 'furui',
      '大きい': 'ookii',
      '小さい': 'chiisai',
      '高い': 'takai',
      '安い': 'yasui',
      '美しい': 'utsukushii',
      '楽しい': 'tanoshii',
      '悲しい': 'kanashii',
      '怖い': 'kowai',
      '暖かい': 'atatakai',
      '寒い': 'samui',
      '忙しい': 'isogashii',
      
      // 其他常用词
      '愛': 'ai',
      '心': 'kokoro',
      '夢': 'yume',
      '希望': 'kibou',
      '平和': 'heiwa',
      '自由': 'jiyuu',
      '力': 'chikara',
      '声': 'koe',
      '目': 'me',
      '手': 'te',
      '足': 'ashi',
      
      // 颜色
      '赤': 'aka',
      '青': 'ao',
      '白': 'shiro',
      '黒': 'kuro',
      '緑': 'midori',
      '黄色': 'kiiro',
      
      // 数字
      '一': 'ichi',
      '二': 'ni',
      '三': 'san',
      '四': 'yon',
      '五': 'go',
      '六': 'roku',
      '七': 'nana',
      '八': 'hachi',
      '九': 'kyuu',
      '十': 'juu'
    }
    
    return wordRomajiMap[word] || null
  },

  // 假名转罗马音
  kanaToRomaji(kana) {
    const kanaMap = {
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
      'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
      'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
      'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
      'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
      'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po'
    }
    
    let romaji = ''
    for (let char of kana) {
      romaji += kanaMap[char] || char
    }
    return romaji || 'romaji'
  },

  // 词汇意思推测
  guessWordMeaning(word, wordType) {
    // 扩大词汇字典
    const commonWords = {
      // 人称代词
      '私': '我', '僕': '我', '俺': '我', '君': '你', '彼': '他', '彼女': '她', 
      'あなた': '你', 'みんな': '大家', '誰': '谁', '何': '什么',
      
      // 时间词汇
      '今日': '今天', '明日': '明天', '昨日': '昨天', '今': '现在', '時間': '时间',
      '朝': '早上', '昼': '中午', '夜': '晚上', '毎日': '每天', '週末': '周末',
      '春': '春天', '夏': '夏天', '秋': '秋天', '冬': '冬天',
      
      // 地点场所
      '学校': '学校', '家': '家', '会社': '公司', '駅': '车站', '病院': '医院',
      '図書館': '图书馆', '公園': '公园', '店': '店', 'レストラン': '餐厅',
      '部屋': '房间', '教室': '教室', '台所': '厨房',
      
      // 物品
      '本': '书', '映画': '电影', '音楽': '音乐', '料理': '料理', '車': '车',
      '電話': '电话', 'コンピュータ': '电脑', '写真': '照片', '手紙': '信',
      '花': '花', '犬': '狗', '猫': '猫', '魚': '鱼', '鳥': '鸟',
      
      // 人物关系
      '友達': '朋友', '家族': '家族', '先生': '老师', '学生': '学生',
      '母': '母亲', '父': '父亲', '兄': '哥哥', '姉': '姐姐', '弟': '弟弟', '妹': '妹妹',
      '子供': '孩子', '赤ちゃん': '婴儿',
      
      // 形容词
      '好き': '喜欢', '嫌い': '讨厌', '大切': '重要', '新しい': '新的', '古い': '旧的',
      '大きい': '大的', '小さい': '小的', '高い': '高的', '安い': '便宜的',
      '美しい': '美丽的', '楽しい': '快乐的', '悲しい': '悲伤的', '怖い': '可怕的',
      '暖かい': '温暖的', '寒い': '寒冷的', '忙しい': '忙碌的',
      
      // 动词（去掉语尾变化）
      '行く': '去', '来る': '来', '見る': '看', '聞く': '听', '話す': '说话',
      '読む': '读', '書く': '写', '食べる': '吃', '飲む': '喝', '寝る': '睡觉',
      '起きる': '起床', '勉強する': '学习', '働く': '工作', '遊ぶ': '玩',
      '買う': '买', '売る': '卖', '作る': '制作', '料理する': '做饭',
      '歌う': '唱歌', '踊る': '跳舞', '笑う': '笑', '泣く': '哭',
      
      // 动词变位（常见形式）
      '行きます': '去', '来ます': '来', '見ます': '看', '聞きます': '听',
      '話します': '说话', '読みます': '读', '書きます': '写', '食べます': '吃',
      '飲みます': '喝', '寝ます': '睡觉', '起きます': '起床',
      
      // 颜色
      '赤': '红色', '青': '蓝色', '黄色': '黄色', '緑': '绿色', '白': '白色', '黒': '黑色',
      
      // 数字
      '一': '一', '二': '二', '三': '三', '四': '四', '五': '五',
      '六': '六', '七': '七', '八': '八', '九': '九', '十': '十',
      
      // 其他常用词
      '愛': '爱', '心': '心', '夢': '梦想', '希望': '希望', '平和': '和平',
      '自由': '自由', '幸せ': '幸福', '健康': '健康', '勇気': '勇气',
      '力': '力量', '声': '声音', '目': '眼睛', '手': '手', '足': '脚'
    }
    
    // 助词列表 - 这些不应该出现在词汇表中
    const particles = ['に', 'の', 'は', 'が', 'を', 'で', 'と', 'から', 'まで', 'へ', 'より', 'か', 'も', 'だけ', 'ばかり', 'など', 'って', 'という', 'では', 'には', 'との', 'での']
    
    // 如果是助词，返回null（表示不包含在词汇表中）
    if (particles.includes(word)) {
      return null
    }
    
    // 语法词尾也不包含
    const grammarEndings = ['です', 'である', 'だ', 'ます', 'た', 'て', 'ない', 'ぬ', 'う', 'る', 'ている', 'ていた']
    if (grammarEndings.includes(word)) {
      return null
    }
    
    // 检查常用词汇
    if (commonWords[word]) {
      return commonWords[word]
    }
    
    // 词型推测也跳过助词
    if (wordType && wordType.includes('助词')) {
      return null
    }
    
    // 根据词性推测
    if (wordType) {
      if (wordType.includes('名词')) return '名词'
      if (wordType.includes('动词')) return '动词'
      if (wordType.includes('形容词')) return '形容词'
      if (wordType.includes('副词')) return '副词'
    }
    
    // 最后的兜底，但不是"待查词典"
    return '词汇'
  },

  // 简化的日语词汇提取 - 基于常见词汇模式
  segmentJapaneseSentence(sentence) {
    console.log('🔪 开始分词:', sentence)
    const words = []
    
    // 预定义常见词汇模式，按长度排序（长的优先匹配）
    const commonPatterns = [
      // 4字及以上
      '学校', '先生', '学生', '友達', '家族', '会社', '時間', '今日', '明日', '昨日',
      '映画', '音楽', '料理', '電話', '写真', '手紙', '図書館', '公園', 'レストラン',
      '美しい', '楽しい', '悲しい', '新しい', '古い', '大きい', '小さい', '暖かい', '寒い', '忙しい',
      '勉強する', '料理する', '行きます', '来ます', '見ます', '聞きます', '話します', '読みます', '書きます',
      '食べます', '飲みます', '寝ます', '起きます', 'コンピュータ',
      
      // 3字词汇
      '私', '僕', '君', '彼', '本', '車', '家', '花', '犬', '猫', '魚', '鳥', '母', '父', '兄', '姉', '弟', '妹',
      '部屋', '教室', '台所', '病院', '駅', '店', '赤', '青', '白', '黒', '緑', '愛', '心', '夢', '声', '目', '手', '足',
      '行く', '来る', '見る', '聞く', '読む', '書く', '話す', '食べる', '飲む', '寝る', '起きる', '働く', '遊ぶ',
      '買う', '売る', '作る', '歌う', '踊る', '笑う', '泣く', '好き', '嫌い', '高い', '安い', '怖い',
      
      // 2字词汇
      '今', '朝', '昼', '夜', '春', '夏', '秋', '冬', '力', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'
    ]
    
    let remaining = sentence
    let position = 0
    
    while (position < sentence.length) {
      let matched = false
      
      // 尝试匹配常见词汇模式
      for (const pattern of commonPatterns) {
        if (remaining.startsWith(pattern)) {
          words.push(pattern)
          remaining = remaining.substring(pattern.length)
          position += pattern.length
          matched = true
          break
        }
      }
      
      // 如果没有匹配到预定义词汇，单字符处理
      if (!matched) {
        const char = sentence[position]
        if (/[一-龯ひ-ゟァ-ヿー]/.test(char)) {
          words.push(char)
        }
        remaining = remaining.substring(1)
        position++
      }
    }
    
    console.log('🔪 分词结果:', words)
    return words.filter(w => w && w.trim().length > 0)
  },

  // 简单罗马音生成（兼容旧代码）
  generateSimpleRomaji(japanese) {
    return this.generateBetterRomaji(japanese)
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


  // 清空内容
  clearContent() {
    this.setData({
      inputText: '',
      originalInputText: '', // 清空原始文本
      imageUrl: '',
      cloudImageUrl: '', // 清空云存储URL
      userInputTitle: '',
      articleTitle: '',
      extractedImageText: '',
      analysisResult: [],
      showResult: false
    })
  },


  // 保存解析结果到数据库
  async saveParseResult(data) {
    try {
      // 先检查是否已存在相同内容的记录
      const isDuplicate = await this.checkDuplicateRecord(data)
      if (isDuplicate) {
        // console.log('检测到重复记录，跳过保存')
        wx.showToast({
          title: '该内容已存在',
          icon: 'none',
          duration: 1500
        })
        return
      }
      
      // 生成友好的标题摘要
      let title = ''
      if (data.inputMethod === 'image') {
        title = data.articleTitle || data.inputText || '图片解析'
      } else {
        // 文本模式：使用前20个字符作为标题
        title = data.inputText ? data.inputText.substring(0, 20) : '文本解析'
        if (data.inputText && data.inputText.length > 20) {
          title += '...'
        }
      }
      
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
      
      // 检查数据大小（单条记录不能超过1MB）
      const dataSize = JSON.stringify(saveData).length
      // console.log('准备保存的数据大小:', dataSize, '字节')
      
      if (dataSize > 1024 * 1024) {
        wx.showModal({
          title: '数据过大',
          content: '解析内容过多，单条记录超过1MB限制。建议分段解析。',
          showCancel: false
        })
        return
      }
      
      // console.log('准备保存到云数据库的完整数据:', JSON.stringify(saveData, null, 2))
      
      const res = await this.db.collection('japanese_parser_history').add({
        data: saveData
      })
      
      // console.log('云数据库保存成功:', res)
      // console.log('保存的记录ID:', res._id)
      // console.log('保存的数据摘要:', {
      //   inputMethod: saveData.inputMethod,
      //   hasImageUrl: !!saveData.imageUrl,
      //   title: saveData.title,
      //   sentencesCount: saveData.sentences?.length
      // })
      
      wx.showToast({
        title: '已保存到历史',
        icon: 'success',
        duration: 1500
      })
      
      // 保存成功后，延迟刷新历史页面（如果存在）
      setTimeout(() => {
        const pages = getCurrentPages()
        const historyPage = pages.find(page => page.route === 'pages/parser-history/parser-history')
        if (historyPage) {
          // console.log('刷新历史页面')
          historyPage.loadHistory()
        }
      }, 500)
      
    } catch (error) {
      console.error('云数据库保存失败:', error)
      console.error('错误代码:', error.errCode)
      console.error('错误信息:', error.errMsg)
      
      // 根据错误类型提供具体提示
      let errorMessage = '云端保存失败，'
      
      if (error.errCode === -502001) {
        errorMessage += '数据库连接失败'
      } else if (error.errCode === -502002) {
        errorMessage += '网络超时'
      } else if (error.errCode === -502003) {
        errorMessage += '权限不足'
      } else if (error.errCode === -502005) {
        errorMessage += '数据格式错误'
      } else if (error.errMsg && error.errMsg.includes('limit exceeded')) {
        errorMessage += '数据量超限'
      } else if (error.errMsg && error.errMsg.includes('network')) {
        errorMessage += '网络连接异常'
      } else {
        errorMessage += '未知错误'
      }
      
      // 显示错误提示
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      })
      
      // 所有错误情况都尝试使用本地存储
      // console.log('使用本地存储作为备选方案')
      
      // 延迟执行本地存储，避免toast重叠
      setTimeout(() => {
        this.saveToLocalStorage(data)
      }, 500)
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
      } else if (data.inputMethod === 'image') {
        // 图片输入：检查用户输入的标题或提取的文本
        const imageIdentifier = data.articleTitle || data.extractedText || data.inputText
        if (imageIdentifier) {
          // 使用图片标识进行重复检测
          query.articleTitle = imageIdentifier.trim()
          query.inputMethod = 'image'
        } else if (data.analysisResult && data.analysisResult.length > 0) {
          // 备用方案：检查第一个句子的原文
          const firstSentence = data.analysisResult[0].originalText
          if (firstSentence) {
            query['sentences.0.originalText'] = firstSentence
            query.inputMethod = 'image'
          }
        }
      }
      
      if (Object.keys(query).length === 0) {
        return false // 无法构建查询条件，允许保存
      }
      
      // 查询最近24小时内的记录（避免误判太久远的记录）
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      query.createTime = db.command.gte(yesterday)
      
      // console.log('重复检查查询条件:', query)
      
      const res = await db.collection('japanese_parser_history')
        .where(query)
        .limit(1)
        .get()
      
      const isDuplicate = res.data.length > 0
      // console.log('重复检查结果:', isDuplicate)
      
      return isDuplicate
    } catch (error) {
      console.error('重复检查失败:', error)
      return false // 检查失败时允许保存
    }
  },

  // 本地存储备选方案
  saveToLocalStorage(data) {
    try {
      // 检查本地存储空间
      const storageInfo = wx.getStorageInfoSync()
      const usedMB = (storageInfo.currentSize / 1024).toFixed(2)
      const limitMB = (storageInfo.limitSize / 1024).toFixed(2)
      
      // console.log('本地存储信息:', {
      //   currentSize: storageInfo.currentSize,
      //   limitSize: storageInfo.limitSize,
      //   keys: storageInfo.keys.length,
      //   usedMB,
      //   limitMB
      // })
      
      // 如果存储空间超过8MB（留2MB余量），清理旧数据
      if (storageInfo.currentSize > 8 * 1024) {
        // console.log('本地存储空间不足，清理旧数据')
        
        // 提示用户正在清理
        wx.showToast({
          title: `存储空间不足(${usedMB}/${limitMB}MB)，正在清理...`,
          icon: 'loading',
          duration: 1500
        })
        
        this.cleanOldLocalStorage()
      }
      
      // 获取现有本地历史记录
      const localHistory = wx.getStorageSync('parser_history') || []
      
      // 限制本地存储最多100条记录
      if (localHistory.length >= 100) {
        // console.log('本地记录数超限，删除最旧的记录')
        // 删除最旧的10条
        localHistory.splice(0, 10)
      }
      
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
        // console.log('本地存储检测到重复记录，跳过保存')
        wx.showToast({
          title: '该内容已存在',
          icon: 'none',
          duration: 1500
        })
        return
      }
      
      // 生成友好的标题摘要
      let title = ''
      if (data.inputMethod === 'image') {
        title = data.articleTitle || data.inputText || '图片解析'
      } else {
        // 文本模式：使用前20个字符作为标题
        title = data.inputText ? data.inputText.substring(0, 20) : '文本解析'
        if (data.inputText && data.inputText.length > 20) {
          title += '...'
        }
      }
      
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
      
      // console.log('准备保存到本地的数据:', {
      //   id: saveData._id,
      //   inputMethod: saveData.inputMethod,
      //   hasImageUrl: !!saveData.imageUrl,
      //   title: saveData.title,
      //   sentencesCount: saveData.sentences?.length
      // })
      
      localHistory.unshift(saveData) // 添加到开头
      
      // 限制最多保存50条
      if (localHistory.length > 50) {
        localHistory.splice(50)
      }
      
      // 保存到本地
      wx.setStorageSync('parser_history', localHistory)
      
      // console.log('本地保存成功，当前记录数:', localHistory.length)
      
      // 显示详细的保存状态
      wx.showModal({
        title: '保存成功',
        content: '由于云端连接失败，已将解析结果保存到本地缓存。下次联网时会自动同步到云端。',
        confirmText: '查看历史',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            // 跳转到历史页面
            wx.switchTab({
              url: '/pages/parser-history/parser-history'
            })
          }
        }
      })
      
      // 历史记录功能已移至独立页面
    } catch (error) {
      console.error('本地存储失败:', error)
      
      let errorMessage = '本地保存失败：'
      if (error.errMsg && error.errMsg.includes('exceed')) {
        errorMessage = '存储空间不足，请清理缓存'
      } else if (error.errMsg && error.errMsg.includes('fail')) {
        errorMessage = '存储权限异常'
      } else {
        errorMessage = '保存失败，请重试'
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 查看历史记录
  viewHistory() {
    wx.switchTab({
      url: '/pages/parser-history/parser-history'
    })
  },



  // 清理旧的本地存储
  cleanOldLocalStorage() {
    try {
      const storageInfo = wx.getStorageInfoSync()
      const keys = storageInfo.keys
      
      // 清理一些不重要的缓存
      const cacheKeys = keys.filter(key => 
        key.includes('cache') || 
        key.includes('temp') || 
        key.includes('logs')
      )
      
      cacheKeys.forEach(key => {
        wx.removeStorageSync(key)
      })
      
      // 如果还是不够，删除最旧的解析记录
      const localHistory = wx.getStorageSync('parser_history') || []
      if (localHistory.length > 50) {
        // 只保留最新的50条
        const newHistory = localHistory.slice(-50)
        wx.setStorageSync('parser_history', newHistory)
        // console.log(`清理本地历史记录，从${localHistory.length}条减少到${newHistory.length}条`)
      }
    } catch (error) {
      console.error('清理本地存储失败:', error)
    }
  },

  // 简化处理方法 - 当批处理超时时使用
  async simplifiedProcessing(inputText) {
    try {
      // 保存原始文本用于显示
      this.setData({ originalInputText: inputText })
      
      wx.showLoading({ title: '简化处理中...' })
      
      // 只取前面部分文本进行处理（避免超时）
      const lines = inputText.split('\n').filter(line => line.trim())
      const maxLines = 10  // 最多处理10行
      const simplifiedText = lines.slice(0, maxLines).join('\n')
      
      if (lines.length > maxLines) {
        wx.showToast({
          title: `已简化为前${maxLines}行处理`,
          icon: 'none',
          duration: 2000
        })
      }
      
      // 使用快速云函数处理简化文本
      const res = await wx.cloud.callFunction({
        name: 'azure-gpt4o',
        data: {
          action: 'grammar',
          sentence: simplifiedText
        }
      })
      
      let result
      if (res.result.success) {
        result = res.result.data.analysis
      } else {
        throw new Error(res.result.error || '简化处理失败')
      }
      
      // 解析结果
      const inputType = this.detectInputType(simplifiedText)
      let analysisResult, articleTitle = ''
      
      if (inputType === 'word' || inputType === 'wordlist') {
        analysisResult = this.parseWordResponse(result)
      } else {
        const parseResult = this.parseSentenceResponse(result)
        analysisResult = parseResult.sentences
        articleTitle = parseResult.title
      }
      
      // 显示结果
      this.setData({
        analysisResult: analysisResult || [],
        showResult: true,
        isAnalyzing: false
      })
      
      // 保存到历史（标记为简化处理）
      const saveData = {
        inputText: simplifiedText,
        inputMethod: 'text',
        imageUrl: '',
        extractedText: '',
        articleTitle: this.data.articleTitle || articleTitle,
        title: '简化处理结果',
        analysisResult: analysisResult || []
      }
      
      this.saveParseResult(saveData)
      
      wx.hideLoading()
      wx.showToast({
        title: '简化处理完成',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('简化处理失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '简化处理失败',
        icon: 'none'
      })
      this.setData({
        isAnalyzing: false
      })
    }
  },
  
  // 进入复习模式
  enterReviewMode() {
    // 跳转到复习页面，传递收藏的解析记录
    wx.navigateTo({
      url: '/packageB/pages/parser-review/parser-review'
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
    // 先保存原始文本
    this.setData({ originalInputText: text })
    
    const lines = text.split('\n').filter(line => line.trim())
    const BATCH_SIZE = 4 // 每批处理4行
    
    console.log(`歌词分批处理：共${lines.length}行，每批${BATCH_SIZE}行`)
    
    // 使用统一的分段函数
    const batches = this.splitTextIntoSegments(text, BATCH_SIZE)
    
    // console.log(`歌词共${lines.length}行，分成${batches.length}批处理`)
    
    const allSentences = []
    let successCount = 0
    let failCount = 0
    
    // 简化的逐批处理
    for (let i = 0; i < batches.length; i++) {
      wx.showLoading({ 
        title: `解析中 ${i + 1}/${batches.length}`,
        mask: true
      })
      
      try {
        const res = await wx.cloud.callFunction({
          name: 'azure-gpt4o',
          data: {
            action: 'grammar',
            sentence: batches[i]
          }
        })
        
        // 简化聚合：成功则解析，失败则本地处理
        const batchResult = res.result.success 
          ? this.parseBatchResult(res.result.data.analysis, batches[i])
          : this.parseLocalBatch(batches[i])
        
        allSentences.push(...batchResult)
        res.result.success ? successCount++ : failCount++
        
      } catch (error) {
        console.error(`第${i + 1}批处理出错:`, error)
        allSentences.push(...this.parseLocalBatch(batches[i]))
        failCount++
      }
      
      // 批次间延迟
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
    // console.log('批处理完成，不自动保存')
    
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
      analysisResult: analysisResult.sentences, // 只保存句子数组
      showResult: true,
      // 保留原始输入文本，确保不被覆盖
      originalInputText: text // 新增：保存原始完整文本
    })
  },
  
  // 解析批次结果 - 简化版
  parseBatchResult(analysisText, originalText) {
    // 简单策略：直接使用现有的parseSentenceResponse方法
    const parsed = this.parseSentenceResponse(analysisText)
    
    // 如果解析成功，直接返回句子
    if (parsed && parsed.sentences && parsed.sentences.length > 0) {
      return parsed.sentences
    }
    
    // 如果解析失败，使用简单的行分割
    const lines = originalText.split('\n').filter(line => line.trim())
    return lines.map((line, index) => ({
      index: index + 1,
      originalText: line,
      romaji: this.extractFurigana(line),
      translation: `需要翻译: ${line}`,
      structure: '歌词行',
      analysis: `第${index + 1}行歌词`,
      grammar: '',
      vocabulary: []
    }))
  },
  
  // 本地解析批次（降级方案）- 简化版
  parseLocalBatch(text) {
    // 直接按行分割，每行作为一个句子
    const lines = text.split('\n').filter(line => line.trim())
    return lines.map((line, index) => ({
      index: index + 1,
      originalText: line,
      romaji: this.extractFurigana(line),
      translation: '云函数不可用，需手动翻译',
      structure: '歌词行',
      analysis: `离线处理第${index + 1}行`,
      grammar: '',
      vocabulary: []
    }))
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
        // console.log('歌词解析结果已存在，跳过保存')
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
      // console.log('已保存到历史记录')
    } catch (error) {
      console.error('保存到历史失败:', error)
    }
  },
  
  // 词汇整合到学习库
  async integrateVocabularyToLearning(parseData) {
    try {
      console.log('🧠 开始整合词汇到学习库...')
      
      // 调用词汇整合云函数
      const result = await wx.cloud.callFunction({
        name: 'vocabulary-integration',
        data: {
          action: 'integrate_new_record',
          recordId: parseData.recordId || parseData._id
        }
      })
      
      if (result.result.success) {
        console.log('✅ 词汇整合成功:', result.result)
        
        // 显示成功提示
        if (result.result.addedCount > 0 || result.result.updatedCount > 0) {
          wx.showToast({
            title: `已整合${result.result.addedCount + result.result.updatedCount}个词汇`,
            icon: 'success',
            duration: 2000
          })
        }
      } else {
        console.warn('⚠️ 词汇整合失败:', result.result.error)
      }
      
    } catch (error) {
      console.error('❌ 词汇整合调用失败:', error)
      // 不显示错误提示，静默失败
    }
  },

  // 句子结构增量整合到学习库
  async integrateStructuresToLearning(parseData) {
    try {
      console.log('📖 开始增量整合句子结构到学习库...')
      
      if (!parseData.analysisResult || parseData.analysisResult.length === 0) {
        console.log('📖 没有解析结果，跳过句子结构整合')
        return
      }
      
      const db = wx.cloud.database()
      const structureMap = new Map()
      const currentTime = new Date()
      
      // 提取当前解析结果中的句子结构
      parseData.analysisResult.forEach((sentence, sentenceIndex) => {
        // 提取句子结构
        if (sentence.structure && sentence.structure.trim() && 
            sentence.structure !== '处理失败' && sentence.structure.length > 2) {
          const structureKey = sentence.structure.trim()
          
          if (!structureMap.has(structureKey)) {
            structureMap.set(structureKey, {
              structure: structureKey,
              examples: [],
              category: this.categorizeStructure(structureKey),
              difficulty: this.calculateDifficulty(structureKey),
              tags: ['句子结构'],
              currentExample: {
                jp: sentence.originalText,
                romaji: sentence.romaji || '',
                cn: sentence.translation,
                source: parseData.articleTitle || '解析记录',
                sentenceIndex: sentenceIndex
              }
            })
          }
        }
        
        // 提取语法点
        if (sentence.grammar) {
          const grammarPoints = this.extractGrammarPoints(sentence.grammar)
          
          grammarPoints.forEach(grammarPoint => {
            const grammarKey = grammarPoint.trim()
            
            if (grammarKey && grammarKey.length > 2) {
              if (!structureMap.has(grammarKey)) {
                structureMap.set(grammarKey, {
                  structure: grammarKey,
                  examples: [],
                  category: 'grammar_point',
                  difficulty: this.calculateDifficulty(grammarKey),
                  tags: ['语法要点'],
                  currentExample: {
                    jp: sentence.originalText,
                    romaji: sentence.romaji || '',
                    cn: sentence.translation,
                    source: parseData.articleTitle || '解析记录',
                    sentenceIndex: sentenceIndex
                  }
                })
              }
            }
          })
        }
      })
      
      console.log(`📖 提取到${structureMap.size}个句子结构`)
      
      // 逐个处理句子结构
      let updatedCount = 0
      let addedCount = 0
      
      for (const [structureKey, newStructureData] of structureMap) {
        try {
          // 检查是否已存在
          const existingRes = await db.collection('sentence_structures_integrated')
            .where({ structure: structureKey })
            .limit(1)
            .get()
          
          if (existingRes.data.length > 0) {
            // 已存在，智能合并更新
            const existing = existingRes.data[0]
            const updatedExamples = [...(existing.examples || [])]
            const updatedSources = new Set([...(existing.sources || [])])
            
            // 添加新例句（严格去重）
            const newExample = newStructureData.currentExample
            const isExampleExists = updatedExamples.some(ex => 
              ex.jp === newExample.jp && ex.cn === newExample.cn
            )
            
            if (!isExampleExists) {
              updatedExamples.push(newExample)
            }
            
            // 更新来源（如果有recordId）
            if (newExample.recordId) {
              updatedSources.add(newExample.recordId)
            }
            
            await db.collection('sentence_structures_integrated')
              .doc(existing._id)
              .update({
                data: {
                  examples: updatedExamples,
                  sources: Array.from(updatedSources),
                  totalOccurrences: updatedExamples.length,
                  lastSeen: currentTime,
                  // 保持原有的firstSeen
                  firstSeen: existing.firstSeen || currentTime
                }
              })
            
            updatedCount++
            console.log(`📖 智能合并更新: ${structureKey} (${updatedExamples.length}个例句)`)
            
          } else {
            // 不存在，新增
            const newStructure = {
              structure: structureKey,
              examples: [newStructureData.currentExample],
              sources: [],
              totalOccurrences: 1,
              firstSeen: currentTime,
              lastSeen: currentTime,
              category: newStructureData.category,
              difficulty: newStructureData.difficulty,
              tags: newStructureData.tags
            }
            
            await db.collection('sentence_structures_integrated').add({
              data: newStructure
            })
            
            addedCount++
            console.log(`📖 新增句子结构: ${structureKey}`)
          }
          
        } catch (error) {
          console.error(`📖 处理句子结构失败: ${structureKey}`, error)
        }
      }
      
      console.log(`📖 句子结构增量整合完成: 新增${addedCount}个, 更新${updatedCount}个`)
      
      // 显示成功提示
      if (addedCount > 0 || updatedCount > 0) {
        wx.showToast({
          title: `已整合${addedCount + updatedCount}个句子结构`,
          icon: 'success',
          duration: 1500
        })
      }
      
      // 通知首页刷新统计
      setTimeout(() => {
        const pages = getCurrentPages()
        const indexPage = pages.find(page => page.route === 'pages/index/index')
        if (indexPage && indexPage.loadStructureStats) {
          indexPage.loadStructureStats()
        }
      }, 1000)
      
    } catch (error) {
      console.error('📖 句子结构增量整合失败:', error)
    }
  },

  // 辅助方法：分类句子结构
  categorizeStructure(structure) {
    if (structure.includes('は') || structure.includes('が') || structure.includes('を')) {
      return 'sentence_structure'
    }
    if (structure.includes('形') || structure.includes('动词') || structure.includes('名词')) {
      return 'grammar_point'
    }
    if (structure.includes('修饰') || structure.includes('连接') || structure.includes('表示')) {
      return 'analysis_point'
    }
    return 'sentence_structure'
  },

  // 辅助方法：计算难度
  calculateDifficulty(structure) {
    const length = structure.length
    if (length <= 10) return 'basic'
    if (length <= 25) return 'intermediate'
    return 'advanced'
  },

  // 辅助方法：提取语法点
  extractGrammarPoints(grammarText) {
    if (!grammarText) return []
    
    const points = []
    const lines = grammarText.split(/[。\n•・]/g)
      .filter(line => line.trim())
      .map(line => line.trim())
    
    lines.forEach(line => {
      if (line.length > 2 && line.length < 100) {
        points.push(line)
      }
    })
    
    return points
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '日语解析工具 - 语伴君',
      path: '/pages/japanese-parser/japanese-parser'
    }
  }
})