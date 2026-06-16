import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/global.css';

function Popup(): React.JSX.Element {
  function openDashboard(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url?.includes('mail.google.com')) {
        // Open the side panel on the current Gmail tab
        chrome.sidePanel.open({ tabId: tab.id! });
        window.close();
      } else {
        // Open Gmail if the user isn't there yet
        chrome.tabs.create({ url: 'https://mail.google.com' });
        window.close();
      }
    });
  }

  function openSettings(): void {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  return (
    <div className="pr-w-[260px] pr-p-4 pr-font-sans">
      {/* Header */}
      <div className="pr-flex pr-items-center pr-gap-2 pr-mb-3">
        <div className="pr-w-6 pr-h-6 pr-bg-brand-600 pr-rounded pr-flex pr-items-center pr-justify-center pr-flex-shrink-0">
          <div className="pr-w-2.5 pr-h-2.5 pr-bg-white pr-rounded-full" />
        </div>
        <span className="pr-text-sm pr-font-semibold pr-text-ink-900">
          Proposal Rescue
        </span>
      </div>

      <p className="pr-text-xs pr-text-ink-500 pr-mb-4 pr-leading-relaxed">
        Never lose a client because you forgot to follow up.
      </p>

      {/* Actions */}
      <div className="pr-flex pr-flex-col pr-gap-2">
        <button
          onClick={openDashboard}
          className="pr-w-full pr-px-3 pr-py-2 pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-text-sm pr-font-medium pr-rounded pr-transition-colors"
        >
          Open Dashboard
        </button>
        <button
          onClick={openSettings}
          className="pr-w-full pr-px-3 pr-py-2 pr-bg-surface-100 hover:pr-bg-surface-200 pr-text-ink-700 pr-text-sm pr-font-medium pr-rounded pr-transition-colors"
        >
          Settings
        </button>
      </div>

      {/* Footer */}
      <p className="pr-text-[10px] pr-text-ink-300 pr-text-center pr-mt-4">
        Open Gmail to track conversations
      </p>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
