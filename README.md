# Proposal Rescue

> Never lose a client because you forgot to follow up.

A focused Gmail productivity Chrome Extension for freelancers, consultants, and small agencies. It tracks proposal email threads and reminds you to follow up when a prospect goes quiet.

---

## What it does

1. **Detects** Gmail thread views automatically via DOM observation
2. **Lets you opt-in** — you explicitly click "Track" on threads you care about
3. **Reminds you** when you've sent the last email and no reply has arrived
4. **Generates** a follow-up draft using OpenAI (you always review before sending)
5. **Tracks outcomes** — mark threads as Won, Lost, or Stop Tracking

This is **not** a CRM. It's a lightweight reminder tool that lives inside Gmail.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension Platform | Chrome Manifest V3 |
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS (prefix: `pr-`) |
| Storage | `chrome.storage.sync` |
| AI | OpenAI API (`gpt-4o-mini`) |

---

## Project Structure

```
extension/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── background/
│   │   └── index.ts           # Service worker (alarms, message routing)
│   ├── content/
│   │   ├── index.ts           # Gmail content script entry
│   │   └── content.css        # Scoped styles for injected UI
│   ├── dashboard/
│   │   └── index.tsx          # Dashboard React app entry
│   ├── popup/
│   │   └── index.tsx          # Popup React app entry
│   ├── options/
│   │   └── index.tsx          # Settings page React app entry
│   ├── components/            # Shared React components
│   ├── hooks/                 # Shared React hooks
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── constants/
│   │   └── index.ts           # App-wide constants + Gmail selectors
│   ├── utils/
│   │   ├── storage.ts         # chrome.storage.sync wrappers
│   │   ├── dates.ts           # Date helpers
│   │   ├── gmail.ts           # Gmail DOM parsing utilities
│   │   └── gmailObserver.ts   # MutationObserver-based navigation detector
│   └── styles/
│       └── global.css         # Tailwind base + global reset
├── popup.html
├── dashboard.html
├── options.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Chromium-based browser (Chrome, Edge, Brave)

### Installation

```bash
# Install dependencies
npm install

# Build in watch mode (for development)
npm run dev

# Production build
npm run build
```

### Loading the extension in Chrome

1. Run `npm run build` to produce the `dist/` folder
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `dist/` folder

### Setting up the AI Provider (DeepSeek / OpenAI)

To enable AI-generated follow-up completions, you must configure an API key in [constants/index.ts](file:///c:/Users/bmxz5/Desktop/extension/src/constants/index.ts):
1. **DeepSeek (Preferred/Generous Free Trial)**: Paste your API key in `DEEPSEEK_API_KEY`.
2. **OpenAI**: Paste your API key in `OPENAI_API_KEY`.

The extension automatically auto-detects which key is present:
- If `DEEPSEEK_API_KEY` is configured, it will request drafts from DeepSeek's completions endpoint using the `deepseek-chat` model.
- Otherwise, it falls back to OpenAI using `gpt-4o-mini`.

Users do not need to register accounts or supply their own API keys in options — the drafting is zero-friction and works instantly.

---

## Development Phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | Project scaffolding, Vite, Tailwind, Gmail detection, MutationObserver |
| 2 | ✅ Done | Track card UI, Chrome storage integration, data model |
| 3 | ✅ Done | Dashboard, Needs Action logic, Snooze presets, custom date snooze, status actions |
| 4 | ✅ Done | OpenAI follow-up generation, Insert into Gmail Compose |
| 5 | ✅ Done | Options/Settings page, final polish |

---

## Verifying All Features

### 1. Options & Settings
1. Click the extension icon → **Settings** (or click the gear icon in the Dashboard header).
2. Enter your OpenAI API key.
3. Configure your preferred default follow-up interval (3, 5, or 7 days) and AI tone (Professional, Friendly, Direct).
4. Click **Save Settings**; confirm that settings persist on reload.

### 2. Tracking a Conversation
1. Open a thread in Gmail.
2. An interactive card will appear at the bottom-right: "Track this conversation?".
3. Click **Track**; the card will instantly update to show a `✓ Tracking` status and a **Stop Tracking** button.
4. Click **Stop Tracking**; the card immediately transitions to a `⏹ Stopped` badge.
5. In Gmail, you will not be prompted to track again once a thread is marked stopped, won, or lost.

### 3. Managing Threads in the Dashboard
- **Snooze**: Click **Snooze** on any card in the dashboard. Choose a preset or select `📅 Custom` to select a specific date (minimum tomorrow).
- **History/Archive**: Click **Won**, **Lost**, or **Stop** on a thread card. The thread is immediately moved to the collapsible **History** section at the bottom, where you can click **Track Again** or delete it permanently (✕).
- **Gmail Navigation**: Click **View Thread** on any card to update your active tab to that Gmail URL.

### 4. AI Follow-Up Drafting & Gmail Injections
1. Open a reply pane or compose window in Gmail.
2. Click **✦ Generate Follow-Up** on the thread's card in the dashboard.
3. An OpenAI draft is generated based on your settings and displayed in an editable textarea.
4. Click **Insert Into Gmail Compose**. The draft text will be inserted at the cursor position inside Gmail, preserving your undo history!

---

## Architecture Notes

### Why Tailwind with `pr-` prefix?

Gmail has its own extensive stylesheet. Without a prefix, Tailwind's utility classes would collide with Gmail's own styles. The `pr-` prefix namespaces all classes to `pr-p-4`, `pr-text-sm`, making collisions impossible.

### Why `all: initial` on the injected card?

Gmail's global CSS can cascade into injected DOM elements unexpectedly. Setting `all: initial` on the root card element resets every CSS property to its initial value, giving us a clean slate to style from.

### Why not Gmail API / OAuth?

The MVP scope doesn't require it. DOM parsing covers thread detection, subject extraction, and participant identification with zero OAuth complexity. This means users can install and start using the extension immediately with no login flow.

### Why MutationObserver + hashchange?

Gmail is a SPA. It never triggers `DOMContentLoaded` on navigation. The combination of:
- `hashchange` events (fast, fires immediately)
- `MutationObserver` debounced at 150ms (catches DOM-only navigations)

gives reliable, efficient navigation detection without polling.

---

## Privacy

- All data is stored locally using `chrome.storage.sync`
- The only external call made is to the OpenAI API (only when you click "Generate Follow-Up")
- Your OpenAI API key never leaves your device except to reach OpenAI directly
- No analytics, no tracking, no backend

