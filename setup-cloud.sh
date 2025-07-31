#!/bin/bash

echo "🚀 语伴君云开发环境配置"
echo "================================"

# 显示云环境信息
echo "📋 云环境信息:"
echo "   环境ID: cloud1-2g49srond2b01891"
echo "   AppID: wxb77a36f23f2aa6e8"
echo ""

# 检查项目配置
echo "🔍 检查项目配置..."

# 检查 app.js 中的云环境ID
if grep -q "cloud1-2g49srond2b01891" app.js; then
    echo "✅ app.js 云环境ID配置正确"
else
    echo "❌ app.js 云环境ID未配置"
    echo "   请检查 app.js 中的 wx.cloud.init() 配置"
fi

# 检查云函数目录
if [ -d "cloudfunctions" ]; then
    echo "✅ 云函数目录存在"
    
    # 检查 tts-service 云函数
    if [ -f "cloudfunctions/tts-service/index.js" ]; then
        echo "✅ tts-service 云函数已创建"
    else
        echo "❌ tts-service 云函数不存在"
    fi
    
    # 检查 audio-tts 云函数
    if [ -f "cloudfunctions/audio-tts/index.js" ]; then
        echo "✅ audio-tts 云函数已创建"
    else
        echo "❌ audio-tts 云函数不存在"
    fi
else
    echo "❌ 云函数目录不存在"
fi

echo ""
echo "📝 下一步操作："
echo "1. 在微信开发者工具中打开项目"
echo "2. 点击顶部'云开发' -> '云开发控制台'"
echo "3. 确认环境ID为: cloud1-2g49srond2b01891"
echo "4. 部署云函数："
echo "   - 右键 cloudfunctions/tts-service"
echo "   - 选择'上传并部署：云端安装依赖'"
echo "5. 创建数据库集合："
echo "   - audio_cache (音频缓存)"
echo "   - user_words (用户学习记录)"
echo ""

echo "🎯 测试步骤："
echo "1. 启动MCP服务: ./start-audio-mcp.sh"
echo "2. 在小程序中测试音频播放功能"
echo "3. 查看控制台确认音频来源"
echo ""

echo "📚 参考文档:"
echo "   docs/cloud-deployment-guide.md - 详细部署指南"
echo "   docs/plugin-authorization-fix.md - 插件问题解决方案"

echo ""
echo "✨ 配置检查完成！"