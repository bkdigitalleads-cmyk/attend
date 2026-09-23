import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initPurchases, getIsPro } from './purchases';

export interface Settings {
  lockEnabled: boolean;
  /** Printed at the top of the attendance report: "Lincoln High", "Riverside FC". */
  orgName: string;
  /** Teacher / coach / leader name for the report signature line. */
  leaderName: string;
}

const DEFAULT_SETTINGS: Settings = {
  lockEnabled: false,
  orgName: '',
  leaderName: '',
};

const SETTINGS_KEY = 'attend.settings.v1';

/** Free tier: one group, this many sessions. Pro: unlimited plus exports. */
export const FREE_GROUP_LIMIT = 1;
export const FREE_SESSION_LIMIT = 5;

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  refreshPro: () => Promise<void>;
  paywallVisible: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
  ready: boolean;
  dataVersion: number;
  bumpData: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isPro, setIsPro] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        // corrupted settings -> defaults
      }
      try {
        await initPurchases();
        setIsPro(await getIsPro());
      } catch {
        setIsPro(false);
      }
      setReady(true);
    })();
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // non-fatal
      }
    },
    [settings]
  );

  const refreshPro = useCallback(async () => {
    setIsPro(await getIsPro());
  }, []);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      isPro,
      setIsPro,
      refreshPro,
      paywallVisible,
      showPaywall: () => setPaywallVisible(true),
      hidePaywall: () => setPaywallVisible(false),
      ready,
      dataVersion,
      bumpData: () => setDataVersion((v) => v + 1),
    }),
    [settings, updateSettings, isPro, refreshPro, paywallVisible, ready, dataVersion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
