/**
 * 测试完整的日语词形变化覆盖度
 * 验证是否包含了所有基本的词形变化类型
 */

// 这个函数将在小程序开发者工具的控制台中运行
function testCompleteInflection() {
  console.log('🧪 测试完整的日语词形变化覆盖度...')
  
  // 定义所有基本词形变化类型的测试用例
  const inflectionTests = [
    {
      category: '动词基本活用',
      sentences: [
        { text: '私は毎日勉強します。', expected: ['する → します（不规则动词，原形→现在敬语形）'] },
        { text: '昨日映画を見ました。', expected: ['見る → 見ました（一段动词，原形→过去敬语形）'] },
        { text: '明日学校に行く。', expected: ['行く（五段动词，原形）'] },
        { text: '今本を読んでいます。', expected: ['読む → 読んでいます（五段动词，原形→现在进行形）'] }
      ]
    },
    {
      category: '动词否定变化',
      sentences: [
        { text: '今日は来ない。', expected: ['来る → 来ない（不规则动词，原形→否定形）'] },
        { text: '彼は食べません。', expected: ['食べる → 食べません（一段动词，原形→否定敬语形）'] }
      ]
    },
    {
      category: '动词可能・被动・使役',
      sentences: [
        { text: '日本語が話せます。', expected: ['話す → 話せます（五段动词，原形→可能敬语形）'] },
        { text: '先生に呼ばれました。', expected: ['呼ぶ → 呼ばれました（五段动词，原形→被动过去敬语形）'] },
        { text: '子供を遊ばせる。', expected: ['遊ぶ → 遊ばせる（五段动词，原形→使役形）'] }
      ]
    },
    {
      category: '动词条件・意志・推量',
      sentences: [
        { text: '雨が降れば帰ります。', expected: ['降る → 降れば（五段动词，原形→条件形）'] },
        { text: '一緒に行こう。', expected: ['行く → 行こう（五段动词，原形→意志形）'] },
        { text: '明日晴れるでしょう。', expected: ['晴れる → 晴れるでしょう（一段动词+推量助动词）'] }
      ]
    },
    {
      category: 'い形容词活用',
      sentences: [
        { text: '今日は暑くない。', expected: ['暑い → 暑くない（い形容词，原形→否定形）'] },
        { text: '昨日は寒かった。', expected: ['寒い → 寒かった（い形容词，原形→过去形）'] },
        { text: '早く走る。', expected: ['早い → 早く（い形容词，原形→副词形）'] }
      ]
    },
    {
      category: 'な形容词活用',
      sentences: [
        { text: '部屋が静かです。', expected: ['静か（な形容词+判断助动词敬语形）'] },
        { text: '静かに歩く。', expected: ['静か → 静かに（な形容词，原形→副词形）'] },
        { text: '昨日は元気だった。', expected: ['元気 → 元気だった（な形容词+判断助动词过去形）'] }
      ]
    },
    {
      category: '名词格变化',
      sentences: [
        { text: '学生が勉強する。', expected: ['学生 + が（名词+主格助词）'] },
        { text: '本を読む。', expected: ['本 + を（名词+宾格助词）'] },
        { text: '友達と話す。', expected: ['友達 + と（名词+共格助词）'] },
        { text: '学校で勉強する。', expected: ['学校 + で（名词+具格助词）'] },
        { text: '家から駅まで。', expected: ['家 + から（名词+起点格）', '駅 + まで（名词+终点格）'] }
      ]
    },
    {
      category: '敬语变化',
      sentences: [
        { text: '先生がいらっしゃいます。', expected: ['いらっしゃる（尊敬语）'] },
        { text: '私が参ります。', expected: ['参る → 参ります（谦让语）'] },
        { text: '田中さんが言われました。', expected: ['言う → 言われました（尊敬语被动形）'] }
      ]
    },
    {
      category: '助动词变化',
      sentences: [
        { text: '学生です。', expected: ['だ → です（判断助动词，普通形→敬语形）'] },
        { text: '雨でしょう。', expected: ['だろう → でしょう（推量助动词敬语形）'] },
        { text: '来るようです。', expected: ['ようだ（样态助动词）'] }
      ]
    }
  ]
  
  console.log('📋 将测试以下词形变化类型:')
  inflectionTests.forEach((category, index) => {
    console.log(`   ${index + 1}. ${category.category} (${category.sentences.length}个测试句子)`)
  })
  
  // 随机选择一个类别进行测试
  const randomCategory = inflectionTests[Math.floor(Math.random() * inflectionTests.length)]
  const randomSentence = randomCategory.sentences[Math.floor(Math.random() * randomCategory.sentences.length)]
  
  console.log(`\n🎯 测试类别: ${randomCategory.category}`)
  console.log(`🎯 测试句子: ${randomSentence.text}`)
  console.log(`📋 期待变化: ${randomSentence.expected.join(', ')}`)
  
  // 调用AI解析
  wx.cloud.callFunction({
    name: 'azure-gpt4o',
    data: {
      sentence: randomSentence.text
    }
  }).then(result => {
    if (result.result.success) {
      const analysisText = result.result.data.analysis
      console.log('📋 AI完整解析结果:')
      console.log(analysisText)
      
      // 提取词形变化详解
      const inflectionMatch = analysisText.match(/【词形变化详解】\s*(.*?)(?=【词汇明细表】|$)/s)
      
      if (inflectionMatch) {
        const inflectionContent = inflectionMatch[1].trim()
        console.log('\n📊 词形变化详解内容:')
        console.log(inflectionContent)
        
        // 检查基本变化类型覆盖度
        const coverageCheck = checkInflectionCoverage(inflectionContent)
        
        // 检查期待的具体变化
        let matchCount = 0
        randomSentence.expected.forEach(expectedItem => {
          const baseWord = expectedItem.split(' ')[0].split('→')[0]
          const found = inflectionContent.includes(baseWord)
          console.log(`   ${found ? '✅' : '❌'} ${expectedItem}: ${found ? '已包含' : '未找到'}`)
          if (found) matchCount++
        })
        
        const matchRate = Math.round((matchCount / randomSentence.expected.length) * 100)
        const coverageRate = Math.round((coverageCheck.found / coverageCheck.total) * 100)
        
        console.log(`\n📊 测试结果:`)
        console.log(`   期待变化匹配率: ${matchRate}% (${matchCount}/${randomSentence.expected.length})`)
        console.log(`   基本变化覆盖率: ${coverageRate}% (${coverageCheck.found}/${coverageCheck.total})`)
        console.log(`   覆盖的变化类型: ${coverageCheck.foundTypes.join(', ')}`)
        console.log(`   缺失的变化类型: ${coverageCheck.missingTypes.join(', ')}`)
        
        // 显示结果
        wx.showModal({
          title: '完整词形变化测试',
          content: `测试类别: ${randomCategory.category}\n\n匹配率: ${matchRate}%\n覆盖率: ${coverageRate}%\n\n${matchRate >= 70 && coverageRate >= 60 ? '✅ 基本通过' : '⚠️ 需要改进'}\n\n已覆盖: ${coverageCheck.foundTypes.slice(0,3).join(', ')}${coverageCheck.foundTypes.length > 3 ? '等' : ''}`,
          showCancel: false,
          confirmText: '查看详情',
          success: (res) => {
            if (res.confirm) {
              console.log('📋 完整的词形变化分析:')
              console.log(inflectionContent)
            }
          }
        })
        
      } else {
        console.log('❌ 未找到词形变化详解区域')
        wx.showToast({
          title: '未找到词形变化详解',
          icon: 'none'
        })
      }
    } else {
      console.error('❌ AI解析失败:', result.result.error)
    }
  }).catch(error => {
    console.error('❌ 云函数调用失败:', error)
  })
}

// 检查词形变化覆盖度
function checkInflectionCoverage(inflectionText) {
  const allTypes = [
    // 动词变化
    '原形', 'ます形', 'た形', 'ない形', '否定形', '过去形', '现在时', '过去时',
    '进行形', 'ている', '可能形', '被动形', '使役形', '条件形', 'て形',
    '意志形', '推量form', '命令形', '尊敬语', '谦让语', '敬语形',
    
    // 形容词变化
    'い形容词', 'な形容词', '副词形', '连体形', '假定形',
    
    // 名词格变化
    '主格', '宾格', '与格', '具格', '起点', '终点', '方向格', '所有格',
    'が', 'を', 'に', 'で', 'から', 'まで', 'へ', 'の',
    
    // 助动词
    '判断助动词', 'だ', 'です', 'である', '推量', 'だろう', 'でしょう'
  ]
  
  const foundTypes = []
  const missingTypes = []
  
  allTypes.forEach(type => {
    if (inflectionText.includes(type)) {
      foundTypes.push(type)
    } else {
      missingTypes.push(type)
    }
  })
  
  return {
    total: allTypes.length,
    found: foundTypes.length,
    foundTypes,
    missingTypes
  }
}

// 快速测试所有类别
function quickTestAllCategories() {
  console.log('🚀 快速测试所有词形变化类别...')
  
  const testSentences = [
    '私は学生です。',           // 基本判断句
    '昨日映画を見ました。',     // 过去时
    '本を読んでいます。',       // 进行时
    '日本語が話せます。',       // 可能形
    '先生に呼ばれました。',     // 被动形
    '今日は暑くない。',         // い形容词否定
    '静かに歩きます。',         // な形容词副词形
    '雨が降るでしょう。'        // 推量表现
  ]
  
  testSentences.forEach((sentence, index) => {
    setTimeout(() => {
      console.log(`\n🧪 测试 ${index + 1}/${testSentences.length}: ${sentence}`)
      
      wx.cloud.callFunction({
        name: 'azure-gpt4o',
        data: { sentence }
      }).then(result => {
        if (result.result.success) {
          const inflectionMatch = result.result.data.analysis.match(/【词形变化详解】\s*(.*?)(?=【词汇明细表】|$)/s)
          if (inflectionMatch) {
            console.log(`✅ ${sentence}`)
            console.log(`   词形变化: ${inflectionMatch[1].trim().substring(0, 100)}...`)
          } else {
            console.log(`❌ ${sentence} - 无词形变化详解`)
          }
        }
      })
    }, index * 2000) // 每2秒测试一个，避免API限制
  })
}

console.log('🧪 完整词形变化测试工具已加载')
console.log('📝 在小程序控制台中运行以下命令:')
console.log('   testCompleteInflection() - 完整测试随机类别')
console.log('   quickTestAllCategories() - 快速测试所有类别')