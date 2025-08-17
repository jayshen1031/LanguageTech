# Azure GPT-4o 云函数配置指南

## 错误说明
如果遇到 `access_token missing` 错误，说明云函数缺少 API Key 配置。

## 配置方法

### 方法1：云端环境变量配置（推荐用于生产环境）
1. 打开微信开发者工具
2. 点击顶部菜单栏的"云开发"按钮
3. 在云开发控制台中选择"云函数"
4. 找到 `azure-gpt4o` 函数，点击进入详情
5. 点击"配置"标签
6. 在"环境变量"部分添加：
   - 变量名：`AZURE_API_KEY`
   - 变量值：你的 Azure OpenAI API Key
7. 点击保存

### 方法2：本地配置文件（仅用于开发测试）
1. 确保 `config.js` 文件存在且包含正确的 API Key
2. 重新上传云函数：
   - 右键点击 `cloudfunctions/azure-gpt4o` 文件夹
   - 选择"上传并部署：云端安装依赖"
   - 注意：选择"云端安装依赖"会忽略 config.js 文件

### 方法3：增量更新（快速修复）
如果你已经有 config.js 文件但云端没有生效：
1. 右键点击 `cloudfunctions/azure-gpt4o` 文件夹
2. 选择"上传并部署：所有文件"（这会包含 config.js）
3. 注意：这种方式会将 API Key 上传到云端，不够安全

## 推荐做法
1. **开发环境**：使用本地 config.js 文件
2. **生产环境**：使用云端环境变量配置
3. **确保 config.js 在 .gitignore 中**（已配置）

## API Key 获取
如需获取 Azure OpenAI API Key：
1. 访问 Azure Portal
2. 找到你的 OpenAI 资源
3. 在"密钥和终结点"部分复制 Key 1 或 Key 2

## 测试
配置完成后，可以在日语解析页面测试功能是否正常。