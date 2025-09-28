const app = getApp()

// 初始化云开发
if (!wx.cloud) {
  console.error('请使用 2.2.3 或以上的基础库以使用云能力')
} else {
  wx.cloud.init({
    env: 'cloud1-2g49srond2b01891',
    traceUser: true
  })
}

const db = wx.cloud.database()

Page({
  data: {
    userInfo: {},
    studyDays: 0,
    todayCompleted: false,
    
    // 词汇库统计
    totalWordsInLibrary: 0,     // 词汇库总量
    newWordsAvailable: 0,       // 可新学词汇数
    reviewWordsAvailable: 0,    // 可复习词汇数
    
    // 今日学习计划
    selectedTotal: 10,          // 用户选择的总学习量
    newWordsCount: 2,           // 新学词汇数（25%）
    reviewWordsCount: 8,        // 复习词汇数（75%）
    
    progressPercent: 0,
    showDevTools: true,
    gridCols: 4,
    
    // 学习计划配置（75%复习 + 25%新学）
    studyPlanConfig: {
      newWordPercent: 25,      // 新学占比25%
      reviewPercent: 75,       // 复习占比75%
      availableTotals: [10, 20, 30, 40, 50]  // 可选学习量
    }
  },

  onLoad() {
    this.getUserInfo()
    this.loadStudyData()
    this.loadUserPreferences()
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadStudyData()
  },

  getUserInfo() {
    // 获取用户信息
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo })
    } else {
      // 使用默认用户信息
      this.setData({
        userInfo: {
          nickName: '语伴君用户',
          avatarUrl: ''
        }
      })
    }
  },

  async loadStudyData() {
    try {
      wx.showLoading({ title: '加载学习数据...' })
      
      // 加载真实的学习统计数据
      await Promise.all([
        this.loadVocabularyStats(),
        this.loadTodayPlan(),
        this.loadStudyDays()
      ])
      
    } catch (error) {
      console.error('加载学习数据失败:', error)
      // 使用默认数据
      this.setData({
        studyDays: 1,
        totalWords: 0,
        masteredWords: 0,
        progressPercent: 0
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载词汇库统计数据
  async loadVocabularyStats() {
    try {
      console.log('🔍 开始加载词汇库统计数据...')
      
      // 首先检查是否有解析历史
      const historyRes = await db.collection('japanese_parser_history').count()
      console.log(`📚 解析历史记录查询结果: ${historyRes.total}条`)
      
      if (historyRes.total === 0) {
        // 没有任何解析记录
        this.setData({
          totalWordsInLibrary: 0,
          newWordsAvailable: 0,
          reviewWordsAvailable: 0,
          progressPercent: 0
        })
        console.log('📝 还没有解析过任何内容，请先去日语解析页面')
        return
      }
      
      // 尝试查询词汇整合表
      console.log('🔍 尝试查询 vocabulary_integrated 表...')
      try {
        const allWords = await db.collection('vocabulary_integrated').get()
        console.log(`📊 vocabulary_integrated 查询结果: ${allWords.data.length}条记录`)
        
        if (allWords.data.length > 0) {
          // 按掌握程度分类词汇
          const newWords = allWords.data.filter(word => word.totalOccurrences <= 1)
          const reviewWords = allWords.data.filter(word => word.totalOccurrences > 1)
          
          this.setData({
            totalWordsInLibrary: allWords.data.length,
            newWordsAvailable: newWords.length,
            reviewWordsAvailable: reviewWords.length,
            progressPercent: allWords.data.length > 0 ? 
              Math.round((reviewWords.length / allWords.data.length) * 100) : 0
          })
          
          console.log(`📊 词汇库统计: 总计${allWords.data.length}个, 新词${newWords.length}个, 复习词${reviewWords.length}个`)
        } else {
          // 词汇整合表存在但为空，启动前端整合
          console.log('💡 词汇整合表为空，启动前端自动整合...')
          this.frontendIntegration(historyRes.total)
        }
      } catch (integrationError) {
        // 词汇整合表不存在，启动前端整合
        console.log('💡 词汇整合表不存在，启动前端自动整合...')
        this.frontendIntegration(historyRes.total)
      }
      
    } catch (error) {
      console.error('加载词汇统计失败:', error)
      this.setData({
        totalWordsInLibrary: 0,
        newWordsAvailable: 0,
        reviewWordsAvailable: 0,
        progressPercent: 0
      })
    }
  },

  // 前端快速整合（替代云函数）
  async frontendIntegration(historyCount) {
    console.log(`🚀 前端快速整合开始，共${historyCount}条记录`)
    
    // 先设置加载状态
    this.setData({
      totalWordsInLibrary: 0,
      newWordsAvailable: 0,
      reviewWordsAvailable: 0,
      progressPercent: 0
    })
    
    try {
      // 获取所有解析历史（无限制，分批处理）
      let historyRes = { data: [] }
      let hasMore = true
      let skip = 0
      const batchSize = 100
      
      console.log('📊 开始分批获取所有解析记录...')
      
      while (hasMore) {
        const batchRes = await db.collection('japanese_parser_history')
          .orderBy('createTime', 'desc')
          .skip(skip)
          .limit(batchSize)
          .get()
        
        if (batchRes.data.length > 0) {
          historyRes.data.push(...batchRes.data)
          skip += batchSize
          console.log(`📥 已获取${historyRes.data.length}条记录...`)
        } else {
          hasMore = false
        }
      }
      
      console.log(`📥 获取到${historyRes.data.length}条解析记录`)
      
      const vocabularyMap = new Map()
      
      // 提取词汇
      historyRes.data.forEach(record => {
        if (record.sentences && Array.isArray(record.sentences)) {
          record.sentences.forEach(sentence => {
            if (sentence.vocabulary && Array.isArray(sentence.vocabulary)) {
              sentence.vocabulary.forEach(vocab => {
                if (vocab.japanese && vocab.romaji && vocab.chinese) {
                  const key = vocab.japanese
                  
                  if (!vocabularyMap.has(key)) {
                    vocabularyMap.set(key, {
                      word: vocab.japanese,
                      romaji: vocab.romaji,
                      meaning: vocab.chinese,
                      examples: [],
                      sources: [],
                      totalOccurrences: 0,
                      firstSeen: record.createTime || new Date(),
                      lastSeen: record.createTime || new Date(),
                      level: 'user_parsed',
                      tags: ['解析获得']
                    })
                  }
                  
                  const wordData = vocabularyMap.get(key)
                  
                  // 添加例句
                  if (!wordData.sources.includes(record._id)) {
                    wordData.examples.push({
                      jp: sentence.originalText,
                      cn: sentence.translation,
                      source: record.title || '解析记录',
                      recordId: record._id
                    })
                    wordData.sources.push(record._id)
                    wordData.totalOccurrences++
                    
                    if (record.createTime > wordData.lastSeen) {
                      wordData.lastSeen = record.createTime
                    }
                  }
                }
              })
            }
          })
        }
      })
      
      console.log(`📝 提取到${vocabularyMap.size}个不重复词汇`)
      
      // 分批插入到数据库
      const vocabularyArray = Array.from(vocabularyMap.values())
      let insertedCount = 0
      
      for (const wordData of vocabularyArray) {
        try {
          await db.collection('vocabulary_integrated').add({
            data: wordData
          })
          insertedCount++
          
          if (insertedCount % 5 === 0) {
            console.log(`✅ 已插入${insertedCount}/${vocabularyArray.length}个词汇`)
          }
        } catch (error) {
          console.error(`❌ 插入词汇失败: ${wordData.word}`, error)
        }
      }
      
      console.log(`🎉 前端整合完成! 成功插入${insertedCount}个词汇`)
      
      // 重新加载统计
      setTimeout(() => {
        this.loadVocabularyStats()
      }, 500)
      
    } catch (error) {
      console.error('前端整合失败:', error)
      this.setData({
        totalWordsInLibrary: 0,
        newWordsAvailable: 0,
        reviewWordsAvailable: 0,
        progressPercent: 0
      })
    }
  },

  // 后台异步整合
  async backgroundIntegration(historyCount) {
    console.log(`🎯 backgroundIntegration 被调用，历史记录数: ${historyCount}`)
    
    // 先设置默认状态
    this.setData({
      totalWordsInLibrary: 0,
      newWordsAvailable: 0,
      reviewWordsAvailable: 0,
      progressPercent: 0
    })
    
    console.log(`🔄 发现${historyCount}条解析记录，开始后台异步整合...`)
    
    // 完全静默处理，不显示任何提示
    
    try {
      // 异步执行整合，不等待结果
      setTimeout(async () => {
        try {
          console.log('⚡ 开始调用 vocabulary-integration 云函数...')
          const result = await wx.cloud.callFunction({
            name: 'vocabulary-integration',
            data: {
              action: 'rebuild_all'
            }
          })
          console.log('📡 云函数调用结果:', result)
          
          if (result.result.success) {
            console.log(`✅ 后台整合完成: ${result.result.totalWords}个词汇`)
            
            // 整合完成后重新加载统计（不显示loading）
            await this.loadVocabularyStats()
            
            // 静默完成，只在控制台记录
            console.log(`🎉 词汇库整合完成，共${result.result.totalWords}个词汇，用户界面已自动更新`)
          }
        } catch (error) {
          console.error('后台整合失败:', error)
          // 静默失败，不打扰用户
        }
      }, 500) // 延迟500ms开始执行，让页面先渲染
      
    } catch (error) {
      console.error('启动后台整合失败:', error)
    }
  },

  // 手动触发词汇整合（保留用于调试或特殊情况）
  async startVocabularyIntegration() {
    wx.showLoading({ title: '正在手动整合词汇...' })
    
    try {
      // 先尝试重建词汇表（如果云函数存在）
      const result = await wx.cloud.callFunction({
        name: 'vocabulary-integration',
        data: {
          action: 'rebuild_all'
        }
      })
      
      if (result.result.success) {
        wx.showToast({
          title: `手动整合完成：${result.result.totalWords}个词汇`,
          icon: 'success',
          duration: 2000
        })
        
        // 重新加载统计
        setTimeout(() => {
          this.loadVocabularyStats()
        }, 1000)
      }
      
    } catch (error) {
      console.error('词汇整合失败:', error)
      wx.showModal({
        title: '整合失败',
        content: '词汇整合功能需要先部署云函数。请先部署 vocabulary-integration 云函数。',
        confirmText: '了解',
        showCancel: false
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载今日学习计划
  async loadTodayPlan() {
    try {
      // 从本地存储获取用户选择的学习量
      const savedTotal = wx.getStorageSync('selectedTotal') || 10
      
      // 按75%复习 + 25%新学分配
      const { newWordPercent, reviewPercent } = this.data.studyPlanConfig
      const newWordsCount = Math.floor(savedTotal * newWordPercent / 100)
      const reviewWordsCount = savedTotal - newWordsCount
      
      this.setData({
        selectedTotal: savedTotal,
        newWordsCount,
        reviewWordsCount
      })
      
      console.log(`📅 今日计划: 总计${savedTotal}个 (新学${newWordsCount}个[${newWordPercent}%], 复习${reviewWordsCount}个[${reviewPercent}%])`)
      
    } catch (error) {
      console.error('加载学习计划失败:', error)
    }
  },

  // 加载学习天数统计
  async loadStudyDays() {
    try {
      // 从解析历史统计学习天数
      const db = wx.cloud.database()
      const historyRes = await db.collection('japanese_parser_history')
        .field({ createTime: true })
        .get()
      
      if (historyRes.data.length > 0) {
        // 统计不同日期的学习记录
        const dates = new Set()
        historyRes.data.forEach(record => {
          if (record.createTime) {
            const date = new Date(record.createTime).toDateString()
            dates.add(date)
          }
        })
        
        this.setData({ studyDays: dates.size })
        console.log(`📈 已学习${dates.size}天`)
      }
    } catch (error) {
      console.error('加载学习天数失败:', error)
    }
  },

  // 跳转到新学页面
  goToNewWords() {
    const { newWordsCount, newWordsAvailable } = this.data
    
    if (newWordsAvailable === 0) {
      wx.showModal({
        title: '无新词可学',
        content: '当前没有新词汇可学习，去解析更多内容或选择复习模式',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    wx.switchTab({
      url: `/pages/learn/learn?count=${newWordsCount}&type=new`
    })
  },

  // 跳转到复习页面  
  goToReviewWords() {
    const { reviewWordsCount, reviewWordsAvailable } = this.data
    
    if (reviewWordsAvailable === 0) {
      wx.showToast({
        title: '暂无词汇需要复习',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/review/review?count=${reviewWordsCount}&type=review`
    })
  },

  // 智能学习计划 - 混合新学和复习
  goToSmartPlan() {
    const { selectedTotal, totalWordsInLibrary } = this.data
    
    if (totalWordsInLibrary === 0) {
      wx.showModal({
        title: '词汇库为空',
        content: '请先去"日语解析"页面解析一些内容',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    wx.switchTab({
      url: `/pages/learn/learn?count=${selectedTotal}&type=mixed`
    })
  },

  // 学习量选择
  showStudyAmountSelection() {
    const { totalWordsInLibrary, newWordsAvailable, reviewWordsAvailable, studyPlanConfig } = this.data
    
    if (totalWordsInLibrary === 0) {
      wx.showModal({
        title: '词汇库为空',
        content: '请先去"日语解析"页面解析一些内容，建立你的个性化词汇库',
        confirmText: '去解析',
        cancelText: '了解',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/packageB/pages/japanese-parser/japanese-parser'
            })
          }
        }
      })
      return
    }
    
    const options = studyPlanConfig.availableTotals.map(total => {
      const newCount = Math.floor(total * studyPlanConfig.newWordPercent / 100)
      const reviewCount = total - newCount
      return `${total}个词汇 (新学${newCount} + 复习${reviewCount})`
    })
    
    options.unshift(`词汇库：${totalWordsInLibrary}个 (可新学${newWordsAvailable} + 可复习${reviewWordsAvailable})`)
    options.push('自定义数量')
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        if (res.tapIndex === 0) return // 点击了统计信息
        
        if (res.tapIndex === options.length - 1) {
          // 自定义数量
          this.showCustomAmountSetting()
        } else {
          // 选择预设数量
          const selectedTotal = studyPlanConfig.availableTotals[res.tapIndex - 1]
          this.updateStudyAmount(selectedTotal)
        }
      }
    })
  },

  // 更新学习量
  updateStudyAmount(total) {
    const { newWordPercent, reviewPercent } = this.data.studyPlanConfig
    const newWordsCount = Math.floor(total * newWordPercent / 100)
    const reviewWordsCount = total - newWordsCount
    
    this.setData({
      selectedTotal: total,
      newWordsCount,
      reviewWordsCount
    })
    
    // 保存到本地存储
    wx.setStorageSync('selectedTotal', total)
    
    wx.showToast({
      title: `已设置${total}个词汇 (新学${newWordsCount} + 复习${reviewWordsCount})`,
      icon: 'success',
      duration: 2000
    })
  },

  // 显示自定义数量设置
  showCustomAmountSetting() {
    const { totalWordsInLibrary, newWordsAvailable, reviewWordsAvailable } = this.data
    const maxRecommended = Math.min(50, Math.floor((newWordsAvailable + reviewWordsAvailable) * 0.8))
    
    wx.showModal({
      title: '自定义学习数量',
      content: `词汇库共${totalWordsInLibrary}个\n推荐范围: 5-${maxRecommended}个\n(75%复习 + 25%新学)`,
      editable: true,
      placeholderText: `例如: ${Math.min(20, maxRecommended)}`,
      success: (res) => {
        if (res.confirm && res.content) {
          const total = parseInt(res.content)
          if (total >= 5 && total <= 100) {
            if (total > newWordsAvailable + reviewWordsAvailable) {
              wx.showModal({
                title: '数量超出库存',
                content: `当前最多可学习${newWordsAvailable + reviewWordsAvailable}个词汇`,
                showCancel: false
              })
            } else {
              this.updateStudyAmount(total)
            }
          } else {
            wx.showToast({
              title: '请输入5-100之间的数字',
              icon: 'none'
            })
          }
        }
      }
    })
  },


  // 跳转到语法学习计划
  goToGrammarStudy() {
    wx.navigateTo({
      url: '/packageA/pages/grammar-study/grammar-study'
    })
  },

  // 跳转到语法库
  goToGrammarLibrary() {
    wx.navigateTo({
      url: '/packageA/pages/grammar-library/grammar-library'
    })
  },

  
  
  
  // 跳转到假名对照学习
  goToKanaMerged() {
    wx.navigateTo({
      url: '/packageA/pages/kana-merged/kana-merged'
    })
  },
  
  // 跳转到生词本
  goToWordbook() {
    wx.switchTab({
      url: '/pages/wordbook/wordbook'
    })
  },
  
  // 加载用户偏好设置
  loadUserPreferences() {
    try {
      const gridCols = wx.getStorageSync('gridCols') || 4;
      this.setData({ gridCols });
    } catch (error) {
      // 加载用户偏好失败
    }
  },

  // 改变网格列数
  changeGridCols(e) {
    const cols = parseInt(e.currentTarget.dataset.cols);
    this.setData({ gridCols: cols });
    
    // 保存到本地存储
    try {
      wx.setStorageSync('gridCols', cols);
    } catch (error) {
      // 保存用户偏好失败
    }
  },

  // 显示学习统计
  showLearningStats() {
    const { totalWords, masteredWords, studyDays, progressPercent } = this.data;
    wx.showModal({
      title: '学习统计',
      content: `学习天数：${studyDays}天\n总词汇：${totalWords}个\n已掌握：${masteredWords}个\n掌握率：${progressPercent}%`,
      showCancel: false
    });
  },

  // 跳转到日语解析工具
  goToParser() {
    wx.navigateTo({
      url: '/packageB/pages/japanese-parser/japanese-parser'
    })
  },
  
  // 跳转到解析复习
  goToParserReview() {
    wx.navigateTo({
      url: '/packageB/pages/parser-review/parser-review'
    })
  },


  // 跳转到语音对话页面
  goToVoiceDialogue() {
    wx.navigateTo({
      url: '/packageA/pages/voice-dialogue/voice-dialogue'
    })
  },

  // 显示更多功能
  showMore() {
    wx.showActionSheet({
      itemList: ['学习设置', '学习报告', '意见反馈', '关于我们'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showSettings();
            break;
          case 1:
            this.showLearningReport();
            break;
          case 2:
            this.showFeedback();
            break;
          case 3:
            this.showAbout();
            break;
        }
      }
    });
  },

  // 显示设置
  showSettings() {
    wx.showModal({
      title: '学习设置',
      content: '每日学习目标、提醒时间等设置功能开发中...',
      showCancel: false
    });
  },

  // 显示学习报告
  showLearningReport() {
    wx.showModal({
      title: '学习报告',
      content: '详细的学习进度分析和统计报告功能开发中...',
      showCancel: false
    });
  },

  // 显示反馈
  showFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '您可以通过以下方式联系我们：\n邮箱：feedback@example.com\n微信群：加群功能开发中',
      showCancel: false
    });
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于语伴君',
      content: '语伴君 v1.0\n一款智能日语学习助手\n\n功能特色：\n• AI语法分析\n• 间隔复习算法\n• 50音图学习\n• 对话练习',
      showCancel: false
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStudyData()
    wx.stopPullDownRefresh()
  }
})