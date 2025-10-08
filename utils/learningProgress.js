// 学习进度管理工具 - 基于"次数+主动评估"机制

// 学习类型配置
const LEARNING_TYPES = {
  word: {
    name: '单词',
    familiarThreshold: 4,    // 4次后可标记为略懂
    masteredThreshold: 10,   // 10次后可标记为掌握
    icon: '📚'
  },
  sentence: {
    name: '句子',
    familiarThreshold: 3,    // 3次后可标记为略懂
    masteredThreshold: 8,    // 8次后可标记为掌握
    icon: '📝'
  },
  grammar: {
    name: '语法',
    familiarThreshold: 5,    // 5次后可标记为略懂
    masteredThreshold: 12,   // 12次后可标记为掌握
    icon: '📖'
  },
  structure: {
    name: '句型',
    familiarThreshold: 3,    // 3次后可标记为略懂
    masteredThreshold: 8,    // 8次后可标记为掌握
    icon: '🔤'
  }
}

// 学习状态
const LEARNING_STATUS = {
  learning: '学习中',
  familiar: '略懂',
  mastered: '掌握'
}

/**
 * 学习进度管理类
 */
class LearningProgressManager {
  constructor() {
    this.storageKey = 'learningProgress'
  }

  /**
   * 创建学习项目
   */
  createLearningItem(content, type = 'word', metadata = {}) {
    return {
      id: this.generateId(content, type),
      content: content,
      type: type,
      metadata: metadata,
      
      // 核心学习数据
      learnCount: 0,           // 用户主动确认的学习次数
      status: 'learning',      // learning/familiar/mastered
      
      // 时间记录
      firstStudyTime: new Date(),
      lastStudyTime: new Date(),
      familiarTime: null,      // 标记为略懂的时间
      masteredTime: null,      // 标记为掌握的时间
      
      // 用户记录
      userNotes: '',           // 用户学习笔记
      difficulty: 0,           // 用户主观难度评分 (1-5)
      
      // 统计数据
      totalViewTime: 0,        // 总查看时间（秒）
      reviewSchedule: [],      // 复习计划
    }
  }

  /**
   * 生成唯一ID
   */
  generateId(content, type) {
    const timestamp = Date.now()
    const hash = this.simpleHash(content)
    return `${type}_${hash}_${timestamp}`
  }

  /**
   * 简单哈希函数
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 用户确认学习一次
   */
  confirmLearning(itemId) {
    const allItems = this.getAllLearningItems()
    const item = allItems.find(item => item.id === itemId)
    
    if (!item) {
      console.error('学习项目不存在:', itemId)
      return false
    }

    // 增加学习次数
    item.learnCount += 1
    item.lastStudyTime = new Date()

    console.log(`✅ 用户确认学习一次: ${item.content} (${item.learnCount}次)`)

    // 保存更新
    this.saveLearningItems(allItems)

    // 返回更新后的状态信息
    return {
      success: true,
      item: item,
      canMarkFamiliar: this.canMarkFamiliar(item),
      canMarkMastered: this.canMarkMastered(item),
      message: `学习次数: ${item.learnCount}次`
    }
  }

  /**
   * 标记为略懂
   */
  markAsFamiliar(itemId) {
    const allItems = this.getAllLearningItems()
    const item = allItems.find(item => item.id === itemId)
    
    if (!item) return false

    if (!this.canMarkFamiliar(item)) {
      return {
        success: false,
        message: `需要学习${LEARNING_TYPES[item.type].familiarThreshold}次后才能标记为略懂`
      }
    }

    item.status = 'familiar'
    item.familiarTime = new Date()

    console.log(`🤔 标记为略懂: ${item.content}`)

    this.saveLearningItems(allItems)
    return {
      success: true,
      item: item,
      message: '已标记为略懂'
    }
  }

  /**
   * 标记为掌握
   */
  markAsMastered(itemId) {
    const allItems = this.getAllLearningItems()
    const item = allItems.find(item => item.id === itemId)
    
    if (!item) return false

    if (!this.canMarkMastered(item)) {
      return {
        success: false,
        message: `需要学习${LEARNING_TYPES[item.type].masteredThreshold}次后才能标记为掌握`
      }
    }

    item.status = 'mastered'
    item.masteredTime = new Date()

    console.log(`✅ 标记为掌握: ${item.content}`)

    this.saveLearningItems(allItems)
    return {
      success: true,
      item: item,
      message: '已标记为掌握'
    }
  }

  /**
   * 是否可以标记为略懂
   */
  canMarkFamiliar(item) {
    const threshold = LEARNING_TYPES[item.type]?.familiarThreshold || 3
    return item.learnCount >= threshold && item.status === 'learning'
  }

  /**
   * 是否可以标记为掌握
   */
  canMarkMastered(item) {
    const threshold = LEARNING_TYPES[item.type]?.masteredThreshold || 8
    return item.learnCount >= threshold && item.status !== 'mastered'
  }

  /**
   * 获取学习项目的显示信息
   */
  getItemDisplayInfo(item) {
    const typeConfig = LEARNING_TYPES[item.type] || LEARNING_TYPES.word
    const familiarThreshold = typeConfig.familiarThreshold
    const masteredThreshold = typeConfig.masteredThreshold

    return {
      icon: typeConfig.icon,
      typeName: typeConfig.name,
      status: LEARNING_STATUS[item.status],
      learnCount: item.learnCount,
      familiarThreshold: familiarThreshold,
      masteredThreshold: masteredThreshold,
      canMarkFamiliar: this.canMarkFamiliar(item),
      canMarkMastered: this.canMarkMastered(item),
      progressPercent: this.calculateProgress(item),
      nextTarget: this.getNextTarget(item)
    }
  }

  /**
   * 计算学习进度百分比
   */
  calculateProgress(item) {
    const threshold = LEARNING_TYPES[item.type]?.masteredThreshold || 10
    return Math.min(100, Math.round((item.learnCount / threshold) * 100))
  }

  /**
   * 获取下一个目标
   */
  getNextTarget(item) {
    const typeConfig = LEARNING_TYPES[item.type]
    
    if (item.status === 'mastered') {
      return '已掌握'
    } else if (item.status === 'familiar') {
      const remaining = typeConfig.masteredThreshold - item.learnCount
      return remaining > 0 ? `再学${remaining}次可掌握` : '可以标记为掌握'
    } else {
      const remaining = typeConfig.familiarThreshold - item.learnCount
      return remaining > 0 ? `再学${remaining}次可略懂` : '可以标记为略懂'
    }
  }

  /**
   * 获取所有学习项目
   */
  getAllLearningItems() {
    try {
      const data = wx.getStorageSync(this.storageKey)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('获取学习进度失败:', error)
      return []
    }
  }

  /**
   * 保存学习项目
   */
  saveLearningItems(items) {
    try {
      wx.setStorageSync(this.storageKey, items)
      return true
    } catch (error) {
      console.error('保存学习进度失败:', error)
      return false
    }
  }

  /**
   * 添加学习项目
   */
  addLearningItem(content, type = 'word', metadata = {}) {
    const allItems = this.getAllLearningItems()
    
    // 检查是否已存在相同内容
    const existingItem = allItems.find(item => 
      item.content === content && item.type === type
    )
    
    if (existingItem) {
      console.log('学习项目已存在:', content)
      return existingItem
    }

    // 创建新学习项目
    const newItem = this.createLearningItem(content, type, metadata)
    allItems.push(newItem)
    
    this.saveLearningItems(allItems)
    console.log(`➕ 新增学习项目: ${content} (${type})`)
    
    return newItem
  }

  /**
   * 获取学习统计
   */
  getLearningStats() {
    const allItems = this.getAllLearningItems()
    
    const stats = {
      total: allItems.length,
      learning: 0,
      familiar: 0,
      mastered: 0,
      byType: {}
    }

    // 按状态统计
    allItems.forEach(item => {
      stats[item.status]++
      
      // 按类型统计
      if (!stats.byType[item.type]) {
        stats.byType[item.type] = {
          total: 0,
          learning: 0,
          familiar: 0,
          mastered: 0
        }
      }
      stats.byType[item.type].total++
      stats.byType[item.type][item.status]++
    })

    return stats
  }

  /**
   * 获取今日学习目标
   */
  getTodayTarget() {
    const stats = this.getLearningStats()
    const totalItems = stats.total
    
    if (totalItems === 0) {
      return {
        target: 0,
        completed: 0,
        message: '还没有学习项目'
      }
    }

    // 建议每日学习目标：总项目数的10%，最少3个，最多20个
    const target = Math.max(3, Math.min(20, Math.ceil(totalItems * 0.1)))
    
    // 今日已学习的项目（lastStudyTime是今天的）
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    const allItems = this.getAllLearningItems()
    const todayLearned = allItems.filter(item => {
      const lastStudy = new Date(item.lastStudyTime)
      return lastStudy >= todayStart
    }).length

    return {
      target: target,
      completed: todayLearned,
      remaining: Math.max(0, target - todayLearned),
      message: todayLearned >= target ? '今日目标已完成！' : `还需学习${target - todayLearned}项`
    }
  }
}

// 创建全局实例
const learningProgress = new LearningProgressManager()

module.exports = {
  learningProgress,
  LEARNING_TYPES,
  LEARNING_STATUS
}