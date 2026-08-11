# 求职投递工作台

本地管理华为、腾讯和 PwC 中国的岗位线索、匹配解释、审核阻塞项与投递状态。候选人事实保存到浏览器本地存储；模型 API Key 只保留在当前页面会话。

## 运行

```powershell
npm install
npm run dev
```

## Chrome 扩展

1. 在 Chrome 打开 `chrome://extensions`，开启开发者模式。
2. 选择“加载已解压的扩展程序”，目录为 `extension`。
3. 在华为、腾讯或 PwC 中国官网的职位页打开扩展侧栏。
4. 保存本人确认过的档案，先“读取岗位”，再“开始预填”。

扩展仅预填普通文本字段并记录审计结果。文件上传、登录、验证码、OTP、声明题、未知筛选题和最终提交均需由申请人完成。

## 验证

```powershell
npm test
npm run build
npm run lint
```
