# 🚀 Proposal Rescue

> **Never lose a client because you forgot to follow up.**

**Proposal Rescue** is a modern, premium Chrome Extension built to help freelancers, consultants, and sales professionals automate, organize, and accelerate their proposal follow-ups. It integrates directly with Gmail, tracks client response patterns, alerts you when threads go cold, and generates custom AI-powered follow-up emails in your choice of tone.

---

## 📁 Repository Structure

```
proposal-rescue/                     ← Single GitHub Repository (Z5SUS/proposal-rescue)
│
├── .agents/                         ← Agent skills and local model instructions
│
├── api/                             ← Vercel Serverless Backend (Production Host)
│   ├── email.ts                     ← Transactional license delivery (Resend API client)
│   ├── generate-followup.ts         ← POST /api/generate-followup (Auths keys, queries DeepSeek)
│   ├── razorpay-webhook.ts          ← POST /api/razorpay-webhook (Validates webhook, generates keys)
│   └── validate-license.ts          ← POST /api/validate-license (Supabase license lookup)
│
├── src/                             ← Chrome Extension Source Code (Vite + React + TS)
│   ├── background/
│   │   └── index.ts                 ← Service worker (badge updates, alarms, side-panel toggling)
│   │
│   ├── constants/
│   │   └── index.ts                 ← Plan limits, checkout URLs, snooze configs, storage keys
│   │
│   ├── content/
│   │   └── index.ts                 ← Gmail observer script (card injections, compose insertions)
│   │
│   ├── dashboard/
│   │   ├── Dashboard.tsx            ← Main extension side panel UI
│   │   ├── components/              ← Subcomponents: Upgrade Modal, AI Panel, Thread Item
│   │   └── index.tsx                ← Mounts dashboard container
│   │
│   ├── hooks/
│   │   ├── useSettings.ts           ← Live sync hook for Extension settings
│   │   └── useThreads.ts            ← Reads/writes tracked threads with overdue counters
│   │
│   ├── options/
│   │   └── index.tsx                ← React Options page (license validation, default intervals, tone)
│   │
│   ├── popup/
│   │   └── index.tsx                ← Popup UI (trigger dashboard slider, configure extension)
│   │
│   ├── styles/
│   │   └── global.css               ← Tailored tailwind imports, custom color variables, fonts
│   │
│   ├── types/
│   │   └── index.ts                 ← Shared interfaces (Thread, AppSettings, PlanLimits, AI Tone)
│   │
│   └── utils/
│       ├── api.ts                   ← REST client helpers with local offline bypass fallbacks
│       ├── badge.ts                 ← Updates Chrome action bar icon badge counters
│       ├── entitlements.ts          ← Feature-gating rules based on active user plan
│       └── storage.ts               ← Chrome Storage Sync wrapper & caching layer
│
├── public/
│   ├── manifest.json                ← Extension Manifest V3 (Side Panel, Alarm, Storage, Scripting permissions)
│   └── icons/                       ← Assets for browser icons
│
├── schema.sql                       ← Database schema definitions for Supabase postgres tables
├── vercel.json                      ← Serverless configuration (CORS headers, routing rules)
├── vite.config.ts                   ← Bundle setup for popup, options, dashboard, background
├── vite.content.config.ts           ← Special config to compile the Gmail content script as an IIFE
├── test-webhook.js                  ← E2E local checkout & webhook pipeline testing script
└── package.json                     ← NPM dependencies, scripts, and dev tools
```

---

## ⚡ Core Features & Gmail UI Integration

### 1. Gmail SPA Navigation & MutationObserver
* **SPA Detection:** Gmail utilizes single-page application routing. The extension runs a light `MutationObserver` in [src/content/index.ts](file:///c:/Users/bmxz5/Desktop/extension/src/content/index.ts) that senses changes to the DOM and URL to detect when the user opens a thread.
* **Injected UI Card:** If a thread is opened, a sleek floating **Proposal Rescue Track Card** is injected into the bottom-right corner of the Gmail interface.
* **5-Second Auto-Fade:** When the user clicks **Start Tracking** on this popup card, the action registers, updates storage, opens the dashboard slider, and the popup card smoothly fades off and disappears within 5 seconds.

### 2. Chrome Native Side Panel Slider
* Opening the dashboard does not open a clunky full-page window. Instead, it utilizes Chrome's native `sidePanel` API to slide open the workspace directly inside Gmail.
* You can access this panel by:
  1. Clicking the extension action icon.
  2. Activating tracking on a thread via the Gmail track card.
  3. Clicking the "Open Dashboard" button in the extension popup.

### 3. React Dashboard & Thread Tracker
* **Thread States:** Organized into **Active**, **Snoozed**, and **Archived** filters.
* **Snooze Actions:** Quickly snooze a thread for **Tomorrow (1 Day)**, **3 Days**, or **1 Week**.
* **Outcome Tracking:** Mark threads as **Won**, **Lost**, or **Stop Tracking** to compile historical results.
* **Chrome Storage Sync:** All tracked threads and outcomes sync in real-time using `chrome.storage.sync` so users never lose data switching devices.

### 4. AI Follow-up Composer
* **DeepSeek API:** Connects to the DeepSeek serverless backend for highly accurate copywriting.
* **Tone Selection:** Supports setting the AI tone to `Professional`, `Friendly`, or `Brief`.
* **Gmail Compose Integration:** Generates a draft and automatically injects it into the Gmail reply/compose editor at the cursor position with a single click.

---

## ✅ Plan Matrix & Entitlement Gating

Feature access is dynamically gated by the plan type configured on the validated license key.

| Feature | Free ($0) | Pro ($29/mo) | Mega ($99/yr) | Developer Test (₹10) | Owner (Bypass) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tracked Threads** | Max 3 | **Unlimited** | **Unlimited** | **Unlimited** | **Unlimited** |
| **AI Follow-up Drafts** | ❌ (Disabled) | **Unlimited** | **Unlimited** | **Unlimited** | **Unlimited** |
| **Tone Customization** | ❌ (Disabled) | ✅ | ✅ | ✅ | ✅ |
| **Active Duration** | Lifetime | 30 Days | 365 Days | **1 Day (24 hours)** | Lifetime |
| **Licensing Badging** | `Free Plan` | `Pro Active` | `Mega Active` | `Test Active` | `Owner Active` |

---

## 🔑 License Key System

### 1. Key Prefixing & Formatting
License keys generated by checkout pipelines carry custom prefixes:
* `PR-XXXX-XXXX-XXXX` ➔ **Pro Plan** (30 days validity)
* `MG-XXXX-XXXX-XXXX` ➔ **Mega Plan** (365 days validity)
* `TS-XXXX-XXXX-XXXX` ➔ **Developer Test Plan** (24 hours validity)
* `Z5-OWNER` (or custom keys in `OWNER_KEYS`) ➔ **Developer Owner Bypass** (Lifetime validity)

### 2. Offline / Local Development Bypasses
For rapid frontend styling and offline testing, the client-side code in [src/utils/api.ts](file:///c:/Users/bmxz5/Desktop/extension/src/utils/api.ts) bypasses server validation if the key matches specific local format rules:
* Keys starting with `ts-` or containing `test` ➔ Unlocks **Developer Test Plan**.
* Keys starting with `pr-` or containing `pro` ➔ Unlocks **Pro Plan**.
* Keys starting with `mg-` or containing `mega` ➔ Unlocks **Mega Plan**.
* Keys containing `owner` ➔ Unlocks **Owner Bypass**.

---

## 💳 Payment & Webhook Pipeline (Razorpay + Resend)

```
[ User Checkout ]
       ↓ (₹10 / $29 / $99 Payment)
 [ Razorpay API ] 
       ↓ (POST /api/razorpay-webhook with Signature)
 [ Vercel Serverless Backend ]
       ├── 1. Verify HMAC SHA256 Signature
       ├── 2. Verify Duplicate Payment ID (Payments Table)
       ├── 3. Upsert User Account (Users Table)
       ├── 4. Generate License Key (TS- / PR- / MG- Prefix)
       ├── 5. Insert License & Expiration to Database
       └── 6. Dispatch transactional email (Resend API)
```

### 1. Webhook Signature Verification
The webhook handler [api/razorpay-webhook.ts](file:///c:/Users/bmxz5/Desktop/extension/api/razorpay-webhook.ts) processes `payment.captured` events. If `RAZORPAY_WEBHOOK_SECRET` is set, it computes the HMAC SHA256 signature of the raw request payload and verifies it against the `x-razorpay-signature` header before executing database queries.

### 2. Plan Resolution by Amount/Description
Payments are mapped to database subscriptions dynamically:
* If the checkout description contains `"developer test"`, `"test"`, or the amount equals exactly **₹10** (1000 paisa), it resolves to the **`test`** plan.
* If the description contains `"mega"` or the metadata plan is `"mega"`, it resolves to the **`mega`** plan.
* Otherwise, it defaults to the **`pro`** plan.

### 3. Duplicate Payment Protection
The webhook handler queries the `payments` table for the unique `payment_id` prior to processing. If it already exists, the webhook responds with a `200` success immediately, preventing double generation of licenses for retried webhooks.

### 4. Resend Transactional Emails
The backend imports [api/email.ts](file:///c:/Users/bmxz5/Desktop/extension/api/email.ts) to send license keys via Resend. The templates adjust the subject, greeting, license instructions, and plan expiration labels:
* **Developer Test Plan:** Sends *"Proposal Rescue Test License"* with a 1-day expiration note and localized validation steps.
* **Pro & Mega Plans:** Sends *"Your Proposal Rescue License"* with corresponding monthly/yearly validation details.

---

## 💾 Database Schema (Supabase Postgres)

The backend interacts with a Supabase PostgreSQL instance. Tables and integrity constraint rules are defined as follows:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create licenses table (with support for 'test' plan and check constraints)
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key VARCHAR(50) UNIQUE NOT NULL,
  user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro', 'mega', 'owner', 'test')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR(100) UNIQUE NOT NULL,
  license_key VARCHAR(50) NOT NULL REFERENCES licenses(license_key) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro', 'mega', 'owner', 'test')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_license ON payments(license_key);
```

---

## 🛠️ Local Development & Installation

### Prerequisites
* **Node.js:** v18+ recommended
* **NPM:** Installed with Node

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/Z5SUS/proposal-rescue.git
cd proposal-rescue
npm install
```

### 2. Environment Configuration
Create a `.env` or `.env.local` file in your root workspace containing:
```env
# Supabase Database Connection
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Coprocessor Key
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# Payments & Verification
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret
OWNER_KEYS=Z5-OWNER,CUSTOM-BYPASS-KEY

# Email Delivery
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=Proposal Rescue <onboarding@resend.dev>
```

### 3. Build & Run
Compile the pages, service workers, and inject scripts:

```bash
# Watch mode — automatically rebuilds both components and Gmail content scripts on save
npm run dev

# Production build — compiles all files into the production /dist folder
npm run build

# Direct builds
npm run build:pages      # Compiles React Popup, Side Panel, Options page, and Background SW
npm run build:content    # Compiles Gmail content injector as an IIFE
```

### 4. Load the Unpacked Extension in Chrome
1. Open Google Chrome.
2. In the URL bar, go to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the **`dist`** directory inside this project folder.
6. The extension is now active. Refresh your Gmail window to see the tracking popup.

---

## 🧪 Webhook E2E Testing Guide

A dedicated node utility [test-webhook.js](file:///c:/Users/bmxz5/Desktop/extension/test-webhook.js) is provided to simulate Razorpay payment events and verify the license production flow without initiating a real payment.

### How to Run:
1. Ensure your backend serverless functions are running locally or on Vercel.
2. If testing a local server (e.g. Next/Vite serverless runner), start your local backend (usually on port `3000`).
3. Run the script:
   ```bash
   # Syntax: node test-webhook.js <webhook_url> <optional_webhook_secret>
   
   # Test localhost:
   node test-webhook.js http://localhost:3000/api/razorpay-webhook
   
   # Test Vercel staging/production:
   node test-webhook.js https://proposal-rescue.vercel.app/api/razorpay-webhook
   ```

### Verifying Signature Checks:
* If you run `node test-webhook.js <URL>`, and the server has `RAZORPAY_WEBHOOK_SECRET` defined, the server will block the request as unauthorized.
* Pass the matching webhook secret as the second parameter to allow the script to calculate and append the correct HMAC signature:
  ```bash
  node test-webhook.js http://localhost:3000/api/razorpay-webhook my_webhook_secret_123
  ```

---

## 🌐 Serverless Deployment

Deploy directly to **Vercel** with a single command:
```bash
vercel --prod
```

Configure your **Environment Variables** in Vercel under *Project Settings ➔ Environment Variables* matching the `.env.local` reference. All routing, CORS bypass definitions, and entry points are handled automatically by [vercel.json](file:///c:/Users/bmxz5/Desktop/extension/vercel.json).

---

*Proposal Rescue © 2026 — Built by Z5SUS*
