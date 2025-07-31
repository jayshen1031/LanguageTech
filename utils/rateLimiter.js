// 请求限流工具
const rateLimitMap = new Map()

// 限流配置
const RATE_LIMITS = {
  ai: { maxRequests: 10, windowMs: 60000 },      // AI: 每分钟10次
  ocr: { maxRequests: 20, windowMs: 60000 },     // OCR: 每分钟20次
  tts: { maxRequests: 30, windowMs: 60000 },     // TTS: 每分钟30次
  asr: { maxRequests: 20, windowMs: 60000 }      // ASR: 每分钟20次
}

// 检查是否超限
function checkRateLimit(userId, service) {
  const key = `${userId}-${service}`
  const limit = RATE_LIMITS[service]
  if (!limit) return true
  
  const now = Date.now()
  const userRecord = rateLimitMap.get(key) || { count: 0, resetTime: now + limit.windowMs }
  
  // 重置计数
  if (now > userRecord.resetTime) {
    userRecord.count = 0
    userRecord.resetTime = now + limit.windowMs
  }
  
  // 检查是否超限
  if (userRecord.count >= limit.maxRequests) {
    return false
  }
  
  // 增加计数
  userRecord.count++
  rateLimitMap.set(key, userRecord)
  return true
}

// 获取剩余请求次数
function getRemainingRequests(userId, service) {
  const key = `${userId}-${service}`
  const limit = RATE_LIMITS[service]
  if (!limit) return Infinity
  
  const userRecord = rateLimitMap.get(key)
  if (!userRecord) return limit.maxRequests
  
  const now = Date.now()
  if (now > userRecord.resetTime) {
    return limit.maxRequests
  }
  
  return Math.max(0, limit.maxRequests - userRecord.count)
}

module.exports = {
  checkRateLimit,
  getRemainingRequests,
  RATE_LIMITS
}