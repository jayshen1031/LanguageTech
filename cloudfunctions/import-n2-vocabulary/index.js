// 导入N2词汇到数据库
const cloud = require('wx-server-sdk');
const n2Data = require('./n2_2000_complete.json');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action = 'import', options = {} } = event;

  try {
    switch (action) {
      case 'import':
        // 批量导入词汇
        return await importVocabulary(options);
      
      case 'search':
        // 搜索词汇
        return await searchVocabulary(event.keyword, event.filters);
      
      case 'getByIds':
        // 根据ID批量获取
        return await getVocabularyByIds(event.ids);
      
      case 'getCategories':
        // 获取所有分类
        return await getCategories();
      
      case 'getStats':
        // 获取统计信息
        return await getVocabularyStats();
      
      default:
        return { success: false, message: '未知操作' };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 导入词汇数据
async function importVocabulary(options = {}) {
  const { clearExisting = false, batchSize = 50 } = options; // 减小批次大小
  
  const collection = db.collection('n2_vocabulary');
  
  // 清空现有数据
  if (clearExisting) {
    await collection.where({
      level: 'N2'
    }).remove();
  }
  
  // 准备数据
  const vocabulary = n2Data.vocabulary.map((item, index) => ({
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
    sortIndex: index,
    random: Math.random(),
    createTime: new Date(),
    updateTime: new Date()
  }));
  
  // 分批导入，每批处理更小的数量以避免超时
  let imported = 0;
  let failed = 0;
  const failedItems = []; // 记录失败的项目
  const chunkSize = 5; // 减小并发数量，每次插入5条
  
  console.log(`开始导入 ${vocabulary.length} 个词汇...`);
  
  for (let i = 0; i < vocabulary.length; i += batchSize) {
    const batch = vocabulary.slice(i, i + batchSize);
    
    // 将批次再分成更小的块进行并发插入
    for (let j = 0; j < batch.length; j += chunkSize) {
      const chunk = batch.slice(j, j + chunkSize);
      
      try {
        // 使用Promise.allSettled确保部分失败不影响其他插入
        const results = await Promise.allSettled(
          chunk.map(item => collection.add({ data: item }))
        );
        
        // 统计成功和失败的数量
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            imported++;
          } else {
            failed++;
            const failedItem = chunk[index];
            failedItems.push({
              word: failedItem.word,
              error: result.reason?.message || '未知错误'
            });
            console.error(`插入失败 [${failedItem.word}]:`, result.reason);
          }
        });
        
        // 添加小延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`批次插入错误:`, error);
        failed += chunk.length;
        chunk.forEach(item => {
          failedItems.push({
            word: item.word,
            error: error.message || '批次错误'
          });
        });
      }
    }
    
    // 每处理100条输出一次进度
    if ((imported + failed) % 100 === 0 || imported + failed === vocabulary.length) {
      console.log(`Progress: ${imported + failed}/${vocabulary.length} (成功:${imported}, 失败:${failed})`);
    }
  }
  
  // 返回详细的结果
  const result = {
    success: imported > 0,
    message: `成功导入 ${imported} 个词汇${failed > 0 ? `，失败 ${failed} 个` : ''}`,
    total: imported,
    failed: failed,
    metadata: n2Data.metadata
  };
  
  // 如果有失败的项目，添加到结果中（最多显示前10个）
  if (failedItems.length > 0) {
    result.failedItems = failedItems.slice(0, 10);
    result.failedMessage = `失败词汇示例: ${failedItems.slice(0, 5).map(item => item.word).join(', ')}`;
  }
  
  return result;
}

// 搜索词汇
async function searchVocabulary(keyword = '', filters = {}) {
  const collection = db.collection('n2_vocabulary');
  
  let query = collection;
  
  // 关键词搜索
  if (keyword) {
    const searchRegex = new RegExp(keyword, 'i');
    query = query.where(_.or([
      { word: searchRegex },
      { reading: searchRegex },
      { searchText: searchRegex }
    ]));
  }
  
  // 分类过滤
  if (filters.category) {
    query = query.where({ category: filters.category });
  }
  
  // 词性过滤
  if (filters.partOfSpeech) {
    query = query.where({ 
      partOfSpeech: _.elemMatch(_.eq(filters.partOfSpeech))
    });
  }
  
  // 频率过滤
  if (filters.minFrequency) {
    query = query.where({ 
      frequency: _.gte(filters.minFrequency)
    });
  }
  
  // 分页
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const skip = (page - 1) * pageSize;
  
  // 排序
  const orderBy = filters.orderBy || 'sortIndex';
  const order = filters.order || 'asc';
  
  // 执行查询
  const countResult = await query.count();
  const total = countResult.total;
  
  const result = await query
    .orderBy(orderBy, order)
    .skip(skip)
    .limit(pageSize)
    .get();
  
  return {
    success: true,
    data: result.data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

// 根据ID批量获取词汇
async function getVocabularyByIds(ids = []) {
  if (!ids || ids.length === 0) {
    return { success: true, data: [] };
  }
  
  const collection = db.collection('n2_vocabulary');
  const result = await collection
    .where({
      _id: _.in(ids)
    })
    .get();
  
  return {
    success: true,
    data: result.data
  };
}

// 获取所有分类
async function getCategories() {
  const collection = db.collection('n2_vocabulary');
  
  // 使用聚合获取唯一分类
  const result = await collection
    .aggregate()
    .group({
      _id: '$category',
      count: $.sum(1)
    })
    .end();
  
  const categories = result.list.map(item => ({
    name: item._id,
    count: item.count
  })).sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    data: categories
  };
}

// 获取词汇统计信息
async function getVocabularyStats() {
  const collection = db.collection('n2_vocabulary');
  
  const result = await collection
    .aggregate()
    .group({
      _id: null,
      total: $.sum(1),
      categories: $.addToSet('$category'),
      avgFrequency: $.avg('$frequency')
    })
    .end();
  
  const stats = result.list[0] || {};
  
  // 词性统计
  const posResult = await collection
    .aggregate()
    .unwind('$partOfSpeech')
    .group({
      _id: '$partOfSpeech',
      count: $.sum(1)
    })
    .end();
  
  return {
    success: true,
    data: {
      total: stats.total || 0,
      categories: stats.categories || [],
      avgFrequency: stats.avgFrequency || 0,
      partOfSpeech: posResult.list
    }
  };
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
    ...(item.examples || [])
  ];
  
  return parts.join(' ');
}