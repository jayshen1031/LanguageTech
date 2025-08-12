// 音频缓存管理器
// 用于管理音频文件的本地存储和缓存

class AudioCache {
  constructor() {
    // 缓存键前缀
    this.cachePrefix = 'audio_cache_'
    // 缓存索引键
    this.indexKey = 'audio_cache_index'
    // 最大缓存大小（50MB）
    this.maxCacheSize = 50 * 1024 * 1024
    // 缓存过期时间（7天）
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000
    // 文件系统管理器
    this.fs = wx.getFileSystemManager()
    // 缓存目录
    this.cacheDir = `${wx.env.USER_DATA_PATH}/audio_cache`
    
    // 初始化缓存目录
    this.initCacheDir()
  }

  // 初始化缓存目录
  initCacheDir() {
    try {
      // 检查目录是否存在
      this.fs.accessSync(this.cacheDir)
    } catch (e) {
      // 目录不存在，创建目录
      try {
        this.fs.mkdirSync(this.cacheDir, true)
        console.log('音频缓存目录创建成功')
      } catch (err) {
        console.error('创建缓存目录失败:', err)
      }
    }
  }

  // 生成缓存键
  generateCacheKey(text, options = {}) {
    const { voice = 'default', speed = 1.0, lang = 'ja' } = options
    // 使用文本内容和选项生成唯一键
    const key = `${text}_${voice}_${speed}_${lang}`
    // 简单的哈希函数
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // 获取缓存文件路径
  getCacheFilePath(cacheKey) {
    return `${this.cacheDir}/${cacheKey}.mp3`
  }

  // 检查缓存是否存在且有效
  async checkCache(text, options = {}) {
    const cacheKey = this.generateCacheKey(text, options)
    const filePath = this.getCacheFilePath(cacheKey)
    
    try {
      // 检查文件是否存在
      const stats = this.fs.statSync(filePath)
      
      // 检查文件是否过期
      const now = Date.now()
      const fileAge = now - stats.lastModified
      
      if (fileAge > this.cacheExpiry) {
        // 文件已过期，删除
        this.fs.unlinkSync(filePath)
        console.log('缓存已过期，已删除:', cacheKey)
        return null
      }
      
      console.log('找到有效缓存:', cacheKey)
      return filePath
    } catch (e) {
      // 文件不存在或读取失败
      return null
    }
  }

  // 保存音频到缓存
  async saveToCache(text, audioUrl, options = {}) {
    const cacheKey = this.generateCacheKey(text, options)
    const filePath = this.getCacheFilePath(cacheKey)
    
    return new Promise((resolve, reject) => {
      // 下载音频文件
      wx.downloadFile({
        url: audioUrl,
        filePath: filePath,
        success: (res) => {
          if (res.statusCode === 200) {
            console.log('音频已缓存:', cacheKey)
            
            // 更新缓存索引
            this.updateCacheIndex(cacheKey, text, options)
            
            // 清理过期缓存
            this.cleanupCache()
            
            resolve(filePath)
          } else {
            reject(new Error('下载失败'))
          }
        },
        fail: (err) => {
          console.error('保存缓存失败:', err)
          reject(err)
        }
      })
    })
  }

  // 更新缓存索引
  updateCacheIndex(cacheKey, text, options) {
    try {
      // 获取现有索引
      let index = wx.getStorageSync(this.indexKey) || {}
      
      // 添加新缓存记录
      index[cacheKey] = {
        text: text.substring(0, 50), // 只保存前50个字符
        options: options,
        timestamp: Date.now(),
        size: 0 // 可以添加文件大小信息
      }
      
      // 保存索引
      wx.setStorageSync(this.indexKey, index)
    } catch (e) {
      console.error('更新缓存索引失败:', e)
    }
  }

  // 清理过期缓存
  async cleanupCache() {
    try {
      // 获取缓存索引
      const index = wx.getStorageSync(this.indexKey) || {}
      const now = Date.now()
      const updatedIndex = {}
      
      // 检查每个缓存项
      for (const key in index) {
        const item = index[key]
        const age = now - item.timestamp
        
        if (age > this.cacheExpiry) {
          // 删除过期文件
          const filePath = this.getCacheFilePath(key)
          try {
            this.fs.unlinkSync(filePath)
            console.log('删除过期缓存:', key)
          } catch (e) {
            // 文件可能已经不存在
          }
        } else {
          // 保留未过期的项
          updatedIndex[key] = item
        }
      }
      
      // 更新索引
      wx.setStorageSync(this.indexKey, updatedIndex)
      
      // 检查缓存大小
      this.checkCacheSize()
    } catch (e) {
      console.error('清理缓存失败:', e)
    }
  }

  // 检查缓存大小
  async checkCacheSize() {
    try {
      const stats = this.fs.statSync(this.cacheDir)
      
      if (stats.size > this.maxCacheSize) {
        console.log('缓存超过限制，开始清理最旧的文件')
        
        // 获取所有缓存文件
        const files = this.fs.readdirSync(this.cacheDir)
        
        // 按修改时间排序
        const fileStats = files.map(file => {
          const filePath = `${this.cacheDir}/${file}`
          const stat = this.fs.statSync(filePath)
          return {
            path: filePath,
            time: stat.lastModified,
            size: stat.size
          }
        }).sort((a, b) => a.time - b.time)
        
        // 删除最旧的文件，直到低于限制
        let totalSize = stats.size
        for (const file of fileStats) {
          if (totalSize <= this.maxCacheSize * 0.8) { // 清理到80%以下
            break
          }
          
          try {
            this.fs.unlinkSync(file.path)
            totalSize -= file.size
            console.log('删除旧缓存文件:', file.path)
          } catch (e) {
            console.error('删除文件失败:', e)
          }
        }
      }
    } catch (e) {
      console.error('检查缓存大小失败:', e)
    }
  }

  // 清空所有缓存
  async clearAllCache() {
    try {
      // 删除缓存目录下的所有文件
      const files = this.fs.readdirSync(this.cacheDir)
      
      for (const file of files) {
        const filePath = `${this.cacheDir}/${file}`
        try {
          this.fs.unlinkSync(filePath)
        } catch (e) {
          console.error('删除文件失败:', filePath, e)
        }
      }
      
      // 清空缓存索引
      wx.removeStorageSync(this.indexKey)
      
      console.log('所有音频缓存已清空')
      return true
    } catch (e) {
      console.error('清空缓存失败:', e)
      return false
    }
  }

  // 获取缓存统计信息
  getCacheStats() {
    try {
      const index = wx.getStorageSync(this.indexKey) || {}
      const files = this.fs.readdirSync(this.cacheDir)
      
      let totalSize = 0
      for (const file of files) {
        const filePath = `${this.cacheDir}/${file}`
        const stat = this.fs.statSync(filePath)
        totalSize += stat.size
      }
      
      return {
        fileCount: files.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        indexCount: Object.keys(index).length
      }
    } catch (e) {
      console.error('获取缓存统计失败:', e)
      return {
        fileCount: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        indexCount: 0
      }
    }
  }
}

// 导出单例
module.exports = new AudioCache()