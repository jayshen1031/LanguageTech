// SMS短信验证码服务云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2g49srond2b01891'
})

const db = cloud.database()

// 验证码存储和验证
const verificationCodes = new Map()

// 云函数入口
exports.main = async (event, context) => {
  const { action, phone, code } = event
  
  try {
    switch (action) {
      case 'sendCode':
        return await sendVerificationCode(phone)
      case 'verifyCode':
        return await verifyCode(phone, code)
      default:
        return {
          success: false,
          error: '不支持的操作'
        }
    }
  } catch (error) {
    console.error('SMS服务错误:', error)
    return {
      success: false,
      error: error.message || '服务器内部错误'
    }
  }
}

// 发送验证码
async function sendVerificationCode(phone) {
  try {
    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        error: '手机号格式不正确'
      }
    }
    
    // 检查发送频率限制
    const lastSent = verificationCodes.get(phone + '_lastSent')
    const now = Date.now()
    
    if (lastSent && (now - lastSent) < 60000) { // 60秒内不能重复发送
      return {
        success: false,
        error: '发送过于频繁，请稍后再试'
      }
    }
    
    // 生成6位验证码
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 存储验证码（5分钟有效期）
    verificationCodes.set(phone, {
      code: verificationCode,
      timestamp: now,
      attempts: 0
    })
    verificationCodes.set(phone + '_lastSent', now)
    
    // 这里应该调用真实的短信服务API
    // 例如：腾讯云短信、阿里云短信等
    console.log(`向 ${phone} 发送验证码: ${verificationCode}`)
    
    // 开发环境返回成功（实际生产中这里应该调用短信服务）
    const isDevMode = true // 在生产环境中设为false
    
    if (isDevMode) {
      console.log('开发环境模拟发送短信成功')
      return {
        success: true,
        message: '验证码已发送（开发环境）',
        devCode: verificationCode // 开发环境返回验证码便于测试
      }
    }
    
    // 生产环境的短信发送逻辑
    try {
      // const smsResult = await sendSMSWithProvider(phone, verificationCode)
      // if (smsResult.success) {
      //   return {
      //     success: true,
      //     message: '验证码已发送'
      //   }
      // } else {
      //   throw new Error(smsResult.error)
      // }
      
      // 临时返回成功
      return {
        success: true,
        message: '验证码已发送'
      }
    } catch (smsError) {
      console.error('短信发送失败:', smsError)
      return {
        success: false,
        error: '短信发送失败，请重试'
      }
    }
    
  } catch (error) {
    console.error('发送验证码失败:', error)
    return {
      success: false,
      error: '发送失败，请重试'
    }
  }
}

// 验证验证码
async function verifyCode(phone, inputCode) {
  try {
    if (!phone || !inputCode) {
      return {
        success: false,
        error: '手机号和验证码不能为空'
      }
    }
    
    const storedData = verificationCodes.get(phone)
    
    if (!storedData) {
      return {
        success: false,
        error: '验证码已过期或未发送'
      }
    }
    
    const { code, timestamp, attempts } = storedData
    const now = Date.now()
    
    // 检查是否过期（5分钟）
    if (now - timestamp > 300000) {
      verificationCodes.delete(phone)
      return {
        success: false,
        error: '验证码已过期'
      }
    }
    
    // 检查尝试次数
    if (attempts >= 5) {
      verificationCodes.delete(phone)
      return {
        success: false,
        error: '验证失败次数过多，请重新获取验证码'
      }
    }
    
    // 验证码码
    if (inputCode === code) {
      // 验证成功，清除验证码
      verificationCodes.delete(phone)
      verificationCodes.delete(phone + '_lastSent')
      
      // 记录到数据库
      try {
        await db.collection('phone_verifications').add({
          data: {
            phone: phone,
            verifiedAt: new Date(),
            ip: context.CLIENTIP || '',
            userAgent: context.CLIENTUSERAGENT || ''
          }
        })
      } catch (dbError) {
        console.warn('记录验证日志失败:', dbError)
      }
      
      return {
        success: true,
        message: '验证成功'
      }
    } else {
      // 验证失败，增加尝试次数
      storedData.attempts += 1
      verificationCodes.set(phone, storedData)
      
      return {
        success: false,
        error: `验证码错误，还可尝试 ${5 - storedData.attempts} 次`
      }
    }
    
  } catch (error) {
    console.error('验证验证码失败:', error)
    return {
      success: false,
      error: '验证失败，请重试'
    }
  }
}

// 真实短信服务提供商集成示例（需要根据实际选择的服务商修改）
async function sendSMSWithProvider(phone, code) {
  // 腾讯云短信示例
  // const tencentSMS = require('tencentcloud-sdk-nodejs')
  // 
  // 阿里云短信示例  
  // const aliSMS = require('@alicloud/sms-sdk')
  //
  // 华为云短信示例
  // const huaweiSMS = require('@huaweicloud/huaweicloud-sdk-sms')
  
  // 这里实现真实的短信发送逻辑
  return {
    success: true,
    message: '短信发送成功'
  }
}