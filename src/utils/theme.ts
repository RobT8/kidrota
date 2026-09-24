import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kidrota.theme';

/**
 * What the user picked. `system` means "follow the OS".
 *
 * Defaults to light rather than system: the planner's carer colours were
 * designed light-first, so that is the intended first impression. Anyone who
 * prefers otherwise can switch in Settings.
 */
export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light';
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve a preference to the concrete theme the CSS should use. */
function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light';
  return preference;
}

function apply(preference: ThemePreference): void {
  const theme = resolve(preference);
  document.documentElement.dataset.theme = theme;
  matchSystemBars(theme);
}

/**
 * Colour Android's status bar and navigation buttons for the app's theme.
 *
 * Left alone, Capacitor follows the phone's dark-mode setting instead. With
 * the phone dark and KidRota light, that drew white back/home/recents buttons
 * over the white bottom sheets, where they vanished. "Light" here means the
 * light background style — dark icons.
 */
function matchSystemBars(theme: 'light' | 'dark'): void {
  if (!Capacitor.isNativePlatform()) return;
  SystemBars.setStyle({
    style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
  }).catch(() => {
    // Cosmetic only; the app works the same without it.
  });
}

export function setThemePreference(preference: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, preference);
  apply(preference);
}

/**
 * Apply the stored theme and keep it in sync with the OS while the preference
 * is `system`. Call once on startup.
 */
export function initTheme(): void {
  apply(getThemePreference());
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (getThemePreference() === 'system') apply('system');
    });
}
