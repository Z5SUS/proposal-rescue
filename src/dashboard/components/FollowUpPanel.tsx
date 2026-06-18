import React, { useState, useEffect } from 'react';
import type { TrackedThread } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { canUseAIDraft, getRemainingFreeAIDrafts, isProUser } from '@/utils/entitlements';
import { incrementAIDraftsUsed } from '@/utils/storage';
import { generateFollowUpAPI } from '@/utils/api';
import { UpgradeModal } from './UpgradeModal';

interface FollowUpPanelProps {
  thread: TrackedThread;
  onClose: () => void;
}

export function FollowUpPanel({ thread, onClose }: FollowUpPanelProps): React.JSX.Element {
  const settings = useSettings();
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInserted, setIsInserted] = useState(false);
  const [canUseAI, setCanUseAI] = useState<boolean | null>(null);
  const [remainingFreeAIDrafts, setRemainingFreeAIDrafts] = useState<number>(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check limits and auto-generate on mount
  useEffect(() => {
    async function checkLimitsAndGenerate(): Promise<void> {
      if (!thread) return;
      const allowed = await canUseAIDraft();
      const remaining = await getRemainingFreeAIDrafts();
      setCanUseAI(allowed);
      setRemainingFreeAIDrafts(remaining);
      if (allowed) {
        void handleGenerate();
      }
    }
    void checkLimitsAndGenerate();
  }, [thread, settings]);

  async function handleGenerate(): Promise<void> {
    setLoading(true);
    setError(null);
    setIsInserted(false);
    setIsCopied(false);
    try {
      const allowed = await canUseAIDraft();
      if (!allowed) {
        setCanUseAI(false);
        setLoading(false);
        return;
      }

      const result = await generateFollowUpAPI({
        licenseKey: settings.licenseKey || '',
        threadContext: {
          subject: thread.subject,
          participantName: thread.participantName || '',
          followUpCount: thread.followUpCount || 0,
          lastUserEmailDate: thread.lastUserEmailDate,
        },
        tone: settings.aiTone,
      });
      setDraft(result);

      // Increment drafts used only for free tier
      const paid = await isProUser();
      if (!paid) {
        await incrementAIDraftsUsed();
        const remaining = await getRemainingFreeAIDrafts();
        setRemainingFreeAIDrafts(remaining);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }


  async function handleCopyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(draft);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy text to clipboard.');
    }
  }

  function handleInsertCompose(): void {
    setError(null);
    setIsInserted(false);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        setError('No active Gmail tab detected.');
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { action: 'INSERT_DRAFT', text: draft },
        (response) => {
          if (chrome.runtime.lastError) {
            setError(
              'Could not communicate with Gmail page. Please make sure Gmail is open and refresh the page.'
            );
            return;
          }
          if (response?.success) {
            setIsInserted(true);
            setTimeout(() => setIsInserted(false), 3000);
          } else {
            setError(response?.error || 'Failed to inject draft. Is a compose or reply box open?');
          }
        }
      );
    });
  }

  return (
    <div
      className="pr-fixed pr-inset-0 pr-bg-black/40 pr-z-50 pr-flex pr-items-end pr-justify-center pr-backdrop-blur-[1px] animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pr-bg-white pr-rounded-t-xl pr-w-full pr-max-w-lg pr-p-5 pr-shadow-panel pr-max-h-[85vh] pr-flex pr-flex-col pr-relative">
        {/* Header */}
        <div className="pr-flex pr-items-center pr-justify-between pr-mb-3 pr-pb-2 pr-border-b pr-border-surface-100">
          <div>
            <h2 className="pr-text-sm pr-font-semibold pr-text-ink-900">
              {thread.followUpCount === 0 ? 'First Follow-Up' : 'Second Follow-Up'}
            </h2>
            <p className="pr-text-[11px] pr-text-ink-400 pr-mt-0.5 pr-truncate pr-max-w-[320px]">
              For: <span className="pr-font-medium pr-text-ink-700">{thread.participantName || thread.participantEmail}</span> · {thread.subject}
            </p>
          </div>
          <button
            onClick={onClose}
            className="pr-text-ink-400 hover:pr-text-ink-600 pr-bg-transparent pr-border-0 pr-cursor-pointer pr-text-lg pr-leading-none pr-p-1"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="pr-flex-1 pr-overflow-y-auto pr-py-2 pr-space-y-3">
          {/* Entitlement Gating Message */}
          {canUseAI === false && (
            <div className="pr-flex pr-flex-col pr-items-center pr-justify-center pr-py-8 pr-px-4 pr-text-center pr-bg-surface-50 pr-rounded-lg pr-border pr-border-surface-200">
              <span className="pr-text-2xl pr-mb-2">✨</span>
              <p className="pr-text-xs pr-text-ink-700 pr-font-medium pr-mb-1 pr-leading-relaxed">
                AI Follow-Ups are a premium feature.
              </p>
              <p className="pr-text-[11px] pr-text-ink-500 pr-mb-4 pr-leading-relaxed">
                Upgrade to generate personalized follow-up emails instantly.
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="pr-px-4 pr-py-2 pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-text-xs pr-font-semibold pr-rounded-lg pr-shadow-sm pr-transition-colors pr-cursor-pointer pr-border-0"
              >
                View Plans
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="pr-flex pr-flex-col pr-items-center pr-justify-center pr-py-12 pr-space-y-3 pr-bg-surface-50 pr-rounded-lg">
              <div className="pr-w-6 pr-h-6 pr-rounded-full pr-border-2 pr-border-brand-200 pr-border-t-brand-600 pr-animate-spin" />
              <p className="pr-text-xs pr-text-ink-400">Writing follow-up draft (tone: {settings.aiTone})…</p>
            </div>
          )}

          {/* Error messages */}
          {error && (
            <div className="pr-bg-red-50 pr-border pr-border-red-200 pr-rounded-lg pr-p-3 pr-text-xs pr-text-danger pr-leading-relaxed">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Draft text area */}
          {!loading && draft && canUseAI !== false && (
            <div className="pr-space-y-1.5">
              <div className="pr-flex pr-items-center pr-justify-between pr-px-1">
                <span className="pr-text-[10px] pr-font-bold pr-text-ink-400 pr-uppercase pr-tracking-wider">
                  AI Draft (Editable){remainingFreeAIDrafts > 0 && remainingFreeAIDrafts !== Infinity ? ` (${remainingFreeAIDrafts} free remaining)` : ''}
                </span>
                <span className="pr-text-[10px] pr-text-brand-600 pr-capitalize pr-bg-brand-50 pr-px-1.5 pr-py-0.5 pr-rounded pr-border pr-border-brand-100">
                  {settings.aiTone} Tone
                </span>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                className="pr-w-full pr-p-3 pr-text-xs pr-text-ink-800 pr-bg-surface-50 pr-border pr-border-surface-200 pr-rounded-lg pr-resize-none focus:pr-outline-none focus:pr-border-brand-500 pr-font-sans pr-leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Action Panel Footer */}
        {!loading && draft && canUseAI !== false && (
          <div className="pr-pt-3 pr-border-t pr-border-surface-100 pr-flex pr-flex-col pr-gap-2">
            {/* Confirmation indicator */}
            {isInserted && (
              <p className="pr-text-[11px] pr-text-success pr-font-medium pr-text-center animate-fade-in">
                ✓ Draft successfully injected into Gmail compose window!
              </p>
            )}
            {isCopied && (
              <p className="pr-text-[11px] pr-text-success pr-font-medium pr-text-center animate-fade-in">
                ✓ Copied to clipboard!
              </p>
            )}

            <div className="pr-flex pr-gap-2">
              <button
                disabled={!draft}
                onClick={handleInsertCompose}
                className="pr-flex-1 pr-py-2 pr-px-3 pr-bg-brand-600 hover:pr-bg-brand-700 disabled:pr-bg-surface-200 disabled:pr-text-ink-400 disabled:pr-cursor-not-allowed pr-text-white pr-text-xs pr-font-semibold pr-rounded pr-transition-colors pr-cursor-pointer pr-border-0 pr-shadow-sm pr-flex pr-items-center pr-justify-center pr-gap-1.5"
              >
                📥 Insert Into Gmail Compose
              </button>
              <button
                disabled={!draft}
                onClick={handleCopyToClipboard}
                className="pr-py-2 pr-px-3 pr-border pr-border-surface-200 pr-text-ink-700 hover:pr-bg-surface-50 disabled:pr-text-ink-300 disabled:pr-border-surface-100 disabled:pr-cursor-not-allowed pr-text-xs pr-font-semibold pr-rounded pr-transition-colors pr-cursor-pointer pr-bg-white"
              >
                Copy
              </button>
              <button
                onClick={handleGenerate}
                title="Regenerate draft"
                className="pr-py-2 pr-px-3 pr-border pr-border-surface-200 pr-text-ink-700 hover:pr-bg-surface-50 pr-text-xs pr-font-semibold pr-rounded pr-transition-colors pr-cursor-pointer pr-bg-white"
              >
                🔄
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}

