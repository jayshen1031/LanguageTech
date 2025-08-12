// 云函数：修复词汇数据中的假名字段
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

// 假名映射表
const kanaMap = {
  '私': 'わたし',
  '学生': 'がくせい',
  '今日': 'きょう',
  '良い': 'よい',
  '天気': 'てんき',
  '時間': 'じかん',
  '友達': 'ともだち',
  '本': 'ほん',
  '日本': 'にほん',
  '語': 'ご',
  '先生': 'せんせい',
  '学校': 'がっこう',
  '勉強': 'べんきょう',
  '日本語': 'にほんご',
  '英語': 'えいご',
  '中国語': 'ちゅうごくご',
  '言葉': 'ことば',
  '文法': 'ぶんぽう',
  '練習': 'れんしゅう',
  '会話': 'かいわ'
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action = 'check' } = event
  
  try {
    if (action === 'check') {
      // 检查有问题的数据
      const res = await db.collection('n2_vocabulary')
        .where({
          source: 'history'
        })
        .limit(20)
        .get()
      
      const problems = []
      res.data.forEach(item => {
        if (item.kana === item.romaji) {
          problems.push({
            id: item._id,
            word: item.word,
            currentKana: item.kana,
            romaji: item.romaji,
            suggestedKana: kanaMap[item.word] || item.word
          })
        }
      })
      
      return {
        success: true,
        total: res.data.length,
        problemCount: problems.length,
        problems: problems
      }
    } else if (action === 'fix') {
      // 修复数据
      const res = await db.collection('n2_vocabulary')
        .where({
          source: 'history'
        })
        .get()
      
      let fixedCount = 0
      const updates = []
      
      for (const item of res.data) {
        if (item.kana === item.romaji) {
          const newKana = kanaMap[item.word] || item.word
          try {
            await db.collection('n2_vocabulary').doc(item._id).update({
              data: {
                kana: newKana
              }
            })
            fixedCount++
            updates.push({
              word: item.word,
              oldKana: item.kana,
              newKana: newKana
            })
          } catch (err) {
            console.error('更新失败:', item.word, err)
          }
        }
      }
      
      return {
        success: true,
        totalChecked: res.data.length,
        fixedCount: fixedCount,
        updates: updates
      }
    }
    
  } catch (error) {
    console.error('云函数执行失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}