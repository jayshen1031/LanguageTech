// 语法学习计划页面
const { grammarData, studyPlan, reviewIntervals } = require('../../../utils/grammarData')
const { hunyuanAI } = require('../../../utils/ai')
const { kanaToRomaji } = require('../../../utils/kanaToRomaji')

Page({
  data: {
    currentWeek: 1, // 当前学习周
    currentDay: 1,  // 当前天数
    todayLessons: [], // 今日学习内容
    todayReview: [],  // 今日复习内容
    currentLesson: null, // 当前学习的课程
    practiceMode: false, // 练习模式
    practiceExamples: [], // 练习例句
    userAnswer: '', // 用户答案
    showAnswer: false, // 显示答案
    studyProgress: {}, // 学习进度
    reviewQueue: [], // 复习队列
  },

  onLoad() {
    // 加载学习进度
    this.loadStudyProgress()
    // 生成今日学习计划
    this.generateTodayPlan()
  },

  // 加载学习进度
  loadStudyProgress() {
    const progress = wx.getStorageSync('grammarProgress') || {
      currentWeek: 1,
      currentDay: 1,
      completedLessons: [],
      reviewSchedule: {}
    }
    
    this.setData({
      currentWeek: progress.currentWeek,
      currentDay: progress.currentDay,
      studyProgress: progress
    })
  },

  // 保存学习进度
  saveProgress() {
    const { currentWeek, currentDay, studyProgress } = this.data
    wx.setStorageSync('grammarProgress', {
      ...studyProgress,
      currentWeek,
      currentDay,
      lastStudyDate: new Date().toISOString()
    })
  },

  // 生成今日学习计划
  generateTodayPlan() {
    const { currentWeek } = this.data
    const weekPlan = studyPlan.beginner.weeks[currentWeek - 1]
    
    if (!weekPlan) {
      wx.showToast({
        title: '恭喜完成所有课程！',
        icon: 'success'
      })
      return
    }

    // 获取今日新课
    const todayLessons = weekPlan.content.map(lessonId => {
      return this.findLessonById(lessonId)
    }).filter(Boolean)

    // 获取今日复习
    const todayReview = this.getReviewLessons(weekPlan.review)

    this.setData({
      todayLessons,
      todayReview,
      weekPlan
    })
  },

  // 根据ID查找课程
  findLessonById(lessonId) {
    for (const unit of Object.values(grammarData)) {
      const lesson = unit.lessons.find(l => l.id === lessonId)
      if (lesson) {
        return {
          ...lesson,
          unitTitle: unit.title
        }
      }
    }
    return null
  },

  // 获取复习课程
  getReviewLessons(reviewIds) {
    if (reviewIds === 'all') {
      // 复习所有已学课程
      const { completedLessons = [] } = this.data.studyProgress
      return completedLessons.map(id => this.findLessonById(id)).filter(Boolean)
    }
    
    return reviewIds.map(id => this.findLessonById(id)).filter(Boolean)
  },

  // 开始学习课程
  startLesson(e) {
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
    }

    // 添加到复习计划
    const today = new Date()
    const reviewSchedule = studyProgress.reviewSchedule || {}
    
    reviewIntervals.forEach(interval => {
      const reviewDate = new Date(today)
      reviewDate.setDate(reviewDate.getDate() + interval)
      const dateKey = reviewDate.toISOString().split('T')[0]
      
      if (!reviewSchedule[dateKey]) {
        reviewSchedule[dateKey] = []
      }
      reviewSchedule[dateKey].push(currentLesson.id)
    })

    // 更新进度
    this.setData({
      studyProgress: {
        ...studyProgress,
        completedLessons,
        reviewSchedule
      }
    })

    // 保存进度
    this.saveProgress()

    // 检查是否完成今日任务
    this.checkDailyProgress()
  },

  // 检查每日进度
  checkDailyProgress() {
    const { todayLessons, studyProgress } = this.data
    const completedLessons = studyProgress.completedLessons || []
    
    const allCompleted = todayLessons.every(lesson => 
      completedLessons.includes(lesson.id)
    )

    if (allCompleted) {
      wx.showModal({
        title: '今日任务完成！',
        content: '您已完成今天的学习任务，明天再来吧！',
        showCancel: false,
        success: () => {
          // 进入下一天
          this.nextDay()
        }
      })
    }
  },

  // 进入下一天
  nextDay() {
    const { currentWeek, currentDay } = this.data
    
    if (currentDay < 7) {
      this.setData({
        currentDay: currentDay + 1
      })
    } else {
      // 进入下一周
      this.setData({
        currentWeek: currentWeek + 1,
        currentDay: 1
      })
    }

    // 保存进度并重新生成计划
    this.saveProgress()
    this.generateTodayPlan()
  },

  // 查看语法详情
  viewGrammarDetail(e) {
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
      practiceMode: false
    })
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

  // 切换到语法库
  switchToLibrary() {
    wx.navigateTo({
      url: '/packageA/pages/grammar-library/grammar-library'
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '一起来学习日语语法吧！',
      path: '/pages/grammar-study/grammar-study'
    }
  }
})