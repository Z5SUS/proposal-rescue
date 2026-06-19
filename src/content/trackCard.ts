/**
 * Track Card — injected into Gmail thread views.
 *
 * Pure vanilla DOM (no React) to keep the content script bundle tiny.
 * The card is styled via content.css which Chrome injects separately.
 *
 * States:
 *   untracked  → shows "Track this conversation?" prompt
 *   tracked    → shows "Tracked ✓" badge
 *   dismissed  → card is removed from DOM
 */

import { TRACK_CARD_ID } from '@/constants';
import {
  getThread,
  saveThread,
  getSettings,
  getOnboardingDismissed,
  setOnboardingDismissed,
} from '@/utils/storage';
import { isoInDays } from '@/utils/dates';
import type { TrackedThread } from '@/types';
import { canTrackMore } from '@/utils/entitlements';
import {
  extractThreadId,
  extractSubject,
  extractParticipant,
} from '@/utils/gmail';

// ─── Public API ───────────────────────────────────────────────────────────────

export interface TrackCardOptions {
  threadId: string;
  subject: string;
  participantName: string;
  participantEmail: string;
}

/**
 * Injects the track card into the Gmail thread view.
 * Safe to call multiple times — checks for existing card first.
 */
export async function injectTrackCard(opts: TrackCardOptions): Promise<void> {
  // Avoid duplicate injection
  if (document.getElementById(TRACK_CARD_ID)) return;

  // 1. First-run onboarding experience
  const onboardingDismissed = await getOnboardingDismissed();
  if (!onboardingDismissed) {
    const card = buildOnboardingCard(opts);
    document.body.appendChild(card);
    return;
  }

  // 2. Regular tracking status check
  const existing = await getThread(opts.threadId);
  const card = existing ? buildTrackedBadge(existing) : buildTrackPrompt(opts);

  document.body.appendChild(card);
}

/**
 * Removes the track card from the DOM (called on navigation away).
 */
export function removeTrackCard(): void {
  document.getElementById(TRACK_CARD_ID)?.remove();
}

/**
 * Tracks the currently open Gmail thread. Called via message from the dashboard.
 */
export async function trackCurrentThread(): Promise<{ success: boolean; error?: string }> {
  const threadId = extractThreadId();
  if (!threadId) {
    return { success: false, error: 'NO_THREAD_OPEN' };
  }

  // Bypasses onboarding since the user explicitly clicked Track from the dashboard
  const onboardingDismissed = await getOnboardingDismissed();
  if (!onboardingDismissed) {
    await setOnboardingDismissed(true);
  }

  // Get current metadata
  const subject = extractSubject();
  const participant = extractParticipant();

  // Try to find the existing card in DOM, or inject it
  let card = document.getElementById(TRACK_CARD_ID);
  if (!card) {
    await injectTrackCard({
      threadId,
      subject,
      participantName: participant.name,
      participantEmail: participant.email,
    });
    card = document.getElementById(TRACK_CARD_ID);
  }

  if (!card) {
    return { success: false, error: 'Could not create tracking card.' };
  }

  // Check tracking limits before saving
  const allowed = await canTrackMore();
  if (!allowed) {
    renderUpgradeNotice(card);
    return { success: false, error: 'LIMIT_REACHED' };
  }

  // If already tracked as active, ensure card shows badge and return success
  const existing = await getThread(threadId);
  if (existing && existing.status === 'active') {
    renderTrackedBadge(card, existing);
    return { success: true };
  }

  const settings = await getSettings();
  const now = new Date().toISOString();

  const thread: TrackedThread = {
    threadId,
    subject,
    participantName: participant.name,
    participantEmail: participant.email,
    status: 'active',
    followUpCount: 0,
    lastUserEmailDate: now,
    nextActionDate: isoInDays(settings.followUpIntervalDays),
    snoozedUntil: null,
    createdAt: now,
  };

  await saveThread(thread);
  renderTrackedBadge(card, thread);

  console.log('[ProposalRescue] ✅ Thread saved via remote command:', thread);
  return { success: true };
}

// ─── Card Builders ────────────────────────────────────────────────────────────

/** Builds the first-run onboarding prompt card */
function buildOnboardingCard(opts: TrackCardOptions): HTMLElement {
  const card = createCardShell();

  card.innerHTML = `
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <p class="pr-prompt" style="font-weight: 600; margin-bottom: 4px; display: block;">Welcome to Proposal Rescue!</p>
    <p style="font-size: 11px; color: #4b5563; margin-bottom: 12px; line-height: 1.4; display: block;">
      Track conversations to get follow-up reminders. If a client doesn't reply within your set interval, we'll alert you.
    </p>
    <div class="pr-actions">
      <button class="pr-btn pr-btn-primary" id="pr-btn-onboarding-ok">Got It</button>
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `;

  const dismiss = async (): Promise<void> => {
    await setOnboardingDismissed(true);
    card.remove();
    // Re-inject now that onboarding is completed
    await injectTrackCard(opts);
  };

  card.querySelector('#pr-btn-onboarding-ok')?.addEventListener('click', dismiss);
  card.querySelector('#pr-btn-close')?.addEventListener('click', dismiss);

  return card;
}

/** Builds the "Track this conversation?" prompt card */
function buildTrackPrompt(opts: TrackCardOptions): HTMLElement {
  const card = createCardShell();

  card.innerHTML = `
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <p class="pr-prompt">Track this conversation?</p>
    <div class="pr-actions">
      <button class="pr-btn pr-btn-primary" id="pr-btn-track">Track</button>
      <button class="pr-btn pr-btn-ghost" id="pr-btn-dismiss">Not Now</button>
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `;

  // Wire up Track button
  card.querySelector('#pr-btn-track')?.addEventListener('click', async () => {
    await handleTrack(card, opts);
  });

  // Wire up Not Now / close buttons
  const dismiss = (): void => card.remove();
  card.querySelector('#pr-btn-dismiss')?.addEventListener('click', dismiss);
  card.querySelector('#pr-btn-close')?.addEventListener('click', dismiss);

  return card;
}

/** Builds the "Tracked ✓" badge shown when thread is already tracked */
function buildTrackedBadge(thread: TrackedThread): HTMLElement {
  const card = createCardShell();
  renderTrackedBadge(card, thread);
  return card;
}

function renderTrackedBadge(card: HTMLElement, thread: TrackedThread): void {
  const isActive = thread.status === 'active';

  let statusLabel = '';
  let badgeColor = '';
  if (thread.status === 'won') {
    statusLabel = '🏆 Won';
    badgeColor = '#15803d';
  } else if (thread.status === 'lost') {
    statusLabel = '❌ Lost';
    badgeColor = '#b91c1c';
  } else if (thread.status === 'stopped') {
    statusLabel = '⏹ Stopped';
    badgeColor = '#4b5563';
  } else {
    statusLabel = '✓ Tracking';
    badgeColor = '#15803d';
  }

  card.innerHTML = `
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <div class="pr-content-body" style="margin-bottom: 10px;">
      <span class="pr-tracked-badge" style="color: ${badgeColor}; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
        ${statusLabel}
      </span>
      <span style="color: #4b5563; font-size: 12px; display: block; margin-top: 4px;">
        ${isActive ? 'Active follow-up reminders' : 'Reminders are disabled for this thread'}
      </span>
    </div>
    <div class="pr-actions" style="display: flex; gap: 8px; align-items: center;">
      ${
        isActive
          ? `<button class="pr-btn pr-btn-ghost" id="pr-btn-stop" style="font-size: 11px; padding: 4px 10px;">Stop Tracking</button>`
          : ``
      }
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `;

  // Wire up close button
  card.querySelector('#pr-btn-close')?.addEventListener('click', () => card.remove());

  // Wire up actions
  if (isActive) {
    card.querySelector('#pr-btn-stop')?.addEventListener('click', async () => {
      try {
        const updated = { ...thread, status: 'stopped' as const, snoozedUntil: null };
        await saveThread(updated);
        renderTrackedBadge(card, updated);
        console.log('[ProposalRescue] Stopped tracking via content card:', updated);
      } catch (err) {
        console.error('[ProposalRescue] Failed to stop tracking:', err);
      }
    });
  }
}

/** Render the plan limit warning with an Upgrade button */
function renderUpgradeNotice(card: HTMLElement): void {
  card.innerHTML = `
    <div class="pr-header">
      <div class="pr-logo"><div class="pr-logo-dot"></div></div>
      <span class="pr-name">Proposal Rescue</span>
    </div>
    <p class="pr-prompt" style="color: #dc2626; font-weight: 600; margin-bottom: 4px; display: block;">Limit Reached</p>
    <p style="font-size: 11px; color: #4b5563; margin-bottom: 12px; line-height: 1.4; display: block;">
      You have reached the Free Plan limit.
    </p>
    <div class="pr-actions">
      <button class="pr-btn pr-btn-primary" id="pr-btn-upgrade">View Plans</button>
      <button class="pr-btn pr-btn-ghost" id="pr-btn-close-upgrade">Dismiss</button>
    </div>
    <button class="pr-close" id="pr-btn-close" title="Close">✕</button>
  `;

  const closeNotice = (): void => card.remove();
  card.querySelector('#pr-btn-close-upgrade')?.addEventListener('click', closeNotice);
  card.querySelector('#pr-btn-close')?.addEventListener('click', closeNotice);

  card.querySelector('#pr-btn-upgrade')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }).catch(() => {});
    card.remove();
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────────

async function handleTrack(card: HTMLElement, opts: TrackCardOptions): Promise<void> {
  try {
    // Check tracking limits before saving
    const allowed = await canTrackMore();
    if (!allowed) {
      renderUpgradeNotice(card);
      return;
    }

    const settings = await getSettings();
    const now = new Date().toISOString();

    const thread: TrackedThread = {
      threadId: opts.threadId,
      subject: opts.subject,
      participantName: opts.participantName,
      participantEmail: opts.participantEmail,
      status: 'active',
      followUpCount: 0,
      lastUserEmailDate: now,
      nextActionDate: isoInDays(settings.followUpIntervalDays),
      snoozedUntil: null,
      createdAt: now,
    };

    await saveThread(thread);
    renderTrackedBadge(card, thread);

    console.log('[ProposalRescue] ✅ Thread saved:', thread);
  } catch (err) {
    console.error('[ProposalRescue] Failed to save thread:', err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createCardShell(): HTMLElement {
  const card = document.createElement('div');
  card.id = TRACK_CARD_ID;
  return card;
}
