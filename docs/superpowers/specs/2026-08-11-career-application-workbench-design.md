# Career Application Workbench Design

## Decision

Build a private, local-first job application workbench for Wang Wenxiang. The browser application manages profile facts, experience evidence, job discovery, matching, review, and application status. A separate Chrome Manifest V3 extension runs only on an official job site where the user has already logged in; it can capture page metadata and prefill approved facts, but it never presses the final submit control.

The first supported employers are Huawei, Tencent, and PwC China. The application is deliberately a new project rather than a modification of `career-price-workbench`, whose price-comparison models and navigation do not belong in the job workflow.

## User And Career Fit

The candidate is expected to graduate in 2028 from the Master of Accounting program at Xiamen University. The report establishes the following targeting order:

1. Primary: business analysis, operations analysis, data analysis, strategy operations, commercialization strategy, and growth strategy.
2. Challenge: TMT, consumer, and digital strategy consulting or corporate strategy.
3. Base: commercial finance, FP&A, transaction services, and finance management trainee programs.

The seed evidence emphasizes industry and competitor research, structured analysis and executive communication, finance/accounting foundations, English reading and communication, and Excel/Python/Stata/SPSS/iFinD. SQL, business metrics, experiments, BI storytelling, and case/interview practice are marked as development gaps, never fabricated as completed experience.

## Functional Scope

### Local Workbench

- A dashboard surfaces application counts by track, review-risk counts, and the next action.
- The profile view stores personal facts, education, contact data, links, and resume document metadata. Secrets are excluded from persisted state.
- The evidence pool stores resume-safe experience claims with source notes, measurable outcomes, skills, and an explicit verification flag.
- The jobs view presents a searchable table of captured jobs for Huawei, Tencent, and PwC China. Every job stores source URL, captured date, original posting date when visible, job family, location, graduation eligibility, conversion evidence, and source confidence.
- The matching engine awards points for track, title keywords, skills, company, graduation eligibility, and return-offer evidence; it also records missing requirements. It must return an explanation rather than an opaque score.
- The review queue blocks a job from being "ready to prefill" until its source URL, capture date, graduation eligibility, location, and required facts have been checked. Unknown screening answers are visible as blockers.
- Provider settings accept an OpenAI-compatible base URL, model name, and API key for future assistive copy or job analysis. The key remains in session memory only. Custom vendors require an adapter and are not represented as universally compatible.

### Browser Extension

- A side panel exposes the selected, reviewed application and a field-by-field plan.
- Host policy limits the extension to Huawei, Tencent, and PwC China domains configured in `manifest.json`.
- The page collector captures URL, title, visible role name, visible location, and visible job-description text. It cannot claim a job was captured if the page has no readable role title.
- The prefill engine fills mapped text, email, phone, education, resume, and free-text fields only after the user clicks "Start prefill" in the side panel. Each attempted field becomes an audit event: `filled`, `skipped`, or `needs-review`.
- Submit buttons are not queried, clicked, or simulated. Login, CAPTCHA, OTP, file upload authorization, legal declarations, and all unknown questions remain user actions.

## Data And State

The application has four separate states:

1. `discovered`: a source or manually entered job awaits verification.
2. `qualified`: source and eligibility checks are complete; it may be ranked.
3. `review_required`: the applicant must resolve a missing fact, screening answer, or substantive mismatch.
4. `ready_to_prefill`: all required fields have known, approved values and the user can open the official site.

After the extension acts, its audit states are `not_started`, `in_progress`, `prefilled`, `needs_review`, and `complete`. `complete` means prefill finished, never that an application was submitted. Applications retain an independent user-set tracking state: `saved`, `applied`, `interviewing`, `offer`, `closed`, or `rejected`.

All matching and audit results are deterministic local functions. Browser-side code reads the selected application from `chrome.storage.local` and writes audit events there. The web app may import/export a JSON snapshot for local backup; it does not send personal data to a server.

## Adapter Contract

Each employer adapter has a stable identifier, official entry URLs, recognized domains, ordered page-text selectors, optional field selectors, and a `collect()` function. Adapter fields are best-effort selectors, not a claim of permanence: a failed selector reports a visible audit error instead of trying random controls. The first release names the following entry domains:

- Huawei: `career.huawei.com`
- Tencent: `join.qq.com`
- PwC China: `www.pwccn.com`

The extension keeps the registry in one file so a changed career site is repaired independently of matching, review, or UI code.

## Safety And Boundaries

- No automatic final submission, CAPTCHA bypass, login automation, OTP handling, or answer fabrication.
- Candidate facts and evidence are the source of truth. Claims without source notes are unusable in prefill and highlighted in review.
- Official job pages are primary evidence. Third-party listings and old career pages can be saved as leads but cannot transition to `qualified` without an official URL recheck.
- A visible source timestamp records the latest verification moment. Job postings older than five days are not automatically rejected, but are marked stale until rechecked.

## Quality Bar

- Core matching, review gating, and prefill planning have unit coverage.
- Build, lint, and unit tests pass.
- The workbench is verified in a real browser at desktop and mobile widths. Primary navigation, filtering, review state changes, and prefill audit simulation must update visible state.
- The extension is loadable as an unpacked MV3 extension and its host policy and no-submit guard are verified by automated tests and source inspection.
