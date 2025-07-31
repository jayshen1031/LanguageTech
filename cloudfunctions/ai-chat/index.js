// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  
  try {
    switch (action) {
      case 'chat':
        return await handleChat(data)
      case 'analyzeGrammar':
        return await handleGrammarAnalysis(data)
      case 'generateDialogue':
        return await handleDialogueGeneration(data)
      default:
        return {
          success: false,
          error: '未知操作'
        }
    }
  } catch (error) {
    console.error('云函数错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 处理对话请求
async function handleChat(data) {
  const { messages, options = {} } = data
  
  try {
    // 调用云开发AI接口
    const result = await cloud.openapi.nlp.chat({
      messages: messages,
      model: options.model || 'hunyuan-lite',
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2000
    })
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    // 如果云开发AI接口不可用，返回模拟数据
    console.log('AI接口调用失败，返回模拟数据')
    return {
      success: true,
      data: {
        choices: [{
          message: {
            content: '你好！我是语伴君的AI助手。由于当前AI服务正在初始化，这是一条模拟回复。请稍后再试真实的AI功能。'
          }
        }]
      }
    }
  }
}

// 处理语法分析
async function handleGrammarAnalysis(data) {
  const { sentence, language } = data
  
  const systemPrompt = language === 'ja' ? 
    '你是一位专业的日语教师。请分析给定的日语句子，提供详细的语法解释，包括词性、语法结构、动词变形等。用中文解释。' :
    '你是一位专业的英语教师。请分析给定的英语句子，提供详细的语法解释，包括词性、时态、句型结构等。用中文解释。'

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请分析这个句子的语法：${sentence}` }
  ]

  try {
    const result = await cloud.openapi.nlp.chat({
      messages: messages,
      model: 'hunyuan-lite',
      temperature: 0.3,
      max_tokens: 1500
    })
    
    return {
      success: true,
      data: result.choices[0].message.content
    }
  } catch (error) {
    // 返回模拟的语法分析
    return {
      success: true,
      data: `【模拟语法分析】\n句子：${sentence}\n\n这是一个示例语法分析。实际功能需要AI服务完全初始化后才能使用。\n\n词汇分析：\n- 每个词的词性和含义\n- 语法结构说明\n- 动词变形解释`
    }
  }
}

// 处理对话生成
async function handleDialogueGeneration(data) {
  const { scene, level, language } = data
  
  // 返回模拟的对话数据
  const mockDialogue = [
    { speaker: 'A', text: 'こんにちは', translation: '你好' },
    { speaker: 'B', text: 'こんにちは、いらっしゃいませ', translation: '你好，欢迎光临' },
    { speaker: 'A', text: 'メニューを見せてください', translation: '请给我看菜单' },
    { speaker: 'B', text: 'はい、どうぞ', translation: '好的，请看' }
  ]
  
  return {
    success: true,
    data: mockDialogue
  }
}