import { getSettings, getAllThreads, getAIDraftsUsed } from './storage';

export async function isFreeUser(): Promise<boolean> {
  try {
    const settings = await getSettings();
    return !settings.licenseValid || settings.licensePlan === 'free';
  } catch (err) {
    return true;
  }
}

export async function isProUser(): Promise<boolean> {
  try {
    const settings = await getSettings();
    return !!(settings.licenseValid && settings.licensePlan === 'pro');
  } catch (err) {
    return false;
  }
}

export async function isOwner(): Promise<boolean> {
  try {
    const settings = await getSettings();
    return !!(settings.licenseValid && settings.licensePlan === 'owner');
  } catch (err) {
    return false;
  }
}

export async function canTrackMore(): Promise<boolean> {
  try {
    const settings = await getSettings();
    // Pro and Owner have unlimited tracking
    if (settings.licenseValid && (settings.licensePlan === 'pro' || settings.licensePlan === 'owner')) {
      return true;
    }

    const threads = await getAllThreads();
    const activeCount = Object.values(threads).filter((t) => t.status === 'active').length;
    return activeCount < 5;
  } catch (err) {
    return false;
  }
}

export async function canUseAIDraft(): Promise<boolean> {
  try {
    const settings = await getSettings();
    // Pro and Owner have unlimited drafts
    if (settings.licenseValid && (settings.licensePlan === 'pro' || settings.licensePlan === 'owner')) {
      return true;
    }

    const used = await getAIDraftsUsed();
    return used < 1;
  } catch (err) {
    return false;
  }
}

export async function getRemainingFreeAIDrafts(): Promise<number> {
  try {
    const settings = await getSettings();
    if (settings.licenseValid && (settings.licensePlan === 'pro' || settings.licensePlan === 'owner')) {
      return Infinity;
    }

    const used = await getAIDraftsUsed();
    return Math.max(0, 1 - used);
  } catch (err) {
    return 0;
  }
}
