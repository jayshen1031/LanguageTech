Page({
  data: {
    vocabulary: [],
    filteredVocabulary: [],
    categories: [],
    selectedCategory: '全部',
    searchKeyword: '',
    currentPage: 1,
    pageSize: 20,
    totalPages: 0,
    totalCount: 0,
    loading: false,
    showDetail: false,
    currentWord: null,
    userWords: [],
    viewMode: 'all',
    sortBy: 'default',
    importProgress: 0,
    isImporting: false
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    if (this.data.viewMode === 'user') {
      this.loadUserWords();
    }
  },

  async initData() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      await this.checkAndImportData();
      await this.loadCategories();
      await this.loadVocabulary();
      this.loadUserWords();
    } catch (error) {
      console.error('初始化失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  async checkAndImportData() {
    try {
      const db = wx.cloud.database();
      const countResult = await db.collection('n2_vocabulary')
        .where({ level: 'N2' })
        .count();
      
      if (countResult.total === 0) {
        const modal = await wx.showModal({
          title: '词汇库为空',
          content: '检测到词汇库为空，是否立即导入N2词汇数据？',
          confirmText: '立即导入',
          cancelText: '稍后'
        });
        
        if (modal.confirm) {
          await this.importN2Vocabulary();
        }
      }
    } catch (error) {
      console.error('检查数据失败:', error);
    }
  },

  async importN2Vocabulary() {
    this.setData({ isImporting: true });
    
    wx.showLoading({
      title: '正在导入词汇...',
      mask: true
    });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: {
          action: 'import',
          options: {
            clearExisting: true,
            batchSize: 50  // 减小批次大小以避免超时
          }
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: `成功导入${result.result.total}个词汇`,
          icon: 'success',
          duration: 2000
        });
        
        await this.loadCategories();
        await this.loadVocabulary();
      } else {
        throw new Error(result.result.message);
      }
    } catch (error) {
      console.error('导入失败:', error);
      
      // 如果是超时错误，提供更具体的提示
      if (error.message && error.message.includes('TIME_LIMIT_EXCEEDED')) {
        wx.showModal({
          title: '导入超时',
          content: '词汇量较大，建议分批导入。是否重试？',
          success: (res) => {
            if (res.confirm) {
              this.importN2Vocabulary();
            }
          }
        });
      } else {
        wx.showToast({
          title: '导入失败，请重试',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ isImporting: false });
      wx.hideLoading();
    }
  },

  async loadCategories() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: { action: 'getCategories' }
      });
      
      if (result.result.success) {
        const categories = ['全部', ...result.result.data.map(c => c.name)];
        this.setData({ categories });
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  },

  async loadVocabulary() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const filters = {
        page: this.data.currentPage,
        pageSize: this.data.pageSize
      };
      
      if (this.data.selectedCategory !== '全部') {
        filters.category = this.data.selectedCategory;
      }
      
      if (this.data.sortBy === 'frequency') {
        filters.orderBy = 'frequency';
        filters.order = 'desc';
      } else if (this.data.sortBy === 'random') {
        filters.orderBy = 'random';
      }
      
      const result = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: {
          action: 'search',
          keyword: this.data.searchKeyword,
          filters
        }
      });
      
      if (result.result.success) {
        const vocabulary = result.result.data.map(item => ({
          ...item,
          displayMeaning: Array.isArray(item.meanings) 
            ? item.meanings.join('、') 
            : item.meanings,
          isLearned: this.checkIfLearned(item._id),
          isFavorite: this.checkIfFavorite(item._id)
        }));
        
        this.setData({
          vocabulary,
          filteredVocabulary: vocabulary,
          totalCount: result.result.total,
          totalPages: result.result.totalPages
        });
      }
    } catch (error) {
      console.error('加载词汇失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadUserWords() {
    try {
      const userWords = wx.getStorageSync('userWords') || [];
      this.setData({ userWords });
    } catch (error) {
      console.error('加载用户词汇失败:', error);
    }
  },

  checkIfLearned(wordId) {
    const learnedWords = wx.getStorageSync('learnedWords') || [];
    return learnedWords.includes(wordId);
  },

  checkIfFavorite(wordId) {
    const favoriteWords = wx.getStorageSync('favoriteWords') || [];
    return favoriteWords.includes(wordId);
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearch() {
    this.setData({ currentPage: 1 });
    this.loadVocabulary();
  },

  onCategoryChange(e) {
    const selectedCategory = this.data.categories[e.detail.value];
    this.setData({ 
      selectedCategory,
      currentPage: 1
    });
    this.loadVocabulary();
  },

  onSortChange(e) {
    const sortOptions = ['default', 'frequency', 'random'];
    this.setData({ 
      sortBy: sortOptions[e.detail.value],
      currentPage: 1
    });
    this.loadVocabulary();
  },

  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
    
    if (mode === 'user') {
      this.loadUserWords();
    } else {
      this.loadVocabulary();
    }
  },

  showWordDetail(e) {
    const word = e.currentTarget.dataset.word;
    this.setData({
      currentWord: word,
      showDetail: true
    });
  },

  hideWordDetail() {
    this.setData({ showDetail: false });
  },

  async toggleFavorite(e) {
    const word = e.currentTarget.dataset.word;
    const favoriteWords = wx.getStorageSync('favoriteWords') || [];
    const index = favoriteWords.indexOf(word._id);
    
    if (index > -1) {
      favoriteWords.splice(index, 1);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      favoriteWords.push(word._id);
      wx.showToast({ title: '已收藏', icon: 'success' });
    }
    
    wx.setStorageSync('favoriteWords', favoriteWords);
    
    const vocabulary = this.data.vocabulary.map(item => ({
      ...item,
      isFavorite: favoriteWords.includes(item._id)
    }));
    
    this.setData({ vocabulary, filteredVocabulary: vocabulary });
  },

  async markAsLearned(e) {
    const word = e.currentTarget.dataset.word;
    const learnedWords = wx.getStorageSync('learnedWords') || [];
    
    if (!learnedWords.includes(word._id)) {
      learnedWords.push(word._id);
      wx.setStorageSync('learnedWords', learnedWords);
      
      const vocabulary = this.data.vocabulary.map(item => ({
        ...item,
        isLearned: learnedWords.includes(item._id)
      }));
      
      this.setData({ vocabulary, filteredVocabulary: vocabulary });
      
      wx.showToast({ title: '已标记为已学习', icon: 'success' });
    }
  },

  playAudio(e) {
    const word = e.currentTarget.dataset.word;
    const audioContext = wx.createInnerAudioContext();
    
    wx.showLoading({ title: '生成音频中...' });
    
    wx.cloud.callFunction({
      name: 'tts-service',
      data: {
        text: word.word,
        language: 'ja-JP',
        voice: 'ja-JP-NanamiNeural'
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success && res.result.audioUrl) {
        audioContext.src = res.result.audioUrl;
        audioContext.play();
      } else {
        wx.showToast({ title: '播放失败', icon: 'none' });
      }
    }).catch(error => {
      wx.hideLoading();
      console.error('音频生成失败:', error);
      wx.showToast({ title: '音频生成失败', icon: 'none' });
    });
  },

  addToStudyPlan(e) {
    const word = e.currentTarget.dataset.word;
    const studyPlan = wx.getStorageSync('studyPlan') || [];
    
    if (!studyPlan.find(w => w._id === word._id)) {
      studyPlan.push({
        ...word,
        addedTime: new Date().getTime(),
        reviewCount: 0,
        nextReviewTime: new Date().getTime() + 24 * 60 * 60 * 1000
      });
      
      wx.setStorageSync('studyPlan', studyPlan);
      wx.showToast({ title: '已加入学习计划', icon: 'success' });
    } else {
      wx.showToast({ title: '已在学习计划中', icon: 'none' });
    }
  },

  onPrevPage() {
    if (this.data.currentPage > 1) {
      this.setData({ currentPage: this.data.currentPage - 1 });
      this.loadVocabulary();
    }
  },

  onNextPage() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({ currentPage: this.data.currentPage + 1 });
      this.loadVocabulary();
    }
  },

  onPageJump(e) {
    const page = parseInt(e.detail.value);
    if (page >= 1 && page <= this.data.totalPages) {
      this.setData({ currentPage: page });
      this.loadVocabulary();
    }
  },

  onShareAppMessage() {
    return {
      title: 'JLPT N2 生词本 - 2000核心词汇',
      path: '/pages/wordbook/wordbook'
    };
  }
})