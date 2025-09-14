// pages/vocabulary-search/vocabulary-search.js

Page({
  data: {
    keyword: '',
    vocabularyList: [],
    categories: [],
    selectedCategory: '',
    selectedPOS: '', // 词性
    partOfSpeechOptions: [
      { value: '', label: '全部词性' },
      { value: 'verb', label: '动词' },
      { value: 'noun', label: '名词' },
      { value: 'adjective', label: '形容词' },
      { value: 'adverb', label: '副词' },
      { value: 'particle', label: '助词' }
    ],
    page: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    hasMore: true,
    showFilters: false,
    sortOptions: [
      { value: 'sortIndex', label: '默认排序' },
      { value: 'frequency', label: '使用频率' },
      { value: 'word', label: '日语字母' },
      { value: 'reading', label: '假名顺序' }
    ],
    selectedSort: 'sortIndex',
    selectedSortLabel: '默认排序', // 当前选中的排序标签
    stats: null
  },

  onLoad() {
    this.loadCategories();
    this.loadStats();
    this.searchVocabulary();
  },

  // 加载分类
  async loadCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: { action: 'getCategories' }
      });

      if (res.result.success) {
        const categories = [
          { name: '', label: '全部分类', count: 0 },
          ...res.result.data.map(cat => ({
            name: cat.name,
            label: this.getCategoryLabel(cat.name),
            count: cat.count
          }))
        ];

        this.setData({ categories });
      }
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  },

  // 加载统计信息
  async loadStats() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: { action: 'getStats' }
      });

      if (res.result.success) {
        this.setData({ stats: res.result.data });
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  // 搜索词汇
  async searchVocabulary(append = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: {
          action: 'search',
          keyword: this.data.keyword,
          filters: {
            category: this.data.selectedCategory,
            partOfSpeech: this.data.selectedPOS,
            page: this.data.page,
            pageSize: this.data.pageSize,
            orderBy: this.data.selectedSort,
            order: 'asc'
          }
        }
      });

      if (res.result.success) {
        const list = res.result.data.map(item => ({
          ...item,
          showDetail: false,
          isInWordbook: false // 后续可以检查是否已在生词本中
        }));

        this.setData({
          vocabularyList: append ? [...this.data.vocabularyList, ...list] : list,
          total: res.result.total,
          hasMore: this.data.page < res.result.totalPages
        });

        // 检查是否已在生词本中
        this.checkWordbook(list);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查词汇是否已在生词本中
  async checkWordbook(list) {
    const db = wx.cloud.database();
    const openid = wx.getStorageSync('openid');
    
    if (!openid) return;

    const words = list.map(item => item.word);
    
    try {
      const res = await db.collection('user_vocabulary')
        .where({
          _openid: openid,
          word: db.command.in(words)
        })
        .get();

      const wordbookWords = new Set(res.data.map(item => item.word));
      
      const updatedList = this.data.vocabularyList.map(item => ({
        ...item,
        isInWordbook: wordbookWords.has(item.word)
      }));

      this.setData({ vocabularyList: updatedList });
    } catch (err) {
      console.error('检查生词本失败:', err);
    }
  },

  // 输入关键词
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 搜索
  onSearch() {
    this.setData({ page: 1 });
    this.searchVocabulary();
  },

  // 清空搜索
  onClearSearch() {
    this.setData({ 
      keyword: '',
      page: 1 
    });
    this.searchVocabulary();
  },

  // 切换筛选器
  toggleFilters() {
    this.setData({ showFilters: !this.data.showFilters });
  },

  // 选择分类
  onCategoryChange(e) {
    this.setData({ 
      selectedCategory: e.detail.value,
      page: 1 
    });
    this.searchVocabulary();
  },

  // 选择词性
  onPOSChange(e) {
    this.setData({ 
      selectedPOS: e.detail.value,
      page: 1 
    });
    this.searchVocabulary();
  },

  // 选择排序
  onSortChange(e) {
    const index = e.detail.value;
    const sortOption = this.data.sortOptions[index];
    this.setData({ 
      selectedSort: sortOption.value,
      selectedSortLabel: sortOption.label,
      page: 1 
    });
    this.searchVocabulary();
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.searchVocabulary(true);
    }
  },

  // 切换详情显示
  toggleDetail(e) {
    const { index } = e.currentTarget.dataset;
    const key = `vocabularyList[${index}].showDetail`;
    this.setData({
      [key]: !this.data.vocabularyList[index].showDetail
    });
  },

  // 添加到生词本
  async addToWordbook(e) {
    const { item } = e.currentTarget.dataset;
    const openid = wx.getStorageSync('openid');
    
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '添加中...' });

    try {
      const db = wx.cloud.database();
      
      // 检查是否已存在
      const checkRes = await db.collection('user_vocabulary')
        .where({
          _openid: openid,
          word: item.word
        })
        .get();

      if (checkRes.data.length > 0) {
        wx.showToast({
          title: '已在生词本中',
          icon: 'none'
        });
        return;
      }

      // 添加到生词本
      await db.collection('user_vocabulary').add({
        data: {
          word: item.word,
          reading: item.reading,
          meanings: item.meanings,
          partOfSpeech: item.partOfSpeech,
          level: item.level,
          category: item.category,
          examples: item.examples,
          notes: '',
          tags: item.tags || [],
          masteryLevel: 0,
          reviewCount: 0,
          lastReviewTime: null,
          nextReviewTime: new Date(),
          source: 'n2_vocabulary',
          createTime: new Date(),
          updateTime: new Date()
        }
      });

      // 更新UI
      const index = this.data.vocabularyList.findIndex(v => v.word === item.word);
      if (index !== -1) {
        const key = `vocabularyList[${index}].isInWordbook`;
        this.setData({ [key]: true });
      }

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('添加失败:', err);
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 从生词本移除
  async removeFromWordbook(e) {
    const { item } = e.currentTarget.dataset;
    const openid = wx.getStorageSync('openid');
    
    if (!openid) return;

    wx.showModal({
      title: '确认移除',
      content: `确定要从生词本中移除「${item.word}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '移除中...' });
          
          try {
            const db = wx.cloud.database();
            await db.collection('user_vocabulary')
              .where({
                _openid: openid,
                word: item.word
              })
              .remove();

            // 更新UI
            const index = this.data.vocabularyList.findIndex(v => v.word === item.word);
            if (index !== -1) {
              const key = `vocabularyList[${index}].isInWordbook`;
              this.setData({ [key]: false });
            }

            wx.showToast({
              title: '移除成功',
              icon: 'success'
            });
          } catch (err) {
            console.error('移除失败:', err);
            wx.showToast({
              title: '移除失败',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 播放发音
  playAudio(e) {
    const { text } = e.currentTarget.dataset;
    
    // 调用音频服务播放
    const audioMCP = require('../../../utils/audioMCP');
    audioMCP.playText(text, 'ja');
  },

  // 获取分类标签
  getCategoryLabel(category) {
    const labels = {
      'general': '常用',
      'verb': '动词',
      'noun': '名词',
      'adjective': '形容词',
      'adverb': '副词',
      'grammar': '语法',
      'idiom': '惯用语'
    };
    return labels[category] || category;
  },

  // 批量添加到学习计划
  async addToLearningPlan() {
    const selected = this.data.vocabularyList.filter(item => item.selected);
    
    if (selected.length === 0) {
      wx.showToast({
        title: '请先选择词汇',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/learning-plan/learning-plan?words=${JSON.stringify(selected.map(item => item._id))}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.searchVocabulary();
    wx.stopPullDownRefresh();
  }
});