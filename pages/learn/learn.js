const app = getApp()

// 模拟单词数据
const mockWords = [
  {
    id: 1,
    word: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: '吃',
    examples: [
      { jp: '朝ごはんを食べる。', cn: '吃早饭。' },
      { jp: '果物を食べたい。', cn: '想吃水果。' }
    ],
    audioUrl: '/audio/taberu.mp3'
  },
  {
    id: 2,
    word: '学校',
    kana: 'がっこう',
    romaji: 'gakkou',
    meaning: '学校',
    examples: [
      { jp: '学校に行く。', cn: '去学校。' },
      { jp: '学校は楽しい。', cn: '学校很有趣。' }
    ],
    audioUrl: '/audio/gakkou.mp3'
  },
  {
    id: 3,
    word: '本',
    kana: 'ほん',
    romaji: 'hon',
    meaning: '书',
    examples: [
      { jp: '本を読む。', cn: '读书。' },
      { jp: 'この本は面白い。', cn: '这本书很有趣。' }
    ],
    audioUrl: '/audio/hon.mp3'
  },
  {
    id: 4,
    word: '友達',
    kana: 'ともだち',
    romaji: 'tomodachi',
    meaning: '朋友',
    examples: [
      { jp: '友達と遊ぶ。', cn: '和朋友玩。' },
      { jp: '新しい友達ができた。', cn: '交到了新朋友。' }
    ],
    audioUrl: '/audio/tomodachi.mp3'
  },
  {
    id: 5,
    word: '時間',
    kana: 'じかん',
    romaji: 'jikan',
    meaning: '时间',
    examples: [
      { jp: '時間がない。', cn: '没有时间。' },
      { jp: '時間を大切にする。', cn: '珍惜时间。' }
    ],
    audioUrl: '/audio/jikan.mp3'
  }
]

Page({
  data: {
    wordList: [],
    currentIndex: 0,
    currentWord: {},
    showExample: false,
    inWordbook: false,
    showComplete: false,
    masteredCount: 0,
    fuzzyCount: 0,
    forgotCount: 0,
    learningRecord: {} // 记录每个单词的学习状态
  },

  onLoad() {
    // 加载今日单词
    this.loadTodayWords()
  },

  loadTodayWords() {
    // 这里使用模拟数据，实际应该从服务器或云数据库获取
    const wordList = mockWords
    
    this.setData({
      wordList,
      currentWord: wordList[0],
      currentIndex: 0
    })

    // 存储到全局数据
    app.globalData.todayWords = wordList
  },

  // 播放音频
  playAudio() {
    const { currentWord } = this.data
    
    // 创建音频对象
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = currentWord.audioUrl
    
    // 由于是模拟数据，这里只显示提示
    wx.showToast({
      title: '播放语音',
      icon: 'none',
      duration: 1000
    })
  },

  // 切换例句显示
  toggleExample() {
    this.setData({
      showExample: !this.data.showExample
    })
  },

  // 添加到生词本
  addToWordbook() {
    const { inWordbook } = this.data
    
    if (!inWordbook) {
      // TODO: 保存到生词本
      wx.showToast({
        title: '已添加到生词本',
        icon: 'success'
      })
      
      this.setData({
        inWordbook: true
      })
    }
  },

  // 标记掌握状态
  markStatus(e) {
    const status = e.currentTarget.dataset.status
    const { currentIndex, currentWord, learningRecord } = this.data
    
    // 记录当前单词的学习状态
    learningRecord[currentWord.id] = status
    
    // 判断是否是最后一个单词
    if (currentIndex < this.data.wordList.length - 1) {
      // 进入下一个单词
      const nextIndex = currentIndex + 1
      const nextWord = this.data.wordList[nextIndex]
      
      this.setData({
        currentIndex: nextIndex,
        currentWord: nextWord,
        showExample: false,
        inWordbook: false,
        learningRecord
      })
    } else {
      // 学习完成，统计结果
      this.showCompleteResult()
    }
  },

  // 显示完成结果
  showCompleteResult() {
    const { learningRecord } = this.data
    let masteredCount = 0
    let fuzzyCount = 0
    let forgotCount = 0
    
    // 统计各状态数量
    Object.values(learningRecord).forEach(status => {
      if (status === 'mastered') masteredCount++
      else if (status === 'fuzzy') fuzzyCount++
      else if (status === 'forgot') forgotCount++
    })
    
    this.setData({
      showComplete: true,
      masteredCount,
      fuzzyCount,
      forgotCount
    })
    
    // TODO: 保存学习记录到数据库
  },

  // 返回首页
  goBack() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})