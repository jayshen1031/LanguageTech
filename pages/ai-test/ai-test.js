// AI测试页面
const deepseekAI = require('../../utils/deepseekAI');

Page({
  data: {
    inputText: '',
    showThinking: false,
    thinkingExpanded: false,
    thinkingContent: '',
    showResult: false,
    formattedResult: '',
    isStreaming: false,
    streamingText: '',
    errorMsg: ''
  },

  onLoad() {
    // 初始化云开发
    if (!wx.cloud) {
      wx.showModal({
        title: '提示',
        content: '请使用微信开发者工具打开此项目，并开启云开发功能',
        showCancel: false
      });
      return;
    }
  },

  // 输入变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // 语法分析
  async analyzeGrammar() {
    const { inputText } = this.data;
    
    if (!inputText.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // 重置状态
    this.setData({
      showThinking: false,
      showResult: false,
      isStreaming: true,
      streamingText: '正在分析...',
      errorMsg: ''
    });

    try {
      // 使用 DeepSeek 进行语法分析
      const result = await deepseekAI.analyzeGrammarWithReasoning(inputText);
      
      // 显示结果
      this.setData({
        showThinking: true,
        thinkingContent: result.reasoning || '无思考过程',
        showResult: true,
        formattedResult: this.formatAnalysisResult(result.analysis),
        isStreaming: false
      });
      
    } catch (error) {
      console.error('语法分析失败:', error);
      this.setData({
        errorMsg: '分析失败: ' + (error.message || '未知错误'),
        isStreaming: false
      });
    }
  },

  // 快速对话
  async quickChat() {
    const { inputText } = this.data;
    
    if (!inputText.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showThinking: false,
      showResult: false,
      isStreaming: true,
      streamingText: '',
      errorMsg: ''
    });

    try {
      // 使用模拟流式输出
      const generator = deepseekAI.streamChat(
        [{ role: "user", content: inputText }]
      );
      
      let fullThinking = '';
      let fullContent = '';
      
      // 处理流式响应
      await deepseekAI.parseStreamResponse(generator, {
        onThinking: (delta, full) => {
          fullThinking = full;
          this.setData({
            showThinking: true,
            thinkingContent: full
          });
        },
        onContent: (delta, full) => {
          fullContent = full;
          this.setData({
            streamingText: full
          });
        },
        onError: (error) => {
          console.error('流式响应错误:', error);
          this.setData({
            errorMsg: error.message || '生成响应时出错'
          });
        }
      });
      
      // 最终结果
      this.setData({
        showResult: true,
        formattedResult: this.formatChatResult(fullContent),
        isStreaming: false
      });
      
    } catch (error) {
      console.error('对话失败:', error);
      this.setData({
        errorMsg: '对话失败: ' + (error.message || '未知错误'),
        isStreaming: false
      });
    }
  },

  // 格式化分析结果
  formatAnalysisResult(analysis) {
    // 将纯文本转换为富文本格式
    const formatted = analysis
      .replace(/\n/g, '<br/>')
      .replace(/(\d+\.\s.*?)(<br\/>|$)/g, '<p style="margin: 10px 0;"><strong>$1</strong></p>')
      .replace(/【(.*?)】/g, '<span style="color: #1890ff; font-weight: bold;">【$1】</span>');
    
    return formatted;
  },

  // 格式化对话结果
  formatChatResult(content) {
    return content.replace(/\n/g, '<br/>');
  },

  // 切换思维链显示
  toggleThinking() {
    this.setData({
      thinkingExpanded: !this.data.thinkingExpanded
    });
  }
});