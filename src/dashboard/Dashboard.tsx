import React, { useState, useEffect } from 'react';
import type { TrackedThread } from '@/types';
import { useThreads } from '@/hooks/useThreads';
import { Header } from '@/dashboard/components/Header';
import { ThreadCard } from '@/dashboard/components/ThreadCard';
import { SnoozedCard } from '@/dashboard/components/SnoozedCard';
import { ArchivedCard } from '@/dashboard/components/ArchivedCard';
import { EmptyState } from '@/dashboard/components/EmptyState';
import { FollowUpPanel } from '@/dashboard/components/FollowUpPanel';
import { useSettings } from '@/hooks/useSettings';
import { UpgradeModal } from '@/dashboard/components/UpgradeModal';
import { getSettings, saveSettings } from '@/utils/storage';

/** Builds the Gmail URL for a given thread ID */
function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`;
}

export function Dashboard(): React.JSX.Element {
  const {
    active,
    overdueCount,
    snoozed,
    archived,
    loading,
    markWon,
    markLost,
    stopTracking,
    snooze,
    resumeNow,
    retrack,
    deleteHistory,
  } = useThreads();

  const [followUpThread, setFollowUpThread] = useState<TrackedThread | null>(null);
  const [snoozedOpen, setSnoozedOpen] = useState(true);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const settings = useSettings();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isUpgraded = settings.licenseValid && settings.licensePlan !== 'free';
  const showUpgradeButton = !settings.licenseValid || settings.licensePlan === 'free';

  // Auto-downgrade expired licenses on component mount/load
  useEffect(() => {
    if (settings.licenseValid && settings.licenseExpiresAt && settings.licensePlan !== 'owner') {
      const expiryTime = new Date(settings.licenseExpiresAt).getTime();
      const now = Date.now();
      if (now > expiryTime) {
        void getSettings().then((curr) => {
          void saveSettings({
            ...curr,
            licenseValid: false,
            licensePlan: 'free',
            licenseStatus: 'expired',
          });
        });
      }
    }
  }, [settings]);

  const getLicenseWarning = (): { text: string; severity: 'notice' | 'warning' | 'urgent' } | null => {
    if (!settings.licenseValid || !settings.licenseExpiresAt || settings.licensePlan === 'owner') {
      return null;
    }
    const expiryTime = new Date(settings.licenseExpiresAt).getTime();
    const now = Date.now();
    const msDiff = expiryTime - now;
    if (msDiff < 0) {
      return null;
    }

    const daysRemaining = msDiff / (1000 * 3600 * 24);

    if (daysRemaining <= 1) {
      return {
        text: `Urgent: Your license expires in ${Math.ceil(daysRemaining * 24)} hours. Renew now to avoid losing AI follow-up features.`,
        severity: 'urgent',
      };
    }
    if (daysRemaining <= 3) {
      return {
        text: `Warning: Your license expires in ${Math.ceil(daysRemaining)} days. Please renew to keep your follow-up pipeline active.`,
        severity: 'warning',
      };
    }
    if (daysRemaining <= 7) {
      return {
        text: `Notice: Your license will expire in ${Math.ceil(daysRemaining)} days. Consider renewing your subscription.`,
        severity: 'notice',
      };
    }
    return null;
  };

  const warning = getLicenseWarning();

  function viewThread(threadId: string): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id != null) {
        chrome.tabs.update(tab.id, { url: gmailThreadUrl(threadId) });
      }
    });
  }

  function openGmailToTrack(): void {
    // Query ALL tabs in the current window — not just the "active" one,
    // because from a side panel the active tab can be the panel itself.
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const gmailTab = tabs.find((t) => t.url?.includes('mail.google.com'));
      if (gmailTab?.id != null) {
        // A Gmail tab already exists — bring it to the front
        chrome.tabs.update(gmailTab.id, { active: true });
      } else {
        // No Gmail tab open — create one
        chrome.tabs.create({ url: 'https://mail.google.com' });
      }
    });
  }

  function trackProposal(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id != null && tab.url?.includes('mail.google.com')) {
        chrome.tabs.sendMessage(tab.id, { action: 'TRACK_CURRENT_THREAD' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('[ProposalRescue] Content script not ready on active Gmail tab:', chrome.runtime.lastError);
            openGmailToTrack();
            return;
          }

          if (response && response.success) {
            console.log('[ProposalRescue] Thread tracked successfully via dashboard');
          } else {
            const err = response?.error;
            if (err === 'NO_THREAD_OPEN') {
              alert('Please open an email thread in Gmail to track it.');
            } else if (err === 'LIMIT_REACHED') {
              // Handled by content script card update (renderUpgradeNotice)
            } else {
              alert(err || 'Failed to track thread.');
            }
          }
        });
      } else {
        openGmailToTrack();
      }
    });
  }

  if (loading) {
    return (
      <div className="pr-min-h-screen pr-bg-surface-50 pr-flex pr-flex-col">
        <Header actionCount={0} />
        <div className="pr-flex pr-flex-col pr-items-center pr-justify-center pr-flex-1 pr-gap-3">
          <div className="pr-w-6 pr-h-6 pr-rounded-full pr-border-2 pr-border-brand-200 pr-border-t-brand-600 pr-animate-spin" />
          <p className="pr-text-xs pr-text-ink-400">Loading threads…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-min-h-screen pr-bg-surface-50 pr-font-sans">
      <Header actionCount={overdueCount} />

      <div className="pr-px-3 pr-pt-4 pr-pb-8 pr-space-y-6">
        {/* Expiry Warning Banner */}
        {warning && (
          <div className={`pr-px-3 pr-py-2.5 pr-rounded-lg pr-text-xs pr-font-medium pr-border pr-mb-3 pr-flex pr-items-center pr-justify-between animate-fade-in ${
            warning.severity === 'urgent'
              ? 'pr-bg-red-50 pr-text-red-700 pr-border-red-200'
              : warning.severity === 'warning'
              ? 'pr-bg-amber-50 pr-text-amber-700 pr-border-amber-200'
              : 'pr-bg-blue-50 pr-text-blue-700 pr-border-blue-200'
          }`}>
            <span className="pr-flex-1 pr-leading-relaxed">{warning.text}</span>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className={`pr-px-2 pr-py-1 pr-rounded pr-text-[10px] pr-font-bold pr-uppercase pr-border-0 pr-cursor-pointer pr-shrink-0 pr-ml-2 ${
                warning.severity === 'urgent'
                  ? 'pr-bg-red-600 hover:pr-bg-red-700 pr-text-white'
                  : warning.severity === 'warning'
                  ? 'pr-bg-amber-500 hover:pr-bg-amber-600 pr-text-white'
                  : 'pr-bg-blue-600 hover:pr-bg-blue-700 pr-text-white'
              }`}
            >
              Renew
            </button>
          </div>
        )}

        {/* ── Tracked Threads & Empty Dashboard State ────────────────── */}
        {active.length === 0 && snoozed.length === 0 ? (
          <div className="pr-bg-white pr-border pr-border-surface-200 pr-rounded-xl pr-p-6 pr-text-center pr-shadow-card">
            <div className="pr-w-16 pr-h-16 pr-rounded-full pr-bg-brand-50 pr-flex pr-items-center pr-justify-center pr-mx-auto pr-mb-4 pr-border pr-border-brand-100">
              <span className="pr-text-3xl">🚀</span>
            </div>
            <h3 className="pr-text-sm pr-font-bold pr-text-ink-900 pr-mb-2">Track Your First Proposal</h3>
            <p className="pr-text-xs pr-text-ink-500 pr-leading-relaxed pr-max-w-xs pr-mx-auto pr-mb-5">
              Open any email thread in Gmail and click <strong>Track</strong> on the card that appears at the top of the thread.
            </p>
            <button
              onClick={trackProposal}
              className="pr-inline-flex pr-items-center pr-gap-1.5 pr-px-5 pr-py-2.5 pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-text-xs pr-font-semibold pr-rounded-lg pr-shadow-sm pr-transition-colors pr-cursor-pointer pr-border-0"
            >
              <svg className="pr-w-3.5 pr-h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Track a Proposal
            </button>
          </div>
        ) : (
          <>
            <section>
              <div className="pr-flex pr-items-center pr-justify-between pr-mb-2 pr-px-1">
                <div className="pr-flex pr-items-center pr-gap-2">
                  <h2 className="pr-text-xs pr-font-semibold pr-text-ink-500 pr-uppercase pr-tracking-wider">
                    Needs Action
                  </h2>
                  {overdueCount > 0 && (
                    <span className="pr-text-[10px] pr-font-bold pr-text-brand-600 pr-bg-brand-50 pr-border pr-border-brand-200 pr-rounded-full pr-px-1.5 pr-py-0.5">
                      {overdueCount} overdue
                    </span>
                  )}
                </div>
                {(showUpgradeButton || isUpgraded) && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className={`pr-flex pr-items-center pr-gap-1 pr-px-2.5 pr-py-1 pr-text-white pr-text-[10px] pr-font-bold pr-rounded-md pr-transition-colors pr-cursor-pointer pr-border-0 pr-uppercase pr-tracking-wider pr-shadow-sm ${
                      isUpgraded ? 'pr-bg-brand-600 hover:pr-bg-brand-700' : 'pr-bg-amber-500 hover:pr-bg-amber-600'
                    }`}
                  >
                    {isUpgraded ? 'Change Plan' : 'Upgrade'}
                  </button>
                )}
              </div>
              {active.length === 0 ? (
                <EmptyState section="action" />
              ) : (
                <div className="pr-space-y-2">
                  {active.map((thread) => {
                    const isOverdue = new Date(thread.nextActionDate).getTime() <= Date.now();
                    return (
                      <ThreadCard
                        key={thread.threadId}
                        thread={thread}
                        isOverdue={isOverdue}
                        onWon={() => void markWon(thread.threadId)}
                        onLost={() => void markLost(thread.threadId)}
                        onStop={() => void stopTracking(thread.threadId)}
                        onSnooze={(daysOrDate) => void snooze(thread.threadId, daysOrDate)}
                        onViewThread={() => viewThread(thread.threadId)}
                        onGenerateFollowUp={() => setFollowUpThread(thread)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Snoozed ───────────────────────────────────────────── */}
            {snoozed.length > 0 && (
              <section>
                <button
                  onClick={() => setSnoozedOpen((o) => !o)}
                  className="pr-flex pr-items-center pr-justify-between pr-w-full pr-mb-2 pr-px-1 pr-bg-transparent pr-border-0 pr-cursor-pointer pr-group"
                >
                  <h2 className="pr-text-xs pr-font-semibold pr-text-ink-500 pr-uppercase pr-tracking-wider">
                    Snoozed
                  </h2>
                  <div className="pr-flex pr-items-center pr-gap-1.5">
                    <span className="pr-text-[10px] pr-font-bold pr-text-ink-400 pr-bg-surface-200 pr-rounded-full pr-px-1.5 pr-py-0.5">
                      {snoozed.length}
                    </span>
                    <svg
                      className={`pr-w-3 pr-h-3 pr-text-ink-400 pr-transition-transform ${snoozedOpen ? '' : 'pr-rotate-180'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {snoozedOpen && (
                  <div className="pr-space-y-2">
                    {snoozed.map((thread) => (
                      <SnoozedCard
                        key={thread.threadId}
                        thread={thread}
                        onResume={() => void resumeNow(thread.threadId)}
                        onViewThread={() => viewThread(thread.threadId)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ── Archived / History ────────────────────────────────── */}
        {archived.length > 0 && (
          <section>
            <button
              onClick={() => setArchivedOpen((o) => !o)}
              className="pr-flex pr-items-center pr-justify-between pr-w-full pr-mb-2 pr-px-1 pr-bg-transparent pr-border-0 pr-cursor-pointer pr-group"
            >
              <h2 className="pr-text-xs pr-font-semibold pr-text-ink-500 pr-uppercase pr-tracking-wider">
                History
              </h2>
              <div className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-[10px] pr-font-bold pr-text-ink-400 pr-bg-surface-200 pr-rounded-full pr-px-1.5 pr-py-0.5">
                  {archived.length}
                </span>
                <svg
                  className={`pr-w-3 pr-h-3 pr-text-ink-400 pr-transition-transform ${archivedOpen ? '' : 'pr-rotate-180'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {archivedOpen && (
              <div className="pr-space-y-2">
                {archived.map((thread) => (
                  <ArchivedCard
                    key={thread.threadId}
                    thread={thread}
                    onRetrack={() => void retrack(thread.threadId)}
                    onViewThread={() => viewThread(thread.threadId)}
                    onDelete={() => void deleteHistory(thread.threadId)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="pr-text-center">
          <p className="pr-text-[10px] pr-text-ink-300">
            Tracking {active.length + snoozed.length} conversation
            {active.length + snoozed.length !== 1 ? 's' : ''}
          </p>
        </footer>
      </div>

      {/* ── Follow-up panel (modal overlay) ─────────────────────── */}
      {followUpThread && (
        <FollowUpPanel
          thread={followUpThread}
          onClose={() => setFollowUpThread(null)}
        />
      )}

      {/* ── Upgrade modal (modal overlay) ───────────────────────── */}
      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

    </div>
  );
}
