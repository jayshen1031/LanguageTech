// pages/parser-detail/parser-detail.js
const app = getApp()

Page({
  data: {
    historyItem: null,
    sentences: [],
    loading: true,
    masteryLevels: {}, // 掌握程度数据 {sentenceId_type: level}
    // type: 'sentence' | 'word_xxx' | 'grammar_xxx'
    // level: 0未看 | 1未掌握 | 2略懂 | 3掌握
    showMasteryReport: false, // 是否显示掌握度报告
    masteryStats: null // 掌握度统计
  },

  onLoad(options) {
    const { id } = options
    
    // 从全局数据获取历史记录
    const historyItem = app.globalData.currentHistoryItem
    
    if (historyItem) {
      this.setData({
        historyItem,
        sentences: historyItem.sentences || [],
        loading: false
      })
      this.loadMasteryLevels(historyItem._id)
    } else if (id) {
      // 如果没有全局数据，从数据库查询
      this.loadHistoryDetail(id)
    } else {
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 从数据库加载历史详情
  loadHistoryDetail(id) {
    const db = wx.cloud.database()
    
    db.collection('japanese_parser_history')
      .doc(id)
      .get()
      .then(res => {
        const historyItem = res.data
        this.setData({
          historyItem,
          sentences: historyItem.sentences || [],
          loading: false
        })
        this.loadMasteryLevels(id)
      })
      .catch(err => {
        console.error('加载详情失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      })
  },

  // 复制内容
  copyContent(e) {
    const { text } = e.currentTarget.dataset
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  // 复制全部解析结果
  copyAllContent() {
    const sentences = this.data.sentences
    let content = ''
    
    sentences.forEach((sentence, index) => {
      content += `【句子${index + 1}】\n`
      content += `原文：${sentence.originalText}\n`
      content += `罗马音：${sentence.romaji}\n`
      content += `翻译：${sentence.translation}\n`
      content += `结构：${sentence.structure}\n`
      
      if (sentence.analysis) {
        content += `\n详细分析：\n${sentence.analysis}\n`
      }
      
      if (sentence.grammar) {
        content += `\n语法要点：\n${sentence.grammar}\n`
      }
      
      if (sentence.vocabulary && sentence.vocabulary.length > 0) {
        content += `\n词汇：\n`
        sentence.vocabulary.forEach(word => {
          content += `${word.japanese} (${word.romaji}) - ${word.chinese}\n`
        })
      }
      
      content += '\n' + '='.repeat(40) + '\n\n'
    })
    
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制全部内容',
          icon: 'success'
        })
      }
    })
  },

  // 返回历史列表
  onBack() {
    wx.navigateBack()
  },

  // 加载掌握程度数据
  loadMasteryLevels(recordId) {
    try {
      const key = `mastery_${recordId}`
      const masteryData = wx.getStorageSync(key) || {}
      this.setData({ masteryLevels: masteryData })
      this.calculateMasteryStats()
    } catch (error) {
      console.error('加载掌握程度失败:', error)
    }
  },

  // 保存掌握程度数据
  saveMasteryLevels() {
    try {
      const { historyItem, masteryLevels } = this.data
      if (!historyItem || !historyItem._id) return
      
      const key = `mastery_${historyItem._id}`
      wx.setStorageSync(key, masteryLevels)
    } catch (error) {
      console.error('保存掌握程度失败:', error)
    }
  },

  // 设置掌握程度
  setMasteryLevel(e) {
    const { type, id, level } = e.currentTarget.dataset
    const key = `${id}_${type}`
    const currentLevel = this.data.masteryLevels[key] || 0
    
    // 循环切换掌握程度: 0 -> 1 -> 2 -> 3 -> 0
    const newLevel = (currentLevel + 1) % 4
    
    this.setData({
      [`masteryLevels.${key}`]: newLevel
    }, () => {
      this.saveMasteryLevels()
      this.calculateMasteryStats()
    })
  },

  // 快速设置掌握程度
  quickSetMastery(e) {
    const { type, id, level } = e.currentTarget.dataset
    const key = `${id}_${type}`
    
    this.setData({
      [`masteryLevels.${key}`]: parseInt(level)
    }, () => {
      this.saveMasteryLevels()
      this.calculateMasteryStats()
    })
  },

  // 计算掌握度统计
  calculateMasteryStats() {
    const { sentences, masteryLevels } = this.data
    
    const stats = {
      sentence: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      word: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 },
      grammar: { total: 0, unseen: 0, unfamiliar: 0, partial: 0, mastered: 0 }
    }
    
    sentences.forEach((sentence, index) => {
      // 句子统计
      stats.sentence.total++
      const sentenceLevel = masteryLevels[`s${index}_sentence`] || 0
      this.updateStatCount(stats.sentence, sentenceLevel)
      
      // 词汇统计
      if (sentence.vocabulary) {
        sentence.vocabulary.forEach((word, wordIndex) => {
          stats.word.total++
          const wordLevel = masteryLevels[`s${index}_word_${wordIndex}`] || 0
          this.updateStatCount(stats.word, wordLevel)
        })
      }
      
      // 语法统计
      if (sentence.grammar) {
        stats.grammar.total++
        const grammarLevel = masteryLevels[`s${index}_grammar`] || 0
        this.updateStatCount(stats.grammar, grammarLevel)
      }
    })
    
    // 计算百分比
    Object.keys(stats).forEach(type => {
      const typeStats = stats[type]
      if (typeStats.total > 0) {
        typeStats.unseenPercent = Math.round((typeStats.unseen / typeStats.total) * 100)
        typeStats.unfamiliarPercent = Math.round((typeStats.unfamiliar / typeStats.total) * 100)
        typeStats.partialPercent = Math.round((typeStats.partial / typeStats.total) * 100)
        typeStats.masteredPercent = Math.round((typeStats.mastered / typeStats.total) * 100)
      }
    })
    
    this.setData({ masteryStats: stats })
  },

  // 更新统计计数
  updateStatCount(stat, level) {
    switch(level) {
      case 0: stat.unseen++; break
      case 1: stat.unfamiliar++; break
      case 2: stat.partial++; break
      case 3: stat.mastered++; break
    }
  },

  // 显示/隐藏掌握度报告
  toggleMasteryReport() {
    this.setData({
      showMasteryReport: !this.data.showMasteryReport
    })
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: [url],
      current: url
    })
  }
})