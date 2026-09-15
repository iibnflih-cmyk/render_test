import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StoreSettings, ColorPalettePreset } from '../types';
import { DEFAULT_STORE_SETTINGS, COLOR_PALETTES } from '../data/themePresets';

interface StoreSettingsContextType {
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<boolean>;
  applyPalettePreset: (presetId: string) => void;
  resetToDefaults: () => Promise<boolean>;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

// Helper to inject CSS variables into document root
function applyThemeVariables(settings: StoreSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = settings.theme || DEFAULT_STORE_SETTINGS.theme;

  const bg = theme.backgroundColor || theme.darkBg || theme.lightBg || '#0d1015';
  const card = theme.cardBackground || theme.darkCardBg || theme.lightCardBg || '#151921';
  const text = theme.textColor || '#f5f5f5';
  const nav = theme.navBackground || card || '#0f1217';
  const border = theme.borderColor || '#262d38';

  root.style.setProperty('--theme-bg', bg);
  root.style.setProperty('--theme-card', card);
  root.style.setProperty('--theme-text', text);
  root.style.setProperty('--theme-nav', nav);
  root.style.setProperty('--theme-border', border);
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-hover', theme.primaryHover);
  root.style.setProperty('--theme-primary-text', theme.primaryText);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-dark-bg', bg);
  root.style.setProperty('--theme-light-bg', bg);
  root.style.setProperty('--theme-dark-card', card);
  root.style.setProperty('--theme-light-card', card);

  // Set document title if specified
  if (settings.storeName) {
    document.title = `${settings.storeName} - متجر الأزياء`;
  }
}

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const cached = localStorage.getItem('atelier_store_settings_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        applyThemeVariables(parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    applyThemeVariables(DEFAULT_STORE_SETTINGS);
    return DEFAULT_STORE_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fetch settings from server
  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          applyThemeVariables(data.settings);
          try {
            localStorage.setItem('atelier_store_settings_cache', JSON.stringify(data.settings));
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch store settings from server:', err);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Apply theme variables whenever settings change
  useEffect(() => {
    applyThemeVariables(settings);
  }, [settings]);

  // Apply preset
  const applyPalettePreset = useCallback((presetId: string) => {
    const preset = COLOR_PALETTES.find(p => p.id === presetId);
    if (!preset) return;

    setSettings(prev => {
      const updated: StoreSettings = {
        ...prev,
        theme: {
          presetId: preset.id,
          primary: preset.primary,
          primaryHover: preset.primaryHover,
          primaryText: preset.primaryText,
          accent: preset.accent,
          backgroundColor: preset.backgroundColor || preset.darkBg || '#0d1015',
          cardBackground: preset.cardBackground || preset.darkCardBg || '#151921',
          textColor: preset.textColor || '#f5f5f5',
          navBackground: preset.navBackground || preset.cardBackground || '#0f1217',
          borderColor: preset.borderColor || '#262d38',
          darkBg: preset.darkBg || preset.backgroundColor,
          lightBg: preset.lightBg || preset.backgroundColor,
          darkCardBg: preset.darkCardBg || preset.cardBackground,
          lightCardBg: preset.lightCardBg || preset.cardBackground
        }
      };
      applyThemeVariables(updated);
      return updated;
    });
  }, []);

  // Update settings and save to backend if auth token available
  const updateSettings = useCallback(async (newPartial: Partial<StoreSettings>): Promise<boolean> => {
    let mergedSettings: StoreSettings = DEFAULT_STORE_SETTINGS;

    setSettings(prev => {
      mergedSettings = {
        ...prev,
        ...newPartial,
        theme: {
          ...prev.theme,
          ...(newPartial.theme || {})
        },
        announcementBar: {
          ...prev.announcementBar,
          ...(newPartial.announcementBar || {})
        },
        automatedMessages: {
          ...prev.automatedMessages,
          ...(newPartial.automatedMessages || {})
        }
      };
      applyThemeVariables(mergedSettings);
      return mergedSettings;
    });

    try {
      localStorage.setItem('atelier_store_settings_cache', JSON.stringify(mergedSettings));
    } catch {
      // ignore
    }

    return true;
  }, []);

  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    return await updateSettings(DEFAULT_STORE_SETTINGS);
  }, [updateSettings]);

  return (
    <StoreSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        applyPalettePreset,
        resetToDefaults,
        isLoading,
        refreshSettings
      }}
    >
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};
