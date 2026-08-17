# Local-First Autofill Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-subscription, local-first Chrome extension for reviewing and filling recruitment forms with user-configured AI APIs.

**Architecture:** Keep the React workbench unchanged and make the `extension/` directory independently usable. Pure JavaScript modules own persistent profiles, safe form snapshots, deterministic field mapping, and optional API mapping; the side panel coordinates explicit user actions through the MV3 background worker.

**Tech Stack:** Chrome Manifest V3, vanilla ES modules, Chrome storage and scripting APIs, Vitest, Node syntax checks.

---

### Task 1: Define local data and safe form analysis

**Files:**
- Create: `extension/profile-store.js`
- Create: `extension/form-analysis.js`
- Test: `extension/profile-store.test.js`
- Test: `extension/form-analysis.test.js`

- [ ] **Step 1: Write tests for profile normalization and visible field snapshots.**

```js
expect(normalizeProfiles([{ id: 'one', name: 'A' }]).profiles[0].fields.name).toBe('')
expect(analyzeForm(page).fields.map((field) => field.key)).toContain('candidate-name')
```

- [ ] **Step 2: Implement versioned profile defaults and form snapshots.**

```js
export const defaultProfile = () => ({ id: crypto.randomUUID(), label: '我的简历', fields: { name: '', email: '', phone: '', education: '' }, customAnswers: {} })
export function analyzeForm(document) { return { fields: visibleControls(document).map(snapshotField) } }
```

- [ ] **Step 3: Run `npm test -- extension/profile-store.test.js extension/form-analysis.test.js` and confirm it passes.**

### Task 2: Implement deterministic and AI-assisted field mapping

**Files:**
- Create: `extension/field-mapping.js`
- Create: `extension/api-client.js`
- Test: `extension/field-mapping.test.js`
- Test: `extension/api-client.test.js`

- [ ] **Step 1: Write tests covering canonical fields, custom answers, file input blocking, declaration blocking, and JSON mapping normalization.**

```js
expect(buildFillPlan(fields, profile).find((item) => item.fieldId === 'resume').status).toBe('manual')
expect(normalizeAiMapping([{ fieldId: 'email', value: 'x@y.com' }], fields, profile).email).toBe('x@y.com')
```

- [ ] **Step 2: Implement a whitelist-only fill plan and AI JSON validation.**

```js
if (field.kind === 'file' || field.sensitive) return manual(field, 'requires candidate action')
return candidateValue ? ready(field, candidateValue) : manual(field, 'no approved value')
```

- [ ] **Step 3: Run `npm test -- extension/field-mapping.test.js extension/api-client.test.js` and confirm it passes.**

### Task 3: Replace the side panel with a profile and review workspace

**Files:**
- Modify: `extension/sidepanel.html`
- Modify: `extension/sidepanel.css`
- Modify: `extension/sidepanel.js`
- Modify: `extension/background.js`
- Modify: `extension/manifest.json`

- [ ] **Step 1: Add controls for profile selection, local field editing, analysis, reviewed fill, custom answer editing, and API settings.**
- [ ] **Step 2: Add background message handlers that inject `analyzeForm` and `applyFillPlan` only into currently authorized tabs.**
- [ ] **Step 3: Request the current site and configured API origin with `chrome.permissions.request` from a user click.**
- [ ] **Step 4: Preserve existing workbench batch message handling and force unknown, file, login, captcha and final-submit tasks to manual review.**

### Task 4: Make the extension store-ready

**Files:**
- Create: `store/chrome-web-store-description.md`
- Create: `store/privacy-policy.md`
- Create: `store/pack-extension.ps1`
- Modify: `README.md`
- Test: `extension/manifest.test.js`

- [ ] **Step 1: Update manifest metadata, icons, optional host permissions, and no-remote-code declaration.**
- [ ] **Step 2: Add Chinese store description, privacy policy, permission rationale, and local installation steps.**
- [ ] **Step 3: Write a PowerShell packer that excludes test files, local data, source maps and store working files.**
- [ ] **Step 4: Run the packer and inspect ZIP contents before upload.**

### Task 5: Verify and publish

**Files:**
- Test: all `extension/*.test.js`
- Artifact: `store/dist/job-workbench-autofill.zip`

- [ ] **Step 1: Run `npm test`, `npm run lint`, `npm run build`, and `node --check` for every changed extension script.**
- [ ] **Step 2: Load the unpacked extension in Chrome and verify local profile save, page analysis, reviewed fill, manual blockers, desktop layout and mobile-width layout.**
- [ ] **Step 3: Capture required store screenshots and record tested Chrome version.**
- [ ] **Step 4: In Chrome Web Store Developer Dashboard, upload the ZIP, enter the prepared listing metadata, and stop immediately before final public submission if account, payment, or publishing confirmation is required.**

