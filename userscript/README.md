# 求职工作台 Tampermonkey 版

这是无需 Chrome Web Store 开发者账号的免费发行版。资料保存在 Tampermonkey 本地存储中；没有订阅、后端账户或云端同步。

## 安装

1. 从浏览器商店安装 Tampermonkey。
2. 打开 [安装脚本](https://raw.githubusercontent.com/Vicky0749/career-application-workbench/master/userscript/job-workbench-autofill.user.js)。
3. 在 Tampermonkey 安装页确认安装。之后打开招聘表单，点击右下角 `JW` 打开工作台。

## 能力与边界

- 管理多份本地简历、岗位关键词与常用问答。
- 分析当前招聘页面，提示自动填写支持度和推荐的简历版本。
- 只有审核后点击“填写已审核字段”才会写入页面。
- 可使用自行配置的 OpenAI 兼容或自定义 JSON API；只有点击 AI 映射时才发起该请求。
- 文件上传、密码、登录、验证码、同意/声明、敏感题和最终提交始终由本人处理。

## 更新

脚本安装后会从本仓库自动检查更新。发布新版本前，在项目根目录运行：

```powershell
node .\userscript\build-userscript.mjs
```
