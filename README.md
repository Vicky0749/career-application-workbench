# 求职投递工作台

本地管理华为、腾讯和 PwC 中国的岗位线索、匹配解释、审核阻塞项与投递状态。候选人事实保存到浏览器本地存储；模型与搜索 API Key 只保留在当前页面会话。

## 工作流

1. 在“导入与发现”粘贴简历或导入 TXT、Markdown、DOCX，生成待确认的档案草稿。
2. 在“AI 与搜索 API”选择 OpenAI 兼容接口，或填写任意 JSON 网关的请求模板、响应路径和附加请求头；搜索接口可返回 `results`、`items`、`organic` 或 `data.results`。
3. 用官网域名限定查询发现岗位线索，回到官网页面复核具体 JD。
4. 在“审核与批量投递”完成筛选题、选择岗位，再由扩展逐个打开官网标签页并预填。
5. 在每个官网页面完成简历上传和最终检查，回到工作台逐项勾选审核后，再发起本轮批量发送。

浏览器会直接请求你填写的接口，因此接口或本地代理需要允许 `http://127.0.0.1` / `http://localhost` 的跨域请求。

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
5. 从本地工作台发起批量预填时，扩展会打开本轮岗位的官网标签页并回传审计结果。

扩展不会代替本人处理登录、验证码、OTP、文件上传、声明题或未知筛选题。只有已预填、在官网页面完成最终检查、并在工作台逐项确认过的岗位，才会在总确认后触发提交控件；每个岗位都会保留发送或人工处理结果。

## 参考项目

- [Gsync/jobsync](https://github.com/Gsync/jobsync)：MIT，自托管职位追踪与 AI 职业助手；本项目参考其本地优先的数据管理思路。
- [Shahazeer/JobApplicationAutofiller_BrowserExtension](https://github.com/Shahazeer/JobApplicationAutofiller_BrowserExtension)：MIT，浏览器预填扩展；本项目采用独立的国内官网适配与审核编排。

## 验证

```powershell
npm test
npm run build
npm run lint
```
