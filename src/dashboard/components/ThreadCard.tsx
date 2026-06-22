import React, { useState, useEffect } from 'react';
import type { TrackedThread } from '@/types';
import { SNOOZE_OPTIONS } from '@/constants';
import { formatDate, daysSince } from '@/utils/dates';

interface ThreadCardProps {
  thread: TrackedThread;
  isOverdue: boolean;
  onWon: () => void;
  onLost: () => void;
  onStop: () => void;
  onSnooze: (daysOrDate: number | string) => void;
  onSetCustomDate: (isoDate: string) => void;
  onGenerateFollowUp: () => void;
}

export function ThreadCard({
  thread,
  isOverdue,
  onWon,
  onLost,
  onStop,
  onSnooze,
  onSetCustomDate,
  onGenerateFollowUp,
}: ThreadCardProps): React.JSX.Element {
  const [showSnooze, setShowSnooze] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDateToInputString(thread.customFollowUpDate || thread.nextActionDate));
  const [confirming, setConfirming] = useState<'won' | 'lost' | 'stop' | null>(null);

  useEffect(() => {
    setSelectedDate(formatDateToInputString(thread.customFollowUpDate || thread.nextActionDate));
  }, [thread.customFollowUpDate, thread.nextActionDate]);

  const noReplyDays = daysSince(thread.lastUserEmailDate);

  function formatDateToInputString(dateString: string): string {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  }

  function getTodayDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function handleSaveCustomDate(): void {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, 9, 0, 0);
    onSetCustomDate(dateObj.toISOString());
    setShowDatePicker(false);
  }

  function handleSnooze(days: number): void {
    onSnooze(days);
    setShowSnooze(false);
    setShowCustom(false);
  }

  function getMinDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function handleCustomSnooze(): void {
    if (!customDate) return;
    const [year, month, day] = customDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, 9, 0, 0);
    onSnooze(dateObj.toISOString());
    setShowSnooze(false);
    setShowCustom(false);
    setCustomDate('');
  }

  function handleConfirm(action: 'won' | 'lost' | 'stop'): void {
    if (confirming === action) {
      if (action === 'won') onWon();
      else if (action === 'lost') onLost();
      else onStop();
      setConfirming(null);
    } else {
      setConfirming(action);
    }
  }

  return (
    <div className="pr-bg-white pr-border pr-border-surface-200 pr-rounded-lg pr-p-4 pr-shadow-card pr-space-y-3">

      {/* Contact + subject */}
      <div>
        <div className="pr-flex pr-items-start pr-justify-between pr-gap-2">
          <h3 className="pr-text-sm pr-font-semibold pr-text-ink-900 pr-leading-tight pr-truncate">
            {thread.participantName || thread.participantEmail || 'Unknown'}
          </h3>
          {isOverdue ? (
            <span className="pr-text-[10px] pr-font-medium pr-text-warning pr-bg-amber-50 pr-border pr-border-amber-200 pr-rounded pr-px-1.5 pr-py-0.5 pr-whitespace-nowrap pr-flex-shrink-0">
              {noReplyDays === 0 ? 'Today' : `${noReplyDays}d no reply`}
            </span>
          ) : (
            <span className="pr-text-[10px] pr-font-medium pr-text-success pr-bg-green-50 pr-border pr-border-green-200 pr-rounded pr-px-1.5 pr-py-0.5 pr-whitespace-nowrap pr-flex-shrink-0">
              Tracking
            </span>
          )}
        </div>
        <p className="pr-text-xs pr-text-ink-500 pr-mt-0.5 pr-truncate pr-leading-tight">
          {thread.subject}
        </p>
      </div>

      {/* Meta row */}
      <div className="pr-grid pr-grid-cols-3 pr-gap-2 pr-text-xs">
        <div className="pr-bg-surface-50 pr-rounded pr-px-2 pr-py-1.5">
          <p className="pr-text-ink-400 pr-text-[10px] pr-uppercase pr-tracking-wide pr-font-medium pr-mb-0.5">No Reply</p>
          <p className="pr-font-semibold pr-text-ink-700">{noReplyDays}d</p>
        </div>
        <div className="pr-bg-surface-50 pr-rounded pr-px-2 pr-py-1.5">
          <p className="pr-text-ink-400 pr-text-[10px] pr-uppercase pr-tracking-wide pr-font-medium pr-mb-0.5">Follow-ups</p>
          <p className="pr-font-semibold pr-text-ink-700">{thread.followUpCount}</p>
        </div>
        <div className="pr-bg-surface-50 pr-rounded pr-px-2 pr-py-1.5">
          <p className="pr-text-ink-400 pr-text-[10px] pr-uppercase pr-tracking-wide pr-font-medium pr-mb-0.5">Next action</p>
          <p className="pr-font-semibold pr-text-ink-700">{formatDate(thread.customFollowUpDate || thread.nextActionDate)}</p>
        </div>
      </div>

      {/* Reason */}
      <p className="pr-text-xs pr-text-ink-500 pr-italic pr-leading-snug">
        You sent the last email and no reply has been detected.
      </p>

      {/* Snooze picker (shown inline when Snooze is clicked) */}
      {showSnooze && (
        <div className="pr-flex pr-flex-col pr-gap-2 pr-bg-surface-50 pr-rounded pr-p-2 animate-fade-in">
          <div className="pr-flex pr-items-center pr-gap-1.5">
            <span className="pr-text-xs pr-font-medium pr-text-ink-500 pr-mr-1">Snooze:</span>
            {SNOOZE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => handleSnooze(opt.days)}
                className="pr-text-xs pr-px-2 pr-py-1 pr-rounded pr-bg-white pr-border pr-border-surface-200 pr-text-ink-700 hover:pr-bg-brand-50 hover:pr-border-brand-200 hover:pr-text-brand-700 pr-transition-colors pr-cursor-pointer"
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`pr-text-xs pr-px-2 pr-py-1 pr-rounded pr-border pr-transition-colors pr-cursor-pointer ${
                showCustom
                  ? 'pr-bg-brand-50 pr-border-brand-200 pr-text-brand-700'
                  : 'pr-bg-white pr-border-surface-200 pr-text-ink-700 hover:pr-bg-brand-50 hover:pr-border-brand-200 hover:pr-text-brand-700'
              }`}
            >
              📅 Custom
            </button>
            <button
              onClick={() => { setShowSnooze(false); setShowCustom(false); }}
              className="pr-ml-auto pr-text-ink-400 hover:pr-text-ink-600 pr-text-xs pr-cursor-pointer pr-bg-transparent pr-border-0 pr-p-0"
            >
              ✕
            </button>
          </div>
          {showCustom && (
            <div className="pr-flex pr-items-center pr-gap-2 pr-mt-1 pr-pt-2 pr-border-t pr-border-surface-200">
              <input
                type="date"
                min={getMinDate()}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="pr-text-xs pr-px-2 pr-py-1 pr-rounded pr-border pr-border-surface-300 pr-bg-white pr-text-ink-900 focus:pr-outline-none focus:pr-border-brand-500"
              />
              <button
                disabled={!customDate}
                onClick={handleCustomSnooze}
                className="pr-text-xs pr-px-2 pr-py-1 pr-rounded pr-bg-brand-600 hover:pr-bg-brand-700 disabled:pr-bg-surface-300 disabled:pr-text-ink-400 pr-text-white pr-font-medium pr-cursor-pointer pr-border-0 pr-transition-colors"
              >
                Snooze until date
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Date Picker (shown inline when Custom Date is clicked) */}
      {showDatePicker && (
        <div className="pr-flex pr-flex-col pr-gap-2 pr-bg-surface-50 pr-rounded pr-p-2 animate-fade-in">
          <div className="pr-flex pr-items-center pr-gap-1.5">
            <span className="pr-text-xs pr-font-medium pr-text-ink-500 pr-mr-1">Follow-up Date:</span>
            <input
              type="date"
              min={getTodayDate()}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pr-text-xs pr-px-2 pr-py-1 pr-rounded pr-border pr-border-surface-300 pr-bg-white pr-text-ink-900 focus:pr-outline-none focus:pr-border-brand-500"
            />
            <button
              disabled={!selectedDate}
              onClick={handleSaveCustomDate}
              className="pr-text-xs pr-px-2 pr-py-1 pr-rounded pr-bg-brand-600 hover:pr-bg-brand-700 disabled:pr-bg-surface-300 disabled:pr-text-ink-400 pr-text-white pr-font-medium pr-cursor-pointer pr-border-0 pr-transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowDatePicker(false)}
              className="pr-ml-auto pr-text-ink-400 hover:pr-text-ink-600 pr-text-xs pr-cursor-pointer pr-bg-transparent pr-border-0 pr-p-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Confirm overlay for destructive actions */}
      {confirming && (
        <div className="pr-flex pr-items-center pr-gap-2 pr-bg-surface-50 pr-rounded pr-p-2 pr-text-xs pr-text-ink-600">
          <span className="pr-flex-1">
            Mark as {confirming === 'won' ? '🏆 Won' : confirming === 'lost' ? '❌ Lost' : '⏹ Stopped'}?
          </span>
          <button
            onClick={() => handleConfirm(confirming)}
            className="pr-px-2 pr-py-1 pr-rounded pr-bg-ink-900 pr-text-white pr-font-medium pr-cursor-pointer pr-border-0"
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="pr-text-ink-400 hover:pr-text-ink-600 pr-cursor-pointer pr-bg-transparent pr-border-0 pr-p-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Primary action */}
      <button
        onClick={onGenerateFollowUp}
        className="pr-w-full pr-py-2 pr-px-3 pr-bg-brand-600 hover:pr-bg-brand-700 pr-text-white pr-text-xs pr-font-semibold pr-rounded pr-transition-colors pr-cursor-pointer pr-border-0"
      >
        ✦ Generate Follow-Up
      </button>

      {/* Secondary actions row */}
      <div className="pr-flex pr-flex-wrap pr-gap-1.5">
        <button
          onClick={() => { setShowSnooze(!showSnooze); setShowDatePicker(false); setConfirming(null); }}
          className="pr-flex-1 pr-min-w-0 pr-text-xs pr-py-1.5 pr-px-2 pr-rounded pr-border pr-border-surface-200 pr-text-ink-600 hover:pr-bg-surface-50 pr-transition-colors pr-cursor-pointer pr-bg-white pr-font-medium"
        >
          Snooze
        </button>
        <button
          onClick={() => { setShowDatePicker(!showDatePicker); setShowSnooze(false); setConfirming(null); }}
          className="pr-flex-1 pr-min-w-0 pr-text-xs pr-py-1.5 pr-px-2 pr-rounded pr-border pr-border-surface-200 pr-text-ink-600 hover:pr-bg-surface-50 pr-transition-colors pr-cursor-pointer pr-bg-white pr-font-medium"
        >
          Custom Date
        </button>
        <button
          onClick={() => { handleConfirm('won'); setShowSnooze(false); setShowDatePicker(false); }}
          className="pr-flex-1 pr-min-w-0 pr-text-xs pr-py-1.5 pr-px-2 pr-rounded pr-border pr-border-surface-200 pr-text-ink-600 hover:pr-bg-surface-50 pr-transition-colors pr-cursor-pointer pr-bg-white pr-font-medium"
        >
          Won
        </button>
        <button
          onClick={() => { handleConfirm('lost'); setShowSnooze(false); setShowDatePicker(false); }}
          className="pr-flex-1 pr-min-w-0 pr-text-xs pr-py-1.5 pr-px-2 pr-rounded pr-border pr-border-surface-200 pr-text-ink-600 hover:pr-bg-surface-50 pr-transition-colors pr-cursor-pointer pr-bg-white pr-font-medium"
        >
          Lost
        </button>
        <button
          onClick={() => { handleConfirm('stop'); setShowSnooze(false); setShowDatePicker(false); }}
          className="pr-flex-1 pr-min-w-0 pr-text-xs pr-py-1.5 pr-px-2 pr-rounded pr-border pr-border-surface-200 pr-text-danger hover:pr-bg-red-50 pr-transition-colors pr-cursor-pointer pr-bg-white pr-font-medium"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
