#!/bin/bash

echo "启动语伴君音频MCP服务..."

# 进入音频MCP服务目录
cd audio-mcp-server

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 启动服务
echo "服务启动中..."
npm start