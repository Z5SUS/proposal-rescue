import { useState, useEffect } from 'react';
import type { AppSettings } from '@/types';
import { getSettings } from '@/utils/storage';
import { DEFAULT_SETTINGS } from '@/constants';

export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void getSettings().then(setSettings);
    const listener = () => void getSettings().then(setSettings);
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return settings;
}
