// Azure GPT-4o 云函数
const cloud = require('wx-server-sdk')
// 延迟加载 axios，只在需要时加载
let axios = null

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// Azure OpenAI 配置
const AZURE_API_KEY = process.env.AZURE_API_KEY || ''
const AZURE_ENDPOINT = 'https://bondex.openai.azure.com'
const DEPLOYMENT_NAME = 'global-gpt-4o'
const API_VERSION = '2025-01-01-preview'

// 检查环境变量配置
console.log('Azure API Key状态:', AZURE_API_KEY ? '已配置' : '未配置')
console.log('Azure端点:', AZURE_ENDPOINT)
console.log('部署名称:', DEPLOYMENT_NAME)

if (!AZURE_API_KEY) {
  console.warn('Azure API Key未在环境变量中配置，请在云函数环境变量中设置AZURE_API_KEY')
}

// 调用 Azure OpenAI API
async function callAzureGPT4o(messages, options = {}) {
  // 延迟加载 axios
  if (!axios) {
    axios = require('axios')
  }
  
  const url = `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=${API_VERSION}`
  
  const requestBody = {
    messages: messages,
    temperature: options.temperature || 0.7,
    max_tokens: Math.min(options.maxTokens || 8000, 16384),  // 确保不超过Azure GPT-4o限制
    stream: false
  }
  
  console.log('Azure GPT-4o API 请求开始:', {
    messageCount: messages.length,
    hasImage: messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url')),
    temperature: requestBody.temperature,
    maxTokens: requestBody.max_tokens
  })
  
  try {
    const startTime = Date.now()
    const response = await axios.post(url, requestBody, {
      headers: {
        'api-key': AZURE_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 60000  // 60秒超时
    })
    
    const endTime = Date.now()
    console.log('Azure GPT-4o API 响应成功:', {
      duration: endTime - startTime,
      usage: response.data.usage,
      model: response.data.model
    })
    
    return response.data
  } catch (error) {
    console.error('Azure GPT-4o API 调用失败:')
    console.error('状态码:', error.response?.status)
    console.error('错误信息:', error.response?.data)
    console.error('请求配置:', {
      url: url,
      hasApiKey: !!AZURE_API_KEY,
      timeout: error.code === 'ECONNABORTED' ? '请求超时' : '其他错误'
    })
    throw error
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, messages, temperature, maxTokens } = event
  
  try {
    // Azure GPT-4o 云函数被调用
    
    if (!AZURE_API_KEY) {
      console.error('Azure API Key未配置')
      return {
        success: false,
        error: '请配置Azure API Key'
      }
    }
    
    switch (action) {
      case 'chat':
        // 通用对话
        const chatResult = await callAzureGPT4o(messages, {
          temperature,
          maxTokens
        })
        
        return {
          success: true,
          data: {
            content: chatResult.choices[0].message.content,
            usage: chatResult.usage,
            model: chatResult.model
          }
        }
        
      case 'grammar':
        // 日语语法分析 - 支持图片
        // 处理grammar请求
        
        let analysisMessages = []
        
        if (event.imageUrl) {
          // 处理图片模式
          console.log('开始处理图片:', event.imageUrl)
          
          try {
            // 下载图片并转换为base64
            const imageRes = await cloud.downloadFile({
              fileID: event.imageUrl
            })
            console.log('图片下载成功，大小:', imageRes.fileContent.length, '字节')
            const base64Image = imageRes.fileContent.toString('base64')
            console.log('Base64转换完成，长度:', base64Image.length)
          
            const userTitle = event.userTitle || ''
            
            // GPT-4o 支持多模态输入
          analysisMessages = [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `你是一个专业的日语教师。请识别图片中的所有日语文字，然后按照以下格式进行详细的语法解析。

【重要提醒】：
- 必须先完整识别图片中的所有文字内容，一字不漏
- 特别注意识别短句（如：しかし、そして、だから等）
- 包括标题、正文、注释、标点符号等所有可见文本
- 即使是单独一行的短句或连接词也不能遗漏

【任务】：${userTitle ? `这是一篇关于「${userTitle}」的内容。` : ''}
1. 第一步：逐行扫描图片，完整识别并提取所有日语文字
2. 第二步：自检是否有遗漏（特别是短句和连接词）
3. 第三步：将识别的文字按句子分隔，逐句进行语法分析

【输出格式要求】：
必须严格按照以下格式输出，每个部分都是必填项，不能省略：

【文章标题】${userTitle || '（根据内容生成10字以内的中文标题）'}

---
📘 第1句
【日文原文】识别出的第一个完整日语句子
【罗马音】完整的罗马音标注
【中文翻译】准确的中文翻译
【精简结构】主语+助词+宾语+动词（根据实际句子结构调整）
【句子结构分析】
• 词汇1（假名）- 词性，在句中的语法成分
• 词汇2（假名）- 词性，在句中的语法成分
• （列出句子中所有词汇的详细分析）
【语法点说明】
• 助词は：主题标记助词，表示句子的主题
• 动词ます形：敬语形式，表示礼貌
• （列出句子中所有重要语法点的详细解释）
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生
です｜desu｜是

---
📘 第2句
【日文原文】识别出的第二个完整日语句子
（按照与第1句完全相同的格式继续）

【示例输出】：
【文章标题】自我介绍

---
📘 第1句
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语+主题助词+表语+系动词
【句子结构分析】
• 私（わたし）- 人称代词，作主语
• は - 主题助词，标记主题
• 学生（がくせい）- 名词，作表语
• です - 系动词，敬语形式
【语法点说明】
• は：主题助词，读作wa不是ha，用于标记句子主题
• です：相当于中文的"是"，是だ的敬语形式
• 名词+です：基本的判断句型，表示"A是B"
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生
です｜desu｜是

---
📘 第2句
【日文原文】明日学校に行きます。
【罗马音】ashita gakkou ni ikimasu
【中文翻译】明天去学校。
【精简结构】时间词+目的地+方向助词+动词
【句子结构分析】
• 明日（あした）- 时间名词，作时间状语
• 学校（がっこう）- 名词，作目的地
• に - 方向助词，表示目的地
• 行きます（いきます）- 动词，ます形表示敬语
【语法点说明】
• に：方向助词，表示动作的目的地或方向
• ます形：动词的敬语形式，用于正式场合
【词汇明细表】
明日｜ashita｜明天
学校｜gakkou｜学校
行く｜iku｜去

请严格按照上述格式解析图片中的所有日语句子。

【特别强调】：
1. 必须逐句解析，每个句子单独一个解析块
2. 即使某些句子很短或看似简单，也必须完整解析
3. 如果图片中有10个句子，输出就必须有10个独立的解析块，用"---"分隔
4. 每个句子的【日文原文】字段只包含当前句子的内容，不包含其他句子
5. 绝对不要把多个句子的内容放在同一个解析块中
6. 每个解析块必须以"---"开头，以"📘 第X句"标记

格式示例：
---
📘 第1句
【日文原文】第一个句子
【罗马音】第一个句子的罗马音
...

---
📘 第2句
【日文原文】第二个句子
【罗马音】第二个句子的罗马音
...

每个部分都必须有内容，不能省略。确保没有遗漏任何一个句子。`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }]
          
          } catch (downloadError) {
            console.error('图片下载或处理失败:', downloadError)
            throw new Error('图片下载失败: ' + downloadError.message)
          }
        } else {
          // 纯文本分析
          analysisMessages = [{
            role: 'user',
            content: `你是一个专业的日语教师。请对以下日语文本进行详细的语法解析。

【任务】：对文本中的每个句子进行完整的语法分析，包括词汇分析、语法结构和语法点说明。

【输入文本】：${event.sentence}

【输出格式要求】：
必须严格按照以下格式输出，每个部分都是必填项，不能省略：

---
📘 第1句
【日文原文】完整的日语句子
【罗马音】完整的罗马音标注
【中文翻译】准确的中文翻译
【精简结构】主语+助词+宾语+动词（根据实际句子结构调整）
【句子结构分析】
• 词汇1（假名）- 词性，在句中的语法成分
• 词汇2（假名）- 词性，在句中的语法成分
• （列出句子中所有词汇的详细分析）
【语法点说明】
• 助词は：主题标记助词，表示句子的主题
• 动词ます形：敬语形式，表示礼貌
• （列出句子中所有重要语法点的详细解释）
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生
です｜desu｜是

---
📘 第2句
（按照与第1句完全相同的格式）

【示例输出】：
---
📘 第1句
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语+主题助词+表语+系动词
【句子结构分析】
• 私（わたし）- 人称代词，作主语
• は - 主题助词，标记主题
• 学生（がくせい）- 名词，作表语
• です - 系动词，敬语形式
【语法点说明】
• は：主题助词，读作wa不是ha，用于标记句子主题
• です：相当于中文的"是"，是だ的敬语形式
• 名词+です：基本的判断句型，表示"A是B"
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生
です｜desu｜是

【特别强调】：
1. 必须逐句解析，每个句子单独一个解析块，用"---"分隔
2. 每个句子的【日文原文】字段只包含当前句子的内容，不包含其他句子
3. 绝对不要把多个句子的内容放在同一个解析块中
4. 每个解析块必须以"---"开头，以"📘 第X句"标记
5. 【重要】不允许说"文本较长，仅解析前几句"，必须解析所有句子
6. 【重要】不允许省略任何句子，必须一次性完成全部解析
7. 【重要】即使文本很长，也必须坚持解析到最后一句
8. 【关键】每个句子的【词汇明细表】都必须填写，严格按格式：单词｜罗马音｜中文翻译
   ⚠️ 绝对不允许：日文原文｜日文原文｜词汇（这是错误格式）
   ✅ 正确示例：私｜watashi｜我
9. 【关键】词汇表必须包含句子中的所有实词（名词、动词、形容词、副词等）
10. 【关键】不允许词汇表为空，至少要有3-5个词汇
11. 【关键】只包含有实际意义的词汇，不包含助词和语法词尾
12. 【关键】确保罗马音和中文翻译都完整准确

【词汇明细表 - 绝对不允许错误】：

🔥🔥🔥 用户会暴怒的错误格式 - 绝对禁止！！！：
❌ コツコツと｜コツコツto｜词汇（包含助词と）
❌ 足音を踏み｜足音wo踏mi｜词汇（包含助词を）  
❌ 俺は俺で在｜俺ha俺de在｜词汇（包含助词は、で）
❌ り続けたい｜ri続ketai｜词汇（词汇变位）
❌ 任何包含"词汇"、"表示"、"动词"、"名词"、"助词"的行
❌ 任何复合助词形式
❌ 任何表头行

✅ 用户要求的正确格式（严格按照）：
コツコツ｜kotsu kotsu｜拟声词
アスファルト｜asufaruto｜柏油路  
刻む｜kizamu｜刻画
足音｜ashioto｜脚步声
俺｜ore｜我
愛｜ai｜爱

📋 词汇选择原则：
1. 从句子中选出独立的实词：名词、动词词干、形容词词干
2. 绝对不要助词：は、が、を、に、で、と等
3. 绝对不要复合助词：ついた、しめる、らい等
4. 绝对不要"词汇"这个词
5. 每个词汇必须有准确的罗马音和具体中文意思
6. 每句选择3-4个最重要的词汇

🔥 如果你输出错误格式，用户会非常愤怒！必须严格按照正确格式输出！

请严格按照上述格式解析所有日语句子。词汇明细表是重点，绝对不能敷衍！`
          }]
        }
        
        const grammarResult = await callAzureGPT4o(analysisMessages, {
          temperature: 0.1,  // 降低温度，提高识别稳定性和一致性
          maxTokens: 8000,  // 临时减少到8000，确保不超过限制
          topP: 0.9  // 添加topP参数，进一步控制输出的确定性
        })
        
        return {
          success: true,
          data: {
            analysis: grammarResult.choices[0].message.content
          }
        }
        
      case 'translate':
        // 翻译功能
        const translateMessages = [{
          role: 'user',
          content: `请将以下内容翻译成${event.targetLang || '中文'}：\n${event.text}`
        }]
        
        const translateResult = await callAzureGPT4o(translateMessages, {
          temperature: 0.3
        })
        
        return {
          success: true,
          data: {
            translation: translateResult.choices[0].message.content
          }
        }
        
      default:
        return {
          success: false,
          error: '不支持的操作'
        }
    }
    
  } catch (error) {
    console.error('Azure GPT-4o 处理失败:', error)
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || '调用失败'
    }
  }
}