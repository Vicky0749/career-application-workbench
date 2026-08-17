# Tampermonkey Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free, GitHub-hosted Tampermonkey edition of the local-first job-form assistant.

**Architecture:** Keep testable normalization, form analysis, field mapping, and reviewed-fill code in `userscript/core.js`. Build one installable `.user.js` file that embeds the core, provides a Shadow DOM drawer, persists data through Tampermonkey storage, and calls only the API configured by the candidate.

**Tech Stack:** JavaScript, Tampermonkey GM APIs, Shadow DOM, Vitest, Node.js.

---

### Task 1: Add testable safe form core

**Files:**
- Create: `userscript/core.js`
- Create: `userscript/core.test.js`

- [x] **Step 1: Write failing tests for profile normalization, sensitive-field blocking, and whitelisted AI mappings.**
- [x] **Step 2: Run `npm test -- userscript/core.test.js` and verify imports fail before implementation.**
- [x] **Step 3: Implement pure profile, field-analysis, fill-plan, and AI-mapping helpers.**
- [x] **Step 4: Run `npm test -- userscript/core.test.js` and verify all tests pass.**

### Task 2: Build the installable userscript

**Files:**
- Create: `userscript/runtime.js`
- Create: `userscript/build-userscript.mjs`
- Create: `userscript/job-workbench-autofill.user.js`

- [x] **Step 1: Build a Shadow DOM control drawer with profile fields, analysis, audit, reviewed fill, and API configuration.**
- [x] **Step 2: Use only `GM_getValue`, `GM_setValue`, `GM_registerMenuCommand`, and a user-clicked `GM_xmlhttpRequest` for user-configured APIs.**
- [x] **Step 3: Build the single installable file and run `node --check userscript/job-workbench-autofill.user.js`.**

### Task 3: Document and verify GitHub distribution

**Files:**
- Create: `userscript/README.md`
- Modify: `README.md`

- [x] **Step 1: Document one-click `.user.js` installation, local-data boundary, and manual handling of files, logins, consent, captcha, and final submission.**
- [x] **Step 2: Run all tests, build the userscript, run lint and syntax checks.**
- [ ] **Step 3: Commit only userscript/distribution files, push GitHub, and merge the public PR.**
