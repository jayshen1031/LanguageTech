// pages/parser-detail/parser-detail.js
const app = getApp()

Page({
  data: {
    historyItem: null,
    sentences: [],
    loading: true
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

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: [url],
      current: url
    })
  }
})