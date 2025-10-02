// 管理员初始化云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    switch (action) {
      case 'getOpenid':
        return await getOpenid(OPENID)
      case 'setAdmin':
        return await setAdmin(OPENID, event.data)
      case 'checkAdmin':
        return await checkAdminStatus(OPENID)
      default:
        return { success: false, error: '未知操作' }
    }
  } catch (error) {
    console.error('管理员初始化失败:', error)
    return { success: false, error: error.message }
  }
}

// 获取当前用户的openid
async function getOpenid(openid) {
  try {
    // 获取系统信息
    const systemInfo = {
      openid: openid,
      timestamp: new Date(),
      message: '这是您的微信openid，请复制到云函数管理员白名单中'
    }
    
    console.log('管理员openid:', openid)
    
    return {
      success: true,
      data: systemInfo,
      openid: openid
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// 设置管理员权限
async function setAdmin(openid, adminData) {
  try {
    // 先检查admins集合是否存在该用户
    const existingAdmin = await db.collection('admins').where({
      openid: openid
    }).get()
    
    const adminRecord = {
      openid: openid,
      ...adminData,
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    }
    
    if (existingAdmin.data.length > 0) {
      // 更新现有管理员记录
      await db.collection('admins').doc(existingAdmin.data[0]._id).update({
        data: {
          ...adminRecord,
          createTime: existingAdmin.data[0].createTime // 保持原创建时间
        }
      })
    } else {
      // 创建新管理员记录
      await db.collection('admins').add({
        data: adminRecord
      })
    }
    
    // 同时更新users表中的管理员标记
    const userQuery = await db.collection('users').where({
      openid: openid
    }).get()
    
    if (userQuery.data.length > 0) {
      await db.collection('users').doc(userQuery.data[0]._id).update({
        data: {
          isAdmin: true,
          status: 'approved',
          statusUpdateTime: new Date(),
          statusReason: '管理员权限设置'
        }
      })
    }
    
    return {
      success: true,
      message: '管理员权限设置成功',
      adminRecord: adminRecord
    }
  } catch (error) {
    console.error('设置管理员权限失败:', error)
    return { success: false, error: error.message }
  }
}

// 检查管理员状态
async function checkAdminStatus(openid) {
  try {
    const [adminQuery, userQuery] = await Promise.all([
      db.collection('admins').where({ openid: openid }).get(),
      db.collection('users').where({ openid: openid }).get()
    ])
    
    const isAdminInTable = adminQuery.data.length > 0 && adminQuery.data[0].isActive
    const isAdminInUsers = userQuery.data.length > 0 && userQuery.data[0].isAdmin
    
    return {
      success: true,
      isAdmin: isAdminInTable || isAdminInUsers,
      adminRecord: adminQuery.data[0] || null,
      userRecord: userQuery.data[0] || null,
      openid: openid
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}