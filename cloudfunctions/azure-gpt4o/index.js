// Azure GPT-4o 云函数
const cloud = require('wx-server-sdk')
// 延迟加载 axios，只在需要时加载
let axios = null

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// Azure OpenAI 配置
let AZURE_API_KEY = process.env.AZURE_API_KEY || ''
const AZURE_ENDPOINT = 'https://bondex.openai.azure.com'
const DEPLOYMENT_NAME = 'global-gpt-4o'
const API_VERSION = '2025-01-01-preview'

// 尝试从本地配置文件读取（仅开发环境）
try {
  const config = require('./config.js')
  AZURE_API_KEY = AZURE_API_KEY || config.AZURE_API_KEY
} catch (e) {
  console.log('配置文件不存在，请设置环境变量或创建config.js')
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
    max_tokens: options.maxTokens || 16000,  // 增加默认值以支持长文本
    stream: false
  }
  
  console.log('Azure GPT-4o API 请求URL:', url)
  console.log('请求参数:', JSON.stringify(requestBody, null, 2))
  
  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'api-key': AZURE_API_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Azure GPT-4o API 响应成功')
    return response.data
  } catch (error) {
    console.error('Azure GPT-4o API 调用失败:')
    console.error('状态码:', error.response?.status)
    console.error('错误信息:', error.response?.data)
    throw error
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, messages, temperature, maxTokens } = event
  
  try {
    console.log('Azure GPT-4o 云函数被调用，action:', action)
    
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
        console.log('处理grammar请求，参数:', { 
          sentence: event.sentence, 
          imageUrl: event.imageUrl 
        })
        
        let analysisMessages = []
        
        if (event.imageUrl) {
          console.log('处理图片模式，下载图片:', event.imageUrl)
          // 下载图片并转换为base64
          const imageRes = await cloud.downloadFile({
            fileID: event.imageUrl
          })
          console.log('图片下载成功，大小:', imageRes.fileContent.length)
          const base64Image = imageRes.fileContent.toString('base64')
          
          // GPT-4o 支持多模态输入
          analysisMessages = [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `这个 GPT 虚拟员工专精于日语内容解析任务，能够根据用户上传的图片（含日语文本）或提供的日语对话内容，结构化提取句子信息、提供罗马音、中文翻译、语法讲解及句子成分分析。

请先识别图片中的所有日语文字，然后将其逐句进行结构化解析。

【重要指令】：
1. 必须识别并解析图片中的所有句子/行，一个都不能遗漏
2. 即使有很多行也要全部解析完成
3. 如果有句号(。)、感叹号(！)、问号(？)则按这些标点划分；如果没有，则按换行符划分，每一行都是一个独立的句子
4. 输出时请保持完整，不要中途停止
5. 绝对不要在输出中包含任何"文本太长"、"确认继续"、"是否继续"等提示性文字
6. 直接输出所有解析结果，不要询问用户
7. 特别注意：日文歌词通常每行都是独立的句子，请逐行解析

输出格式请使用"紧凑型卡片式样"，要求包含以下模块内容，不要省略，也不要压缩简写：

1. 日文原文  
2. 罗马音  
3. 中文翻译  
4. 精简句子结构（将主要结构抽象总结输出，不要具体句子内容，只要抽象的部分，例如：主语 + 谓语 + 宾语，若有其他成分请补齐）  
5. 句子结构分析（每句成分逐条列出）  
6. 语法点说明（**保持完整详细**，包括助词、动词原形、变形说明、句型结构，不能简写）  
7. 词汇明细表：每个词单独列出，包含【日文｜罗马音｜中文翻译】

格式请使用如下样式（参考）：

---
📘 第1句  
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语 + 主题助词 + 表语 + 系动词
【句子结构分析】
• 私（わたし）- 主语，第一人称代词
• は - 主题助词，标记主题
• 学生（がくせい）- 表语，名词
• です - 系动词，表示“是”的敬语形式
【语法点说明】
• は：主题助词，用于标记句子的主题，读作“wa”
• です：系动词，名词句的敬语形式，相当于“だ”的敬语
• 名词+です：表示“是...”的基本句型
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生

请保持所有格式结构一致，语法说明不要精简。适合用于日语学习笔记排版。

重要：请一次性输出所有句子的完整解析，不管文本有多长。不要询问是否继续，不要分批输出，不要省略任何句子。请直接输出全部内容。`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }]
        } else {
          // 纯文本分析
          analysisMessages = [{
            role: 'user',
            content: `这个 GPT 虚拟员工专精于日语内容解析任务，能够根据用户上传的图片（含日语文本）或提供的日语对话内容，结构化提取句子信息、提供罗马音、中文翻译、语法讲解及句子成分分析。适用于日语学习者、翻译从业者、语言研究者等场景，助力提升对日语文本的深入理解与语言能力。

请将我输入的文本逐句进行结构化解析，输出格式请使用“紧凑型卡片式样”，要求包含以下模块内容，不要省略，也不要压缩简写：

1. 日文原文  
2. 罗马音  
3. 中文翻译  
4. 精简句子结构（将主要结构抽象总结输出，不要具体句子内容，只要抽象的部分，例如：主语 + 谓语 + 宾语，若有其他成分请补齐）  
5. 句子结构分析（每句成分逐条列出）  
6. 语法点说明（**保持完整详细**，包括助词、动词原形、变形说明、句型结构，不能简写）  
7. 词汇明细表：每个词单独列出，包含【日文｜罗马音｜中文翻译】

输入文本：${event.sentence}

格式请使用如下样式（参考）：

---
📘 第1句  
【日文原文】私は学生です。
【罗马音】watashi wa gakusei desu
【中文翻译】我是学生。
【精简结构】主语 + 主题助词 + 表语 + 系动词
【句子结构分析】
• 私（わたし）- 主语，第一人称代词
• は - 主题助词，标记主题
• 学生（がくせい）- 表语，名词
• です - 系动词，表示“是”的敬语形式
【语法点说明】
• は：主题助词，用于标记句子的主题，读作“wa”
• です：系动词，名词句的敬语形式，相当于“だ”的敬语
• 名词+です：表示“是...”的基本句型
【词汇明细表】
私｜watashi｜我
学生｜gakusei｜学生

请保持所有格式结构一致，语法说明不要精简。适合用于日语学习笔记排版。

重要：请一次性输出所有句子的完整解析，不管文本有多长。不要询问是否继续，不要分批输出，不要省略任何句子。请直接输出全部内容。`
          }]
        }
        
        const grammarResult = await callAzureGPT4o(analysisMessages, {
          temperature: 0.3,
          maxTokens: 16000  // 大幅增加token限制确保完整输出
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