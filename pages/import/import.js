// 词汇导入页面
Page({
  data: {
    fileContent: '',
    wordCount: 0,
    importing: false,
    importProgress: 0,
    previewWords: []
  },

  onLoad() {
    wx.cloud.init({
      env: 'cloud1-2g49srond2b01891'
    })
  },

  // 选择文件
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json', 'csv', 'txt'],
      success: (res) => {
        console.log('选择文件成功:', res)
        const file = res.tempFiles[0]
        this.parseFile(file)
      },
      fail: (err) => {
        console.error('选择文件失败:', err)
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        })
      }
    })
  },

  // 解析文件
  async parseFile(file) {
    wx.showLoading({
      title: '解析文件中...'
    })

    try {
      // 读取文件内容
      const fs = wx.getFileSystemManager()
      const content = fs.readFileSync(file.path, 'utf-8')
      
      let words = []
      
      // 根据文件扩展名解析
      if (file.name.endsWith('.json')) {
        words = this.parseJSON(content)
      } else if (file.name.endsWith('.csv')) {
        words = this.parseCSV(content)
      } else if (file.name.endsWith('.txt')) {
        words = this.parseTXT(content)
      }
      
      if (words.length > 0) {
        this.setData({
          fileContent: content,
          wordCount: words.length,
          previewWords: words.slice(0, 5) // 预览前5个
        })
        
        // 存储到临时数据
        this.words = words
        
        wx.hideLoading()
        wx.showToast({
          title: `解析成功，共${words.length}个词汇`,
          icon: 'none'
        })
      } else {
        throw new Error('未能解析出词汇')
      }
      
    } catch (error) {
      console.error('解析文件失败:', error)
      wx.hideLoading()
      wx.showModal({
        title: '解析失败',
        content: error.message || '文件格式不正确',
        showCancel: false
      })
    }
  },

  // 解析JSON格式
  parseJSON(content) {
    try {
      const data = JSON.parse(content)
      
      // 支持两种格式：直接数组或包含words字段的对象
      let words = Array.isArray(data) ? data : (data.words || data.vocabulary || [])
      
      // 验证和标准化格式
      return words.map(word => this.standardizeWord(word))
    } catch (err) {
      throw new Error('JSON格式错误')
    }
  },

  // 解析CSV格式
  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV文件至少需要包含标题行和数据行')
    
    const headers = lines[0].split(',').map(h => h.trim())
    const words = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const word = {}
      
      headers.forEach((header, index) => {
        word[header] = values[index] || ''
      })
      
      try {
        words.push(this.standardizeWord(word))
      } catch (err) {
        console.warn(`跳过第${i + 1}行：`, err.message)
      }
    }
    
    return words
  },

  // 解析TXT格式（简单格式：每行一个词汇）
  parseTXT(content) {
    const lines = content.split('\n').filter(line => line.trim())
    const words = []
    
    for (const line of lines) {
      // 支持格式：单词 假名 意思
      const parts = line.split(/\s+/)
      
      if (parts.length >= 3) {
        try {
          words.push(this.standardizeWord({
            word: parts[0],
            kana: parts[1],
            meaning: parts.slice(2).join(' ')
          }))
        } catch (err) {
          console.warn(`跳过行：${line}`)
        }
      }
    }
    
    return words
  },

  // 标准化词汇格式
  standardizeWord(word) {
    // 必需字段
    if (!word.word || !word.meaning) {
      throw new Error('缺少必需字段：word 或 meaning')
    }
    
    return {
      word: word.word || word.単語 || word.kanji,
      kana: word.kana || word.仮名 || word.reading || '',
      romaji: word.romaji || word.ローマ字 || '',
      meaning: word.meaning || word.意味 || word.chinese || word.translation,
      type: word.type || word.品詞 || '名词',
      level: word.level || word.レベル || 'N2',
      examples: this.parseExamples(word.examples || word.例文 || []),
      tags: this.parseTags(word.tags || word.タグ || []),
      random: Math.random()
    }
  },

  // 解析例句
  parseExamples(examples) {
    if (!examples) return []
    
    if (typeof examples === 'string') {
      // 如果是字符串，尝试分割
      return examples.split(';').map(ex => {
        const parts = ex.split('/')
        return {
          jp: parts[0] || '',
          cn: parts[1] || ''
        }
      })
    }
    
    if (Array.isArray(examples)) {
      return examples.map(ex => {
        if (typeof ex === 'string') {
          const parts = ex.split('/')
          return {
            jp: parts[0] || '',
            cn: parts[1] || ''
          }
        }
        return {
          jp: ex.jp || ex.japanese || '',
          cn: ex.cn || ex.chinese || ''
        }
      })
    }
    
    return []
  },

  // 解析标签
  parseTags(tags) {
    if (!tags) return []
    
    if (typeof tags === 'string') {
      return tags.split(/[,;]/).map(t => t.trim()).filter(t => t)
    }
    
    if (Array.isArray(tags)) {
      return tags
    }
    
    return []
  },

  // 开始导入
  async startImport() {
    if (!this.words || this.words.length === 0) {
      wx.showToast({
        title: '请先选择文件',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认导入',
      content: `确定要导入${this.words.length}个词汇吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doImport()
        }
      }
    })
  },

  // 执行导入
  async doImport() {
    this.setData({
      importing: true,
      importProgress: 0
    })
    
    const db = wx.cloud.database()
    const collection = db.collection('n2_vocabulary')
    const total = this.words.length
    let successCount = 0
    let failCount = 0
    
    // 分批导入，每批10个
    const batchSize = 10
    
    for (let i = 0; i < total; i += batchSize) {
      const batch = this.words.slice(i, Math.min(i + batchSize, total))
      
      try {
        // 并行插入当前批次
        await Promise.all(
          batch.map(async (word) => {
            try {
              await collection.add({
                data: {
                  ...word,
                  createTime: db.serverDate(),
                  updateTime: db.serverDate()
                }
              })
              successCount++
            } catch (err) {
              console.error('插入失败:', word.word, err)
              failCount++
            }
          })
        )
        
        // 更新进度
        const progress = Math.round(((i + batch.length) / total) * 100)
        this.setData({
          importProgress: progress
        })
        
      } catch (err) {
        console.error('批次导入失败:', err)
      }
    }
    
    this.setData({
      importing: false
    })
    
    // 显示结果
    wx.showModal({
      title: '导入完成',
      content: `成功导入${successCount}个词汇${failCount > 0 ? `，失败${failCount}个` : ''}`,
      showCancel: false,
      success: () => {
        if (successCount > 0) {
          // 返回学习页面
          wx.switchTab({
            url: '/pages/learn/learn'
          })
        }
      }
    })
  },

  // 下载模板
  downloadTemplate() {
    const template = [
      {
        word: '影響',
        kana: 'えいきょう',
        romaji: 'eikyou',
        meaning: '影响',
        type: '名词',
        level: 'N2',
        examples: [
          { jp: '悪い影響を与える。', cn: '产生不良影响。' }
        ],
        tags: ['因果', '重要']
      },
      {
        word: '解決',
        kana: 'かいけつ',
        romaji: 'kaiketsu',
        meaning: '解决',
        type: '名词',
        level: 'N2',
        examples: [
          { jp: '問題を解決する。', cn: '解决问题。' }
        ],
        tags: ['处理']
      }
    ]
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: JSON.stringify(template, null, 2),
      success: () => {
        wx.showToast({
          title: '模板已复制到剪贴板',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }
})