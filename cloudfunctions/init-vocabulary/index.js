// 云函数：初始化N2词汇数据库
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891',
  traceUser: true
})

const db = cloud.database()
const collection = db.collection('n2_vocabulary')

// N2核心词汇数据（完整版，30个核心单词）
const n2VocabularyData = [
  {
    word: '影響',
    kana: 'えいきょう',
    romaji: 'eikyou',
    meaning: '影响',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '悪い影響を与える。', cn: '产生不良影响。' }
    ],
    tags: ['因果关系'],
    random: Math.random()
  },
  {
    word: '解決',
    kana: 'かいけつ',
    romaji: 'kaiketsu',
    meaning: '解决',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '問題を解決する。', cn: '解决问题。' }
    ],
    tags: ['问题处理'],
    random: Math.random()
  },
  {
    word: '経験',
    kana: 'けいけん',
    romaji: 'keiken',
    meaning: '经验',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '貴重な経験をした。', cn: '获得了宝贵的经验。' }
    ],
    tags: ['人生体验'],
    random: Math.random()
  },
  {
    word: '相談',
    kana: 'そうだん',
    romaji: 'soudan',
    meaning: '商量，咨询',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '友達に相談する。', cn: '和朋友商量。' }
    ],
    tags: ['沟通交流'],
    random: Math.random()
  },
  {
    word: '準備',
    kana: 'じゅんび',
    romaji: 'junbi',
    meaning: '准备',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '試験の準備をする。', cn: '做考试的准备。' }
    ],
    tags: ['计划安排'],
    random: Math.random()
  },
  {
    word: '安全',
    kana: 'あんぜん',
    romaji: 'anzen',
    meaning: '安全',
    type: '名词・形容動詞',
    level: 'N2',
    examples: [
      { jp: '安全運転を心がける。', cn: '注意安全驾驶。' }
    ],
    tags: ['安全保障'],
    random: Math.random()
  },
  {
    word: '工夫',
    kana: 'くふう',
    romaji: 'kufuu',
    meaning: '下功夫，想办法',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '料理を工夫する。', cn: '在料理上下功夫。' }
    ],
    tags: ['创新改进'],
    random: Math.random()
  },
  {
    word: '印象',
    kana: 'いんしょう',
    romaji: 'inshou',
    meaning: '印象',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '良い印象を与える。', cn: '给人良好的印象。' }
    ],
    tags: ['感受评价'],
    random: Math.random()
  },
  {
    word: '改善',
    kana: 'かいぜん',
    romaji: 'kaizen',
    meaning: '改善',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '状況を改善する。', cn: '改善状况。' }
    ],
    tags: ['改进提升'],
    random: Math.random()
  },
  {
    word: '協力',
    kana: 'きょうりょく',
    romaji: 'kyouryoku',
    meaning: '协作，合作',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: 'チームで協力する。', cn: '团队合作。' }
    ],
    tags: ['团队合作'],
    random: Math.random()
  },
  {
    word: '効果',
    kana: 'こうか',
    romaji: 'kouka',
    meaning: '效果',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '薬の効果が現れた。', cn: '药物的效果显现了。' }
    ],
    tags: ['结果成效'],
    random: Math.random()
  },
  {
    word: '成功',
    kana: 'せいこう',
    romaji: 'seikou',
    meaning: '成功',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: 'プロジェクトが成功した。', cn: '项目成功了。' }
    ],
    tags: ['成就目标'],
    random: Math.random()
  },
  {
    word: '努力',
    kana: 'どりょく',
    romaji: 'doryoku',
    meaning: '努力',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '目標に向かって努力する。', cn: '朝着目标努力。' }
    ],
    tags: ['奋斗拼搏'],
    random: Math.random()
  },
  {
    word: '批判',
    kana: 'ひはん',
    romaji: 'hihan',
    meaning: '批判',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '政策を批判する。', cn: '批判政策。' }
    ],
    tags: ['评价观点'],
    random: Math.random()
  },
  {
    word: '複雑',
    kana: 'ふくざつ',
    romaji: 'fukuzatsu',
    meaning: '复杂',
    type: '形容動詞',
    level: 'N2',
    examples: [
      { jp: '複雑な問題だ。', cn: '这是个复杂的问题。' }
    ],
    tags: ['复杂程度'],
    random: Math.random()
  },
  {
    word: '普通',
    kana: 'ふつう',
    romaji: 'futsuu',
    meaning: '普通，一般',
    type: '形容動詞',
    level: 'N2',
    examples: [
      { jp: '普通の生活を送る。', cn: '过普通的生活。' }
    ],
    tags: ['程度状态'],
    random: Math.random()
  },
  {
    word: '必要',
    kana: 'ひつよう',
    romaji: 'hitsuyou',
    meaning: '必要',
    type: '形容動詞',
    level: 'N2',
    examples: [
      { jp: '休息が必要だ。', cn: '需要休息。' }
    ],
    tags: ['需求必需'],
    random: Math.random()
  },
  {
    word: '完成',
    kana: 'かんせい',
    romaji: 'kansei',
    meaning: '完成',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '作品が完成した。', cn: '作品完成了。' }
    ],
    tags: ['完结达成'],
    random: Math.random()
  },
  {
    word: '理解',
    kana: 'りかい',
    romaji: 'rikai',
    meaning: '理解',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '相手の気持ちを理解する。', cn: '理解对方的心情。' }
    ],
    tags: ['认知理解'],
    random: Math.random()
  },
  {
    word: '関係',
    kana: 'かんけい',
    romaji: 'kankei',
    meaning: '关系',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '友好な関係を保つ。', cn: '保持友好关系。' }
    ],
    tags: ['人际关系'],
    random: Math.random()
  },
  {
    word: '注意',
    kana: 'ちゅうい',
    romaji: 'chuui',
    meaning: '注意',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '交通事故に注意する。', cn: '注意交通事故。' }
    ],
    tags: ['警示提醒'],
    random: Math.random()
  },
  {
    word: '説明',
    kana: 'せつめい',
    romaji: 'setsumei',
    meaning: '说明',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '詳しく説明する。', cn: '详细说明。' }
    ],
    tags: ['解释阐述'],
    random: Math.random()
  },
  {
    word: '感動',
    kana: 'かんどう',
    romaji: 'kandou',
    meaning: '感动',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '映画に感動した。', cn: '被电影感动了。' }
    ],
    tags: ['情感体验'],
    random: Math.random()
  },
  {
    word: '技術',
    kana: 'ぎじゅつ',
    romaji: 'gijutsu',
    meaning: '技术',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '新しい技術を学ぶ。', cn: '学习新技术。' }
    ],
    tags: ['科技技能'],
    random: Math.random()
  },
  {
    word: '文化',
    kana: 'ぶんか',
    romaji: 'bunka',
    meaning: '文化',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '日本の文化を学ぶ。', cn: '学习日本文化。' }
    ],
    tags: ['文化知识'],
    random: Math.random()
  },
  {
    word: '自然',
    kana: 'しぜん',
    romaji: 'shizen',
    meaning: '自然',
    type: '名词・形容動詞',
    level: 'N2',
    examples: [
      { jp: '自然を大切にする。', cn: '珍惜自然。' }
    ],
    tags: ['自然环境'],
    random: Math.random()
  },
  {
    word: '社会',
    kana: 'しゃかい',
    romaji: 'shakai',
    meaning: '社会',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '社会問題について考える。', cn: '思考社会问题。' }
    ],
    tags: ['社会制度'],
    random: Math.random()
  },
  {
    word: '政治',
    kana: 'せいじ',
    romaji: 'seiji',
    meaning: '政治',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '政治に興味がある。', cn: '对政治感兴趣。' }
    ],
    tags: ['政治制度'],
    random: Math.random()
  },
  {
    word: '経済',
    kana: 'けいざい',
    romaji: 'keizai',
    meaning: '经济',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '経済状況が改善した。', cn: '经济状况改善了。' }
    ],
    tags: ['经济状况'],
    random: Math.random()
  },
  {
    word: '教育',
    kana: 'きょういく',
    romaji: 'kyouiku',
    meaning: '教育',
    type: '名词・動詞',
    level: 'N2',
    examples: [
      { jp: '子どもの教育を重視する。', cn: '重视孩子的教育。' }
    ],
    tags: ['教育培养'],
    random: Math.random()
  },
  {
    word: '健康',
    kana: 'けんこう',
    romaji: 'kenkou',
    meaning: '健康',
    type: '名词・形容動詞',
    level: 'N2',
    examples: [
      { jp: '健康に気をつける。', cn: '注意健康。' }
    ],
    tags: ['身体健康'],
    random: Math.random()
  }
]

// 云函数入口函数
exports.main = async (event, context) => {
  const { action = 'init', batchSize = 10, offset = 0 } = event
  
  // console.log('执行操作:', action, '批次大小:', batchSize, '偏移量:', offset)
  
  try {
    if (action === 'init') {
      // 初始化词汇表（支持分批处理）
      // console.log('开始初始化N2词汇数据...')
      
      // 如果指定了偏移量，则进行分批处理
      const dataToInsert = offset > 0 
        ? n2VocabularyData.slice(offset, offset + batchSize)
        : n2VocabularyData.slice(0, batchSize)
      
      // console.log(`处理第 ${offset + 1} 到 ${offset + dataToInsert.length} 条数据`)
      
      let successCount = 0
      let failCount = 0
      const failedWords = []
      
      // 准备批量数据
      const batchData = dataToInsert.map(word => ({
        ...word,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }))
      
      // 分批批量插入，每批5个
      const chunkSize = 5
      for (let i = 0; i < batchData.length; i += chunkSize) {
        const chunk = batchData.slice(i, i + chunkSize)
        try {
          // 使用Promise.all并发插入
          const promises = chunk.map(data => 
            collection.add({ data }).catch(err => {
              failCount++
              failedWords.push(data.word)
              console.error(`插入失败 ${data.word}:`, err.message)
              return null
            })
          )
          
          const results = await Promise.all(promises)
          successCount += results.filter(r => r !== null).length
        } catch (err) {
          console.error('批量插入出错:', err.message)
          failCount += chunk.length
        }
      }
      
      const hasMore = offset + batchSize < n2VocabularyData.length
      
      // console.log(`本批次完成: 成功 ${successCount} 条, 失败 ${failCount} 条`)
      
      return {
        success: true,
        message: `本批次成功初始化 ${successCount} 条N2词汇`,
        successCount,
        failCount,
        failedWords,
        hasMore,
        nextOffset: hasMore ? offset + batchSize : null,
        total: n2VocabularyData.length,
        processed: offset + dataToInsert.length
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