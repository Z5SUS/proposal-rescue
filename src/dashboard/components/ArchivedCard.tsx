import React from 'react';
import type { TrackedThread } from '@/types';

interface ArchivedCardProps {
  thread: TrackedThread;
  onRetrack: () => void;
  onDelete: () => void;
}

export function ArchivedCard({
  thread,
  onRetrack,
  onDelete,
}: ArchivedCardProps): React.JSX.Element {
  let statusText = '';
  let statusClass = '';

  if (thread.status === 'won') {
    statusText = '🏆 Won';
    statusClass = 'pr-text-success pr-bg-green-50 pr-border-green-200';
  } else if (thread.status === 'lost') {
    statusText = '❌ Lost';
    statusClass = 'pr-text-danger pr-bg-red-50 pr-border-red-200';
  } else {
    statusText = '⏹ Stopped';
    statusClass = 'pr-text-ink-500 pr-bg-surface-100 pr-border-surface-200';
  }

  return (
    <div className="pr-bg-white pr-border pr-border-surface-200 pr-rounded-lg pr-p-3 pr-shadow-card pr-flex pr-items-center pr-gap-3">
      {/* Info */}
      <div className="pr-flex-1 pr-min-w-0">
        <div className="pr-flex pr-items-center pr-gap-2">
          <p className="pr-text-sm pr-font-semibold pr-text-ink-700 pr-truncate">
            {thread.participantName || thread.participantEmail || 'Unknown'}
          </p>
          <span className={`pr-text-[9px] pr-font-medium pr-border pr-rounded pr-px-1 pr-py-0.5 ${statusClass}`}>
            {statusText}
          </span>
        </div>
        <p className="pr-text-xs pr-text-ink-400 pr-truncate pr-mt-0.5">
          {thread.subject}
        </p>
      </div>

      {/* Actions */}
      <div className="pr-flex pr-flex-col pr-gap-1.5 pr-flex-shrink-0">
        <button
          onClick={onRetrack}
          className="pr-text-xs pr-py-1 pr-px-2.5 pr-rounded pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-font-medium pr-transition-colors pr-cursor-pointer pr-border-0 pr-whitespace-nowrap"
        >
          Track Again
        </button>
        <button
          onClick={onDelete}
          title="Delete from history"
          className="pr-text-xs pr-py-1 pr-px-2.5 pr-rounded pr-border pr-border-red-100 pr-text-danger hover:pr-bg-red-50 pr-transition-colors pr-cursor-pointer pr-bg-white pr-font-medium pr-whitespace-nowrap"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
