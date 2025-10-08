// 用户服务工具类
class UserService {
  constructor() {
    this.userInfo = null
    this.userProfile = null
    this.isLoggedIn = false
    
    // 初始化云开发
    this.initCloud()
  }

  // 初始化云开发环境
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    try {
      wx.cloud.init({
        env: 'cloud1-2g49srond2b01891',
        traceUser: true
      })
      console.log('✅ UserService 云开发初始化成功')
    } catch (error) {
      console.error('❌ UserService 云开发初始化失败:', error)
    }
  }

  // 初始化用户服务
  async init() {
    try {
      // 从本地存储加载用户信息
      const userInfo = wx.getStorageSync('userInfo')
      const userProfile = wx.getStorageSync('userProfile')
      
      if (userInfo) {
        this.userInfo = userInfo
        this.isLoggedIn = true
        
        if (userProfile) {
          this.userProfile = userProfile
        }
        
        // 尝试从云端同步最新数据（如果云函数存在）
        try {
          await this.syncFromCloud()
        } catch (error) {
          console.log('云端同步跳过:', error.message)
        }
      }
    } catch (error) {
      console.error('初始化用户服务失败:', error)
    }
  }

  // 用户登录
  async login() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'login'
        }
      })

      if (result.result.success) {
        this.userInfo = result.result.data
        this.isLoggedIn = true
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', this.userInfo)
        wx.setStorageSync('openid', this.userInfo.openid)
        
        // 如果有资料，同步用户资料
        if (this.userInfo.hasProfile) {
          await this.getUserProfile()
        }
        
        return {
          success: true,
          data: this.userInfo
        }
      } else {
        return result.result
      }
    } catch (error) {
      console.error('用户登录失败:', error)
      return {
        success: false,
        error: '登录失败'
      }
    }
  }

  // 更新用户资料
  async updateProfile(profile) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'updateProfile',
          profile: profile
        }
      })

      if (result.result.success) {
        this.userProfile = profile
        
        // 保存到本地存储
        wx.setStorageSync('userProfile', profile)
        
        return {
          success: true,
          data: profile
        }
      } else {
        return result.result
      }
    } catch (error) {
      console.error('更新用户资料失败:', error)
      return {
        success: false,
        error: '更新失败'
      }
    }
  }

  // 获取用户资料
  async getUserProfile() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'getUserProfile'
        }
      })

      if (result.result.success) {
        this.userProfile = result.result.data
        
        // 保存到本地存储
        wx.setStorageSync('userProfile', this.userProfile)
        
        return {
          success: true,
          data: this.userProfile
        }
      } else {
        return result.result
      }
    } catch (error) {
      console.error('获取用户资料失败:', error)
      return {
        success: false,
        error: '获取失败'
      }
    }
  }

  // 同步学习数据到云端
  async syncLearningDataToCloud() {
    // 检查是否启用云端同步
    const enableCloudSync = true // 启用云端同步
    
    if (!enableCloudSync) {
      console.log('🔕 云端同步已禁用，数据仅保存在本地')
      return {
        success: true,
        message: '本地数据已保存',
        localOnly: true
      }
    }
    
    if (!this.isLoggedIn) {
      return {
        success: false,
        error: '用户未登录'
      }
    }

    try {
      // 收集本地学习数据
      const learningData = await this.collectLocalLearningData()
      
      const result = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'syncLearningData',
          data: learningData
        }
      })

      if (result.result.success) {
        // 更新最后同步时间
        wx.setStorageSync('lastSyncTime', new Date())
        
        return {
          success: true,
          data: result.result.data
        }
      } else {
        return result.result
      }
    } catch (error) {
      console.error('同步学习数据失败:', error)
      return {
        success: false,
        error: '同步失败'
      }
    }
  }

  // 从云端同步学习数据
  async syncFromCloud() {
    // 检查是否启用云端同步
    const enableCloudSync = true // 启用云端同步
    
    if (!enableCloudSync) {
      console.log('🔕 云端同步已禁用，仅使用本地数据')
      return {
        success: true,
        message: '使用本地数据',
        localOnly: true
      }
    }
    
    if (!this.isLoggedIn) {
      return {
        success: false,
        error: '用户未登录'
      }
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'getLearningData'
        }
      })

      if (result.result.success) {
        const cloudData = result.result.data
        
        // 合并云端数据到本地
        await this.mergeLearningData(cloudData)
        
        return {
          success: true,
          data: cloudData
        }
      } else {
        // 如果云端没有数据，不视为错误
        return {
          success: true,
          data: null
        }
      }
    } catch (error) {
      console.error('从云端同步数据失败:', error)
      
      // 如果是云函数不存在，不视为错误
      if (error.errCode === -501000) {
        console.log('📝 user-auth 云函数不存在，跳过云端同步')
        return {
          success: true,
          data: null
        }
      }
      
      return {
        success: false,
        error: '同步失败'
      }
    }
  }

  // 收集本地学习数据
  async collectLocalLearningData() {
    const data = {}
    
    try {
      // 收集各种本地学习数据
      data.vocabulary = wx.getStorageSync('userVocabulary') || []
      data.learningProgress = wx.getStorageSync('learningProgress') || {}
      data.studyHistory = wx.getStorageSync('studyHistory') || []
      data.reviewSchedule = wx.getStorageSync('reviewSchedule') || []
      data.parsedTexts = wx.getStorageSync('parsedTexts') || []
      data.favorites = wx.getStorageSync('favorites') || []
      data.settings = wx.getStorageSync('userSettings') || {}
      data.achievements = wx.getStorageSync('achievements') || []
      data.dailyStats = wx.getStorageSync('dailyStats') || {}
      
    } catch (error) {
      console.error('收集本地学习数据失败:', error)
    }
    
    return data
  }

  // 合并学习数据
  async mergeLearningData(cloudData) {
    try {
      if (!cloudData) return
      
      // 智能合并策略：优先使用最新的数据
      if (cloudData.vocabulary) {
        const localVocab = wx.getStorageSync('userVocabulary') || []
        const mergedVocab = this.mergeVocabularyData(localVocab, cloudData.vocabulary)
        wx.setStorageSync('userVocabulary', mergedVocab)
      }
      
      if (cloudData.learningProgress) {
        wx.setStorageSync('learningProgress', cloudData.learningProgress)
      }
      
      if (cloudData.studyHistory) {
        const localHistory = wx.getStorageSync('studyHistory') || []
        const mergedHistory = this.mergeArrayData(localHistory, cloudData.studyHistory)
        wx.setStorageSync('studyHistory', mergedHistory)
      }
      
      if (cloudData.reviewSchedule) {
        wx.setStorageSync('reviewSchedule', cloudData.reviewSchedule)
      }
      
      if (cloudData.parsedTexts) {
        const localTexts = wx.getStorageSync('parsedTexts') || []
        const mergedTexts = this.mergeArrayData(localTexts, cloudData.parsedTexts)
        wx.setStorageSync('parsedTexts', mergedTexts)
      }
      
      if (cloudData.favorites) {
        const localFavorites = wx.getStorageSync('favorites') || []
        const mergedFavorites = this.mergeArrayData(localFavorites, cloudData.favorites)
        wx.setStorageSync('favorites', mergedFavorites)
      }
      
      if (cloudData.settings) {
        wx.setStorageSync('userSettings', cloudData.settings)
      }
      
      if (cloudData.achievements) {
        wx.setStorageSync('achievements', cloudData.achievements)
      }
      
      if (cloudData.dailyStats) {
        wx.setStorageSync('dailyStats', cloudData.dailyStats)
      }
      
    } catch (error) {
      console.error('合并学习数据失败:', error)
    }
  }

  // 合并词汇数据
  mergeVocabularyData(localData, cloudData) {
    const merged = [...localData]
    
    cloudData.forEach(cloudItem => {
      const existingIndex = merged.findIndex(item => 
        item.word === cloudItem.word && item.reading === cloudItem.reading
      )
      
      if (existingIndex >= 0) {
        // 如果存在，比较时间戳，保留最新的
        if (new Date(cloudItem.updateTime || cloudItem.addTime) > 
            new Date(merged[existingIndex].updateTime || merged[existingIndex].addTime)) {
          merged[existingIndex] = cloudItem
        }
      } else {
        // 如果不存在，添加到本地
        merged.push(cloudItem)
      }
    })
    
    return merged
  }

  // 合并数组数据
  mergeArrayData(localData, cloudData) {
    // 简单策略：去重并合并
    const merged = [...localData]
    
    cloudData.forEach(cloudItem => {
      const exists = merged.some(item => 
        JSON.stringify(item) === JSON.stringify(cloudItem)
      )
      
      if (!exists) {
        merged.push(cloudItem)
      }
    })
    
    return merged
  }

  // 用户登出
  logout() {
    try {
      // 清除内存数据
      this.userInfo = null
      this.userProfile = null
      this.isLoggedIn = false
      
      // 清除本地存储
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('userProfile')
      wx.removeStorageSync('openid')
      wx.removeStorageSync('lastSyncTime')
      
      return {
        success: true
      }
    } catch (error) {
      console.error('用户登出失败:', error)
      return {
        success: false,
        error: '登出失败'
      }
    }
  }

  // 获取用户信息
  getUserInfo() {
    return this.userInfo
  }

  // 获取用户资料
  getProfile() {
    return this.userProfile
  }

  // 检查是否已登录
  checkLoginStatus() {
    return this.isLoggedIn
  }

  // 自动同步（定时调用）
  async autoSync() {
    if (!this.isLoggedIn) return
    
    try {
      const lastSyncTime = wx.getStorageSync('lastSyncTime')
      const now = new Date()
      
      // 如果超过1小时未同步，则自动同步
      if (!lastSyncTime || (now - new Date(lastSyncTime)) > 3600000) {
        await this.syncLearningDataToCloud()
      }
    } catch (error) {
      console.error('自动同步失败:', error)
    }
  }
}

// 创建单例实例
const userService = new UserService()

module.exports = userService