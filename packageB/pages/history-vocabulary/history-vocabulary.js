// pages/history-vocabulary/history-vocabulary.js
const app = getApp()

// 初始化云环境
wx.cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

Page({
  data: {
    vocabularyList: [],
    selectedWords: [],
    selectAll: false,
    loading: true,
    searchKeyword: '',
    filteredList: []
  },

  onLoad() {
    const vocabularyList = app.globalData.historyVocabulary || []
    
    if (vocabularyList.length === 0) {
      wx.showToast({
        title: '没有找到词汇',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 按日文字母排序
    vocabularyList.sort((a, b) => a.japanese.localeCompare(b.japanese))

    this.setData({
      vocabularyList,
      loading: false
    })
    this.updateFilteredList(vocabularyList)
  },

  // 判断词汇是否被选中
  isWordSelected(japanese) {
    return this.data.selectedWords.some(w => w.japanese === japanese)
  },

  // 搜索词汇
  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase()
    this.setData({ searchKeyword: keyword })
    
    if (!keyword) {
      this.updateFilteredList(this.data.vocabularyList)
      return
    }

    const filtered = this.data.vocabularyList.filter(word => 
      word.japanese.toLowerCase().includes(keyword) ||
      word.romaji.toLowerCase().includes(keyword) ||
      word.chinese.toLowerCase().includes(keyword)
    )

    this.updateFilteredList(filtered)
  },

  // 更新过滤列表并标记选中状态
  updateFilteredList(list) {
    const selectedMap = {}
    this.data.selectedWords.forEach(word => {
      selectedMap[word.japanese] = true
    })

    const processedList = list.map(item => ({
      ...item,
      isSelected: !!selectedMap[item.japanese]
    }))

    this.setData({ filteredList: processedList })
  },

  // 选择/取消选择单个词汇
  onSelectWord(e) {
    const { index } = e.currentTarget.dataset
    const word = this.data.filteredList[index]
    const selectedWords = [...this.data.selectedWords]
    
    const existingIndex = selectedWords.findIndex(w => w.japanese === word.japanese)
    
    if (existingIndex > -1) {
      selectedWords.splice(existingIndex, 1)
    } else {
      selectedWords.push(word)
    }

    this.setData({
      selectedWords,
      selectAll: selectedWords.length === this.data.filteredList.length
    })
    
    // 更新过滤列表的选中状态
    this.updateFilteredList(this.data.filteredList.map(item => ({
      ...item,
      isSelected: undefined // 清除旧状态
    })))
  },

  // 全选/取消全选
  onSelectAll() {
    const selectAll = !this.data.selectAll
    const selectedWords = selectAll ? [...this.data.filteredList] : []

    this.setData({
      selectAll,
      selectedWords
    })
    
    // 更新过滤列表的选中状态
    this.updateFilteredList(this.data.filteredList.map(item => ({
      ...item,
      isSelected: undefined // 清除旧状态
    })))
  },

  // 加入学习计划
  async addToStudyPlan() {
    if (this.data.selectedWords.length === 0) {
      wx.showToast({
        title: '请选择要学习的词汇',
        icon: 'none'
      })
      return
    }

    // 显示确认对话框
    const confirmRes = await new Promise((resolve) => {
      wx.showModal({
        title: '确认添加',
        content: `确定要将选中的 ${this.data.selectedWords.length} 个词汇加入到学习计划吗？\n\n注意：这些词汇将被保存到用户学习记录中。`,
        success: resolve
      })
    })

    if (!confirmRes.confirm) {
      return
    }

    wx.showLoading({
      title: '添加中...'
    })

    const db = wx.cloud.database()
    
    // 获取完整的解析记录信息
    const recordPromises = this.data.selectedWords.map(async (word) => {
      try {
        const recordRes = await db.collection('japanese_parser_history')
          .doc(word.sourceRecordId)
          .get()
        return { word, record: recordRes.data }
      } catch (err) {
        console.error('获取原始记录失败：', err)
        return { word, record: null }
      }
    })

    const recordsData = await Promise.all(recordPromises)

    // 转换为学习计划的格式
    const studyWords = recordsData.map(({ word, record }) => {
      // 寻找包含该词汇的句子
      let sourceContext = {
        originalSentence: '',
        translation: '',
        grammar: '',
        analysis: ''
      }

      if (record && record.sentences) {
        const sentence = record.sentences.find(s => 
          s.vocabulary && s.vocabulary.some(v => v.japanese === word.japanese)
        )
        if (sentence) {
          sourceContext = {
            originalSentence: sentence.originalText || '',
            translation: sentence.translation || '',
            grammar: sentence.grammar || '',
            analysis: sentence.analysis || '',
            structure: sentence.structure || ''
          }
        }
      }

      // 创建简单的假名映射（后续可以扩展）
      const kanaMap = {
        '私': 'わたし',
        '学生': 'がくせい',
        '今日': 'きょう',
        '良い': 'よい',
        '天気': 'てんき',
        '時間': 'じかん',
        '友達': 'ともだち',
        '本': 'ほん',
        '日本': 'にほん',
        '語': 'ご'
      }
      
      return {
        word: word.japanese,
        kana: kanaMap[word.japanese] || word.japanese,  // 使用假名映射，如果没有则使用原文
        romaji: word.romaji,
        meaning: word.chinese,
        type: '词汇',
        level: 'N5',
        examples: sourceContext.originalSentence ? [{
          jp: sourceContext.originalSentence,
          cn: sourceContext.translation
        }] : [],
        tags: ['解析词汇'],
        random: Math.random(),
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        source: 'history',
        sourceRecordId: word.sourceRecordId,
        // 新增：保存语法和解析信息
        grammar: sourceContext.grammar,
        analysis: sourceContext.analysis,
        structure: sourceContext.structure,
        context: {
          originalSentence: sourceContext.originalSentence,
          translation: sourceContext.translation
        }
      }
    })

    // 批量插入到词汇数据库
    const promises = studyWords.map(async (word) => {
      try {
        // 先检查是否已存在
        const res = await db.collection('n2_vocabulary')
          .where({
            word: word.word
          })
          .get()
        
        if (res.data.length === 0) {
          // 不存在则插入
          const addRes = await db.collection('n2_vocabulary').add({
            data: word
          })
          return { success: true, word: word.word, id: addRes._id, action: 'added' }
        } else {
          // 已存在则更新（覆盖旧数据以包含新的语法信息）
          const existingId = res.data[0]._id
          await db.collection('n2_vocabulary').doc(existingId).update({
            data: {
              ...word,
              updateTime: db.serverDate()
            }
          })
          return { success: true, word: word.word, id: existingId, action: 'updated' }
        }
      } catch (error) {
        console.error('处理词汇失败：', word.word, error)
        return { error: true, word: word.word, message: error.message }
      }
    })

    Promise.all(promises)
      .then(results => {
        wx.hideLoading()
        
        const added = results.filter(r => r.success && r.action === 'added').length
        const updated = results.filter(r => r.success && r.action === 'updated').length
        const errors = results.filter(r => r.error).length
        
        let message = ''
        if (added > 0) {
          message += `新增${added}个词汇`
        }
        if (updated > 0) {
          message += `${message ? '，' : ''}更新${updated}个词汇`
        }
        if (errors > 0) {
          message += `${message ? '，' : ''}${errors}个词汇处理失败`
        }
        
        if (!message) {
          message = '操作完成'
        }
        
        wx.showModal({
          title: '添加完成',
          content: message,
          showCancel: false,
          success: () => {
            // 清空选择
            this.setData({
              selectedWords: [],
              selectAll: false
            })
            
            // 更新词汇状态
            const processedWords = results.filter(r => r.success).map(r => r.word)
            const updatedList = this.data.vocabularyList.map(word => {
              if (processedWords.includes(word.japanese)) {
                word.addedToStudy = true
              }
              return word
            })
            
            this.setData({
              vocabularyList: updatedList
            })
            
            // 更新过滤列表
            if (this.data.searchKeyword) {
              const filtered = updatedList.filter(word => 
                word.japanese.toLowerCase().includes(this.data.searchKeyword) ||
                word.romaji.toLowerCase().includes(this.data.searchKeyword) ||
                word.chinese.toLowerCase().includes(this.data.searchKeyword)
              )
              this.updateFilteredList(filtered)
            } else {
              this.updateFilteredList(updatedList)
            }
          }
        })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('添加词汇失败:', err)
        wx.showToast({
          title: '添加失败',
          icon: 'none'
        })
      })
  },

  // 预览词汇详情
  onPreviewWord(e) {
    const { word } = e.currentTarget.dataset
    
    wx.showModal({
      title: word.japanese,
      content: `读音：${word.romaji}\n意思：${word.chinese}\n来源：解析记录`,
      showCancel: false
    })
  },

  // 返回历史页面
  onBack() {
    wx.navigateBack()
  }
})