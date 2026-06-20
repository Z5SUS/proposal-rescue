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
  licenseStatus: 'free',
};

// ─── Plan Limits (single source of truth — never hardcode in components) ──────

export type PlanId = 'free' | 'pro' | 'mega' | 'owner';

export interface PlanLimits {
  trackedThreads: number;      // Infinity = unlimited
  aiDraftsEnabled: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    trackedThreads: 3,
    aiDraftsEnabled: false,
  },
  pro: {
    trackedThreads: Infinity,
    aiDraftsEnabled: true,
  },
  mega: {
    trackedThreads: Infinity,
    aiDraftsEnabled: true,
  },
  owner: {
    trackedThreads: Infinity,
    aiDraftsEnabled: true,
  },
};

// ─── Plan Display Info (used by upgrade modal) ────────────────────────────────

export const PRO_CHECKOUT_URL = 'https://rzp.io/rzp/ByBbwe06';
export const MEGA_CHECKOUT_URL = 'https://rzp.io/rzp/VKyjzme';

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
    id: 'pro',
    label: 'Pro',
    price: '$29',
    billing: '/month',
    tagline: 'Best for professionals',
    checkoutUrl: PRO_CHECKOUT_URL,
  },
  {
    id: 'mega',
    label: 'Mega',
    price: '$79',
    billing: '/year',
    tagline: 'Best value plan',
    checkoutUrl: MEGA_CHECKOUT_URL,
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


