// 合并的平假名和片假名数据
// 每个条目包含平假名、片假名和罗马音

const mergedKanaData = {
  // 清音（五十音图基础）
  seion: [
    // あ行 / ア行
    { hiragana: 'あ', katakana: 'ア', romaji: 'a', row: 'a', type: 'seion' },
    { hiragana: 'い', katakana: 'イ', romaji: 'i', row: 'a', type: 'seion' },
    { hiragana: 'う', katakana: 'ウ', romaji: 'u', row: 'a', type: 'seion' },
    { hiragana: 'え', katakana: 'エ', romaji: 'e', row: 'a', type: 'seion' },
    { hiragana: 'お', katakana: 'オ', romaji: 'o', row: 'a', type: 'seion' },
    
    // か行 / カ行
    { hiragana: 'か', katakana: 'カ', romaji: 'ka', row: 'ka', type: 'seion' },
    { hiragana: 'き', katakana: 'キ', romaji: 'ki', row: 'ka', type: 'seion' },
    { hiragana: 'く', katakana: 'ク', romaji: 'ku', row: 'ka', type: 'seion' },
    { hiragana: 'け', katakana: 'ケ', romaji: 'ke', row: 'ka', type: 'seion' },
    { hiragana: 'こ', katakana: 'コ', romaji: 'ko', row: 'ka', type: 'seion' },
    
    // さ行 / サ行
    { hiragana: 'さ', katakana: 'サ', romaji: 'sa', row: 'sa', type: 'seion' },
    { hiragana: 'し', katakana: 'シ', romaji: 'shi', row: 'sa', type: 'seion' },
    { hiragana: 'す', katakana: 'ス', romaji: 'su', row: 'sa', type: 'seion' },
    { hiragana: 'せ', katakana: 'セ', romaji: 'se', row: 'sa', type: 'seion' },
    { hiragana: 'そ', katakana: 'ソ', romaji: 'so', row: 'sa', type: 'seion' },
    
    // た行 / タ行
    { hiragana: 'た', katakana: 'タ', romaji: 'ta', row: 'ta', type: 'seion' },
    { hiragana: 'ち', katakana: 'チ', romaji: 'chi', row: 'ta', type: 'seion' },
    { hiragana: 'つ', katakana: 'ツ', romaji: 'tsu', row: 'ta', type: 'seion' },
    { hiragana: 'て', katakana: 'テ', romaji: 'te', row: 'ta', type: 'seion' },
    { hiragana: 'と', katakana: 'ト', romaji: 'to', row: 'ta', type: 'seion' },
    
    // な行 / ナ行
    { hiragana: 'な', katakana: 'ナ', romaji: 'na', row: 'na', type: 'seion' },
    { hiragana: 'に', katakana: 'ニ', romaji: 'ni', row: 'na', type: 'seion' },
    { hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu', row: 'na', type: 'seion' },
    { hiragana: 'ね', katakana: 'ネ', romaji: 'ne', row: 'na', type: 'seion' },
    { hiragana: 'の', katakana: 'ノ', romaji: 'no', row: 'na', type: 'seion' },
    
    // は行 / ハ行
    { hiragana: 'は', katakana: 'ハ', romaji: 'ha', row: 'ha', type: 'seion' },
    { hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi', row: 'ha', type: 'seion' },
    { hiragana: 'ふ', katakana: 'フ', romaji: 'fu', row: 'ha', type: 'seion' },
    { hiragana: 'へ', katakana: 'ヘ', romaji: 'he', row: 'ha', type: 'seion' },
    { hiragana: 'ほ', katakana: 'ホ', romaji: 'ho', row: 'ha', type: 'seion' },
    
    // ま行 / マ行
    { hiragana: 'ま', katakana: 'マ', romaji: 'ma', row: 'ma', type: 'seion' },
    { hiragana: 'み', katakana: 'ミ', romaji: 'mi', row: 'ma', type: 'seion' },
    { hiragana: 'む', katakana: 'ム', romaji: 'mu', row: 'ma', type: 'seion' },
    { hiragana: 'め', katakana: 'メ', romaji: 'me', row: 'ma', type: 'seion' },
    { hiragana: 'も', katakana: 'モ', romaji: 'mo', row: 'ma', type: 'seion' },
    
    // や行 / ヤ行
    { hiragana: 'や', katakana: 'ヤ', romaji: 'ya', row: 'ya', type: 'seion' },
    { hiragana: '', katakana: '', romaji: '', row: 'ya', type: 'empty' },
    { hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu', row: 'ya', type: 'seion' },
    { hiragana: '', katakana: '', romaji: '', row: 'ya', type: 'empty' },
    { hiragana: 'よ', katakana: 'ヨ', romaji: 'yo', row: 'ya', type: 'seion' },
    
    // ら行 / ラ行
    { hiragana: 'ら', katakana: 'ラ', romaji: 'ra', row: 'ra', type: 'seion' },
    { hiragana: 'り', katakana: 'リ', romaji: 'ri', row: 'ra', type: 'seion' },
    { hiragana: 'る', katakana: 'ル', romaji: 'ru', row: 'ra', type: 'seion' },
    { hiragana: 'れ', katakana: 'レ', romaji: 're', row: 'ra', type: 'seion' },
    { hiragana: 'ろ', katakana: 'ロ', romaji: 'ro', row: 'ra', type: 'seion' },
    
    // わ行 / ワ行
    { hiragana: 'わ', katakana: 'ワ', romaji: 'wa', row: 'wa', type: 'seion' },
    { hiragana: '', katakana: '', romaji: '', row: 'wa', type: 'empty' },
    { hiragana: '', katakana: '', romaji: '', row: 'wa', type: 'empty' },
    { hiragana: '', katakana: '', romaji: '', row: 'wa', type: 'empty' },
    { hiragana: 'を', katakana: 'ヲ', romaji: 'wo', row: 'wa', type: 'seion' },
    
    // ん / ン
    { hiragana: 'ん', katakana: 'ン', romaji: 'n', row: 'n', type: 'seion' }
  ],
  
  // 浊音
  dakuon: [
    // が行 / ガ行
    { hiragana: 'が', katakana: 'ガ', romaji: 'ga', row: 'ga', type: 'dakuon' },
    { hiragana: 'ぎ', katakana: 'ギ', romaji: 'gi', row: 'ga', type: 'dakuon' },
    { hiragana: 'ぐ', katakana: 'グ', romaji: 'gu', row: 'ga', type: 'dakuon' },
    { hiragana: 'げ', katakana: 'ゲ', romaji: 'ge', row: 'ga', type: 'dakuon' },
    { hiragana: 'ご', katakana: 'ゴ', romaji: 'go', row: 'ga', type: 'dakuon' },
    
    // ざ行 / ザ行
    { hiragana: 'ざ', katakana: 'ザ', romaji: 'za', row: 'za', type: 'dakuon' },
    { hiragana: 'じ', katakana: 'ジ', romaji: 'ji', row: 'za', type: 'dakuon' },
    { hiragana: 'ず', katakana: 'ズ', romaji: 'zu', row: 'za', type: 'dakuon' },
    { hiragana: 'ぜ', katakana: 'ゼ', romaji: 'ze', row: 'za', type: 'dakuon' },
    { hiragana: 'ぞ', katakana: 'ゾ', romaji: 'zo', row: 'za', type: 'dakuon' },
    
    // だ行 / ダ行
    { hiragana: 'だ', katakana: 'ダ', romaji: 'da', row: 'da', type: 'dakuon' },
    { hiragana: 'ぢ', katakana: 'ヂ', romaji: 'ji', row: 'da', type: 'dakuon' },
    { hiragana: 'づ', katakana: 'ヅ', romaji: 'zu', row: 'da', type: 'dakuon' },
    { hiragana: 'で', katakana: 'デ', romaji: 'de', row: 'da', type: 'dakuon' },
    { hiragana: 'ど', katakana: 'ド', romaji: 'do', row: 'da', type: 'dakuon' },
    
    // ば行 / バ行
    { hiragana: 'ば', katakana: 'バ', romaji: 'ba', row: 'ba', type: 'dakuon' },
    { hiragana: 'び', katakana: 'ビ', romaji: 'bi', row: 'ba', type: 'dakuon' },
    { hiragana: 'ぶ', katakana: 'ブ', romaji: 'bu', row: 'ba', type: 'dakuon' },
    { hiragana: 'べ', katakana: 'ベ', romaji: 'be', row: 'ba', type: 'dakuon' },
    { hiragana: 'ぼ', katakana: 'ボ', romaji: 'bo', row: 'ba', type: 'dakuon' }
  ],
  
  // 半浊音
  handakuon: [
    // ぱ行 / パ行
    { hiragana: 'ぱ', katakana: 'パ', romaji: 'pa', row: 'pa', type: 'handakuon' },
    { hiragana: 'ぴ', katakana: 'ピ', romaji: 'pi', row: 'pa', type: 'handakuon' },
    { hiragana: 'ぷ', katakana: 'プ', romaji: 'pu', row: 'pa', type: 'handakuon' },
    { hiragana: 'ぺ', katakana: 'ペ', romaji: 'pe', row: 'pa', type: 'handakuon' },
    { hiragana: 'ぽ', katakana: 'ポ', romaji: 'po', row: 'pa', type: 'handakuon' }
  ],
  
  // 拗音（组合音）
  youon: [
    // き + ゃ、ゅ、ょ
    { hiragana: 'きゃ', katakana: 'キャ', romaji: 'kya', type: 'youon' },
    { hiragana: 'きゅ', katakana: 'キュ', romaji: 'kyu', type: 'youon' },
    { hiragana: 'きょ', katakana: 'キョ', romaji: 'kyo', type: 'youon' },
    
    // し + ゃ、ゅ、ょ
    { hiragana: 'しゃ', katakana: 'シャ', romaji: 'sha', type: 'youon' },
    { hiragana: 'しゅ', katakana: 'シュ', romaji: 'shu', type: 'youon' },
    { hiragana: 'しょ', katakana: 'ショ', romaji: 'sho', type: 'youon' },
    
    // ち + ゃ、ゅ、ょ
    { hiragana: 'ちゃ', katakana: 'チャ', romaji: 'cha', type: 'youon' },
    { hiragana: 'ちゅ', katakana: 'チュ', romaji: 'chu', type: 'youon' },
    { hiragana: 'ちょ', katakana: 'チョ', romaji: 'cho', type: 'youon' },
    
    // に + ゃ、ゅ、ょ
    { hiragana: 'にゃ', katakana: 'ニャ', romaji: 'nya', type: 'youon' },
    { hiragana: 'にゅ', katakana: 'ニュ', romaji: 'nyu', type: 'youon' },
    { hiragana: 'にょ', katakana: 'ニョ', romaji: 'nyo', type: 'youon' },
    
    // ひ + ゃ、ゅ、ょ
    { hiragana: 'ひゃ', katakana: 'ヒャ', romaji: 'hya', type: 'youon' },
    { hiragana: 'ひゅ', katakana: 'ヒュ', romaji: 'hyu', type: 'youon' },
    { hiragana: 'ひょ', katakana: 'ヒョ', romaji: 'hyo', type: 'youon' },
    
    // み + ゃ、ゅ、ょ
    { hiragana: 'みゃ', katakana: 'ミャ', romaji: 'mya', type: 'youon' },
    { hiragana: 'みゅ', katakana: 'ミュ', romaji: 'myu', type: 'youon' },
    { hiragana: 'みょ', katakana: 'ミョ', romaji: 'myo', type: 'youon' },
    
    // り + ゃ、ゅ、ょ
    { hiragana: 'りゃ', katakana: 'リャ', romaji: 'rya', type: 'youon' },
    { hiragana: 'りゅ', katakana: 'リュ', romaji: 'ryu', type: 'youon' },
    { hiragana: 'りょ', katakana: 'リョ', romaji: 'ryo', type: 'youon' },
    
    // ぎ + ゃ、ゅ、ょ
    { hiragana: 'ぎゃ', katakana: 'ギャ', romaji: 'gya', type: 'youon' },
    { hiragana: 'ぎゅ', katakana: 'ギュ', romaji: 'gyu', type: 'youon' },
    { hiragana: 'ぎょ', katakana: 'ギョ', romaji: 'gyo', type: 'youon' },
    
    // じ + ゃ、ゅ、ょ
    { hiragana: 'じゃ', katakana: 'ジャ', romaji: 'ja', type: 'youon' },
    { hiragana: 'じゅ', katakana: 'ジュ', romaji: 'ju', type: 'youon' },
    { hiragana: 'じょ', katakana: 'ジョ', romaji: 'jo', type: 'youon' },
    
    // び + ゃ、ゅ、ょ
    { hiragana: 'びゃ', katakana: 'ビャ', romaji: 'bya', type: 'youon' },
    { hiragana: 'びゅ', katakana: 'ビュ', romaji: 'byu', type: 'youon' },
    { hiragana: 'びょ', katakana: 'ビョ', romaji: 'byo', type: 'youon' },
    
    // ぴ + ゃ、ゅ、ょ
    { hiragana: 'ぴゃ', katakana: 'ピャ', romaji: 'pya', type: 'youon' },
    { hiragana: 'ぴゅ', katakana: 'ピュ', romaji: 'pyu', type: 'youon' },
    { hiragana: 'ぴょ', katakana: 'ピョ', romaji: 'pyo', type: 'youon' }
  ]
}

// 便捷访问函数
const getMergedKana = {
  // 获取所有假名（按类型）
  getAllByType: function(type = 'seion') {
    return mergedKanaData[type] || []
  },
  
  // 获取所有假名（平铺）
  getAll: function() {
    return [
      ...mergedKanaData.seion,
      ...mergedKanaData.dakuon,
      ...mergedKanaData.handakuon,
      ...mergedKanaData.youon
    ]
  },
  
  // 根据罗马音查找
  findByRomaji: function(romaji) {
    const all = this.getAll()
    return all.find(item => item.romaji === romaji)
  },
  
  // 根据平假名查找
  findByHiragana: function(hiragana) {
    const all = this.getAll()
    return all.find(item => item.hiragana === hiragana)
  },
  
  // 根据片假名查找
  findByKatakana: function(katakana) {
    const all = this.getAll()
    return all.find(item => item.katakana === katakana)
  },
  
  // 获取随机假名（用于练习）
  getRandom: function(type = null, count = 1) {
    let pool = type ? mergedKanaData[type] : this.getAll()
    pool = pool.filter(item => item.type !== 'empty')
    
    const result = []
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length)
      result.push(pool[randomIndex])
    }
    
    return count === 1 ? result[0] : result
  }
}

// 导出
module.exports = {
  mergedKanaData,
  getMergedKana
}