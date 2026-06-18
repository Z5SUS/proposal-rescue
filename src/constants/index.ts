import type { AppSettings } from '@/types';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  TRACKED_THREADS: 'trackedThreads',
  SETTINGS: 'settings',
} as const;

// ─── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  followUpIntervalDays: 5,
  aiTone: 'professional',
  openAiApiKey: '',
  licenseKey: '',
  licenseValid: false,
  licensePlan: 'free',
};

// ─── Plan Limits (single source of truth — never hardcode in components) ──────

export type PlanId = 'free' | 'solo' | 'agency' | 'lifetime' | 'owner';

export interface PlanLimits {
  maxThreads: number;   // Infinity = unlimited
  aiDrafts: number;     // Infinity = unlimited
  unlimited: boolean;   // true for all paid plans
  multiAccountSupport: boolean; // reserved for agency/lifetime
  teamDashboard: boolean;       // reserved for agency/lifetime
  advancedSequences: boolean;   // reserved for agency/lifetime
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxThreads: 5,
    aiDrafts: 1,
    unlimited: false,
    multiAccountSupport: false,
    teamDashboard: false,
    advancedSequences: false,
  },
  solo: {
    maxThreads: Infinity,
    aiDrafts: Infinity,
    unlimited: true,
    multiAccountSupport: false,
    teamDashboard: false,
    advancedSequences: false,
  },
  agency: {
    maxThreads: Infinity,
    aiDrafts: Infinity,
    unlimited: true,
    multiAccountSupport: true,  // reserved — not yet implemented
    teamDashboard: true,         // reserved — not yet implemented
    advancedSequences: true,     // reserved — not yet implemented
  },
  lifetime: {
    maxThreads: Infinity,
    aiDrafts: Infinity,
    unlimited: true,
    multiAccountSupport: true,  // reserved — not yet implemented
    teamDashboard: true,         // reserved — not yet implemented
    advancedSequences: true,     // reserved — not yet implemented
  },
  owner: {
    maxThreads: Infinity,
    aiDrafts: Infinity,
    unlimited: true,
    multiAccountSupport: true,
    teamDashboard: true,
    advancedSequences: true,
  },
};

// ─── Plan Display Info (used by upgrade modal) ────────────────────────────────
// Replace checkoutUrl with real LemonSqueezy / Paddle / Stripe URLs when ready.

export interface PlanInfo {
  id: PlanId;
  label: string;
  price: string;
  billing: string;
  tagline: string;
  checkoutUrl: string;
}

export const PAID_PLAN_INFO: PlanInfo[] = [
  {
    id: 'solo',
    label: 'Solo',
    price: '$9',
    billing: '/month',
    tagline: 'Best for freelancers',
    checkoutUrl: 'https://proposal-rescue.vercel.app/upgrade?plan=solo',
  },
  {
    id: 'agency',
    label: 'Agency',
    price: '$29',
    billing: '/month',
    tagline: 'Best for agencies',
    checkoutUrl: 'https://proposal-rescue.vercel.app/upgrade?plan=agency',
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    price: '$99',
    billing: ' one-time',
    tagline: 'Pay once, use forever',
    checkoutUrl: 'https://proposal-rescue.vercel.app/upgrade?plan=lifetime',
  },
];

// ─── Snooze Durations ─────────────────────────────────────────────────────────

export const SNOOZE_OPTIONS = [
  { label: 'Tomorrow',  days: 1 },
  { label: '3 Days',    days: 3 },
  { label: '1 Week',    days: 7 },
] as const;

// ─── UI Text ──────────────────────────────────────────────────────────────────

export const UI = {
  EXTENSION_NAME: 'Proposal Rescue',
  TAGLINE: 'Never lose a client because you forgot to follow up.',
  TRACK_PROMPT: 'Track this conversation?',
} as const;

// ─── Gmail DOM Selectors ──────────────────────────────────────────────────────

/**
 * These selectors target stable Gmail DOM landmarks.
 * Gmail obfuscates class names but uses reliable role and aria attributes.
 * We combine class-based heuristics with structural selectors so if Gmail
 * updates one layer the others can still anchor the injection point.
 */
export const GMAIL_SELECTORS = {
  /** Outer container of an open thread view */
  THREAD_VIEW: '[role="main"]',
  /** The header area of a thread (subject + action buttons row) */
  THREAD_HEADER: 'h2.hP',
  /** Each individual message within a thread */
  MESSAGE_ITEM: '.adn.ads',
  /** Sender name inside a message */
  SENDER_NAME: '.gD',
  /** Sender email (stored in the "email" attribute) */
  SENDER_EMAIL: '.gD[email]',
  /** The compose button */
  COMPOSE_BUTTON: '[gh="cm"]',
  /** The main content area used to detect SPA navigation */
  MAIN_CONTENT: '#\\:1',
} as const;

// ─── Content Script ───────────────────────────────────────────────────────────

/** ID added to our injected card to avoid duplicate injection */
export const TRACK_CARD_ID = 'pr-track-card';

/** ID added to our injected dashboard button */
export const DASHBOARD_BTN_ID = 'pr-dashboard-btn';

// ─── Proposal Rescue API ──────────────────────────────────────────────────────

// Development URL (uncomment to test locally)
// export const API_BASE_URL = 'http://localhost:3000/api';
export const API_BASE_URL = 'https://proposal-rescue.vercel.app/api';

export const UPGRADE_URL = 'https://proposal-rescue.vercel.app/upgrade';

export const OWNER_KEYS = ['Z5-OWNER'];


