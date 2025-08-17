const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const TODO_COLLECTION = 'project_todos';
const ADMIN_OPENIDS = ['oY2_45FUeKQ7sxxxxxxxxx']; // 管理员openid列表，请替换为实际值

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;
  
  // 权限验证
  const isAdmin = ADMIN_OPENIDS.includes(wxContext.OPENID);
  
  if (!isAdmin && action !== 'list') {
    return {
      code: 403,
      msg: '无权限操作'
    };
  }

  try {
    switch (action) {
      case 'list':
        // 获取todo列表
        const listResult = await db.collection(TODO_COLLECTION)
          .orderBy('priority', 'asc')
          .orderBy('createTime', 'desc')
          .get();
        
        return {
          code: 200,
          data: listResult.data,
          msg: '获取成功'
        };

      case 'add':
        // 添加todo
        if (!data.title) {
          return {
            code: 400,
            msg: '标题不能为空'
          };
        }
        
        const addResult = await db.collection(TODO_COLLECTION).add({
          data: {
            title: data.title,
            description: data.description || '',
            status: data.status || 'pending', // pending, in_progress, completed
            priority: data.priority || 999,
            tags: data.tags || [],
            assignee: data.assignee || '',
            dueDate: data.dueDate || null,
            createTime: new Date(),
            updateTime: new Date(),
            createdBy: wxContext.OPENID
          }
        });
        
        return {
          code: 200,
          data: { _id: addResult._id },
          msg: '添加成功'
        };

      case 'update':
        // 更新todo
        if (!data._id) {
          return {
            code: 400,
            msg: 'ID不能为空'
          };
        }
        
        const updateData = {
          updateTime: new Date()
        };
        
        // 只更新传入的字段
        const allowedFields = ['title', 'description', 'status', 'priority', 'tags', 'assignee', 'dueDate'];
        allowedFields.forEach(field => {
          if (data[field] !== undefined) {
            updateData[field] = data[field];
          }
        });
        
        const updateResult = await db.collection(TODO_COLLECTION)
          .doc(data._id)
          .update({
            data: updateData
          });
        
        return {
          code: 200,
          data: { updated: updateResult.stats.updated },
          msg: '更新成功'
        };

      case 'delete':
        // 删除todo
        if (!data._id) {
          return {
            code: 400,
            msg: 'ID不能为空'
          };
        }
        
        await db.collection(TODO_COLLECTION).doc(data._id).remove();
        
        return {
          code: 200,
          msg: '删除成功'
        };

      case 'batch-update-status':
        // 批量更新状态
        if (!data.ids || !Array.isArray(data.ids) || !data.status) {
          return {
            code: 400,
            msg: '参数错误'
          };
        }
        
        const batchResult = await db.collection(TODO_COLLECTION)
          .where({
            _id: _.in(data.ids)
          })
          .update({
            data: {
              status: data.status,
              updateTime: new Date()
            }
          });
        
        return {
          code: 200,
          data: { updated: batchResult.stats.updated },
          msg: '批量更新成功'
        };

      case 'search':
        // 搜索todo
        const keyword = data.keyword || '';
        const searchCondition = keyword ? _.or([
          { title: db.RegExp({ regexp: keyword, options: 'i' }) },
          { description: db.RegExp({ regexp: keyword, options: 'i' }) }
        ]) : {};
        
        const searchResult = await db.collection(TODO_COLLECTION)
          .where(searchCondition)
          .orderBy('priority', 'asc')
          .orderBy('createTime', 'desc')
          .get();
        
        return {
          code: 200,
          data: searchResult.data,
          msg: '搜索成功'
        };

      default:
        return {
          code: 400,
          msg: '未知操作'
        };
    }
  } catch (err) {
    console.error('操作失败：', err);
    return {
      code: 500,
      msg: '操作失败',
      error: err.toString()
    };
  }
};