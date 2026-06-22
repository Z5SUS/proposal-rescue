import { useState, useEffect, useCallback } from 'react';
import type { TrackedThread } from '@/types';
import {
  getAllThreads,
  updateThread,
  getActiveThreads,
  getActionableThreads,
  getSnoozedThreads,
  deleteThread,
  getSettings,
} from '@/utils/storage';
import { isoInDays } from '@/utils/dates';
import { SNOOZE_OPTIONS } from '@/constants';

interface ThreadsState {
  /** All active non-snoozed threads — what the dashboard shows */
  active: TrackedThread[];
  /** Count of threads past their follow-up date — for the header badge */
  overdueCount: number;
  snoozed: TrackedThread[];
  archived: TrackedThread[];
  loading: boolean;
}

interface ThreadActions {
  markWon: (threadId: string) => Promise<void>;
  markLost: (threadId: string) => Promise<void>;
  stopTracking: (threadId: string) => Promise<void>;
  snooze: (threadId: string, daysOrDate: number | string) => Promise<void>;
  resumeNow: (threadId: string) => Promise<void>;
  retrack: (threadId: string) => Promise<void>;
  setCustomDate: (threadId: string, isoDate: string) => Promise<void>;
  deleteHistory: (threadId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useThreads(): ThreadsState & ThreadActions {
  const [active, setActive] = useState<TrackedThread[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [snoozed, setSnoozed] = useState<TrackedThread[]>([]);
  const [archived, setArchived] = useState<TrackedThread[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [allActive, overdue, s, allRaw] = await Promise.all([
        getActiveThreads(),
        getActionableThreads(),
        getSnoozedThreads(),
        getAllThreads(),
      ]);
      // Sort: Overdue first -> oldest nextActionDate ascending -> most recent lastUserEmailDate descending
      setActive(
        allActive.sort((x, y) => {
          const now = Date.now();
          const xTarget = x.customFollowUpDate || x.nextActionDate;
          const yTarget = y.customFollowUpDate || y.nextActionDate;
          const xOver = new Date(xTarget).getTime() <= now;
          const yOver = new Date(yTarget).getTime() <= now;
          if (xOver !== yOver) return xOver ? -1 : 1;
          const diff = new Date(xTarget).getTime() - new Date(yTarget).getTime();
          if (diff !== 0) return diff;
          return new Date(y.lastUserEmailDate).getTime() - new Date(x.lastUserEmailDate).getTime();
        }),
      );
      setOverdueCount(overdue.length);
      setSnoozed(
        s.sort((x, y) => {
          const xa = x.snoozedUntil ?? '';
          const ya = y.snoozedUntil ?? '';
          return new Date(xa).getTime() - new Date(ya).getTime();
        }),
      );
      // Filter archived
      const archList = Object.values(allRaw).filter(
        (t) => t.status === 'won' || t.status === 'lost' || t.status === 'stopped'
      );
      setArchived(
        archList.sort(
          (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // React to storage changes from other extension pages (content script tracking)
  useEffect(() => {
    const listener = () => void refresh();
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const markWon = useCallback(async (threadId: string) => {
    await updateThread(threadId, { status: 'won', snoozedUntil: null });
    await refresh();
  }, [refresh]);

  const markLost = useCallback(async (threadId: string) => {
    await updateThread(threadId, { status: 'lost', snoozedUntil: null });
    await refresh();
  }, [refresh]);

  const stopTracking = useCallback(async (threadId: string) => {
    await updateThread(threadId, { status: 'stopped', snoozedUntil: null });
    await refresh();
  }, [refresh]);

  const snooze = useCallback(async (threadId: string, daysOrDate: number | string) => {
    const snoozedUntil = typeof daysOrDate === 'number' ? isoInDays(daysOrDate) : daysOrDate;
    await updateThread(threadId, { snoozedUntil });
    await refresh();
  }, [refresh]);

  const resumeNow = useCallback(async (threadId: string) => {
    await updateThread(threadId, { snoozedUntil: null });
    await refresh();
  }, [refresh]);

  const retrack = useCallback(async (threadId: string) => {
    const settings = await getSettings();
    const now = new Date().toISOString();
    await updateThread(threadId, {
      status: 'active',
      lastUserEmailDate: now,
      nextActionDate: isoInDays(settings.followUpIntervalDays),
      customFollowUpDate: null,
      snoozedUntil: null,
    });
    await refresh();
  }, [refresh]);

  const setCustomDate = useCallback(async (threadId: string, isoDate: string) => {
    await updateThread(threadId, { customFollowUpDate: isoDate, nextActionDate: isoDate });
    await refresh();
  }, [refresh]);

  const deleteHistory = useCallback(async (threadId: string) => {
    await deleteThread(threadId);
    await refresh();
  }, [refresh]);

  return {
    active,
    overdueCount,
    snoozed,
    archived,
    loading,
    markWon,
    markLost,
    stopTracking,
    snooze,
    resumeNow,
    retrack,
    setCustomDate,
    deleteHistory,
    refresh,
  };
}

/** Standalone hook to get all threads (including won/lost/stopped) */
export function useAllThreads() {
  const [threads, setThreads] = useState<TrackedThread[]>([]);

  useEffect(() => {
    const load = async () => {
      const all = await getAllThreads();
      setThreads(Object.values(all));
    };
    void load();
    const listener = () => void load();
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return threads;
}

export { SNOOZE_OPTIONS };
