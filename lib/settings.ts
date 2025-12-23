const APP_KEY = "gstlens_settings";
const LOCAL_KEY = "gstlens_local_settings";

export type AppSettings = {
  autoSave: boolean;
  notificationsEnabled: boolean;
  cloud_sync_enabled: boolean;
};

export type LocalOnlySettings = {
  last_sync_time: number | null;
};

export type CombinedSettings = AppSettings & LocalOnlySettings;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoSave: false,
  notificationsEnabled: true,
  cloud_sync_enabled: false,
};

export const DEFAULT_LOCAL_SETTINGS: LocalOnlySettings = {
  last_sync_time: null,
};

export function getAPPSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_APP_SETTINGS,
    };
  }

  try {
    const app = JSON.parse(localStorage.getItem(APP_KEY) || "{}");

    return {
      ...DEFAULT_APP_SETTINGS,
      ...app,
    };
  } catch {
    return {
      ...DEFAULT_APP_SETTINGS,
    };
  }
}

export function getLocalSettings(): LocalOnlySettings {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_LOCAL_SETTINGS,
    };
  }

  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");

    return {
      ...DEFAULT_LOCAL_SETTINGS,
      ...local,
    };
  } catch {
    return {
      ...DEFAULT_LOCAL_SETTINGS,
    };
  }
}

export function getSettings(): CombinedSettings {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_APP_SETTINGS,
      ...DEFAULT_LOCAL_SETTINGS,
    };
  }

  try {
    const app = JSON.parse(localStorage.getItem(APP_KEY) || "{}");
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");

    return {
      ...DEFAULT_APP_SETTINGS,
      ...app,
      ...DEFAULT_LOCAL_SETTINGS,
      ...local,
    };
  } catch {
    return {
      ...DEFAULT_APP_SETTINGS,
      ...DEFAULT_LOCAL_SETTINGS,
    };
  }
}

export function saveAppSettings(settings: Partial<AppSettings>) {
  const current = JSON.parse(localStorage.getItem(APP_KEY) || "{}");

  localStorage.setItem(APP_KEY, JSON.stringify({ ...current, ...settings }));
}

export function saveLocalSettings(settings: Partial<LocalOnlySettings>) {
  const current = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");

  localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...current, ...settings }));
}
