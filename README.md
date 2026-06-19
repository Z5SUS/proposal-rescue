# 🚀 Proposal Rescue

> **Never lose a client because you forgot to follow up.**

A Chrome Extension that lives inside Gmail, tracks your proposal email threads, reminds you when to follow up, and generates AI-written follow-up drafts — so no deal goes cold because of a missed reply.

---

## 📁 Repository Structure

```
proposal-rescue/                     ← Single GitHub repo (Z5SUS/proposal-rescue)
│
├── .agents/                         ← Agent skills configuration (Supabase, etc.)
│
├── api/                             ← Vercel Serverless Backend
│   ├── generate-followup.ts         ← POST /api/generate-followup (Verifies license via DB)
│   ├── razorpay-webhook.ts          ← POST /api/razorpay-webhook (Processes payments, generates keys)
│   └── validate-license.ts          ← POST /api/validate-license (Verifies keys via DB)
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
├── schema.sql                       ← Database schema definitions for Supabase
├── vercel.json                      ← Vercel: CORS headers, routes config
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
| AI follow-up drafts | ❌ (Blocked) | **Unlimited** | **Unlimited** | **Unlimited** |
| Tone selection | ❌ (Blocked) | ✅ | ✅ | ✅ |
| Dashboard + Snooze + Won/Lost | ✅ | ✅ | ✅ | ✅ |
| Support & Extras | Standard | Standard | **Priority Support** & **Early Access** | Standard |

---

## 🏗️ Architecture

```
         Chrome Extension
                ↓ HTTPS
  Vercel Serverless (proposal-rescue.vercel.app/api)
    ├── POST /api/validate-license ────➔ [ Supabase Database ] (Licenses)
    ├── POST /api/razorpay-webhook ────➔ [ Supabase Database ] (Logs payments & active keys)
    └── POST /api/generate-followup ───➔ [ DeepSeek API ] (gpt-compatible)
```

### AI Generation Routing & Security
1. When a user clicks **Generate Draft**, the extension calls `POST /api/generate-followup`.
2. The server-side backend queries the Supabase `licenses` table.
3. If the license key is valid (active status, not expired, plan is `pro`, `mega`, or `owner`), the backend forwards the prompt to DeepSeek and returns the draft.
4. If the key is invalid/expired, the backend returns a `403` status, prompting the client to upgrade.

---

## 🔑 License Key System

| Plan | Key Prefix / Format | Access |
|---|---|---|
| **Free** | No key | Max 3 active threads, no AI follow-ups |
| **Pro** | `PR-XXXX-XXXX-XXXX` | Unlimited tracking & AI |
| **Mega** | `MG-XXXX-XXXX-XXXX` | Unlimited tracking & AI + Mega features |
| **Owner** | `Z5-OWNER` (or custom OWNER_KEYS) | Unlimited — personal developer bypass |

### Local Dev License Codes
The extension has local offline validation fallbacks to simplify development:
- Key prefix `pr-` or including `pro` -> unlocks **Pro**.
- Key prefix `mg-` or including `mega` -> unlocks **Mega**.
- Key including `owner` -> unlocks **Owner Access**.

---

## 💳 Checkout & Payments (Razorpay Webhook)

 রেডাইরেকশন লিঙ্ক configurations are centralized in [`src/constants/index.ts`](file:///c:/Users/bmxz5/Desktop/extension/src/constants/index.ts):
```typescript
export const PRO_CHECKOUT_URL = 'https://rzp.io/rzp/mp9UpHn';
export const MEGA_CHECKOUT_URL = 'https://rzp.io/rzp/qLBP8IQg';
```

### Razorpay Webhook Flow (`api/razorpay-webhook.ts`):
1. User checks out on Razorpay.
2. Razorpay sends an `order.paid` or `payment.captured` POST request to Vercel.
3. The server validates the signature using `RAZORPAY_WEBHOOK_SECRET`.
4. The server creates/upserts the subscriber in the `users` table.
5. A custom license key beginning with `PR-` or `MG-` is generated and saved in the `licenses` table.
6. Pro licenses expire in **30 days**; Mega licenses expire in **365 days**.
7. The payment is logged in the `payments` table (major currency units).

---

## 💾 Database Schema (Supabase)

Create the following tables using the queries in [`schema.sql`](file:///c:/Users/bmxz5/Desktop/extension/schema.sql):
- **`users`**: Customer list.
- **`licenses`**: Maps keys to plans, status (`active`, `expired`, `cancelled`), and calculated expirations.
- **`payments`**: Payment transaction logs.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# Go to: chrome://extensions
# Turn on: "Developer mode" (top right toggle)
# Click: "Load unpacked" (top left button)
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

## 🌐 Vercel Environment Variables

Set these in **Vercel Dashboard ➔ Project Settings ➔ Environment Variables**:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI generation |
| `OWNER_KEYS` | Comma-separated list of bypass keys (e.g. `Z5-OWNER`) |
| `RAZORPAY_WEBHOOK_SECRET` | Secret key configured in Razorpay webhook panel |

---

*Proposal Rescue © 2026 — Built by Z5SUS*
