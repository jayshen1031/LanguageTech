import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { EdgeTTS } from 'edge-tts';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3456;

// 配置文件上传
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB限制
});

// 中间件
app.use(cors());
app.use(express.json());
app.use('/audio', express.static('audio-cache'));

// 确保必要的目录存在
const audioCacheDir = path.join(__dirname, 'audio-cache');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(audioCacheDir)) {
  fs.mkdirSync(audioCacheDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// TTS路由
app.post('/tts', async (req, res) => {
  try {
    const { text, lang = 'ja', voice } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '文本不能为空' });
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
        cached: true
      });
    }
    
    // 使用edge-tts生成音频
    try {
      const tts = new EdgeTTS();
      
      // 选择合适的声音
      let selectedVoice = voice;
      if (!selectedVoice) {
        // 如果没有指定声音，使用默认声音
        if (lang === 'ja') {
          selectedVoice = 'ja-JP-NanamiNeural'; // 日语女声
        } else if (lang === 'en') {
          selectedVoice = 'en-US-AriaNeural'; // 英语女声
        } else {
          selectedVoice = 'zh-CN-XiaoxiaoNeural'; // 中文女声（备用）
        }
      }
      
      // 生成音频
      await tts.synthesize(text, filepath, { voice: selectedVoice });
      console.log(`音频生成成功: ${filename}, 声音: ${selectedVoice}`);
      
    } catch (ttsError) {
      console.error('TTS生成失败:', ttsError);
      
      // 备用方案：如果是macOS，尝试使用系统TTS
      if (process.platform === 'darwin') {
        try {
          const voice = lang === 'ja' ? 'Kyoko' : 'Samantha';
          execSync(`say -v ${voice} -o ${filepath} --data-format=mp3f "${text}"`);
          console.log(`使用系统TTS生成成功: ${filename}`);
        } catch (sysTtsError) {
          console.error('系统TTS也失败了:', sysTtsError);
          return res.json({
            audioUrl: null,
            error: 'TTS生成失败',
            readingInfo: {
              text: text,
              lang: lang
            }
          });
        }
      } else {
        return res.json({
          audioUrl: null,
          error: 'TTS生成失败',
          readingInfo: {
            text: text,
            lang: lang
          }
        });
      }
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
      { id: 'ja-JP-NanamiNeural', name: 'Nanami', gender: 'female', provider: 'edge-tts' },
      { id: 'ja-JP-KeitaNeural', name: 'Keita', gender: 'male', provider: 'edge-tts' },
      { id: 'Kyoko', name: '京子', gender: 'female', provider: 'system' },
      { id: 'Otoya', name: '音也', gender: 'male', provider: 'system' }
    ],
    en: [
      { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', provider: 'edge-tts' },
      { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', provider: 'edge-tts' },
      { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', provider: 'edge-tts' },
      { id: 'Samantha', name: 'Samantha', gender: 'female', provider: 'system' },
      { id: 'Alex', name: 'Alex', gender: 'male', provider: 'system' }
    ],
    zh: [
      { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', provider: 'edge-tts' },
      { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', provider: 'edge-tts' }
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

// 语音识别路由（Speech to Text）
app.post('/stt', upload.single('audio'), async (req, res) => {
  try {
    const { lang = 'ja' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: '请上传音频文件' });
    }
    
    // 这里暂时返回模拟结果
    // 实际项目中可以集成：
    // 1. 微信云开发的语音识别
    // 2. 腾讯云语音识别API
    // 3. 百度语音识别API
    // 4. 讯飞语音识别API
    
    console.log(`收到语音识别请求: ${req.file.originalname}, 语言: ${lang}`);
    
    // 清理上传的临时文件
    fs.unlinkSync(req.file.path);
    
    // 返回模拟结果
    res.json({
      text: '这是一个语音识别的测试结果',
      confidence: 0.95,
      lang: lang,
      alternatives: [
        { text: '这是一个语音识别的测试结果', confidence: 0.95 },
        { text: '这是一个语音识别的测试结论', confidence: 0.85 }
      ]
    });
    
  } catch (error) {
    console.error('STT请求处理失败:', error);
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
    const tts = new EdgeTTS();
    
    // 选择声音
    let selectedVoice = voice;
    if (!selectedVoice) {
      if (lang === 'ja') {
        selectedVoice = 'ja-JP-NanamiNeural';
      } else if (lang === 'en') {
        selectedVoice = 'en-US-AriaNeural';
      } else {
        selectedVoice = 'zh-CN-XiaoxiaoNeural';
      }
    }
    
    // 批量处理
    for (const item of items) {
      const text = typeof item === 'string' ? item : item.text;
      const hashInput = text + lang + selectedVoice;
      const hash = crypto.createHash('md5').update(hashInput).digest('hex');
      const filename = `${hash}.mp3`;
      const filepath = path.join(audioCacheDir, filename);
      
      try {
        // 检查缓存
        if (!fs.existsSync(filepath)) {
          await tts.synthesize(text, filepath, { voice: selectedVoice });
        }
        
        results.push({
          text: text,
          audioUrl: `http://localhost:${PORT}/audio/${filename}`,
          cached: fs.existsSync(filepath)
        });
      } catch (err) {
        results.push({
          text: text,
          audioUrl: null,
          error: err.message
        });
      }
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('批量TTS请求处理失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
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