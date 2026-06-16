import React from 'react';

interface HeaderProps {
  actionCount: number;
}

export function Header({ actionCount }: HeaderProps): React.JSX.Element {
  function openSettings(): void {
    chrome.runtime.openOptionsPage();
  }

  return (
    <div className="pr-flex pr-items-center pr-justify-between pr-px-4 pr-py-3 pr-border-b pr-border-surface-200 pr-bg-white pr-sticky pr-top-0 pr-z-10">
      {/* Brand */}
      <div className="pr-flex pr-items-center pr-gap-2">
        <div className="pr-w-6 pr-h-6 pr-bg-brand-600 pr-rounded pr-flex pr-items-center pr-justify-center pr-flex-shrink-0">
          <div className="pr-w-2.5 pr-h-2.5 pr-bg-white pr-rounded-full" />
        </div>
        <span className="pr-text-sm pr-font-semibold pr-text-ink-900">
          Proposal Rescue
        </span>
        {actionCount > 0 && (
          <span className="pr-bg-brand-600 pr-text-white pr-text-[10px] pr-font-bold pr-rounded-full pr-w-4 pr-h-4 pr-flex pr-items-center pr-justify-center pr-leading-none">
            {actionCount > 9 ? '9+' : actionCount}
          </span>
        )}
      </div>

      {/* Settings */}
      <button
        onClick={openSettings}
        title="Settings"
        className="pr-w-7 pr-h-7 pr-rounded pr-flex pr-items-center pr-justify-center pr-text-ink-400 hover:pr-text-ink-700 hover:pr-bg-surface-100 pr-transition-colors pr-cursor-pointer pr-bg-transparent pr-border-0"
      >
        <svg className="pr-w-4 pr-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
}
