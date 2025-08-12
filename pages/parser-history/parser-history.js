// pages/parser-history/parser-history.js
const app = getApp()

Page({
  data: {
    historyList: [],
    loading: false,
    hasMore: true,
    page: 0,
    pageSize: 20,
    filterType: 'all' // all, favorite, recent
  },

  onLoad() {
    this.loadHistory()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      historyList: [],
      page: 0,
      hasMore: true
    })
    this.loadHistory().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadHistory()
    }
  },

  // 加载历史记录
  loadHistory() {
    if (this.data.loading) return Promise.resolve()
    
    this.setData({ loading: true })
    
    const db = wx.cloud.database()
    const _ = db.command
    
    // 构建查询条件
    let query = {
      _openid: _.exists(true)
    }
    
    if (this.data.filterType === 'favorite') {
      query.favorite = true
    }
    
    // 构建排序规则
    let orderBy = 'createTime'
    let order = 'desc'
    
    if (this.data.filterType === 'recent') {
      orderBy = 'updateTime'
    }
    
    return db.collection('japanese_parser_history')
      .where(query)
      .orderBy(orderBy, order)
      .skip(this.data.page * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const newList = res.data
        
        // 格式化时间
        newList.forEach(item => {
          item.displayTime = this.formatTime(item.createTime)
          // 提取第一个句子作为预览
          if (item.sentences && item.sentences.length > 0) {
            item.preview = item.sentences[0].originalText
            if (item.sentences.length > 1) {
              item.preview += '...'
            }
          } else if (item.inputText) {
            item.preview = item.inputText.substring(0, 50)
            if (item.inputText.length > 50) {
              item.preview += '...'
            }
          }
        })
        
        // 合并新数据到现有列表并去重
        const allList = [...this.data.historyList, ...newList]
        const uniqueList = this.removeDuplicates(allList)
        
        this.setData({
          historyList: uniqueList,
          hasMore: newList.length === this.data.pageSize,
          page: this.data.page + 1,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载历史记录失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      })
  },

  // 切换筛选类型
  onFilterChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.filterType) return
    
    this.setData({
      filterType: type,
      historyList: [],
      page: 0,
      hasMore: true
    })
    this.loadHistory()
  },
  
  // 去重处理函数
  removeDuplicates(list) {
    const uniqueList = []
    const seenKeys = new Set()
    
    list.forEach(item => {
      // 生成去重键：对于文本输入使用inputText，对于图片输入使用第一个句子的原文
      let dedupeKey = ''
      if (item.inputMethod === 'text' && item.inputText) {
        dedupeKey = item.inputText.trim()
      } else if (item.sentences && item.sentences.length > 0) {
        dedupeKey = item.sentences[0].originalText || ''
      } else {
        dedupeKey = item._id // 兜底使用ID
      }
      
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey)
        uniqueList.push(item)
      }
    })
    
    // 按创建时间重新排序（最新的在前）
    return uniqueList.sort((a, b) => {
      const timeA = new Date(a.createTime).getTime()
      const timeB = new Date(b.createTime).getTime()
      return timeB - timeA
    })
  },

  // 查看详情
  onViewDetail(e) {
    const item = e.currentTarget.dataset.item
    // 将完整的历史记录传递到详情页
    const app = getApp()
    app.globalData.currentHistoryItem = item
    wx.navigateTo({
      url: `/pages/parser-detail/parser-detail?id=${item._id}`
    })
  },

  // 切换收藏状态
  onToggleFavorite(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.historyList[index]
    
    const db = wx.cloud.database()
    db.collection('japanese_parser_history')
      .doc(item._id)
      .update({
        data: {
          favorite: !item.favorite,
          updateTime: new Date()
        }
      })
      .then(() => {
        const key = `historyList[${index}].favorite`
        this.setData({
          [key]: !item.favorite
        })
        
        wx.showToast({
          title: item.favorite ? '已取消收藏' : '已收藏',
          icon: 'success'
        })
      })
      .catch(err => {
        console.error('更新收藏状态失败:', err)
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
      })
  },

  // 删除记录
  onDelete(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.historyList[index]
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条解析记录吗？',
      success: (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('japanese_parser_history')
            .doc(item._id)
            .remove()
            .then(() => {
              const newList = [...this.data.historyList]
              newList.splice(index, 1)
              this.setData({
                historyList: newList
              })
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
            })
            .catch(err => {
              console.error('删除失败:', err)
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            })
        }
      }
    })
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return ''
    
    const now = new Date()
    const target = new Date(date)
    const diff = now - target
    
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    
    if (diff < minute) {
      return '刚刚'
    } else if (diff < hour) {
      return Math.floor(diff / minute) + '分钟前'
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前'
    } else if (diff < 7 * day) {
      return Math.floor(diff / day) + '天前'
    } else {
      return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    }
  },

  // 跳转到解析页面
  onGoToParser() {
    wx.switchTab({
      url: '/pages/japanese-parser/japanese-parser'
    })
  },

  // 提取所有历史词汇
  extractVocabulary() {
    wx.showLoading({
      title: '提取词汇中...'
    })

    const db = wx.cloud.database()
    
    // 获取所有历史记录
    db.collection('japanese_parser_history')
      .where({
        _openid: db.command.exists(true)
      })
      .get()
      .then(res => {
        const allRecords = res.data
        const vocabularyMap = new Map()
        
        // 遍历所有记录，提取词汇
        allRecords.forEach(record => {
          if (record.sentences && Array.isArray(record.sentences)) {
            record.sentences.forEach(sentence => {
              if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
                sentence.vocabulary.forEach(word => {
                  if (word.japanese && word.chinese) {
                    // 使用日文作为去重键
                    const key = word.japanese.trim()
                    if (!vocabularyMap.has(key)) {
                      vocabularyMap.set(key, {
                        japanese: word.japanese.trim(),
                        romaji: word.romaji || '',
                        chinese: word.chinese.trim(),
                        sourceRecordId: record._id,
                        sourceTime: record.createTime,
                        learned: false,
                        addedToStudy: false
                      })
                    }
                  }
                })
              }
            })
          }
        })
        
        const vocabularyList = Array.from(vocabularyMap.values())
        
        wx.hideLoading()
        
        // 跳转到词汇表页面
        const app = getApp()
        app.globalData.historyVocabulary = vocabularyList
        
        wx.navigateTo({
          url: '/pages/history-vocabulary/history-vocabulary'
        })
        
        wx.showToast({
          title: `提取到${vocabularyList.length}个词汇`,
          icon: 'success'
        })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('提取词汇失败:', err)
        wx.showToast({
          title: '提取失败',
          icon: 'none'
        })
      })
  }
})