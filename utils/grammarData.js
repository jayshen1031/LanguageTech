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
  },

  // 第四单元：日语语法顺口溜（完整版）
  unit4: {
    title: '日语语法顺口溜',
    lessons: [
      {
        id: 'rhyme-noun-positive',
        title: '名词肯定顺口溜',
        level: '初级',
        grammar: 'N + だ/です',
        explanation: '名词断定用「だ」\n就是"是"要记它。\nです礼貌だ简体，\n原因「から」推测「だろう／でしょう」答。',
        examples: [
          {
            jp: '私は学生だ。',
            kana: 'わたしはがくせいだ。',
            romaji: 'watashi wa gakusei da',
            cn: '我是学生。',
            grammar: '名词断定句型'
          },
          {
            jp: '明日は休みでしょう。',
            kana: 'あしたはやすみでしょう。',
            romaji: 'ashita wa yasumi deshou',
            cn: '明天大概是休息日吧。',
            grammar: '推测用法'
          }
        ]
      },
      {
        id: 'rhyme-noun-negative',
        title: '名词否定顺口溜',
        level: '初级',
        grammar: 'N + ではない/じゃない',
        explanation: '不是就说「ではない」\n口语里面说「じゃない」。\n原因后面接个「から」，\n转折「が」推测「でしょう」也不赖。',
        examples: [
          {
            jp: '私は先生ではない。',
            kana: 'わたしはせんせいではない。',
            romaji: 'watashi wa sensei dewa nai',
            cn: '我不是老师。',
            grammar: '名词否定'
          },
          {
            jp: 'それは本じゃないでしょう。',
            kana: 'それはほんじゃないでしょう。',
            romaji: 'sore wa hon ja nai deshou',
            cn: '那不是书吧。',
            grammar: '否定推测'
          }
        ]
      },
      {
        id: 'rhyme-noun-past',
        title: '名词过去顺口溜',
        level: '初级',
        grammar: 'N + だった/ではなかった',
        explanation: '曾经用「だった」讲，\n过去否定「ではなかった」别忘掉。\n口语直接讲「じゃなかった」，\n昨天不是就是这样表。',
        examples: [
          {
            jp: '昨日は雨だった。',
            kana: 'きのうはあめだった。',
            romaji: 'kinou wa ame datta',
            cn: '昨天是雨天。',
            grammar: '过去肯定'
          },
          {
            jp: 'それは私のじゃなかった。',
            kana: 'それはわたしのじゃなかった。',
            romaji: 'sore wa watashi no ja nakatta',
            cn: '那不是我的。',
            grammar: '过去否定（口语）'
          }
        ]
      },
      {
        id: 'rhyme-noun-no',
        title: '的字「の」顺口溜',
        level: '初级',
        grammar: 'N1 + の + N2',
        explanation: '名词加の连成双，\n表示"的"要记牢。\n我的书包黑又黑，\n那是我的，这个是他（の）。',
        examples: [
          {
            jp: '私の黒いかばん',
            kana: 'わたしのくろいかばん',
            romaji: 'watashi no kuroi kaban',
            cn: '我的黑书包',
            grammar: '所属关系'
          },
          {
            jp: 'これは彼のです。',
            kana: 'これはかれのです。',
            romaji: 'kore wa kare no desu',
            cn: '这是他的。',
            grammar: '所有格'
          }
        ]
      },
      {
        id: 'rhyme-na-adjective',
        title: '形容动词顺口溜',
        level: '初级',
        grammar: 'な形容词活用',
        explanation: '修饰名词：\n静かな所风景好，\nな形修饰名词要记牢。\n\n修饰动词（に形）：\n形容动词加に接，\n静かに話す别吵闹。\n\n并列递进（て形）：\n「形容动词+て」来连接，\n不仅……而且……配。\n包包丈夫で，色もいい，\n又结实来又好看。',
        examples: [
          {
            jp: '静かな公園',
            kana: 'しずかなこうえん',
            romaji: 'shizuka na kouen',
            cn: '安静的公园',
            grammar: '修饰名词'
          },
          {
            jp: '静かに勉強する',
            kana: 'しずかにべんきょうする',
            romaji: 'shizuka ni benkyou suru',
            cn: '安静地学习',
            grammar: '修饰动词'
          },
          {
            jp: '親切で、優しい人',
            kana: 'しんせつで、やさしいひと',
            romaji: 'shinsetsu de, yasashii hito',
            cn: '亲切又温柔的人',
            grammar: 'て形连接'
          }
        ]
      },
      {
        id: 'rhyme-na-forms',
        title: '形容动词敬体与时态',
        level: '初级',
        grammar: 'な形容词时态变化',
        explanation: '敬体与否定：\n静かです很礼貌，\n否定要说「ではありません」。\n\n过去肯定和否定：\n好きだった表示曾喜欢，\n好きではなかった就是不喜欢。',
        examples: [
          {
            jp: 'ここは静かです。',
            kana: 'ここはしずかです。',
            romaji: 'koko wa shizuka desu',
            cn: '这里很安静。',
            grammar: '敬体肯定'
          },
          {
            jp: '昨日は暇だった。',
            kana: 'きのうはひまだった。',
            romaji: 'kinou wa hima datta',
            cn: '昨天很闲。',
            grammar: '过去肯定'
          },
          {
            jp: '前は好きではなかった。',
            kana: 'まえはすきではなかった。',
            romaji: 'mae wa suki dewa nakatta',
            cn: '以前不喜欢。',
            grammar: '过去否定'
          }
        ]
      },
      {
        id: 'rhyme-i-adjective',
        title: 'い形容词顺口溜',
        level: '初级',
        grammar: 'い形容词活用',
        explanation: '原形（肯定）：\n词尾带い是描述，\n高い便宜安い数。\n\n否定：\nい去加くない，\n今天不冷说寒くない。\n\n过去式：\nい去加かった，\n昨天真冷寒かった。\n\n过去否定：\nい去加くなかった，\n昨天不冷寒くなかった。',
        examples: [
          {
            jp: '今日は暖かい。',
            kana: 'きょうはあたたかい。',
            romaji: 'kyou wa atatakai',
            cn: '今天很暖和。',
            grammar: '原形肯定'
          },
          {
            jp: '高くない。',
            kana: 'たかくない。',
            romaji: 'takaku nai',
            cn: '不贵。',
            grammar: '否定形'
          },
          {
            jp: '昨日は寒かった。',
            kana: 'きのうはさむかった。',
            romaji: 'kinou wa samukatta',
            cn: '昨天很冷。',
            grammar: '过去肯定'
          },
          {
            jp: '面白くなかった。',
            kana: 'おもしろくなかった。',
            romaji: 'omoshiroku nakatta',
            cn: '不有趣。',
            grammar: '过去否定'
          }
        ]
      },
      {
        id: 'rhyme-i-te-form',
        title: 'い形容词て形顺口溜',
        level: '初级',
        grammar: 'い形容词て形',
        explanation: 'て形：\n形容词加くて，\n句子相连顺又美。\n又甜又香甘くて，\n不仅……而且……都对味。',
        examples: [
          {
            jp: '甘くて美味しい',
            kana: 'あまくておいしい',
            romaji: 'amakute oishii',
            cn: '又甜又好吃',
            grammar: 'て形连接'
          },
          {
            jp: '安くて便利だ',
            kana: 'やすくてべんりだ',
            romaji: 'yasukute benri da',
            cn: '又便宜又方便',
            grammar: 'て形连接形容动词'
          }
        ]
      },
      {
        id: 'rhyme-summary',
        title: '万能公式顺口溜',
        level: '初级',
        grammar: '综合语法公式',
        explanation: '名词肯定用だ形，\n不是就说ではない。\n过去用だった，\n过去否定ではなかった。\n\n形容动词な来连，\n动词状态に中现，\n并列递进用て连，\nです敬体要常练。\n\nい形容词记词尾，\nくない否定くて连。\n过去かった否定くなかった，\n日语基础全攻占！',
        examples: [
          {
            jp: '彼は学生だ。',
            kana: 'かれはがくせいだ。',
            romaji: 'kare wa gakusei da',
            cn: '他是学生。',
            grammar: '名词肯定'
          },
          {
            jp: 'きれいな花',
            kana: 'きれいなはな',
            romaji: 'kirei na hana',
            cn: '美丽的花',
            grammar: '形容动词修饰'
          },
          {
            jp: '楽しくて面白い',
            kana: 'たのしくておもしろい',
            romaji: 'tanoshikute omoshiroi',
            cn: '既快乐又有趣',
            grammar: 'い形容词て形'
          }
        ]
      }
    ]
  },

  // 第五单元：助词详解
  unit5: {
    title: '助词详解',
    lessons: [
      {
        id: 'particle-wa-ga',
        title: '主题助词 は / 主语助词 が',
        level: '初级',
        grammar: 'は vs が',
        explanation: 'は：标记主题（已知信息）\nが：标记主语（新信息）、强调、特定',
        examples: [
          {
            jp: '私は学生です。',
            kana: 'わたしはがくせいです。',
            romaji: 'watashi wa gakusei desu',
            cn: '我是学生。',
            grammar: '「は」标记主题，说明"我"的身份'
          },
          {
            jp: '誰が来ましたか。',
            kana: 'だれがきましたか。',
            romaji: 'dare ga kimashita ka',
            cn: '谁来了？',
            grammar: '「が」用于疑问词，询问新信息'
          },
          {
            jp: '象は鼻が長い。',
            kana: 'ぞうははながながい。',
            romaji: 'zou wa hana ga nagai',
            cn: '大象鼻子长。',
            grammar: '「は」标记大主题，「が」标记小主语'
          }
        ]
      },
      {
        id: 'particle-wo',
        title: '宾语助词 を',
        level: '初级',
        grammar: 'N + を + 他动词',
        explanation: '标记动作的直接对象，主要用于他动词',
        examples: [
          {
            jp: '本を読む。',
            kana: 'ほんをよむ。',
            romaji: 'hon wo yomu',
            cn: '读书。',
            grammar: '「を」标记动作对象"书"'
          },
          {
            jp: '公園を散歩する。',
            kana: 'こうえんをさんぽする。',
            romaji: 'kouen wo sanpo suru',
            cn: '在公园散步。',
            grammar: '「を」标记经过的场所'
          },
          {
            jp: '大学を卒業する。',
            kana: 'だいがくをそつぎょうする。',
            romaji: 'daigaku wo sotsugyou suru',
            cn: '大学毕业。',
            grammar: '「を」标记离开的场所'
          }
        ]
      },
      {
        id: 'particle-ni',
        title: '助词 に 的用法',
        level: '初级',
        grammar: 'に（多种用法）',
        explanation: '1. 时间点\n2. 地点（存在/到达）\n3. 目的\n4. 对象\n5. 结果',
        examples: [
          {
            jp: '7時に起きる。',
            kana: 'しちじにおきる。',
            romaji: 'shichi-ji ni okiru',
            cn: '7点起床。',
            grammar: '「に」标记具体时间点'
          },
          {
            jp: '学校に行く。',
            kana: 'がっこうにいく。',
            romaji: 'gakkou ni iku',
            cn: '去学校。',
            grammar: '「に」标记移动的目的地'
          },
          {
            jp: '友達に会う。',
            kana: 'ともだちにあう。',
            romaji: 'tomodachi ni au',
            cn: '见朋友。',
            grammar: '「に」标记动作的对象'
          },
          {
            jp: '買い物に行く。',
            kana: 'かいものにいく。',
            romaji: 'kaimono ni iku',
            cn: '去购物。',
            grammar: '「に」标记目的（动词连用形+に）'
          }
        ]
      },
      {
        id: 'particle-de',
        title: '助词 で 的用法',
        level: '初级',
        grammar: 'で（多种用法）',
        explanation: '1. 手段/方法\n2. 场所（动作）\n3. 原因/理由\n4. 材料\n5. 范围',
        examples: [
          {
            jp: '電車で行く。',
            kana: 'でんしゃでいく。',
            romaji: 'densha de iku',
            cn: '坐电车去。',
            grammar: '「で」表示交通工具'
          },
          {
            jp: '図書館で勉強する。',
            kana: 'としょかんでべんきょうする。',
            romaji: 'toshokan de benkyou suru',
            cn: '在图书馆学习。',
            grammar: '「で」表示动作发生的场所'
          },
          {
            jp: '風邪で休む。',
            kana: 'かぜでやすむ。',
            romaji: 'kaze de yasumu',
            cn: '因感冒而休息。',
            grammar: '「で」表示原因'
          },
          {
            jp: '日本で一番高い山',
            kana: 'にほんでいちばんたかいやま',
            romaji: 'nihon de ichiban takai yama',
            cn: '日本最高的山',
            grammar: '「で」表示范围'
          }
        ]
      },
      {
        id: 'particle-to',
        title: '助词 と 的用法',
        level: '初级',
        grammar: 'と（多种用法）',
        explanation: '1. 并列（和）\n2. 一起（共同动作）\n3. 引用\n4. 条件',
        examples: [
          {
            jp: 'りんごとみかん',
            kana: 'りんごとみかん',
            romaji: 'ringo to mikan',
            cn: '苹果和橘子',
            grammar: '「と」表示并列'
          },
          {
            jp: '友達と話す。',
            kana: 'ともだちとはなす。',
            romaji: 'tomodachi to hanasu',
            cn: '和朋友说话。',
            grammar: '「と」表示共同进行动作的对象'
          },
          {
            jp: '「はい」と言う。',
            kana: '「はい」という。',
            romaji: '"hai" to iu',
            cn: '说"是"。',
            grammar: '「と」表示引用内容'
          },
          {
            jp: '春になると暖かくなる。',
            kana: 'はるになるとあたたかくなる。',
            romaji: 'haru ni naru to atatakaku naru',
            cn: '到了春天就会变暖和。',
            grammar: '「と」表示自然结果的条件'
          }
        ]
      },
      {
        id: 'particle-kara-made',
        title: '起点终点助词 から/まで',
        level: '初级',
        grammar: 'から（起点）/ まで（终点）',
        explanation: 'から：表示起点（时间/地点/顺序）\nまで：表示终点（时间/地点/程度）',
        examples: [
          {
            jp: '9時から5時まで働く。',
            kana: 'くじからごじまではたらく。',
            romaji: 'ku-ji kara go-ji made hataraku',
            cn: '从9点工作到5点。',
            grammar: '时间的起点和终点'
          },
          {
            jp: '東京から大阪まで',
            kana: 'とうきょうからおおさかまで',
            romaji: 'toukyou kara oosaka made',
            cn: '从东京到大阪',
            grammar: '地点的起点和终点'
          },
          {
            jp: '友達から手紙をもらった。',
            kana: 'ともだちからてがみをもらった。',
            romaji: 'tomodachi kara tegami wo moratta',
            cn: '从朋友那里收到了信。',
            grammar: '「から」表示来源'
          }
        ]
      },
      {
        id: 'particle-ya-toka',
        title: '列举助词 や/とか',
        level: '初级',
        grammar: 'や（不完全列举）/ とか（举例）',
        explanation: 'や：列举代表性事物（等等）\nとか：口语化的举例',
        examples: [
          {
            jp: '本や雑誌を読む。',
            kana: 'ほんやざっしをよむ。',
            romaji: 'hon ya zasshi wo yomu',
            cn: '读书和杂志等。',
            grammar: '「や」表示不完全列举'
          },
          {
            jp: '映画とか音楽とか好きです。',
            kana: 'えいがとかおんがくとかすきです。',
            romaji: 'eiga toka ongaku toka suki desu',
            cn: '喜欢电影啦音乐啦之类的。',
            grammar: '「とか」口语举例'
          }
        ]
      },
      {
        id: 'particle-mo',
        title: '助词 も（也/都）',
        level: '初级',
        grammar: 'も（也、都、连）',
        explanation: '1. 也（相同情况）\n2. 都（全部肯定/否定）\n3. 连…都（极端）',
        examples: [
          {
            jp: '私も学生です。',
            kana: 'わたしもがくせいです。',
            romaji: 'watashi mo gakusei desu',
            cn: '我也是学生。',
            grammar: '「も」表示"也"'
          },
          {
            jp: '何も食べない。',
            kana: 'なにもたべない。',
            romaji: 'nani mo tabenai',
            cn: '什么都不吃。',
            grammar: '疑问词+も+否定=全部否定'
          },
          {
            jp: '水も飲めない。',
            kana: 'みずものめない。',
            romaji: 'mizu mo nomenai',
            cn: '连水都喝不了。',
            grammar: '「も」表示"连…都"'
          }
        ]
      },
      {
        id: 'particle-no',
        title: '助词 の 的多种用法',
        level: '初级',
        grammar: 'の（所属/修饰/同位）',
        explanation: '1. 所属关系\n2. 修饰关系\n3. 同位关系\n4. 主语（从句中）\n5. 名词化',
        examples: [
          {
            jp: '私の本',
            kana: 'わたしのほん',
            romaji: 'watashi no hon',
            cn: '我的书',
            grammar: '所属关系'
          },
          {
            jp: '赤い色の花',
            kana: 'あかいいろのはな',
            romaji: 'akai iro no hana',
            cn: '红色的花',
            grammar: '修饰关系'
          },
          {
            jp: '医者の田中さん',
            kana: 'いしゃのたなかさん',
            romaji: 'isha no tanaka-san',
            cn: '医生田中先生',
            grammar: '同位关系'
          },
          {
            jp: '私の知っている人',
            kana: 'わたしのしっているひと',
            romaji: 'watashi no shitte iru hito',
            cn: '我认识的人',
            grammar: '「の」作从句主语（代替が）'
          },
          {
            jp: '赤いのがいい。',
            kana: 'あかいのがいい。',
            romaji: 'akai no ga ii',
            cn: '红色的好。',
            grammar: '「の」名词化'
          }
        ]
      },
      {
        id: 'particle-ka',
        title: '疑问/选择助词 か',
        level: '初级',
        grammar: 'か（疑问/选择/不确定）',
        explanation: '1. 疑问句\n2. 选择（或者）\n3. 不确定（某）',
        examples: [
          {
            jp: '学生ですか。',
            kana: 'がくせいですか。',
            romaji: 'gakusei desu ka',
            cn: '是学生吗？',
            grammar: '疑问句结尾'
          },
          {
            jp: 'コーヒーか紅茶',
            kana: 'コーヒーかこうちゃ',
            romaji: 'koohii ka koucha',
            cn: '咖啡或红茶',
            grammar: '表示选择'
          },
          {
            jp: '誰かが来た。',
            kana: 'だれかがきた。',
            romaji: 'dareka ga kita',
            cn: '有人来了。',
            grammar: '疑问词+か=不确定'
          }
        ]
      },
      {
        id: 'particle-ne-yo',
        title: '语气助词 ね/よ',
        level: '初级',
        grammar: 'ね（确认/同感）/ よ（断定/提醒）',
        explanation: 'ね：寻求同意、确认、缓和语气\nよ：告知、强调、提醒',
        examples: [
          {
            jp: '今日は寒いですね。',
            kana: 'きょうはさむいですね。',
            romaji: 'kyou wa samui desu ne',
            cn: '今天很冷呢。',
            grammar: '「ね」寻求共鸣'
          },
          {
            jp: 'もう行きますよ。',
            kana: 'もういきますよ。',
            romaji: 'mou ikimasu yo',
            cn: '要走了哦。',
            grammar: '「よ」提醒对方'
          },
          {
            jp: 'そうですよね。',
            kana: 'そうですよね。',
            romaji: 'sou desu yo ne',
            cn: '是这样吧。',
            grammar: '「よ」+「ね」=确认的强调'
          }
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