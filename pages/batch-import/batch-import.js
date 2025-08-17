// 批量导入词汇页面
Page({
  data: {
    fileName: '',
    fileContent: '',
    previewData: [],
    totalCount: 0,
    clearExisting: false,
    autoGenerateTags: true,
    importing: false,
    importComplete: false,
    progress: 0,
    importedCount: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
    parsedData: [],
    stopFlag: false
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '批量导入词汇'
    });
  },

  // 选择文件
  chooseFile() {
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success(res) {
        const file = res.tempFiles[0];
        const fileName = file.name;
        const filePath = file.path;
        
        // 判断文件类型
        const ext = fileName.split('.').pop().toLowerCase();
        if (!['json', 'csv', 'txt'].includes(ext)) {
          wx.showToast({
            title: '不支持的文件格式',
            icon: 'none'
          });
          return;
        }

        that.setData({ fileName });
        
        // 读取文件内容
        wx.getFileSystemManager().readFile({
          filePath: filePath,
          encoding: 'utf-8',
          success(res) {
            that.parseFile(res.data, ext);
          },
          fail(err) {
            console.error('读取文件失败', err);
            wx.showToast({
              title: '读取文件失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  // 解析文件
  parseFile(content, type) {
    let parsedData = [];
    
    try {
      switch(type) {
        case 'json':
          parsedData = this.parseJSON(content);
          break;
        case 'csv':
          parsedData = this.parseCSV(content);
          break;
        case 'txt':
          parsedData = this.parseTXT(content);
          break;
      }
      
      // 验证和处理数据
      parsedData = this.validateAndProcessData(parsedData);
      
      // 设置预览数据
      this.setData({
        parsedData,
        previewData: parsedData.slice(0, 5),
        totalCount: parsedData.length,
        fileContent: content
      });
      
    } catch(err) {
      console.error('解析文件失败', err);
      wx.showToast({
        title: '文件格式错误',
        icon: 'none'
      });
    }
  },

  // 解析JSON格式
  parseJSON(content) {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error('JSON必须是数组格式');
    }
    return data;
  },

  // 解析CSV格式
  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV文件至少需要包含表头和一行数据');
    }
    
    // 解析表头
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    // 解析数据行
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const item = {};
      
      headers.forEach((header, index) => {
        // 映射常见的列名
        const mapping = {
          'word': 'word',
          '单词': 'word',
          '日语': 'word',
          'kana': 'kana',
          'reading': 'kana',
          '假名': 'kana',
          '读音': 'kana',
          'romaji': 'romaji',
          '罗马音': 'romaji',
          'meaning': 'meaning',
          'meanings': 'meaning',
          '意思': 'meaning',
          '中文': 'meaning',
          'type': 'type',
          'partOfSpeech': 'type',
          '词性': 'type',
          'level': 'level',
          '级别': 'level'
        };
        
        const key = mapping[header] || header;
        item[key] = values[index] || '';
      });
      
      if (item.word) {
        data.push(item);
      }
    }
    
    return data;
  },

  // 解析TXT格式（简单格式）
  parseTXT(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const data = [];
    
    for (const line of lines) {
      // 支持多种分隔符
      const parts = line.split(/[\t\s]+/);
      
      if (parts.length >= 2) {
        const item = {
          word: parts[0],
          kana: parts[1] || '',
          meaning: parts[2] || '',
          type: parts[3] || '词汇'
        };
        data.push(item);
      }
    }
    
    return data;
  },

  // 验证和处理数据
  validateAndProcessData(data) {
    return data.map((item, index) => {
      // 确保必要字段存在
      if (!item.word) {
        throw new Error(`第${index + 1}项缺少word字段`);
      }
      
      // 标准化字段
      const processed = {
        word: item.word,
        kana: item.kana || item.reading || '',
        romaji: item.romaji || '',
        meaning: item.meaning || item.meanings || '',
        type: item.type || item.partOfSpeech || '词汇',
        level: item.level || 'N2',
        category: item.category || 'general',
        frequency: item.frequency || 3,
        examples: item.examples || [],
        tags: item.tags || []
      };
      
      // 处理meanings数组
      if (Array.isArray(item.meanings)) {
        processed.meaning = item.meanings.join('；');
        processed.meanings = item.meanings;
      } else if (processed.meaning) {
        processed.meanings = [processed.meaning];
      }
      
      // 处理partOfSpeech数组
      if (Array.isArray(item.partOfSpeech)) {
        processed.type = item.partOfSpeech[0];
        processed.partOfSpeech = item.partOfSpeech;
      } else if (processed.type) {
        processed.partOfSpeech = [processed.type];
      }
      
      // 自动生成标签
      if (this.data.autoGenerateTags && processed.tags.length === 0) {
        processed.tags = this.generateTags(processed);
      }
      
      // 生成搜索文本
      processed.searchText = [
        processed.word,
        processed.kana,
        processed.romaji,
        processed.meaning
      ].filter(Boolean).join(' ');
      
      // 添加随机字段和排序索引
      processed.random = Math.random();
      processed.sortIndex = index;
      
      return processed;
    });
  },

  // 生成标签
  generateTags(item) {
    const tags = [];
    
    // 根据词性生成标签
    if (item.type) {
      tags.push(item.type);
    }
    
    // 根据级别生成标签
    if (item.level) {
      tags.push(item.level);
    }
    
    // 根据分类生成标签
    if (item.category && item.category !== 'general') {
      tags.push(item.category);
    }
    
    return tags;
  },

  // 清空选项变化
  onClearOptionChange(e) {
    this.setData({
      clearExisting: e.detail.value
    });
  },

  // 标签选项变化
  onTagsOptionChange(e) {
    this.setData({
      autoGenerateTags: e.detail.value
    });
    
    // 重新处理数据
    if (this.data.parsedData.length > 0) {
      const processedData = this.validateAndProcessData(this.data.parsedData);
      this.setData({
        parsedData: processedData,
        previewData: processedData.slice(0, 5)
      });
    }
  },

  // 开始导入
  async startImport() {
    const that = this;
    
    // 确认操作
    wx.showModal({
      title: '确认导入',
      content: `即将导入 ${this.data.totalCount} 个词汇${this.data.clearExisting ? '，并清空现有数据' : ''}`,
      success(res) {
        if (res.confirm) {
          that.doImport();
        }
      }
    });
  },

  // 执行导入
  async doImport() {
    this.setData({
      importing: true,
      importComplete: false,
      progress: 0,
      importedCount: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
      stopFlag: false
    });

    const batchSize = 10; // 每批处理10个
    const batches = [];
    
    // 分批
    for (let i = 0; i < this.data.parsedData.length; i += batchSize) {
      batches.push(this.data.parsedData.slice(i, i + batchSize));
    }

    // 如果需要清空现有数据
    if (this.data.clearExisting) {
      try {
        await this.clearExistingData();
      } catch(err) {
        console.error('清空数据失败', err);
        wx.showToast({
          title: '清空数据失败',
          icon: 'none'
        });
        this.setData({ importing: false });
        return;
      }
    }

    // 批量导入
    for (let i = 0; i < batches.length; i++) {
      if (this.data.stopFlag) {
        break;
      }

      const batch = batches[i];
      const results = await this.importBatch(batch);
      
      // 更新进度
      const importedCount = Math.min((i + 1) * batchSize, this.data.totalCount);
      const progress = Math.round((importedCount / this.data.totalCount) * 100);
      
      this.setData({
        importedCount,
        progress,
        successCount: this.data.successCount + results.success,
        failedCount: this.data.failedCount + results.failed,
        errors: [...this.data.errors, ...results.errors]
      });

      // 小延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 导入完成
    this.setData({
      importing: false,
      importComplete: true
    });

    // 显示结果
    if (this.data.failedCount > 0) {
      wx.showToast({
        title: `导入完成，${this.data.failedCount}个失败`,
        icon: 'none',
        duration: 3000
      });
    } else {
      wx.showToast({
        title: '导入成功',
        icon: 'success'
      });
    }
  },

  // 清空现有数据
  clearExistingData() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'batch-import',
        data: {
          action: 'clear'
        },
        success: resolve,
        fail: reject
      });
    });
  },

  // 导入一批数据
  async importBatch(batch) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      const res = await wx.cloud.callFunction({
        name: 'batch-import',
        data: {
          action: 'import',
          data: batch
        }
      });

      if (res.result.success) {
        results.success = res.result.successCount || batch.length;
        results.failed = res.result.failedCount || 0;
        results.errors = res.result.errors || [];
      } else {
        results.failed = batch.length;
        batch.forEach(item => {
          results.errors.push({
            word: item.word,
            error: '导入失败'
          });
        });
      }
    } catch(err) {
      console.error('批量导入失败', err);
      results.failed = batch.length;
      batch.forEach(item => {
        results.errors.push({
          word: item.word,
          error: err.message || '网络错误'
        });
      });
    }

    return results;
  },

  // 停止导入
  stopImport() {
    this.setData({
      stopFlag: true
    });
    wx.showToast({
      title: '正在停止...',
      icon: 'none'
    });
  },

  // 重置导入
  resetImport() {
    this.setData({
      fileName: '',
      fileContent: '',
      previewData: [],
      totalCount: 0,
      parsedData: [],
      importComplete: false,
      errors: []
    });
  },

  // 前往学习
  goToLearn() {
    wx.switchTab({
      url: '/pages/learn/learn'
    });
  }
});