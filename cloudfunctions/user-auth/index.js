// 用户认证和管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口
exports.main = async (event, context) => {
  const { action } = event
  const { openid } = cloud.getWXContext()
  
  try {
    switch (action) {
      case 'login':
        return await handleLogin(openid, event)
      case 'updateProfile':
        return await handleUpdateProfile(openid, event.profile)
      case 'getUserProfile':
        return await handleGetUserProfile(openid)
      case 'syncLearningData':
        return await handleSyncLearningData(openid, event.data)
      case 'getLearningData':
        return await handleGetLearningData(openid)
      default:
        return {
          success: false,
          error: '不支持的操作'
        }
    }
  } catch (error) {
    console.error('用户认证云函数错误:', error)
    return {
      success: false,
      error: error.message || '服务器内部错误'
    }
  }
}

// 处理用户登录
async function handleLogin(openid, event) {
  try {
    // 查询用户是否已存在
    const userQuery = await db.collection('users').where({
      openid: openid
    }).get()
    
    let userData
    
    if (userQuery.data.length > 0) {
      // 用户已存在，更新最后登录时间
      userData = userQuery.data[0]
      
      await db.collection('users').doc(userData._id).update({
        data: {
          lastLoginTime: new Date(),
          updateTime: new Date()
        }
      })
    } else {
      // 新用户，创建用户记录
      const newUserData = {
        openid: openid,
        registerTime: new Date(),
        lastLoginTime: new Date(),
        updateTime: new Date(),
        isActive: true
      }
      
      const createResult = await db.collection('users').add({
        data: newUserData
      })
      
      userData = {
        ...newUserData,
        _id: createResult._id
      }
    }
    
    return {
      success: true,
      data: {
        openid: userData.openid,
        userId: userData._id,
        registerTime: userData.registerTime,
        lastLoginTime: userData.lastLoginTime,
        hasProfile: !!userData.profile
      }
    }
  } catch (error) {
    console.error('用户登录失败:', error)
    return {
      success: false,
      error: '登录失败'
    }
  }
}

// 处理用户资料更新
async function handleUpdateProfile(openid, profile) {
  try {
    // 查找用户
    const userQuery = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const userId = userQuery.data[0]._id
    
    // 更新用户资料
    await db.collection('users').doc(userId).update({
      data: {
        profile: profile,
        updateTime: new Date()
      }
    })
    
    // 同时在用户资料表中创建或更新详细资料
    const profileQuery = await db.collection('user_profiles').where({
      userId: userId
    }).get()
    
    const profileData = {
      userId: userId,
      openid: openid,
      ...profile,
      updateTime: new Date()
    }
    
    if (profileQuery.data.length > 0) {
      // 更新现有资料
      await db.collection('user_profiles').doc(profileQuery.data[0]._id).update({
        data: profileData
      })
    } else {
      // 创建新资料
      profileData.createTime = new Date()
      await db.collection('user_profiles').add({
        data: profileData
      })
    }
    
    return {
      success: true,
      data: profile
    }
  } catch (error) {
    console.error('更新用户资料失败:', error)
    return {
      success: false,
      error: '更新失败'
    }
  }
}

// 获取用户资料
async function handleGetUserProfile(openid) {
  try {
    const profileQuery = await db.collection('user_profiles').where({
      openid: openid
    }).get()
    
    if (profileQuery.data.length > 0) {
      return {
        success: true,
        data: profileQuery.data[0]
      }
    } else {
      return {
        success: false,
        error: '用户资料不存在'
      }
    }
  } catch (error) {
    console.error('获取用户资料失败:', error)
    return {
      success: false,
      error: '获取失败'
    }
  }
}

// 同步学习数据到云端
async function handleSyncLearningData(openid, learningData) {
  try {
    // 查找用户
    const userQuery = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const userId = userQuery.data[0]._id
    
    // 同步学习数据
    const syncData = {
      userId: userId,
      openid: openid,
      ...learningData,
      syncTime: new Date(),
      updateTime: new Date()
    }
    
    // 查询是否已有学习数据记录
    const dataQuery = await db.collection('user_learning_data').where({
      openid: openid
    }).get()
    
    if (dataQuery.data.length > 0) {
      // 更新现有数据
      await db.collection('user_learning_data').doc(dataQuery.data[0]._id).update({
        data: syncData
      })
    } else {
      // 创建新的学习数据记录
      syncData.createTime = new Date()
      await db.collection('user_learning_data').add({
        data: syncData
      })
    }
    
    return {
      success: true,
      data: {
        message: '学习数据同步成功',
        syncTime: syncData.syncTime
      }
    }
  } catch (error) {
    console.error('同步学习数据失败:', error)
    return {
      success: false,
      error: '同步失败'
    }
  }
}

// 获取云端学习数据
async function handleGetLearningData(openid) {
  try {
    const dataQuery = await db.collection('user_learning_data').where({
      openid: openid
    }).orderBy('updateTime', 'desc').limit(1).get()
    
    if (dataQuery.data.length > 0) {
      const learningData = dataQuery.data[0]
      
      // 移除不需要的字段
      delete learningData._id
      delete learningData.userId
      delete learningData.openid
      delete learningData.createTime
      delete learningData.updateTime
      delete learningData.syncTime
      
      return {
        success: true,
        data: learningData
      }
    } else {
      return {
        success: false,
        error: '暂无学习数据'
      }
    }
  } catch (error) {
    console.error('获取学习数据失败:', error)
    return {
      success: false,
      error: '获取失败'
    }
  }
}