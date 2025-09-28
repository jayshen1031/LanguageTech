// 音频缓存管理器
// 用于管理音频文件的本地存储和缓存

class AudioCache {
  constructor() {
    // 缓存键前缀
    this.cachePrefix = 'audio_cache_'
    // 缓存索引键
    this.indexKey = 'audio_cache_index'
    // 最大缓存大小（100MB，为永久存储增加容量）
    this.maxCacheSize = 100 * 1024 * 1024
    // 缓存过期时间（设为null表示永不过期）
    this.cacheExpiry = null
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
        // console.log('音频缓存目录创建成功')
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
    
    // 首先检查缓存索引中是否有base64格式的缓存
    const indexData = this.getCacheIndex()
    const cacheRecord = indexData.records.find(record => record.key === cacheKey)
    
    if (cacheRecord && cacheRecord.isBase64 && cacheRecord.audioUrl) {
      // 找到base64格式的缓存
      // console.log('找到base64缓存:', cacheKey)
      return cacheRecord.audioUrl
    }
    
    // 检查文件缓存
    const filePath = this.getCacheFilePath(cacheKey)
    try {
      // 检查文件是否存在
      const stats = this.fs.statSync(filePath)
      
      // 永久缓存，不检查过期时间
      // console.log('找到文件缓存:', cacheKey)
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
    
    // 检查URL格式
    if (audioUrl.startsWith('data:audio/')) {
      // Base64数据URL，无需下载，直接记录到索引
      return new Promise((resolve, reject) => {
        try {
          // 更新缓存索引，标记为base64格式
          this.updateCacheIndex(cacheKey, text, { ...options, isBase64: true, audioUrl })
          
          // 清理过期缓存
          this.cleanupCache()
          
          resolve(audioUrl) // 返回原始URL用于播放
        } catch (err) {
          console.error('保存base64缓存记录失败:', err)
          reject(err)
        }
      })
    }
    
    return new Promise((resolve, reject) => {
      // 下载音频文件
      wx.downloadFile({
        url: audioUrl,
        filePath: filePath,
        success: (res) => {
          if (res.statusCode === 200) {
            // console.log('音频已缓存:', cacheKey)
            
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

  // 获取缓存索引
  getCacheIndex() {
    try {
      const index = wx.getStorageSync(this.indexKey) || {}
      
      // 兼容新旧格式
      if (!index.records) {
        // 旧格式，转换为新格式
        const records = Object.keys(index).map(key => ({
          key: key,
          text: index[key].text,
          options: index[key].options,
          timestamp: index[key].timestamp,
          size: index[key].size || 0,
          isBase64: false
        }))
        
        return {
          version: '2.0',
          records: records
        }
      }
      
      return index
    } catch (e) {
      console.error('获取缓存索引失败:', e)
      return { version: '2.0', records: [] }
    }
  }

  // 更新缓存索引
  updateCacheIndex(cacheKey, text, options) {
    try {
      // 获取现有索引
      let indexData = this.getCacheIndex()
      
      // 查找是否已存在该记录
      const existingIndex = indexData.records.findIndex(record => record.key === cacheKey)
      
      const newRecord = {
        key: cacheKey,
        text: text.substring(0, 50), // 只保存前50个字符
        options: options,
        timestamp: Date.now(),
        size: 0, // 可以添加文件大小信息
        isBase64: options.isBase64 || false,
        audioUrl: options.audioUrl || null
      }
      
      if (existingIndex >= 0) {
        // 更新现有记录
        indexData.records[existingIndex] = newRecord
      } else {
        // 添加新记录
        indexData.records.push(newRecord)
      }
      
      // 保存索引
      wx.setStorageSync(this.indexKey, indexData)
    } catch (e) {
      console.error('更新缓存索引失败:', e)
    }
  }

  // 清理缓存（只在超过大小限制时清理）
  async cleanupCache() {
    try {
      // 永久缓存不清理过期文件，只检查大小
      this.checkCacheSize()
    } catch (e) {
      console.error('清理缓存失败:', e)
    }
  }

  // 检查缓存大小（智能管理策略）
  async checkCacheSize() {
    try {
      // 获取所有缓存文件
      const files = this.fs.readdirSync(this.cacheDir)
      
      // 计算总大小并获取文件信息
      let totalSize = 0
      const fileStats = files.map(file => {
        const filePath = `${this.cacheDir}/${file}`
        try {
          const stat = this.fs.statSync(filePath)
          totalSize += stat.size
          return {
            path: filePath,
            time: stat.lastModified,
            size: stat.size,
            filename: file
          }
        } catch (e) {
          return null
        }
      }).filter(item => item !== null)
      
      // console.log(`缓存总大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB / ${(this.maxCacheSize / 1024 / 1024).toFixed(2)}MB`)
      
      if (totalSize > this.maxCacheSize) {
        // console.log('缓存超过限制，开始智能清理')
        
        // 按最后访问时间排序（最久未使用的在前）
        fileStats.sort((a, b) => a.time - b.time)
        
        // 智能清理策略：保留假名等基础音频，优先删除其他音频
        const kanaPattern = /^[あ-んア-ン]_/  // 假名文件的特征
        const basicFiles = []
        const otherFiles = []
        
        fileStats.forEach(file => {
          if (kanaPattern.test(file.filename)) {
            basicFiles.push(file)
          } else {
            otherFiles.push(file)
          }
        })
        
        // 优先删除非假名音频
        let currentSize = totalSize
        const targetSize = this.maxCacheSize * 0.7 // 清理到70%
        
        // 先删除其他音频
        for (const file of otherFiles) {
          if (currentSize <= targetSize) break
          
          try {
            this.fs.unlinkSync(file.path)
            currentSize -= file.size
            // console.log('删除缓存:', file.filename)
          } catch (e) {
            console.error('删除文件失败:', e)
          }
        }
        
        // 如果还超限，再删除最旧的假名音频
        if (currentSize > targetSize) {
          for (const file of basicFiles) {
            if (currentSize <= targetSize) break
            
            try {
              this.fs.unlinkSync(file.path)
              currentSize -= file.size
              // console.log('删除假名缓存:', file.filename)
            } catch (e) {
              console.error('删除文件失败:', e)
            }
          }
        }
        
        // console.log(`清理完成，当前大小: ${(currentSize / 1024 / 1024).toFixed(2)}MB`)
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
      
      // console.log('所有音频缓存已清空')
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