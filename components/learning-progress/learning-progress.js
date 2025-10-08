// 学习进度确认组件
const { learningProgress } = require('../../utils/learningProgress.js')

Component({
  properties: {
    // 学习内容
    content: {
      type: String,
      required: true
    },
    // 学习类型：word/sentence/grammar/structure
    type: {
      type: String,
      value: 'word'
    },
    // 额外元数据
    metadata: {
      type: Object,
      value: {}
    },
    // 是否显示详细信息
    showDetails: {
      type: Boolean,
      value: true
    },
    // 组件大小：small/normal/large
    size: {
      type: String,
      value: 'normal'
    }
  },

  data: {
    learningItem: null,
    displayInfo: null,
    isLoading: false
  },

  lifetimes: {
    attached() {
      this.initLearningItem()
    }
  },

  observers: {
    'content, type': function(content, type) {
      if (content && type) {
        this.initLearningItem()
      }
    }
  },

  methods: {
    // 初始化学习项目
    initLearningItem() {
      if (!this.data.content) return

      try {
        // 查找或创建学习项目
        let item = this.findExistingItem()
        if (!item) {
          item = learningProgress.addLearningItem(
            this.data.content,
            this.data.type,
            this.data.metadata
          )
        }

        // 更新显示信息
        this.updateDisplayInfo(item)
      } catch (error) {
        console.error('初始化学习项目失败:', error)
      }
    },

    // 查找现有学习项目
    findExistingItem() {
      const allItems = learningProgress.getAllLearningItems()
      return allItems.find(item => 
        item.content === this.data.content && 
        item.type === this.data.type
      )
    },

    // 更新显示信息
    updateDisplayInfo(item) {
      const displayInfo = learningProgress.getItemDisplayInfo(item)
      
      this.setData({
        learningItem: item,
        displayInfo: displayInfo
      })

      // 触发外部事件
      this.triggerEvent('itemupdate', {
        item: item,
        displayInfo: displayInfo
      })
    },

    // 确认学习一次
    onConfirmLearning() {
      if (!this.data.learningItem) return

      this.setData({ isLoading: true })

      try {
        const result = learningProgress.confirmLearning(this.data.learningItem.id)
        
        if (result.success) {
          // 更新显示
          this.updateDisplayInfo(result.item)
          
          // 显示成功提示
          wx.showToast({
            title: result.message,
            icon: 'success',
            duration: 1000
          })

          // 触发学习事件
          this.triggerEvent('learn', {
            item: result.item,
            learnCount: result.item.learnCount,
            canMarkFamiliar: result.canMarkFamiliar,
            canMarkMastered: result.canMarkMastered
          })

          // 检查是否可以标记状态
          this.checkStatusMarkAvailable(result)
        }
      } catch (error) {
        console.error('确认学习失败:', error)
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
      } finally {
        this.setData({ isLoading: false })
      }
    },

    // 检查是否可以标记状态
    checkStatusMarkAvailable(result) {
      setTimeout(() => {
        if (result.canMarkFamiliar && this.data.learningItem.status === 'learning') {
          this.showStatusMarkDialog('familiar')
        } else if (result.canMarkMastered && this.data.learningItem.status !== 'mastered') {
          this.showStatusMarkDialog('mastered')
        }
      }, 1500)
    },

    // 显示状态标记对话框
    showStatusMarkDialog(targetStatus) {
      const statusText = targetStatus === 'familiar' ? '略懂' : '掌握'
      const displayInfo = this.data.displayInfo
      
      wx.showModal({
        title: '学习评估',
        content: `您已经学习了${displayInfo.learnCount}次，觉得${statusText}了吗？`,
        confirmText: `标记为${statusText}`,
        cancelText: '继续学习',
        success: (res) => {
          if (res.confirm) {
            this.markStatus(targetStatus)
          }
        }
      })
    },

    // 标记为略懂
    onMarkFamiliar() {
      this.markStatus('familiar')
    },

    // 标记为掌握
    onMarkMastered() {
      this.markStatus('mastered')
    },

    // 标记状态
    markStatus(status) {
      if (!this.data.learningItem) return

      this.setData({ isLoading: true })

      try {
        let result
        if (status === 'familiar') {
          result = learningProgress.markAsFamiliar(this.data.learningItem.id)
        } else if (status === 'mastered') {
          result = learningProgress.markAsMastered(this.data.learningItem.id)
        }

        if (result.success) {
          // 更新显示
          this.updateDisplayInfo(result.item)
          
          // 显示成功提示
          wx.showToast({
            title: result.message,
            icon: 'success'
          })

          // 触发状态变更事件
          this.triggerEvent('statuschange', {
            item: result.item,
            oldStatus: this.data.learningItem.status,
            newStatus: status
          })
        } else {
          wx.showToast({
            title: result.message,
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('标记状态失败:', error)
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
      } finally {
        this.setData({ isLoading: false })
      }
    },

    // 显示学习详情
    showLearningDetails() {
      if (!this.data.learningItem) return

      const item = this.data.learningItem
      const displayInfo = this.data.displayInfo

      wx.showModal({
        title: `${displayInfo.icon} ${displayInfo.typeName}学习详情`,
        content: `内容：${item.content}

学习次数：${item.learnCount}次
当前状态：${displayInfo.status}
学习进度：${displayInfo.progressPercent}%

下一目标：${displayInfo.nextTarget}

首次学习：${this.formatDate(item.firstStudyTime)}
最后学习：${this.formatDate(item.lastStudyTime)}`,
        showCancel: false,
        confirmText: '知道了'
      })
    },

    // 格式化日期
    formatDate(dateStr) {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now - date
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

      if (diffDays === 0) {
        return '今天'
      } else if (diffDays === 1) {
        return '昨天'
      } else if (diffDays < 7) {
        return `${diffDays}天前`
      } else {
        return date.toLocaleDateString()
      }
    }
  }
})