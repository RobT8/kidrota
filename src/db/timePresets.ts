import { parseTimePresets, type TimePreset } from '../utils/timePresets';
import { getSetting, setSetting } from './settings';

/** Stored in app_settings, so backups carry it like any other setting. */
export const TIME_PRESETS_KEY = 'time_presets';

export async function listTimePresets(): Promise<TimePreset[]> {
  return parseTimePresets(await getSetting(TIME_PRESETS_KEY));
}

export async function saveTimePresets(presets: TimePreset[]): Promise<void> {
  await setSetting(TIME_PRESETS_KEY, JSON.stringify(presets));
}
