// 记忆曲线算法实现

// 艾宾浩斯记忆曲线间隔（分钟）
const EBBINGHAUS_INTERVALS = [
  5,        // 5分钟
  30,       // 30分钟
  12 * 60,  // 12小时
  24 * 60,  // 1天
  2 * 24 * 60,  // 2天
  4 * 24 * 60,  // 4天
  7 * 24 * 60,  // 7天
  15 * 24 * 60, // 15天
  30 * 24 * 60  // 30天
]

// 根据掌握程度调整间隔
const adjustInterval = (baseInterval, mastery) => {
  switch (mastery) {
    case 'mastered':
      return baseInterval * 1.5 // 掌握良好，延长间隔
    case 'fuzzy':
      return baseInterval * 1.0 // 模糊，正常间隔
    case 'forgot':
      return baseInterval * 0.5 // 忘记，缩短间隔
    default:
      return baseInterval
  }
}

// 计算下次复习时间
const calculateNextReview = (lastReviewTime, reviewCount, mastery) => {
  const lastReview = new Date(lastReviewTime)
  const intervalIndex = Math.min(reviewCount, EBBINGHAUS_INTERVALS.length - 1)
  const baseInterval = EBBINGHAUS_INTERVALS[intervalIndex]
  const adjustedInterval = adjustInterval(baseInterval, mastery)
  
  const nextReview = new Date(lastReview.getTime() + adjustedInterval * 60 * 1000)
  return nextReview
}

// 获取今日需要复习的单词
const getTodayReviewWords = (wordRecords) => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  
  return wordRecords.filter(record => {
    const nextReview = new Date(record.nextReview)
    return nextReview >= todayStart && nextReview < todayEnd
  })
}

// 计算记忆强度（0-100）
const calculateMemoryStrength = (record) => {
  const { reviewCount, lastMastery, lastReviewTime } = record
  const daysSinceReview = (Date.now() - new Date(lastReviewTime).getTime()) / (24 * 60 * 60 * 1000)
  
  let strength = 100
  
  // 根据复习次数增加基础强度
  strength = Math.min(100, reviewCount * 10)
  
  // 根据上次掌握程度调整
  if (lastMastery === 'forgot') {
    strength *= 0.5
  } else if (lastMastery === 'fuzzy') {
    strength *= 0.8
  }
  
  // 根据时间衰减
  strength *= Math.pow(0.9, daysSinceReview)
  
  return Math.max(0, Math.round(strength))
}

// 生成学习报告
const generateLearningReport = (wordRecords) => {
  const totalWords = wordRecords.length
  const masteredWords = wordRecords.filter(r => calculateMemoryStrength(r) >= 80).length
  const reviewingWords = wordRecords.filter(r => {
    const strength = calculateMemoryStrength(r)
    return strength >= 30 && strength < 80
  }).length
  const forgottenWords = wordRecords.filter(r => calculateMemoryStrength(r) < 30).length
  
  return {
    totalWords,
    masteredWords,
    reviewingWords,
    forgottenWords,
    masteryRate: Math.round((masteredWords / totalWords) * 100)
  }
}

// 智能排序复习列表（优先级排序）
const sortReviewList = (reviewWords) => {
  return reviewWords.sort((a, b) => {
    // 1. 优先复习记忆强度低的
    const strengthA = calculateMemoryStrength(a)
    const strengthB = calculateMemoryStrength(b)
    if (strengthA !== strengthB) {
      return strengthA - strengthB
    }
    
    // 2. 优先复习间隔时间长的
    const nextReviewA = new Date(a.nextReview).getTime()
    const nextReviewB = new Date(b.nextReview).getTime()
    return nextReviewA - nextReviewB
  })
}

module.exports = {
  calculateNextReview,
  getTodayReviewWords,
  calculateMemoryStrength,
  generateLearningReport,
  sortReviewList,
  EBBINGHAUS_INTERVALS
}