import type { AppSettings, StorageSchema, TrackedThread } from '@/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/constants';

// ─── Low-level helpers ────────────────────────────────────────────────────────

/** Read one or more keys from chrome.storage.sync */
function syncGet<K extends keyof StorageSchema>(
  keys: K[],
): Promise<Pick<StorageSchema, K>> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result as Pick<StorageSchema, K>);
      }
    });
  });
}

/** Write a partial update to chrome.storage.sync */
function syncSet(items: Partial<StorageSchema>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const result = await syncGet([STORAGE_KEYS.SETTINGS]);
  const settings = result.settings ?? DEFAULT_SETTINGS;

  // Backward compatibility: default plan to 'free' if missing or invalid
  if (!settings.licensePlan || !['free', 'pro', 'owner'].includes(settings.licensePlan)) {
    settings.licensePlan = 'free';
  }
  if (settings.licenseValid === undefined) {
    settings.licenseValid = false;
  }

  return settings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await syncSet({ [STORAGE_KEYS.SETTINGS]: settings });
}

// ─── Tracked Threads ──────────────────────────────────────────────────────────

export async function getAllThreads(): Promise<Record<string, TrackedThread>> {
  const result = await syncGet([STORAGE_KEYS.TRACKED_THREADS]);
  return result.trackedThreads ?? {};
}

export async function getThread(threadId: string): Promise<TrackedThread | null> {
  const threads = await getAllThreads();
  return threads[threadId] ?? null;
}

export async function saveThread(thread: TrackedThread): Promise<void> {
  const threads = await getAllThreads();
  threads[thread.threadId] = thread;
  await syncSet({ [STORAGE_KEYS.TRACKED_THREADS]: threads });
}

export async function updateThread(
  threadId: string,
  patch: Partial<TrackedThread>,
): Promise<TrackedThread | null> {
  const threads = await getAllThreads();
  const existing = threads[threadId];
  if (!existing) return null;
  const updated: TrackedThread = { ...existing, ...patch };
  threads[threadId] = updated;
  await syncSet({ [STORAGE_KEYS.TRACKED_THREADS]: threads });
  return updated;
}

export async function deleteThread(threadId: string): Promise<void> {
  const threads = await getAllThreads();
  delete threads[threadId];
  await syncSet({ [STORAGE_KEYS.TRACKED_THREADS]: threads });
}

// ─── Derived queries ──────────────────────────────────────────────────────────

/**
 * Returns ALL active non-snoozed threads.
 * Used by the dashboard to show everything being tracked —
 * both overdue AND upcoming threads are shown, just styled differently.
 */
export async function getActiveThreads(): Promise<TrackedThread[]> {
  const threads = await getAllThreads();
  const now = new Date();

  return Object.values(threads).filter((t) => {
    if (t.status !== 'active') return false;
    if (t.snoozedUntil && new Date(t.snoozedUntil) > now) return false;
    return true;
  });
}

/**
 * Returns only threads that are PAST their follow-up date (overdue).
 * Used for the action count badge in the header.
 */
export async function getActionableThreads(): Promise<TrackedThread[]> {
  const threads = await getAllThreads();
  const now = new Date();

  return Object.values(threads).filter((t) => {
    if (t.status !== 'active') return false;
    if (t.snoozedUntil && new Date(t.snoozedUntil) > now) return false;
    return new Date(t.nextActionDate) <= now;
  });
}

/** Returns threads that are currently snoozed */
export async function getSnoozedThreads(): Promise<TrackedThread[]> {
  const threads = await getAllThreads();
  const now = new Date();

  return Object.values(threads).filter(
    (t) => t.status === 'active' && t.snoozedUntil && new Date(t.snoozedUntil) > now,
  );
}

// ─── License & Entitlements Storage ──────────────────────────────────────────

export async function getLicenseKey(): Promise<string> {
  const settings = await getSettings();
  return settings.licenseKey || '';
}

export async function setLicenseKey(key: string): Promise<void> {
  const settings = await getSettings();
  settings.licenseKey = key;
  await saveSettings(settings);
}

import { validateLicenseAPI } from './api';

export async function validateLicense(key: string): Promise<{ valid: boolean; plan: string }> {
  try {
    const result = await validateLicenseAPI(key.trim());
    const settings = await getSettings();
    settings.licenseKey = key.trim();
    settings.licenseValid = result.valid;
    settings.licensePlan = result.plan as 'free' | 'pro';
    await saveSettings(settings);
    return result;
  } catch (err) {
    const settings = await getSettings();
    settings.licenseKey = key.trim();
    settings.licenseValid = false;
    settings.licensePlan = 'free';
    await saveSettings(settings);
    throw err;
  }
}

export async function getAIDraftsUsed(): Promise<number> {
  const result = await new Promise<any>((resolve) => {
    chrome.storage.sync.get('aiDraftsUsed', (res) => resolve(res));
  });
  return result?.aiDraftsUsed ?? 0;
}

export async function incrementAIDraftsUsed(): Promise<number> {
  const current = await getAIDraftsUsed();
  const updated = current + 1;
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ aiDraftsUsed: updated }, () => resolve());
  });
  return updated;
}

export async function getOnboardingDismissed(): Promise<boolean> {
  const result = await new Promise<any>((resolve) => {
    chrome.storage.sync.get('onboardingDismissed', (res) => resolve(res));
  });
  return !!result?.onboardingDismissed;
}

export async function setOnboardingDismissed(dismissed: boolean): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ onboardingDismissed: dismissed }, () => resolve());
  });
}
