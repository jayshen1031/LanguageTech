// 日语解析复习页面
Page({
  data: {
    reviewList: [], // 复习列表
    currentIndex: 0, // 当前复习索引
    currentSentence: null, // 当前句子
    showAnswer: false, // 是否显示答案
    reviewMode: 'random', // 复习模式：random（随机）, favorite（收藏）, recent（最近）
    reviewProgress: {
      total: 0,
      current: 0,
      completed: []
    },
    isLoading: false,
    showModeSelect: false // 是否显示模式选择
  },

  onLoad() {
    // 初始化云数据库
    this.db = wx.cloud.database()
    this.loadReviewData()
  },

  // 加载复习数据
  async loadReviewData() {
    this.setData({ isLoading: true })
    
    try {
      // 先尝试从云数据库加载
      let historyData = []
      
      try {
        const res = await this.db.collection('japanese_parser_history')
          .orderBy('createTime', this.data.reviewMode === 'recent' ? 'desc' : 'asc')
          .limit(50)
          .get()
        
        historyData = res.data
      } catch (dbError) {
        // 云数据库失败，从本地存储加载
        console.log('云数据库加载失败，使用本地存储:', dbError)
        const localHistory = wx.getStorageSync('parser_history') || []
        historyData = localHistory
      }

      // 根据复习模式筛选
      if (this.data.reviewMode === 'favorite') {
        historyData = historyData.filter(record => record.favorite)
      }

      // 提取所有句子并打平
      const allSentences = []
      historyData.forEach(record => {
        if (record.sentences && record.sentences.length > 0) {
          record.sentences.forEach((sentence, index) => {
            allSentences.push({
              ...sentence,
              recordId: record._id,
              sourceText: record.inputText || record.title,
              createTime: record.createTime,
              favorite: record.favorite,
              sentenceIndex: index,
              // 添加原始记录信息
              inputMethod: record.inputMethod,
              imageUrl: record.imageUrl || ''
            })
          })
        }
      })

      // 随机打乱顺序（如果是随机模式）
      if (this.data.reviewMode === 'random') {
        this.shuffleArray(allSentences)
      }

      this.setData({
        reviewList: allSentences,
        currentIndex: 0,
        currentSentence: allSentences[0] || null,
        currentItem: allSentences[0] || null, // 保存完整的当前项信息
        showAnswer: false,
        reviewProgress: {
          total: allSentences.length,
          current: 0,
          completed: []
        },
        isLoading: false
      })

    } catch (error) {
      console.error('加载复习数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ isLoading: false })
    }
  },

  // 数组随机打乱
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  },

  // 显示答案
  showAnswerDetail() {
    this.setData({
      showAnswer: true
    })
  },

  // 隐藏答案
  hideAnswer() {
    this.setData({
      showAnswer: false
    })
  },

  // 查看原始图片
  viewOriginalImage() {
    const { currentItem } = this.data
    if (currentItem && currentItem.imageUrl) {
      wx.previewImage({
        urls: [currentItem.imageUrl],
        current: currentItem.imageUrl
      })
    }
  },

  // 下一个句子
  nextSentence() {
    const { currentIndex, reviewList, reviewProgress } = this.data
    
    if (currentIndex < reviewList.length - 1) {
      const nextIndex = currentIndex + 1
      const completed = [...reviewProgress.completed]
      
      // 标记当前句子为已完成
      if (!completed.includes(currentIndex)) {
        completed.push(currentIndex)
      }

      this.setData({
        currentIndex: nextIndex,
        currentSentence: reviewList[nextIndex],
        currentItem: reviewList[nextIndex], // 更新当前项信息
        showAnswer: false,
        'reviewProgress.current': nextIndex,
        'reviewProgress.completed': completed
      })
    } else {
      // 复习完成
      wx.showModal({
        title: '复习完成',
        content: `恭喜！你已完成 ${reviewList.length} 个句子的复习`,
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    }
  },

  // 上一个句子
  prevSentence() {
    const { currentIndex, reviewList } = this.data
    
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      this.setData({
        currentIndex: prevIndex,
        currentSentence: reviewList[prevIndex],
        currentItem: reviewList[prevIndex], // 更新当前项信息
        showAnswer: false,
        'reviewProgress.current': prevIndex
      })
    }
  },

  // 标记掌握/不掌握
  markMastery(e) {
    const { mastered } = e.currentTarget.dataset
    const { currentIndex, reviewProgress } = this.data
    const completed = [...reviewProgress.completed]
    
    // 标记为已完成
    if (!completed.includes(currentIndex)) {
      completed.push(currentIndex)
    }

    this.setData({
      'reviewProgress.completed': completed
    })

    // 自动跳转到下一个
    setTimeout(() => {
      this.nextSentence()
    }, 500)

    // 可以在这里记录掌握情况到数据库
    this.recordMastery(mastered)
  },

  // 记录掌握情况
  async recordMastery(mastered) {
    const { currentSentence } = this.data
    
    try {
      // 可以在这里保存用户的掌握情况到数据库
      // 比如更新句子的掌握状态、复习次数等
      console.log(`句子掌握情况: ${mastered ? '已掌握' : '未掌握'}`, currentSentence.originalText)
    } catch (error) {
      console.error('记录掌握情况失败:', error)
    }
  },

  // 显示模式选择
  showModeSelection() {
    this.setData({
      showModeSelect: true
    })
  },

  // 隐藏模式选择
  hideModeSelection() {
    this.setData({
      showModeSelect: false
    })
  },

  // 切换复习模式
  switchMode(e) {
    const { mode } = e.currentTarget.dataset
    
    this.setData({
      reviewMode: mode,
      showModeSelect: false
    })

    // 重新加载数据
    this.loadReviewData()
  },

  // 跳转到指定句子
  jumpToSentence(e) {
    const { index } = e.currentTarget.dataset
    const { reviewList } = this.data

    this.setData({
      currentIndex: index,
      currentSentence: reviewList[index],
      showAnswer: false,
      'reviewProgress.current': index
    })
  },

  // 播放发音（如果有TTS服务）
  playPronunciation() {
    const { currentSentence } = this.data
    
    if (currentSentence && currentSentence.originalText) {
      // 这里可以调用TTS服务播放发音
      wx.showToast({
        title: '发音功能开发中',
        icon: 'none'
      })
    }
  },

  // 保存到生词本
  saveToWordbook() {
    const { currentSentence } = this.data
    
    if (currentSentence && currentSentence.vocabulary) {
      const words = currentSentence.vocabulary.map(vocab => ({
        word: vocab.japanese,
        reading: vocab.romaji,
        meaning: vocab.chinese,
        example: currentSentence.originalText,
        source: 'parser-review',
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
    }
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack()
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '日语解析复习 - 语伴君',
      path: '/pages/parser-review/parser-review'
    }
  }
})