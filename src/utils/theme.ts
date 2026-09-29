import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'kidrota.theme';

/**
 * What the user picked: light or dark.
 *
 * Defaults to light: the planner's carer colours were designed light-first,
 * so that is the intended first impression. Anyone who prefers dark can
 * switch in Settings.
 *
 * There used to be a third choice, "System", which followed the phone's own
 * setting. It looked identical to whichever of the two the phone was on, so
 * it went; anyone who had it keeps the look they had, turned into that
 * concrete choice the first time this reads it.
 */
export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (stored === 'system') {
    const kept: ThemePreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, kept);
    return kept;
  }
  return 'light';
}

function apply(theme: ThemePreference): void {
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

/** Apply the stored theme. Call once on startup. */
export function initTheme(): void {
  apply(getThemePreference());
}
