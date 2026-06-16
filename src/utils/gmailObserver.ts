/**
 * GmailObserver
 *
 * Gmail is a Single Page Application. It doesn't trigger normal page-load
 * events when navigating between threads, labels, or views. This module
 * sets up a MutationObserver on the document body to detect navigation
 * changes and thread view transitions.
 *
 * Two signals are used together:
 *   1. URL hash changes (popstate / hashchange)
 *   2. DOM mutations in the main content area
 *
 * Using both prevents both false negatives (hash didn't change but DOM did)
 * and false positives (DOM mutation unrelated to navigation).
 */

import { GMAIL_SELECTORS } from '@/constants';
import { extractThreadId } from '@/utils/gmail';

export type NavigationCallback = (threadId: string | null) => void;

export class GmailObserver {
  private mutationObserver: MutationObserver | null = null;
  private currentThreadId: string | null = null;
  private callbacks: NavigationCallback[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Register a callback to be called whenever the active thread changes */
  onNavigation(cb: NavigationCallback): void {
    this.callbacks.push(cb);
  }

  /** Start observing Gmail for navigation events */
  start(): void {
    this.setupHashListener();
    this.setupMutationObserver();
    // Run once on startup in case we're already on a thread
    this.handlePotentialNavigation();
  }

  /** Stop all observers and clean up */
  stop(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    window.removeEventListener('hashchange', this.onHashChange);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private setupHashListener(): void {
    window.addEventListener('hashchange', this.onHashChange);
  }

  private onHashChange = (): void => {
    this.handlePotentialNavigation();
  };

  private setupMutationObserver(): void {
    // Prefer observing the main Gmail container — fewer false positives than body.
    // Fall back to body if the main container isn't mounted yet.
    const target = document.querySelector('[role="main"]') ?? document.body;

    this.mutationObserver = new MutationObserver(() => {
      this.debouncedNavigation();
    });

    this.mutationObserver.observe(target, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    // If we had to fall back to body, also watch for the main container
    // to appear so we can re-anchor the observer there.
    if (target === document.body) {
      const anchorObserver = new MutationObserver(() => {
        const main = document.querySelector('[role="main"]');
        if (main) {
          anchorObserver.disconnect();
          this.mutationObserver?.disconnect();
          this.mutationObserver = new MutationObserver(() => this.debouncedNavigation());
          this.mutationObserver.observe(main, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false,
          });
        }
      });
      anchorObserver.observe(document.body, { childList: true, subtree: false });
    }
  }

  /**
   * Debounce rapid DOM mutations (Gmail often fires dozens of mutations
   * within a single navigation event) and only call handlers once settled.
   */
  private debouncedNavigation(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.handlePotentialNavigation();
    }, 150);
  }

  private handlePotentialNavigation(): void {
    const newThreadId = extractThreadId();

    if (newThreadId === this.currentThreadId) return; // No change

    this.currentThreadId = newThreadId;
    this.notifyCallbacks(newThreadId);
  }

  private notifyCallbacks(threadId: string | null): void {
    for (const cb of this.callbacks) {
      try {
        cb(threadId);
      } catch (err) {
        console.error('[ProposalRescue] Navigation callback error:', err);
      }
    }
  }

  /** Waits until the thread view container is present in the DOM */
  waitForThreadView(): Promise<Element> {
    return new Promise((resolve) => {
      const existing = document.querySelector(GMAIL_SELECTORS.THREAD_VIEW);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(GMAIL_SELECTORS.THREAD_VIEW);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
}

// Singleton instance shared by the content script
export const gmailObserver = new GmailObserver();
