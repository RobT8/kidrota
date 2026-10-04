import { DAY_END, DAY_START, isValidRange } from './timeSlots';

/**
 * One-tap times offered when adding a session — Morning, Afternoon, All day,
 * plus any the parent saves for themselves ("School club 08:30–15:30").
 *
 * They are the parent's own list: the starting three can be renamed, retimed
 * or removed like any saved one, so the day screen shows only what they use.
 */
export interface TimePreset {
  id: string;
  label: string;
  start: string;
  end: string;
}

export const MAX_PRESET_LABEL = 16;

/** What a new install starts with. */
export const DEFAULT_TIME_PRESETS: TimePreset[] = [
  { id: 'morning', label: 'Morning', start: DAY_START, end: '12:00' },
  { id: 'afternoon', label: 'Afternoon', start: '12:00', end: DAY_END },
  { id: 'all-day', label: 'All day', start: DAY_START, end: DAY_END },
];

function isPreset(value: unknown): value is TimePreset {
  const preset = value as TimePreset;
  return (
    typeof preset === 'object' &&
    preset !== null &&
    typeof preset.id === 'string' &&
    typeof preset.label === 'string' &&
    preset.label.trim() !== '' &&
    isValidRange(preset.start, preset.end)
  );
}

/**
 * Read the stored list. Nothing stored means the defaults; an empty list is
 * kept, because removing every preset is a choice. Anything unreadable falls
 * back to the defaults rather than breaking the day screen.
 */
export function parseTimePresets(stored: string | null): TimePreset[] {
  if (stored === null) return DEFAULT_TIME_PRESETS;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return DEFAULT_TIME_PRESETS;
    return parsed.filter(isPreset).map((preset) => ({
      id: preset.id,
      label: preset.label.trim().slice(0, MAX_PRESET_LABEL),
      start: preset.start,
      end: preset.end,
    }));
  } catch {
    return DEFAULT_TIME_PRESETS;
  }
}

/**
 * Add a preset at the end, or edit the one with the same id where it is.
 * Saving times that are already a preset replaces that one, so the list
 * never shows the same times twice.
 */
export function upsertPreset(presets: TimePreset[], preset: TimePreset): TimePreset[] {
  const label = preset.label.trim().slice(0, MAX_PRESET_LABEL) || `${preset.start}–${preset.end}`;
  const clean = { ...preset, label };
  const sameTimes = (item: TimePreset) => item.start === preset.start && item.end === preset.end;
  const at = presets.findIndex((item) => item.id === preset.id || sameTimes(item));
  const others = presets.filter((item) => item.id !== preset.id && !sameTimes(item));
  if (at === -1) return [...others, clean];
  return [...others.slice(0, at), clean, ...others.slice(at)];
}

export function removePreset(presets: TimePreset[], id: string): TimePreset[] {
  return presets.filter((item) => item.id !== id);
}

/** A fresh id that cannot collide with the defaults' readable ones. */
export function newPresetId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
