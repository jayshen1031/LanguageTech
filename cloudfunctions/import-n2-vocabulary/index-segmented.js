// 分段导入N2词汇到数据库（避免超时）
const cloud = require('wx-server-sdk');
const n2Data = require('./n2_2000_complete.json');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { 
    action = 'importSegment',
    startIndex = 0,
    endIndex = 100,
    clearExisting = false 
  } = event;

  try {
    switch (action) {
      case 'importSegment':
        // 分段导入词汇
        return await importVocabularySegment(startIndex, endIndex, clearExisting);
      
      case 'getImportStatus':
        // 获取导入状态
        return await getImportStatus();
      
      case 'clearAll':
        // 清空所有N2词汇
        return await clearAllN2Vocabulary();
      
      default:
        return { success: false, message: '未知操作' };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};

// 分段导入词汇数据
async function importVocabularySegment(startIndex = 0, endIndex = 100, clearExisting = false) {
  const collection = db.collection('n2_vocabulary');
  
  // 如果需要清空现有数据（仅在第一段时执行）
  if (clearExisting && startIndex === 0) {
    console.log('清空现有N2词汇数据...');
    const removeResult = await collection.where({
      level: 'N2'
    }).remove();
    console.log(`已删除 ${removeResult.stats.removed} 条记录`);
  }
  
  // 获取指定范围的词汇
  const vocabulary = n2Data.vocabulary.slice(startIndex, endIndex);
  
  if (vocabulary.length === 0) {
    return {
      success: false,
      message: '指定范围内没有词汇数据',
      startIndex,
      endIndex,
      totalVocabulary: n2Data.vocabulary.length
    };
  }
  
  console.log(`准备导入第 ${startIndex + 1} 到 ${endIndex} 个词汇（共 ${vocabulary.length} 个）`);
  
  // 准备数据
  const processedVocabulary = vocabulary.map((item, index) => ({
    ...item,
    word: item.word,
    reading: item.reading,
    meanings: item.meanings,
    partOfSpeech: item.partOfSpeech,
    level: 'N2',
    category: item.category || 'general',
    frequency: item.frequency || 1,
    examples: item.examples || [],
    tags: generateTags(item),
    searchText: generateSearchText(item),
    sortIndex: startIndex + index, // 使用全局索引
    random: Math.random(),
    createTime: new Date(),
    updateTime: new Date()
  }));
  
  // 逐条插入，记录详细信息
  let imported = 0;
  let failed = 0;
  const failedItems = [];
  const batchSize = 5; // 每批5条
  
  for (let i = 0; i < processedVocabulary.length; i += batchSize) {
    const batch = processedVocabulary.slice(i, i + batchSize);
    
    try {
      // 并发插入一批
      const results = await Promise.allSettled(
        batch.map(item => collection.add({ data: item }))
      );
      
      // 统计结果
      results.forEach((result, index) => {
        const item = batch[index];
        if (result.status === 'fulfilled') {
          imported++;
        } else {
          failed++;
          failedItems.push({
            word: item.word,
            reading: item.reading,
            error: result.reason?.message || '未知错误',
            index: startIndex + i + index
          });
          console.error(`插入失败 [${item.word}]:`, result.reason);
        }
      });
      
      // 添加小延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`批次插入错误:`, error);
      failed += batch.length;
      batch.forEach((item, idx) => {
        failedItems.push({
          word: item.word,
          reading: item.reading,
          error: error.message || '批次错误',
          index: startIndex + i + idx
        });
      });
    }
    
    // 输出进度
    if ((imported + failed) % 20 === 0 || imported + failed === processedVocabulary.length) {
      console.log(`当前段进度: ${imported + failed}/${processedVocabulary.length} (成功:${imported}, 失败:${failed})`);
    }
  }
  
  // 返回详细结果
  const result = {
    success: imported > 0,
    message: `第 ${startIndex + 1}-${startIndex + vocabulary.length} 个词汇：成功导入 ${imported} 个${failed > 0 ? `，失败 ${failed} 个` : ''}`,
    segment: {
      startIndex,
      endIndex: startIndex + vocabulary.length,
      attempted: vocabulary.length,
      imported,
      failed
    },
    totalVocabulary: n2Data.vocabulary.length,
    hasMore: endIndex < n2Data.vocabulary.length,
    nextStartIndex: endIndex,
    nextEndIndex: Math.min(endIndex + 100, n2Data.vocabulary.length)
  };
  
  // 如果有失败的项目，添加到结果中
  if (failedItems.length > 0) {
    result.failedItems = failedItems;
    result.failedSummary = `失败词汇: ${failedItems.slice(0, 3).map(item => item.word).join(', ')}${failedItems.length > 3 ? '...' : ''}`;
  }
  
  return result;
}

// 获取当前导入状态
async function getImportStatus() {
  const collection = db.collection('n2_vocabulary');
  
  try {
    const countResult = await collection.where({
      level: 'N2'
    }).count();
    
    const total = countResult.total;
    const targetTotal = n2Data.vocabulary.length;
    
    return {
      success: true,
      imported: total,
      target: targetTotal,
      progress: ((total / targetTotal) * 100).toFixed(2) + '%',
      completed: total >= targetTotal,
      message: total >= targetTotal 
        ? `导入完成！共导入 ${total} 个词汇。`
        : `已导入 ${total} / ${targetTotal} 个词汇`,
      metadata: n2Data.metadata
    };
  } catch (error) {
    console.error('获取状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 清空所有N2词汇
async function clearAllN2Vocabulary() {
  const collection = db.collection('n2_vocabulary');
  
  try {
    const removeResult = await collection.where({
      level: 'N2'
    }).remove();
    
    return {
      success: true,
      removed: removeResult.stats.removed,
      message: `已清空 ${removeResult.stats.removed} 个N2词汇`
    };
  } catch (error) {
    console.error('清空失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 生成标签
function generateTags(item) {
  const tags = [];
  
  // 添加词性标签
  if (item.partOfSpeech) {
    tags.push(...item.partOfSpeech);
  }
  
  // 添加分类标签
  if (item.category) {
    tags.push(item.category);
  }
  
  // 添加频率标签
  if (item.frequency >= 4) {
    tags.push('高频');
  } else if (item.frequency >= 2) {
    tags.push('中频');
  } else {
    tags.push('低频');
  }
  
  return tags;
}

// 生成搜索文本
function generateSearchText(item) {
  const parts = [
    item.word,
    item.reading,
    ...(item.meanings || []),
    ...(item.examples?.map(e => e.jp) || [])
  ];
  
  return parts.filter(Boolean).join(' ');
}