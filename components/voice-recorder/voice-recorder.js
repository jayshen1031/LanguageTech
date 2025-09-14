// 语音录音组件
const recorderManager = wx.getRecorderManager()

Component({
  properties: {
    maxDuration: {
      type: Number,
      value: 60000 // 最长录音时长，单位ms，默认60秒
    },
    sampleRate: {
      type: Number,
      value: 16000 // 采样率，默认16000
    },
    format: {
      type: String,
      value: 'mp3' // 录音格式
    }
  },

  data: {
    isRecording: false,
    recordingTime: 0,
    timer: null,
    tempFilePath: '',
    waveformData: [] // 波形数据
  },

  lifetimes: {
    attached() {
      this.initRecorder()
    },
    detached() {
      this.stopTimer()
      if (this.data.isRecording) {
        recorderManager.stop()
      }
    }
  },

  methods: {
    // 初始化录音管理器
    initRecorder() {
      // 录音开始
      recorderManager.onStart(() => {
        // console.log('🎙️ 录音开始')
        this.setData({ isRecording: true })
        this.startTimer()
        this.triggerEvent('start')
      })

      // 录音暂停
      recorderManager.onPause(() => {
        // console.log('⏸️ 录音暂停')
        this.stopTimer()
        this.triggerEvent('pause')
      })

      // 录音继续
      recorderManager.onResume(() => {
        // console.log('▶️ 录音继续')
        this.startTimer()
        this.triggerEvent('resume')
      })

      // 录音停止
      recorderManager.onStop((res) => {
        // console.log('⏹️ 录音停止', res)
        this.stopTimer()
        this.setData({
          isRecording: false,
          tempFilePath: res.tempFilePath
        })
        
        // 触发停止事件，返回录音文件路径和时长
        this.triggerEvent('stop', {
          tempFilePath: res.tempFilePath,
          duration: res.duration,
          fileSize: res.fileSize
        })
      })

      // 录音错误
      recorderManager.onError((err) => {
        console.error('❌ 录音错误:', err)
        this.stopTimer()
        this.setData({ isRecording: false })
        
        // 处理常见错误
        let errorMsg = '录音失败'
        if (err.errMsg.includes('auth deny')) {
          errorMsg = '请授权使用麦克风'
        } else if (err.errMsg.includes('operateRecorder:fail')) {
          errorMsg = '录音功能暂不可用'
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        })
        
        this.triggerEvent('error', err)
      })

      // 已录制完指定帧大小音频时触发
      recorderManager.onFrameRecorded((res) => {
        // 可用于实时处理音频数据，如显示波形
        const { frameBuffer } = res
        this.updateWaveform(frameBuffer)
      })
    },

    // 开始录音
    startRecord() {
      // 检查授权
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.record']) {
            // 请求授权
            wx.authorize({
              scope: 'scope.record',
              success: () => {
                this.doStartRecord()
              },
              fail: () => {
                wx.showModal({
                  title: '提示',
                  content: '需要您授权麦克风才能使用语音功能',
                  confirmText: '去设置',
                  success: (res) => {
                    if (res.confirm) {
                      wx.openSetting()
                    }
                  }
                })
              }
            })
          } else {
            this.doStartRecord()
          }
        }
      })
    },

    // 执行开始录音
    doStartRecord() {
      const options = {
        duration: this.data.maxDuration,
        sampleRate: this.data.sampleRate,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: this.data.format,
        frameSize: 50 // 指定帧大小，用于onFrameRecorded回调
      }

      recorderManager.start(options)
    },

    // 停止录音
    stopRecord() {
      if (this.data.isRecording) {
        recorderManager.stop()
      }
    },

    // 暂停录音
    pauseRecord() {
      if (this.data.isRecording) {
        recorderManager.pause()
      }
    },

    // 继续录音
    resumeRecord() {
      recorderManager.resume()
    },

    // 开始计时
    startTimer() {
      this.stopTimer()
      const startTime = Date.now() - this.data.recordingTime * 1000
      
      this.data.timer = setInterval(() => {
        const recordingTime = Math.floor((Date.now() - startTime) / 1000)
        this.setData({ recordingTime })
        
        // 触发时间更新事件
        this.triggerEvent('timeupdate', { time: recordingTime })
        
        // 达到最大时长自动停止
        if (recordingTime >= this.data.maxDuration / 1000) {
          this.stopRecord()
        }
      }, 100)
    },

    // 停止计时
    stopTimer() {
      if (this.data.timer) {
        clearInterval(this.data.timer)
        this.data.timer = null
      }
    },

    // 更新波形数据
    updateWaveform(frameBuffer) {
      // 简单的波形数据处理
      const dataArray = new Uint8Array(frameBuffer)
      const step = Math.floor(dataArray.length / 50)
      const waveformData = []
      
      for (let i = 0; i < 50; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j]
        }
        waveformData.push(Math.floor(sum / step / 255 * 100))
      }
      
      this.setData({ waveformData })
      this.triggerEvent('waveform', { data: waveformData })
    },

    // 格式化时间显示
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    },

    // 切换录音状态
    toggleRecord() {
      if (this.data.isRecording) {
        this.stopRecord()
      } else {
        this.startRecord()
      }
    }
  }
})