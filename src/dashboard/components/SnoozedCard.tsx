import React from 'react';
import type { TrackedThread } from '@/types';
import { formatDate } from '@/utils/dates';

interface SnoozedCardProps {
  thread: TrackedThread;
  onResume: () => void;
  onViewThread: () => void;
}

export function SnoozedCard({
  thread,
  onResume,
  onViewThread,
}: SnoozedCardProps): React.JSX.Element {
  return (
    <div className="pr-bg-white pr-border pr-border-surface-200 pr-rounded-lg pr-p-3 pr-shadow-card pr-flex pr-items-center pr-gap-3">

      {/* Info */}
      <div className="pr-flex-1 pr-min-w-0">
        <p className="pr-text-sm pr-font-semibold pr-text-ink-700 pr-truncate">
          {thread.participantName || thread.participantEmail || 'Unknown'}
        </p>
        <p className="pr-text-xs pr-text-ink-400 pr-truncate pr-mt-0.5">
          {thread.subject}
        </p>
        <p className="pr-text-xs pr-text-ink-400 pr-mt-1">
          Resumes{' '}
          <span className="pr-font-medium pr-text-ink-600">
            {thread.snoozedUntil ? formatDate(thread.snoozedUntil) : '—'}
          </span>
        </p>
      </div>

      {/* Actions */}
      <div className="pr-flex pr-flex-col pr-gap-1.5 pr-flex-shrink-0">
        <button
          onClick={onResume}
          className="pr-text-xs pr-py-1.5 pr-px-3 pr-rounded pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-font-medium pr-transition-colors pr-cursor-pointer pr-border-0 pr-whitespace-nowrap"
        >
          Resume Now
        </button>
        <button
          onClick={onViewThread}
          className="pr-text-xs pr-py-1.5 pr-px-3 pr-rounded pr-border pr-border-surface-200 pr-text-ink-600 hover:pr-bg-surface-50 pr-transition-colors pr-cursor-pointer pr-bg-white pr-font-medium pr-whitespace-nowrap"
        >
          View Thread
        </button>
      </div>
    </div>
  );
}
