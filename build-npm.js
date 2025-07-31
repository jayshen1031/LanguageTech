// 微信小程序构建npm的辅助脚本
const fs = require('fs');
const path = require('path');

console.log('开始构建 miniprogram_npm...');

// 创建miniprogram_npm目录
const miniprogramNpmPath = path.join(__dirname, 'miniprogram_npm');
if (!fs.existsSync(miniprogramNpmPath)) {
  fs.mkdirSync(miniprogramNpmPath, { recursive: true });
  console.log('创建 miniprogram_npm 目录');
}

console.log(`
构建步骤已准备完成！

请在微信开发者工具中执行以下操作：
1. 打开项目
2. 点击菜单栏的"工具"
3. 选择"构建 npm"
4. 等待构建完成

构建完成后，miniprogram_npm 目录将包含所有依赖包。
`);