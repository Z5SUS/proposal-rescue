import React from 'react';
import { PRO_CHECKOUT_URL, MEGA_CHECKOUT_URL } from '@/constants';
import { useSettings } from '@/hooks/useSettings';

interface UpgradeModalProps {
  onClose: () => void;
}

export function UpgradeModal({ onClose }: UpgradeModalProps): React.JSX.Element {
  const settings = useSettings();
  const currentPlan = settings.licenseValid ? settings.licensePlan : 'free';

  function handleChoosePlan(checkoutUrl: string): void {
    if (!checkoutUrl) {
      alert('Checkout URL is not configured yet. Please insert Razorpay URL in constants.');
      return;
    }
    chrome.tabs.create({ url: checkoutUrl });
    onClose();
  }

  return (
    <div
      className="pr-fixed pr-inset-0 pr-bg-black/50 pr-z-[60] pr-flex pr-items-center pr-justify-center pr-p-4 pr-backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pr-bg-white pr-rounded-2xl pr-w-full pr-max-w-sm pr-shadow-panel pr-overflow-hidden pr-flex pr-flex-col pr-max-h-[90vh]">
        {/* Header */}
        <div className="pr-px-5 pr-pt-5 pr-pb-4 pr-border-b pr-border-surface-100 pr-flex pr-items-center pr-justify-between pr-shrink-0">
          <div>
            <h2 className="pr-text-base pr-font-bold pr-text-ink-900 pr-leading-tight">
              Proposal Rescue Plans
            </h2>
          </div>
          <button
            onClick={onClose}
            className="pr-text-ink-400 hover:pr-text-ink-600 pr-bg-transparent pr-border-0 pr-cursor-pointer pr-text-lg pr-leading-none pr-p-1 pr-ml-2 pr-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content of plans */}
        <div className="pr-p-4 pr-space-y-4 pr-overflow-y-auto">
          {/* FREE Plan Card */}
          <div className="pr-bg-surface-50 pr-border pr-border-surface-200 pr-rounded-xl pr-p-4">
            <div className="pr-flex pr-items-start pr-justify-between">
              <div>
                <span className="pr-text-[10px] pr-font-bold pr-text-ink-400 pr-uppercase pr-tracking-wider">FREE</span>
                <div className="pr-text-xl pr-font-bold pr-text-ink-900 pr-mt-0.5">$0</div>
              </div>
              {currentPlan === 'free' && (
                <span className="pr-text-[9px] pr-font-bold pr-bg-surface-200 pr-text-ink-700 pr-rounded pr-px-1.5 pr-py-0.5">
                  Current Plan
                </span>
              )}
            </div>
            <ul className="pr-mt-3 pr-space-y-1.5 pr-pl-0 pr-list-none pr-text-xs pr-text-ink-600">
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-success">✔</span> Track up to 3 conversations
              </li>
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-success">✔</span> Dashboard
              </li>
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-success">✔</span> Reminders
              </li>
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-success">✔</span> Snooze
              </li>
            </ul>
          </div>

          {/* PRO Plan Card */}
          <div className="pr-bg-brand-50 pr-border pr-border-brand-200 pr-rounded-xl pr-p-4">
            <div className="pr-flex pr-items-start pr-justify-between">
              <div>
                <span className="pr-text-[10px] pr-font-bold pr-text-brand-600 pr-uppercase pr-tracking-wider">PRO</span>
                <div className="pr-flex pr-items-baseline pr-gap-0.5 pr-mt-0.5">
                  <span className="pr-text-xl pr-font-bold pr-text-ink-900">$29</span>
                  <span className="pr-text-xs pr-text-ink-400">/month</span>
                </div>
              </div>
              {currentPlan === 'pro' && (
                <span className="pr-text-[9px] pr-font-bold pr-bg-brand-600 pr-text-white pr-rounded pr-px-1.5 pr-py-0.5">
                  Current Plan
                </span>
              )}
            </div>
            <ul className="pr-mt-3 pr-space-y-1.5 pr-pl-0 pr-list-none pr-text-xs pr-text-ink-600">
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-brand-600">✔</span> Unlimited conversations
              </li>
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-brand-600">✔</span> Unlimited AI Follow-Ups
              </li>
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-brand-600">✔</span> Tone Selection
              </li>
            </ul>
            <button
              disabled={currentPlan === 'pro'}
              onClick={() => handleChoosePlan(PRO_CHECKOUT_URL)}
              className={`pr-w-full pr-mt-4 pr-py-2 pr-px-4 pr-text-xs pr-font-semibold pr-rounded-lg pr-transition-colors pr-border-0 ${
                currentPlan === 'pro'
                  ? 'pr-bg-surface-200 pr-text-ink-400 pr-cursor-not-allowed'
                  : 'pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-cursor-pointer'
              }`}
            >
              {currentPlan === 'pro' ? 'Current Plan' : 'Choose Pro'}
            </button>
          </div>

          {/* MEGA Plan Card */}
          <div className="pr-bg-amber-50 pr-border pr-border-amber-200 pr-rounded-xl pr-p-4">
            <div className="pr-flex pr-items-start pr-justify-between">
              <div>
                <div className="pr-flex pr-items-center pr-gap-1.5">
                  <span className="pr-text-[10px] pr-font-bold pr-text-amber-800 pr-uppercase pr-tracking-wider">MEGA</span>
                  <span className="pr-text-[8px] pr-font-bold pr-bg-amber-200 pr-text-amber-800 pr-rounded pr-px-1 pr-py-0.5">Best Value</span>
                </div>
                <div className="pr-flex pr-items-baseline pr-gap-0.5 pr-mt-0.5">
                  <span className="pr-text-xl pr-font-bold pr-text-ink-900">$79</span>
                  <span className="pr-text-xs pr-text-ink-400">/year</span>
                </div>
              </div>
              {currentPlan === 'mega' && (
                <span className="pr-text-[9px] pr-font-bold pr-bg-amber-500 pr-text-white pr-rounded pr-px-1.5 pr-py-0.5">
                  Current Plan
                </span>
              )}
            </div>
            <ul className="pr-mt-3 pr-space-y-1.5 pr-pl-0 pr-list-none pr-text-xs pr-text-ink-600">
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-amber-600">✔</span> Everything in Pro
              </li>
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-amber-600">✔</span> Priority Support
              </li>
              <li className="pr-flex pr-items-center pr-gap-1.5">
                <span className="pr-text-amber-600">✔</span> Early Access Features
              </li>
            </ul>
            <button
              disabled={currentPlan === 'mega'}
              onClick={() => handleChoosePlan(MEGA_CHECKOUT_URL)}
              className={`pr-w-full pr-mt-4 pr-py-2 pr-px-4 pr-text-xs pr-font-semibold pr-rounded-lg pr-transition-colors pr-border-0 ${
                currentPlan === 'mega'
                  ? 'pr-bg-surface-200 pr-text-ink-400 pr-cursor-not-allowed'
                  : 'pr-bg-amber-500 hover:pr-bg-amber-600 pr-text-white pr-cursor-pointer'
              }`}
            >
              {currentPlan === 'mega' ? 'Current Plan' : 'Choose Mega'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pr-px-5 pr-pb-5 pr-pt-2 pr-text-center pr-border-t pr-border-surface-100 pr-shrink-0">
          <p className="pr-text-[10px] pr-text-ink-300">
            Already have a license key?{' '}
            <button
              onClick={() => { chrome.runtime.openOptionsPage(); onClose(); }}
              className="pr-text-brand-600 pr-underline pr-bg-transparent pr-border-0 pr-cursor-pointer pr-p-0 pr-text-[10px]"
            >
              Enter it in Settings
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
