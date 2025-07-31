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

// 确保必要的目录存在
const audioCacheDir = path.join(__dirname, 'audio-cache');
if (!fs.existsSync(audioCacheDir)) {
  fs.mkdirSync(audioCacheDir, { recursive: true });
}

// 预设音频映射（常用日语词汇）
const PRESET_AUDIO_MAP = {
  '食べる': 'https://www.nhk.or.jp/kansen/words/audio/taberu.mp3',
  '学校': 'https://www.nhk.or.jp/kansen/words/audio/gakkou.mp3', 
  '本': 'https://www.nhk.or.jp/kansen/words/audio/hon.mp3',
  '友達': 'https://www.nhk.or.jp/kansen/words/audio/tomodachi.mp3',
  '時間': 'https://www.nhk.or.jp/kansen/words/audio/jikan.mp3',
  'こんにちは': 'https://example.com/konnichiwa.mp3',
  'ありがとう': 'https://example.com/arigatou.mp3'
};

// TTS路由
app.post('/tts', async (req, res) => {
  try {
    const { text, lang = 'ja', voice } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '文本不能为空' });
    }
    
    console.log(`TTS请求: ${text} (${lang})`);
    
    // 检查预设音频
    if (PRESET_AUDIO_MAP[text]) {
      console.log('使用预设音频');
      return res.json({
        audioUrl: PRESET_AUDIO_MAP[text],
        cached: true,
        source: 'preset'
      });
    }
    
    // 生成文件名（基于文本内容、语言和声音的hash）
    const hashInput = text + lang + (voice || '');
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');
    const filename = `${hash}.mp3`;
    const filepath = path.join(audioCacheDir, filename);
    
    // 检查缓存
    if (fs.existsSync(filepath)) {
      return res.json({
        audioUrl: `http://localhost:${PORT}/audio/${filename}`,
        cached: true,
        source: 'cache'
      });
    }
    
    // 使用系统TTS生成音频（macOS示例）
    try {
      if (process.platform === 'darwin') {
        // macOS使用say命令
        const voice = lang === 'ja' ? 'Kyoko' : 'Samantha';
        execSync(`say -v ${voice} -o "${filepath}" --data-format=mp3f "${text}"`);
        console.log(`系统TTS生成成功: ${filename}`);
        
        return res.json({
          audioUrl: `http://localhost:${PORT}/audio/${filename}`,
          cached: false,
          source: 'system_tts'
        });
      } else {
        // 非macOS平台返回读音信息
        throw new Error('当前平台暂不支持TTS');
      }
    } catch (ttsError) {
      console.error('TTS生成失败:', ttsError);
      // 如果TTS失败，返回读音信息
      return res.json({
        audioUrl: null,
        error: 'TTS生成失败',
        readingInfo: {
          text: text,
          lang: lang,
          message: '请手动朗读或稍后重试'
        },
        source: 'fallback'
      });
    }
    
  } catch (error) {
    console.error('TTS请求处理失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 批量TTS生成
app.post('/batch-tts', async (req, res) => {
  try {
    const { items, lang = 'ja', voice } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: '请提供要转换的文本数组' });
    }
    
    const results = [];
    
    // 批量处理
    for (const item of items) {
      const text = typeof item === 'string' ? item : item.text;
      
      // 检查预设音频
      if (PRESET_AUDIO_MAP[text]) {
        results.push({
          text: text,
          audioUrl: PRESET_AUDIO_MAP[text],
          cached: true,
          source: 'preset'
        });
        continue;
      }
      
      // 生成缓存
      const hashInput = text + lang + (voice || '');
      const hash = crypto.createHash('md5').update(hashInput).digest('hex');
      const filename = `${hash}.mp3`;
      const filepath = path.join(audioCacheDir, filename);
      
      try {
        // 检查缓存
        if (!fs.existsSync(filepath) && process.platform === 'darwin') {
          const voiceName = lang === 'ja' ? 'Kyoko' : 'Samantha';
          execSync(`say -v ${voiceName} -o "${filepath}" --data-format=mp3f "${text}"`);
        }
        
        if (fs.existsSync(filepath)) {
          results.push({
            text: text,
            audioUrl: `http://localhost:${PORT}/audio/${filename}`,
            cached: fs.existsSync(filepath),
            source: 'system_tts'
          });
        } else {
          results.push({
            text: text,
            audioUrl: null,
            error: 'TTS不可用',
            source: 'fallback'
          });
        }
      } catch (err) {
        results.push({
          text: text,
          audioUrl: null,
          error: err.message,
          source: 'error'
        });
      }
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('批量TTS请求处理失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取支持的语言和声音
app.get('/voices', (req, res) => {
  const voices = {
    ja: [
      { id: 'Kyoko', name: '京子', gender: 'female', provider: 'system' },
      { id: 'Otoya', name: '音也', gender: 'male', provider: 'system' }
    ],
    en: [
      { id: 'Samantha', name: 'Samantha', gender: 'female', provider: 'system' },
      { id: 'Alex', name: 'Alex', gender: 'male', provider: 'system' }
    ]
  };
  
  res.json({ voices });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    platform: process.platform,
    audioCache: fs.readdirSync(audioCacheDir).length,
    ttsSupport: process.platform === 'darwin' ? 'system' : 'limited'
  });
});

// 清理缓存
app.post('/clear-cache', (req, res) => {
  try {
    const files = fs.readdirSync(audioCacheDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(audioCacheDir, file));
    });
    res.json({ cleared: files.length });
  } catch (error) {
    res.status(500).json({ error: '清理失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🎵 音频MCP服务运行在 http://localhost:${PORT}`);
  console.log(`📱 平台: ${process.platform}`);
  console.log(`📁 音频缓存目录: ${audioCacheDir}`);
  console.log(`🔧 TTS支持: ${process.platform === 'darwin' ? '系统TTS' : '有限支持'}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  process.exit(0);
});