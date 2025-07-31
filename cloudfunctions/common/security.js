// 云函数安全中间件
const cloud = require('wx-server-sdk')

// 验证用户身份
async function validateUser(openid) {
  if (!openid) {
    throw new Error('未授权访问')
  }
  
  // TODO: 可以添加更多验证逻辑
  // 例如：检查用户是否被封禁、是否有权限等
  
  return true
}

// 参数验证
function validateParams(params, rules) {
  for (const [key, rule] of Object.entries(rules)) {
    const value = params[key]
    
    // 必填检查
    if (rule.required && !value) {
      throw new Error(`参数 ${key} 不能为空`)
    }
    
    // 类型检查
    if (value && rule.type && typeof value !== rule.type) {
      throw new Error(`参数 ${key} 类型错误`)
    }
    
    // 长度检查
    if (value && rule.maxLength && value.length > rule.maxLength) {
      throw new Error(`参数 ${key} 超过最大长度`)
    }
    
    // 正则检查
    if (value && rule.pattern && !rule.pattern.test(value)) {
      throw new Error(`参数 ${key} 格式错误`)
    }
  }
}

// 敏感词过滤
const sensitiveWords = ['敏感词1', '敏感词2'] // 实际使用时应从数据库加载

function filterSensitiveContent(text) {
  let filtered = text
  for (const word of sensitiveWords) {
    filtered = filtered.replace(new RegExp(word, 'gi'), '***')
  }
  return filtered
}

// 日志记录
async function logAccess(functionName, openid, params, result) {
  const db = cloud.database()
  try {
    await db.collection('access_logs').add({
      data: {
        functionName,
        openid,
        params: JSON.stringify(params),
        result: result.success ? 'success' : 'failed',
        errorMessage: result.error || '',
        timestamp: new Date(),
        ip: cloud.getWXContext().CLIENTIP
      }
    })
  } catch (error) {
    console.error('日志记录失败:', error)
  }
}

module.exports = {
  validateUser,
  validateParams,
  filterSensitiveContent,
  logAccess
}