const axios = require('axios')

const MCP_BASE_URL = 'http://localhost:3456'

// 测试函数
async function testMCPServer() {
  console.log('开始测试 MCP 音频服务器...\n')
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...')
    const healthRes = await axios.get(`${MCP_BASE_URL}/health`)
    console.log('✓ 健康检查成功:', healthRes.data)
    console.log('')
    
    // 2. 测试获取声音列表
    console.log('2. 测试获取声音列表...')
    const voicesRes = await axios.get(`${MCP_BASE_URL}/voices`)
    console.log('✓ 声音列表获取成功:')
    console.log('  日语声音:', voicesRes.data.voices.ja.length, '个')
    console.log('  英语声音:', voicesRes.data.voices.en.length, '个')
    console.log('  中文声音:', voicesRes.data.voices.zh.length, '个')
    console.log('')
    
    // 3. 测试日语TTS
    console.log('3. 测试日语TTS...')
    const jaText = 'こんにちは、世界'
    const jaTTSRes = await axios.post(`${MCP_BASE_URL}/tts`, {
      text: jaText,
      lang: 'ja'
    })
    console.log('✓ 日语TTS成功:')
    console.log('  文本:', jaText)
    console.log('  音频URL:', jaTTSRes.data.audioUrl)
    console.log('  缓存状态:', jaTTSRes.data.cached ? '已缓存' : '新生成')
    console.log('')
    
    // 4. 测试英语TTS
    console.log('4. 测试英语TTS...')
    const enText = 'Hello, World!'
    const enTTSRes = await axios.post(`${MCP_BASE_URL}/tts`, {
      text: enText,
      lang: 'en'
    })
    console.log('✓ 英语TTS成功:')
    console.log('  文本:', enText)
    console.log('  音频URL:', enTTSRes.data.audioUrl)
    console.log('  缓存状态:', enTTSRes.data.cached ? '已缓存' : '新生成')
    console.log('')
    
    // 5. 测试批量TTS
    console.log('5. 测试批量TTS...')
    const batchItems = [
      'おはよう',
      'ありがとう',
      'さようなら'
    ]
    const batchRes = await axios.post(`${MCP_BASE_URL}/batch-tts`, {
      items: batchItems,
      lang: 'ja'
    })
    console.log('✓ 批量TTS成功:')
    batchRes.data.results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.text}: ${result.audioUrl ? '成功' : '失败'}`)
    })
    console.log('')
    
    // 6. 测试缓存
    console.log('6. 测试缓存机制...')
    const cacheTestRes = await axios.post(`${MCP_BASE_URL}/tts`, {
      text: jaText,
      lang: 'ja'
    })
    console.log('✓ 缓存测试成功:')
    console.log('  缓存状态:', cacheTestRes.data.cached ? '命中缓存' : '未命中缓存')
    console.log('')
    
    // 7. 测试自定义声音
    console.log('7. 测试自定义声音...')
    const customVoiceRes = await axios.post(`${MCP_BASE_URL}/tts`, {
      text: '测试自定义声音',
      lang: 'ja',
      voice: 'ja-JP-KeitaNeural'
    })
    console.log('✓ 自定义声音TTS成功:')
    console.log('  音频URL:', customVoiceRes.data.audioUrl)
    console.log('')
    
    console.log('✅ 所有测试通过！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
    }
  }
}

// 运行测试
console.log('请确保 MCP 服务器已启动 (npm start)')
console.log('服务器地址:', MCP_BASE_URL)
console.log('----------------------------\n')

testMCPServer()