# Frontend Audit — Phase F0

> **Phase**: F0 (read-only audit). No code was changed to produce this document.
> **Date**: 2026-11-09
> **Auditor**: Antigravity (automated, full source read)
> **Source of truth**: `docs/API_CONTRACT.md`

---

## Table of Contents

1. [Pages & Routes](#1-pages--routes)
2. [Components, Services, Types, Mock Data](#2-components-services-types-mock-data)
3. [Auth: Mock vs Real](#3-auth-mock-vs-real)
4. [API Call Audit vs Contract](#4-api-call-audit-vs-contract)
5. [Backend Features with No UI](#5-backend-features-with-no-ui)
6. [Build & Lint Status](#6-build--lint-status)
7. [Visual Design & Copy Audit](#7-visual-design--copy-audit)
8. [Prioritised Gap List](#8-prioritised-gap-list)

---

## 1. Pages & Routes

### Public Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/` | `(public)/page.tsx` | ✅ Real UI | Hero, feature grid, 3-step flow. Generic SaaS copy — doesn't match design brief. |
| `/login` | `(auth)/login/page.tsx` | ✅ Real UI | Functional form with validation. AuthCard title = "Welcome back" (brief violation). |
| `/signup` | `(auth)/signup/page.tsx` | ✅ Real UI | Functional. Generic copy. |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | ✅ Real UI | Calls `authService.forgotPassword()` (no-op in real mode). |
| `/reset-password` | `(auth)/reset-password/page.tsx` | ⚠️ Not read | Exists in `ROUTES` config. Gated behind `FEATURES.resetPasswordConfirm`. |
| `/about` | `(public)/about/page.tsx` | ✅ Minimal | 2 paragraphs in a card. Thin but accurate. |
| `/contact` | `(public)/contact/page.tsx` | ✅ Minimal | Email addresses `support@bano.ai`, `dev@bano.ai` — placeholder/hardcoded. |
| `/privacy` | `(public)/privacy/page.tsx` | ✅ Skeleton | 2 policy clauses — legal placeholder, not a real policy. |
| `/terms` | `(public)/terms/page.tsx` | ✅ Skeleton | 2 clauses — legal placeholder. |

### Dashboard Routes (Protected)

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/dashboard` | `dashboard/page.tsx` | ✅ Real UI | Stats cards, recent lectures list. "Welcome back!" in description — brief violation. |
| `/lectures` | `lectures/page.tsx` | ✅ Real UI | Search, sort, filter. Calls `GET /lectures`. |
| `/lectures/new` | `lectures/new/page.tsx` | ✅ Real UI | File upload ✅. Recording behind `FEATURES.browserRecording` flag. YouTube behind `FEATURES.youtubeIngestion` flag (returns 501). |
| `/lectures/[id]` | `lectures/[id]/page.tsx` | ✅ Real UI | Thin shell → `LectureWorkspaceInner`. All 6 tabs wired. |
| `/lectures/[id]/processing` | `lectures/[id]/processing/page.tsx` | ✅ Real UI | Polls `GET /jobs/{id}`. ProcessingStepper component. Retry behind feature flag. |
| `/benchmark` | `benchmark/page.tsx` | ✅ Real UI | Calls `GET /benchmark/results`. Fixed in prior session. |
| `/profile` | `profile/page.tsx` | ✅ Real UI | View-only unless `FEATURES.profileUpdate`. Edit calls `PATCH /users/me` (not in contract). |
| `/settings` | `settings/page.tsx` | ✅ Real UI | Password change is a fake `setTimeout` — no API call. Usage stats are hardcoded. |

### Dev Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/dev/styleguide` | `dev/styleguide/page.tsx` | Dev only | Not audited. |

### Workspace Tabs (at `/lectures/[id]`)

All tabs are real UI, not skeletons:

| Tab | Component | Real/Skeleton |
|-----|-----------|---------------|
| Overview | `overview-tab.tsx` | ✅ Real — metadata + material cards |
| Transcript | `transcript-viewer.tsx` | ✅ Real — Devanagari/Roman toggle, search, copy, segment types |
| Notes | `notes-tab.tsx` | ✅ Real — bullet points with timestamp jump links |
| Summary | `summary-tab.tsx` | ✅ Real — short/detailed toggle, key concepts, glossary |
| Questions | `questions-tab.tsx` | ✅ Real — expandable Q&A with timestamp refs |
| Quiz | `quiz-tab.tsx` | ✅ Real — on-demand MCQ generation, 1–15 questions |

---

## 2. Components, Services, Types, Mock Data

### Services (all in `frontend/src/services/`)

| Service | Key Methods | Mode |
|---------|-------------|------|
| `auth-service.ts` | `getCurrentUser`, `login`, `signup`, `logout`, `forgotPassword`, `updateProfile` | Mock full; real = Firebase stubs |
| `lecture-service.ts` | `getLectures`, `getLectureById`, `createLecture`, `uploadFile`, `uploadRecording`, `createYoutubeLecture`, `renameLecture`, `deleteLecture` | Both |
| `transcript-service.ts` | `getTranscript` | Both |
| `materials-service.ts` | `getMaterials` | Both |
| `quiz-service.ts` | `generateQuiz`, `getQuiz` | Both |
| `job-service.ts` | `getJob`, `retryJob` | Both |
| `benchmark-service.ts` | `getResults` | Both |

### Feature Flags (`src/config/features.ts`)

| Flag | Mock default | Real default | Purpose |
|------|-------------|--------------|---------|
| `transcriptEditing` | `true` | `false` | Inline edit transcript segments |
| `regenerateNotes` | `true` | `false` | Re-generate notes button |
| `regenerateOutputs` | `true` | `false` | Re-generate all outputs |
| `processingRetry` | `true` | `false` | Retry failed jobs |
| `rememberSession` | `true` | `false` | "Remember me" checkbox |
| `changePassword` | `true` | `false` | Password change in settings |
| `profileUpdate` | `true` | `false` | Edit profile |
| `accountDeletion` | `true` | `false` | Delete account |
| `usageInfo` | `true` | `false` | Show audio-minutes usage stat |
| `quota` | `true` | `false` | Show quota remaining |
| `resetPasswordConfirm` | `true` | `false` | Reset password confirmation page |
| `serverSideListQuery` | `false` | `false` | Server-side search/sort for lectures |
| `browserRecording` | `true` | `false` | Audio recording via MediaRecorder |
| `youtubeIngestion` | `true` | `false` | YouTube URL input (backend returns 501) |

> **Note**: In real-API mode, nearly all advanced features are disabled by default. Only file upload, lecture list/workspace, transcript, materials, quiz, benchmark, and jobs are active.

### Types

- `src/types/api/` — DTO shapes matching the contract
- `src/types/domain/` — camelCase domain objects, all mapped via adapters in `src/services/adapters/`

### Mock Data / Fixtures (`src/services/mock/fixtures.ts`)

Fixtures are realistic (actual engineering Hinglish content, real segment types). Key fixtures:

- **6 mock lectures** across CS, Electronics, Mechanical, Civil, Electrical — `completed`, `generating_notes`, `transcribing`, `processing`, `uploaded`, `failed` states
- **6 mock jobs** — matching lecture states, covering all `JobStage` values
- **Transcript fixtures** — proper `text_devanagari` + `text_roman` + `segment_type` per segment (concept, example, off_topic, admin)
- **Learning materials fixtures** — notes with bullet points, summary (short + detailed), key concepts, glossary, important questions
- **Quiz fixtures** — MCQ questions with options and explanations
- **Benchmark fixtures** — updated to `wer_roman`, `cer_roman`, `mean_latency`, `min_latency`, `max_latency`, `total_cost`, `source`, `license` (fixed in prior session)

---

## 3. Auth: Mock vs Real

### Architecture

```
env.USE_MOCK_API = true (default)
  └── All auth handled by MockStore (in-memory + localStorage persistence)
  └── mockStore.setAuthenticated(true/false)
  └── User stored in localStorage key "bano_mock_state"

env.USE_MOCK_API = false
  └── authService.getCurrentUser() → GET /api/v1/users/me (Bearer token)
  └── Bearer token = Firebase ID Token (must be attached by caller)
  └── login/signup → throws ApiError("Firebase authentication must be integrated")
  └── logout/forgotPassword → intentional no-ops (Firebase SDK handles these)
```

### How Mock Auth Works

1. `MockStore` is instantiated at module import time and calls `restorePersistedState()` which reads `window.localStorage` synchronously.
2. `authService.getCurrentUser()` calls `mockStore.getCurrentUser()` → returns `MOCK_USER` if `isAuthenticated === true`.
3. `useAuth` hook wraps this in `useQuery` with `staleTime: 5 min`.
4. Route guards (e.g., dashboard layout) check `useAuth().isAuthenticated` to redirect unauthenticated users to `/login`.
5. No Firebase SDK is imported anywhere in the frontend.

### Real Mode Auth Gap

| Step | Status |
|------|--------|
| Firebase SDK installed | ❌ Not in `package.json` |
| Firebase initialisation | ❌ No `src/lib/firebase.ts` |
| `login()` / `signup()` wired | ❌ Throws informational error |
| ID token attached to `apiClient` | ❌ Not implemented |
| `GET /users/me` works with token | ⚠️ Would work once token is attached |

**The entire auth system must be re-implemented for real-API mode.** The mock path works correctly for development.

### Pre-existing Test Suite Failures

Two test suites fail with `TypeError: Cannot read properties of undefined (reading 'getItem')` in `MockStore.restorePersistedState` because `window.localStorage` is `undefined` when the module is first imported in vitest's jsdom environment.

- `benchmark.test.tsx` — suite-level failure
- `profile-settings.test.tsx` — suite-level failure

These are **pre-existing** (not introduced by any recent changes). Fix path: add `vi.stubGlobal('localStorage', new LocalStorageMock())` in those files or lazily initialise `restorePersistedState` in `mock-store.ts`.

---

## 4. API Call Audit vs Contract

### Contract Endpoints vs Frontend Calls

| Contract Endpoint | Frontend Call | Status | Notes |
|-------------------|---------------|--------|-------|
| `GET /api/v1/users/me` | `authService.getCurrentUser()` | ✅ Matches | |
| `GET /api/v1/lectures` | `lectureService.getLectures()` | ✅ Matches | |
| `GET /api/v1/lectures/{id}` | `lectureService.getLectureById()` | ✅ Matches | |
| `POST /api/v1/lectures` | `lectureService.createLecture()` | ✅ Matches | |
| `PATCH /api/v1/lectures/{id}` | `lectureService.renameLecture()` | ✅ Matches | Sends `{ title }` |
| `DELETE /api/v1/lectures/{id}` | `lectureService.deleteLecture()` | ✅ Matches | |
| `POST /api/v1/uploads/direct` | `lectureService.uploadFile()` / `uploadRecording()` | ✅ Matches | Sends `source_type="upload"` / `"recording"`. Response shape `{ lecture_id, job_id, status }` ✅ |
| `POST /api/v1/uploads/youtube` | `lectureService.createYoutubeLecture()` | ⚠️ 501 | Backend returns 501 NOT IMPLEMENTED. YouTube flag disabled in real mode. |
| `GET /api/v1/jobs/{id}` | `jobService.getJob(lectureId)` | ✅ Matches | Note: uses `lectureId` as job id — provisional, pending Q7 confirmation |
| `GET /api/v1/lectures/{id}/transcripts` | `transcriptService.getTranscript()` | ✅ Matches | Provisional pending Q10 bilingual shape confirmation |
| `GET /api/v1/lectures/{id}/materials` | `materialsService.getMaterials()` | ✅ Matches | |
| `GET /api/v1/lectures/{id}/quiz` | `quizService.getQuiz()` | ✅ Matches | |
| `POST /api/v1/lectures/{id}/quiz` | `quizService.generateQuiz()` | ✅ Matches | Sends `?num_questions=N` as query param |
| `GET /api/v1/benchmark/results` | `benchmarkService.getResults()` | ✅ Matches | |

### Endpoints Called but NOT in Contract

| Frontend Call | Endpoint | Issue |
|---------------|----------|-------|
| `authService.updateProfile()` | `PATCH /api/v1/users/me` | ❌ Not in contract (§ 3.2 defines GET only). Will 404/405 in real mode. Gated behind `FEATURES.profileUpdate = false` in real mode. |
| `jobService.retryJob()` | `POST /api/v1/jobs/{id}/retry` | ❌ Not in contract. Gated behind `FEATURES.processingRetry = false` in real mode. |

### Auth Endpoints Never in Contract (by design)

| Frontend Call | Status |
|---------------|--------|
| `POST /auth/login` | ❌ No endpoint. Intentionally no-op in real mode (Firebase handles). |
| `POST /auth/signup` | ❌ No endpoint. Intentionally no-op in real mode. |
| `POST /auth/forgot-password` | ❌ No endpoint. Intentionally no-op in real mode. |
| `POST /auth/logout` | ❌ No endpoint. Intentionally no-op in real mode. |

### Field-Level Mismatches

All major field-level mismatches were fixed in the prior session. No outstanding field mismatches were found.

**Previously fixed**:
- Benchmark: `processing_time_sec`, `estimated_cost_usd`, `notes` → replaced with `wer_roman`, `cer_roman`, `mean_latency`, `min_latency`, `max_latency`, `total_cost`, `source`, `license`
- Transcript: `text` field made optional to accommodate mock fixtures using `text_devanagari`/`text_roman`

### Open Provisional Questions (Pending Backend Confirmation)

| Question | Impact |
|----------|--------|
| Q7: Job endpoint — is it `GET /jobs/{jobId}` or `GET /jobs/{lectureId}`? | Frontend uses `lectureId` as the path parameter |
| Q9: Does `POST /jobs/{id}/retry` exist? | Feature flag guards it, but unknown in contract |
| Q10: Bilingual transcript shape — are both `text_devanagari` and `text_roman` returned? | Transcript viewer depends on this |

---

## 5. Backend Features with No UI

### Features with Full UI

| Feature | UI Status |
|---------|-----------|
| Upload audio file | ✅ `/lectures/new` — full drag-and-drop |
| Record audio (browser) | ✅ `/lectures/new` — MediaRecorder (behind flag) |
| YouTube ingestion | ✅ `/lectures/new` — URL input (behind flag; backend 501) |
| Job progress / processing status | ✅ `/lectures/[id]/processing` — ProcessingStepper with live polling |
| Transcript viewer — Devanagari | ✅ `/lectures/[id]?tab=transcript` — full Devanagari display |
| Transcript viewer — Roman toggle | ✅ ScriptSelector component with Devanagari ↔ Roman toggle |
| Transcript search | ✅ TranscriptSearchBar with match count + prev/next |
| Off-topic segment collapse | ✅ Implemented in TranscriptViewer |
| Notes | ✅ NotesTab — bullet points + timestamp jump links |
| Summary | ✅ SummaryTab — short/detailed toggle |
| Glossary | ✅ Rendered inside SummaryTab |
| Key Concepts | ✅ Rendered inside SummaryTab |
| Important Questions | ✅ QuestionsTab — expandable Q&A |
| Quiz (MCQ on-demand) | ✅ QuizTab — 1–15 questions, option selection, explanation reveal |
| Benchmark | ✅ `/benchmark` — model comparison table |

### Features Missing or Incomplete

| Feature | Contract Support | UI Status | Priority |
|---------|-----------------|-----------|----------|
| **Export** (transcript, notes as PDF/MD/DOCX) | Not in `docs/API_CONTRACT.md` | ❌ No export button anywhere | P2 |
| **Transcript editing** | Not in contract | ⚠️ Flag `transcriptEditing` exists but no editing UI was found | P3 |
| **Regenerate notes** | Not in contract | ⚠️ Flag `regenerateNotes` exists but no button found | P3 |
| **Regenerate outputs** | Not in contract | ⚠️ Flag `regenerateOutputs` exists but no button found | P3 |
| **Copy transcript** | — | ✅ Implemented in TranscriptViewer (plain text + with timestamps) | — |
| **Copy with timestamps** | — | ✅ Implemented | — |
| **Segment type badge** | — | ✅ concept / example / off_topic / admin | — |
| **Reset password page** | Firebase only | ⚠️ Route exists but page not audited | P3 |
| **Account deletion** | Not in contract | ⚠️ Flag `accountDeletion = false` in real mode; no UI found | P3 |
| **Quota display** | Not in contract | ⚠️ Flag `quota = false` in real mode; settings page shows hardcoded value | P3 |

---

## 6. Build & Lint Status

### Lint

```
$ cd frontend && npm run lint
✔ No ESLint warnings or errors
```

**Result**: ✅ Clean. 0 lint errors, 0 warnings.

### Build

```
$ cd frontend && npm run build
Failed to compile.

src/app/layout.tsx — `next/font` error:
  Failed to fetch `Inter` from Google Fonts.
  Failed to fetch `JetBrains Mono` from Google Fonts.
  Failed to fetch `Manrope` from Google Fonts.
  Failed to fetch `Noto Sans Devanagari` from Google Fonts.

> Build failed because of webpack errors
```

**Result**: ❌ Build fails in sandboxed/offline environment only. The error is `ENOTFOUND fonts.googleapis.com` — Google Fonts CDN is not reachable without network access. This is an environment constraint, **not a code bug**.

**Verification**: `npx tsc --noEmit` exits with code 0 (confirmed in prior session). The font fetch failure is `next/font`'s build-time download behaviour. The build will succeed in a network-connected CI/CD or developer machine.

**Action needed**: None for code correctness. If CI runs in a sandboxed environment, add `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` or switch to `localFont` with self-hosted font files.

### TypeScript

```
$ cd frontend && npx tsc --noEmit
# Exit code 0 — no errors
```

**Result**: ✅ Clean.

### Unit Tests

```
$ cd frontend && npm test
81/81 tests pass.
2 test suites fail at module-import level (benchmark.test.tsx, profile-settings.test.tsx) —
  pre-existing; not caused by recent changes.
```

---

## 7. Visual Design & Copy Audit

### Font Loading

| Brief Requirement | Actual Implementation | Status |
|------------------|-----------------------|--------|
| Source Serif 4 or Newsreader for headings | **Manrope** (sans-serif) used as heading font | ❌ Violation — brief requires a serif heading font |
| Inter or DM Sans for UI | **Inter** ✅ | ✅ Matches |
| Noto Sans Devanagari for Hindi | **Noto Sans Devanagari** ✅ | ✅ Matches |
| Fonts loaded via `next/font` | Yes ✅ | ✅ Matches |
| JetBrains Mono (code) | Present — not in brief but not forbidden | ➖ Neutral |

> **Finding D-01 (Critical)**: The heading font is **Manrope** (a rounded geometric sans-serif), not Source Serif 4 or Newsreader as the brief specifies. The brief says *"a well-used study notebook"* — the Manrope heading font gives a startup-SaaS feel instead. Every `font-heading` class uses Manrope.

### Colour Palette

| Brief Requirement | CSS Variable | Actual Value | Status |
|------------------|----|----|----|
| Background warm off-white (#FAF7F2) | `--bg` | `#F6F2E9` | ⚠️ Close but different. Brief = #FAF7F2, Actual = #F6F2E9. |
| Text near-black (#1C1B1A) | `--text` | `#25251F` | ⚠️ Brief = #1C1B1A, Actual = #25251F |
| Accent marigold/highlighter yellow (#F2B705) | `--accent` | `#B85C43` (terracotta/rust) | ❌ **Major violation** — brief requires yellow-gold, implemented as rust/brick red |
| Secondary deep ink blue (#1F3A5F) | None found | Not used | ❌ Entirely absent from colour tokens |
| No purple/blue gradients | — | No gradients found | ✅ |
| No glassmorphism | — | None found | ✅ |
| No glowing shadows | — | Shadows are subtle (`0 1px 2px`, `0 12px 32px`) | ✅ |
| Thin 1px borders | `--border` | 1px border tokens used | ✅ |
| Radius 6-8px | `--radius: 0.75rem` = 12px | ⚠️ Brief says 6–8px; actual = 12px (`0.75rem`) |

> **Finding D-02 (Critical)**: Accent colour is **terracotta/rust red (#B85C43)** instead of the brief's **marigold/highlighter yellow (#F2B705)**. This is a fundamental brand identity mismatch — the accent is used on every button, active tab, timestamp link, and status badge.

> **Finding D-03 (Moderate)**: Border radius is 12px (`0.75rem`) instead of brief's 6–8px. This makes cards and inputs rounder/softer than the "notebook" aesthetic intended.

> **Finding D-04 (Moderate)**: Ink blue (`#1F3A5F`) secondary palette is entirely absent. Brief uses it as a secondary brand colour but it doesn't appear in `globals.css` or Tailwind config.

### Icons

| Brief Requirement | Actual Implementation | Status |
|------------------|-----------------------|--------|
| lucide-react only | lucide-react used throughout | ✅ |
| No emoji as icons | No emoji found in component code | ✅ |
| Always with text labels | Most icons have adjacent labels | ✅ |

### Motion / Animation

| Brief Requirement | Actual | Status |
|------------------|----|---|
| 150–200ms hover/focus only | `transition-colors` (default 150ms) | ✅ |
| No bouncing | No bounce keyframes | ✅ |
| Progress: subtle pulse only | `animate-pulse` on processing states | ✅ |
| Sparkles icon has `animate-spin` on quiz loading | — | ⚠️ Spin animation not mentioned in brief; borderline |

### Copy Violations

#### Explicitly Forbidden Phrases Found

| Location | Actual Copy | Brief Rule Violated |
|----------|-------------|---------------------|
| `brand.ts` headline | "Your Lectures. Your Language. Your Learning." | Brief specifies exact Hinglish: "Lecture Hinglish mein thi. Notes ab saaf hain." |
| Landing page hero | Same headline from `BRAND.headline` | Same as above |
| Landing page CTA | "Get Started Free" | Brief: buttons are verbs in Hinglish/mixed style ("Lecture upload karo") |
| Landing page section | "Everything your lecture needs" | Generic template phrase |
| Landing page section | "Three steps to smarter study" | Generic SaaS copy |
| Dashboard `PageHeader` description | "Welcome back! Ready to turn your Hinglish lectures into knowledge?" | Brief explicitly forbids "Welcome back!" |
| Login AuthCard title | `title="Welcome back"` | Brief explicitly forbids "Welcome back!" |
| Dashboard empty state | "Upload an audio file or record a Hinglish lecture to generate AI transcripts and study notes." | Brief specifies exact copy: "Abhi koi lecture nahi. 30 second ka clip upload karke dekho." |
| New lecture button | "Upload & Process" | Brief: buttons should be verbs ("Lecture upload karo") |
| Login description | "Sign in to your Bano.ai account to access your lectures." | Generic |
| Settings usage stat | "Audio Processed: ~185 mins" | Hardcoded fake value — not from API. Brief: never show unverified numbers |
| Quiz generate screen | "Generate AI Practice Quiz" | Generic; brief tone would be "Quiz banao" |
| Quiz loading | "AI is grounding self-assessment multiple-choice questions strictly from…" | Overly technical/verbose for student-facing copy |

#### Copy That Does Match the Brief

| Location | Copy | Status |
|----------|------|--------|
| Processing stepper stages | "Transcribing Hinglish speech", "Processing transcript (Devanagari & Roman)" | ✅ Accurate, product-specific |
| Overview tab | "Bilingual Hinglish Transcript", "Synchronized in Devanagari Hindi and Roman Hinglish with segment classification" | ✅ Brief-aligned |
| AI disclaimers in tabs | `materials.disclaimer` from API — dynamically set | ✅ Correct approach |
| Notes empty state | "Structured notes are generated once audio processing has completed." | ✅ Acceptable (clear, honest) |
| Off-topic collapse | "Show off-topic talk" | ✅ Direct, matches tone |
| About page | Product description accurate, no hype | ✅ |

#### Missing Required Copy Elements

| Requirement | Status |
|-------------|--------|
| Every AI output section must be labelled "AI ne banaya — teacher ka exact statement nahi." | ❌ Not present. Currently shows `materials.disclaimer` from API (content unknown). The brief requires a specific label. |
| Benchmark page must state: "3 scripted clips, small test, not a general ranking." | ❌ Benchmark page shows no such caveat. |
| Accuracy claims must include benchmark number + caveat | ❌ Landing page has "accurate transcripts" without any qualifier. |

### Layout Compliance

| Brief Requirement | Status |
|------------------|----|
| Left-aligned, text-first | ✅ Mostly left-aligned |
| Transcript: two-column layout (timestamps in margin) | ❌ Transcript is single-column; timestamps appear inline above each segment, not in margin |
| Technical terms: highlighter-style underline | ❌ Not implemented; glossary terms are styled with `font-mono text-bano-accent` (accent colour, not yellow highlight underline) |
| Off-topic segments: muted, not hidden | ⚠️ Partially. Off-topic segments are collapsed by default (hidden text, with "Show off-topic talk" toggle). Brief says "muted, not hidden." |

> **Finding D-05 (High)**: Transcript layout is not the brief's two-column format. The brief specifies timestamps in the left margin (like a printed transcript), which aids reading flow. Current implementation stacks timestamp/badge above each paragraph in a single column.

> **Finding D-06 (Moderate)**: Off-topic segments are **collapsed by default** (content hidden, requiring user action to expand). The brief says "muted, not hidden" — the intent is for off-topic content to be visible but visually de-emphasised, not collapsed.

> **Finding D-07 (Moderate)**: Technical term highlighting (highlighter-style yellow underline for glossary terms as they appear inline in transcript text) is entirely absent. Currently glossary is only shown in the Summary tab as a list.

### Accessibility

| Requirement | Status |
|-------------|--------|
| AA contrast | ⚠️ Cannot verify without running contrast checker, but terracotta accent (#B85C43) on white (#FFFDFA) is approximately 4.5:1 — borderline AA |
| Visible focus rings | `ring: var(--ring)` set to `#B85C43` | ✅ |
| Keyboard navigation | Tab navigation present, `role="tablist"` on workspace | ✅ |
| `aria-live` on processing status | ✅ ProcessingStepper has `aria-live="polite"` |
| `lang="hi"` / `lang="hi-Latn"` on transcript text | ✅ Correctly set per script mode |
| `role="alert"` on error banners | ✅ Present |

---

## 8. Prioritised Gap List

Gaps ranked by impact on correctness and user experience.

### 🔴 P0 — Blockers (Product Cannot Launch Without These)

| # | Gap | Location | Fix |
|---|-----|----------|-----|
| P0-1 | **Firebase auth not integrated** — `login()` and `signup()` throw in real mode; no Firebase SDK in `package.json` | `auth-service.ts`, `package.json` | Install `firebase` SDK, implement `signInWithEmailAndPassword`, attach ID token to `apiClient` |
| P0-2 | **Build fails in network-isolated CI** — `next/font` can't fetch Google Fonts at build time | `app/layout.tsx` | Either add `NEXT_PUBLIC_*` to allow fonts or use self-hosted fonts with `localFont` |

### 🟠 P1 — High (Breaks Core UX or Brand Identity)

| # | Gap | Location | Fix |
|---|-----|----------|-----|
| P1-1 | **Accent colour is wrong** — Terracotta `#B85C43` instead of brief's marigold `#F2B705` | `globals.css` | Replace `--accent` and all `--accent-*` tokens with brief-specified yellow-gold palette |
| P1-2 | **Heading font is wrong** — Manrope (sans) instead of Source Serif 4 or Newsreader (serif) | `app/layout.tsx`, `tailwind.config.ts` | Replace `Manrope` import with `Source_Serif_4` or `Newsreader`; update `font-heading` Tailwind token |
| P1-3 | **"Welcome back!" appears twice** — explicit brief violation | `dashboard/page.tsx`, `(auth)/login/page.tsx` | Remove from both; dashboard: use brief's empty-state Hinglish copy; login: neutral title |
| P1-4 | **Landing hero copy doesn't match brief** — generic English tagline instead of brief-specified Hinglish | `brand.ts`, `(public)/page.tsx` | Update `BRAND.headline` and subheading to match brief exactly |
| P1-5 | **Transcript is single-column, not two-column** — brief requires timestamps in left margin | `transcript-viewer.tsx` | Redesign segment layout to `grid-cols-[6rem_1fr]` with timestamp in left column |
| P1-6 | **Off-topic segments collapsed by default** — brief says "muted, not hidden" | `transcript-viewer.tsx` | Change default to `isExpanded = true` (show muted) rather than collapsed/hidden |

### 🟡 P2 — Medium (Missing Feature or Significant UX Gap)

| # | Gap | Location | Fix |
|---|-----|----------|-----|
| P2-1 | **No export feature** — no PDF/Markdown/DOCX export of transcript or notes | Workspace | Add export button (must first confirm contract — endpoint not in `API_CONTRACT.md`) |
| P2-2 | **AI disclaimer label missing** — brief requires "AI ne banaya — teacher ka exact statement nahi." on every AI section | notes-tab, summary-tab, questions-tab, quiz-tab | Add required label to disclaimer bar in each tab |
| P2-3 | **Benchmark page lacks required caveat** — "3 scripted clips, small test, not a general ranking" | `benchmark/page.tsx` | Add caveat text near results header |
| P2-4 | **Landing CTA copy is generic** — "Get Started Free" vs Hinglish verb style | `(public)/page.tsx` | Update CTAs to brief's style |
| P2-5 | **Settings password change is fake** — `setTimeout(600ms)`, no API call | `settings/page.tsx` | Either wire to real endpoint (once contract supports it) or remove the UI |
| P2-6 | **Settings usage stats are hardcoded** — "~185 mins" is fake | `settings/page.tsx` | Remove or pull from real API; `FEATURES.usageInfo = false` in real mode is correct gate |
| P2-7 | **`PATCH /users/me` not in contract** — profile update will 404 in real mode | `auth-service.ts` | Confirm with backend owner (Owais) whether endpoint will be added; add it to contract if yes |
| P2-8 | **Border radius is 12px, brief says 6–8px** — visual softness doesn't match "notebook" aesthetic | `globals.css` | Change `--radius: 0.75rem` to `0.375rem` (6px) or `0.5rem` (8px) |
| P2-9 | **Ink blue secondary palette absent** — no `#1F3A5F` token defined | `globals.css`, `tailwind.config.ts` | Add `--secondary-accent: #1F3A5F` token and usage |
| P2-10 | **Glossary terms not highlighted inline in transcript** — brief specifies highlighter-style underline on technical terms in transcript | `transcript-viewer.tsx` | Requires client-side term matching; add `<mark>` or underline for glossary terms in transcript text |

### 🟢 P3 — Low (Polish, Nice-to-Have, or Deferred)

| # | Gap | Location | Fix |
|---|-----|----------|-----|
| P3-1 | **Privacy & Terms pages are skeleton placeholders** — 2 clauses each | privacy/page, terms/page | Expand with real legal content (non-engineering task) |
| P3-2 | **Contact page has hardcoded email addresses** — may not be monitored | contact/page | Confirm real support email or link to a form |
| P3-3 | **Reset password page not audited** | `(auth)/reset-password/page.tsx` | Read and verify |
| P3-4 | **Pre-existing vitest failures** — 2 suites fail at import time | `benchmark.test.tsx`, `profile-settings.test.tsx` | Add `vi.stubGlobal('localStorage', new LocalStorageMock())` or lazy-init MockStore |
| P3-5 | **Transcript viewer search doesn't scroll to match** — `handleTimestampClick` navigation works but match scroll not wired | `lecture-workspace-inner.tsx` (line 90) | Add `scrollIntoView` to matched segment element |
| P3-6 | **Quiz explanation label says "Show Backend Explanation"** — implementation detail exposed | `quiz-tab.tsx` (line 268) | Rename to "Show Explanation" |
| P3-7 | **`lang="en"` on `<html>`** — page contains Hindi content | `app/layout.tsx` | Either set `lang="hi-IN"` or dynamically switch per active script mode |
| P3-8 | **`transcriptEditing` / `regenerateNotes` / `regenerateOutputs` flags exist but no UI** — dead feature flags | features.ts | Either build the UI or remove the flags to avoid confusion |
| P3-9 | **`serverSideListQuery` flag is `false` in both modes** — always off | features.ts | Either implement or remove |
| P3-10 | **`BRAND.tagline` = "Lecture Intelligence"** — not "AI-powered" but generic | brand.ts | Fine as-is; minor |

---

*End of Phase F0 Audit. All findings are read-only observations — no files were changed.*

