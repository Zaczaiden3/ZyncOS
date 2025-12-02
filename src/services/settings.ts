export interface AppSettings {
  geminiApiKey: string;
  openRouterApiKey: string;
  reflexModel: string;
  memoryModel: string;
  consensusModel: string;
  theme: 'dark' | 'light' | 'cyber';
  userRole: 'ADMIN' | 'DEVELOPER' | 'EXECUTIVE' | 'USER';
}

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  openRouterApiKey: '',
  reflexModel: 'google/gemini-2.0-flash-001',
  memoryModel: 'google/gemini-2.0-flash-thinking-exp-01-21',
  consensusModel: 'google/gemini-2.0-flash-001',
  theme: 'dark',
  userRole: 'DEVELOPER'
};

export const getSettings = (): AppSettings => {
  const saved = localStorage.getItem('zync_app_settings');
  return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: Partial<AppSettings>) => {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('zync_app_settings', JSON.stringify(updated));
  
  // Trigger a custom event so components can react
  window.dispatchEvent(new Event('zync-settings-changed'));
  return updated;
};

export const getApiKey = (provider: 'gemini' | 'openrouter'): string | null => {
  const settings = getSettings();
  return provider === 'gemini' ? settings.geminiApiKey : settings.openRouterApiKey;
};
