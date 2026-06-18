import { getSettings, getAllThreads } from './storage';
import { PLAN_LIMITS } from '@/constants';
import type { PlanId } from '@/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the effective PlanId for the current user.
 */
async function getEffectivePlan(): Promise<PlanId> {
  try {
    const settings = await getSettings();
    if (!settings.licenseValid) return 'free';
    const plan = settings.licensePlan;
    if (plan in PLAN_LIMITS) return plan as PlanId;
    return 'free';
  } catch {
    return 'free';
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function isFreeUser(): Promise<boolean> {
  const plan = await getEffectivePlan();
  return plan === 'free';
}

/** Returns true for pro, mega, and owner (any paid plan) */
export async function isProUser(): Promise<boolean> {
  const plan = await getEffectivePlan();
  return plan !== 'free';
}

export async function isOwner(): Promise<boolean> {
  const plan = await getEffectivePlan();
  return plan === 'owner';
}

export async function getPlanId(): Promise<PlanId> {
  return getEffectivePlan();
}

export async function canTrackMore(): Promise<boolean> {
  try {
    const plan = await getEffectivePlan();
    const limits = PLAN_LIMITS[plan];
    if (limits.trackedThreads === Infinity) return true;

    const threads = await getAllThreads();
    const activeCount = Object.values(threads).filter((t) => t.status === 'active').length;
    return activeCount < limits.trackedThreads;
  } catch {
    return false;
  }
}

export async function canUseAIDraft(): Promise<boolean> {
  try {
    const plan = await getEffectivePlan();
    const limits = PLAN_LIMITS[plan];
    return limits.aiDraftsEnabled;
  } catch {
    return false;
  }
}

export async function getRemainingFreeAIDrafts(): Promise<number> {
  try {
    const plan = await getEffectivePlan();
    const limits = PLAN_LIMITS[plan];
    return limits.aiDraftsEnabled ? Infinity : 0;
  } catch {
    return 0;
  }
}
