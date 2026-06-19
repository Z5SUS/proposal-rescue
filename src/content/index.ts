/**
 * Content Script — runs inside https://mail.google.com/*
 *
 * Responsibilities:
 *   - Boot the GmailObserver
 *   - Detect thread navigation
 *   - Extract thread metadata (subject, participant)
 *   - Inject / remove the Track Card
 */

import { gmailObserver } from '@/utils/gmailObserver';
import {
  extractThreadId,
  extractSubject,
  extractParticipant,
} from '@/utils/gmail';
import { injectTrackCard, removeTrackCard, trackCurrentThread } from '@/content/trackCard';
import { isContextValid } from '@/utils/storage';

console.log('[ProposalRescue] Content script loaded');

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function init(): void {
  if (!isContextValid()) return;
  chrome.runtime.sendMessage({ type: 'GMAIL_LOADED' }).catch(() => {});
  gmailObserver.onNavigation(handleNavigation);
  gmailObserver.start();

  // Listen for message from dashboard to insert draft or track thread
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'INSERT_DRAFT') {
      const result = insertTextIntoGmailCompose(message.text);
      sendResponse(result);
    } else if (message.action === 'TRACK_CURRENT_THREAD') {
      trackCurrentThread()
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err?.message || 'Failed to track thread' }));
      return true;
    }
    return true; // Keep communication channel open for response
  });
}

// ─── Draft Injection Helper ──────────────────────────────────────────────────

function insertTextIntoGmailCompose(text: string): { success: boolean; error?: string } {
  const selectors = [
    '[role="textbox"][aria-label*="Message Body"]',
    'div[contenteditable="true"]'
  ];

  let textbox: HTMLElement | null = null;

  // 1. Try focused element first if it's editable
  const activeEl = document.activeElement as HTMLElement;
  if (activeEl && activeEl.getAttribute('contenteditable') === 'true') {
    textbox = activeEl;
  }

  // 2. Query selectors and pick the most recent compose window textbox
  if (!textbox) {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        textbox = elements[elements.length - 1] as HTMLElement;
        break;
      }
    }
  }

  if (!textbox) {
    return {
      success: false,
      error: 'Could not find an open compose or reply box. Please click Reply or open Compose in Gmail first.'
    };
  }

  try {
    textbox.focus();
    
    // execCommand inserts text at current cursor location, preserving undo history
    const success = document.execCommand('insertText', false, text);
    if (!success) {
      textbox.innerText = text;
    }

    // Trigger input event so Gmail React forms detect the text change
    const event = new Event('input', { bubbles: true });
    textbox.dispatchEvent(event);

    showToast('Follow-up draft inserted!');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to insert text.' };
  }
}

function showToast(message: string): void {
  let toast = document.getElementById('pr-toast');
  if (toast) toast.remove();

  toast = document.createElement('div');
  toast.id = 'pr-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    z-index: 1000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    font-family: Roboto, Arial, sans-serif;
    animation: pr-slide-up 0.15s ease-out both;
  `;
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast?.remove();
  }, 2000);
}

// ─── Navigation Handler ───────────────────────────────────────────────────────

function handleNavigation(threadId: string | null): void {
  if (!isContextValid()) {
    gmailObserver.stop();
    return;
  }
  removeTrackCard();

  const hash = window.location.hash;
  console.log('[ProposalRescue] Navigation | hash:', hash, '| threadId:', threadId);

  if (!threadId) return;

  // Wait for Gmail to finish rendering the thread DOM
  setTimeout(() => {
    onThreadView(threadId);
  }, 600);
}

function onThreadView(threadId: string): void {
  // Re-extract threadId in case navigation happened during the timeout
  const currentId = extractThreadId();
  if (currentId !== threadId) return; // User navigated away

  const subject = extractSubject();
  const participant = extractParticipant();

  console.log('[ProposalRescue] ✅ Thread detected:', {
    threadId,
    subject,
    participant,
  });

  injectTrackCard({
    threadId,
    subject,
    participantName: participant.name,
    participantEmail: participant.email,
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
