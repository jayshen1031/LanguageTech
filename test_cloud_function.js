// 测试云函数部署状态
// 在微信开发者工具控制台中运行此代码

const testCloudFunction = async () => {
  try {
    console.log('🔍 正在测试 vocabulary-integration 云函数是否已部署...')
    
    const result = await wx.cloud.callFunction({
      name: 'vocabulary-integration',
      data: {
        action: 'test_connection'
      }
    })
    
    console.log('✅ 云函数已部署，响应:', result)
    return true
    
  } catch (error) {
    console.error('❌ 云函数未部署或调用失败:', error)
    
    if (error.errCode === -502005) {
      console.log('📋 错误代码 -502005: 数据库集合不存在 - 这是正常的，首次运行会创建')
    } else if (error.errCode === -1) {
      console.log('📋 错误代码 -1: 云函数不存在，需要先部署')
    }
    
    return false
  }
}

// 测试并提供部署指导
const checkAndGuide = async () => {
  const isDeployed = await testCloudFunction()
  
  if (!isDeployed) {
    console.log(`
🚨 需要部署 vocabulary-integration 云函数

部署步骤：
1. 在微信开发者工具左侧文件树中找到 cloudfunctions/vocabulary-integration/
2. 右键点击 vocabulary-integration 文件夹
3. 选择"上传并部署：云端安装依赖"
4. 等待部署完成（1-2分钟）

部署完成后，重新运行此测试脚本验证。
    `)
  } else {
    console.log('🎉 云函数部署正常，可以正常使用词汇整合功能！')
  }
}

// 执行测试
checkAndGuide()