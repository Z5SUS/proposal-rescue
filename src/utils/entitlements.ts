import { getSettings, getAllThreads, getAIDraftsUsed } from './storage';
import { PLAN_LIMITS } from '@/constants';
import type { PlanId } from '@/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the effective PlanId for the current user.
 * Handles backward-compat: stored 'pro' is treated as 'solo' at runtime.
 */
async function getEffectivePlan(): Promise<PlanId> {
  try {
    const settings = await getSettings();
    if (!settings.licenseValid) return 'free';
    const plan = settings.licensePlan as string;
    // Backward compatibility: old 'pro' → 'solo'
    if (plan === 'pro') return 'solo';
    if (plan in PLAN_LIMITS) return plan as PlanId;
    return 'free';
  } catch {
    return 'free';
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function isFreeUser(): Promise<boolean> {
  const plan = await getEffectivePlan();
  return !PLAN_LIMITS[plan].unlimited;
}

/** Returns true for solo, agency, lifetime, and owner (any paid plan) */
export async function isProUser(): Promise<boolean> {
  const plan = await getEffectivePlan();
  return PLAN_LIMITS[plan].unlimited;
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
    if (limits.maxThreads === Infinity) return true;

    const threads = await getAllThreads();
    const activeCount = Object.values(threads).filter((t) => t.status === 'active').length;
    return activeCount < limits.maxThreads;
  } catch {
    return false;
  }
}

export async function canUseAIDraft(): Promise<boolean> {
  try {
    const plan = await getEffectivePlan();
    const limits = PLAN_LIMITS[plan];
    if (limits.aiDrafts === Infinity) return true;

    const used = await getAIDraftsUsed();
    return used < limits.aiDrafts;
  } catch {
    return false;
  }
}

export async function getRemainingFreeAIDrafts(): Promise<number> {
  try {
    const plan = await getEffectivePlan();
    const limits = PLAN_LIMITS[plan];
    if (limits.aiDrafts === Infinity) return Infinity;

    const used = await getAIDraftsUsed();
    return Math.max(0, limits.aiDrafts - used);
  } catch {
    return 0;
  }
}
