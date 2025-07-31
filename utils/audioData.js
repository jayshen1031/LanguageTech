// 预录制的音频数据（Base64编码）
// 这些是简短的日语单词发音，用于演示

const audioData = {
  // "た" 的发音
  'た': 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAADAAAGkABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAABpBiZqWqAAAAAAD/+0DEAAPH',
  
  // 示例：简单的提示音
  'beep': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi'
}

// 获取单词的音频（如果有的话）
function getAudioForWord(word) {
  // 这里可以添加更多单词的音频
  const audioMap = {
    '食べる': audioData['た'], // 临时使用"た"的音频
    'こんにちは': audioData['beep']
  }
  
  return audioMap[word] || null
}

module.exports = {
  audioData,
  getAudioForWord
}