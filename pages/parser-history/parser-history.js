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
    
    // 并行加载云数据库和本地存储的数据
    const cloudPromise = db.collection('japanese_parser_history')
      .where(query)
      .orderBy(orderBy, order)
      .skip(this.data.page * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .catch(err => {
        console.log('云数据库加载失败，使用本地数据:', err)
        return { data: [] }
      })
    
    const localPromise = new Promise(resolve => {
      try {
        // 只在第一页时加载本地存储数据
        if (this.data.page === 0) {
          const localHistory = wx.getStorageSync('parser_history') || []
          
          // 应用筛选条件
          let filteredLocal = localHistory
          if (this.data.filterType === 'favorite') {
            filteredLocal = localHistory.filter(item => item.favorite)
          }
          
          resolve({ data: filteredLocal })
        } else {
          resolve({ data: [] })
        }
      } catch (error) {
        console.log('本地存储读取失败:', error)
        resolve({ data: [] })
      }
    })
    
    return Promise.all([cloudPromise, localPromise])
      .then(([cloudRes, localRes]) => {
        const cloudData = cloudRes.data || []
        const localData = localRes.data || []
        
        // 合并云数据和本地数据
        const newList = [...cloudData, ...localData]
        
        console.log(`加载数据: 云数据${cloudData.length}条, 本地数据${localData.length}条`)
        
        // 格式化时间和预览
        newList.forEach(item => {
          item.displayTime = this.formatTime(item.createTime)
          item.isLocal = item._id && item._id.startsWith('local_')
          
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
        
        // 合并到现有列表并去重
        const allList = [...this.data.historyList, ...newList]
        const uniqueList = this.removeDuplicates(allList)
        
        this.setData({
          historyList: uniqueList,
          hasMore: cloudData.length === this.data.pageSize, // 只根据云数据判断是否有更多
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
      url: `/packageB/pages/parser-detail/parser-detail?id=${item._id}`
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
          this.deleteRecord(item, index)
        }
      }
    })
  },

  // 删除记录（同时删除云数据库和本地存储）
  deleteRecord(item, index) {
    const db = wx.cloud.database()
    
    // 先删除云数据库中的记录
    const deletePromises = []
    
    // 如果是云数据库记录（_id不以'local_'开头）
    if (item._id && !item._id.startsWith('local_')) {
      deletePromises.push(
        db.collection('japanese_parser_history')
          .doc(item._id)
          .remove()
          .catch(err => {
            console.log('云数据库删除失败（可能记录不存在）:', err)
            // 不抛出错误，继续执行本地存储删除
          })
      )
    }
    
    // 同时删除本地存储中可能存在的记录
    const localDeletePromise = new Promise((resolve) => {
      try {
        const localHistory = wx.getStorageSync('parser_history') || []
        
        // 根据内容匹配删除本地记录
        let findIndex = -1
        if (item.inputMethod === 'text' && item.inputText) {
          // 文本输入：根据输入文本匹配
          findIndex = localHistory.findIndex(local => 
            local.inputText && local.inputText.trim() === item.inputText.trim()
          )
        } else if (item.sentences && item.sentences.length > 0) {
          // 图片输入：根据第一个句子的原文匹配
          const targetText = item.sentences[0].originalText
          findIndex = localHistory.findIndex(local => 
            local.sentences && local.sentences.length > 0 &&
            local.sentences[0].originalText === targetText
          )
        }
        
        // 如果找到匹配的记录，删除它
        if (findIndex !== -1) {
          localHistory.splice(findIndex, 1)
          wx.setStorageSync('parser_history', localHistory)
          console.log('本地存储记录已删除')
        }
        
        resolve()
      } catch (error) {
        console.log('本地存储删除失败:', error)
        resolve() // 不阻塞主流程
      }
    })
    
    deletePromises.push(localDeletePromise)
    
    // 等待所有删除操作完成
    Promise.all(deletePromises)
      .then(() => {
        // 从界面列表中移除
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
        console.error('删除操作失败:', err)
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        })
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
    wx.navigateTo({
      url: '/packageB/pages/japanese-parser/japanese-parser'
    })
  },

  // 清空所有历史记录（彻底清空）
  async clearAllRecords() {
    wx.showModal({
      title: '危险操作',
      content: '确定要清空所有解析历史记录吗？此操作不可恢复！',
      confirmColor: '#ff0000',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清空中...' })
          
          try {
            const db = wx.cloud.database()
            const _ = db.command
            
            // 批量删除云数据库中的所有记录
            // 先获取所有记录的ID
            let allIds = []
            let hasMore = true
            let page = 0
            
            while (hasMore) {
              const res = await db.collection('japanese_parser_history')
                .where({
                  _openid: _.exists(true)
                })
                .skip(page * 100)
                .limit(100)
                .field({ _id: true })
                .get()
              
              if (res.data.length > 0) {
                allIds = allIds.concat(res.data.map(item => item._id))
                page++
                hasMore = res.data.length === 100
              } else {
                hasMore = false
              }
            }
            
            console.log(`准备删除${allIds.length}条记录`)
            
            // 批量删除（每次删除20条）
            for (let i = 0; i < allIds.length; i += 20) {
              const batch = allIds.slice(i, i + 20)
              const deletePromises = batch.map(id => 
                db.collection('japanese_parser_history')
                  .doc(id)
                  .remove()
                  .catch(err => console.log(`删除${id}失败:`, err))
              )
              await Promise.all(deletePromises)
            }
            
            // 清空本地存储
            wx.removeStorageSync('parser_history')
            
            wx.hideLoading()
            
            // 清空界面数据
            this.setData({
              historyList: [],
              page: 0,
              hasMore: false
            })
            
            wx.showToast({
              title: `已清空${allIds.length}条记录`,
              icon: 'success'
            })
            
          } catch (error) {
            wx.hideLoading()
            console.error('清空失败:', error)
            wx.showToast({
              title: '清空失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 删除所有重复记录
  async clearDuplicates() {
    wx.showLoading({ title: '清理重复记录中...' })
    
    try {
      const db = wx.cloud.database()
      
      // 获取所有记录
      const res = await db.collection('japanese_parser_history')
        .where({
          _openid: db.command.exists(true)
        })
        .get()
      
      const allRecords = res.data
      const seenContent = new Set()
      const duplicateIds = []
      
      // 找出重复记录
      allRecords.forEach(record => {
        let contentKey = ''
        
        if (record.inputMethod === 'text' && record.inputText) {
          contentKey = `text:${record.inputText.trim()}`
        } else if (record.inputMethod === 'image' && record.sentences && record.sentences.length > 0) {
          contentKey = `image:${record.sentences[0].originalText}`
        }
        
        if (contentKey) {
          if (seenContent.has(contentKey)) {
            // 这是重复记录
            duplicateIds.push(record._id)
          } else {
            seenContent.add(contentKey)
          }
        }
      })
      
      // 批量删除重复记录
      if (duplicateIds.length > 0) {
        const deletePromises = duplicateIds.map(id => 
          db.collection('japanese_parser_history')
            .doc(id)
            .remove()
            .catch(err => console.log(`删除记录${id}失败:`, err))
        )
        
        await Promise.all(deletePromises)
      }
      
      wx.hideLoading()
      
      wx.showToast({
        title: `清理了${duplicateIds.length}条重复记录`,
        icon: 'success'
      })
      
      // 重新加载数据
      this.setData({
        historyList: [],
        page: 0,
        hasMore: true
      })
      this.loadHistory()
      
    } catch (error) {
      wx.hideLoading()
      console.error('清理重复记录失败:', error)
      wx.showToast({
        title: '清理失败',
        icon: 'none'
      })
    }
  },

  // 清理本地存储
  clearLocalStorage() {
    wx.showModal({
      title: '清理本地缓存',
      content: '这将清除所有本地存储的解析记录（不影响云端数据），确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('parser_history')
            wx.showToast({
              title: '本地缓存已清理',
              icon: 'success'
            })
            
            // 重新加载数据
            this.setData({
              historyList: [],
              page: 0,
              hasMore: true
            })
            this.loadHistory()
          } catch (error) {
            console.error('清理本地缓存失败:', error)
            wx.showToast({
              title: '清理失败',
              icon: 'none'
            })
          }
        }
      }
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
          url: '/packageB/pages/history-vocabulary/history-vocabulary'
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