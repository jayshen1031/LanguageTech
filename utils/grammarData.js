// 日语语法学习数据
const grammarData = {
  // 第一单元：名词句型（だ・です系列）
  unit1: {
    title: '名词句型（だ・です系列）',
    lessons: [
      {
        id: 'noun-positive',
        title: '名词肯定句',
        level: '初级',
        grammar: 'N + だ/です',
        explanation: '表示"是"的意思，です是敬语形式，だ是普通形式',
        examples: [
          {
            jp: '私は学生だ。',
            kana: 'わたしはがくせいだ。',
            cn: '我是学生。',
            grammar: '私（名词）+ は + 学生（名词）+ だ'
          },
          {
            jp: '田中さんは先生です。',
            kana: 'たなかさんはせんせいです。',
            cn: '田中是老师。',
            grammar: '田中さん（名词）+ は + 先生（名词）+ です'
          },
          {
            jp: 'これは本だ。',
            kana: 'これはほんだ。',
            cn: '这是书。',
            grammar: 'これ（代词）+ は + 本（名词）+ だ'
          }
        ],
        practice: [
          '私は___です。（日本人）',
          'それは___だ。（りんご）',
          '今日は___です。（月曜日）'
        ]
      },
      {
        id: 'noun-negative',
        title: '名词否定句',
        level: '初级',
        grammar: 'N + ではない/じゃない',
        explanation: '表示"不是"，じゃない是口语形式',
        examples: [
          {
            jp: '私は先生ではない。',
            kana: 'わたしはせんせいではない。',
            cn: '我不是老师。',
            grammar: '私 + は + 先生 + ではない'
          },
          {
            jp: 'これは本じゃない。',
            kana: 'これはほんじゃない。',
            cn: '这不是书。',
            grammar: 'これ + は + 本 + じゃない'
          },
          {
            jp: '今日は日曜日ではありません。',
            kana: 'きょうはにちようびではありません。',
            cn: '今天不是星期天。',
            grammar: '今日 + は + 日曜日 + ではありません'
          }
        ],
        practice: [
          '彼は___ではない。（医者）',
          'それは___じゃない。（ペン）',
          '明日は___ではありません。（休み）'
        ]
      },
      {
        id: 'noun-past',
        title: '名词过去式',
        level: '初级',
        grammar: 'N + だった/でした',
        explanation: '表示过去"曾经是"',
        examples: [
          {
            jp: '昨日は雨だった。',
            kana: 'きのうはあめだった。',
            cn: '昨天是雨天。',
            grammar: '昨日 + は + 雨 + だった'
          },
          {
            jp: '彼は学生でした。',
            kana: 'かれはがくせいでした。',
            cn: '他曾经是学生。',
            grammar: '彼 + は + 学生 + でした'
          }
        ],
        practice: [
          '去年私は___だった。（高校生）',
          'あの人は___でした。（先生）'
        ]
      },
      {
        id: 'noun-past-negative',
        title: '名词过去否定',
        level: '初级',
        grammar: 'N + ではなかった/じゃなかった',
        explanation: '表示过去"不是"',
        examples: [
          {
            jp: '昨日は休みではなかった。',
            kana: 'きのうはやすみではなかった。',
            cn: '昨天不是休息日。',
            grammar: '昨日 + は + 休み + ではなかった'
          },
          {
            jp: 'それは私のじゃなかった。',
            kana: 'それはわたしのじゃなかった。',
            cn: '那不是我的。',
            grammar: 'それ + は + 私の + じゃなかった'
          }
        ],
        practice: [
          '彼女は___ではなかった。（看護師）',
          'あれは___じゃなかった。（教室）'
        ]
      },
      {
        id: 'noun-no',
        title: '的字结构「の」',
        level: '初级',
        grammar: 'N1 + の + N2',
        explanation: '表示所属关系，相当于中文的"的"',
        examples: [
          {
            jp: '私の本',
            kana: 'わたしのほん',
            cn: '我的书',
            grammar: '私（所有者）+ の + 本（所属物）'
          },
          {
            jp: '日本の文化',
            kana: 'にほんのぶんか',
            cn: '日本的文化',
            grammar: '日本（所属）+ の + 文化（对象）'
          },
          {
            jp: '友達の家',
            kana: 'ともだちのいえ',
            cn: '朋友的家',
            grammar: '友達（所有者）+ の + 家（所属物）'
          }
        ],
        practice: [
          '___の車（先生）',
          '___の会社（父）',
          '___の学校（妹）'
        ]
      }
    ]
  },

  // 第二单元：形容动词（な形容词）
  unit2: {
    title: '形容动词（な形容词）',
    lessons: [
      {
        id: 'na-adjective-basic',
        title: '形容动词修饰名词',
        level: '初级',
        grammar: 'な形容词 + な + N',
        explanation: '形容动词修饰名词时要加な',
        examples: [
          {
            jp: '静かな場所',
            kana: 'しずかなばしょ',
            cn: '安静的地方',
            grammar: '静か（形容动词）+ な + 場所（名词）'
          },
          {
            jp: '便利な道具',
            kana: 'べんりなどうぐ',
            cn: '方便的工具',
            grammar: '便利（形容动词）+ な + 道具（名词）'
          },
          {
            jp: '有名な人',
            kana: 'ゆうめいなひと',
            cn: '有名的人',
            grammar: '有名（形容动词）+ な + 人（名词）'
          }
        ],
        practice: [
          '___な部屋（きれい）',
          '___な仕事（大変）',
          '___な人（親切）'
        ]
      },
      {
        id: 'na-adjective-adverb',
        title: '形容动词修饰动词',
        level: '初级',
        grammar: 'な形容词 + に + V',
        explanation: '形容动词修饰动词时要变成に形',
        examples: [
          {
            jp: '静かに話す',
            kana: 'しずかにはなす',
            cn: '安静地说话',
            grammar: '静か + に + 話す'
          },
          {
            jp: '上手に歌う',
            kana: 'じょうずにうたう',
            cn: '唱得好',
            grammar: '上手 + に + 歌う'
          },
          {
            jp: 'きれいに書く',
            kana: 'きれいにかく',
            cn: '写得漂亮',
            grammar: 'きれい + に + 書く'
          }
        ],
        practice: [
          '___に勉強する（真面目）',
          '___に説明する（簡単）',
          '___に生活する（自由）'
        ]
      },
      {
        id: 'na-adjective-te',
        title: '形容动词并列（て形）',
        level: '初级',
        grammar: 'な形容词 + で',
        explanation: '用于连接句子，表示"既...又..."',
        examples: [
          {
            jp: 'このカバンは丈夫で、デザインもいい。',
            kana: 'このカバンはじょうぶで、デザインもいい。',
            cn: '这个包既结实，设计也好。',
            grammar: '丈夫 + で'
          },
          {
            jp: '彼女は親切で、美人だ。',
            kana: 'かのじょはしんせつで、びじんだ。',
            cn: '她既亲切又漂亮。',
            grammar: '親切 + で'
          }
        ],
        practice: [
          'この部屋は___で、明るい。（静か）',
          '日本料理は___で、美味しい。（健康）'
        ]
      }
    ]
  },

  // 第三单元：形容词（い形容词）
  unit3: {
    title: '形容词（い形容词）',
    lessons: [
      {
        id: 'i-adjective-basic',
        title: 'い形容词基础',
        level: '初级',
        grammar: 'い形容词原形',
        explanation: '以い结尾的形容词，可直接修饰名词',
        examples: [
          {
            jp: '高い山',
            kana: 'たかいやま',
            cn: '高山',
            grammar: '高い（形容词）+ 山（名词）'
          },
          {
            jp: '美味しい料理',
            kana: 'おいしいりょうり',
            cn: '美味的料理',
            grammar: '美味しい + 料理'
          },
          {
            jp: '新しい車',
            kana: 'あたらしいくるま',
            cn: '新车',
            grammar: '新しい + 車'
          }
        ],
        practice: [
          '___本（面白い）',
          '___天気（暖かい）',
          '___問題（難しい）'
        ]
      },
      {
        id: 'i-adjective-negative',
        title: 'い形容词否定',
        level: '初级',
        grammar: 'い → くない',
        explanation: '去掉い加上くない表示否定',
        examples: [
          {
            jp: '今日は寒くない。',
            kana: 'きょうはさむくない。',
            cn: '今天不冷。',
            grammar: '寒い → 寒くない'
          },
          {
            jp: 'この問題は難しくない。',
            kana: 'このもんだいはむずかしくない。',
            cn: '这个问题不难。',
            grammar: '難しい → 難しくない'
          }
        ],
        practice: [
          'このりんごは___。（甘い→否定）',
          '部屋は___。（広い→否定）'
        ]
      },
      {
        id: 'i-adjective-past',
        title: 'い形容词过去式',
        level: '初级',
        grammar: 'い → かった',
        explanation: '去掉い加上かった表示过去',
        examples: [
          {
            jp: '昨日は寒かった。',
            kana: 'きのうはさむかった。',
            cn: '昨天很冷。',
            grammar: '寒い → 寒かった'
          },
          {
            jp: '試験は難しかった。',
            kana: 'しけんはむずかしかった。',
            cn: '考试很难。',
            grammar: '難しい → 難しかった'
          }
        ],
        practice: [
          '昨日の天気は___。（暑い→过去）',
          '映画は___。（面白い→过去）'
        ]
      },
      {
        id: 'i-adjective-te',
        title: 'い形容词て形',
        level: '初级',
        grammar: 'い → くて',
        explanation: '用于连接句子',
        examples: [
          {
            jp: 'このケーキは甘くて、美味しい。',
            kana: 'このケーキはあまくて、おいしい。',
            cn: '这个蛋糕又甜又好吃。',
            grammar: '甘い → 甘くて'
          },
          {
            jp: '部屋は広くて、明るい。',
            kana: 'へやはひろくて、あかるい。',
            cn: '房间又宽敞又明亮。',
            grammar: '広い → 広くて'
          }
        ],
        practice: [
          '彼女は___、親切だ。（優しい→て形）',
          '今日は___、気持ちがいい。（暖かい→て形）'
        ]
      }
    ]
  }
}

// 学习计划模板
const studyPlan = {
  beginner: {
    title: '初级语法学习计划（12周）',
    weeks: [
      {
        week: 1,
        title: '名词基础句型',
        content: ['noun-positive', 'noun-negative'],
        review: [],
        dailyPractice: 10 // 每天练习句数
      },
      {
        week: 2,
        title: '名词时态变化',
        content: ['noun-past', 'noun-past-negative'],
        review: ['noun-positive', 'noun-negative'],
        dailyPractice: 10
      },
      {
        week: 3,
        title: '所属关系',
        content: ['noun-no'],
        review: ['noun-past', 'noun-past-negative'],
        dailyPractice: 10
      },
      {
        week: 4,
        title: '形容动词基础',
        content: ['na-adjective-basic', 'na-adjective-adverb'],
        review: ['noun-no', 'noun-positive'],
        dailyPractice: 12
      },
      {
        week: 5,
        title: '形容动词活用',
        content: ['na-adjective-te'],
        review: ['na-adjective-basic', 'na-adjective-adverb'],
        dailyPractice: 12
      },
      {
        week: 6,
        title: '综合复习周',
        content: [],
        review: ['noun-positive', 'noun-negative', 'noun-past', 'noun-past-negative', 'noun-no'],
        dailyPractice: 15
      },
      {
        week: 7,
        title: 'い形容词基础',
        content: ['i-adjective-basic', 'i-adjective-negative'],
        review: ['na-adjective-basic', 'na-adjective-te'],
        dailyPractice: 12
      },
      {
        week: 8,
        title: 'い形容词时态',
        content: ['i-adjective-past'],
        review: ['i-adjective-basic', 'i-adjective-negative'],
        dailyPractice: 12
      },
      {
        week: 9,
        title: 'い形容词连接',
        content: ['i-adjective-te'],
        review: ['i-adjective-past', 'na-adjective-basic'],
        dailyPractice: 12
      },
      {
        week: 10,
        title: '形容词综合练习',
        content: [],
        review: ['i-adjective-basic', 'i-adjective-negative', 'i-adjective-past', 'i-adjective-te'],
        dailyPractice: 15
      },
      {
        week: 11,
        title: '混合句型练习',
        content: [],
        review: ['noun-positive', 'na-adjective-basic', 'i-adjective-basic'],
        dailyPractice: 20
      },
      {
        week: 12,
        title: '总复习与测试',
        content: [],
        review: 'all', // 复习所有内容
        dailyPractice: 20
      }
    ]
  }
}

// 复习间隔（基于艾宾浩斯记忆曲线）
const reviewIntervals = [
  1,   // 第1天
  2,   // 第2天
  4,   // 第4天
  7,   // 第7天
  15,  // 第15天
  30   // 第30天
]

module.exports = {
  grammarData,
  studyPlan,
  reviewIntervals
}