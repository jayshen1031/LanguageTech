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
        }));

        this.setData({
          vocabularyList: append ? [...this.data.vocabularyList, ...list] : list,
          total: res.result.total,
          hasMore: this.data.page < res.result.totalPages
        });

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