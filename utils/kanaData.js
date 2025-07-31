// 50音图数据
const kanaData = {
  // 平假名数据
  hiragana: {
    // 清音
    seion: [
      // あ行
      { kana: 'あ', romaji: 'a', row: 'a', type: 'seion' },
      { kana: 'い', romaji: 'i', row: 'a', type: 'seion' },
      { kana: 'う', romaji: 'u', row: 'a', type: 'seion' },
      { kana: 'え', romaji: 'e', row: 'a', type: 'seion' },
      { kana: 'お', romaji: 'o', row: 'a', type: 'seion' },
      // か行
      { kana: 'か', romaji: 'ka', row: 'ka', type: 'seion' },
      { kana: 'き', romaji: 'ki', row: 'ka', type: 'seion' },
      { kana: 'く', romaji: 'ku', row: 'ka', type: 'seion' },
      { kana: 'け', romaji: 'ke', row: 'ka', type: 'seion' },
      { kana: 'こ', romaji: 'ko', row: 'ka', type: 'seion' },
      // さ行
      { kana: 'さ', romaji: 'sa', row: 'sa', type: 'seion' },
      { kana: 'し', romaji: 'shi', row: 'sa', type: 'seion' },
      { kana: 'す', romaji: 'su', row: 'sa', type: 'seion' },
      { kana: 'せ', romaji: 'se', row: 'sa', type: 'seion' },
      { kana: 'そ', romaji: 'so', row: 'sa', type: 'seion' },
      // た行
      { kana: 'た', romaji: 'ta', row: 'ta', type: 'seion' },
      { kana: 'ち', romaji: 'chi', row: 'ta', type: 'seion' },
      { kana: 'つ', romaji: 'tsu', row: 'ta', type: 'seion' },
      { kana: 'て', romaji: 'te', row: 'ta', type: 'seion' },
      { kana: 'と', romaji: 'to', row: 'ta', type: 'seion' },
      // な行
      { kana: 'な', romaji: 'na', row: 'na', type: 'seion' },
      { kana: 'に', romaji: 'ni', row: 'na', type: 'seion' },
      { kana: 'ぬ', romaji: 'nu', row: 'na', type: 'seion' },
      { kana: 'ね', romaji: 'ne', row: 'na', type: 'seion' },
      { kana: 'の', romaji: 'no', row: 'na', type: 'seion' },
      // は行
      { kana: 'は', romaji: 'ha', row: 'ha', type: 'seion' },
      { kana: 'ひ', romaji: 'hi', row: 'ha', type: 'seion' },
      { kana: 'ふ', romaji: 'fu', row: 'ha', type: 'seion' },
      { kana: 'へ', romaji: 'he', row: 'ha', type: 'seion' },
      { kana: 'ほ', romaji: 'ho', row: 'ha', type: 'seion' },
      // ま行
      { kana: 'ま', romaji: 'ma', row: 'ma', type: 'seion' },
      { kana: 'み', romaji: 'mi', row: 'ma', type: 'seion' },
      { kana: 'む', romaji: 'mu', row: 'ma', type: 'seion' },
      { kana: 'め', romaji: 'me', row: 'ma', type: 'seion' },
      { kana: 'も', romaji: 'mo', row: 'ma', type: 'seion' },
      // や行
      { kana: 'や', romaji: 'ya', row: 'ya', type: 'seion' },
      { kana: '', romaji: '', row: 'ya', type: 'empty' },
      { kana: 'ゆ', romaji: 'yu', row: 'ya', type: 'seion' },
      { kana: '', romaji: '', row: 'ya', type: 'empty' },
      { kana: 'よ', romaji: 'yo', row: 'ya', type: 'seion' },
      // ら行
      { kana: 'ら', romaji: 'ra', row: 'ra', type: 'seion' },
      { kana: 'り', romaji: 'ri', row: 'ra', type: 'seion' },
      { kana: 'る', romaji: 'ru', row: 'ra', type: 'seion' },
      { kana: 'れ', romaji: 're', row: 'ra', type: 'seion' },
      { kana: 'ろ', romaji: 'ro', row: 'ra', type: 'seion' },
      // わ行
      { kana: 'わ', romaji: 'wa', row: 'wa', type: 'seion' },
      { kana: '', romaji: '', row: 'wa', type: 'empty' },
      { kana: '', romaji: '', row: 'wa', type: 'empty' },
      { kana: '', romaji: '', row: 'wa', type: 'empty' },
      { kana: 'を', romaji: 'wo', row: 'wa', type: 'seion' },
      // ん
      { kana: 'ん', romaji: 'n', row: 'n', type: 'seion' }
    ],
    // 浊音
    dakuon: [
      // が行
      { kana: 'が', romaji: 'ga', row: 'ga', type: 'dakuon' },
      { kana: 'ぎ', romaji: 'gi', row: 'ga', type: 'dakuon' },
      { kana: 'ぐ', romaji: 'gu', row: 'ga', type: 'dakuon' },
      { kana: 'げ', romaji: 'ge', row: 'ga', type: 'dakuon' },
      { kana: 'ご', romaji: 'go', row: 'ga', type: 'dakuon' },
      // ざ行
      { kana: 'ざ', romaji: 'za', row: 'za', type: 'dakuon' },
      { kana: 'じ', romaji: 'ji', row: 'za', type: 'dakuon' },
      { kana: 'ず', romaji: 'zu', row: 'za', type: 'dakuon' },
      { kana: 'ぜ', romaji: 'ze', row: 'za', type: 'dakuon' },
      { kana: 'ぞ', romaji: 'zo', row: 'za', type: 'dakuon' },
      // だ行
      { kana: 'だ', romaji: 'da', row: 'da', type: 'dakuon' },
      { kana: 'ぢ', romaji: 'ji', row: 'da', type: 'dakuon' },
      { kana: 'づ', romaji: 'zu', row: 'da', type: 'dakuon' },
      { kana: 'で', romaji: 'de', row: 'da', type: 'dakuon' },
      { kana: 'ど', romaji: 'do', row: 'da', type: 'dakuon' },
      // ば行
      { kana: 'ば', romaji: 'ba', row: 'ba', type: 'dakuon' },
      { kana: 'び', romaji: 'bi', row: 'ba', type: 'dakuon' },
      { kana: 'ぶ', romaji: 'bu', row: 'ba', type: 'dakuon' },
      { kana: 'べ', romaji: 'be', row: 'ba', type: 'dakuon' },
      { kana: 'ぼ', romaji: 'bo', row: 'ba', type: 'dakuon' }
    ],
    // 半浊音
    handakuon: [
      // ぱ行
      { kana: 'ぱ', romaji: 'pa', row: 'pa', type: 'handakuon' },
      { kana: 'ぴ', romaji: 'pi', row: 'pa', type: 'handakuon' },
      { kana: 'ぷ', romaji: 'pu', row: 'pa', type: 'handakuon' },
      { kana: 'ぺ', romaji: 'pe', row: 'pa', type: 'handakuon' },
      { kana: 'ぽ', romaji: 'po', row: 'pa', type: 'handakuon' }
    ],
    // 拗音
    youon: [
      // きゃ行
      { kana: 'きゃ', romaji: 'kya', type: 'youon' },
      { kana: 'きゅ', romaji: 'kyu', type: 'youon' },
      { kana: 'きょ', romaji: 'kyo', type: 'youon' },
      // しゃ行
      { kana: 'しゃ', romaji: 'sha', type: 'youon' },
      { kana: 'しゅ', romaji: 'shu', type: 'youon' },
      { kana: 'しょ', romaji: 'sho', type: 'youon' },
      // ちゃ行
      { kana: 'ちゃ', romaji: 'cha', type: 'youon' },
      { kana: 'ちゅ', romaji: 'chu', type: 'youon' },
      { kana: 'ちょ', romaji: 'cho', type: 'youon' },
      // にゃ行
      { kana: 'にゃ', romaji: 'nya', type: 'youon' },
      { kana: 'にゅ', romaji: 'nyu', type: 'youon' },
      { kana: 'にょ', romaji: 'nyo', type: 'youon' },
      // ひゃ行
      { kana: 'ひゃ', romaji: 'hya', type: 'youon' },
      { kana: 'ひゅ', romaji: 'hyu', type: 'youon' },
      { kana: 'ひょ', romaji: 'hyo', type: 'youon' },
      // みゃ行
      { kana: 'みゃ', romaji: 'mya', type: 'youon' },
      { kana: 'みゅ', romaji: 'myu', type: 'youon' },
      { kana: 'みょ', romaji: 'myo', type: 'youon' },
      // りゃ行
      { kana: 'りゃ', romaji: 'rya', type: 'youon' },
      { kana: 'りゅ', romaji: 'ryu', type: 'youon' },
      { kana: 'りょ', romaji: 'ryo', type: 'youon' },
      // ぎゃ行
      { kana: 'ぎゃ', romaji: 'gya', type: 'youon' },
      { kana: 'ぎゅ', romaji: 'gyu', type: 'youon' },
      { kana: 'ぎょ', romaji: 'gyo', type: 'youon' },
      // じゃ行
      { kana: 'じゃ', romaji: 'ja', type: 'youon' },
      { kana: 'じゅ', romaji: 'ju', type: 'youon' },
      { kana: 'じょ', romaji: 'jo', type: 'youon' },
      // びゃ行
      { kana: 'びゃ', romaji: 'bya', type: 'youon' },
      { kana: 'びゅ', romaji: 'byu', type: 'youon' },
      { kana: 'びょ', romaji: 'byo', type: 'youon' },
      // ぴゃ行
      { kana: 'ぴゃ', romaji: 'pya', type: 'youon' },
      { kana: 'ぴゅ', romaji: 'pyu', type: 'youon' },
      { kana: 'ぴょ', romaji: 'pyo', type: 'youon' }
    ]
  },
  // 片假名数据
  katakana: {
    // 清音
    seion: [
      // ア行
      { kana: 'ア', romaji: 'a', row: 'a', type: 'seion' },
      { kana: 'イ', romaji: 'i', row: 'a', type: 'seion' },
      { kana: 'ウ', romaji: 'u', row: 'a', type: 'seion' },
      { kana: 'エ', romaji: 'e', row: 'a', type: 'seion' },
      { kana: 'オ', romaji: 'o', row: 'a', type: 'seion' },
      // カ行
      { kana: 'カ', romaji: 'ka', row: 'ka', type: 'seion' },
      { kana: 'キ', romaji: 'ki', row: 'ka', type: 'seion' },
      { kana: 'ク', romaji: 'ku', row: 'ka', type: 'seion' },
      { kana: 'ケ', romaji: 'ke', row: 'ka', type: 'seion' },
      { kana: 'コ', romaji: 'ko', row: 'ka', type: 'seion' },
      // サ行
      { kana: 'サ', romaji: 'sa', row: 'sa', type: 'seion' },
      { kana: 'シ', romaji: 'shi', row: 'sa', type: 'seion' },
      { kana: 'ス', romaji: 'su', row: 'sa', type: 'seion' },
      { kana: 'セ', romaji: 'se', row: 'sa', type: 'seion' },
      { kana: 'ソ', romaji: 'so', row: 'sa', type: 'seion' },
      // タ行
      { kana: 'タ', romaji: 'ta', row: 'ta', type: 'seion' },
      { kana: 'チ', romaji: 'chi', row: 'ta', type: 'seion' },
      { kana: 'ツ', romaji: 'tsu', row: 'ta', type: 'seion' },
      { kana: 'テ', romaji: 'te', row: 'ta', type: 'seion' },
      { kana: 'ト', romaji: 'to', row: 'ta', type: 'seion' },
      // ナ行
      { kana: 'ナ', romaji: 'na', row: 'na', type: 'seion' },
      { kana: 'ニ', romaji: 'ni', row: 'na', type: 'seion' },
      { kana: 'ヌ', romaji: 'nu', row: 'na', type: 'seion' },
      { kana: 'ネ', romaji: 'ne', row: 'na', type: 'seion' },
      { kana: 'ノ', romaji: 'no', row: 'na', type: 'seion' },
      // ハ行
      { kana: 'ハ', romaji: 'ha', row: 'ha', type: 'seion' },
      { kana: 'ヒ', romaji: 'hi', row: 'ha', type: 'seion' },
      { kana: 'フ', romaji: 'fu', row: 'ha', type: 'seion' },
      { kana: 'ヘ', romaji: 'he', row: 'ha', type: 'seion' },
      { kana: 'ホ', romaji: 'ho', row: 'ha', type: 'seion' },
      // マ行
      { kana: 'マ', romaji: 'ma', row: 'ma', type: 'seion' },
      { kana: 'ミ', romaji: 'mi', row: 'ma', type: 'seion' },
      { kana: 'ム', romaji: 'mu', row: 'ma', type: 'seion' },
      { kana: 'メ', romaji: 'me', row: 'ma', type: 'seion' },
      { kana: 'モ', romaji: 'mo', row: 'ma', type: 'seion' },
      // ヤ行
      { kana: 'ヤ', romaji: 'ya', row: 'ya', type: 'seion' },
      { kana: '', romaji: '', row: 'ya', type: 'empty' },
      { kana: 'ユ', romaji: 'yu', row: 'ya', type: 'seion' },
      { kana: '', romaji: '', row: 'ya', type: 'empty' },
      { kana: 'ヨ', romaji: 'yo', row: 'ya', type: 'seion' },
      // ラ行
      { kana: 'ラ', romaji: 'ra', row: 'ra', type: 'seion' },
      { kana: 'リ', romaji: 'ri', row: 'ra', type: 'seion' },
      { kana: 'ル', romaji: 'ru', row: 'ra', type: 'seion' },
      { kana: 'レ', romaji: 're', row: 'ra', type: 'seion' },
      { kana: 'ロ', romaji: 'ro', row: 'ra', type: 'seion' },
      // ワ行
      { kana: 'ワ', romaji: 'wa', row: 'wa', type: 'seion' },
      { kana: '', romaji: '', row: 'wa', type: 'empty' },
      { kana: '', romaji: '', row: 'wa', type: 'empty' },
      { kana: '', romaji: '', row: 'wa', type: 'empty' },
      { kana: 'ヲ', romaji: 'wo', row: 'wa', type: 'seion' },
      // ン
      { kana: 'ン', romaji: 'n', row: 'n', type: 'seion' }
    ],
    // 浊音
    dakuon: [
      // ガ行
      { kana: 'ガ', romaji: 'ga', row: 'ga', type: 'dakuon' },
      { kana: 'ギ', romaji: 'gi', row: 'ga', type: 'dakuon' },
      { kana: 'グ', romaji: 'gu', row: 'ga', type: 'dakuon' },
      { kana: 'ゲ', romaji: 'ge', row: 'ga', type: 'dakuon' },
      { kana: 'ゴ', romaji: 'go', row: 'ga', type: 'dakuon' },
      // ザ行
      { kana: 'ザ', romaji: 'za', row: 'za', type: 'dakuon' },
      { kana: 'ジ', romaji: 'ji', row: 'za', type: 'dakuon' },
      { kana: 'ズ', romaji: 'zu', row: 'za', type: 'dakuon' },
      { kana: 'ゼ', romaji: 'ze', row: 'za', type: 'dakuon' },
      { kana: 'ゾ', romaji: 'zo', row: 'za', type: 'dakuon' },
      // ダ行
      { kana: 'ダ', romaji: 'da', row: 'da', type: 'dakuon' },
      { kana: 'ヂ', romaji: 'ji', row: 'da', type: 'dakuon' },
      { kana: 'ヅ', romaji: 'zu', row: 'da', type: 'dakuon' },
      { kana: 'デ', romaji: 'de', row: 'da', type: 'dakuon' },
      { kana: 'ド', romaji: 'do', row: 'da', type: 'dakuon' },
      // バ行
      { kana: 'バ', romaji: 'ba', row: 'ba', type: 'dakuon' },
      { kana: 'ビ', romaji: 'bi', row: 'ba', type: 'dakuon' },
      { kana: 'ブ', romaji: 'bu', row: 'ba', type: 'dakuon' },
      { kana: 'ベ', romaji: 'be', row: 'ba', type: 'dakuon' },
      { kana: 'ボ', romaji: 'bo', row: 'ba', type: 'dakuon' }
    ],
    // 半浊音
    handakuon: [
      // パ行
      { kana: 'パ', romaji: 'pa', row: 'pa', type: 'handakuon' },
      { kana: 'ピ', romaji: 'pi', row: 'pa', type: 'handakuon' },
      { kana: 'プ', romaji: 'pu', row: 'pa', type: 'handakuon' },
      { kana: 'ペ', romaji: 'pe', row: 'pa', type: 'handakuon' },
      { kana: 'ポ', romaji: 'po', row: 'pa', type: 'handakuon' }
    ],
    // 拗音
    youon: [
      // キャ行
      { kana: 'キャ', romaji: 'kya', type: 'youon' },
      { kana: 'キュ', romaji: 'kyu', type: 'youon' },
      { kana: 'キョ', romaji: 'kyo', type: 'youon' },
      // シャ行
      { kana: 'シャ', romaji: 'sha', type: 'youon' },
      { kana: 'シュ', romaji: 'shu', type: 'youon' },
      { kana: 'ショ', romaji: 'sho', type: 'youon' },
      // チャ行
      { kana: 'チャ', romaji: 'cha', type: 'youon' },
      { kana: 'チュ', romaji: 'chu', type: 'youon' },
      { kana: 'チョ', romaji: 'cho', type: 'youon' },
      // ニャ行
      { kana: 'ニャ', romaji: 'nya', type: 'youon' },
      { kana: 'ニュ', romaji: 'nyu', type: 'youon' },
      { kana: 'ニョ', romaji: 'nyo', type: 'youon' },
      // ヒャ行
      { kana: 'ヒャ', romaji: 'hya', type: 'youon' },
      { kana: 'ヒュ', romaji: 'hyu', type: 'youon' },
      { kana: 'ヒョ', romaji: 'hyo', type: 'youon' },
      // ミャ行
      { kana: 'ミャ', romaji: 'mya', type: 'youon' },
      { kana: 'ミュ', romaji: 'myu', type: 'youon' },
      { kana: 'ミョ', romaji: 'myo', type: 'youon' },
      // リャ行
      { kana: 'リャ', romaji: 'rya', type: 'youon' },
      { kana: 'リュ', romaji: 'ryu', type: 'youon' },
      { kana: 'リョ', romaji: 'ryo', type: 'youon' },
      // ギャ行
      { kana: 'ギャ', romaji: 'gya', type: 'youon' },
      { kana: 'ギュ', romaji: 'gyu', type: 'youon' },
      { kana: 'ギョ', romaji: 'gyo', type: 'youon' },
      // ジャ行
      { kana: 'ジャ', romaji: 'ja', type: 'youon' },
      { kana: 'ジュ', romaji: 'ju', type: 'youon' },
      { kana: 'ジョ', romaji: 'jo', type: 'youon' },
      // ビャ行
      { kana: 'ビャ', romaji: 'bya', type: 'youon' },
      { kana: 'ビュ', romaji: 'byu', type: 'youon' },
      { kana: 'ビョ', romaji: 'byo', type: 'youon' },
      // ピャ行
      { kana: 'ピャ', romaji: 'pya', type: 'youon' },
      { kana: 'ピュ', romaji: 'pyu', type: 'youon' },
      { kana: 'ピョ', romaji: 'pyo', type: 'youon' }
    ]
  }
};

// 获取行标题
const rowTitles = {
  'a': 'あ行',
  'ka': 'か行',
  'sa': 'さ行',
  'ta': 'た行',
  'na': 'な行',
  'ha': 'は行',
  'ma': 'ま行',
  'ya': 'や行',
  'ra': 'ら行',
  'wa': 'わ行',
  'n': 'ん',
  'ga': 'が行',
  'za': 'ざ行',
  'da': 'だ行',
  'ba': 'ば行',
  'pa': 'ぱ行'
};

// 获取列标题
const columnTitles = ['あ', 'い', 'う', 'え', 'お'];

module.exports = {
  kanaData,
  rowTitles,
  columnTitles
};