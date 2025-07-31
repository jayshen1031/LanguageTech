// JLPT N2 核心词汇库
// 数据结构：word(单词), kana(假名), romaji(罗马音), meaning(中文), type(词性), examples(例句)

const n2Vocabulary = [
  // 动词 - 基础动词
  {
    id: 'n2_001',
    word: '預かる',
    kana: 'あずかる',
    romaji: 'azukaru',
    meaning: '保管，照看',
    type: '动词',
    examples: [
      { jp: '荷物を預かってもらえますか。', cn: '能帮我保管一下行李吗？' },
      { jp: '子供を預かる。', cn: '照看孩子。' }
    ],
    level: 'N2',
    tags: ['日常']
  },
  {
    id: 'n2_002',
    word: '扱う',
    kana: 'あつかう',
    romaji: 'atsukau',
    meaning: '处理，对待',
    type: '动词',
    examples: [
      { jp: 'お客様を丁寧に扱う。', cn: '礼貌地对待客人。' },
      { jp: '機械を扱う。', cn: '操作机器。' }
    ],
    level: 'N2',
    tags: ['工作']
  },
  {
    id: 'n2_003',
    word: '現れる',
    kana: 'あらわれる',
    romaji: 'arawareru',
    meaning: '出现，显现',
    type: '动词',
    examples: [
      { jp: '症状が現れる。', cn: '症状出现。' },
      { jp: '太陽が現れた。', cn: '太阳出现了。' }
    ],
    level: 'N2',
    tags: ['自然']
  },
  {
    id: 'n2_004',
    word: '溢れる',
    kana: 'あふれる',
    romaji: 'afureru',
    meaning: '溢出，充满',
    type: '动词',
    examples: [
      { jp: '水が溢れる。', cn: '水溢出来。' },
      { jp: '喜びに溢れる。', cn: '充满喜悦。' }
    ],
    level: 'N2',
    tags: ['情感']
  },
  {
    id: 'n2_005',
    word: '謝る',
    kana: 'あやまる',
    romaji: 'ayamaru',
    meaning: '道歉，谢罪',
    type: '动词',
    examples: [
      { jp: '遅刻して謝る。', cn: '因迟到而道歉。' },
      { jp: '心から謝る。', cn: '诚心道歉。' }
    ],
    level: 'N2',
    tags: ['礼仪']
  },

  // 形容词
  {
    id: 'n2_006',
    word: '明らか',
    kana: 'あきらか',
    romaji: 'akiraka',
    meaning: '明显的，清楚的',
    type: '形容动词',
    examples: [
      { jp: '事実は明らかだ。', cn: '事实很明显。' },
      { jp: '明らかな間違い。', cn: '明显的错误。' }
    ],
    level: 'N2',
    tags: ['逻辑']
  },
  {
    id: 'n2_007',
    word: '曖昧',
    kana: 'あいまい',
    romaji: 'aimai',
    meaning: '暧昧的，模糊的',
    type: '形容动词',
    examples: [
      { jp: '曖昧な返事。', cn: '模糊的回答。' },
      { jp: '態度が曖昧だ。', cn: '态度暧昧。' }
    ],
    level: 'N2',
    tags: ['性格']
  },
  {
    id: 'n2_008',
    word: '鮮やか',
    kana: 'あざやか',
    romaji: 'azayaka',
    meaning: '鲜艳的，鲜明的',
    type: '形容动词',
    examples: [
      { jp: '鮮やかな色。', cn: '鲜艳的颜色。' },
      { jp: '鮮やかな手つき。', cn: '熟练的手法。' }
    ],
    level: 'N2',
    tags: ['颜色']
  },
  {
    id: 'n2_009',
    word: '厚い',
    kana: 'あつい',
    romaji: 'atsui',
    meaning: '厚的，深厚的',
    type: '形容词',
    examples: [
      { jp: '厚い本。', cn: '厚厚的书。' },
      { jp: '友情が厚い。', cn: '友情深厚。' }
    ],
    level: 'N2',
    tags: ['形状']
  },
  {
    id: 'n2_010',
    word: '怪しい',
    kana: 'あやしい',
    romaji: 'ayashii',
    meaning: '可疑的，奇怪的',
    type: '形容词',
    examples: [
      { jp: '怪しい人物。', cn: '可疑的人物。' },
      { jp: '天気が怪しい。', cn: '天气不太好。' }
    ],
    level: 'N2',
    tags: ['判断']
  },

  // 名词
  {
    id: 'n2_011',
    word: '空き',
    kana: 'あき',
    romaji: 'aki',
    meaning: '空位，空闲',
    type: '名词',
    examples: [
      { jp: '席に空きがある。', cn: '有空位。' },
      { jp: '時間の空き。', cn: '空闲时间。' }
    ],
    level: 'N2',
    tags: ['时间']
  },
  {
    id: 'n2_012',
    word: '悪化',
    kana: 'あっか',
    romaji: 'akka',
    meaning: '恶化，变坏',
    type: '名词',
    examples: [
      { jp: '病状が悪化する。', cn: '病情恶化。' },
      { jp: '関係の悪化。', cn: '关系恶化。' }
    ],
    level: 'N2',
    tags: ['变化']
  },
  {
    id: 'n2_013',
    word: '圧力',
    kana: 'あつりょく',
    romaji: 'atsuryoku',
    meaning: '压力',
    type: '名词',
    examples: [
      { jp: '圧力をかける。', cn: '施加压力。' },
      { jp: '社会的圧力。', cn: '社会压力。' }
    ],
    level: 'N2',
    tags: ['社会']
  },
  {
    id: 'n2_014',
    word: '跡',
    kana: 'あと',
    romaji: 'ato',
    meaning: '痕迹，遗迹',
    type: '名词',
    examples: [
      { jp: '足跡を残す。', cn: '留下足迹。' },
      { jp: '歴史の跡。', cn: '历史遗迹。' }
    ],
    level: 'N2',
    tags: ['历史']
  },
  {
    id: 'n2_015',
    word: '穴',
    kana: 'あな',
    romaji: 'ana',
    meaning: '洞，孔',
    type: '名词',
    examples: [
      { jp: '穴を掘る。', cn: '挖洞。' },
      { jp: '壁に穴が開いた。', cn: '墙上开了个洞。' }
    ],
    level: 'N2',
    tags: ['物体']
  },

  // 副词
  {
    id: 'n2_016',
    word: '案外',
    kana: 'あんがい',
    romaji: 'angai',
    meaning: '意外地，出乎意料',
    type: '副词',
    examples: [
      { jp: '案外簡単だった。', cn: '意外地简单。' },
      { jp: '案外早く着いた。', cn: '意外地早到了。' }
    ],
    level: 'N2',
    tags: ['程度']
  },
  {
    id: 'n2_017',
    word: '一応',
    kana: 'いちおう',
    romaji: 'ichiou',
    meaning: '姑且，一般来说',
    type: '副词',
    examples: [
      { jp: '一応確認する。', cn: '姑且确认一下。' },
      { jp: '一応準備した。', cn: '一般准备了。' }
    ],
    level: 'N2',
    tags: ['态度']
  },
  {
    id: 'n2_018',
    word: '一段と',
    kana: 'いちだんと',
    romaji: 'ichidanto',
    meaning: '更加，越发',
    type: '副词',
    examples: [
      { jp: '一段と寒くなった。', cn: '变得更冷了。' },
      { jp: '一段と美しい。', cn: '更加美丽。' }
    ],
    level: 'N2',
    tags: ['程度']
  },
  {
    id: 'n2_019',
    word: '一瞬',
    kana: 'いっしゅん',
    romaji: 'isshun',
    meaning: '一瞬间，片刻',
    type: '名词/副词',
    examples: [
      { jp: '一瞬で消えた。', cn: '一瞬间就消失了。' },
      { jp: '一瞬の出来事。', cn: '瞬间的事情。' }
    ],
    level: 'N2',
    tags: ['时间']
  },
  {
    id: 'n2_020',
    word: '今にも',
    kana: 'いまにも',
    romaji: 'imanimo',
    meaning: '马上就要，眼看就要',
    type: '副词',
    examples: [
      { jp: '今にも雨が降りそうだ。', cn: '眼看就要下雨了。' },
      { jp: '今にも泣きそう。', cn: '马上就要哭了。' }
    ],
    level: 'N2',
    tags: ['时间']
  },

  // 更多词汇...
  {
    id: 'n2_021',
    word: '印象',
    kana: 'いんしょう',
    romaji: 'inshou',
    meaning: '印象',
    type: '名词',
    examples: [
      { jp: '良い印象を与える。', cn: '给人留下好印象。' },
      { jp: '第一印象。', cn: '第一印象。' }
    ],
    level: 'N2',
    tags: ['感觉']
  },
  {
    id: 'n2_022',
    word: '引用',
    kana: 'いんよう',
    romaji: 'inyou',
    meaning: '引用，引证',
    type: '名词',
    examples: [
      { jp: '文献を引用する。', cn: '引用文献。' },
      { jp: '引用符。', cn: '引号。' }
    ],
    level: 'N2',
    tags: ['学术']
  },
  {
    id: 'n2_023',
    word: '受け入れる',
    kana: 'うけいれる',
    romaji: 'ukeireru',
    meaning: '接受，接纳',
    type: '动词',
    examples: [
      { jp: '提案を受け入れる。', cn: '接受提案。' },
      { jp: '現実を受け入れる。', cn: '接受现实。' }
    ],
    level: 'N2',
    tags: ['态度']
  },
  {
    id: 'n2_024',
    word: '受け取る',
    kana: 'うけとる',
    romaji: 'uketoru',
    meaning: '接收，领取',
    type: '动词',
    examples: [
      { jp: '荷物を受け取る。', cn: '接收包裹。' },
      { jp: '給料を受け取る。', cn: '领取工资。' }
    ],
    level: 'N2',
    tags: ['动作']
  },
  {
    id: 'n2_025',
    word: '恨む',
    kana: 'うらむ',
    romaji: 'uramu',
    meaning: '怨恨，憎恨',
    type: '动词',
    examples: [
      { jp: '人を恨む。', cn: '怨恨别人。' },
      { jp: '運命を恨む。', cn: '怨恨命运。' }
    ],
    level: 'N2',
    tags: ['情感']
  },
  {
    id: 'n2_026',
    word: '営業',
    kana: 'えいぎょう',
    romaji: 'eigyou',
    meaning: '营业，经营',
    type: '名词',
    examples: [
      { jp: '営業時間。', cn: '营业时间。' },
      { jp: '営業部。', cn: '营业部。' }
    ],
    level: 'N2',
    tags: ['商务']
  },
  {
    id: 'n2_027',
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
    tags: ['因果']
  },
  {
    id: 'n2_028',
    word: '衛生',
    kana: 'えいせい',
    romaji: 'eisei',
    meaning: '卫生',
    type: '名词',
    examples: [
      { jp: '衛生管理。', cn: '卫生管理。' },
      { jp: '衛生的な環境。', cn: '卫生的环境。' }
    ],
    level: 'N2',
    tags: ['健康']
  },
  {
    id: 'n2_029',
    word: '栄養',
    kana: 'えいよう',
    romaji: 'eiyou',
    meaning: '营养',
    type: '名词',
    examples: [
      { jp: '栄養バランス。', cn: '营养平衡。' },
      { jp: '栄養不足。', cn: '营养不足。' }
    ],
    level: 'N2',
    tags: ['健康']
  },
  {
    id: 'n2_030',
    word: '延期',
    kana: 'えんき',
    romaji: 'enki',
    meaning: '延期，推迟',
    type: '名词',
    examples: [
      { jp: '会議を延期する。', cn: '推迟会议。' },
      { jp: '試験の延期。', cn: '考试延期。' }
    ],
    level: 'N2',
    tags: ['时间']
  }
]

// 按类别分组
const n2Categories = {
  verbs: n2Vocabulary.filter(word => word.type === '动词'),
  adjectives: n2Vocabulary.filter(word => word.type === '形容词' || word.type === '形容动词'),
  nouns: n2Vocabulary.filter(word => word.type === '名词'),
  adverbs: n2Vocabulary.filter(word => word.type === '副词' || word.type === '名词/副词'),
  all: n2Vocabulary
}

// 获取随机N2词汇
function getRandomN2Words(count = 5, category = 'all') {
  const words = n2Categories[category] || n2Categories.all
  const shuffled = words.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// 搜索N2词汇
function searchN2Words(keyword) {
  return n2Vocabulary.filter(word => 
    word.word.includes(keyword) ||
    word.kana.includes(keyword) ||
    word.meaning.includes(keyword) ||
    word.romaji.includes(keyword)
  )
}

// 按标签获取词汇
function getN2WordsByTag(tag) {
  return n2Vocabulary.filter(word => word.tags.includes(tag))
}

// 获取所有标签
function getAllN2Tags() {
  const tags = new Set()
  n2Vocabulary.forEach(word => {
    word.tags.forEach(tag => tags.add(tag))
  })
  return Array.from(tags)
}

module.exports = {
  n2Vocabulary,
  n2Categories,
  getRandomN2Words,
  searchN2Words,
  getN2WordsByTag,
  getAllN2Tags
}