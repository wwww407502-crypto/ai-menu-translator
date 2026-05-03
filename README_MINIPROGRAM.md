# AI 菜单微信小程序

这个目录已经从原 iOS 客户端迁出一套原生微信小程序实现，入口在 `miniprogram/`。

## 结构

```text
miniprogram/
  app.js / app.json / app.wxss
  pages/index/      # 拍照/相册导入，上传解析
  pages/menu/       # 菜单分类、搜索、购物车
  pages/receipt/    # 小票、点单原文、复制
  utils/            # API、格式化、演示数据
backend/            # 沿用原 Express 后端
```

## 运行

1. 启动后端：

```sh
cd backend
npm start
```

2. 用微信开发者工具打开仓库根目录。
3. 如果使用本地后端，开发者工具里勾选“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”。
4. 本地接口地址在 `miniprogram/utils/config.js`，默认是：

```js
http://127.0.0.1:3000/api/v1
```

真机预览时不能访问电脑上的 `127.0.0.1`，需要改成局域网 IP、内网穿透地址或 HTTPS 域名。

## 功能映射

- iOS `ImagePicker` → 小程序 `wx.chooseMedia` / `wx.chooseImage`
- iOS `APIService` → `wx.uploadFile`
- iOS `MenuViewModel` → `app.globalData` + 页面状态
- iOS 小票和 TTS → 小票页 + 点单原文复制

小程序没有等价的系统 TTS API，所以当前版本把播报改成生成原文点单文本并一键复制。
