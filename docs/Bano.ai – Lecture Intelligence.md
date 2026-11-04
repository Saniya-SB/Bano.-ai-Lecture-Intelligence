# Bano.ai – Lecture Intelligence

## Output A: Frontend Design & Architecture Blueprint

Built from your SRS (v1.0) and the reference screenshot · 5 November 2026 · Pairs with Output B (the Antigravity Master Development Prompt)

---

## 0. Read this first

**Decisions I made on your behalf.** Change any of these before you paste Output B.

1. **Product name.** Your message uses both “Bano.ai” and “Awiya AI”, and the SRS calls it “Hinglish Lecture Intelligence”. I used **Bano.ai – Lecture Intelligence** and put it in a single `BRAND` constant, so renaming is a one-line change.
2. **Secondary text contrast.** #77766D on #F6F2E9 is roughly 4.1:1 by my calculation, below the WCAG AA 4.5:1 minimum for small text. I kept it as `--text-subtle` (for large or non-essential text) and added `--text-muted: #6B6A61` (about 4.9:1) for body-size secondary text.
3. **Accent contrast.** White on #B85C43 is about 4.5:1, a borderline pass. Hover and pressed states go darker (#A24E38, #8E4330), which also matches the deeper red-brown button in your screenshot.
4. **Devanagari font.** Manrope and Inter do not contain Devanagari glyphs, so the Devanagari transcript would fall back to arbitrary system fonts. I added **Noto Sans Devanagari** (via `next/font`) for that view only.
5. **Hero visual.** The reference uses a photograph. I specified a code-built “transcript preview” card using sample sentences from your SRS instead: no stock photos, no external images, no fabricated claims.
6. **Benchmark mock vs. “no fake results”.** The SRS asks for a benchmark mock file but forbids hard-coded or random accuracy values. Resolution: the mock returns the **empty state by default**. A sample fixture exists only behind an explicit opt-in flag and always sits under a permanent “SAMPLE DATA – NOT REAL RESULTS” banner.
7. **Test tooling.** The SRS requires tests but names no framework. Proposed dev-only tools: Vitest + React Testing Library (+ jsdom), and Playwright in the final milestone. Antigravity must get your approval in Phase 0 before installing them.
8. **Footer pages.** The footer needs About, Privacy, Terms and Contact, but those routes are not in the SRS. I proposed simple placeholder pages (`/about`, `/privacy`, `/terms`, `/contact`) so no link is dead; they need real copy from you.
9. **Dark mode** is out of scope (not in the SRS). Tokens are CSS variables so it can be added later.

**Gaps in the SRS API list.** Several required UI features have no matching endpoint (logout, reset-password confirmation, quiz submission, profile update, account deletion, usage, dashboard stats). The frontend will not invent them. They are listed in §10 as questions for your backend developer, and the UI is built behind capability flags until answered.

---

## 1. Product understanding

**What it is.** A web app where engineering students turn Hinglish (Hindi–English code-switched) lectures into transcripts, notes, summaries, important questions and quizzes. A research-grade benchmark page compares speech-recognition models on technical Hinglish.

**Core flow.** Sign up / sign in → add a lecture (upload, record, or YouTube) → processing status → lecture workspace (Overview, Transcript, Notes, Summary, Questions, Quiz) → revisit from history.

**Three input modes.** Upload (MP3, WAV, M4A, MP4, WEBM as *candidates*; backend confirms), Record (browser MediaRecorder), YouTube (permitted captions or authorised audio only: no downloading or scraping).

**Frontend owns:** architecture, all UI/UX, API integration layer, mock API, responsive design, frontend tests.

**Frontend must never:** call Gnani or any AI provider, transcribe or run LLMs in the browser, perform database or backend-auth logic, compute benchmark metrics, expose secrets, or invent endpoints and response fields.

---

## 2. SRS coverage matrix

Nothing below is optional. Each row says where it is handled.

| SRS part | Requirement summary | Handled in |
| --- | --- | --- |
| 1 Product | Hinglish focus, 3 input modes, Devanagari + Roman outputs, YouTube restriction | §1, §5.9–5.11 |
| 2 Role | Ownership list; must-NOT-build list; no Gnani calls from browser | §1, Output B §3 |
| 3 Stack | Next.js, App Router, TS, React, Tailwind, shadcn/ui, Lucide, RHF, Zod, Fetch, TanStack Query, Sonner, Recharts, Vercel | §6.1 |
| 3.1 Principles | Feature-based, reusable, UI/API separation, central client and error handling, mock support | §6 |
| 4 Routes | 4 public + 8 authenticated routes | §5 |
| 5.1 Landing | Nav, hero copy, 7 feature cards, 3 steps, benchmark section without accuracy claims, footer | §5.1 |
| 5.2 Auth | Signup, login, forgot password, strength meter, validation, expiry handling | §5.2–5.4 |
| 5.3 Dashboard | Welcome, 4 stats, recent lectures, 6 statuses, quick actions, empty state | §5.5 |
| 5.4 New lecture | Upload, Record, YouTube, no hard-coded limits, no upload without confirmation | §5.8–5.11 |
| 5.5 Processing | 7 stages, polling, retry if supported, redirect on completion, no invented percentages | §5.12 |
| 5.6 Workspace | 6 tabs; script switch must not re-transcribe; backend evaluates quiz | §5.13–5.19 |
| 5.7 History | Search, filters, sort, rename, delete with confirmation | §5.6 |
| 5.8 Benchmark | Overview, table, 4 charts, details; no hard-coded or random values; measured vs estimated | §5.20 |
| 5.9 Profile/Settings | Profile, preferences, password if supported, usage, data deletion, sign out | §5.21–5.22 |
| 6 Structure | Required folder layout | §6.2 |
| 7 Integration | Env base URL, provisional endpoints, snake\_case, string IDs, ISO 8601 | §7 |
| 8 Mock API | Centralised, switchable, same types, adapters | §7.4 |
| 9 UI direction | Minimal, no heavy gradients or glass, sidebar + header, mobile nav | §3–4 |
| 10 Errors | 13 listed failure modes; no raw errors; no infinite loading | §8.1 |
| 11 Security | No secrets, no tokens in localStorage, backend enforces ownership | §8.2 |
| 12 Plan | 7-day plan | §9 |
| 13 Acceptance | 20 criteria | §9.3 |
| 14 Git | Branches, ownership, no `.env` | Output B §3 |
| 15 Agent rules | Inspect first, plan, wait for approval, milestone by milestone | Output B |

---

## 3. Reference design analysis

The screenshot is a phone photo of a laptop screen, so colours are skewed by glare and warm lighting. **Your hex tokens are the source of truth; the screenshot guides layout, hierarchy and character only.**

| Observed in reference | Adaptation for Bano.ai |
| --- | --- |
| Warm cream page background, no gradients | `--bg` #F6F2E9 everywhere; no decorative gradients |
| Wordmark with lowercase name, a tiny mono tag chip beside it | Lowercase `bano.ai` wordmark (Manrope 700, accent on the dot) with a small mono chip, text set by `BRAND` |
| Slim top nav: plain text links, subdued weight; “Log in” as text; “Join” as filled terracotta button, small radius | Same pattern: Home, Features, How It Works, Benchmark as text links; Sign In as text; Get Started as filled terracotta |
| Very large, heavy, tightly-leaded headline, left aligned, \~55% width | Manrope 800, tight tracking and 1.05–1.1 leading, using the SRS headline “Your Lectures. Your Language. Your Learning.” |
| Grey body paragraph, generous line height, narrow measure | Inter 18/30 in `--text-muted`, max \~52ch |
| Primary button with trailing arrow; secondary white button with thin border and leading icon | Primary: terracotta + `ArrowRight`. Secondary: white card colour, 1px border, `Sparkles` or `LayoutGrid` icon |
| Right-hand rounded image card with dark bottom overlay, mono uppercase badge, location chip, bold caption, two check-mark facts | Right-hand **product preview card**: rounded 20px, sample transcript (Devanagari + Roman lines, script toggle), mono badge “HINGLISH TRANSCRIPT”, caption, two factual check items (e.g. “Devanagari and Roman views”, “Timestamped transcript”) |
| Generous whitespace, content centred in \~1200px container | 1200px marketing container, 96–128px section spacing |
| Subtle 1px borders, almost no shadow | Borders do the work; shadows only on popovers and modals |

**Do not copy:** the brand name, copy, photograph, tag text, or any roommate/housing content. **Do not carry over:** the dark photo overlay gradient (only needed over photos; we have none).

---

## 4. Design system: Warm Minimalist + Modern AI SaaS

### 4.1 Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | #F6F2E9 | Page canvas |
| `--surface-sunken` | #EFE9DC | Sidebar, code/transcript wells, table headers |
| `--card` | #FFFDFA | Cards, inputs, popovers, modals |
| `--border` | #E8E0D3 | Default 1px borders |
| `--border-strong` | #D8CEBD | Input hover, dividers needing emphasis |
| `--text` | #25251F | Headings, primary text |
| `--text-muted` | #6B6A61 | Body-size secondary text (AA-safe) |
| `--text-subtle` | #77766D | Large or non-essential secondary text, placeholders |
| `--accent` | #B85C43 | Primary buttons, active tab indicator, links |
| `--accent-hover` | #A24E38 | Hover |
| `--accent-pressed` | #8E4330 | Pressed |
| `--accent-soft` | #F4E3DC | Selected rows, soft badges, focus tint |
| `--success` / `-soft` | #3F6B4E / #E6EFE5 | Completed |
| `--warning` / `-soft` | #8A5A12 / #F7EBD2 | Estimated values, cautions |
| `--danger` / `-soft` | #A33A30 / #F8E3DF | Failed, destructive |
| `--info` / `-soft` | #3F5F7A / #E4ECF2 | In-progress statuses |

Antigravity must verify every text/background pair reaches WCAG AA (4.5:1 normal, 3:1 large and UI components) in Milestone 1 and adjust the semantic pairs if any fail. Accent is the **only** brand colour; semantic colours appear only for status.

**shadcn mapping** (so every shadcn component inherits the theme):

```css
:root {
  --background: #F6F2E9;  --foreground: #25251F;
  --card: #FFFDFA;        --card-foreground: #25251F;
  --popover: #FFFDFA;     --popover-foreground: #25251F;
  --primary: #B85C43;     --primary-foreground: #FFFDFA;
  --secondary: #FFFDFA;   --secondary-foreground: #25251F;
  --muted: #EFE9DC;       --muted-foreground: #6B6A61;
  --accent: #F4E3DC;      --accent-foreground: #25251F;
  --destructive: #A33A30; --border: #E8E0D3;
  --input: #D8CEBD;       --ring: #B85C43;
  --radius: 0.75rem;
}
```

(Antigravity should adapt this to the installed Tailwind and shadcn major versions and keep the Bano-specific tokens above alongside it.)

### 4.2 Typography

Fonts load through `next/font/google` (self-hosted at build): **Manrope** (headings), **Inter** (body), **JetBrains Mono** (technical), **Noto Sans Devanagari** (Devanagari transcript only).

| Style | Desktop → mobile | Weight / font | Use |
| --- | --- | --- | --- |
| Display | 60/64 → 38/42, tracking -0.03em | Manrope 800 | Landing hero only |
| H1 | 40/46 → 30/36 | Manrope 700 | Marketing section titles, auth titles |
| H2 | 28/34 → 24/30 | Manrope 700 | App page titles |
| H3 | 20/28 | Manrope 700 | Card and section titles |
| H4 | 16/24 | Manrope 600 | Sub-headings |
| Body-lg | 18/30 | Inter 400 | Hero and section intros |
| Body | 16/26 | Inter 400 | Reading content (notes, summary) |
| UI | 14/20 | Inter 500 | Buttons, inputs, tables, nav |
| Small | 13/18 | Inter 400 | Helper text, metadata |
| Eyebrow | 12/16, uppercase, +0.08em | JetBrains Mono 500 | Badges, section labels |
| Mono | 13/20 | JetBrains Mono 400 | Timestamps, WER/CER numbers, file sizes, job and model configuration |
| Transcript (Roman) | 16/28 | Inter | Roman Hinglish |
| Transcript (Devanagari) | 17/32 | Noto Sans Devanagari | Needs extra line height |

Mark Devanagari text with `lang='hi'` and Roman Hinglish with `lang='hi-Latn'` for correct shaping, hyphenation and screen-reader pronunciation. Use tabular numerals for all numeric columns.

### 4.3 Spacing, radius, elevation, motion

- **Spacing:** 4px base. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. Card padding 24 (16 on mobile). Marketing sections 96–128 vertical (64 on mobile).
- **Widths:** marketing container 1200; app content max 1120 beside a 256px sidebar; reading columns (transcript, notes, summary) capped around 72ch.
- **Radius:** sm 6 (badges), md 8 (buttons, inputs), lg 12 (cards), xl 20 (hero card, modals), full (avatars, pills).
- **Elevation:** none by default. `shadow-sm: 0 1px 2px rgb(37 37 31 / .05)` for raised cards on hover. `shadow-md: 0 12px 32px -12px rgb(37 37 31 / .18)` for popovers and modals only.
- **Motion:** 150ms for hover and focus, 200ms ease-out for enter/exit. Allowed: fade, 4px slide-up on dialogs and toasts, tab indicator slide, subtle status-dot pulse. Forbidden: parallax, scroll-jacking, bounce, looping decorative animation. Respect `prefers-reduced-motion`.

### 4.4 Breakpoints and layout

Mobile-first with Tailwind defaults: base (<640), `sm` 640, `md` 768 (two-column grids), `lg` 1024 (persistent sidebar), `xl` 1280, `2xl` 1536 (content cap). Design for a 360px minimum; nothing may scroll horizontally at 320px. Wide tables and code scroll **inside** their own container.

**App shell.** Desktop (≥lg): fixed 256px sidebar on `--surface-sunken` (wordmark; primary “New Lecture” button; nav: Dashboard, Lectures, Benchmark; bottom: Settings, user block), 64px top header (page title or breadcrumb, user dropdown), then the content area. Mobile/tablet (\<lg): header with hamburger opening a left Sheet drawer with the same nav; stacked cards; touch targets at least 44px.

### 4.5 Component specifications

| Component | Specification |
| --- | --- |
| **Button: primary** | `--accent` fill, `--card` text, radius 8, height 40 (36 small, 48 large on hero/auth), trailing `ArrowRight` allowed; hover → `--accent-hover`; pressed → `--accent-pressed`; disabled 50% opacity; loading shows spinner and keeps width |
| **Button: secondary** | `--card` fill, 1px `--border-strong`, `--text`; hover fills `--surface-sunken` |
| **Button: ghost / link / destructive** | Ghost: transparent, hover `--surface-sunken`. Link: accent text, underline on hover. Destructive: `--danger` fill, used only inside confirmation dialogs |
| **Input / textarea / select** | `--card` fill, 1px `--input` border, radius 8, height 40, 14px text; focus: border `--accent` + 2px ring at 40% accent; error: `--danger` border plus message below with `aria-describedby`; labels always visible above; helper text 13px `--text-muted` |
| **Card** | `--card`, 1px `--border`, radius 12, padding 24, no shadow; interactive cards gain `shadow-sm` and `--border-strong` on hover |
| **Sidebar** | As §4.4; active item: `--accent-soft` background, accent icon, 600 weight; 40px rows; Lucide icons 18px |
| **Top navbar (marketing)** | 72px, sticky, `--bg` with 1px bottom border once scrolled; text links 14px; collapses to Sheet menu below `md` |
| **Dropdown menu** | shadcn DropdownMenu on `--card`, radius 12, `shadow-md`, 36px items; used for user menu and per-row lecture actions (Open, Rename, Delete) |
| **Tabs** | Underline style: 2px accent indicator, 14px 500 text; horizontally scrollable on mobile with edge fade; full keyboard support; tab state mirrored in the URL (`?tab=`) |
| **Modal** | shadcn Dialog, radius 20, `shadow-md`, overlay `rgb(37 37 31 / .4)`; destructive confirmations use AlertDialog with explicit action label (“Delete lecture”), never “OK” |
| **Toast** | Sonner, bottom-right (top-center on mobile), `--card` background, 1px border, small status icon; success 4s, error persists until dismissed; never the only place an error appears |
| **Status badge** | Mono 12px uppercase pill: Uploaded = neutral; Processing / Transcribing / Generating Notes = info with a pulsing dot; Completed = success; Failed = danger. Always icon + text, never colour alone |
| **Loading** | Route-level `loading.tsx` skeletons shaped like the final layout, `--surface-sunken` blocks with a gentle opacity pulse. Buttons show spinners. **Every loading state has a timeout that converts to an error state.** |
| **Empty state** | Centred in the card: 40px Lucide icon in `--accent-soft` circle, H3 title, one sentence, one primary action |
| **Error state** | Same layout, `--danger-soft` icon, plain-language message, “Try again” button and (for auth expiry) “Sign in again”; no stack traces, provider names or raw payloads |

---

## 5. Page specifications

### 5.0 Standard states (used by every page)

- **Loading:** a skeleton shaped like the final layout. After 20 seconds without a response it becomes the error state. No infinite spinners.
- **Error:** `ErrorState` with a message chosen by error kind (network, timeout, server, not found, forbidden) and a “Try again” button.
- **Auth expired (401):** one global handler clears the query cache and redirects to `/login?next=<path>` with a toast, “Your session expired. Please sign in again.” It must not loop.
- **Empty:** `EmptyState` with icon, title, one sentence and one primary action.
- **Offline:** a slim banner (“You appear to be offline”) driven by `navigator.onLine`; queries pause and resume on reconnect.

### 5.1 Landing page `/`

- **Layout:** sticky marketing navbar, then Hero, Features, How It Works, Benchmark, a closing call to action, and Footer.
- **Navbar:** wordmark; Home, Features, How It Works, Benchmark (smooth-scroll anchors); Sign In (text); Get Started (primary).
- **Hero:** two columns at `lg`. Left: eyebrow, display heading “Your Lectures. Your Language. Your Learning.”, the SRS description, buttons **Get Started** (primary, arrow) and **Explore Features** (secondary, scrolls to Features). Right: product-preview card (see §3) with the Devanagari and Roman sample sentences from the SRS, a non-functional script toggle clearly styled as a preview, a mono “HINGLISH TRANSCRIPT” badge and two factual check items.
- **Features:** 7 cards in a 3-column grid (2 at `md`, 1 on mobile): Hinglish Transcription, Smart Notes, Lecture Summaries, Technical Glossary, Important Questions, AI Quizzes, Model Benchmarking. Each has a Lucide icon in an `--accent-soft` circle, an H3 and one sentence that describes capability, never an accuracy number.
- **How It Works:** three numbered steps with mono numerals: (1) Upload, record or provide a supported lecture source, (2) AI processes the lecture, (3) Access transcripts and learning material.
- **Benchmark section:** explains that the project evaluates speech-recognition accuracy on technical Hinglish lectures, using the same samples across models. **No numbers, no charts, no “X% accurate” claims.** Link: “View benchmark” (goes to `/benchmark` if signed in, otherwise `/login`).
- **Footer:** wordmark, About, Privacy, Terms, Contact. These link to simple placeholder pages (`/about`, `/privacy`, `/terms`, `/contact`) pending real copy; copyright line.
- **Responsive:** hero stacks (text first, preview below); navbar collapses to a Sheet menu below `md`.
- **States:** static page; if the user already has a session, Sign In / Get Started become “Go to dashboard”.

### 5.2 Sign up `/signup`

- **Layout:** centred 440px card on `--bg`, wordmark above, link to Sign in below. Split layout on `lg` is optional; keep it a single card.
- **Fields:** Full name, Email, Password, Confirm password, Terms checkbox (links to `/terms`).
- **Components:** RHF + Zod; password visibility toggle (`Eye`/`EyeOff`, with accessible label); **password strength meter**, a four-segment advisory bar from a small local scorer (length, character variety); it never blocks submission unless the Zod rule fails, and backend policy errors override it.
- **Interactions:** validate on blur then on change; submit disabled while pending; backend field errors map to inputs, other errors show in an inline alert at the top of the card.
- **States:** submitting (spinner, inputs disabled), field errors, generic failure, email-already-registered (field error), success → redirect according to the agreed auth flow (to `/dashboard`, or to `/login` with a toast if the backend does not sign users in on signup).

### 5.3 Sign in `/login`

- **Fields:** Email, Password (with visibility toggle), “Forgot password?” link, “Remember me” **only if** the backend supports it (capability flag).
- **Interactions:** same form pattern; honours `?next=` after success (validated as a same-origin relative path to prevent open redirects).
- **States:** invalid credentials (generic message; never reveal which field was wrong), account locked or rate limited (backend message mapped to friendly text), network failure, session-expired notice when redirected.

### 5.4 Forgot password `/forgot-password`

- **Layout:** same auth card. Single email field and “Send reset link”.
- **States:** success replaces the form with a confirmation (“If an account exists for that email, we’ve sent a reset link”), wording that does not confirm account existence; error; rate-limited.
- **Invalid or expired link handling** (SRS 5.2) requires the reset-link landing page. See §5.7.

### 5.5 Dashboard `/dashboard`

- **Layout:** app shell; welcome row; stats row; two columns at `lg` (Recent Lectures 2/3, Quick Actions 1/3).
- **Welcome:** “Welcome back!”, “Ready to turn your lectures into knowledge?”, **New Lecture** button. Use the user’s first name only if the profile provides one.
- **Stats (4 cards):** Total lectures, Processed lectures, Total audio duration, Notes generated. Values are derived from the lecture list **only if** the confirmed fields exist; otherwise the card shows “—” with a tooltip. Do not add a stats endpoint.
- **Recent Lectures:** up to 5 rows: title, subject, date, duration (mono), status badge; row opens the lecture (or the processing page if not completed). “View all” links to `/lectures`.
- **Quick Actions:** Upload Lecture, Record Lecture, Add YouTube Lecture. Each links to `/lectures/new?mode=upload|record|youtube`.
- **Empty state:** “You haven’t added any lectures yet.” with **Process Your First Lecture**.
- **Responsive:** stats 4 → 2 → 1 columns; Quick Actions move above Recent Lectures on mobile.

### 5.6 Lecture history `/lectures`

- **Layout:** page title and New Lecture button; toolbar; list.
- **Toolbar:** search input, Subject filter, Status filter (the six statuses), Sort (newest, oldest, title). Whether these run on the server or the client depends on the confirmed `GET /lectures` contract; the UI is built so either works behind the service layer. Filters sync to the URL query string.
- **List:** table on `md+` (Title, Subject, Date, Duration, Status, actions menu); stacked cards on mobile. Row menu: Open, Rename, Delete.
- **Rename:** inline edit or small dialog; optimistic update with rollback on failure; `PATCH /lectures/{id}`.
- **Delete:** AlertDialog naming the lecture, “This cannot be undone”, destructive confirm button.
- **States:** skeleton rows; empty (no lectures) vs. empty-after-filter (“No lectures match” with Clear filters); error with retry; pagination or “Load more” if the contract is paged.

### 5.7 Reset password (proposed) `/reset-password`

**Not in the SRS route list, and no endpoint exists for it.** Required to satisfy “invalid or expired link handling”. Build only after the backend confirms the link format and endpoint: new password + confirm, strength meter, success → login, and a clear “This link is invalid or has expired” state with a button to request a new one. Until then, ship the UI behind a capability flag in mock mode only.

### 5.8 New lecture hub `/lectures/new`

- **Layout:** title “Add a lecture”; three large selectable mode cards (Upload, Record, YouTube) acting as tabs, each with icon and one-line description; the selected mode’s form appears below. `?mode=` preselects.
- **Shared fields** (all modes): Lecture title (required), Subject (required), Optional topic/context (textarea, helps the backend; sent only if the contract has a field for it).
- **Responsive:** mode cards 3 → stacked; form full-width.
- **Behaviour:** switching modes keeps shared fields; a warning appears if leaving with a selected file or an unsent recording.

### 5.9 Upload mode

- **Components:** drag-and-drop zone (dashed `--border-strong`, accent on drag-over), “Browse files” button, file card (name, size in mono, type icon, Remove), upload button, progress bar.
- **Validation:** client-side checks are **advisory only**: extension/MIME against the candidate list read from `config`, never hard-coded size or duration limits. Backend validation errors are shown verbatim in friendly form (unsupported format, file too large, corrupt file).
- **Progress:** real byte progress only. Because `fetch` cannot report upload progress, a small isolated `XMLHttpRequest` wrapper inside the upload service is proposed (needs approval); otherwise show an indeterminate state.
- **Flow:** `initiate` → transfer → `complete` → create/process lecture → redirect to `/lectures/[id]/processing`. The exact sequence depends on the confirmed contract.
- **States:** idle, file selected, uploading (cancel supported if the transport allows), failed (retry keeps the file), success.

### 5.10 Record mode

- **Components:** permission prompt card, large round record button, timer (mono, `hh:mm:ss`), Pause / Resume / Stop controls, level meter (optional, from an `AnalyserNode`), audio preview player, Retake, **Submit recording**.
- **Rules:** MediaRecorder only; request the microphone **only after** the user clicks Start; pick a supported MIME type via `MediaRecorder.isTypeSupported` (webm/opus on Chromium, mp4 on Safari); stop all tracks on stop, unmount and navigation; **never upload without an explicit Submit click**; warn before leaving mid-recording.
- **States:** unsupported browser (explain and suggest Upload), insecure context, permission denied (step-by-step guidance to re-enable), no microphone found, recording, paused, recorded (preview), submitting, upload failed (keep the recording and offer retry).

### 5.11 YouTube mode

- **Fields:** YouTube URL, Lecture title, Subject. Button **Validate and Process**.
- **Validation:** local format check only (youtube.com/watch, youtu.be, youtube.com/live; trims, normalises). **Eligibility is decided by the backend.** The frontend never downloads, scrapes, or calls YouTube APIs.
- **Notice:** persistent helper text: “Only videos with permitted captions or authorised audio sources can be processed.”
- **States:** validating, accepted → processing page, rejected with the backend’s reason mapped to a friendly message (“This video can’t be processed. It may be private, lack captions, or not be permitted.”), network error.

### 5.12 Processing status `/lectures/[id]/processing`

- **Layout:** centred card (max 640px): lecture title and source, a vertical **stepper** of the 7 stages (Uploading, Validating, Preparing audio, Transcribing, Processing transcript, Generating learning material, Completed), and an action row.
- **Behaviour:** TanStack Query polls the job status (`refetchInterval` that stops on a terminal state, backs off after repeated failures, and has a maximum duration after which the page shows a “This is taking longer than expected” state with Refresh and Back to Lectures). The stage shown comes from backend data; stages before it are checked, stages after it are muted. **No percentage unless the backend supplies one**; otherwise an indeterminate indicator on the current stage.
- **Completion:** redirect to `/lectures/[id]` and show a success toast. If the lecture is already completed on arrival, redirect immediately.
- **Failure:** `--danger-soft` panel with a friendly reason and **Retry** only if the backend supports it (capability flag); always “Back to lectures”.
- **Accessibility:** the current stage is announced via `aria-live='polite'`.
- **States:** polling network failure (warning banner, keeps trying), 404 (lecture not found), 403, unknown stage name (shown generically, never crashes).

### 5.13 Lecture workspace shell `/lectures/[id]`

- **Layout:** page header (title, subject, status badge, Rename and Delete in a menu), tab bar (Overview, Transcript, Notes, Summary, Questions, Quiz) bound to `?tab=`, then the tab panel. Content columns are capped at \~72ch for reading comfort.
- **Behaviour:** each tab fetches its own data lazily through its own query and has independent loading/error/empty states, so one failing tab never breaks the others. If the lecture is not yet completed, show a banner linking to the processing page.
- **Responsive:** tab bar scrolls horizontally on mobile; actions collapse into the header menu.

### 5.14 Overview tab

- **Content:** metadata card (title, subject, date, duration, status) and a grid of “available material” link cards (Transcript, Notes, Summary, Questions, Quiz). Cards for material that does not exist yet appear disabled with “Not generated yet”, plus a Generate button when the corresponding `generate-*` endpoint is confirmed.

### 5.15 Transcript tab

- **Toolbar:** **script selector** (segmented control: Devanagari / Roman Hinglish), search input with match count and previous/next, Copy button (copies the visible script; option to include timestamps), Edit toggle (**only if** supported).
- **Body:** `--surface-sunken` well; segments list, each with a mono timestamp and the text. Devanagari uses Noto Sans Devanagari 17/32 with `lang='hi'`; Roman uses Inter 16/28 with `lang='hi-Latn'`.
- **Script switching is purely client-side.** Both representations arrive from the backend; toggling must **never** trigger a request or a re-transcription, and preserves scroll position and search term. Remember the last choice per user in a cookie or in-memory preference, not in a way that stores sensitive data.
- **Search:** debounced, case-insensitive, highlights matches with `--accent-soft`, scrolls to the first match, works in either script.
- **Editing (if supported):** inline segment editing, dirty-state indicator, **Save corrections** (`PATCH /transcripts/{id}`), discard confirmation, conflict and failure handling; the saved result replaces local state only after the backend confirms.
- **Performance:** long lectures can contain hundreds of segments. Use incremental rendering (render in chunks or `content-visibility: auto`) before reaching for a virtualisation dependency; ask first.
- **States:** missing transcript (“No transcript is available for this lecture” with a link to processing/retry), only one script available (selector disables the unavailable option with an explanation), search with no matches, copy success toast, save failure.
- There is no audio player in the SRS and no media endpoint, so timestamps are **not** click-to-seek. Do not build a player.

### 5.16 Notes tab

- **Sections (from SRS):** Lecture overview, Main concepts, Detailed explanations, Important points, Technical terminology (glossary, term in mono + definition), Examples, Key takeaways. Left in-page section index on `xl`, collapsible on smaller screens.
- **Actions:** Copy notes (plain text), Regenerate (only if supported; confirmation dialog because it replaces content; shows progress and keeps old notes if regeneration fails).
- **Rendering:** driven by the confirmed shape (structured JSON or markdown). **Never** use `dangerouslySetInnerHTML` on backend content. If markdown is returned, a renderer dependency requires prior approval and must sanitise.
- **States:** not generated (with Generate button if supported), generating, failed (“Notes could not be generated” with retry).

### 5.17 Summary tab

- **Content:** a Short / Detailed segmented control, a Key takeaways list, Copy button. Same generate / regenerate / failure states as Notes.

### 5.18 Questions tab

- **Content:** three groups: Short-answer, Long-answer, Conceptual. Each question is an accordion item; the answer is revealed on expand **when available**, otherwise “Answer not available”. Count badges per group; Copy all.
- **States:** not generated, empty group hidden, failed with retry.

### 5.19 Quiz tab

- **Flow:** intro card (question count) → **Start quiz** → one question per screen with progress (“Question 3 of 10”), four radio-style options where applicable (large 48px hit targets, keyboard selectable), Previous/Next, **Submit** on the last question (confirm if any unanswered) → results.
- **Results:** score, per-question review with the user’s answer, the correct answer and the explanation, **Restart quiz**.
- **Authority rule:** the backend supplies the questions and the **authoritative evaluation**. The client never marks answers itself. In mock mode the mock service performs the evaluation, so UI code is identical. A submit endpoint is not in the SRS list (see §10).
- **States:** quiz unavailable (“Quiz not generated yet” with Generate if supported), submit failure (answers preserved, retry), unanswered warning, interrupted session (answers held in component state; no sensitive persistence).

### 5.20 Benchmark `/benchmark`

- **Layout:** title and explanatory sentence; Overview stat row; Comparison table; Charts grid; Benchmark details.
- **Overview:** Models tested, Recordings evaluated, Total evaluation duration, Latest evaluation run (date).
- **Comparison table:** Model, WER, CER, Technical-term accuracy, Processing time, Estimated cost. Numbers in tabular mono. Column headers explain direction (“lower is better” for WER/CER; “higher is better” for term accuracy). A per-value **Measured / Estimated** marker (estimated shown with a `--warning-soft` pill and tooltip); the marker comes from backend data, and if the backend does not say, the value is shown as unlabelled and a banner notes it. Sortable columns.
- **Charts (Recharts, accessible):** WER comparison (bar), CER comparison (bar), Technical-term accuracy (bar), Cost vs. performance (scatter, with axis titles and a text description). Every chart has a title, axis labels, a legend where needed, accessible `aria-label`, and relies on the table as its text alternative. Colours come from a small token palette led by accent, plus neutrals; distinguish series by label and pattern as well as colour.
- **Details:** a model/recording selector, then side-by-side panels: Reference transcript and Model-generated transcript, plus Model configuration (mono key/value list) and Evaluation date. **No client-side diffing or scoring:** if the backend supplies alignment data, display it; otherwise show plain text.
- **Rules:** never hard-coded or random values; never compute WER/CER; units and ranges follow the confirmed contract; “best” markers, if used, only describe values already shown (“lowest WER among tested models”).
- **States:** empty until real results exist (“No benchmark results yet. Results appear here once an evaluation run has been completed.”), loading, error (“Benchmark data is unavailable right now”), partial data (missing metric shows “Not reported”). In sample mode, a permanent banner reads “SAMPLE DATA – NOT REAL RESULTS”.
- **Responsive:** table scrolls inside its container with a sticky first column; charts stack to one column.

### 5.21 Profile `/profile`

- **Content:** avatar (initials), Name, Email (read-only), any additional profile fields **the backend confirms**. Editing is shown only if a profile-update endpoint is confirmed; otherwise the page is read-only.
- **States:** loading, error, session-expired.

### 5.22 Settings `/settings`

- **Sections (stacked cards, section anchors on the left at `lg`):**
  1. **Account preferences:** only preferences the backend can persist; none are invented.
  2. **Password:** Change password (current, new, confirm) **only if supported**; otherwise hidden.
  3. **Usage:** Audio minutes processed, Lectures processed, AI generation usage, Remaining quota **if available**; unavailable values show “Not available”.
  4. **Data deletion:** destructive card; requires a typed confirmation (“DELETE”) in a dialog. Disabled with “Not available yet” until a deletion endpoint is confirmed.
  5. **Sign out:** button; clears the cache, calls logout if one is confirmed, redirects to `/login`.
- **States:** per-card loading and error so one failing section does not block the others.

---

## 6. Frontend architecture

### 6.1 Stack

Exactly the SRS stack: Next.js (App Router), React, TypeScript (strict), Tailwind CSS, shadcn/ui, Lucide React, React Hook Form, Zod, native Fetch, TanStack Query, Sonner, Recharts, deployed on Vercel. Antigravity must verify at install time the latest **stable and mutually compatible** versions (notably Next.js, React, Tailwind and shadcn/ui, which are version-sensitive together) and report what it pinned.

**Additions that need approval in Phase 0** (nothing else may be added):

| Addition | Why | Type |
| --- | --- | --- |
| `@hookform/resolvers` | Required glue between React Hook Form and Zod | Runtime |
| Vitest, React Testing Library, jsdom | Unit and component tests (SRS requires tests, names no tool) | Dev |
| Playwright | End-to-end flow test in the final milestone | Dev |
| `XMLHttpRequest` wrapper (no package) | Real upload progress; `fetch` cannot report it | Code only |
| Markdown renderer + sanitiser | Only if the backend returns notes as markdown | Runtime, conditional |
| List virtualisation | Only if incremental rendering is not enough for long transcripts | Runtime, conditional |

The shadcn/ui CLI also brings its own small helpers (class-variance-authority, clsx, tailwind-merge, Radix primitives); that is expected and not an “extra”. Dates and durations use `Intl` and small local utilities, not a date library. No Redux, Zustand, Axios, next-auth or UI kits beyond shadcn.

### 6.2 Folder structure

This keeps the SRS layout and adds only what the design requires.

```text
frontend/
  public/
  src/
    app/
      (public)/
        page.tsx                      # landing
        about|privacy|terms|contact/  # placeholder pages (proposed)
        (auth)/
          layout.tsx                  # centred auth card layout
          login/  signup/  forgot-password/  reset-password/ (proposed)
      (dashboard)/
        layout.tsx                    # app shell: sidebar + header + auth guard
        dashboard/
        lectures/
          page.tsx                    # history
          new/
          [id]/
            page.tsx                  # workspace (tabs via ?tab=)
            processing/
        benchmark/  settings/  profile/
      layout.tsx  globals.css  error.tsx  not-found.tsx  global-error.tsx
    components/
      ui/        # shadcn primitives (generated, themed)
      layout/    # AppShell, Sidebar, Header, MarketingNavbar, Footer, AuthCard
      shared/    # EmptyState, ErrorState, PageHeader, StatusBadge, SkeletonBlocks,
                 # CopyButton, ConfirmDialog, FileSizeText, DurationText, DemoModeBanner
    features/
      auth/ dashboard/ lectures/ upload/ recording/ transcript/
      notes/ quiz/ benchmark/ settings/
        # each feature: components/  hooks/  schemas/  utils/  index.ts
    services/
      api-client.ts                   # the only place that calls fetch
      auth-service.ts  lecture-service.ts  transcript-service.ts
      benchmark-service.ts  upload-service.ts  job-service.ts
      adapters/    # DTO (snake_case) <-> domain (camelCase) mappers
      mock/        # auth, lectures, transcripts, benchmark, outputs, jobs + fixtures
    hooks/         # cross-feature hooks (useAuth, useDebounce, useOnlineStatus)
    types/
      api/         # DTO types, snake_case, marked PROVISIONAL until confirmed
      domain/      # app types, camelCase
    lib/           # utils, formatters, query-keys, error-messages, validators
    config/        # env.ts (validated), routes.ts, features.ts (capabilities), brand.ts
    tests/         # setup and shared test utilities
  .env.example  package.json  tsconfig.json  next.config.ts
```

### 6.3 Layering rules (enforced in review)

1. **Pages are thin.** A `page.tsx` composes feature components and does no fetching logic or business rules (target under about 60 lines).
2. **Data flow is one-way:** component → feature hook (TanStack Query) → service → `api-client` (real) **or** mock → adapter → domain type. Components never import from `services/mock`, never call `fetch`, never see snake\_case.
3. **Server vs. client:** Server Components by default; `'use client'` only for interactivity (forms, tabs, recorder, charts, query hooks). Do not use Next.js Route Handlers as a hidden backend; the browser talks to FastAPI directly through the api-client.
4. **State:** server state in TanStack Query; form state in React Hook Form; URL for tab, filters, sort and mode; local `useState` for ephemeral UI. No global store.
5. **Query keys** come from one factory in `lib/query-keys.ts`. Mutations invalidate precisely.
6. **Routes, statuses, capability flags and copy for errors** are constants in `config/` and `lib/`, never string literals scattered in components.
7. **No duplicate components.** Search `components/shared` and the feature folders before creating anything.

### 6.4 Reusable component inventory

- **Layout:** AppShell, Sidebar, MobileNavSheet, Header, UserMenu, MarketingNavbar, Footer, AuthCard, PageHeader.
- **Feedback:** EmptyState, ErrorState, InlineAlert, SkeletonCard/List/Table, StatusBadge, DemoModeBanner, OfflineBanner.
- **Inputs:** PasswordInput (with toggle), PasswordStrengthMeter, FormField wrapper, FileDropzone, SubjectSelect.
- **Data display:** LectureRow/LectureCard, StatCard, DurationText, FileSizeText, TimestampText, CopyButton, SegmentedControl.
- **Dialogs:** ConfirmDialog (destructive, typed-confirm variant), RenameDialog.
- **Domain:** ModeCard, RecorderControls, RecordingTimer, AudioPreview, ProcessingStepper, TranscriptViewer, ScriptSelector, TranscriptSearchBar, NotesRenderer, QuestionAccordion, QuizRunner, QuizResults, BenchmarkTable, BenchmarkChart (bar/scatter wrappers), BenchmarkDetailsPanel, UsageCard.

---

## 7. Backend integration

### 7.1 Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL, e.g. `http://localhost:8000/api/v1`; read only in `config/env.ts` |
| `NEXT_PUBLIC_USE_MOCK_API` | `true` for mock mode |
| `NEXT_PUBLIC_MOCK_SCENARIO` (dev) | `default`, `empty`, `slow`, `errors`, `benchmark-sample` to exercise states |

`config/env.ts` validates variables with Zod at startup and fails loudly in development. `.env.example` is committed with placeholders; `.env*` is git-ignored. **No secret may use the `NEXT_PUBLIC_` prefix**, and there should be none.

### 7.2 Central API client

The single place that calls `fetch`. Responsibilities: prefix the base URL; JSON encode/decode; attach credentials according to the agreed auth mechanism; `AbortController` timeout (default 15s, configurable); one error-normalisation path producing a typed `ApiError { kind, status, userMessage, fieldErrors?, requestId? }` where `kind` is one of network, timeout, unauthorized, forbidden, not-found, validation, conflict, rate-limited, server, unknown; defensive parsing (the backend’s error format is not yet agreed); a single 401 hook; safe retry only for idempotent GETs on network errors. It never logs bodies, tokens or file contents.

### 7.3 Types and adapters

- `types/api/*` mirrors the backend: **snake\_case, string IDs, ISO 8601 dates**, each file headed `PROVISIONAL – pending backend contract` and carrying a short `// TODO(contract)` per uncertain field. Never add a field the SRS or backend has not stated.
- `types/domain/*` is what the UI uses: camelCase, `Date` or ISO strings, normalised enums (unknown backend values map to an `unknown` member so the UI never crashes).
- `services/adapters/*` convert between the two. When the real contract arrives, only types, adapters and mocks change; components do not.
- The SRS example uses `lecture_id` while the endpoint path uses `{id}`. Treat the identifier name as an open question.

### 7.4 Mock API system

- Switch: `NEXT_PUBLIC_USE_MOCK_API=true`. One service interface, two implementations (real, mock); the choice is made once in each service module. **One frontend, not two.**
- Mock data lives only in `services/mock/` and returns **DTO-shaped** objects that pass through the same adapters as real responses.
- Deterministic fixtures: sample lectures in every status, one lecture with full outputs, using the SRS example Hinglish sentences. Simulated latency (about 300–800ms, fixed per scenario) and in-memory mutations (rename, delete, create) per session.
- **Mock processing job:** a time-based state machine that advances through the stages predictably from the job’s start time (e.g. each stage lasts a fixed number of seconds). No random numbers and no invented percentages.
- **Mock auth:** accepts a clearly labelled demo account, keeps only a non-credential “signed in” marker for the tab session, stores no passwords, and is not a production auth system. It exists only to exercise the same UI paths.
- **Mock benchmark:** returns empty results by default; sample data only with `benchmark-sample`, always bannered.
- When mock mode is on, a slim **DemoModeBanner** (“Demo mode: showing sample data”) is visible on every authenticated page.
- Scenario switches let the team test empty history, slow responses, 401, 500, network failure and processing failure without touching code.

### 7.5 Capability flags

`config/features.ts` holds flags for anything the SRS marks “if supported” or that has no confirmed endpoint: `transcriptEditing`, `regenerateNotes`, `regenerateOutputs`, `processingRetry`, `rememberSession`, `changePassword`, `profileUpdate`, `accountDeletion`, `usageInfo`, `quota`, `resetPasswordConfirm`, `serverSideListQuery`. Defaults are **off** with real backend, **on** in mock mode so the UI can be built and reviewed. Turning one on later is a config change plus an adapter.

### 7.6 Provisional endpoint map

No endpoint below may be assumed to exist, and no request/response shape may be invented.

| Endpoint (provisional) | Used by |
| --- | --- |
| `POST /auth/signup`, `POST /auth/login`, `POST /auth/forgot-password` | Auth pages |
| `GET /users/me` | Session check, Profile, header user menu |
| `GET /lectures`, `POST /lectures` | History, Dashboard, New lecture |
| `GET /lectures/{id}`, `PATCH`, `DELETE` | Workspace, Overview, rename, delete |
| `POST /uploads/initiate`, `POST /uploads/complete` | Upload mode |
| `POST /lectures/{id}/process`, `GET /jobs/{id}` | Processing page |
| `GET /lectures/{id}/transcripts`, `PATCH /transcripts/{id}` | Transcript tab, corrections |
| `GET /lectures/{id}/outputs` | Notes, Summary, Questions, Quiz content |
| \`POST /lectures/{id}/generate-notes | summary |
| `GET /benchmark/results` | Benchmark page |

---

## 8. Quality: errors, security, accessibility

### 8.1 Error handling matrix (SRS Part 10)

| Failure | User-facing handling |
| --- | --- |
| Network failure | Inline `ErrorState` + retry; offline banner; queries pause and resume |
| API timeout | “This is taking longer than expected” with retry; never an endless spinner |
| Authentication expiry | Global 401 handler → sign-in with `next` and a toast |
| Invalid input | Field-level messages from Zod; backend field errors mapped to fields |
| Unsupported file format | Friendly message naming accepted types from config/backend |
| File too large | Message using the backend’s limit when provided; no hard-coded limit |
| Microphone permission denied | Guided re-enable instructions; fallback to Upload |
| Empty lecture history | Dashboard and history empty states |
| Processing failure | Failure panel, retry if supported, link back |
| Missing transcript | Transcript-tab empty state |
| Notes generation failure | Notes-tab error with retry; old notes preserved |
| Quiz unavailable | Quiz-tab state with generate action if supported |
| Benchmark data unavailable | Benchmark error or empty state |

Route-level `error.tsx` boundaries per route group, plus `not-found.tsx` and `global-error.tsx`. Raw stack traces, internal provider names and server messages are **never** shown.

### 8.2 Security (SRS Part 11)

- No API keys or secrets in code, env, or bundles; never call Gnani or any AI provider from the browser.
- **No tokens, passwords or credentials in `localStorage`/`sessionStorage`.** The mechanism is pending (httpOnly cookie session is the safest candidate, and CORS with credentials would then be required). Build an `AuthStrategy` boundary so the choice does not leak into components.
- Route protection in the app shell is **UX only**; the backend enforces authentication and ownership. Never assume a lecture belongs to the user because its ID is known; treat 403/404 as normal states.
- Recordings are uploaded only after explicit user confirmation, and only to the configured backend.
- Sanitise or structurally render all backend text; never `dangerouslySetInnerHTML`. External links use `rel='noopener noreferrer'`.
- `?next=` redirects accept same-origin relative paths only.
- Security headers in `next.config` (frame-ancestors, referrer policy, `Permissions-Policy: microphone=(self)`, a CSP compatible with `blob:` media for recording preview and the configured API origin).
- Never commit `.env`; no secrets in git history.

### 8.3 Accessibility and performance

- WCAG 2.2 AA target: visible focus rings, full keyboard operation (tabs, dialogs, accordion, quiz options), labelled controls, error text linked via `aria-describedby`, `aria-live` for processing and toasts, status never conveyed by colour alone, 44px touch targets, `prefers-reduced-motion`.
- Skip-to-content link; one `h1` per page; landmark regions.
- Lighthouse targets (landing): accessibility ≥ 95, best-practices ≥ 90. Lazy-load Recharts and the recorder (`next/dynamic`); font `display: swap`; no layout shift from images or fonts.

---

## 9. Implementation strategy

The work is split into **10 milestones**, each pasted into Antigravity separately after the previous one is reviewed. The 7-day plan in the SRS maps to them like this.

### 9.1 Milestones

| # | Day | Milestone | Outcome |
| --- | --- | --- | --- |
| M0 | 0 | Inspect and plan (**no code**) | Written plan, risks, dependency list, questions; **approval gate** |
| M1 | 1 | Foundation | Scaffold, tokens, fonts, shadcn theme, app shell, config, api-client, mock skeleton, shared components, test setup |
| M2 | 2 | Landing and auth | Landing page, signup, login, forgot-password, forms and validation |
| M3 | 3 | Dashboard and history | Dashboard, lecture history with search/filter/sort/rename/delete |
| M4 | 3 | New lecture inputs | Mode hub, Upload, Record, YouTube |
| M5 | 4 | Processing and transcript | Processing page, workspace shell, Overview, Transcript with script switch, search, copy |
| M6 | 5 | Learning material | Notes, Summary, Questions, Quiz |
| M7 | 6 | Benchmark | Table, four charts, details, empty state |
| M8 | 6 | Profile, settings, hardening | Profile, Settings, responsive pass, accessibility pass, error-state sweep |
| M9 | 7 | Integration readiness and demo | Contract mapping, mock-to-real switch for confirmed endpoints, E2E tests, demo script |

Each milestone prompt in Output B specifies objective, pages, components, files, behaviour, tests and completion criteria.

### 9.2 Testing strategy

- **Static:** `tsc --noEmit`, ESLint (Next config) and `next build` must pass after every milestone.
- **Unit:** adapters (DTO ↔ domain, unknown enum handling), formatters, validators, password scorer, YouTube URL parser, error normaliser.
- **Component:** forms (validation and error mapping), FileDropzone, ProcessingStepper, TranscriptViewer (script switch makes **no** service call; search highlighting), QuizRunner (never computes a score locally), BenchmarkTable (empty state; estimated marker).
- **Mock-mode behavioural checks:** each scenario (empty, slow, errors) renders the right state.
- **E2E (M9, Playwright):** sign in → add YouTube/upload lecture → processing → workspace → switch script → take quiz, all in mock mode.
- **Manual:** responsive check at 360, 768, 1024, 1440px; keyboard-only pass; microphone permission denied and unsupported-browser paths.

### 9.3 Acceptance checklist (SRS Part 13)

Runs locally without build errors · functional navigation · auth interfaces · working dashboard · upload UI · browser recording · YouTube submission UI · processing stages · transcript display · both transcript representations · structured notes · summaries and questions · quiz interface · benchmark dashboard · errors and empty states · responsive · works on mock APIs alone · ready for FastAPI · no exposed secrets · no critical TypeScript or build errors.

---

## 10. Questions for the backend developer

The frontend will not guess these. Until answered, the corresponding UI sits behind capability flags and mock data.

| # | Question | Blocks |
| --- | --- | --- |
| 1 | **Auth mechanism:** cookie session or token? Where does it live? CORS and `credentials` settings? Is “remember me” supported? | Login, route guard, every request |
| 2 | **Missing endpoints:** logout, reset-password confirmation, profile update, change password, account deletion, usage/quota, quiz submission and evaluation. Which will exist? | Auth, Settings, Quiz |
| 3 | **Error format** (shape, codes, field errors, request IDs) | Error handling |
| 4 | **Lecture object:** fields, `id` vs `lecture_id`, status enum values, duration unit, subject and topic fields | Dashboard, History |
| 5 | **List behaviour:** server-side search, filter, sort, pagination? | History |
| 6 | **Job object:** stage names, whether progress is provided, retry support, terminal states | Processing |
| 7 | **Upload flow:** initiate/complete semantics, direct or presigned upload, accepted formats, limits, YouTube creation payload | New lecture |
| 8 | **Transcript shape:** segments, timestamps (unit), both scripts in one response or two, editing support, conflict rules | Transcript |
| 9 | **Outputs shape:** notes, summary, questions, quiz as structured JSON or markdown? answers/explanations included? regeneration semantics | Notes through Quiz |
| 10 | **Benchmark shape:** metric units (ratio or percent), measured vs. estimated flag, model configuration fields, alignment data | Benchmark |
| 11 | **Stats:** can dashboard totals be derived from `GET /lectures`, or is an endpoint planned? | Dashboard |
| 12 | **Deployment:** API origin(s) for dev, staging and the Vercel frontend (CORS) | Integration |
