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
      
      const newList = append ? [...this.data.vocabularyList, ...dataRes.data] : dataRes.data;
      
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
  }
});