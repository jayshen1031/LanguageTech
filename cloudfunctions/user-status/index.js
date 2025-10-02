// 用户状态管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    switch (action) {
      case 'register':
        return await registerUser(OPENID, data)
      case 'checkStatus':
        return await checkUserStatus(OPENID)
      case 'updateStatus':
        return await updateUserStatus(OPENID, data)
      case 'getProfile':
        return await getUserProfile(OPENID)
      default:
        return { success: false, error: '未知操作类型' }
    }
  } catch (error) {
    console.error('用户状态管理失败:', error)
    return { success: false, error: error.message }
  }
}

// 用户注册
async function registerUser(openid, userData) {
  try {
    // 检查是否为管理员
    const isAdmin = await checkAdminPermission(openid)
    
    // 检查用户是否已存在
    const existingUser = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (existingUser.data.length > 0) {
      // 用户已存在，更新信息
      const updateData = {
        ...userData,
        updateTime: new Date(),
        lastLoginTime: new Date()
      }
      
      // 管理员自动审核通过
      if (isAdmin && existingUser.data[0].status !== 'approved') {
        updateData.status = 'approved'
        updateData.statusUpdateTime = new Date()
        updateData.statusReason = '管理员账户自动通过'
        updateData.isAdmin = true
      }
      
      await db.collection('users').doc(existingUser.data[0]._id).update({
        data: updateData
      })
      
      return {
        success: true,
        message: isAdmin ? '管理员账户已激活' : '用户信息已更新',
        userStatus: isAdmin ? 'approved' : (existingUser.data[0].status || 'pending'),
        userId: existingUser.data[0]._id,
        isAdmin: isAdmin
      }
    } else {
      // 新用户注册
      const userRecord = {
        openid: openid,
        ...userData,
        status: isAdmin ? 'approved' : 'pending', // 管理员直接通过
        registerTime: new Date(),
        updateTime: new Date(),
        lastLoginTime: new Date(),
        isAdmin: isAdmin,
        statusUpdateTime: isAdmin ? new Date() : null,
        statusReason: isAdmin ? '管理员账户自动通过' : '',
        studyStats: {
          totalDays: 0,
          totalWords: 0,
          totalStructures: 0,
          lastStudyDate: null
        }
      }
      
      const result = await db.collection('users').add({
        data: userRecord
      })
      
      return {
        success: true,
        message: isAdmin ? '管理员注册成功' : '注册成功，等待审核',
        userStatus: isAdmin ? 'approved' : 'pending',
        userId: result._id,
        isAdmin: isAdmin
      }
    }
  } catch (error) {
    console.error('用户注册失败:', error)
    return { success: false, error: error.message }
  }
}

// 检查用户状态
async function checkUserStatus(openid) {
  try {
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (userRes.data.length === 0) {
      return {
        success: true,
        userStatus: 'unregistered',
        message: '用户未注册'
      }
    }
    
    const user = userRes.data[0]
    
    // 更新最后登录时间
    await db.collection('users').doc(user._id).update({
      data: {
        lastLoginTime: new Date()
      }
    })
    
    return {
      success: true,
      userStatus: user.status,
      userData: user,
      message: getStatusMessage(user.status)
    }
  } catch (error) {
    console.error('检查用户状态失败:', error)
    return { success: false, error: error.message }
  }
}

// 更新用户状态（管理员操作）
async function updateUserStatus(openid, { targetOpenid, newStatus, reason }) {
  try {
    // 验证操作权限（这里可以添加管理员验证逻辑）
    const adminCheck = await checkAdminPermission(openid)
    if (!adminCheck) {
      return { success: false, error: '无管理员权限' }
    }
    
    await db.collection('users').where({
      openid: targetOpenid
    }).update({
      data: {
        status: newStatus,
        statusUpdateTime: new Date(),
        statusReason: reason || ''
      }
    })
    
    return {
      success: true,
      message: `用户状态已更新为: ${newStatus}`
    }
  } catch (error) {
    console.error('更新用户状态失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取用户资料
async function getUserProfile(openid) {
  try {
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (userRes.data.length === 0) {
      return { success: false, error: '用户不存在' }
    }
    
    const user = userRes.data[0]
    
    // 获取学习统计
    const [vocabStats, structureStats] = await Promise.all([
      getVocabularyStats(openid),
      getStructureStats(openid)
    ])
    
    return {
      success: true,
      profile: {
        ...user,
        studyStats: {
          ...user.studyStats,
          ...vocabStats,
          ...structureStats
        }
      }
    }
  } catch (error) {
    console.error('获取用户资料失败:', error)
    return { success: false, error: error.message }
  }
}

// 检查管理员权限
async function checkAdminPermission(openid) {
  // 管理员白名单（您可以在这里添加管理员的openid）
  const adminOpenids = [
    // 请在这里添加您的微信openid
    // 'your-openid-here',  // 替换为您的实际openid
    
    // 临时方案：通过云数据库管理员表检查
  ]
  
  // 1. 检查固定白名单
  if (adminOpenids.includes(openid)) {
    return true
  }
  
  // 2. 检查数据库中的管理员表
  try {
    const adminQuery = await db.collection('admins').where({
      openid: openid,
      isActive: true
    }).get()
    
    if (adminQuery.data.length > 0) {
      return true
    }
  } catch (error) {
    console.warn('检查管理员表失败:', error)
  }
  
  // 3. 检查是否已经是管理员用户
  try {
    const userQuery = await db.collection('users').where({
      openid: openid,
      isAdmin: true
    }).get()
    
    if (userQuery.data.length > 0) {
      return true
    }
  } catch (error) {
    console.warn('检查用户管理员状态失败:', error)
  }
  
  return false
}

// 获取词汇统计
async function getVocabularyStats(openid) {
  try {
    // 这里可以根据需要实现个人词汇统计
    return {
      vocabularyCount: 0,
      masteredVocabulary: 0
    }
  } catch (error) {
    return {
      vocabularyCount: 0,
      masteredVocabulary: 0
    }
  }
}

// 获取句子结构统计
async function getStructureStats(openid) {
  try {
    // 这里可以根据需要实现个人句子结构统计
    return {
      structureCount: 0,
      masteredStructures: 0
    }
  } catch (error) {
    return {
      structureCount: 0,
      masteredStructures: 0
    }
  }
}

// 获取状态描述
function getStatusMessage(status) {
  const messages = {
    pending: '您的账户正在审核中，请耐心等待',
    approved: '账户已通过审核，欢迎使用',
    rejected: '很抱歉，您的申请未通过审核',
    suspended: '账户已被暂停，请联系客服'
  }
  return messages[status] || '未知状态'
}