// pages/structure-list/structure-list.js

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
    type: '', // 结构类型：all, mastered, unmastered
    pageTitle: '句子结构列表',
    totalCount: 0,
    
    // 句子结构列表
    structureList: [],
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
    
    // 筛选条件
    selectedCategory: '',
    selectedCategoryName: '全部类别',
    selectedDifficulty: '',
    selectedDifficultyName: '全部难度',
    
    // 筛选选项
    categoryOptions: [
      { value: '', name: '全部类别' },
      { value: 'sentence_structure', name: '句子结构' },
      { value: 'grammar_point', name: '语法要点' },
      { value: 'analysis_point', name: '句法分析' }
    ],
    difficultyOptions: [
      { value: '', name: '全部难度' },
      { value: 'basic', name: '基础' },
      { value: 'intermediate', name: '中级' },
      { value: 'advanced', name: '高级' }
    ],
    
    // 弹窗状态
    showDetailModal: false,
    selectedStructure: null,
    showCategoryModal: false,
    showDifficultyModal: false
  },

  onLoad(options) {
    const { type = 'all', title = '句子结构列表', count = 0 } = options;
    
    this.setData({
      type,
      pageTitle: title,
      totalCount: parseInt(count)
    });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: title
    });
    
    this.loadStructureList();
  },

  // 加载句子结构列表
  async loadStructureList(append = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      let query = db.collection('sentence_structures_integrated');
      
      // 构建查询条件
      const conditions = [];
      
      // 根据类型过滤
      switch (this.data.type) {
        case 'mastered':
          conditions.push({ totalOccurrences: db.command.gte(3) });
          break;
        case 'unmastered':
          conditions.push({ totalOccurrences: db.command.lt(3) });
          break;
        default:
          // 'all' 不需要额外过滤
          break;
      }
      
      // 添加类别筛选
      if (this.data.selectedCategory) {
        conditions.push({ category: this.data.selectedCategory });
      }
      
      // 添加难度筛选
      if (this.data.selectedDifficulty) {
        conditions.push({ difficulty: this.data.selectedDifficulty });
      }
      
      // 应用查询条件
      if (conditions.length > 0) {
        query = query.where(db.command.and(conditions));
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
      
      console.log(`📋 加载${this.data.type}类型句子结构，第${this.data.page}页，获取${dataRes.data.length}条记录`);
      
      const newList = append ? [...this.data.structureList, ...dataRes.data] : dataRes.data;
      
      this.setData({
        structureList: newList,
        hasMore: dataRes.data.length === this.data.pageSize,
        totalCount: countRes.total || dataRes.data.length
      });
      
      // 更新页面标题显示正确的总数
      if (!append) {
        const realCount = countRes.total || dataRes.data.length;
        this.setData({ totalCount: realCount });
        console.log(`📊 ${this.data.type}类型实际句子结构数: ${realCount}`);
      }
      
    } catch (error) {
      console.error('加载句子结构列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 一次性加载全部句子结构
  async loadAllStructures() {
    if (this.data.loading) return;

    wx.showModal({
      title: '加载全部结构',
      content: `将一次性加载全部 ${this.data.totalCount} 个句子结构，可能需要较长时间，确定继续吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.doLoadAllStructures();
        }
      }
    });
  },

  // 执行一次性加载全部句子结构
  async doLoadAllStructures() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载全部结构中...' });

    try {
      let query = db.collection('sentence_structures_integrated');
      
      // 构建查询条件
      const conditions = [];
      
      // 根据类型过滤
      switch (this.data.type) {
        case 'mastered':
          conditions.push({ totalOccurrences: db.command.gte(3) });
          break;
        case 'unmastered':
          conditions.push({ totalOccurrences: db.command.lt(3) });
          break;
        default:
          break;
      }
      
      // 添加类别筛选
      if (this.data.selectedCategory) {
        conditions.push({ category: this.data.selectedCategory });
      }
      
      // 添加难度筛选
      if (this.data.selectedDifficulty) {
        conditions.push({ difficulty: this.data.selectedDifficulty });
      }
      
      // 应用查询条件
      if (conditions.length > 0) {
        query = query.where(db.command.and(conditions));
      }
      
      // 分批获取所有数据
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
          
          wx.showLoading({ 
            title: `已加载 ${allData.length} 个结构...` 
          });
        } else {
          hasMoreData = false;
        }
      }
      
      console.log(`📚 一次性加载完成，共${allData.length}个句子结构`);
      
      this.setData({
        structureList: allData,
        hasMore: false,
        page: Math.ceil(allData.length / this.data.pageSize)
      });
      
      wx.showToast({
        title: `已加载全部 ${allData.length} 个结构`,
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

  // 显示句子结构详情
  showDetail(e) {
    const { index } = e.currentTarget.dataset;
    const selectedStructure = this.data.structureList[index];
    
    this.setData({
      selectedStructure,
      showDetailModal: true
    });
  },

  // 隐藏句子结构详情
  hideDetail() {
    this.setData({
      showDetailModal: false,
      selectedStructure: null
    });
  },

  // 显示类别筛选
  showCategoryFilter() {
    this.setData({ showCategoryModal: true });
  },

  // 隐藏类别筛选
  hideCategoryFilter() {
    this.setData({ showCategoryModal: false });
  },

  // 选择类别
  selectCategory(e) {
    const { value, name } = e.currentTarget.dataset;
    
    this.setData({
      selectedCategory: value,
      selectedCategoryName: name,
      showCategoryModal: false,
      page: 1,
      structureList: [],
      hasMore: true
    });
    
    this.loadStructureList();
  },

  // 显示难度筛选
  showDifficultyFilter() {
    this.setData({ showDifficultyModal: true });
  },

  // 隐藏难度筛选
  hideDifficultyFilter() {
    this.setData({ showDifficultyModal: false });
  },

  // 选择难度
  selectDifficulty(e) {
    const { value, name } = e.currentTarget.dataset;
    
    this.setData({
      selectedDifficulty: value,
      selectedDifficultyName: name,
      showDifficultyModal: false,
      page: 1,
      structureList: [],
      hasMore: true
    });
    
    this.loadStructureList();
  },

  // 加入学习计划
  addToLearningPlan(e) {
    const { index } = e.currentTarget.dataset;
    const structure = this.data.structureList[index];
    
    wx.showModal({
      title: '加入学习计划',
      content: `确定将"${structure.structure}"加入学习计划吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doAddToLearningPlan(structure);
        }
      }
    });
  },

  // 将选中的结构加入学习计划
  addSelectedToLearningPlan() {
    if (this.data.selectedStructure) {
      this.doAddToLearningPlan(this.data.selectedStructure);
      this.hideDetail();
    }
  },

  // 执行加入学习计划
  async doAddToLearningPlan(structure) {
    try {
      // 这里可以添加将句子结构加入学习计划的逻辑
      // 暂时只显示成功提示
      wx.showToast({
        title: '已加入学习计划',
        icon: 'success'
      });
      
      console.log('加入学习计划:', structure.structure);
      
      // TODO: 实际的学习计划集成逻辑
      
    } catch (error) {
      console.error('加入学习计划失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 重置掌握状态
  resetMasteryStatus(e) {
    const { index } = e.currentTarget.dataset;
    const structure = this.data.structureList[index];
    
    if (structure.totalOccurrences < 3) {
      wx.showToast({
        title: '该结构尚未掌握',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '重置掌握状态',
      content: `确定将"${structure.structure}"重新标记为未掌握状态吗？这将降低其熟练度，让您可以重新学习。`,
      success: (res) => {
        if (res.confirm) {
          this.doResetMasteryStatus(structure, index);
        }
      }
    });
  },

  // 从详情页重置掌握状态
  resetSelectedMasteryStatus() {
    if (this.data.selectedStructure && this.data.selectedStructure.totalOccurrences >= 3) {
      wx.showModal({
        title: '重置掌握状态',
        content: `确定将"${this.data.selectedStructure.structure}"重新标记为未掌握状态吗？`,
        success: (res) => {
          if (res.confirm) {
            this.doResetMasteryStatus(this.data.selectedStructure);
            this.hideDetail();
          }
        }
      });
    } else {
      wx.showToast({
        title: '该结构尚未掌握',
        icon: 'none'
      });
    }
  },

  // 执行重置掌握状态
  async doResetMasteryStatus(structure, index = -1) {
    try {
      wx.showLoading({ title: '重置中...' });
      
      // 将totalOccurrences重置为1，标记为未掌握
      await db.collection('sentence_structures_integrated')
        .doc(structure._id)
        .update({
          data: {
            totalOccurrences: 1,
            lastSeen: new Date(),
            masteryReset: true, // 标记为手动重置
            masteryResetTime: new Date() // 记录重置时间
          }
        });
      
      console.log(`✅ 重置掌握状态: ${structure.structure}`);
      
      // 更新本地数据
      if (index >= 0) {
        const updatedList = [...this.data.structureList];
        updatedList[index] = {
          ...updatedList[index],
          totalOccurrences: 1,
          masteryReset: true,
          masteryResetTime: new Date()
        };
        this.setData({ structureList: updatedList });
      }
      
      // 如果当前页面只显示已掌握的结构，需要从列表中移除
      if (this.data.type === 'mastered') {
        setTimeout(() => {
          this.setData({ 
            page: 1,
            structureList: [],
            hasMore: true 
          });
          this.loadStructureList();
        }, 500);
      }
      
      wx.showToast({
        title: '已重置为未掌握',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('重置掌握状态失败:', error);
      wx.showToast({
        title: '重置失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 批量重置掌握状态
  batchResetMastery() {
    if (this.data.type !== 'mastered') {
      wx.showToast({
        title: '仅在已掌握列表中可用',
        icon: 'none'
      });
      return;
    }
    
    const masteredCount = this.data.structureList.filter(item => item.totalOccurrences >= 3).length;
    
    if (masteredCount === 0) {
      wx.showToast({
        title: '没有已掌握的结构',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '批量重置掌握状态',
      content: `确定将当前页面的 ${masteredCount} 个已掌握结构全部重新标记为未掌握吗？此操作不可撤销。`,
      success: (res) => {
        if (res.confirm) {
          this.doBatchResetMastery();
        }
      }
    });
  },

  // 执行批量重置
  async doBatchResetMastery() {
    try {
      wx.showLoading({ title: '批量重置中...' });
      
      const masteredStructures = this.data.structureList.filter(item => item.totalOccurrences >= 3);
      let successCount = 0;
      
      for (const structure of masteredStructures) {
        try {
          await db.collection('sentence_structures_integrated')
            .doc(structure._id)
            .update({
              data: {
                totalOccurrences: 1,
                lastSeen: new Date(),
                masteryReset: true,
                masteryResetTime: new Date()
              }
            });
          successCount++;
        } catch (error) {
          console.error(`重置失败: ${structure.structure}`, error);
        }
      }
      
      console.log(`✅ 批量重置完成: ${successCount}/${masteredStructures.length}`);
      
      // 刷新列表
      this.setData({ 
        page: 1,
        structureList: [],
        hasMore: true 
      });
      await this.loadStructureList();
      
      wx.showToast({
        title: `已重置 ${successCount} 个结构`,
        icon: 'success'
      });
      
    } catch (error) {
      console.error('批量重置失败:', error);
      wx.showToast({
        title: '批量重置失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 获取类别名称
  getCategoryName(category) {
    const names = {
      'sentence_structure': '句子结构',
      'grammar_point': '语法要点',
      'analysis_point': '句法分析'
    };
    return names[category] || category;
  },

  // 获取难度名称
  getDifficultyName(difficulty) {
    const names = {
      'basic': '基础',
      'intermediate': '中级',
      'advanced': '高级'
    };
    return names[difficulty] || difficulty;
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
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
      structureList: [],
      hasMore: true 
    });
    this.loadStructureList();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadStructureList(true);
    }
  }
});