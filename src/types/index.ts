// ─── Thread Status ────────────────────────────────────────────────────────────

export type ThreadStatus = 'active' | 'won' | 'lost' | 'stopped';

// ─── Core Data Model ──────────────────────────────────────────────────────────

export interface TrackedThread {
  /** Gmail thread ID extracted from the URL hash, e.g. "18b3e2fcd8a1f20c" */
  threadId: string;
  /** Subject line of the email thread */
  subject: string;
  /** Display name of the primary contact */
  participantName: string;
  /** Email address of the primary contact */
  participantEmail: string;
  /** Current tracking status */
  status: ThreadStatus;
  /** Number of times the user has followed up */
  followUpCount: number;
  /** ISO timestamp of the most recent email sent BY the user */
  lastUserEmailDate: string;
  /** ISO timestamp when a follow-up action should next be surfaced */
  nextActionDate: string;
  /** ISO timestamp until which reminders are suppressed; null if not snoozed */
  snoozedUntil: string | null;
  /** ISO timestamp of when tracking was first enabled */
  createdAt: string;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export type FollowUpInterval = 3 | 5 | 7;
export type AiTone = 'professional' | 'friendly' | 'direct';

export interface AppSettings {
  followUpIntervalDays: FollowUpInterval;
  aiTone: AiTone;
  openAiApiKey: string;
  licenseKey: string;
  licenseValid: boolean;
  licensePlan: 'free' | 'solo' | 'agency' | 'lifetime' | 'owner';
}

// ─── Storage Schema ───────────────────────────────────────────────────────────

/** Shape of the entire chrome.storage.sync record */
export interface StorageSchema {
  trackedThreads: Record<string, TrackedThread>;
  settings: AppSettings;
  aiDraftsUsed: number;
  onboardingDismissed: boolean;
}

// ─── Message Passing ──────────────────────────────────────────────────────────

/** Messages sent from content script → background or popup */
export type ExtensionMessage =
  | { type: 'THREAD_DETECTED'; payload: { threadId: string; subject: string } }
  | { type: 'OPEN_DASHBOARD' }
  | { type: 'PING' };

/** Responses sent back to the content script */
export type ExtensionResponse =
  | { success: true; data?: unknown }
  | { success: false; error: string };
