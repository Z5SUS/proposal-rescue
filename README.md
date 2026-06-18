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
│   ├── constants/index.ts           ← API URLs, storage keys, plan limits, checkout links
│   ├── content/                     ← Gmail MutationObserver + track card UI
│   ├── dashboard/                   ← React dashboard (thread list, AI panel, Upgrade modal)
│   ├── hooks/                       ← useThreads, useSettings
│   ├── options/index.tsx            ← Settings page (license validation, tone)
│   ├── popup/index.tsx              ← Popup (Open Dashboard / Settings)
│   ├── styles/global.css            ← Tailwind base + design tokens
│   ├── types/index.ts               ← Shared TypeScript interfaces
│   └── utils/
│       ├── api.ts                   ← validateLicenseAPI, generateFollowUpAPI
│       ├── badge.ts                 ← Chrome action badge (overdue count)
│       ├── entitlements.ts          ← plan-limits & feature gating
│       └── storage.ts               ← chrome.storage.sync helpers
│
├── public/manifest.json             ← Chrome Manifest V3
├── vercel.json                      ← Vercel: CORS headers, skip vite build
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

### Monetization & Feature Gating
| Feature | Free ($0) | Pro ($29/mo) | Mega ($79/yr) | Owner (Z5-OWNER) |
|---|---|---|---|---|
| Active tracked threads | Max **3** | **Unlimited** | **Unlimited** | **Unlimited** |
| AI follow-up drafts | ❌ | **Unlimited** | **Unlimited** | **Unlimited** |
| Tone selection | ❌ | ✅ | ✅ | ✅ |
| Dashboard + Snooze + Won/Lost | ✅ | ✅ | ✅ | ✅ |
| Support & Extras | Standard | Standard | **Priority Support** & **Early Access** | Standard |

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
```

### AI Generation Routing

```
User clicks "Generate Draft"
  ↓
licenseKey starts with "sk-"?
  YES → direct OpenAI/DeepSeek call (client-side) using user's key
  NO  → POST /api/generate-followup (Vercel)
          Owner/Pro/Mega key → server-side DeepSeek → draft returned
          Free key           → 403 → upgrade prompt shown
```

---

## 🔑 License Key System

| Plan | Key Prefix / Format | Access |
|---|---|---|
| **Free** | No key | Max 3 active threads, no AI follow-ups |
| **Pro** | `PR-XXXX-XXXX-XXXX` | Unlimited tracking & AI |
| **Mega** | `LT-`/`AG-`/`MG-XXXX-XXXX-XXXX` | Unlimited tracking & AI + Mega features |
| **Owner** | `Z5-OWNER` (or OWNER_KEYS list) | Unlimited — personal developer bypass |

### Local Dev License Codes
The extension has local offline validation fallbacks to simplify development:
- Key prefix `pr-` or including `solo` -> unlocks **Pro**.
- Key prefix `lt-`, `ag-`, `mg-` or including `mega`/`agency`/`lifetime` -> unlocks **Mega**.
- Key matching `Z5-OWNER` -> unlocks **Owner Access**.

---

## 💳 Checkout & Payments (Razorpay)

Payment redirection link configurations are centralized in [`src/constants/index.ts`](file:///c:/Users/bmxz5/Desktop/extension/src/constants/index.ts):
```typescript
export const PRO_CHECKOUT_URL = 'https://rzp.io/rzp/mp9UpHn';
export const MEGA_CHECKOUT_URL = 'https://rzp.io/rzp/qLBP8IQg';
```

When a free user clicks **Choose Pro** or **Choose Mega** inside the Upgrade Modal, they are redirected to their respective checkout page.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# Go to: chrome://extensions
# Turn on: "Developer mode" (top right)
# Click: "Load unpacked" (top left)
# Select: The /dist directory of this project

# Run watch/dev mode
npm run dev
```

### Commands

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
{ "licenseKey": "PR-1234-ABCD-5678" }

// Response
{ "valid": true, "plan": "pro", "message": "License valid — Plan: pro" }
```

### `POST /api/generate-followup`
```json
// Request
{
  "licenseKey": "PR-1234-ABCD-5678",
  "threadContext": {
    "subject": "Proposal for Website Redesign",
    "participantName": "John",
    "followUpCount": 0,
    "lastUserEmailDate": "2026-06-18T13:30:50Z"
  },
  "tone": "professional"
}

// Response
{ "draft": "..." }
```

### Required Vercel Environment Variables
- `DEEPSEEK_API_KEY`: API key for server-side generation.
- `OWNER_KEYS`: Comma-separated list of developer owner bypass keys (e.g. `Z5-OWNER`).

---

## 🚀 Deployment

Pushing code to the `master` branch auto-deploys the backend serverless endpoints on Vercel:
```bash
git add .
git commit -m "commit message"
git push origin master
```

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
| Payment Checkout | Razorpay |

---

*Proposal Rescue © 2026 — Z5SUS/proposal-rescue*
