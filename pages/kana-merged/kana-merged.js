// 平假名片假名合并学习页面
const { mergedKanaData, getMergedKana } = require('../../utils/kanaDataMerged')
const audioMCP = require('../../utils/audioMCP')

Page({
  data: {
    // 当前选中的假名类型
    activeType: 'seion', // seion/dakuon/handakuon/youon
    
    // 当前显示的假名数据
    currentKanaList: [],
    
    // 显示模式
    viewMode: 'grid', // grid/list
    
    // 练习模式
    practiceMode: false,
    currentQuestion: null,
    options: [],
    userAnswer: '',
    showResult: false,
    isCorrect: false,
    
    // 统计数据
    stats: {
      total: 0,
      correct: 0
    },
    
    // 显示设置
    showHiragana: true,
    showKatakana: true,
    showRomaji: true,
    fontSize: 'medium' // small/medium/large
  },

  onLoad(options) {
    // 处理传入的tab参数
    if (options.tab) {
      // 如果指定了平假名或片假名，设置显示模式
      if (options.tab === 'hiragana') {
        this.setData({
          showHiragana: true,
          showKatakana: false
        })
        wx.setNavigationBarTitle({
          title: '平假名学习'
        })
      } else if (options.tab === 'katakana') {
        this.setData({
          showHiragana: false,
          showKatakana: true
        })
        wx.setNavigationBarTitle({
          title: '片假名学习'
        })
      }
    }
    
    // 加载默认清音数据
    this.loadKanaData('seion')
  },

  // 加载假名数据
  loadKanaData(type) {
    const kanaList = getMergedKana.getAllByType(type)
    
    this.setData({
      activeType: type,
      currentKanaList: kanaList
    })
  },

  // 切换假名类型
  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.loadKanaData(type)
  },

  // 切换视图模式
  toggleViewMode() {
    this.setData({
      viewMode: this.data.viewMode === 'grid' ? 'list' : 'grid'
    })
  },

  // 切换显示设置
  toggleDisplay(e) {
    const type = e.currentTarget.dataset.type
    const key = `show${type.charAt(0).toUpperCase() + type.slice(1)}`
    
    this.setData({
      [key]: !this.data[key]
    })
  },

  // 改变字体大小
  changeFontSize(e) {
    const size = e.currentTarget.dataset.size
    this.setData({
      fontSize: size
    })
  },

  // 播放发音
  async playSound(e) {
    const { hiragana, romaji } = e.currentTarget.dataset
    
    try {
      await audioMCP.playKanaSound(hiragana || romaji)
      
      // 添加点击动画反馈
      const index = e.currentTarget.dataset.index
      this.addClickAnimation(index)
    } catch (error) {
      console.error('播放失败:', error)
      wx.showToast({
        title: '发音播放失败',
        icon: 'none'
      })
    }
  },

  // 添加点击动画
  addClickAnimation(index) {
    const animationKey = `animation_${index}`
    this.setData({
      [animationKey]: true
    })
    
    setTimeout(() => {
      this.setData({
        [animationKey]: false
      })
    }, 300)
  },

  // 开始练习模式
  startPractice() {
    this.setData({
      practiceMode: true,
      stats: { total: 0, correct: 0 }
    })
    
    this.generateQuestion()
  },

  // 生成练习题
  generateQuestion() {
    const kanaList = this.data.currentKanaList.filter(item => item.type !== 'empty')
    
    if (kanaList.length < 4) {
      wx.showToast({
        title: '假名数量不足',
        icon: 'none'
      })
      return
    }
    
    // 随机选择一个假名作为题目
    const question = kanaList[Math.floor(Math.random() * kanaList.length)]
    
    // 生成选项（包含正确答案）
    const options = [question.romaji]
    
    while (options.length < 4) {
      const randomKana = kanaList[Math.floor(Math.random() * kanaList.length)]
      if (!options.includes(randomKana.romaji)) {
        options.push(randomKana.romaji)
      }
    }
    
    // 打乱选项顺序
    options.sort(() => Math.random() - 0.5)
    
    this.setData({
      currentQuestion: question,
      options: options,
      showResult: false,
      userAnswer: ''
    })
  },

  // 选择答案
  selectAnswer(e) {
    const answer = e.currentTarget.dataset.answer
    const isCorrect = answer === this.data.currentQuestion.romaji
    
    this.setData({
      userAnswer: answer,
      isCorrect: isCorrect,
      showResult: true,
      'stats.total': this.data.stats.total + 1,
      'stats.correct': this.data.stats.correct + (isCorrect ? 1 : 0)
    })
    
    // 播放反馈音效
    if (isCorrect) {
      wx.vibrateShort({ type: 'light' })
    } else {
      wx.vibrateShort({ type: 'heavy' })
    }
  },

  // 下一题
  nextQuestion() {
    this.generateQuestion()
  },

  // 退出练习模式
  exitPractice() {
    wx.showModal({
      title: '确认退出',
      content: `你已完成 ${this.data.stats.total} 题，正确率 ${this.data.stats.total > 0 ? Math.round(this.data.stats.correct / this.data.stats.total * 100) : 0}%`,
      confirmText: '退出',
      cancelText: '继续',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            practiceMode: false
          })
        }
      }
    })
  },

  // 快速记忆模式
  quickMemory() {
    wx.navigateTo({
      url: '/pages/kana-memory/kana-memory?type=' + this.data.activeType
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '一起学习日语假名',
      path: '/pages/kana-merged/kana-merged'
    }
  }
})