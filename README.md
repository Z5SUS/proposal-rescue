# 🚀 Proposal Rescue

> **Never lose a client because you forgot to follow up.**

Proposal Rescue is a Chrome Extension that sits inside Gmail and automatically tracks proposal conversations, reminds you to follow up, and generates AI-written follow-up email drafts — so no deal ever goes cold because of a missed message.

---

## 📦 Repository Structure

```
Desktop/
├── extension/                  ← Chrome Extension (this repo)
│   ├── src/
│   │   ├── background/         ← Service worker (badge updates, alarms)
│   │   ├── constants/          ← API URLs, storage keys, Gmail selectors
│   │   ├── content/            ← Gmail content script + onboarding UI
│   │   ├── dashboard/          ← Dashboard React app (thread list, panels)
│   │   ├── hooks/              ← useThreads, useSettings React hooks
│   │   ├── options/            ← Settings page (license key, interval, tone)
│   │   ├── popup/              ← Popup (quick stats + open dashboard)
│   │   ├── styles/             ← Global CSS / Tailwind
│   │   ├── types/              ← Shared TypeScript types
│   │   └── utils/
│   │       ├── api.ts          ← Proxy API calls (DeepSeek / Vercel backend)
│   │       ├── badge.ts        ← Chrome action badge (overdue count)
│   │       ├── dates.ts        ← Date formatting helpers
│   │       ├── entitlements.ts ← Free vs Pro feature gating
│   │       ├── gmail.ts        ← Gmail DOM helpers
│   │       ├── gmailObserver.ts← MutationObserver for Gmail SPA navigation
│   │       └── storage.ts      ← chrome.storage.sync read/write helpers
│   ├── public/                 ← Static assets (icons, manifest.json)
│   ├── dist/                   ← Build output (git-ignored)
│   ├── vite.config.ts          ← Vite build config (pages + background)
│   ├── vite.content.config.ts  ← Vite IIFE build for content script
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
└── proposal-rescue-api/        ← Vercel Serverless Backend (separate repo)
    ├── api/
    │   ├── generate-followup.ts ← POST /api/generate-followup
    │   └── validate-license.ts  ← POST /api/validate-license
    ├── .env.example
    ├── vercel.json
    └── package.json
```

---

## ✅ Features

### Core Extension
| Feature | Description |
|---|---|
| Gmail MutationObserver | Detects thread navigation inside Gmail's SPA |
| Thread Tracking | One-click tracking of proposal email threads |
| Dashboard | Full React dashboard showing active, snoozed, and archived threads |
| Snooze | Snooze a thread for 1 day, 3 days, or 1 week |
| Won / Lost / Stop Tracking | Mark outcomes and archive threads |
| AI Follow-up Generation | Generate a draft follow-up and insert it into Gmail compose |
| Settings Page | Configure follow-up interval, AI tone, and license key |
| chrome.storage.sync | All data persists across devices via Chrome sync |

### Feature Gating (Free vs Pro)
| Feature | Free | Pro |
|---|---|---|
| Active tracked threads | Max **5** | **Unlimited** |
| AI follow-up drafts | **1 lifetime** trial | **Unlimited** |
| Tone selection | ✅ | ✅ |
| Onboarding guide | ✅ | ✅ |
| Dashboard + Snooze + Won/Lost | ✅ | ✅ |

### UX Improvements
| Feature | Description |
|---|---|
| **Onboarding Guide** | First-run floating panel shown once in Gmail — dismissed with "Got It" |
| **Priority Dashboard Sort** | Overdue → oldest next action date → most recent email activity |
| **Second Follow-Up Labels** | "First Follow-Up" / "Second Follow-Up" label shown above AI drafts |
| **Action Badge** | Red Chrome badge shows exact count of overdue threads |
| **Upgrade Prompts** | Contextual upgrade cards shown when free limits are hit |
| **Empty State** | Clean empty dashboard with "Show Me How" button |

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│       Chrome Extension          │
│  (Gmail content script +        │
│   React dashboard/options/popup)│
└──────────────┬──────────────────┘
               │  HTTPS
               ▼
┌─────────────────────────────────┐
│    Vercel Serverless Backend    │
│  proposal-rescue.vercel.app/api │
│                                 │
│  POST /api/generate-followup    │
│  POST /api/validate-license     │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│        DeepSeek API             │
│   api.deepseek.com              │
│   model: deepseek-chat          │
└─────────────────────────────────┘
```

---

## 🔑 License Key System

| Plan | Format | Capabilities |
|---|---|---|
| **Free** | No key needed | 5 threads, 1 AI draft |
| **Pro** | `PR-XXXX-XXXX-XXXX` | Unlimited threads + AI drafts |
| **Owner** | `Z5-OWNER` | Internal testing — same as Pro |

### Validation Flow
1. User enters license key in **Settings → License Key** → clicks **Validate**
2. Extension calls `POST /api/validate-license`
3. Backend returns `{ valid: true, plan: "pro" }`
4. Extension stores result in `chrome.storage.sync`
5. All feature gates now allow Pro access

---

## 🛠️ Local Development

### 1. Clone & Install

```bash
git clone https://github.com/Z5SUS/proposal-rescue.git
cd proposal-rescue
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load Unpacked**
4. Select the `dist/` folder

### 4. Watch Mode (auto-rebuild on save)

```bash
npm run dev
```

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Watch mode — rebuilds pages + content script on file change |
| `npm run build` | Full production build → `dist/` |
| `npm run build:pages` | Builds popup, dashboard, options, background service worker |
| `npm run build:content` | Builds Gmail content script as IIFE (required by Chrome) |
| `npm run type-check` | TypeScript type checking without emitting files |

---

## 🔧 Key Source Files

| File | Purpose |
|---|---|
| `src/utils/entitlements.ts` | Central feature gating — `isProUser()`, `canTrackMore()`, `canUseAIDraft()` |
| `src/utils/api.ts` | Routes AI generation to Vercel backend or direct DeepSeek fallback |
| `src/utils/storage.ts` | All `chrome.storage.sync` reads/writes |
| `src/utils/badge.ts` | Updates Chrome action badge with overdue count |
| `src/constants/index.ts` | `API_BASE_URL`, `UPGRADE_URL`, `OWNER_KEYS`, default settings |
| `src/types/index.ts` | All shared TypeScript interfaces |
| `src/dashboard/Dashboard.tsx` | Main dashboard (sorting, empty state, onboarding) |
| `src/dashboard/components/FollowUpPanel.tsx` | AI draft UI + upgrade prompts |
| `src/options/index.tsx` | Settings page with license key validation |
| `src/content/trackCard.ts` | Gmail inject card + onboarding + track limit enforcement |
| `src/background/index.ts` | Service worker: badge refresh on storage change |

---

## 🌐 Backend API

The serverless backend lives at `https://proposal-rescue.vercel.app`

### `POST /api/generate-followup`
Generates an AI follow-up email. Requires Pro or Owner license.

```json
// Request
{
  "licenseKey": "PR-XXXX-XXXX-XXXX",
  "threadContext": {
    "subject": "Proposal for Website Redesign",
    "participantName": "John",
    "followUpCount": 0,
    "lastUserEmailDate": "2024-01-15"
  },
  "tone": "professional"
}

// Response 200
{ "draft": "...", "followUpLabel": "First Follow-Up" }

// Response 403 (free user)
{ "error": "AI generation requires a Proposal Rescue Pro license.", "upgrade_url": "..." }
```

### `POST /api/validate-license`
Validates a license key.

```json
// Request
{ "licenseKey": "PR-XXXX-XXXX-XXXX" }

// Response 200
{ "valid": true, "plan": "pro", "message": "License valid — Plan: pro" }
```

---

## 🚀 Deployment

### Push to GitHub

```bash
git add .
git commit -m "your message"
git push origin master
```

> ⚠️ `node_modules/` and `dist/` are in `.gitignore` — never commit them.

### Backend → Vercel

1. Push `proposal-rescue-api/` to its own GitHub repo
2. Import into [vercel.com](https://vercel.com) → New Project
3. Add environment variables in Vercel Dashboard:

| Variable | Value |
|---|---|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key |
| `OWNER_KEYS` | `Z5-OWNER` |

4. Deploy — Vercel assigns the URL automatically

---

## 📋 Tech Stack

| Layer | Technology |
|---|---|
| Extension UI | React 18, TypeScript, Tailwind CSS v3 |
| Extension Build | Vite 5 (dual config: MPA pages + IIFE content script) |
| Gmail Integration | MutationObserver, Chrome Manifest V3 |
| Data Persistence | `chrome.storage.sync` |
| Backend | Vercel Serverless Functions (Node.js / TypeScript) |
| AI Model | DeepSeek `deepseek-chat` via OpenAI-compatible SDK |
| Version Control | Git → GitHub (`Z5SUS/proposal-rescue`) |

---

## 🗺️ Roadmap

- [ ] Supabase integration — real license key database
- [ ] Lemon Squeezy / Paddle — payment processing + auto license generation
- [ ] Marketing landing page at `proposal-rescue.vercel.app`
- [ ] Email reminders for overdue threads
- [ ] Analytics dashboard (free → pro conversion tracking)

---

*Built with ❤️ — Proposal Rescue © 2026*
