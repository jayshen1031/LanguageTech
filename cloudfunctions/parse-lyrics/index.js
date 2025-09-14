const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { text } = event;
  
  try {
    // 简单的歌词解析和保存
    const lines = text.split('\n').filter(line => line.trim());
    const parsedLines = [];
    
    for (let line of lines) {
      // 提取括号中的假名
      const furiganaMatch = line.match(/（([^）]+)）/g);
      let cleanLine = line;
      let furigana = [];
      
      if (furiganaMatch) {
        furiganaMatch.forEach(match => {
          const reading = match.replace(/[（）]/g, '');
          furigana.push(reading);
          cleanLine = cleanLine.replace(match, '');
        });
      }
      
      parsedLines.push({
        original: line,
        text: cleanLine.trim(),
        furigana: furigana,
        hasKanji: /[\u4e00-\u9fff]/.test(cleanLine)
      });
    }
    
    // 先检查是否已存在相同内容
    const existingRecord = await db.collection('japanese_parser_history')
      .where({
        _openid: wxContext.OPENID,
        inputText: text,
        inputMethod: 'text'
      })
      .limit(1)
      .get();
    
    if (existingRecord.data.length > 0) {
      // console.log('歌词已存在，返回已有记录');
      return {
        success: true,
        data: {
          _id: existingRecord.data[0]._id,
          lineCount: parsedLines.length,
          message: '歌词已存在历史记录中'
        }
      };
    }
    
    // 保存到数据库
    const result = await db.collection('japanese_parser_history').add({
      data: {
        _openid: wxContext.OPENID,
        inputText: text,
        inputMethod: 'text',
        sentences: [{
          originalText: text,
          lines: parsedLines,
          structure: '歌词文本',
          analysis: '歌词已保存，可逐行学习'
        }],
        favorite: false,
        createTime: new Date(),
        updateTime: new Date()
      }
    });
    
    return {
      success: true,
      data: {
        _id: result._id,
        lineCount: parsedLines.length,
        message: '歌词已保存到历史记录'
      }
    };
    
  } catch (error) {
    console.error('解析失败：', error);
    return {
      success: false,
      error: error.toString()
    };
  }
};