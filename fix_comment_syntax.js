// 批量修复云函数中的注释语法错误
// 运行: node fix_comment_syntax.js

const fs = require('fs')
const path = require('path')

const cloudFunctionsDir = './cloudfunctions'

// 获取所有云函数目录
const getFunctionDirs = () => {
  return fs.readdirSync(cloudFunctionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}

// 修复单个文件的注释语法
const fixCommentSyntax = (filePath) => {
  if (!fs.existsSync(filePath)) return false
  
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false
  
  // 查找形如 "// console.log('xxx', {" 的模式，后跟未注释的对象属性
  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 检查是否是注释的console.log开始且包含对象字面量
    if (line.trim().match(/^\/\/.*console\.log.*\{$/)) {
      // 查找对应的结束括号
      let depth = 1
      let j = i + 1
      
      while (j < lines.length && depth > 0) {
        const nextLine = lines[j].trim()
        
        // 如果这一行不是注释，且不是纯空白，需要注释掉
        if (!nextLine.startsWith('//') && nextLine !== '') {
          if (nextLine === '}' || nextLine === '})') {
            lines[j] = lines[j].replace(/^(\s*)/, '$1// ')
            modified = true
            depth--
          } else if (nextLine.includes(':') || nextLine.includes(',')) {
            // 对象属性行
            lines[j] = lines[j].replace(/^(\s*)/, '$1// ')
            modified = true
          }
        } else if (nextLine === '})' || nextLine === '}') {
          depth--
        }
        
        if (nextLine.includes('{')) depth++
        if (nextLine.includes('}')) depth--
        
        j++
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8')
    return true
  }
  
  return false
}

// 主函数
const main = () => {
  console.log('🔧 开始批量修复云函数注释语法错误...')
  
  const functionDirs = getFunctionDirs()
  let fixedCount = 0
  
  functionDirs.forEach(funcName => {
    const indexPath = path.join(cloudFunctionsDir, funcName, 'index.js')
    
    if (fixCommentSyntax(indexPath)) {
      console.log(`✅ 修复: ${funcName}/index.js`)
      fixedCount++
    } else {
      console.log(`⏭️ 跳过: ${funcName}/index.js (无需修复)`)
    }
  })
  
  console.log(`\n🎉 修复完成! 共修复了 ${fixedCount} 个云函数`)
  console.log('现在可以重新部署云函数了')
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = { fixCommentSyntax }