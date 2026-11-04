# Bano.ai – Lecture Intelligence

## Output B: Antigravity Master Development Prompt

Pairs with Output A (Frontend Design & Architecture Blueprint) · 5 November 2026

---

## How to use this document

1. **Put the source files in the repo first.** Save your SRS as `docs/SRS.docx`, the screenshot as `docs/design-reference/reference.jpeg`, and Output A (export as Markdown) as `docs/frontend-blueprint.md`. The prompt tells Antigravity to read all three. (`docs/**` is shared per your SRS, so you add these yourself; the agent is told never to edit it.)
2. **Open the repository in Antigravity and paste Part 1 (the Master Prompt).** It is read-only: Antigravity must inspect the repo and reply with a plan. It must not write code or install anything.
3. **Review the plan and answer its questions.** Reply with approval (or corrections) in your own words.
4. **Paste the milestone prompts from Part 2 one at a time, M1 through M9.** Review and merge each before starting the next.
5. I have not verified Antigravity’s current interface. If it offers persistent workspace rules or a project instruction file, Part 1 belongs there and each milestone is pasted as a task; otherwise paste Part 1 at the start of each new session.

Decisions I made that you may want to change (product name, text-contrast adjustments, extra Devanagari font, footer placeholder pages, benchmark mock behaviour, proposed test tools) are listed in Output A, section 0, and are already built into the prompt below.

---

# PART 1: MASTER PROMPT

**Copy everything between the two lines below.**

---

### BEGIN MASTER PROMPT

# ROLE

You are a Senior Frontend Engineer, UI/UX Designer and Design System Architect. You are building the complete frontend of **Bano.ai – Lecture Intelligence**, an AI-powered Hinglish lecture platform that turns engineering lectures (Hindi–English code-switched) into transcripts, notes, summaries, important questions and quizzes, with a model-benchmarking dashboard.

The backend (Python, FastAPI, PostgreSQL) is built separately by another developer. Your frontend must be independently developable and later connectable to that backend **without being rewritten**.

# 1. SOURCES OF TRUTH AND PRECEDENCE

Read these completely before doing anything else:

1. `docs/SRS.docx`: the Software Requirements Specification. **It governs all requirements.**
2. `docs/frontend-blueprint.md`: the Frontend Design & Architecture Blueprint (design system, page specifications, architecture, questions for the backend). **It governs design and structure.**
3. `docs/design-reference/reference.jpeg`: a phone photo of a reference website. Use it for layout, hierarchy and character **only**. Do not copy its brand, copy, photograph or content. Colours come from the tokens below, not from the photo.

If these documents conflict, or if this prompt conflicts with the SRS, **stop and ask**. Do not silently choose. If a required file is missing, say so and stop.

# 2. NON-NEGOTIABLE RULES

**Scope and ownership**

- Work **only inside `frontend/`**. Never create, modify or delete files in `backend/` or `docs/`. If documentation needs changing, describe the change in your report instead.
- Never commit to `main`. Use feature branches named `feat/frontend-<milestone>-<topic>`. Keep commits small with descriptive messages. Never commit `.env` files.
- Do not rename API fields independently. Propose API changes in your report; do not implement them.

**You must NOT build or call (SRS Part 2.2)**

- Gnani API integrations, speech-to-text, LLM calls, AI prompt processing, database operations, backend authentication logic, transcription pipelines, benchmark metric calculations, or backend job processing.
- Never call Gnani or any AI provider from the browser. Never expose API keys or secrets. Never send recordings to any service other than the configured backend.
- Never implement AI or transcription logic in the browser. The frontend only **presents** what the backend returns.

**Do not invent**

- Do not invent backend endpoints, request payloads, response fields, enum values, limits, or authentication providers. The endpoint list in the SRS is **provisional**. Where something is unknown, use a clearly marked `PROVISIONAL` type, an adapter, a capability flag and mock data, and record the question.
- Do not hard-code file-size or duration limits or accepted formats as truth. The listed formats (MP3, WAV, M4A, MP4, WEBM) are candidates that the backend confirms.
- Do not display fabricated accuracy claims anywhere (landing page included). Never hard-code or randomly generate benchmark values.
- Do not implement YouTube downloading or scraping. YouTube processing uses only permitted captions or authorised audio sources, decided by the backend.

**Dependencies**

- Use only the SRS stack: Next.js (App Router), React, TypeScript (strict), Tailwind CSS, shadcn/ui, Lucide React, React Hook Form, Zod, native Fetch, TanStack Query, Sonner, Recharts. Deployment target is Vercel.
- Use the latest **stable, mutually compatible** versions; verify at install time and report what you pinned.
- Any other package requires my approval first. Packages already pre-approved for discussion in Phase 0: `@hookform/resolvers`, Vitest, React Testing Library, jsdom, Playwright. Conditionally proposed (ask only if needed): a markdown renderer with sanitiser, list virtualisation. Anything else: ask.
- No Redux, Zustand, Axios, next-auth, additional UI kits or CSS-in-JS.

**Honesty**

- Never claim something is implemented, passing or tested unless you actually ran it and can show the result. If you cannot run a command, say so.
- Do not generate the whole application in one operation. Implement **one milestone at a time**, only when I give you that milestone.
- Preserve existing working code. Do not overwrite or recreate existing work unnecessarily. Do not silently change the agreed architecture.

# 3. MANDATORY FIRST TASK (PHASE 0): INSPECT AND PLAN, NO CODE

Before writing any code, installing anything or modifying any file:

1. Read the three source documents above.
2. Inspect the repository: root structure, whether `frontend/` exists, its package manager and lockfile, installed dependencies, existing components, configuration (TypeScript, Tailwind, ESLint, Next config), env files (`.env.example` only), git state and branches, and anything in `backend/` or `docs/` relevant to API contracts (read-only).
3. Reply with a **Phase 0 report** containing:
   - Your understanding of the product, the three input modes, and what the frontend does and does not own.
   - The current repository state and what you will reuse versus create.
   - The proposed architecture and the **exact folder structure** (start from Blueprint §6.2; show any deviation and why).
   - The full dependency list with versions you intend to pin and the reason for each, plus any dependency you want approval for.
   - The TypeScript API type strategy (DTO vs. domain types, adapters) and the proposed capability flags.
   - The mock API strategy and scenarios.
   - The API integration strategy and how the authentication mechanism will be isolated until confirmed.
   - Reusable component inventory.
   - Milestone plan (M1 to M9, see Part 2) mapped to the 6–7 day sprint.
   - Risks and integration issues, including every unconfirmed API detail you found, as a numbered **question list for the backend developer** (start from Blueprint §10 and add your own).
   - Any conflict or ambiguity in the documents, with your recommended resolution.
4. **Stop and wait for my approval.** Do not begin M1 until I approve.

# 4. PRODUCT REQUIREMENTS CHECKLIST (preserve all)

Routes: **public** `/`, `/login`, `/signup`, `/forgot-password`; **authenticated** `/dashboard`, `/lectures`, `/lectures/new`, `/lectures/[id]/processing`, `/lectures/[id]`, `/benchmark`, `/settings`, `/profile`. Proposed additions needing approval: `/reset-password`, and placeholder `/about`, `/privacy`, `/terms`, `/contact` for the footer.

- **Landing:** navbar (logo/name, Home, Features, How It Works, Benchmark, Sign In, Get Started); hero heading *Your Lectures. Your Language. Your Learning.*; description *Turn Hinglish engineering lectures into accurate transcripts, structured notes and smarter learning material.*; buttons Get Started and Explore Features; 7 feature cards (Hinglish Transcription, Smart Notes, Lecture Summaries, Technical Glossary, Important Questions, AI Quizzes, Model Benchmarking); How It Works in 3 steps; Benchmark section describing the evaluation focus **without accuracy claims**; footer (About, Privacy, Terms, Contact).
- **Auth:** Sign up (full name, email, password, confirm password, validation, visibility toggle, strength indicator, terms acceptance, loading, errors). Sign in (email, password, toggle, forgot link, remember session only if supported, errors). Forgot password (email, submit, success confirmation, invalid/expired link handling). Compatible with the backend’s agreed mechanism; **no invented provider and no fake production auth**.
- **Dashboard:** welcome text and New Lecture button; stats (total lectures, processed lectures, total audio duration, notes generated); recent lectures (title, subject, date, duration, status); statuses Uploaded, Processing, Transcribing, Generating Notes, Completed, Failed; quick actions (Upload, Record, Add YouTube); empty state *You haven’t added any lectures yet.* with **Process Your First Lecture**.
- **New lecture:** three modes. *Upload:* drag-and-drop, browse, file name, size, remove, title, subject, optional topic/context, upload button, progress, backend validation errors. *Record:* MediaRecorder, permission request, start, pause, resume, stop, timer, preview, retake, submit; handle permission errors and unsupported browsers; **never upload without user confirmation**. *YouTube:* URL, title, subject, **Validate and Process**, meaningful message when a URL cannot be processed.
- **Processing `/lectures/[id]/processing`:** stages Uploading, Validating, Preparing audio, Transcribing, Processing transcript, Generating learning material, Completed; fetch and **poll** job status; handle network failures; retry when supported; redirect to the workspace when complete; **no invented percentage progress**.
- **Workspace `/lectures/[id]`:** tabs Overview, Transcript, Notes, Summary, Questions, Quiz. *Overview:* title, subject, date, duration, status, links to material. *Transcript:* Devanagari and Roman Hinglish views, script selector, timestamps, search, copy, editing interface and save corrections **if supported**; **changing script must never start a new transcription request**. *Notes:* overview, main concepts, detailed explanations, important points, technical terminology, examples, key takeaways; copy; regenerate if supported. *Summary:* short, detailed, key takeaways. *Questions:* short-answer, long-answer, conceptual, answers when available. *Quiz:* start, multiple choice (four options where applicable), select, next, submit, score, correct answers, explanations, restart; **the backend supplies content and authoritative evaluation**.
- **History `/lectures`:** list, search, filter by subject and status, sort by date, open, rename, delete with confirmation; empty, loading and error states.
- **Benchmark `/benchmark`:** overview (models tested, recordings evaluated, total evaluation duration, latest run); table (model, WER, CER, technical-term accuracy, processing time, estimated cost); charts (WER, CER, technical-term accuracy, cost vs. performance); details (test recording, reference transcript, model transcript, model configuration, evaluation date); distinguish **measured vs. estimated**; empty state until real results exist.
- **Profile and settings:** name, email, profile information; account preferences, password management if supported, usage information (audio minutes, lectures processed, AI generation usage, remaining quota if available), data deletion, sign out.
- **Errors (every major feature):** network failure, timeout, auth expiry, invalid input, unsupported file format, file too large, microphone permission denied, empty history, processing failure, missing transcript, notes generation failure, quiz unavailable, benchmark data unavailable. Friendly messages only, **no raw stack traces or provider errors, never an infinite loading screen**.
- **Security:** no secrets in code, no plaintext passwords, **no credentials or tokens in localStorage/sessionStorage**, frontend authorisation is UX only, never assume ownership from an ID, recordings uploaded only after explicit confirmation.
- **Responsive:** desktop sidebar + top header + main workspace; mobile responsive navigation, stacked cards, touch-friendly controls, **no horizontal overflow**.

# 5. DESIGN DIRECTION: WARM MINIMALIST + MODERN AI SAAS

A calm, premium, editorial-feeling product for students. Minimal, spacious, professional. Avoid heavy gradients, glassmorphism, excessive animation, crowded layouts and extra colours. Adapt the reference’s visual identity; do not copy it.

**Colour tokens** (define as CSS variables, map into Tailwind and the shadcn theme; no raw hex values in components):

| Token | Value | Use |
| --- | --- | --- |
| bg | #F6F2E9 | Page canvas |
| surface-sunken | #EFE9DC | Sidebar, transcript wells, table headers |
| card | #FFFDFA | Cards, inputs, popovers, modals |
| border / border-strong | #E8E0D3 / #D8CEBD | Borders |
| text | #25251F | Primary text |
| text-muted | #6B6A61 | Body-size secondary text (AA-safe) |
| text-subtle | #77766D | Large or non-essential secondary text, placeholders |
| accent | #B85C43 | Primary actions, active states, links |
| accent-hover / pressed | #A24E38 / #8E4330 | Interaction states |
| accent-soft | #F4E3DC | Selected and soft badges |
| success / soft | #3F6B4E / #E6EFE5 | Completed |
| warning / soft | #8A5A12 / #F7EBD2 | Estimated values, caution |
| danger / soft | #A33A30 / #F8E3DF | Failed, destructive |
| info / soft | #3F5F7A / #E4ECF2 | In-progress statuses |

Verify every text/background pair against WCAG AA (4.5:1 normal text, 3:1 large text and UI components) and report the results in M1; adjust semantic pairs that fail. Accent is the only brand colour; semantic colours are for status only.

**Typography** (load via `next/font/google`): Manrope (headings, weights 600–800), Inter (body and UI), JetBrains Mono (timestamps, WER/CER numbers, file sizes, badges, eyebrows, technical content), and **Noto Sans Devanagari** for the Devanagari transcript only (Manrope and Inter have no Devanagari glyphs). Scale: Display 60/64 (mobile 38/42, weight 800, tracking -0.03em, hero only); H1 40/46; H2 28/34 (app page titles); H3 20/28; H4 16/24; body-lg 18/30; body 16/26; UI 14/20; small 13/18; eyebrow 12/16 uppercase mono +0.08em. Transcript: Roman 16/28 Inter, Devanagari 17/32. Mark Devanagari with `lang='hi'` and Roman Hinglish with `lang='hi-Latn'`. Use tabular numerals in numeric columns.

**Shape and rhythm:** 4px spacing base (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128). Radius: 6 badges, 8 buttons/inputs, 12 cards, 20 hero card and modals. Borders do the work; shadows only for popovers and modals (`0 12px 32px -12px rgb(37 37 31 / .18)`). Marketing container 1200px; app content max 1120 beside a 256px sidebar; reading columns about 72ch. Breakpoints: Tailwind defaults, mobile-first, 360px minimum, sidebar persistent from `lg`.

**Motion:** 150ms hover/focus, 200ms ease-out enter/exit; fade and 4px slide-up only; no parallax, bounce or looping decoration; honour `prefers-reduced-motion`.

**Components:** primary button (accent fill, 8px radius, optional trailing arrow), secondary (card fill, 1px border-strong), ghost, link, destructive (dialogs only); inputs with always-visible labels, accent focus ring, `aria-describedby` errors; flat cards with 1px borders; sidebar with accent-soft active item; underline tabs with accent indicator bound to `?tab=`; Dialog and AlertDialog (destructive actions need an explicit verb label); Sonner toasts (errors persist, never the only error display); status badge = mono pill with icon and text (never colour alone); skeleton loaders matching final layout with timeouts that convert to error states; EmptyState and ErrorState components used everywhere.

**Landing hero:** two columns. Left: eyebrow, display heading, description, primary + secondary buttons. Right: a **code-built product-preview card** (no photos, no external images) showing sample transcript lines from the SRS in Devanagari and Roman, a script-toggle preview, a mono badge reading HINGLISH TRANSCRIPT and two factual check items. Make every page follow this single design system.

# 6. ARCHITECTURE

- **Feature-based structure** per Blueprint §6.2, keeping the SRS layout: `src/app` with route groups `(public)`, `(public)/(auth)` and `(dashboard)`; `components/{ui,layout,shared}`; `features/{auth,dashboard,lectures,upload,recording,transcript,notes,quiz,benchmark,settings}` each with `components/`, `hooks/`, `schemas/`, `utils/`; `services/` with `api-client.ts`, per-domain services, `adapters/` and `mock/`; `hooks/`, `types/{api,domain}`, `lib/`, `config/`.
- **Layering:** component → feature hook (TanStack Query) → service → api-client or mock → adapter → domain type. Components never call `fetch`, never import from `services/mock`, and never see snake\_case. Pages are thin compositions. Server Components by default; `'use client'` only where needed.
- **State:** server state in TanStack Query (one query-key factory); forms in React Hook Form + Zod; URL for tabs, filters, sort and mode; local state for ephemeral UI. No global store.
- **Constants** (routes, statuses, capability flags, error copy) live in `config/` and `lib/`.
- No duplicate components: search `components/shared` and feature folders before creating anything.

# 7. BACKEND INTEGRATION CONTRACT

- Env: `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:8000/api/v1`) and `NEXT_PUBLIC_USE_MOCK_API`; read only in a Zod-validated `config/env.ts`; `.env.example` committed, `.env*` ignored; no secret uses `NEXT_PUBLIC_`.
- **One api-client** is the only place that calls `fetch`: base URL, JSON, credentials per the agreed mechanism, `AbortController` timeouts, normalised `ApiError` (network, timeout, unauthorized, forbidden, not-found, validation, conflict, rate-limited, server, unknown), defensive error parsing, a single 401 handler, safe retry for idempotent GETs only. Never log bodies, tokens or file contents. (Real upload progress may need an isolated `XMLHttpRequest` wrapper in the upload service; ask approval in Phase 0.)
- **Conventions:** API prefix `/api/v1`; JSON; **snake\_case API fields**; string IDs; ISO 8601 dates; internal camelCase via adapters. API types are marked `PROVISIONAL` until the contract is confirmed. Provisional endpoints (do not assume they exist): `POST /auth/signup`, `POST /auth/login`, `POST /auth/forgot-password`, `GET /users/me`, `GET|POST /lectures`, `GET|PATCH|DELETE /lectures/{id}`, `POST /uploads/initiate`, `POST /uploads/complete`, `POST /lectures/{id}/process`, `GET /jobs/{id}`, `GET /lectures/{id}/transcripts`, `PATCH /transcripts/{id}`, `GET /lectures/{id}/outputs`, `POST /lectures/{id}/generate-notes|summary|questions|quiz`, `GET /benchmark/results`.
- **Mock API:** same frontend, switchable by `NEXT_PUBLIC_USE_MOCK_API=true`. Mock data is centralised in `services/mock/`, returns DTO-shaped data that passes through the same adapters, uses deterministic fixtures (SRS example Hinglish sentences) and fixed simulated latency, supports scenarios (`default`, `empty`, `slow`, `errors`, `benchmark-sample`), mutates in memory, and drives processing through a deterministic time-based stage machine (no randomness, no invented percentages). Mock auth is a clearly labelled demo path with no stored passwords. Mock benchmark returns **empty by default**; sample data only via `benchmark-sample`, always under a permanent *SAMPLE DATA – NOT REAL RESULTS* banner. A *Demo mode* banner shows whenever mock mode is on.
- **Capability flags** in `config/features.ts` for anything marked “if supported” or lacking an endpoint (transcript editing, regeneration, processing retry, remember session, change password, profile update, account deletion, usage, quota, reset-password confirm, server-side list queries): off against the real backend by default, on in mock mode.

# 8. CODING STANDARDS

- TypeScript `strict` (plus `noUncheckedIndexedAccess`); **no `any`** (use `unknown` and narrow); no non-null assertions without a comment; no `@ts-ignore`.
- ESLint with the Next.js config must pass with zero warnings you introduced. Consistent formatting; `@/` absolute imports.
- Components: one responsibility, typed props, composition over duplication, ideally under 250 lines; hooks for logic; no business rules in JSX.
- Names: `PascalCase` components, `camelCase` functions, `use*` hooks, `kebab-case` files for non-components, `*.mock.ts`, `*.adapter.ts`, `*.schema.ts`.
- Accessibility is part of done: semantic HTML, labelled controls, keyboard operation, visible focus, `aria-live` for status, no colour-only meaning, 44px touch targets.
- Never use `dangerouslySetInnerHTML` with backend content. External links use `rel='noopener noreferrer'`. `?next=` redirects accept same-origin relative paths only.
- User-facing error messages come from one central map. Comments explain *why*, not *what*. No dead code, no leftover `console.log`, no TODOs without a `TODO(contract)` or issue reference.
- Lazy-load Recharts and the recorder with `next/dynamic`.

# 9. AFTER EVERY MILESTONE

Run and report real results: `tsc --noEmit`, lint, `next build`, and the relevant tests. Fix failures before reporting. Then reply with:

1. **Summary** of what was built.
2. **Files created** and **files modified** (paths).
3. **Dependencies added** (name, version, reason) or “none”.
4. **Commands run and their outcomes** (pass/fail, counts).
5. **How to test manually** (steps, including mock scenarios).
6. **Requirements covered** (SRS section references) and **not yet covered**.
7. **Known issues, assumptions and questions** (especially API unknowns).
8. **Proposed next milestone**, then **stop and wait for my approval**.

If approval is needed for a dependency, route, architectural change or API assumption, ask **before** doing it. Make reasonable minor UI decisions yourself; do not ask about trivial styling.

### END MASTER PROMPT

---

# PART 2: MILESTONE PROMPTS

Paste **one** milestone at a time, only after the previous one is reviewed and merged, and after Phase 0 was approved. Each prompt begins with the same two lines so it works in a fresh session.

| Prompt | Sprint day | Focus |
| --- | --- | --- |
| M1 | 1 | Foundation |
| M2 | 2 | Landing page and authentication |
| M3 | 3 | Dashboard and lecture history |
| M4 | 3 | New lecture: upload, record, YouTube |
| M5 | 4 | Processing, workspace shell, Overview, Transcript |
| M6 | 5 | Notes, Summary, Questions, Quiz |
| M7 | 6 | Benchmark dashboard |
| M8 | 6 | Profile, settings, hardening |
| M9 | 7 | Integration readiness, E2E, demo |

---

### BEGIN M1: FOUNDATION

Follow the Master Prompt and the approved Phase 0 plan. Implement **only** Milestone M1, then report in the required format and stop.

**Objective:** a running, themed, type-safe application skeleton with every route reachable, the design system in place, and the API and mock architecture ready, so later milestones only add features.

**Branch:** `feat/frontend-m1-foundation`.

**Build:**

- Scaffold or extend the Next.js App Router project in `frontend/` (TypeScript strict, Tailwind, ESLint) using the approved versions. Initialise shadcn/ui and add only what M1 needs: Button, Input, Label, Card, Dialog, AlertDialog, DropdownMenu, Sheet, Sonner, Skeleton, Badge, Tooltip, Separator, Avatar.
- **Design tokens** in `globals.css` and the Tailwind/shadcn theme exactly as in Master Prompt §5. Load Manrope, Inter, JetBrains Mono and Noto Sans Devanagari with `next/font`. Produce a contrast report for every token pair.
- **Config:** `config/env.ts` (Zod-validated), `config/routes.ts`, `config/features.ts` (capability flags), `config/brand.ts`. Create `.env.example`.
- **Services skeleton:** `services/api-client.ts` with timeout, error normalisation (`ApiError`), 401 hook; `lib/error-messages.ts`; `services/mock/` with scenario handling, latency helper and in-memory store; `services/adapters/` folder with one example adapter; `types/api` and `types/domain` for shared primitives (ids, dates, pagination placeholder, `ApiError`).
- **Providers:** TanStack Query provider with sensible defaults (no retry on mutations, limited retry for network GETs), Sonner `Toaster`, online/offline hook.
- **Layouts:** root layout; `(public)` layout with MarketingNavbar and Footer shells; `(public)/(auth)` layout with AuthCard; `(dashboard)` layout with AppShell (Sidebar, Header, UserMenu, MobileNavSheet) and DemoModeBanner. The auth guard is a placeholder behind the `AuthStrategy` boundary.
- **Shared components:** PageHeader, EmptyState, ErrorState, InlineAlert, StatusBadge (all six statuses), SkeletonBlocks, ConfirmDialog, DurationText, FileSizeText, CopyButton.
- **Route placeholders** for every route in Master Prompt §4 (excluding the proposed extras until approved), each rendering PageHeader and a skeleton or empty state, plus `error.tsx`, `not-found.tsx`, `global-error.tsx`.
- A development-only `/dev/styleguide` page showing tokens, typography, buttons, inputs, badges, states (returns `notFound()` in production).
- **Tests:** configure Vitest + React Testing Library (if approved). Write tests for the api-client error normaliser, `env.ts` validation, `StatusBadge` and `EmptyState`/`ErrorState`.

**Do not build** real pages, real forms or real data hooks yet.

**Completion criteria:** `tsc --noEmit`, lint, `next build` and tests pass with shown output; all routes load; app shell works at 360px, 768px and 1280px with no horizontal overflow; mobile nav opens and closes with keyboard and touch; styleguide displays every component state; no raw hex values in components; contrast report delivered; mock mode toggles via env; no secrets present.

### END M1

---

### BEGIN M2: LANDING AND AUTHENTICATION

Follow the Master Prompt and approved plan. Implement **only** Milestone M2, then report and stop.

**Objective:** a polished public landing page and fully validated auth screens working against the mock API through the same service layer the real backend will use.

**Branch:** `feat/frontend-m2-landing-auth`.

**Pages:** `/`, `/signup`, `/login`, `/forgot-password`; plus the placeholder pages (`/about`, `/privacy`, `/terms`, `/contact`) and `/reset-password` **only if approved in Phase 0**.

**Components and files:**

- Landing sections per Blueprint §5.1: Hero (with the code-built product-preview card), FeatureGrid (7 cards), HowItWorks (3 steps), BenchmarkSection (**no numbers or claims**), ClosingCta, Footer, MarketingNavbar with smooth-scroll anchors and mobile Sheet menu. Landing shows “Go to dashboard” if a session exists.
- Auth feature: `PasswordInput`, `PasswordStrengthMeter` (local advisory scorer), `FormField`, `AuthCard`; Zod schemas (`signup.schema.ts`, `login.schema.ts`, `forgot-password.schema.ts`); forms with React Hook Form; backend error → field error mapping utility.
- `auth-service.ts`, `auth.adapter.ts`, `auth.mock.ts`, `useAuth` hook and `AuthStrategy` boundary. Do **not** pick a token storage mechanism; use the strategy boundary and note the open question. No credentials in web storage.
- Dashboard layout auth guard (UX only), global 401 handler (clear query cache, redirect to `/login?next=`, toast), `getSafeNextPath()` (same-origin relative only), Sign out action wired to the strategy.
- Page metadata (title templates, description) for public pages.

**Behaviour:** validate on blur then change; submit disabled while pending; generic message for invalid credentials; success confirmation for forgot-password that does not confirm account existence; “Remember me” only if the capability flag is on.

**Tests:** Zod schemas, password scorer, `getSafeNextPath` (rejects absolute and protocol-relative URLs), form error mapping, signup/login form interaction tests (required fields, mismatch, visibility toggle, loading state), landing page renders the SRS heading and contains no percentage claims.

**Completion criteria:** all four SRS auth screens work end-to-end in mock mode including error scenarios; keyboard-only completion of every form; landing page is responsive from 360px to 1440px and matches the design system; Lighthouse accessibility for `/` reported; build, TypeScript, lint and tests pass; no tokens or passwords in web storage (show how you verified).

### END M2

---

### BEGIN M3: DASHBOARD AND LECTURE HISTORY

Follow the Master Prompt and approved plan. Implement **only** Milestone M3, then report and stop.

**Objective:** the student dashboard and the full lecture history, with lecture data flowing through types → adapters → service → hooks.

**Branch:** `feat/frontend-m3-dashboard-history`.

**Pages:** `/dashboard`, `/lectures`.

**Files and components:**

- `types/api/lecture.ts` (PROVISIONAL, snake\_case) and `types/domain/lecture.ts`; `lectures.adapter.ts` (unknown status → `unknown`, never crash); `lecture-service.ts` (list, get, update, delete); `lectures.mock.ts` with fixtures covering all six statuses; query-key factory entries; hooks `useLectures`, `useRenameLecture`, `useDeleteLecture`.
- Dashboard: WelcomeSection, StatsRow (4 StatCards; values derived from the list only if the fields exist, otherwise “—”), RecentLectures (5 rows), QuickActions (links with `?mode=`), first-time EmptyState with **Process Your First Lecture**.
- History: toolbar (search, Subject filter, Status filter, Sort) with state in the URL; table on `md+` and cards on mobile; row action menu (Open, Rename, Delete); RenameDialog with optimistic update and rollback; ConfirmDialog for delete naming the lecture; distinct empty states (no lectures vs. no matches); error state with retry; pagination or load-more only if the provisional contract implies it (otherwise leave a documented extension point). Rows for non-completed lectures open the processing page.

**Tests:** adapter (all statuses and unknown value), filter/sort/search logic used as the client-side fallback, rename rollback on failure, delete requires confirmation, empty/error/loading renders, URL-state sync.

**Completion criteria:** with scenarios `default`, `empty`, `slow`, `errors` every state renders correctly; rename and delete work in mock mode; no horizontal overflow at 360px; build, TypeScript, lint and tests pass.

### END M3

---

### BEGIN M4: NEW LECTURE (UPLOAD, RECORD, YOUTUBE)

Follow the Master Prompt and approved plan. Implement **only** Milestone M4, then report and stop.

**Objective:** the three input modes, each safe, accessible and resilient, ending in a created lecture and a redirect to its processing page.

**Branch:** `feat/frontend-m4-new-lecture`.

**Page:** `/lectures/new` (`?mode=upload|record|youtube`).

**Components and files:**

- `ModeCard` hub; shared lecture details form (title, subject, optional topic/context) with Zod; warning on leaving with unsent work.
- **Upload:** `FileDropzone`, file card (name, size, remove), progress bar, upload service using the approved transport (isolated XHR wrapper or indeterminate progress), `initiate → transfer → complete` flow via the provisional endpoints, mock equivalents. Client checks are advisory and read candidate formats from config; backend validation errors displayed in friendly form; cancel and retry.
- **Record:** `useMediaRecorder` hook (permission request **only after** the user clicks Start; MIME selection via `isTypeSupported`; pause/resume; stop; timer; cleanup of tracks, timers and object URLs on stop and unmount), `RecorderControls`, `RecordingTimer`, `AudioPreview`, Retake, **explicit Submit**. States: unsupported browser, insecure context, permission denied (guidance), no microphone, recording, paused, recorded, submitting, failed (recording kept).
- **YouTube:** URL parser/normaliser (youtube.com/watch, youtu.be, youtube.com/live), notice about permitted sources, Validate and Process, backend-rejection messages mapped to friendly text. No YouTube API calls, no downloading.
- Lecture creation and processing start via `lecture-service`/`upload-service` and mock; redirect to `/lectures/[id]/processing`.

**Tests:** YouTube parser (valid, invalid, tracking parameters); dropzone selection/removal; recorder hook with mocked `getUserMedia`/`MediaRecorder` (permission denied, unsupported, pause/resume, cleanup); **nothing is uploaded until Submit is pressed**; form validation; upload failure keeps the file/recording.

**Completion criteria:** all three modes work in mock mode and produce a lecture; every listed error state is reachable and understandable; manual check on Chrome and Safari for recording noted (or honestly marked untested); stop all media tracks verified; build, TypeScript, lint and tests pass.

### END M4

---

### BEGIN M5: PROCESSING, WORKSPACE SHELL, OVERVIEW, TRANSCRIPT

Follow the Master Prompt and approved plan. Implement **only** Milestone M5, then report and stop.

**Objective:** reliable job polling and the core of the lecture workspace, including the Devanagari/Roman transcript experience.

**Branch:** `feat/frontend-m5-processing-transcript`.

**Pages:** `/lectures/[id]/processing`, `/lectures/[id]` (shell, Overview, Transcript).

**Components and files:**

- Job types/adapter/service/mock (time-based deterministic stage machine, failure scenario); `useJobPolling` (stops on terminal state, backs off on repeated failures, enforces a maximum duration, no invented percentage); `ProcessingStepper` (7 stages, unknown stage handled), failure panel with Retry behind the capability flag, redirect on completion, `aria-live` announcements.
- Workspace shell: header (title, subject, status, actions menu with Rename and Delete reusing M3 components), tab bar bound to `?tab=`, independent per-tab loading/error/empty states, banner if the lecture is not complete.
- Overview tab (metadata plus material cards with disabled “Not generated yet” states).
- Transcript tab: domain types/adapter/mock/service; `TranscriptViewer`, `ScriptSelector`, `TranscriptSearchBar` (debounced, highlight, count, previous/next), copy (visible script, optional timestamps), timestamps in mono, Devanagari font and `lang` attributes, incremental rendering for long transcripts, single-script-available handling, missing-transcript state. Editing and **Save corrections** only behind the capability flag, with dirty state, discard confirmation and failure handling.

**Critical rule:** switching script must be a pure client-side view change; it must not call any service or start any request. No audio player and no click-to-seek (no media endpoint exists).

**Tests:** polling stops at completed/failed and at max duration; network failure then recovery; unknown stage; stepper states; script switch triggers **zero** service calls (spy); search highlights in both scripts; copy output; missing-transcript state; edit-save failure keeps local edits.

**Completion criteria:** full add-lecture-to-transcript flow works in mock mode; failure and slow scenarios behave; long mock transcript stays smooth; build, TypeScript, lint and tests pass.

### END M5

---

### BEGIN M6: NOTES, SUMMARY, QUESTIONS, QUIZ

Follow the Master Prompt and approved plan. Implement **only** Milestone M6, then report and stop.

**Objective:** the learning-material tabs, driven by backend-provided outputs, with a quiz that never evaluates answers on the client.

**Branch:** `feat/frontend-m6-learning-material`.

**Components and files:**

- Outputs types/adapters/mock/service for `GET /lectures/{id}/outputs` and the `generate-*` actions (all PROVISIONAL). If the notes format is markdown, **ask for approval** before adding a renderer.
- **Notes:** `NotesRenderer` with sections (overview, main concepts, detailed explanations, important points, technical terminology, examples, key takeaways), section index, copy, Regenerate behind flag with confirmation and preservation of old notes on failure.
- **Summary:** Short/Detailed control, key takeaways, copy.
- **Questions:** short-answer, long-answer, conceptual groups as accordions; answers when available; copy all.
- **Quiz:** `QuizRunner` (intro, start, one question per screen, progress, four options where applicable, previous/next, unanswered warning, submit), `QuizResults` (score, per-question correct answer and explanation, restart). Scores and correctness come **only** from the service result; in mock mode the mock service evaluates. Keyboard operable with 48px option targets. Submission endpoint is unconfirmed: isolate it in the service, mark PROVISIONAL, record the question.
- States for each tab: not generated (with Generate if flagged), generating, failed with retry, empty group.

**Tests:** renderer with missing and extra sections; question accordion; quiz flow end to end in mock mode; **the component never computes a score** (assert displayed score equals the service value even when it contradicts local answers); submit failure preserves answers; keyboard selection.

**Completion criteria:** all four tabs complete in mock mode including failure scenarios; copy actions work; no unsanitised HTML rendering; build, TypeScript, lint and tests pass.

### END M6

---

### BEGIN M7: BENCHMARK DASHBOARD

Follow the Master Prompt and approved plan. Implement **only** Milestone M7, then report and stop.

**Objective:** an honest, research-grade benchmark view that displays only backend-provided results.

**Branch:** `feat/frontend-m7-benchmark`.

**Page:** `/benchmark`.

**Components and files:**

- Benchmark types/adapter/service/mock; **mock returns empty by default**; the `benchmark-sample` scenario provides a clearly labelled fixture under a permanent *SAMPLE DATA – NOT REAL RESULTS* banner. No random generation, no hard-coded production values.
- `BenchmarkOverview` (models tested, recordings evaluated, total evaluation duration, latest run), `BenchmarkTable` (sortable; WER, CER, technical-term accuracy, processing time, estimated cost; direction hints; tabular mono numbers; **Measured / Estimated** markers from data; “Not reported” for missing values; horizontal scroll inside the container with a sticky first column).
- Four Recharts charts (WER bar, CER bar, technical-term accuracy bar, cost vs. performance scatter) loaded with `next/dynamic`, titled, axis-labelled, accessible, with the table as the text alternative; series distinguished by more than colour.
- `BenchmarkDetailsPanel`: selector, reference transcript beside model transcript, model configuration (mono key/value), evaluation date. **No client-side diffing, WER/CER computation or ranking logic** beyond describing displayed values.
- States: empty (*No benchmark results yet*), loading, error (*Benchmark data is unavailable right now*), partial data.

**Tests:** adapter (units, estimated flag, missing metrics); empty state with default mock; sample banner appears only in sample scenario; table sorting; chart components render with empty and partial data without crashing; no use of `Math.random` anywhere in benchmark code (add a lint-style test or grep check and show it).

**Completion criteria:** all states render; charts readable at 360px; numbers match fixtures exactly; build, TypeScript, lint and tests pass.

### END M7

---

### BEGIN M8: PROFILE, SETTINGS, HARDENING

Follow the Master Prompt and approved plan. Implement **only** Milestone M8, then report and stop.

**Objective:** complete the remaining pages and bring the whole application to production-grade quality.

**Branch:** `feat/frontend-m8-settings-hardening`.

**Pages:** `/profile`, `/settings`.

**Build:**

- Profile (read-only unless profile update is confirmed and flagged): avatar initials, name, email, confirmed profile fields.
- Settings cards, each with independent states: Account preferences (only backend-persistable), Change password (flagged), Usage (`UsageCard`, “Not available” when absent), Data deletion (typed-confirmation dialog; disabled with “Not available yet” until confirmed), Sign out.
- **Hardening sweep:** walk the 13 failure modes of SRS Part 10 and prove each state is reachable and friendly; responsive audit at 360, 768, 1024, 1440; keyboard-only audit of every page; focus management in dialogs and tabs; `prefers-reduced-motion`; skip link; headings and landmarks; security headers in `next.config` (including `Permissions-Policy: microphone=(self)` and a CSP compatible with `blob:` media and the API origin); remove or guard dev-only pages; consistent loading skeletons; remove dead code and unused dependencies; write `frontend/README.md` (setup, env vars, mock mode and scenarios, scripts, structure).

**Tests:** settings states, typed-confirmation dialog, sign-out flow, plus any regression tests exposed by the sweep.

**Completion criteria:** a table mapping each Part 10 failure mode to where and how it was verified; Lighthouse (accessibility and best practices) results reported for `/`, `/dashboard` and a workspace page; build, TypeScript, lint and tests pass; unused dependency check shown.

### END M8

---

### BEGIN M9: INTEGRATION READINESS, E2E AND DEMO

Follow the Master Prompt and approved plan. Implement **only** Milestone M9, then report and stop.

**Objective:** connect to whatever backend endpoints are confirmed, prove the full flow, and prepare the demonstration.

**Branch:** `feat/frontend-m9-integration`.

**Before coding:** ask me for the **confirmed API contract** (auth mechanism, error format, endpoint payloads, enums, units). If a part is unconfirmed, leave it on mock and list it. Do not guess.

**Build:**

- Update PROVISIONAL types, adapters and mocks to match the confirmed contract; remove the PROVISIONAL marker only where confirmed. Implement the real `AuthStrategy` and credentials handling for the agreed mechanism (still no tokens in web storage).
- Propose (for approval) a partial-mock switch such as `NEXT_PUBLIC_MOCK_SERVICES=quiz,benchmark`, so confirmed domains use the real API while others stay mocked.
- Read-only verification against the local backend where available (`http://localhost:8000/api/v1`). Do not modify `backend/`. Report CORS or credential problems as findings for the backend developer.
- Playwright E2E in mock mode: sign in → add a lecture (YouTube or upload) → processing → workspace → switch script → take quiz → view benchmark empty state.
- `frontend/docs/DEMO.md`: demo script, required env, scenarios to show, and honest list of what is mocked.
- Final **acceptance report** mapping every SRS Part 13 criterion to evidence (test output, screenshots or manual steps), plus a list of known gaps and remaining backend questions.

**Completion criteria:** build, TypeScript, lint, unit and E2E tests pass; confirmed endpoints work against the real backend or the report explains exactly why not; mock mode still works; nothing secret in the repository or bundle (show a scan); demo script verified end to end.

### END M9
