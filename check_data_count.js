// 检查数据库中解析记录和词汇的实际数量
// 请在微信开发者工具控制台中运行此脚本

console.log('开始检查数据库中的数据量...');

// 检查解析记录总数
wx.cloud.database().collection('parseHistory').count()
  .then(res => {
    console.log('📝 解析记录总数:', res.total);
    
    // 检查词汇整合表总数
    return wx.cloud.database().collection('vocabularyIntegration').count();
  })
  .then(res => {
    console.log('📚 词汇整合表总数:', res.total);
    
    // 检查生词本总数
    return wx.cloud.database().collection('vocabulary').count();
  })
  .then(res => {
    console.log('📖 生词本总数:', res.total);
    
    // 获取最近的解析记录样本
    return wx.cloud.database().collection('parseHistory')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
  })
  .then(res => {
    console.log('🔍 最近5条解析记录:');
    res.data.forEach((record, index) => {
      const wordsCount = record.words ? record.words.length : 0;
      console.log(`${index + 1}. ${record.createdAt} - 包含 ${wordsCount} 个单词`);
    });
    
    // 计算总词汇量估算
    return wx.cloud.database().collection('parseHistory')
      .orderBy('createdAt', 'desc')
      .limit(1000) // 获取最近1000条记录进行估算
      .get();
  })
  .then(res => {
    let totalWords = 0;
    res.data.forEach(record => {
      if (record.words && Array.isArray(record.words)) {
        totalWords += record.words.length;
      }
    });
    
    console.log(`📊 基于最近${res.data.length}条记录的词汇量估算: ${totalWords} 个单词`);
    
    if (res.data.length === 1000) {
      console.log('⚠️ 数据可能超过1000条记录，实际词汇量可能更多');
    }
    
    console.log('\n💡 建议的修复方案:');
    console.log('1. 移除前端20/100条限制');
    console.log('2. 云函数支持分批处理大量数据');
    console.log('3. 添加进度显示和错误处理');
  })
  .catch(err => {
    console.error('检查数据量时出错:', err);
  });