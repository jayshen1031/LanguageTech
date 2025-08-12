// 测试腾讯云TTS配置
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-2g49srond2b01891' })

exports.main = async (event, context) => {
  const { text = '你好世界' } = event
  
  console.log('=== TTS测试开始 ===')
  console.log('输入文本:', text)
  
  // 1. 检查配置
  let hasConfig = false
  try {
    const config = require('./config.js')
    hasConfig = !!(config.TENCENT_SECRET_ID && config.TENCENT_SECRET_KEY)
    console.log('配置文件存在:', hasConfig)
    console.log('SECRET_ID长度:', config.TENCENT_SECRET_ID ? config.TENCENT_SECRET_ID.length : 0)
  } catch (e) {
    console.log('配置文件不存在')
  }
  
  // 2. 测试腾讯云SDK
  let sdkAvailable = false
  try {
    require('tencentcloud-sdk-nodejs')
    sdkAvailable = true
    console.log('腾讯云SDK可用')
  } catch (e) {
    console.log('腾讯云SDK不可用:', e.message)
  }
  
  // 3. 测试腾讯云TTS
  if (hasConfig && sdkAvailable) {
    try {
      const { generateWithTencentTTS } = require('./tencent-tts-config')
      console.log('开始调用腾讯云TTS...')
      const result = await generateWithTencentTTS(text, 'zh', null)
      console.log('腾讯云TTS结果:', result ? '成功' : '失败')
      if (result) {
        console.log('音频URL类型:', result.audioUrl ? result.audioUrl.substring(0, 20) + '...' : 'null')
      }
      return {
        success: true,
        hasConfig,
        sdkAvailable,
        tencentResult: result ? '成功' : '失败',
        message: '腾讯云TTS测试完成'
      }
    } catch (e) {
      console.error('腾讯云TTS错误:', e.message)
      return {
        success: false,
        hasConfig,
        sdkAvailable,
        error: e.message
      }
    }
  }
  
  return {
    success: false,
    hasConfig,
    sdkAvailable,
    message: '配置或SDK不可用'
  }
}