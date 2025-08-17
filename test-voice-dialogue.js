// 语音对话功能测试脚本
// 运行方式：在微信开发者工具中执行

const app = getApp()

// 测试配置
const TEST_CONFIG = {
  // 测试文本
  testTexts: {
    ja: 'こんにちは、元気ですか？',
    en: 'Hello, how are you today?',
    zh: '你好，今天天气真好'
  },
  
  // 测试场景
  testScenes: ['日常对话', '购物', '餐厅'],
  
  // 测试语言
  testLanguages: ['ja', 'en']
}

// 测试结果记录
const testResults = {
  asr: { passed: 0, failed: 0, errors: [] },
  tts: { passed: 0, failed: 0, errors: [] },
  ai: { passed: 0, failed: 0, errors: [] },
  flow: { passed: 0, failed: 0, errors: [] }
}

// 测试ASR服务
async function testASRService() {
  console.log('🎯 开始测试ASR服务...')
  
  try {
    // 模拟录音文件上传
    const testFileID = 'cloud://cloud1-2g49srond2b01891.test/voice_test.mp3'
    
    const result = await wx.cloud.callFunction({
      name: 'asr-service',
      data: {
        fileID: testFileID,
        format: 'mp3',
        lang: 'ja'
      }
    })
    
    if (result.result && result.result.success) {
      testResults.asr.passed++
      console.log('✅ ASR测试通过:', result.result.text)
    } else {
      testResults.asr.failed++
      testResults.asr.errors.push(result.result?.error || '未知错误')
      console.error('❌ ASR测试失败:', result.result?.error)
    }
  } catch (error) {
    testResults.asr.failed++
    testResults.asr.errors.push(error.message)
    console.error('❌ ASR服务异常:', error)
  }
}

// 测试TTS服务
async function testTTSService() {
  console.log('🎯 开始测试TTS服务...')
  
  for (const lang in TEST_CONFIG.testTexts) {
    const text = TEST_CONFIG.testTexts[lang]
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'tts-service',
        data: {
          text: text,
          lang: lang
        }
      })
      
      if (result.result && result.result.success) {
        testResults.tts.passed++
        console.log(`✅ TTS测试通过 (${lang}):`, result.result.audioUrl ? '音频URL生成成功' : '无音频')
        
        // 测试音频播放
        if (result.result.audioUrl) {
          await testAudioPlayback(result.result.audioUrl)
        }
      } else {
        testResults.tts.failed++
        testResults.tts.errors.push(`${lang}: ${result.result?.error || '未知错误'}`)
        console.error(`❌ TTS测试失败 (${lang}):`, result.result?.error)
      }
    } catch (error) {
      testResults.tts.failed++
      testResults.tts.errors.push(`${lang}: ${error.message}`)
      console.error(`❌ TTS服务异常 (${lang}):`, error)
    }
  }
}

// 测试音频播放
async function testAudioPlayback(audioUrl) {
  return new Promise((resolve) => {
    const audioContext = wx.createInnerAudioContext()
    
    audioContext.src = audioUrl
    
    audioContext.onCanplay(() => {
      console.log('🔊 音频可以播放')
      audioContext.play()
    })
    
    audioContext.onPlay(() => {
      console.log('▶️ 音频开始播放')
    })
    
    audioContext.onEnded(() => {
      console.log('⏹️ 音频播放结束')
      audioContext.destroy()
      resolve(true)
    })
    
    audioContext.onError((err) => {
      console.error('❌ 音频播放错误:', err)
      audioContext.destroy()
      resolve(false)
    })
    
    // 5秒后强制结束
    setTimeout(() => {
      audioContext.destroy()
      resolve(true)
    }, 5000)
  })
}

// 测试AI对话
async function testAIService() {
  console.log('🎯 开始测试AI服务...')
  
  const testPrompts = [
    '你好，今天天气怎么样？',
    'How can I improve my Japanese?',
    'レストランで注文する時の日本語を教えてください'
  ]
  
  for (const prompt of testPrompts) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'azure-gpt4o-simple',
        data: { prompt: prompt }
      })
      
      if (result.result && result.result.success) {
        testResults.ai.passed++
        console.log('✅ AI测试通过:', prompt)
        console.log('   回复:', result.result.content.substring(0, 50) + '...')
      } else {
        testResults.ai.failed++
        testResults.ai.errors.push(result.result?.error || '未知错误')
        console.error('❌ AI测试失败:', result.result?.error)
      }
    } catch (error) {
      testResults.ai.failed++
      testResults.ai.errors.push(error.message)
      console.error('❌ AI服务异常:', error)
    }
  }
}

// 测试完整对话流程
async function testCompleteFlow() {
  console.log('🎯 开始测试完整对话流程...')
  
  const voiceService = require('./utils/voiceService.js')
  const aiService = require('./utils/ai.js')
  
  try {
    // 1. 初始化语音服务
    const initResult = await voiceService.init()
    if (!initResult) {
      throw new Error('语音服务初始化失败')
    }
    console.log('✅ 语音服务初始化成功')
    
    // 2. 测试TTS（文字转语音）
    const ttsResult = await voiceService.textToSpeech('こんにちは', { lang: 'ja' })
    if (!ttsResult.success) {
      throw new Error('TTS转换失败')
    }
    console.log('✅ TTS转换成功')
    
    // 3. 测试AI对话
    const aiResponse = await aiService.sendMessage('你好，请用日语回复我')
    if (!aiResponse) {
      throw new Error('AI回复失败')
    }
    console.log('✅ AI回复成功:', aiResponse)
    
    // 4. 将AI回复转为语音
    const aiTtsResult = await voiceService.textToSpeech(aiResponse, { lang: 'ja' })
    if (!aiTtsResult.success) {
      throw new Error('AI回复TTS转换失败')
    }
    console.log('✅ 完整流程测试通过')
    
    testResults.flow.passed++
    
  } catch (error) {
    testResults.flow.failed++
    testResults.flow.errors.push(error.message)
    console.error('❌ 完整流程测试失败:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始语音对话功能测试')
  console.log('================================')
  
  // 依次运行测试
  await testTTSService()
  console.log('--------------------------------')
  
  await testAIService()
  console.log('--------------------------------')
  
  await testCompleteFlow()
  console.log('--------------------------------')
  
  // 输出测试报告
  console.log('📊 测试报告')
  console.log('================================')
  console.log('TTS服务:', `通过 ${testResults.tts.passed}，失败 ${testResults.tts.failed}`)
  if (testResults.tts.errors.length > 0) {
    console.log('  错误:', testResults.tts.errors)
  }
  
  console.log('AI服务:', `通过 ${testResults.ai.passed}，失败 ${testResults.ai.failed}`)
  if (testResults.ai.errors.length > 0) {
    console.log('  错误:', testResults.ai.errors)
  }
  
  console.log('完整流程:', `通过 ${testResults.flow.passed}，失败 ${testResults.flow.failed}`)
  if (testResults.flow.errors.length > 0) {
    console.log('  错误:', testResults.flow.errors)
  }
  
  const totalPassed = testResults.tts.passed + testResults.ai.passed + testResults.flow.passed
  const totalFailed = testResults.tts.failed + testResults.ai.failed + testResults.flow.failed
  
  console.log('================================')
  console.log(`总计: 通过 ${totalPassed}，失败 ${totalFailed}`)
  
  if (totalFailed === 0) {
    console.log('🎉 所有测试通过！')
  } else {
    console.log('⚠️ 部分测试失败，请检查错误信息')
  }
}

// 导出测试函数
module.exports = {
  runAllTests,
  testASRService,
  testTTSService,
  testAIService,
  testCompleteFlow
}

// 如果直接运行此文件
if (typeof wx !== 'undefined') {
  // 在页面加载时运行测试
  Page({
    onLoad() {
      runAllTests()
    }
  })
}