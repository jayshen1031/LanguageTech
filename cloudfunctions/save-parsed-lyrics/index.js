const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { lyrics, parseType = 'lyrics' } = event;
  
  try {
    // 分段解析歌词
    const segments = lyrics.split('\n\n').filter(s => s.trim());
    const parsedSegments = [];
    
    for (let segment of segments) {
      const lines = segment.split('\n').filter(l => l.trim());
      const parsedLines = lines.map(line => {
        // 基础解析结构
        return {
          original: line,
          romaji: extractRomaji(line),
          hasKanji: /[\u4e00-\u9fff]/.test(line),
          vocabulary: extractKeyWords(line)
        };
      });
      
      parsedSegments.push({
        text: segment,
        lines: parsedLines,
        type: 'verse'
      });
    }
    
    // 先检查是否已存在相同内容
    const existingRecord = await db.collection('japanese_parser_history')
      .where({
        _openid: wxContext.OPENID,
        inputText: lyrics,
        inputMethod: 'text'
      })
      .limit(1)
      .get();
    
    if (existingRecord.data.length > 0) {
      // console.log('歌词内容已存在，返回已有记录');
      return {
        code: 200,
        data: {
          _id: existingRecord.data[0]._id,
          segmentCount: parsedSegments.length
        },
        msg: '歌词已存在历史记录中'
      };
    }
    
    // 保存到数据库
    const result = await db.collection('japanese_parser_history').add({
      data: {
        _openid: wxContext.OPENID,
        inputText: lyrics,
        inputMethod: 'text',
        parseType: parseType,
        segments: parsedSegments,
        favorite: false,
        createTime: new Date(),
        updateTime: new Date()
      }
    });
    
    return {
      code: 200,
      data: {
        _id: result._id,
        segmentCount: parsedSegments.length
      },
      msg: '歌词已保存，可在历史记录中查看'
    };
    
  } catch (err) {
    console.error('保存失败：', err);
    return {
      code: 500,
      msg: '保存失败',
      error: err.toString()
    };
  }
};

// 提取假名读音
function extractRomaji(text) {
  const match = text.match(/[（(]([^)）]+)[)）]/);
  return match ? match[1] : '';
}

// 提取关键词汇
function extractKeyWords(text) {
  const keywords = [];
  
  // 提取常见词汇模式
  const patterns = [
    /海/g,
    /歩[くけ]/g,
    /君/g,
    /俺/g,
    /待[つっ]/g,
    /見[るえ]/g,
    /忘れ/g,
    /命[運运]/g
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(word => {
        if (!keywords.some(k => k.japanese === word)) {
          keywords.push({
            japanese: word,
            position: text.indexOf(word)
          });
        }
      });
    }
  });
  
  return keywords.sort((a, b) => a.position - b.position);
}