const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const app = express();
const PORT = 3456;

// 中间件
app.use(cors());
app.use(express.json());
app.use('/audio', express.static('audio-cache'));

// 确保音频缓存目录存在
const audioCacheDir = path.join(__dirname, 'audio-cache');
if (!fs.existsSync(audioCacheDir)) {
  fs.mkdirSync(audioCacheDir, { recursive: true });
}

// TTS路由
app.post('/tts', async (req, res) => {
  try {
    const { text, lang = 'ja' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '文本不能为空' });
    }
    
    // 生成文件名（基于文本内容的hash）
    const hash = crypto.createHash('md5').update(text + lang).digest('hex');
    const filename = `${hash}.mp3`;
    const filepath = path.join(audioCacheDir, filename);
    
    // 检查缓存
    if (fs.existsSync(filepath)) {
      return res.json({
        audioUrl: `http://localhost:${PORT}/audio/${filename}`,
        cached: true
      });
    }
    
    // 使用系统TTS生成音频（macOS示例）
    try {
      if (process.platform === 'darwin') {
        // macOS使用say命令
        const voice = lang === 'ja' ? 'Kyoko' : 'Samantha';
        execSync(`say -v ${voice} -o ${filepath} --data-format=mp3f "${text}"`);
      } else {
        // 其他平台的备选方案
        // 这里可以集成edge-tts或其他TTS服务
        throw new Error('当前平台暂不支持TTS');
      }
    } catch (ttsError) {
      console.error('TTS生成失败:', ttsError);
      // 如果TTS失败，返回空音频URL
      return res.json({
        audioUrl: null,
        error: 'TTS生成失败',
        readingInfo: {
          text: text,
          lang: lang
        }
      });
    }
    
    // 返回音频URL
    res.json({
      audioUrl: `http://localhost:${PORT}/audio/${filename}`,
      cached: false
    });
    
  } catch (error) {
    console.error('TTS请求处理失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取支持的语言和声音
app.get('/voices', (req, res) => {
  const voices = {
    ja: [
      { id: 'Kyoko', name: '京子', gender: 'female' },
      { id: 'Otoya', name: '音也', gender: 'male' }
    ],
    en: [
      { id: 'Samantha', name: 'Samantha', gender: 'female' },
      { id: 'Alex', name: 'Alex', gender: 'male' }
    ]
  };
  
  res.json({ voices });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    platform: process.platform,
    audioCache: fs.readdirSync(audioCacheDir).length
  });
});

// 清理缓存
app.post('/clear-cache', (req, res) => {
  const files = fs.readdirSync(audioCacheDir);
  files.forEach(file => {
    fs.unlinkSync(path.join(audioCacheDir, file));
  });
  res.json({ cleared: files.length });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`音频MCP服务运行在 http://localhost:${PORT}`);
  console.log(`平台: ${process.platform}`);
  console.log(`音频缓存目录: ${audioCacheDir}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  process.exit(0);
});