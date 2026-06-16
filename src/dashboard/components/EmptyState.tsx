import React from 'react';

interface EmptyStateProps {
  section: 'action' | 'snoozed';
}

export function EmptyState({ section }: EmptyStateProps): React.JSX.Element {
  if (section === 'action') {
    return (
      <div className="pr-flex pr-flex-col pr-items-center pr-justify-center pr-py-10 pr-px-6 pr-text-center">
        <div className="pr-w-12 pr-h-12 pr-rounded-full pr-bg-surface-100 pr-flex pr-items-center pr-justify-center pr-mb-3">
          <svg className="pr-w-6 pr-h-6 pr-text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="pr-text-sm pr-font-medium pr-text-ink-700 pr-mb-1">All caught up</p>
        <p className="pr-text-xs pr-text-ink-400 pr-leading-relaxed">
          No proposals need follow-up right now.
          <br />
          Open a Gmail thread and click <strong>Track</strong> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="pr-py-6 pr-px-4 pr-text-center">
      <p className="pr-text-xs pr-text-ink-400">No snoozed conversations.</p>
    </div>
  );
}
