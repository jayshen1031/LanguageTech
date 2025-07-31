// 简化的OCR测试云函数
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  try {
    // 测试返回
    return {
      success: true,
      message: '云函数调用成功',
      event: event,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}