const { kanaData, rowTitles, columnTitles } = require('../../utils/kanaData');
const audioMCP = require('../../utils/audioMCP');

Page({
  data: {
    // 当前选择的假名类型
    kanaType: 'hiragana', // hiragana or katakana
    // 当前选择的音类型
    soundType: 'seion', // seion, dakuon, handakuon, youon
    // 显示的假名数据
    displayKana: [],
    // 音类型标签
    soundTabs: [
      { key: 'seion', label: '清音' },
      { key: 'dakuon', label: '浊音' },
      { key: 'handakuon', label: '半浊音' },
      { key: 'youon', label: '拗音' }
    ],
    // 当前选中的假名
    selectedKana: null,
    // 显示模式
    viewMode: 'grid', // grid or list
    // 练习模式
    practiceMode: false,
    // 练习题目
    practiceQuestion: null,
    // 练习选项
    practiceOptions: [],
    // 练习得分
    practiceScore: 0,
    // 练习题数
    practiceCount: 0,
    // 音频播放状态
    isPlaying: false
  },

  onLoad(options) {
    // 从参数获取假名类型
    const kanaType = options.type || 'hiragana';
    this.setData({ kanaType });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: kanaType === 'hiragana' ? '平假名学习' : '片假名学习'
    });
    
    // 加载假名数据
    this.loadKanaData();
    
    // 延迟预加载音频，避免阻塞页面加载
    setTimeout(() => {
      this.preloadAllAudio();
    }, 500);
  },

  // 加载假名数据
  loadKanaData() {
    const { kanaType, soundType } = this.data;
    const kanaList = kanaData[kanaType][soundType] || [];
    
    // 如果是清音，需要按5x10的格式排列
    if (soundType === 'seion') {
      const displayKana = this.formatSeionGrid(kanaList);
      this.setData({ displayKana });
    } else {
      // 其他音直接显示
      this.setData({ displayKana: kanaList });
    }
    
    // 切换音类型后重新预加载
    setTimeout(() => {
      this.preloadAllAudio();
    }, 300);
  },

  // 格式化清音为5x10网格
  formatSeionGrid(kanaList) {
    const grid = [];
    const rows = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'];
    
    rows.forEach(row => {
      const rowKana = kanaList.filter(k => k.row === row);
      if (rowKana.length > 0) {
        // 补齐5个位置
        while (rowKana.length < 5) {
          rowKana.push({ kana: '', romaji: '', type: 'empty' });
        }
        grid.push({
          row: row,
          title: rowTitles[row],
          kanaList: rowKana
        });
      }
    });
    
    // 添加ん
    const n = kanaList.find(k => k.row === 'n');
    if (n) {
      grid.push({
        row: 'n',
        title: 'ん',
        kanaList: [n]
      });
    }
    
    return grid;
  },

  // 预加载所有音频
  async preloadAllAudio() {
    const { displayKana, soundType } = this.data;
    let allKana = [];
    
    // 收集所有假名
    if (soundType === 'seion') {
      displayKana.forEach(row => {
        allKana = allKana.concat(row.kanaList.filter(k => k.kana));
      });
    } else {
      allKana = displayKana.filter(k => k.kana);
    }
    
    // 只预加载前15个常用假名，避免一次加载太多
    const preloadKana = allKana.slice(0, 15).map(k => k.kana);
    
    if (preloadKana.length > 0) {
      console.log('🚀 开始预加载音频:', preloadKana.length, '个');
      audioMCP.batchPreload(preloadKana, 'ja').then(() => {
        console.log('✅ 音频预加载完成');
      }).catch(err => {
        console.warn('⚠️ 预加载失败:', err);
      });
    }
  },
  
  // 切换假名类型
  switchKanaType(e) {
    const kanaType = e.currentTarget.dataset.type;
    this.setData({ kanaType });
    wx.setNavigationBarTitle({
      title: kanaType === 'hiragana' ? '平假名学习' : '片假名学习'
    });
    this.loadKanaData();
  },

  // 切换音类型
  switchSoundType(e) {
    const soundType = e.currentTarget.dataset.type;
    this.setData({ soundType });
    this.loadKanaData();
  },

  // 点击假名
  onKanaClick(e) {
    const kana = e.currentTarget.dataset.kana;
    if (!kana || !kana.kana) return;
    
    // 如果是空单元格，不处理
    if (kana.type === 'empty') return;
    
    console.log('🔸 点击假名:', kana.kana, kana.romaji);
    this.setData({ selectedKana: kana });
    
    // 播放发音
    this.playKanaSound(kana);
  },

  // 播放假名发音
  async playKanaSound(kana) {
    if (!kana || !kana.kana) {
      console.warn('⚠️ 无效的假名数据');
      return;
    }
    
    // 防止重复点击
    if (this.data.isPlaying) {
      console.log('🔇 正在播放中，请稍后');
      return;
    }
    
    console.log('🎤 开始播放假名:', kana.kana, '(' + kana.romaji + ')');
    this.setData({ isPlaying: true });
    
    // 设置超时重置
    if (this.playingTimer) {
      clearTimeout(this.playingTimer);
    }
    this.playingTimer = setTimeout(() => {
      console.log('⛰️ 播放超时，重置状态');
      this.setData({ isPlaying: false });
    }, 3000); // 3秒超时
    
    try {
      // 使用音频服务播放
      const audioContext = await audioMCP.playText(kana.kana, 'ja');
      
      // 无论成功与否，1秒后重置状态
      setTimeout(() => {
        this.setData({ isPlaying: false });
        if (this.playingTimer) {
          clearTimeout(this.playingTimer);
        }
      }, 1000);
      
      if (!audioContext) {
        // 播放失败，显示读音
        console.log('⚠️ 音频播放失败');
        wx.showToast({
          title: `${kana.kana} (${kana.romaji})`,
          icon: 'none',
          duration: 2000
        });
      }
      
    } catch (error) {
      console.error('❌ 播放音频异常:', error);
      wx.showToast({
        title: `${kana.kana} (${kana.romaji})`,
        icon: 'none',
        duration: 2000
      });
      this.setData({ isPlaying: false });
      if (this.playingTimer) {
        clearTimeout(this.playingTimer);
      }
    }
  },

  // 切换视图模式
  toggleViewMode() {
    const viewMode = this.data.viewMode === 'grid' ? 'list' : 'grid';
    this.setData({ viewMode });
  },

  // 开始练习
  startPractice() {
    this.setData({
      practiceMode: true,
      practiceScore: 0,
      practiceCount: 0
    });
    this.generatePracticeQuestion();
  },

  // 生成练习题
  generatePracticeQuestion() {
    const { displayKana, soundType } = this.data;
    let allKana = [];
    
    // 收集所有假名
    if (soundType === 'seion') {
      displayKana.forEach(row => {
        allKana = allKana.concat(row.kanaList.filter(k => k.kana));
      });
    } else {
      allKana = displayKana.filter(k => k.kana);
    }
    
    if (allKana.length < 4) {
      wx.showToast({
        title: '假名数量不足',
        icon: 'none'
      });
      return;
    }
    
    // 随机选择一个假名作为题目
    const questionIndex = Math.floor(Math.random() * allKana.length);
    const question = allKana[questionIndex];
    
    // 生成选项（包含正确答案）
    const options = [question];
    const usedIndices = [questionIndex];
    
    // 随机选择3个错误选项
    while (options.length < 4) {
      const index = Math.floor(Math.random() * allKana.length);
      if (!usedIndices.includes(index)) {
        options.push(allKana[index]);
        usedIndices.push(index);
      }
    }
    
    // 打乱选项顺序
    options.sort(() => Math.random() - 0.5);
    
    this.setData({
      practiceQuestion: question,
      practiceOptions: options
    });
    
    // 预加载下一题可能的音频（提高响应速度）
    setTimeout(() => {
      const nextBatch = allKana
        .filter((k, i) => !usedIndices.includes(i))
        .slice(0, 5)
        .map(k => k.kana);
      if (nextBatch.length > 0) {
        audioMCP.batchPreload(nextBatch, 'ja');
      }
    }, 1000);
    
    // 播放题目假名
    this.playKanaSound(question);
  },

  // 选择答案
  selectAnswer(e) {
    const selected = e.currentTarget.dataset.kana;
    const { practiceQuestion, practiceScore, practiceCount } = this.data;
    
    if (selected.kana === practiceQuestion.kana) {
      // 正确
      wx.showToast({
        title: '正确！',
        icon: 'success',
        duration: 1000
      });
      this.setData({
        practiceScore: practiceScore + 1,
        practiceCount: practiceCount + 1
      });
      
      // 1秒后生成下一题
      setTimeout(() => {
        this.generatePracticeQuestion();
      }, 1000);
    } else {
      // 错误
      wx.showToast({
        title: `错误！正确答案是 ${practiceQuestion.romaji}`,
        icon: 'none',
        duration: 2000
      });
      this.setData({
        practiceCount: practiceCount + 1
      });
      
      // 2秒后生成下一题
      setTimeout(() => {
        this.generatePracticeQuestion();
      }, 2000);
    }
  },

  // 退出练习
  exitPractice() {
    const { practiceScore, practiceCount } = this.data;
    if (practiceCount > 0) {
      const accuracy = Math.round((practiceScore / practiceCount) * 100);
      wx.showModal({
        title: '练习结果',
        content: `共答题 ${practiceCount} 道\n正确 ${practiceScore} 道\n正确率 ${accuracy}%`,
        showCancel: false,
        success: () => {
          this.setData({
            practiceMode: false,
            practiceQuestion: null,
            practiceOptions: []
          });
        }
      });
    } else {
      this.setData({
        practiceMode: false,
        practiceQuestion: null,
        practiceOptions: []
      });
    }
  },

  // 再次播放
  replaySound() {
    const { selectedKana, practiceQuestion, practiceMode } = this.data;
    
    if (this.data.isPlaying) {
      console.log('🔇 正在播放中');
      return;
    }
    
    if (practiceMode && practiceQuestion) {
      console.log('🔁 重播练习题目');
      this.playKanaSound(practiceQuestion);
    } else if (selectedKana) {
      console.log('🔁 重播选中的假名');
      this.playKanaSound(selectedKana);
    } else {
      wx.showToast({
        title: '请先选择一个假名',
        icon: 'none'
      });
    }
  },

  // 分享
  onShareAppMessage() {
    const { kanaType } = this.data;
    return {
      title: kanaType === 'hiragana' ? '来学习日语平假名吧！' : '来学习日语片假名吧！',
      path: `/pages/kana-study/kana-study?type=${kanaType}`
    };
  },
  
  // 页面卸载时清理
  onUnload() {
    if (this.playingTimer) {
      clearTimeout(this.playingTimer);
      this.playingTimer = null;
    }
    console.log('📤 页面卸载，清理资源');
  }
});