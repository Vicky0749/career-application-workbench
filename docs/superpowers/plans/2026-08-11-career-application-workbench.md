# Career Application Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a local job-application workbench and Chrome extension that ranks Huawei, Tencent, and PwC China positions, gates them through review, and prefills approved facts without submitting applications.

**Architecture:** A React/Vite single-page app owns local candidate data and deterministic eligibility logic. A Manifest V3 side-panel extension owns page capture and field prefill, with the shared data contracts duplicated as small serializable types rather than a runtime dependency.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, Vitest, Testing Library, Lucide, Chrome MV3.

---

### Task 1: Create the isolated application and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test/setup.ts`

- [ ] Define scripts for `dev`, `build`, `lint`, and `test`, enable jsdom in Vitest, and mount `App` from `main.tsx`.
- [ ] Add an initial App test asserting that the product name appears, run it and verify it fails before the App implementation exists.
- [ ] Implement only the shell needed to make the initial test pass, then run the test again.

### Task 2: Model jobs, evidence, matching, and review gating

**Files:**
- Create: `src/domain/types.ts`, `src/domain/seed.ts`, `src/domain/matching.ts`, `src/domain/review.ts`
- Test: `src/domain/matching.test.ts`, `src/domain/review.test.ts`

- [ ] Write failing tests that expect a primary-track Tencent business-analysis role to rank above a stale, ineligible role and that expect unknown screening answers to block `ready_to_prefill`.
- [ ] Implement pure types and seed records based only on the career report, including source dates and no invented metrics.
- [ ] Implement score explanations, missing requirements, staleness detection, and the four-step review transition.
- [ ] Run both focused test files and confirm all cases pass.

### Task 3: Add local state and interactive workbench views

**Files:**
- Create: `src/store/workbench-store.ts`
- Create: `src/components/AppShell.tsx`, `src/components/Dashboard.tsx`, `src/components/JobTable.tsx`, `src/components/JobDetail.tsx`, `src/components/ReviewQueue.tsx`, `src/components/Profile.tsx`, `src/components/ProviderSettings.tsx`
- Test: `src/components/JobTable.test.tsx`, `src/components/ReviewQueue.test.tsx`

- [ ] Write failing interaction tests for changing a track filter and resolving one review blocker.
- [ ] Store jobs, selected job, active view, filters, screening answers, review flags, and session-only provider key in Zustand. Persist serializable non-secret data only.
- [ ] Implement compact table-first desktop UI and responsive single-column behavior. Expose real filter controls, status chips, clear source timestamps, and source links.
- [ ] Implement profile facts, evidence records, and an OpenAI-compatible provider form without displaying the secret value after it is entered.
- [ ] Run component tests, then the full unit suite.

### Task 4: Implement extension contracts and no-submit prefill engine

**Files:**
- Create: `extension/manifest.json`, `extension/background.ts`, `extension/content.ts`, `extension/sidepanel.html`, `extension/sidepanel.ts`, `extension/adapters.ts`, `extension/prefill.ts`
- Test: `extension/prefill.test.ts`, `extension/adapters.test.ts`

- [ ] Write failing tests proving the Huawei/Tencent/PwC policy recognizes only configured hosts, page collection rejects a missing title, and prefill never includes a submit selector.
- [ ] Implement the adapter registry with official domains, ordered title/location/JD selectors, and a content collector that writes typed capture records.
- [ ] Implement a prefill plan that maps only candidate data fields, waits for explicit side-panel action, emits audit events, and returns `needs-review` for unknown fields.
- [ ] Add the MV3 manifest with side panel, storage permission, and exactly the three official host permissions. Ensure no broad `<all_urls>` permission is present.
- [ ] Run extension-domain tests and inspect the source for absent submit automation.

### Task 5: Verify the application surface and extension package

**Files:**
- Create: `README.md`, `qa/`

- [ ] Run lint, unit tests, and production build.
- [ ] Start Vite, capture browser screenshots of dashboard, filtered jobs, and review state at desktop and mobile widths.
- [ ] Inspect screenshots for overflow, clipped tables, hidden controls, and inaccessible text; correct any failures and repeat.
- [ ] Validate `extension/manifest.json` as JSON and document unpacked-extension loading plus the mandatory human submission step.
- [ ] Commit the completed project, preserving only source, test, and necessary documentation artifacts.
