/**
 * Background Service Worker
 *
 * Responsibilities:
 *   - Respond to message events from components
 *   - Update active action count badge notifications
 *   - Handle alarms and service worker startups
 */

import { updateBadge } from '@/utils/badge';

console.log('[ProposalRescue] Background service worker started');

// ─── Startup/Install ─────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  chrome.alarms.create('daily-check', {
    periodInMinutes: 60, // check every hour
  });
  console.log('[ProposalRescue] Extension installed, alarm created');
  await updateBadge();
});

// Update badge on service worker startup
void updateBadge();

// ─── Storage Changes Listener ────────────────────────────────────────────────

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && (changes.trackedThreads || changes.settings)) {
    console.log('[ProposalRescue] Storage change detected, updating badge');
    await updateBadge();
  }
});

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void,
  ) => {
    if (message.type === 'PING') {
      // Gmail loads trigger a PING message to wake/check connection
      void updateBadge();
      sendResponse({ success: true, data: 'pong' });
      return false;
    }

    if (message.type === 'GMAIL_LOADED') {
      void updateBadge();
      sendResponse({ success: true });
      return false;
    }

    if (message.type === 'OPEN_OPTIONS') {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return false;
    }

    return false;
  },
);

// ─── Alarm Handler ────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-check') {
    console.log('[ProposalRescue] Hourly check triggered');
    await updateBadge();
  }
});
