// 用户认证和管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891' // 明确指定云环境ID
})

const db = cloud.database()

// 云函数入口
exports.main = async (event, context) => {
  const { action } = event
  
  try {
    // 获取openid的统一方式
    const { openid } = cloud.getWXContext()
    console.log('云函数调用，action:', action, 'openid:', openid)
    
    switch (action) {
      case 'ping':
        return {
          success: true,
          message: 'pong',
          timestamp: new Date()
        }
      case 'login':
        return await handleLogin(event)
      case 'updateProfile':
        return await handleUpdateProfile(event.openid || openid, event.profile)
      case 'getUserProfile':
        return await handleGetUserProfile(openid)
      case 'syncLearningData':
        return await handleSyncLearningData(openid, event.data)
      case 'getLearningData':
        return await handleGetLearningData(openid)
      case 'phoneLogin':
        return await handlePhoneLogin(event.phone, event.userInfo)
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
async function handleLogin(event) {
  try {
    // 获取openid的标准方式
    let openid = null
    
    try {
      // 标准方式：从微信上下文获取
      const wxContext = cloud.getWXContext()
      console.log('微信上下文获取成功')
      
      // 统一使用大写的OPENID，这是官方推荐的字段名
      openid = wxContext.OPENID
      
      if (!openid) {
        // 兼容小写的openid字段
        openid = wxContext.openid
      }
      
      console.log('从微信上下文获取openid:', openid ? '成功' : '失败')
    } catch (contextError) {
      console.error('获取微信上下文失败:', contextError)
    }
    
    // 如果仍然无法获取openid，使用临时方案
    if (!openid) {
      console.log('⚠️ 无法获取真实openid，使用临时方案')
      if (event.code) {
        // 基于code生成临时用户标识
        openid = 'temp_' + event.code.substring(0, 10) + '_' + Date.now().toString().slice(-6)
        console.log('生成临时openid:', openid)
      } else {
        openid = 'guest_' + Date.now()
        console.log('生成访客openid:', openid)
      }
    }
    
    if (!openid) {
      return {
        success: false,
        error: '无法获取用户openid'
      }
    }
    
    // 查询用户是否已存在（如果集合不存在会自动创建）
    let userQuery
    try {
      userQuery = await db.collection('users').where({
        openid: openid
      }).get()
    } catch (error) {
      if (error.errCode === -502005) {
        // 集合不存在，创建新集合并返回空结果
        console.log('users集合不存在，将在添加数据时自动创建')
        userQuery = { data: [] }
      } else {
        throw error
      }
    }
    
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
      
      console.log('找到现有用户:', userData.openid)
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
      
      console.log('创建新用户:', userData.openid)
    }
    
    // 查询用户的完整资料
    const profileQuery = await db.collection('user_profiles').where({
      openid: openid
    }).get()
    
    const userProfile = profileQuery.data.length > 0 ? profileQuery.data[0] : null
    console.log('查询到的用户资料:', userProfile)
    
    return {
      success: true,
      openid: userData.openid,
      userId: userData._id,
      userData: {
        openid: userData.openid,
        profile: userProfile,
        registerTime: userData.registerTime,
        lastLoginTime: userData.lastLoginTime
      }
    }
  } catch (error) {
    console.error('用户登录失败详细错误:', error)
    return {
      success: false,
      error: `登录失败: ${error.message}`
    }
  }
}

// 处理用户资料更新
async function handleUpdateProfile(openid, profile) {
  try {
    console.log('更新用户资料，openid:', openid)
    console.log('资料数据:', JSON.stringify(profile, null, 2))
    
    // 查找用户
    const userQuery = await db.collection('users').where({
      openid: openid
    }).get()
    
    let userId
    
    if (userQuery.data.length === 0) {
      // 用户不存在，先创建用户记录
      console.log('用户不存在，创建新用户记录')
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
      
      userId = createResult._id
      console.log('创建新用户，userId:', userId)
    } else {
      userId = userQuery.data[0]._id
      console.log('找到现有用户，userId:', userId)
    }
    
    // 更新用户资料
    await db.collection('users').doc(userId).update({
      data: {
        profile: profile,
        updateTime: new Date()
      }
    })
    
    // 同时在用户资料表中创建或更新详细资料
    console.log('查询用户资料表...')
    const profileQuery = await db.collection('user_profiles').where({
      openid: openid // 改用openid查询，更直接
    }).get()
    
    const profileData = {
      userId: userId,
      openid: openid,
      ...profile,
      updateTime: new Date()
    }
    
    if (profileQuery.data.length > 0) {
      // 更新现有资料
      console.log('更新现有用户资料')
      await db.collection('user_profiles').doc(profileQuery.data[0]._id).update({
        data: profileData
      })
      console.log('用户资料更新成功')
    } else {
      // 创建新资料
      console.log('创建新用户资料')
      profileData.createTime = new Date()
      const addResult = await db.collection('user_profiles').add({
        data: profileData
      })
      console.log('用户资料创建成功，ID:', addResult._id)
    }
    
    return {
      success: true,
      data: profile,
      message: '用户资料更新成功'
    }
  } catch (error) {
    console.error('更新用户资料失败详细错误:', error)
    return {
      success: false,
      error: `更新失败: ${error.message || error}`
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

// 处理手机号登录
async function handlePhoneLogin(phone, userInfo) {
  try {
    console.log('手机号登录，phone:', phone)
    
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        error: '手机号格式不正确'
      }
    }
    
    // 查询是否已有该手机号的用户
    const userQuery = await db.collection('users').where({
      phone: phone
    }).get()
    
    let userData
    
    if (userQuery.data.length > 0) {
      // 用户已存在，更新登录信息
      userData = userQuery.data[0]
      
      await db.collection('users').doc(userData._id).update({
        data: {
          ...userInfo,
          lastLoginTime: new Date(),
          updateTime: new Date(),
          loginType: 'phone'
        }
      })
      
      console.log('更新现有手机用户:', phone)
    } else {
      // 新用户，创建记录
      const newUserData = {
        phone: phone,
        openid: userInfo.openid || ('phone_' + phone),
        ...userInfo,
        registerTime: new Date(),
        lastLoginTime: new Date(),
        updateTime: new Date(),
        isActive: true,
        loginType: 'phone'
      }
      
      const createResult = await db.collection('users').add({
        data: newUserData
      })
      
      userData = {
        ...newUserData,
        _id: createResult._id
      }
      
      console.log('创建新手机用户:', phone)
    }
    
    return {
      success: true,
      data: {
        userId: userData._id,
        phone: phone,
        isAdmin: userInfo.isAdmin || false,
        loginTime: userData.lastLoginTime
      }
    }
    
  } catch (error) {
    console.error('手机号登录失败:', error)
    return {
      success: false,
      error: `登录失败: ${error.message}`
    }
  }
}