// 批量导入词汇云函数
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 示例词汇数据（可以从外部文件读取或直接定义）
const sampleVocabulary = [
  {
    word: '影響',
    kana: 'えいきょう',
    romaji: 'eikyou',
    meaning: '影响',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '悪い影響を与える。', cn: '产生不良影响。' },
      { jp: '健康に影響する。', cn: '影响健康。' }
    ],
    tags: ['因果', '常用']
  },
  {
    word: '解決',
    kana: 'かいけつ',
    romaji: 'kaiketsu',
    meaning: '解决',
    type: '名词/动词',
    level: 'N2',
    examples: [
      { jp: '問題を解決する。', cn: '解决问题。' },
      { jp: '解決方法を探す。', cn: '寻找解决方法。' }
    ],
    tags: ['问题', '常用']
  },
  {
    word: '環境',
    kana: 'かんきょう',
    romaji: 'kankyou',
    meaning: '环境',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '環境を守る。', cn: '保护环境。' },
      { jp: '職場環境が良い。', cn: '工作环境很好。' }
    ],
    tags: ['社会', '常用']
  },
  {
    word: '経験',
    kana: 'けいけん',
    romaji: 'keiken',
    meaning: '经验',
    type: '名词/动词',
    level: 'N2',
    examples: [
      { jp: '豊富な経験を持つ。', cn: '拥有丰富的经验。' },
      { jp: '失敗を経験する。', cn: '经历失败。' }
    ],
    tags: ['生活', '常用']
  },
  {
    word: '状況',
    kana: 'じょうきょう',
    romaji: 'joukyou',
    meaning: '状况，情况',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '現在の状況を説明する。', cn: '说明现在的状况。' },
      { jp: '状況が変わる。', cn: '情况发生变化。' }
    ],
    tags: ['状态', '常用']
  },
  {
    word: '関係',
    kana: 'かんけい',
    romaji: 'kankei',
    meaning: '关系',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '良い関係を築く。', cn: '建立良好的关系。' },
      { jp: '関係がない。', cn: '没有关系。' }
    ],
    tags: ['人际', '常用']
  },
  {
    word: '必要',
    kana: 'ひつよう',
    romaji: 'hitsuyou',
    meaning: '必要，需要',
    type: '名词/形容动词',
    level: 'N2',
    examples: [
      { jp: '必要な書類を準備する。', cn: '准备必要的文件。' },
      { jp: 'それは必要ない。', cn: '那个不需要。' }
    ],
    tags: ['需求', '常用']
  },
  {
    word: '可能',
    kana: 'かのう',
    romaji: 'kanou',
    meaning: '可能',
    type: '名词/形容动词',
    level: 'N2',
    examples: [
      { jp: '実現可能な計画。', cn: '可以实现的计划。' },
      { jp: '可能性がある。', cn: '有可能性。' }
    ],
    tags: ['可能性', '常用']
  },
  {
    word: '意見',
    kana: 'いけん',
    romaji: 'iken',
    meaning: '意见',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '意見を述べる。', cn: '发表意见。' },
      { jp: '意見が分かれる。', cn: '意见分歧。' }
    ],
    tags: ['交流', '常用']
  },
  {
    word: '理由',
    kana: 'りゆう',
    romaji: 'riyuu',
    meaning: '理由',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '理由を説明する。', cn: '说明理由。' },
      { jp: '理由がない。', cn: '没有理由。' }
    ],
    tags: ['原因', '常用']
  },
  {
    word: '結果',
    kana: 'けっか',
    romaji: 'kekka',
    meaning: '结果',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '試験の結果が出る。', cn: '考试结果出来了。' },
      { jp: '結果として成功した。', cn: '结果成功了。' }
    ],
    tags: ['结果', '常用']
  },
  {
    word: '方法',
    kana: 'ほうほう',
    romaji: 'houhou',
    meaning: '方法',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '新しい方法を試す。', cn: '尝试新方法。' },
      { jp: '方法がない。', cn: '没有办法。' }
    ],
    tags: ['方式', '常用']
  },
  {
    word: '目的',
    kana: 'もくてき',
    romaji: 'mokuteki',
    meaning: '目的',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '目的を達成する。', cn: '达成目的。' },
      { jp: '目的地に着く。', cn: '到达目的地。' }
    ],
    tags: ['目标', '常用']
  },
  {
    word: '条件',
    kana: 'じょうけん',
    romaji: 'jouken',
    meaning: '条件',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '条件を満たす。', cn: '满足条件。' },
      { jp: '条件が厳しい。', cn: '条件严格。' }
    ],
    tags: ['要求', '常用']
  },
  {
    word: '変化',
    kana: 'へんか',
    romaji: 'henka',
    meaning: '变化',
    type: '名词/动词',
    level: 'N2',
    examples: [
      { jp: '気温が変化する。', cn: '气温变化。' },
      { jp: '大きな変化がある。', cn: '有很大的变化。' }
    ],
    tags: ['变化', '常用']
  },
  {
    word: '発展',
    kana: 'はってん',
    romaji: 'hatten',
    meaning: '发展',
    type: '名词/动词',
    level: 'N2',
    examples: [
      { jp: '経済が発展する。', cn: '经济发展。' },
      { jp: '発展途上国。', cn: '发展中国家。' }
    ],
    tags: ['进步', '常用']
  },
  {
    word: '社会',
    kana: 'しゃかい',
    romaji: 'shakai',
    meaning: '社会',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '社会に貢献する。', cn: '为社会做贡献。' },
      { jp: '社会問題。', cn: '社会问题。' }
    ],
    tags: ['社会', '常用']
  },
  {
    word: '文化',
    kana: 'ぶんか',
    romaji: 'bunka',
    meaning: '文化',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '日本文化を学ぶ。', cn: '学习日本文化。' },
      { jp: '文化の違い。', cn: '文化差异。' }
    ],
    tags: ['文化', '常用']
  },
  {
    word: '教育',
    kana: 'きょういく',
    romaji: 'kyouiku',
    meaning: '教育',
    type: '名词/动词',
    level: 'N2',
    examples: [
      { jp: '子供を教育する。', cn: '教育孩子。' },
      { jp: '教育制度。', cn: '教育制度。' }
    ],
    tags: ['教育', '常用']
  },
  {
    word: '技術',
    kana: 'ぎじゅつ',
    romaji: 'gijutsu',
    meaning: '技术',
    type: '名词',
    level: 'N2',
    examples: [
      { jp: '新しい技術を開発する。', cn: '开发新技术。' },
      { jp: '技術が進歩する。', cn: '技术进步。' }
    ],
    tags: ['技术', '常用']
  }
];

exports.main = async (event, context) => {
  const { action = 'import', clearExisting = false } = event;

  try {
    switch(action) {
      case 'import':
        return await importVocabulary(clearExisting);
      
      case 'clear':
        return await clearVocabulary();
      
      case 'count':
        return await getVocabularyCount();
      
      default:
        return {
          success: false,
          message: '未知操作'
        };
    }
  } catch (error) {
    console.error('云函数执行失败', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

// 批量导入词汇
async function importVocabulary(clearExisting) {
  const collection = db.collection('n2_vocabulary');
  
  // 如果需要清空现有数据
  if (clearExisting) {
    try {
      await collection.where({
        _id: _.exists(true)
      }).remove();
      console.log('已清空现有词汇数据');
    } catch(err) {
      console.error('清空数据失败', err);
    }
  }

  // 准备导入数据
  const timestamp = new Date();
  const dataToImport = sampleVocabulary.map((item, index) => ({
    ...item,
    random: Math.random(),
    sortIndex: index,
    createTime: timestamp,
    updateTime: timestamp,
    // 兼容新旧字段格式
    reading: item.kana,
    meanings: item.meaning ? [item.meaning] : [],
    partOfSpeech: item.type ? [item.type] : [],
    category: item.category || 'general',
    frequency: item.frequency || 3,
    searchText: `${item.word} ${item.kana} ${item.romaji} ${item.meaning}`
  }));

  // 分批导入，每批5个
  const batchSize = 5;
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < dataToImport.length; i += batchSize) {
    const batch = dataToImport.slice(i, i + batchSize);
    
    try {
      // 使用 Promise.allSettled 来处理批量插入
      const promises = batch.map(item => 
        collection.add({ data: item })
      );
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failedCount++;
          errors.push({
            word: batch[index].word,
            error: result.reason?.message || '导入失败'
          });
        }
      });
      
    } catch (err) {
      console.error(`批次导入失败`, err);
      failedCount += batch.length;
      batch.forEach(item => {
        errors.push({
          word: item.word,
          error: err.message || '批量导入错误'
        });
      });
    }
    
    // 添加小延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    success: true,
    message: '批量导入完成',
    total: dataToImport.length,
    successCount,
    failedCount,
    errors: errors.slice(0, 10) // 只返回前10个错误
  };
}

// 清空词汇数据
async function clearVocabulary() {
  const collection = db.collection('n2_vocabulary');
  
  try {
    const res = await collection.where({
      _id: _.exists(true)
    }).remove();
    
    return {
      success: true,
      message: '词汇数据已清空',
      removed: res.stats.removed
    };
  } catch (error) {
    throw error;
  }
}

// 获取词汇数量
async function getVocabularyCount() {
  const collection = db.collection('n2_vocabulary');
  
  try {
    const res = await collection.count();
    
    return {
      success: true,
      count: res.total
    };
  } catch (error) {
    throw error;
  }
}