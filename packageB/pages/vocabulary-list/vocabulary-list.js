// pages/vocabulary-list/vocabulary-list.js

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
    // 页面参数
    type: '', // 词汇类型：all, mastered, unmastered
    pageTitle: '词汇列表',
    totalCount: 0,
    
    // 词汇列表
    vocabularyList: [],
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
    
    // 详情弹窗
    showDetailModal: false,
    selectedWord: null
  },

  onLoad(options) {
    const { type = 'all', title = '词汇列表', count = 0 } = options;
    
    this.setData({
      type,
      pageTitle: title,
      totalCount: parseInt(count)
    });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: title
    });
    
    this.loadVocabularyList();
  },

  // 加载词汇列表
  async loadVocabularyList(append = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      let query = db.collection('vocabulary_integrated');
      
      // 根据类型过滤
      switch (this.data.type) {
        case 'mastered':
          query = query.where({ totalOccurrences: db.command.gte(3) });
          break;
        case 'unmastered':
          query = query.where({ totalOccurrences: db.command.lt(3) });
          break;
        default:
          // 'all' 不需要额外过滤
          break;
      }
      
      // 同时获取总数和当前页数据
      const [countRes, dataRes] = await Promise.all([
        append ? Promise.resolve({ total: this.data.totalCount }) : query.count(),
        query
          .orderBy('totalOccurrences', 'desc')
          .orderBy('lastSeen', 'desc')
          .skip((this.data.page - 1) * this.data.pageSize)
          .limit(this.data.pageSize)
          .get()
      ]);
      
      console.log(`📋 加载${this.data.type}类型词汇，第${this.data.page}页，获取${dataRes.data.length}条记录`);
      
      // 🔧 自动修复例句罗马音
      const fixedData = await this.autoFixRomajiInVocabulary(dataRes.data);
      const newList = append ? [...this.data.vocabularyList, ...fixedData] : fixedData;
      
      this.setData({
        vocabularyList: newList,
        hasMore: dataRes.data.length === this.data.pageSize,
        totalCount: countRes.total || dataRes.data.length
      });
      
      // 更新页面标题显示正确的总数
      if (!append) {
        const realCount = countRes.total || dataRes.data.length;
        this.setData({ totalCount: realCount });
        
        // 如果实际数量与传入的count不一致，更新显示
        console.log(`📊 ${this.data.type}类型实际词汇数: ${realCount}`);
      }
      
    } catch (error) {
      console.error('加载词汇列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 播放发音
  playAudio(e) {
    const { text } = e.currentTarget.dataset;
    
    if (!text) {
      wx.showToast({
        title: '无法获取文本',
        icon: 'none'
      });
      return;
    }
    
    // 调用音频服务播放
    try {
      const audioMCP = require('../../../utils/audioMCP');
      audioMCP.playText(text, 'ja');
    } catch (error) {
      console.error('播放发音失败:', error);
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
    }
  },

  // 显示词汇详情
  showDetail(e) {
    const { index } = e.currentTarget.dataset;
    const selectedWord = this.data.vocabularyList[index];
    
    this.setData({
      selectedWord,
      showDetailModal: true
    });
  },

  // 隐藏词汇详情
  hideDetail() {
    this.setData({
      showDetailModal: false,
      selectedWord: null
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 一次性加载全部词汇
  async loadAllVocabulary() {
    if (this.data.loading) return;

    wx.showModal({
      title: '加载全部词汇',
      content: `将一次性加载全部 ${this.data.totalCount} 个词汇，可能需要较长时间，确定继续吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.doLoadAllVocabulary();
        }
      }
    });
  },

  // 执行一次性加载全部词汇
  async doLoadAllVocabulary() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载全部词汇中...' });

    try {
      let query = db.collection('vocabulary_integrated');
      
      // 根据类型过滤
      switch (this.data.type) {
        case 'mastered':
          query = query.where({ totalOccurrences: db.command.gte(3) });
          break;
        case 'unmastered':
          query = query.where({ totalOccurrences: db.command.lt(3) });
          break;
        default:
          // 'all' 不需要额外过滤
          break;
      }
      
      // 分批获取所有数据（避免超过小程序限制）
      let allData = [];
      let skip = 0;
      const batchSize = 100;
      let hasMoreData = true;
      
      while (hasMoreData) {
        const res = await query
          .orderBy('totalOccurrences', 'desc')
          .orderBy('lastSeen', 'desc')
          .skip(skip)
          .limit(batchSize)
          .get();
        
        if (res.data.length > 0) {
          allData.push(...res.data);
          skip += batchSize;
          
          // 更新加载进度
          wx.showLoading({ 
            title: `已加载 ${allData.length} 个词汇...` 
          });
        } else {
          hasMoreData = false;
        }
      }
      
      console.log(`📚 一次性加载完成，共${allData.length}个词汇`);
      
      this.setData({
        vocabularyList: allData,
        hasMore: false,
        page: Math.ceil(allData.length / this.data.pageSize)
      });
      
      wx.showToast({
        title: `已加载全部 ${allData.length} 个词汇`,
        icon: 'success'
      });
      
    } catch (error) {
      console.error('一次性加载失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  // 跳转到解析页面
  goToParser() {
    wx.navigateTo({
      url: '/packageB/pages/japanese-parser/japanese-parser'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ 
      page: 1,
      vocabularyList: [],
      hasMore: true 
    });
    this.loadVocabularyList();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadVocabularyList(true);
    }
  },

  // 词汇学习事件处理
  onWordLearned(e) {
    const { item, learnCount } = e.detail
    console.log(`📚 词汇学习事件: ${item.content} 已学${learnCount}次`)
    
    // 可以在这里添加学习统计或其他逻辑
    // 比如更新全局学习进度、触发音效等
  },

  // 词汇状态变化处理
  onWordStatusChanged(e) {
    const { item, oldStatus, newStatus } = e.detail
    console.log(`📈 词汇状态变化: ${item.content} ${oldStatus} → ${newStatus}`)
    
    // 显示状态变化提示
    const statusText = {
      'learning': '学习中',
      'familiar': '略懂', 
      'mastered': '掌握'
    }
    
    wx.showToast({
      title: `${item.content} 已${statusText[newStatus]}！`,
      icon: 'success',
      duration: 2000
    })

    // 可以在这里触发庆祝动画、更新统计等
    if (newStatus === 'mastered') {
      // 掌握词汇的特殊处理
      this.celebrateMastery(item)
    }
  },

  // 庆祝掌握词汇
  celebrateMastery(item) {
    // 简单的庆祝反馈
    wx.vibrateShort()
    
    // 可以添加更多庆祝效果
    console.log(`🎉 恭喜掌握词汇: ${item.content}`)
  },

  // 🔧 自动修复词汇列表中例句的罗马音
  async autoFixRomajiInVocabulary(vocabularyData) {
    try {
      console.log('🔧 开始自动修复词汇例句罗马音...')
      
      // 1. 获取解析历史中的句子罗马音映射
      const romajiMap = await this.buildRomajiMapFromHistory()
      
      if (romajiMap.size === 0) {
        console.log('⚠️ 解析历史为空，跳过罗马音修复')
        return vocabularyData
      }
      
      let fixedCount = 0
      let totalExamples = 0
      
      // 2. 为每个词汇修复例句罗马音
      const fixedVocabularyData = vocabularyData.map(vocab => {
        if (!vocab.examples || !Array.isArray(vocab.examples)) {
          return vocab
        }
        
        const fixedExamples = vocab.examples.map(example => {
          totalExamples++
          
          // 如果已有罗马音，跳过
          if (example.romaji && example.romaji.trim() !== '') {
            return example
          }
          
          // 尝试从映射中获取罗马音
          const jpText = example.jp ? example.jp.trim() : ''
          const romajiData = romajiMap.get(jpText)
          
          if (romajiData && romajiData.romaji) {
            fixedCount++
            console.log(`✅ 修复例句: ${jpText} → ${romajiData.romaji}`)
            return {
              ...example,
              romaji: romajiData.romaji
            }
          }
          
          return example
        })
        
        return {
          ...vocab,
          examples: fixedExamples
        }
      })
      
      console.log(`🎉 词汇罗马音修复完成: ${fixedCount}/${totalExamples} 个例句`)
      
      // 3. 显示修复结果提示（仅在有修复时显示）
      if (fixedCount > 0) {
        wx.showToast({
          title: `已修复${fixedCount}个例句`,
          icon: 'success',
          duration: 1000
        })
      }
      
      return fixedVocabularyData
      
    } catch (error) {
      console.error('❌ 自动修复词汇罗马音失败:', error)
      return vocabularyData // 失败时返回原始列表
    }
  },

  // 🗺️ 从解析历史构建句子罗马音映射
  async buildRomajiMapFromHistory() {
    try {
      const romajiMap = new Map()
      
      // 优先从云数据库获取
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        try {
          const res = await db.collection('japanese_parser_history')
            .field({ sentences: true })
            .get()
          
          res.data.forEach(record => {
            if (record.sentences && Array.isArray(record.sentences)) {
              record.sentences.forEach(sentence => {
                if (sentence.originalText && sentence.romaji) {
                  romajiMap.set(sentence.originalText.trim(), {
                    romaji: sentence.romaji,
                    translation: sentence.translation
                  })
                }
              })
            }
          })
          
          console.log(`🗂️ 从云数据库构建了${romajiMap.size}个句子的罗马音映射`)
          return romajiMap
        } catch (cloudError) {
          console.log('⚠️ 云数据库获取失败，尝试本地存储')
        }
      }
      
      // 备选方案：从本地存储获取
      const localHistory = wx.getStorageSync('parser_history') || []
      localHistory.forEach(record => {
        if (record.sentences && Array.isArray(record.sentences)) {
          record.sentences.forEach(sentence => {
            if (sentence.originalText && sentence.romaji) {
              romajiMap.set(sentence.originalText.trim(), {
                romaji: sentence.romaji,
                translation: sentence.translation
              })
            }
          })
        }
      })
      
      console.log(`🗂️ 从本地存储构建了${romajiMap.size}个句子的罗马音映射`)
      return romajiMap
      
    } catch (error) {
      console.error('❌ 构建罗马音映射失败:', error)
      return new Map()
    }
  }
});