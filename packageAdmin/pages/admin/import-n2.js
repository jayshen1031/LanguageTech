// pages/admin/import-n2.js
Page({
  data: {
    importing: false,
    currentProgress: 0,
    totalVocabulary: 2000,
    importedCount: 0,
    failedCount: 0,
    logs: [],
    segmentSize: 100, // 每段导入的词汇数量
    currentSegment: 0,
    totalSegments: 20, // 2000/100 = 20段
    statusMessage: '准备导入N2词汇...',
    importMethod: 'segmented' // 'segmented' 或 'full'
  },

  onLoad() {
    this.checkImportStatus();
  },

  // 检查当前导入状态
  async checkImportStatus() {
    wx.showLoading({ title: '检查状态...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: {
          action: 'getImportStatus'
        }
      });
      
      if (res.result.success) {
        const { imported, target, progress, completed } = res.result;
        this.setData({
          importedCount: imported,
          totalVocabulary: target,
          currentProgress: parseFloat(progress),
          statusMessage: res.result.message,
          currentSegment: Math.floor(imported / this.data.segmentSize)
        });
        
        this.addLog(`当前状态: ${res.result.message}`);
        
        if (completed) {
          wx.showToast({
            title: '词汇已全部导入',
            icon: 'success'
          });
        }
      }
    } catch (error) {
      console.error('检查状态失败:', error);
      this.addLog(`检查状态失败: ${error.message}`, 'error');
    } finally {
      wx.hideLoading();
    }
  },

  // 开始分段导入
  async startSegmentedImport() {
    if (this.data.importing) {
      wx.showToast({
        title: '正在导入中...',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认导入',
      content: '将分段导入2000个N2词汇，每段100个。是否继续？',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ 
            importing: true,
            importedCount: 0,
            failedCount: 0,
            currentSegment: 0,
            logs: []
          });
          
          this.addLog('开始分段导入N2词汇...');
          await this.importNextSegment(0, true); // 第一段时清空现有数据
        }
      }
    });
  },

  // 导入下一段
  async importNextSegment(startIndex, clearExisting = false) {
    const { segmentSize, totalVocabulary } = this.data;
    const endIndex = Math.min(startIndex + segmentSize, totalVocabulary);
    const currentSegment = Math.floor(startIndex / segmentSize) + 1;
    
    this.setData({
      currentSegment,
      statusMessage: `正在导入第 ${currentSegment}/${this.data.totalSegments} 段...`
    });
    
    this.addLog(`导入第 ${startIndex + 1} - ${endIndex} 个词汇...`);
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'import-n2-vocabulary',
        data: {
          action: 'importSegment',
          startIndex,
          endIndex,
          clearExisting
        },
        timeout: 30000 // 30秒超时
      });
      
      if (res.result.success || res.result.segment?.imported > 0) {
        const { segment, failedItems } = res.result;
        
        // 更新统计
        const newImported = this.data.importedCount + (segment?.imported || 0);
        const newFailed = this.data.failedCount + (segment?.failed || 0);
        const progress = (newImported / totalVocabulary * 100).toFixed(1);
        
        this.setData({
          importedCount: newImported,
          failedCount: newFailed,
          currentProgress: parseFloat(progress)
        });
        
        this.addLog(`✓ 第 ${currentSegment} 段完成: 成功 ${segment?.imported || 0} 个，失败 ${segment?.failed || 0} 个`);
        
        // 如果有失败项，记录部分失败信息
        if (failedItems && failedItems.length > 0) {
          this.addLog(`  失败词汇: ${failedItems.slice(0, 3).map(item => item.word).join(', ')}...`, 'warn');
        }
        
        // 继续下一段
        if (res.result.hasMore) {
          // 添加延迟，避免请求过快
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.importNextSegment(res.result.nextStartIndex);
        } else {
          // 导入完成
          this.onImportComplete();
        }
      } else {
        throw new Error(res.result.message || '导入失败');
      }
    } catch (error) {
      console.error('导入段失败:', error);
      this.addLog(`✗ 第 ${currentSegment} 段失败: ${error.message}`, 'error');
      
      // 询问是否继续
      wx.showModal({
        title: '导入出错',
        content: `第 ${currentSegment} 段导入失败。是否继续下一段？`,
        confirmText: '继续',
        cancelText: '停止',
        success: async (res) => {
          if (res.confirm) {
            // 继续下一段
            const nextStart = endIndex;
            if (nextStart < totalVocabulary) {
              await this.importNextSegment(nextStart);
            } else {
              this.onImportComplete();
            }
          } else {
            // 停止导入
            this.setData({ 
              importing: false,
              statusMessage: '导入已停止'
            });
          }
        }
      });
    }
  },

  // 导入完成
  onImportComplete() {
    const { importedCount, failedCount, totalVocabulary } = this.data;
    
    this.setData({ 
      importing: false,
      statusMessage: `导入完成！成功: ${importedCount}/${totalVocabulary}，失败: ${failedCount}`
    });
    
    this.addLog('========== 导入完成 ==========');
    this.addLog(`总计: 成功 ${importedCount} 个，失败 ${failedCount} 个`);
    
    wx.showToast({
      title: '导入完成',
      icon: 'success',
      duration: 2000
    });
    
    // 延迟后返回
    setTimeout(() => {
      wx.showModal({
        title: '导入完成',
        content: `成功导入 ${importedCount} 个词汇${failedCount > 0 ? `，${failedCount} 个失败` : ''}。是否返回？`,
        confirmText: '返回',
        cancelText: '留在此页',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    }, 2000);
  },

  // 清空所有N2词汇
  async clearAllVocabulary() {
    wx.showModal({
      title: '确认清空',
      content: '将删除所有N2词汇数据，此操作不可恢复！',
      confirmColor: '#ff0000',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清空中...' });
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'import-n2-vocabulary',
              data: {
                action: 'clearAll'
              }
            });
            
            if (result.result.success) {
              this.setData({
                importedCount: 0,
                currentProgress: 0,
                statusMessage: result.result.message
              });
              
              this.addLog(`已清空 ${result.result.removed} 个词汇`);
              
              wx.showToast({
                title: '清空成功',
                icon: 'success'
              });
            }
          } catch (error) {
            console.error('清空失败:', error);
            wx.showToast({
              title: '清空失败',
              icon: 'error'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 添加日志
  addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const log = {
      time,
      message,
      type
    };
    
    this.setData({
      logs: [...this.data.logs, log]
    });
    
    // 自动滚动到底部
    setTimeout(() => {
      wx.pageScrollTo({
        scrollTop: 10000,
        duration: 300
      });
    }, 100);
  },

  // 停止导入
  stopImport() {
    wx.showModal({
      title: '确认停止',
      content: '确定要停止导入吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ 
            importing: false,
            statusMessage: '导入已停止'
          });
          this.addLog('用户停止了导入', 'warn');
        }
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});