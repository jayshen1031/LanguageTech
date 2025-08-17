// 语法库页面 - 自由选择学习模式
const { grammarData } = require('../../../utils/grammarData')
const { kanaToRomaji } = require('../../../utils/kanaToRomaji')
const { hunyuanAI } = require('../../../utils/ai')

Page({
  data: {
    units: [], // 所有语法单元
    expandedUnits: {}, // 展开状态
    currentLesson: null, // 当前查看的课程
    searchKeyword: '', // 搜索关键词
    filteredUnits: [], // 搜索结果
    studyProgress: {}, // 学习进度
    practiceMode: false, // 练习模式
    practiceExamples: [], // 练习例句
    userAnswer: '', // 用户答案
    showAnswer: false, // 显示答案
    favoriteIds: [], // 收藏的语法ID
    totalLessons: 0 // 总课程数
  },

  onLoad() {
    this.initData()
    this.loadStudyProgress()
    this.loadFavorites()
    this.calculateTotalLessons()
  },

  // 初始化数据
  initData() {
    // 将grammarData转换为数组格式
    const units = Object.entries(grammarData).map(([key, unit]) => ({
      key,
      ...unit,
      lessons: unit.lessons.map(lesson => ({
        ...lesson,
        unitKey: key,
        unitTitle: unit.title
      }))
    }))

    this.setData({
      units,
      filteredUnits: units
    })
  },

  // 加载学习进度
  loadStudyProgress() {
    const progress = wx.getStorageSync('grammarProgress') || {
      completedLessons: [],
      masteredLessons: [] // 已掌握的课程
    }
    this.setData({ studyProgress: progress })
  },

  // 加载收藏
  loadFavorites() {
    const favorites = wx.getStorageSync('grammarFavorites') || []
    this.setData({ favoriteIds: favorites })
  },

  // 计算总课程数
  calculateTotalLessons() {
    const { units } = this.data
    let total = 0
    units.forEach(unit => {
      total += unit.lessons.length
    })
    this.setData({ totalLessons: total })
  },

  // 切换单元展开状态
  toggleUnit(e) {
    const { key } = e.currentTarget.dataset
    const expandedUnits = this.data.expandedUnits
    expandedUnits[key] = !expandedUnits[key]
    this.setData({ expandedUnits })
  },

  // 搜索语法
  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase()
    this.setData({ searchKeyword: keyword })
    
    if (!keyword) {
      this.setData({ filteredUnits: this.data.units })
      return
    }

    // 搜索匹配的语法
    const filteredUnits = this.data.units.map(unit => {
      const filteredLessons = unit.lessons.filter(lesson => {
        return lesson.title.includes(keyword) ||
               lesson.grammar.toLowerCase().includes(keyword) ||
               lesson.explanation.includes(keyword)
      })
      
      if (filteredLessons.length > 0) {
        return {
          ...unit,
          lessons: filteredLessons
        }
      }
      return null
    }).filter(Boolean)

    this.setData({ filteredUnits })
  },

  // 查看语法详情
  viewLesson(e) {
    const lesson = e.currentTarget.dataset.lesson
    // 为例句添加罗马音
    const lessonWithRomaji = {
      ...lesson,
      examples: lesson.examples.map(example => ({
        ...example,
        romaji: kanaToRomaji(example.kana)
      }))
    }
    this.setData({
      currentLesson: lessonWithRomaji,
      practiceMode: false,
      showAnswer: false
    })
  },

  // 切换收藏
  toggleFavorite() {
    const { currentLesson, favoriteIds } = this.data
    if (!currentLesson) return

    const lessonId = currentLesson.id
    const index = favoriteIds.indexOf(lessonId)
    
    if (index > -1) {
      favoriteIds.splice(index, 1)
    } else {
      favoriteIds.push(lessonId)
    }

    this.setData({ favoriteIds })
    wx.setStorageSync('grammarFavorites', favoriteIds)
    
    wx.showToast({
      title: index > -1 ? '已取消收藏' : '已收藏',
      icon: 'success',
      duration: 1500
    })
  },

  // 标记为已掌握
  markAsMastered() {
    const { currentLesson, studyProgress } = this.data
    if (!currentLesson) return

    const masteredLessons = studyProgress.masteredLessons || []
    const lessonId = currentLesson.id
    
    if (!masteredLessons.includes(lessonId)) {
      masteredLessons.push(lessonId)
      studyProgress.masteredLessons = masteredLessons
      
      // 同时添加到已完成列表
      const completedLessons = studyProgress.completedLessons || []
      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId)
        studyProgress.completedLessons = completedLessons
      }
      
      this.setData({ studyProgress })
      wx.setStorageSync('grammarProgress', studyProgress)
      
      wx.showToast({
        title: '已标记为掌握',
        icon: 'success'
      })
    }
  },

  // 开始练习
  startPractice() {
    const { currentLesson } = this.data
    if (!currentLesson) return

    // 生成练习题
    this.generatePracticeExamples()
    
    this.setData({
      practiceMode: true,
      showAnswer: false,
      userAnswer: ''
    })
  },

  // 生成练习例句
  async generatePracticeExamples() {
    const { currentLesson } = this.data
    
    wx.showLoading({
      title: '生成练习题...'
    })

    try {
      // 使用AI生成更多例句
      const prompt = `请根据日语语法"${currentLesson.grammar}"生成5个练习句子。
要求：
1. 难度适合初学者
2. 每个句子都要使用这个语法点
3. 包含中文翻译
4. 标注假名读音

格式：
1. [日语句子]
   読み：[假名]
   意味：[中文翻译]`

      const result = await hunyuanAI.simpleChat(prompt)
      
      // 解析AI返回的例句
      const examples = this.parseAIExamples(result)
      
      // 结合预设的练习题
      const allExamples = [
        ...currentLesson.practice.map(p => ({
          type: 'fill',
          question: p,
          answer: this.getFillAnswer(p)
        })),
        ...examples
      ]

      this.setData({
        practiceExamples: allExamples,
        currentExampleIndex: 0
      })

      wx.hideLoading()
    } catch (error) {
      console.error('生成练习失败:', error)
      wx.hideLoading()
      
      // 使用预设练习题
      this.setData({
        practiceExamples: currentLesson.practice.map(p => ({
          type: 'fill',
          question: p,
          answer: this.getFillAnswer(p)
        })),
        currentExampleIndex: 0
      })
    }
  },

  // 解析AI生成的例句
  parseAIExamples(text) {
    const examples = []
    const lines = text.split('\n')
    let current = {}

    lines.forEach(line => {
      if (/^\d+\./.test(line)) {
        if (current.jp) {
          examples.push(current)
        }
        current = {
          type: 'translate',
          jp: line.replace(/^\d+\.\s*/, '').trim()
        }
      } else if (line.includes('読み：')) {
        current.kana = line.replace('読み：', '').trim()
      } else if (line.includes('意味：')) {
        current.cn = line.replace('意味：', '').trim()
      }
    })

    if (current.jp) {
      examples.push(current)
    }

    return examples
  },

  // 获取填空题答案
  getFillAnswer(question) {
    const match = question.match(/（(.+?)）/)
    return match ? match[1] : ''
  },

  // 输入答案
  onAnswerInput(e) {
    this.setData({
      userAnswer: e.detail.value
    })
  },

  // 检查答案
  checkAnswer() {
    const { practiceExamples, currentExampleIndex, userAnswer } = this.data
    const current = practiceExamples[currentExampleIndex]
    
    if (!current) return

    const isCorrect = userAnswer.trim() === current.answer
    
    this.setData({
      showAnswer: true,
      isCorrect
    })

    if (isCorrect) {
      wx.showToast({
        title: '回答正确！',
        icon: 'success'
      })
    }
  },

  // 下一题
  nextExample() {
    const { currentExampleIndex, practiceExamples } = this.data
    
    if (currentExampleIndex < practiceExamples.length - 1) {
      this.setData({
        currentExampleIndex: currentExampleIndex + 1,
        userAnswer: '',
        showAnswer: false
      })
    } else {
      // 练习完成
      this.completePractice()
    }
  },

  // 完成练习
  completePractice() {
    wx.showModal({
      title: '练习完成',
      content: '您已完成本课的练习！',
      showCancel: false,
      success: () => {
        this.setData({
          practiceMode: false
        })
        // 标记课程完成
        this.markLessonComplete()
      }
    })
  },

  // 标记课程完成
  markLessonComplete() {
    const { currentLesson, studyProgress } = this.data
    
    if (!currentLesson) return

    // 添加到已完成列表
    const completedLessons = studyProgress.completedLessons || []
    if (!completedLessons.includes(currentLesson.id)) {
      completedLessons.push(currentLesson.id)
      studyProgress.completedLessons = completedLessons
      
      this.setData({ studyProgress })
      wx.setStorageSync('grammarProgress', studyProgress)
    }
  },

  // 播放例句音频
  async playExample(e) {
    const { text } = e.currentTarget.dataset
    const audioMCP = require('../../../utils/audioMCP')
    
    try {
      await audioMCP.playText(text, 'ja')
    } catch (error) {
      console.error('播放失败:', error)
    }
  },

  // 返回列表
  backToList() {
    this.setData({
      currentLesson: null,
      practiceMode: false
    })
  },

  // 获取进度统计
  getProgressStats() {
    const { studyProgress, units } = this.data
    const completedCount = (studyProgress.completedLessons || []).length
    const masteredCount = (studyProgress.masteredLessons || []).length
    
    // 计算总课程数
    let totalCount = 0
    units.forEach(unit => {
      totalCount += unit.lessons.length
    })

    return {
      total: totalCount,
      completed: completedCount,
      mastered: masteredCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '语法库 - 自由学习所有日语语法',
      path: '/pages/grammar-library/grammar-library'
    }
  }
})