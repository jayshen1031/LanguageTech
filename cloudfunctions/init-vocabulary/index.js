// 云函数：初始化N2词汇数据库
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891',
  traceUser: true
})

const db = cloud.database()
const collection = db.collection('n2_vocabulary')

// N2核心词汇数据（简化版，先导入5个测试）
const n2VocabularyData = [
  {
    word: '影響',
    kana: 'えいきょう',
    romaji: 'eikyou',
    meaning: '影响',
    type: '名词',
    examples: [
      { jp: '悪い影響を与える。', cn: '产生不良影响。' },
      { jp: '影響を受ける。', cn: '受到影响。' }
    ],
    level: 'N2',
    tags: ['因果'],
    random: Math.random()
  },
  {
    word: '解決',
    kana: 'かいけつ',
    romaji: 'kaiketsu',
    meaning: '解决',
    type: '名词',
    examples: [
      { jp: '問題を解決する。', cn: '解决问题。' },
      { jp: '円満解決。', cn: '圆满解决。' }
    ],
    level: 'N2',
    tags: ['处理'],
    random: Math.random()
  },
  {
    word: '環境',
    kana: 'かんきょう',
    romaji: 'kankyou',
    meaning: '环境',
    type: '名词',
    examples: [
      { jp: '環境問題。', cn: '环境问题。' },
      { jp: '職場環境。', cn: '工作环境。' }
    ],
    level: 'N2',
    tags: ['社会'],
    random: Math.random()
  },
  {
    word: '努力',
    kana: 'どりょく',
    romaji: 'doryoku',
    meaning: '努力',
    type: '名词',
    examples: [
      { jp: '努力する。', cn: '努力。' },
      { jp: '努力の成果。', cn: '努力的成果。' }
    ],
    level: 'N2',
    tags: ['态度'],
    random: Math.random()
  },
  {
    word: '判断',
    kana: 'はんだん',
    romaji: 'handan',
    meaning: '判断',
    type: '名词',
    examples: [
      { jp: '正しい判断。', cn: '正确的判断。' },
      { jp: '判断力。', cn: '判断力。' }
    ],
    level: 'N2',
    tags: ['思考'],
    random: Math.random()
  }
]

// 云函数入口函数
exports.main = async (event, context) => {
  const { action = 'init' } = event
  
  console.log('执行操作:', action)
  
  try {
    if (action === 'init') {
      // 初始化词汇表
      console.log('开始初始化N2词汇数据...')
      console.log('待插入词汇数量:', n2VocabularyData.length)
      
      let successCount = 0
      let failCount = 0
      
      // 逐个插入，便于调试
      for (let i = 0; i < n2VocabularyData.length; i++) {
        const word = n2VocabularyData[i]
        try {
          await collection.add({
            data: {
              ...word,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
          successCount++
          console.log(`成功插入第 ${i + 1} 个词汇: ${word.word}`)
        } catch (err) {
          failCount++
          console.error(`插入失败 ${word.word}:`, err)
        }
      }
      
      console.log(`初始化完成: 成功 ${successCount} 条, 失败 ${failCount} 条`)
      
      return {
        success: true,
        message: `成功初始化 ${successCount} 条N2词汇`,
        total: successCount,
        failed: failCount
      }
      
    } else if (action === 'updateRandom') {
      // 更新随机字段（用于随机排序）
      const res = await collection.where({
        level: 'N2'
      }).update({
        data: {
          random: Math.random(),
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '随机字段更新成功',
        updated: res.stats.updated
      }
    } else if (action === 'count') {
      // 统计词汇数量
      const countResult = await collection.count()
      
      return {
        success: true,
        total: countResult.total
      }
    }
    
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
}