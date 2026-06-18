import React from 'react';
import { PAID_PLAN_INFO } from '@/constants';

interface UpgradeModalProps {
  onClose: () => void;
}

/**
 * Upgrade modal — shows Solo / Agency / Lifetime plans with USD pricing.
 *
 * Checkout URLs are currently placeholders defined in constants/index.ts.
 * To connect real payments, replace the checkoutUrl values in PAID_PLAN_INFO
 * with your LemonSqueezy / Paddle / Stripe checkout links.
 */
export function UpgradeModal({ onClose }: UpgradeModalProps): React.JSX.Element {
  function handleChoosePlan(checkoutUrl: string): void {
    chrome.tabs.create({ url: checkoutUrl });
    onClose();
  }

  return (
    <div
      className="pr-fixed pr-inset-0 pr-bg-black/50 pr-z-[60] pr-flex pr-items-center pr-justify-center pr-p-4 pr-backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pr-bg-white pr-rounded-2xl pr-w-full pr-max-w-sm pr-shadow-panel pr-overflow-hidden">
        {/* Header */}
        <div className="pr-px-5 pr-pt-5 pr-pb-4 pr-border-b pr-border-surface-100">
          <div className="pr-flex pr-items-start pr-justify-between">
            <div>
              <h2 className="pr-text-base pr-font-bold pr-text-ink-900 pr-leading-tight">
                Upgrade Proposal Rescue
              </h2>
              <p className="pr-text-xs pr-text-ink-400 pr-mt-1">
                Unlock unlimited tracking and AI follow-ups
              </p>
            </div>
            <button
              onClick={onClose}
              className="pr-text-ink-400 hover:pr-text-ink-600 pr-bg-transparent pr-border-0 pr-cursor-pointer pr-text-lg pr-leading-none pr-p-1 pr-ml-2 pr-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="pr-p-4 pr-space-y-3">
          {PAID_PLAN_INFO.map((plan, index) => (
            <div
              key={plan.id}
              className={`pr-flex pr-items-center pr-justify-between pr-p-4 pr-rounded-xl pr-border pr-transition-colors ${
                index === 0
                  ? 'pr-bg-brand-50 pr-border-brand-200'
                  : index === 2
                  ? 'pr-bg-amber-50 pr-border-amber-200'
                  : 'pr-bg-white pr-border-surface-200'
              }`}
            >
              <div className="pr-flex-1 pr-min-w-0 pr-mr-3">
                <div className="pr-flex pr-items-baseline pr-gap-1.5">
                  <span className="pr-text-sm pr-font-bold pr-text-ink-900 pr-uppercase pr-tracking-wide">
                    {plan.label}
                  </span>
                  {index === 2 && (
                    <span className="pr-text-[9px] pr-font-bold pr-bg-amber-100 pr-text-amber-700 pr-border pr-border-amber-200 pr-rounded pr-px-1 pr-py-0.5 pr-uppercase pr-tracking-wide">
                      Best Value
                    </span>
                  )}
                </div>
                <div className="pr-flex pr-items-baseline pr-gap-0.5 pr-mt-0.5">
                  <span className="pr-text-xl pr-font-bold pr-text-ink-900">{plan.price}</span>
                  <span className="pr-text-xs pr-text-ink-400">{plan.billing}</span>
                </div>
                <p className="pr-text-[11px] pr-text-ink-500 pr-mt-0.5">{plan.tagline}</p>
              </div>
              <button
                onClick={() => handleChoosePlan(plan.checkoutUrl)}
                className={`pr-shrink-0 pr-px-3 pr-py-2 pr-rounded-lg pr-text-xs pr-font-semibold pr-transition-colors pr-cursor-pointer pr-border-0 pr-whitespace-nowrap ${
                  index === 0
                    ? 'pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white'
                    : index === 2
                    ? 'pr-bg-amber-500 hover:pr-bg-amber-600 pr-text-white'
                    : 'pr-bg-ink-900 hover:pr-bg-ink-800 pr-text-white'
                }`}
              >
                Choose Plan
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pr-px-5 pr-pb-5 pr-text-center">
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
