import { readFile, writeFile } from 'node:fs/promises'

const header = `// ==UserScript==
// @name         求职工作台 - 本地自动填写
// @namespace    https://github.com/Vicky0749/career-application-workbench
// @version      0.1.0
// @description  本地保存求职资料，审核后填写招聘表单，支持自填 AI API。
// @downloadURL  https://raw.githubusercontent.com/Vicky0749/career-application-workbench/master/userscript/job-workbench-autofill.user.js
// @updateURL    https://raw.githubusercontent.com/Vicky0749/career-application-workbench/master/userscript/job-workbench-autofill.user.js
// @match        https://*/*
// @match        http://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==
`

const core = (await readFile(new URL('./core.js', import.meta.url), 'utf8')).replace(/^export /gm, '')
const runtime = await readFile(new URL('./runtime.js', import.meta.url), 'utf8')
await writeFile(new URL('./job-workbench-autofill.user.js', import.meta.url), `${header}\n${core}\n;\n${runtime}`)
