# 腾讯云OCR语言代码参考

## GeneralBasicOCR 接口支持的语言代码

### 常用语言
- `auto`: 自动识别（默认）
- `zh`: 简体中文
- `zh-tw`: 繁体中文
- `en`: 英语
- `jap`: 日语（注意：不是JAP，是小写jap）
- `kor`: 韩语

### 其他支持的语言
- `spa`: 西班牙语
- `fre`: 法语
- `ger`: 德语
- `tur`: 土耳其语
- `rus`: 俄语
- `por`: 葡萄牙语
- `vie`: 越南语
- `may`: 马来语
- `tha`: 泰语
- `ara`: 阿拉伯语
- `hi`: 印地语
- `it`: 意大利语

## 使用示例

```javascript
// 日语OCR
const res = await wx.cloud.callFunction({
  name: 'ocr-service',
  data: {
    imageUrl: 'cloud://xxx.jpg',
    languageType: 'jap'  // 正确的日语代码
  }
})

// 自动识别
const res = await wx.cloud.callFunction({
  name: 'ocr-service',
  data: {
    imageUrl: 'cloud://xxx.jpg',
    languageType: 'auto'  // 自动识别语言
  }
})
```

## 注意事项

1. 语言代码必须使用小写
2. 如果不确定语言，可以使用 'auto' 自动识别
3. 日语识别建议使用 'jap'，而不是 'auto'，可以提高准确率
4. 混合语言文本建议使用 'auto'

## 错误代码

- `FailedOperation.LanguageNotSupport`: 输入的语言代码不支持
- `FailedOperation.ImageDecodeFailed`: 图片解码失败
- `FailedOperation.OcrFailed`: OCR识别失败
- `FailedOperation.UnKnowError`: 未知错误
- `FailedOperation.UnOpenError`: 服务未开通

## 参考链接

[腾讯云OCR文档](https://cloud.tencent.com/document/product/866/33515)