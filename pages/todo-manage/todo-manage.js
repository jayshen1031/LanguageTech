Page({
  data: {
    todos: [],
    filteredTodos: [],
    statusFilter: 'all',
    searchKey: '',
    showModal: false,
    editingId: null,
    formData: {
      title: '',
      description: '',
      status: 'pending',
      priority: 3,
      tagsStr: ''
    },
    priorityOptions: [
      { label: 'P1 - 紧急', value: 1 },
      { label: 'P2 - 高', value: 2 },
      { label: 'P3 - 中', value: 3 },
      { label: 'P4 - 低', value: 4 }
    ],
    priorityIndex: 2,
    statusOptions: [
      { label: '待处理', value: 'pending' },
      { label: '进行中', value: 'in_progress' },
      { label: '已完成', value: 'completed' }
    ],
    statusIndex: 0
  },

  onLoad() {
    this.loadTodos();
  },

  // 加载todo列表
  async loadTodos() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'todo-manage',
        data: {
          action: 'list'
        }
      });

      if (res.result.code === 200) {
        const todos = res.result.data.map(item => ({
          ...item,
          updateTime: this.formatDate(item.updateTime)
        }));
        
        this.setData({ 
          todos,
          filteredTodos: this.filterTodos(todos)
        });
      } else {
        wx.showToast({
          title: res.result.msg || '加载失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('加载失败：', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 筛选todos
  filterTodos(todos) {
    let filtered = todos || this.data.todos;
    
    // 按状态筛选
    if (this.data.statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === this.data.statusFilter);
    }
    
    // 按关键词搜索
    if (this.data.searchKey) {
      const key = this.data.searchKey.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(key) ||
        (item.description && item.description.toLowerCase().includes(key))
      );
    }
    
    return filtered;
  },

  // 状态筛选
  filterByStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      statusFilter: status,
      filteredTodos: this.filterTodos()
    });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKey: e.detail.value
    });
  },

  // 执行搜索
  searchTodos() {
    this.setData({
      filteredTodos: this.filterTodos()
    });
  },

  // 显示添加弹窗
  showAddDialog() {
    this.setData({
      showModal: true,
      editingId: null,
      formData: {
        title: '',
        description: '',
        status: 'pending',
        priority: 3,
        tagsStr: ''
      },
      priorityIndex: 2,
      statusIndex: 0
    });
  },

  // 编辑todo
  editTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(item => item._id === id);
    
    if (todo) {
      const priorityIndex = this.data.priorityOptions.findIndex(
        item => item.value === todo.priority
      );
      const statusIndex = this.data.statusOptions.findIndex(
        item => item.value === todo.status
      );
      
      this.setData({
        showModal: true,
        editingId: id,
        formData: {
          title: todo.title,
          description: todo.description || '',
          status: todo.status,
          priority: todo.priority,
          tagsStr: (todo.tags || []).join(' ')
        },
        priorityIndex: priorityIndex >= 0 ? priorityIndex : 2,
        statusIndex: statusIndex >= 0 ? statusIndex : 0
      });
    }
  },

  // 切换状态
  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    
    // 状态流转：pending -> in_progress -> completed -> pending
    const statusFlow = {
      'pending': 'in_progress',
      'in_progress': 'completed',
      'completed': 'pending'
    };
    
    const newStatus = statusFlow[status] || 'pending';
    
    wx.showLoading({ title: '更新中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'todo-manage',
        data: {
          action: 'update',
          data: {
            _id: id,
            status: newStatus
          }
        }
      });

      if (res.result.code === 200) {
        wx.showToast({
          title: '状态已更新',
          icon: 'success'
        });
        this.loadTodos();
      } else {
        wx.showToast({
          title: res.result.msg || '更新失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('更新失败：', err);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除todo
  async deleteTodo(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'todo-manage',
              data: {
                action: 'delete',
                data: { _id: id }
              }
            });

            if (result.result.code === 200) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadTodos();
            } else {
              wx.showToast({
                title: result.result.msg || '删除失败',
                icon: 'none'
              });
            }
          } catch (err) {
            console.error('删除失败：', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 保存todo
  async saveTodo() {
    const { title, description, status, priority, tagsStr } = this.data.formData;
    
    if (!title.trim()) {
      wx.showToast({
        title: '请输入任务标题',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    const tags = tagsStr.trim() ? tagsStr.trim().split(/\s+/) : [];
    const action = this.data.editingId ? 'update' : 'add';
    const data = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      tags
    };
    
    if (this.data.editingId) {
      data._id = this.data.editingId;
    }
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'todo-manage',
        data: { action, data }
      });

      if (res.result.code === 200) {
        wx.showToast({
          title: this.data.editingId ? '更新成功' : '添加成功',
          icon: 'success'
        });
        this.hideModal();
        this.loadTodos();
      } else {
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('保存失败：', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 隐藏弹窗
  hideModal() {
    this.setData({
      showModal: false,
      editingId: null
    });
  },

  // 输入处理
  onInputTitle(e) {
    this.setData({
      'formData.title': e.detail.value
    });
  },

  onInputDesc(e) {
    this.setData({
      'formData.description': e.detail.value
    });
  },

  onInputTags(e) {
    this.setData({
      'formData.tagsStr': e.detail.value
    });
  },

  onPriorityChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      priorityIndex: index,
      'formData.priority': this.data.priorityOptions[index].value
    });
  },

  onStatusChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      statusIndex: index,
      'formData.status': this.data.statusOptions[index].value
    });
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 防止冒泡
  noop() {}
});