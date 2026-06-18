import React, { useState } from 'react';
import type { TrackedThread } from '@/types';
import { useThreads } from '@/hooks/useThreads';
import { Header } from '@/dashboard/components/Header';
import { ThreadCard } from '@/dashboard/components/ThreadCard';
import { SnoozedCard } from '@/dashboard/components/SnoozedCard';
import { ArchivedCard } from '@/dashboard/components/ArchivedCard';
import { EmptyState } from '@/dashboard/components/EmptyState';
import { FollowUpPanel } from '@/dashboard/components/FollowUpPanel';

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

  function viewThread(threadId: string): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id != null) {
        chrome.tabs.update(tab.id, { url: gmailThreadUrl(threadId) });
      }
    });
  }

  function openGmailToTrack(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url?.includes('mail.google.com')) {
        // Already on Gmail — just close the side panel so the user can
        // open a thread and see the track card
        chrome.tabs.update(tab.id!, { active: true });
      } else {
        // Open Gmail in the current tab
        chrome.tabs.create({ url: 'https://mail.google.com' });
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
              onClick={openGmailToTrack}
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
                <button
                  onClick={openGmailToTrack}
                  title="Track a new proposal"
                  className="pr-flex pr-items-center pr-gap-1 pr-px-2.5 pr-py-1 pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-text-[10px] pr-font-semibold pr-rounded-md pr-transition-colors pr-cursor-pointer pr-border-0"
                >
                  <svg className="pr-w-3 pr-h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
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

    </div>
  );
}
