import { getActionableThreads } from './storage';

export async function updateBadge(): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.action) {
      return;
    }
    const actionable = await getActionableThreads();
    const count = actionable.length;

    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red badge
    } else {
      await chrome.action.setBadgeText({ text: '' }); // No badge
    }
  } catch (err) {
    console.error('[ProposalRescue] Failed to update badge:', err);
  }
}
