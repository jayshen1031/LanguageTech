// 本地测试OCR云函数
const fs = require('fs')
const path = require('path')

// 加载配置
const config = require('./config.js')
console.log('配置加载成功:')
console.log('SECRET_ID:', config.TENCENT_SECRET_ID)
console.log('SECRET_KEY:', config.TENCENT_SECRET_KEY ? '已配置' : '未配置')

// 测试云函数主函数
const { main } = require('./index.js')

// 模拟测试
async function test() {
  try {
    // 模拟事件
    const event = {
      imageBase64: 'test_base64_string',
      languageType: 'JAP'
    }
    
    // 模拟上下文
    const context = {
      OPENID: 'test_openid'
    }
    
    console.log('\n开始测试OCR云函数...')
    const result = await main(event, context)
    console.log('测试结果:', result)
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 运行测试
test()