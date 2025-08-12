// pages/learning-plan/learning-plan.js
Page({
  data: {
    // 学习计划配置
    planConfig: {
      dailyNewWords: 10, // 每日新词数量
      dailyReviewWords: 20, // 每日复习数量
      studyTime: '08:00', // 学习提醒时间
      enableReminder: true, // 是否开启提醒
      difficulty: 'medium', // 难度：easy, medium, hard
      focusCategories: [], // 重点学习分类
      studyMode: 'mixed' // 学习模式：new_only, review_only, mixed
    },
    
    // 学习进度
    progress: {
      totalWords: 2000,
      learnedWords: 0,
      masteredWords: 0,
      todayNewWords: 0,
      todayReviewWords: 0,
      consecutiveDays: 0,
      totalDays: 0,
      progressPercent: '0.0' // 进度百分比
    },
    
    // 今日任务
    todayTasks: {
      newWords: [],
      reviewWords: [],
      completed: false
    },
    
    // 配置选项
    difficultyOptions: [
      { value: 'easy', label: '简单', newWords: 5, reviewWords: 10 },
      { value: 'medium', label: '标准', newWords: 10, reviewWords: 20 },
      { value: 'hard', label: '困难', newWords: 20, reviewWords: 40 }
    ],
    
    studyModeOptions: [
      { value: 'new_only', label: '仅学新词' },
      { value: 'review_only', label: '仅复习' },
      { value: 'mixed', label: '混合模式' }
    ],
    
    categories: [],
    selectedCategories: [],
    
    // UI状态
    showConfig: false,
    loading: false,
    todayDate: '' // 今日日期
  },

  onLoad(options) {
    // 设置今日日期
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    this.setData({
      todayDate: `${month}月${day}日`
    });
    
    this.loadUserConfig();
    this.loadProgress();
    this.loadCategories();
    this.generateTodayTasks();
    
    // 如果从词汇搜索页面带参数过来
    if (options.words) {
      const wordIds = JSON.parse(options.words);
      this.addWordsToP(wordIds);
    }
  },

  // 加载用户配置
  async loadUserConfig() {
    const openid = wx.getStorageSync('openid');
    if (!openid) return;
    
    try {
      const db = wx.cloud.database();
      const res = await db.collection('user_learning_config')
        .where({ _openid: openid })
        .get();
      
      if (res.data.length > 0) {
        this.setData({
          planConfig: res.data[0].config,
          selectedCategories: res.data[0].config.focusCategories || []
        });
      }
    } catch (err) {
      console.error('加载配置失败:', err);
    }
  },

  // 加载学习进度
  async loadProgress() {
    const openid = wx.getStorageSync('openid');
    if (!openid) return;
    
    try {
      const db = wx.cloud.database();
      
      // 获取已学习的词汇数
      const learnedRes = await db.collection('user_vocabulary')
        .where({ _openid: openid })
        .count();
      
      // 获取已掌握的词汇数
      const masteredRes = await db.collection('user_vocabulary')
        .where({ 
          _openid: openid,
          masteryLevel: db.command.gte(4)
        })
        .count();
      
      // 获取今日学习记录
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayRes = await db.collection('learning_records')
        .where({
          _openid: openid,
          date: db.command.gte(today)
        })
        .get();
      
      let todayNewWords = 0;
      let todayReviewWords = 0;
      
      if (todayRes.data.length > 0) {
        const record = todayRes.data[0];
        todayNewWords = record.newWords || 0;
        todayReviewWords = record.reviewWords || 0;
      }
      
      // 获取连续学习天数
      const recordsRes = await db.collection('learning_records')
        .where({ _openid: openid })
        .orderBy('date', 'desc')
        .limit(30)
        .get();
      
      const consecutiveDays = this.calculateConsecutiveDays(recordsRes.data);
      
      // 计算进度百分比
      const progressPercent = this.data.progress.totalWords > 0 
        ? ((learnedRes.total / this.data.progress.totalWords) * 100).toFixed(1)
        : '0.0';
      
      this.setData({
        'progress.learnedWords': learnedRes.total,
        'progress.masteredWords': masteredRes.total,
        'progress.todayNewWords': todayNewWords,
        'progress.todayReviewWords': todayReviewWords,
        'progress.consecutiveDays': consecutiveDays,
        'progress.totalDays': recordsRes.data.length,
        'progress.progressPercent': progressPercent
      });
    } catch (err) {
      console.error('加载进度失败:', err);
    }
  },

  // 计算连续学习天数
  calculateConsecutiveDays(records) {
    if (!records || records.length === 0) return 0;
    
    let consecutive = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 检查今天是否学习
    const todayTime = today.getTime();
    if (records[0].date.getTime() < todayTime - 86400000) {
      return 0; // 今天没学习，连续天数归零
    }
    
    // 计算连续天数
    for (let i = 1; i < records.length; i++) {
      const prevDate = new Date(records[i - 1].date);
      const currDate = new Date(records[i].date);
      const dayDiff = Math.floor((prevDate - currDate) / 86400000);
      
      if (dayDiff === 1) {
        consecutive++;
      } else {
        break;
      }
    }
    
    return consecutive;
  },

  // 加载分类
  async loadCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: { action: 'getCategories' }
      });
      
      if (res.result.success) {
        this.setData({
          categories: res.result.data.map(cat => ({
            value: cat.name,
            label: this.getCategoryLabel(cat.name),
            count: cat.count,
            selected: this.data.selectedCategories.includes(cat.name)
          }))
        });
      }
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  },

  // 生成今日任务
  async generateTodayTasks() {
    const openid = wx.getStorageSync('openid');
    if (!openid) return;
    
    wx.showLoading({ title: '生成学习任务...' });
    
    try {
      const db = wx.cloud.database();
      const { planConfig, progress } = this.data;
      
      // 检查今日是否已有任务
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingTask = await db.collection('daily_tasks')
        .where({
          _openid: openid,
          date: today
        })
        .get();
      
      if (existingTask.data.length > 0) {
        // 加载现有任务
        const task = existingTask.data[0];
        await this.loadTaskWords(task);
        return;
      }
      
      // 生成新任务
      const newWords = await this.selectNewWords(planConfig.dailyNewWords);
      const reviewWords = await this.selectReviewWords(planConfig.dailyReviewWords);
      
      // 保存任务
      const taskData = {
        _openid: openid,
        date: today,
        newWordIds: newWords.map(w => w._id),
        reviewWordIds: reviewWords.map(w => w._id),
        completedNewWords: [],
        completedReviewWords: [],
        completed: false,
        createTime: new Date()
      };
      
      await db.collection('daily_tasks').add({ data: taskData });
      
      this.setData({
        'todayTasks.newWords': newWords,
        'todayTasks.reviewWords': reviewWords,
        'todayTasks.completed': false
      });
    } catch (err) {
      console.error('生成任务失败:', err);
      wx.showToast({
        title: '生成任务失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 选择新词
  async selectNewWords(count) {
    const openid = wx.getStorageSync('openid');
    const db = wx.cloud.database();
    
    // 获取已学习的词汇ID
    const learnedRes = await db.collection('user_vocabulary')
      .where({ _openid: openid })
      .field({ wordId: true })
      .get();
    
    const learnedIds = new Set(learnedRes.data.map(item => item.wordId));
    
    // 查询条件
    let filters = {
      _id: db.command.nin(Array.from(learnedIds))
    };
    
    // 如果有重点分类
    if (this.data.selectedCategories.length > 0) {
      filters.category = db.command.in(this.data.selectedCategories);
    }
    
    // 根据难度调整
    if (this.data.planConfig.difficulty === 'easy') {
      filters.frequency = db.command.gte(3); // 高频词
    } else if (this.data.planConfig.difficulty === 'hard') {
      filters.frequency = db.command.lte(2); // 低频词
    }
    
    // 随机选择新词
    const res = await wx.cloud.callFunction({
      name: 'import-n2-vocabulary',
      data: {
        action: 'search',
        filters: {
          ...filters,
          pageSize: count,
          orderBy: 'random'
        }
      }
    });
    
    return res.result.data || [];
  },

  // 选择复习词汇
  async selectReviewWords(count) {
    const openid = wx.getStorageSync('openid');
    const db = wx.cloud.database();
    
    const now = new Date();
    
    // 获取需要复习的词汇
    const res = await db.collection('user_vocabulary')
      .where({
        _openid: openid,
        nextReviewTime: db.command.lte(now),
        masteryLevel: db.command.lt(5)
      })
      .orderBy('nextReviewTime', 'asc')
      .limit(count)
      .get();
    
    return res.data;
  },

  // 加载任务词汇
  async loadTaskWords(task) {
    const res = await wx.cloud.callFunction({
      name: 'import-n2-vocabulary',
      data: {
        action: 'getByIds',
        ids: [...task.newWordIds, ...task.reviewWordIds]
      }
    });
    
    const wordsMap = {};
    res.result.data.forEach(word => {
      wordsMap[word._id] = word;
    });
    
    this.setData({
      'todayTasks.newWords': task.newWordIds.map(id => wordsMap[id]).filter(Boolean),
      'todayTasks.reviewWords': task.reviewWordIds.map(id => wordsMap[id]).filter(Boolean),
      'todayTasks.completed': task.completed
    });
  },

  // 切换配置显示
  toggleConfig() {
    this.setData({ showConfig: !this.data.showConfig });
  },

  // 更新每日新词数
  onDailyNewWordsChange(e) {
    this.setData({
      'planConfig.dailyNewWords': e.detail.value
    });
  },

  // 更新每日复习数
  onDailyReviewWordsChange(e) {
    this.setData({
      'planConfig.dailyReviewWords': e.detail.value
    });
  },

  // 更新学习时间
  onStudyTimeChange(e) {
    this.setData({
      'planConfig.studyTime': e.detail.value
    });
  },

  // 切换提醒
  onReminderChange(e) {
    this.setData({
      'planConfig.enableReminder': e.detail.value
    });
  },

  // 更新难度
  onDifficultyChange(e) {
    const difficulty = e.detail.value;
    const option = this.data.difficultyOptions.find(opt => opt.value === difficulty);
    
    this.setData({
      'planConfig.difficulty': difficulty,
      'planConfig.dailyNewWords': option.newWords,
      'planConfig.dailyReviewWords': option.reviewWords
    });
  },

  // 更新学习模式
  onStudyModeChange(e) {
    this.setData({
      'planConfig.studyMode': e.detail.value
    });
  },

  // 选择分类
  onCategorySelect(e) {
    const { value } = e.currentTarget.dataset;
    const selectedCategories = [...this.data.selectedCategories];
    const index = selectedCategories.indexOf(value);
    
    if (index > -1) {
      selectedCategories.splice(index, 1);
    } else {
      selectedCategories.push(value);
    }
    
    // 更新UI
    const categories = this.data.categories.map(cat => ({
      ...cat,
      selected: selectedCategories.includes(cat.value)
    }));
    
    this.setData({
      selectedCategories,
      categories,
      'planConfig.focusCategories': selectedCategories
    });
  },

  // 保存配置
  async saveConfig() {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    try {
      const db = wx.cloud.database();
      
      // 查找现有配置
      const existing = await db.collection('user_learning_config')
        .where({ _openid: openid })
        .get();
      
      const configData = {
        _openid: openid,
        config: this.data.planConfig,
        updateTime: new Date()
      };
      
      if (existing.data.length > 0) {
        // 更新
        await db.collection('user_learning_config')
          .doc(existing.data[0]._id)
          .update({
            data: {
              config: this.data.planConfig,
              updateTime: new Date()
            }
          });
      } else {
        // 新建
        await db.collection('user_learning_config').add({
          data: configData
        });
      }
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      this.setData({ showConfig: false });
      
      // 重新生成任务
      this.generateTodayTasks();
    } catch (err) {
      console.error('保存配置失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 开始学习
  startLearning() {
    if (this.data.todayTasks.completed) {
      wx.showModal({
        title: '今日任务已完成',
        content: '是否要额外学习？',
        confirmText: '继续学习',
        cancelText: '明天再来',
        success: (res) => {
          if (res.confirm) {
            this.generateExtraTasks();
          }
        }
      });
      return;
    }
    
    // 跳转到学习页面
    wx.navigateTo({
      url: '/pages/learn/learn?mode=plan'
    });
  },

  // 生成额外任务
  async generateExtraTasks() {
    wx.showLoading({ title: '生成额外任务...' });
    
    try {
      // 生成额外的学习任务
      const newWords = await this.selectNewWords(5);
      const reviewWords = await this.selectReviewWords(10);
      
      // 临时保存到storage
      wx.setStorageSync('extraTasks', {
        newWords,
        reviewWords
      });
      
      wx.navigateTo({
        url: '/pages/learn/learn?mode=extra'
      });
    } catch (err) {
      console.error('生成额外任务失败:', err);
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 查看词汇库
  viewVocabulary() {
    wx.navigateTo({
      url: '/pages/vocabulary-search/vocabulary-search'
    });
  },

  // 查看学习记录
  viewHistory() {
    wx.navigateTo({
      url: '/pages/history-vocabulary/history-vocabulary'
    });
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

  // 分享
  onShareAppMessage() {
    return {
      title: 'N2词汇学习计划',
      path: '/pages/learning-plan/learning-plan'
    };
  }
});