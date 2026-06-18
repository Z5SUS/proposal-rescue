import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/global.css';
import { getSettings, saveSettings } from '@/utils/storage';
import { validateLicenseAPI } from '@/utils/api';
import type { AppSettings, FollowUpInterval, AiTone } from '@/types';
import { DEFAULT_SETTINGS } from '@/constants';

function Options(): React.JSX.Element {
  const [interval, setInterval] = useState<FollowUpInterval>(5);
  const [tone, setTone] = useState<AiTone>('professional');
  const [licenseKey, setLicenseKeyState] = useState('');
  const [licenseValid, setLicenseValid] = useState(false);
  const [licensePlan, setLicensePlan] = useState<'free' | 'solo' | 'agency' | 'lifetime' | 'owner'>('free');
  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing settings on mount
  useEffect(() => {
    getSettings()
      .then((settings) => {
        setInterval(settings.followUpIntervalDays);
        setTone(settings.aiTone);
        setLicenseKeyState(settings.licenseKey || '');
        setLicenseValid(settings.licenseValid || false);
        setLicensePlan(settings.licensePlan || 'free');
      })
      .catch((err) => {
        setError('Failed to load settings from storage.');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleValidateLicense(): Promise<void> {
    if (!licenseKey.trim()) {
      setError('Please enter a license key.');
      return;
    }
    setValidating(true);
    setError(null);
    setValidationSuccess(false);
    try {
      const result = await validateLicenseAPI(licenseKey.trim());
      setLicenseValid(result.valid);
      setLicensePlan(result.plan as 'free' | 'pro');
      // Persist validated license to storage immediately
      const current = await getSettings();
      await saveSettings({
        ...current,
        licenseKey: licenseKey.trim(),
        licenseValid: result.valid,
        licensePlan: result.plan as 'free' | 'pro',
      });
      if (result.valid) {
        setValidationSuccess(true);
        setTimeout(() => setValidationSuccess(false), 3000);
      } else {
        setError('License key is invalid.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to validate license.');
      setLicenseValid(false);
      setLicensePlan('free');
    } finally {
      setValidating(false);
    }
  }

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const currentSettings = await getSettings();
      const updatedSettings: AppSettings = {
        ...currentSettings,
        followUpIntervalDays: interval,
        aiTone: tone,
      };
      await saveSettings(updatedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save settings.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pr-min-h-screen pr-bg-surface-50 pr-flex pr-flex-col pr-items-center pr-justify-center pr-font-sans">
        <div className="pr-w-6 pr-h-6 pr-rounded-full pr-border-2 pr-border-brand-200 pr-border-t-brand-600 pr-animate-spin" />
        <p className="pr-text-xs pr-text-ink-400 pr-mt-3">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="pr-min-h-screen pr-bg-surface-50 pr-flex pr-flex-col pr-items-center pr-justify-start pr-py-12 pr-px-4 pr-font-sans">
      <div className="pr-w-full pr-max-w-md pr-space-y-6">
        
        {/* Branding header */}
        <div className="pr-flex pr-items-center pr-justify-between">
          <div className="pr-flex pr-items-center pr-gap-3">
            <div className="pr-w-8 pr-h-8 pr-bg-brand-600 pr-rounded-lg pr-flex pr-items-center pr-justify-center pr-shadow-sm">
              <div className="pr-w-3 pr-h-3 pr-bg-white pr-rounded-full" />
            </div>
            <div>
              <h1 className="pr-text-lg pr-font-bold pr-text-ink-900 pr-leading-tight">Proposal Rescue</h1>
              <p className="pr-text-[10px] pr-font-medium pr-text-brand-600 pr-uppercase pr-tracking-wide">Extension Settings</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="pr-bg-white pr-border pr-border-surface-200 pr-rounded-xl pr-shadow-card pr-overflow-hidden pr-divide-y pr-divide-surface-150">
          
          {/* Section 1: License settings */}
          <div className="pr-p-5 pr-space-y-3">
            <div>
              <h2 className="pr-text-xs pr-font-bold pr-text-ink-900 pr-uppercase pr-tracking-wider pr-mb-1">License & Account</h2>
              <p className="pr-text-xs pr-text-ink-400 pr-leading-relaxed">
                Enter your Proposal Rescue license key to activate your subscription and unlock Pro features.
              </p>
            </div>

            <div className="pr-flex pr-items-center pr-gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKeyState(e.target.value)}
                placeholder="Enter license key"
                className="pr-flex-1 pr-px-3 pr-py-2 pr-border pr-border-surface-200 pr-rounded-lg pr-text-xs pr-font-mono focus:pr-outline-none focus:pr-border-brand-500 pr-min-w-0"
              />
              <button
                type="button"
                onClick={handleValidateLicense}
                disabled={validating}
                className="pr-px-4 pr-py-2 pr-bg-brand-600 hover:pr-bg-brand-700 disabled:pr-bg-surface-300 disabled:pr-text-ink-400 disabled:pr-cursor-not-allowed pr-text-white pr-text-xs pr-font-semibold pr-rounded-lg pr-transition-colors pr-cursor-pointer pr-border-0 pr-shrink-0"
              >
                {validating ? 'Validating…' : 'Validate'}
              </button>
            </div>

            {/* Plan Badge / Status */}
            <div className="pr-flex pr-items-center pr-justify-between pr-mt-2 pr-pt-1">
              <span className="pr-text-[10px] pr-text-ink-400">Current Plan:</span>
              <span
                className={`pr-px-2 pr-py-0.5 pr-rounded pr-text-[10px] pr-font-bold pr-uppercase ${
                licenseValid && licensePlan !== 'free'
                  ? 'pr-bg-green-50 pr-text-success pr-border pr-border-green-200'
                  : 'pr-bg-surface-100 pr-text-ink-500'
              }`}
            >
              {licenseValid && licensePlan === 'owner'
                ? '✓ Owner Access'
                : licenseValid && licensePlan === 'lifetime'
                ? '✓ Lifetime'
                : licenseValid && licensePlan === 'agency'
                ? '✓ Agency Plan'
                : licenseValid && licensePlan === 'solo'
                ? '✓ Solo Plan'
                : 'Free Plan'}
              </span>
            </div>

            {validationSuccess && (
              <p className="pr-text-[11px] pr-text-success pr-font-semibold animate-fade-in">
                ✓ License key validated! Pro features unlocked.
              </p>
            )}
          </div>

          {/* Section 2: Default Interval */}
          <div className="pr-p-5 pr-space-y-3">
            <div>
              <h2 className="pr-text-xs pr-font-bold pr-text-ink-900 pr-uppercase pr-tracking-wider pr-mb-1">Reminders & Schedules</h2>
              <p className="pr-text-xs pr-text-ink-400 pr-leading-relaxed">
                Choose the default follow-up delay interval for newly tracked proposals.
              </p>
            </div>

            <div className="pr-grid pr-grid-cols-3 pr-gap-2.5">
              {([3, 5, 7] as FollowUpInterval[]).map((val) => (
                <label
                  key={val}
                  className={`pr-border pr-rounded-lg pr-p-3 pr-text-center pr-cursor-pointer pr-transition-all pr-flex pr-flex-col pr-items-center pr-justify-center ${
                    interval === val
                      ? 'pr-bg-brand-50 pr-border-brand-300 pr-text-brand-700 pr-font-semibold pr-shadow-sm'
                      : 'pr-bg-white pr-border-surface-200 pr-text-ink-600 hover:pr-bg-surface-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="interval"
                    value={val}
                    checked={interval === val}
                    onChange={() => setInterval(val)}
                    className="pr-sr-only"
                  />
                  <span className="pr-text-sm">{val} Days</span>
                  <span className="pr-text-[10px] pr-text-ink-400 pr-font-normal pr-mt-0.5">
                    {val === 3 ? 'Urgent pitch' : val === 5 ? 'Standard pitch' : 'Slow pitch'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: AI Writer Settings */}
          <div className="pr-p-5 pr-space-y-3">
            <div>
              <h2 className="pr-text-xs pr-font-bold pr-text-ink-900 pr-uppercase pr-tracking-wider pr-mb-1">AI Writing Tone</h2>
              <p className="pr-text-xs pr-text-ink-400 pr-leading-relaxed">
                Select the default personality and tone of voice for generated follow-up emails.
              </p>
            </div>

            <div className="pr-grid pr-grid-cols-3 pr-gap-2.5">
              {(['professional', 'friendly', 'direct'] as AiTone[]).map((val) => (
                <label
                  key={val}
                  className={`pr-border pr-rounded-lg pr-p-3 pr-text-center pr-cursor-pointer pr-transition-all pr-flex pr-flex-col pr-items-center pr-justify-center ${
                    tone === val
                      ? 'pr-bg-brand-50 pr-border-brand-300 pr-text-brand-700 pr-font-semibold pr-shadow-sm'
                      : 'pr-bg-white pr-border-surface-200 pr-text-ink-600 hover:pr-bg-surface-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tone"
                    value={val}
                    checked={tone === val}
                    onChange={() => setTone(val)}
                    className="pr-sr-only"
                  />
                  <span className="pr-text-xs pr-capitalize">{val}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="pr-p-5 pr-bg-surface-50 pr-flex pr-items-center pr-justify-between">
            {saveSuccess && (
              <span className="pr-text-xs pr-text-success pr-font-semibold animate-fade-in">
                ✓ Settings saved!
              </span>
            )}
            {error && (
              <span className="pr-text-xs pr-text-danger pr-font-semibold animate-fade-in">
                ⚠️ {error}
              </span>
            )}
            {!saveSuccess && !error && <span />}

            <button
              type="submit"
              disabled={saving}
              className="pr-px-6 pr-py-2 pr-bg-brand-600 hover:pr-bg-brand-700 disabled:pr-bg-surface-300 disabled:pr-text-ink-400 disabled:pr-cursor-not-allowed pr-text-white pr-text-xs pr-font-semibold pr-rounded-lg pr-shadow-sm pr-transition-colors pr-cursor-pointer pr-border-0"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

        </form>

        {/* Small extension details footer */}
        <p className="pr-text-[10px] pr-text-ink-300 pr-text-center">
          Proposal Rescue MVP · Version 1.0.0 · Local Storage Only
        </p>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Options />);
