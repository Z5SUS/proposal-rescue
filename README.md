# 🚀 Proposal Rescue

> **Never lose a client because you forgot to follow up.**

A Chrome Extension that lives inside Gmail, tracks your proposal email threads, reminds you when to follow up, and generates AI-written follow-up drafts — so no deal goes cold because of a missed reply.

---

## 📁 Repository Structure

```
proposal-rescue/                     ← Single GitHub repo (Z5SUS/proposal-rescue)
│
├── api/                             ← Vercel Serverless Backend
│   ├── generate-followup.ts         ← POST /api/generate-followup
│   └── validate-license.ts          ← POST /api/validate-license
│
├── src/                             ← Chrome Extension source
│   ├── background/index.ts          ← Service worker: badge updates, alarms
│   ├── constants/index.ts           ← API URLs, storage keys, Gmail selectors
│   ├── content/                     ← Gmail MutationObserver + track card UI
│   ├── dashboard/                   ← React dashboard (thread list, AI panel)
│   ├── hooks/                       ← useThreads, useSettings
│   ├── options/index.tsx            ← Settings page (license, interval, tone)
│   ├── popup/index.tsx              ← Popup (Open Dashboard / Settings)
│   ├── styles/global.css            ← Tailwind base + design tokens
│   ├── types/index.ts               ← Shared TypeScript interfaces
│   └── utils/
│       ├── api.ts                   ← validateLicenseAPI, generateFollowUpAPI
│       ├── badge.ts                 ← Chrome action badge (overdue count)
│       ├── entitlements.ts          ← Free vs Pro feature gating
│       ├── storage.ts               ← chrome.storage.sync helpers
│       └── ...
│
├── public/manifest.json             ← Chrome Manifest V3
├── vercel.json                      ← Vercel: CORS headers, skip vite build
├── .gitignore                       ← Ignores node_modules/, dist/, .vercel/
├── package.json
├── vite.config.ts                   ← Builds pages + background
└── vite.content.config.ts           ← Builds content script as IIFE
```

---

## ✅ Features

### Core
| Feature | Description |
|---|---|
| Gmail Detection | MutationObserver tracks thread navigation inside Gmail's SPA |
| One-click Tracking | Injected card in Gmail lets you track any thread instantly |
| Dashboard | React side panel: active, snoozed, and archived threads |
| Snooze | Snooze threads for Tomorrow / 3 Days / 1 Week |
| Won / Lost / Stop | Mark deal outcomes and archive from the dashboard |
| AI Follow-up Generation | Generate a draft and insert it directly into Gmail compose |
| Settings Page | License key, follow-up interval, and AI tone |
| chrome.storage.sync | All data syncs across Chrome devices |

### Feature Gating (Free vs Pro)
| Feature | Free | Pro / Owner |
|---|---|---|
| Active tracked threads | Max **5** | **Unlimited** |
| AI follow-up drafts | **1 lifetime** trial | **Unlimited** |
| Tone selection | ✅ | ✅ |
| Dashboard + Snooze + Won/Lost | ✅ | ✅ |

### UX & Intelligence
| Feature | Description |
|---|---|
| Priority sorting | Overdue first → Oldest due date → Most recent activity |
| Overdue badge | Red Chrome icon badge shows exact overdue count |
| Follow-up labels | Panel shows "First Follow-Up" or "Second Follow-Up" |
| Upgrade prompts | Inline cards when free limits are reached |

---

## 🏗️ Architecture

```
Chrome Extension
       ↓ HTTPS
Vercel Serverless (proposal-rescue.vercel.app/api)
  POST /api/validate-license
  POST /api/generate-followup
       ↓
DeepSeek API (deepseek-chat)

Future: Supabase (license key database)
```

### AI Generation Routing

```
User clicks "Generate Draft"
  ↓
licenseKey starts with "sk-"?
  YES → direct DeepSeek call (client-side)
  NO  → POST /api/generate-followup (Vercel)
          Owner/Pro key → server-side DeepSeek → draft returned
          Free key       → 403 → upgrade prompt shown
Free user with 1 trial left?
  YES → direct DeepSeek fallback
  NO  → upgrade prompt
```

---

## 🔑 License Key System

| Plan | Key Format | Access |
|---|---|---|
| **Free** | No key | 5 threads, 1 AI draft |
| **Pro** | `PR-XXXX-XXXX-XXXX` | Unlimited |
| **Owner** | `Z5-OWNER` | Unlimited — personal use |

### Activate Owner Access (No Payment)

1. Open **Settings** → **License & Account**
2. Enter `Z5-OWNER`
3. Click **Validate**
4. Badge shows **✓ Owner Access** — all limits lifted

> Works fully offline. No Supabase, no payment needed.

---

## 🛠️ Local Development

```bash
# Clone and install
git clone https://github.com/Z5SUS/proposal-rescue.git
cd proposal-rescue
npm install

# Build
npm run build

# Load in Chrome
# chrome://extensions → Developer Mode → Load Unpacked → select dist/

# Watch mode
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Watch mode — auto-rebuild on save |
| `npm run build` | Full production build → `dist/` |
| `npm run build:pages` | Builds popup, dashboard, options, background |
| `npm run build:content` | Builds Gmail content script as IIFE |
| `npm run type-check` | TypeScript check (no emit) |

---

## 🌐 Vercel Backend

Live at: `https://proposal-rescue.vercel.app`

### `POST /api/validate-license`
```json
// Request
{ "licenseKey": "Z5-OWNER" }

// Response
{ "valid": true, "plan": "owner", "message": "License valid — Plan: owner" }
```

### `POST /api/generate-followup`
```json
// Request
{
  "licenseKey": "Z5-OWNER",
  "threadContext": {
    "subject": "Proposal for Website Redesign",
    "participantName": "John",
    "followUpCount": 0,
    "lastUserEmailDate": "2024-06-01"
  },
  "tone": "professional"
}

// Response
{ "draft": "...", "followUpLabel": "First Follow-Up" }
```

### Required Vercel Environment Variables

Set in **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key |
| `OWNER_KEYS` | `Z5-OWNER` |

---

## 🚀 Deployment

```bash
# Push to GitHub → Vercel auto-deploys
git add .
git commit -m "your message"
git push origin master
```

> ⚠️ `node_modules/` and `dist/` are git-ignored. Never commit them.

---

## 🐛 Bugs Fixed

### `validateLicense is not defined` — Settings crash
- **Cause:** `options/index.tsx` called `validateLicense()` which was never imported.
- **Fix:** Imported `validateLicenseAPI` from `@/utils/api`. Also added persistence of license state to `chrome.storage.sync` after validation. Fixed plan badge to correctly show `✓ Owner Access`.

### "Show Me How" button removed
- Removed the button and onboarding modal from the empty dashboard state. Replaced with a plain text instruction.

### Vercel 404 on `/api/*`
- **Cause:** The `api/` folder was in a separate local directory never committed to the repo.
- **Fix:** Moved both API files into the repo root. Added `vercel.json` for CORS + build config.

### `vite: Permission denied` (Vercel exit 126)
- **Cause:** `node_modules/` was committed to Git on Windows. Vercel (Linux) couldn't execute the binary.
- **Fix:** Added `.gitignore`, ran `git rm -r --cached node_modules`, regenerated `package-lock.json`.

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
| Repo + CI/CD | GitHub → Vercel (auto-deploy on push) |

---

## 🗺️ Roadmap

- [ ] Supabase — real license key database
- [ ] Payment integration (Lemon Squeezy / Paddle)
- [ ] Marketing landing page
- [ ] Email reminders for overdue threads
- [ ] Analytics (free → pro conversion)

---

*Proposal Rescue © 2026 — Z5SUS/proposal-rescue*
