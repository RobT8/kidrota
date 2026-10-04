import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_PRESETS,
  parseTimePresets,
  removePreset,
  upsertPreset,
  type TimePreset,
} from '../timePresets';

const club: TimePreset = { id: 'club', label: 'School club', start: '08:30', end: '15:30' };

describe('parseTimePresets', () => {
  it('starts with Morning, Afternoon and All day', () => {
    expect(parseTimePresets(null).map((p) => p.label)).toEqual(['Morning', 'Afternoon', 'All day']);
  });

  it('keeps an empty list: removing every preset is a choice', () => {
    expect(parseTimePresets('[]')).toEqual([]);
  });

  it('falls back to the defaults when the stored value is unreadable', () => {
    expect(parseTimePresets('{not json')).toEqual(DEFAULT_TIME_PRESETS);
    expect(parseTimePresets('{"a":1}')).toEqual(DEFAULT_TIME_PRESETS);
  });

  it('drops entries with impossible times', () => {
    const stored = JSON.stringify([club, { id: 'x', label: 'Bad', start: '15:00', end: '09:00' }]);
    expect(parseTimePresets(stored)).toEqual([club]);
  });
});

describe('upsertPreset', () => {
  it('adds a preset at the end', () => {
    const list = upsertPreset(DEFAULT_TIME_PRESETS, club);
    expect(list.map((p) => p.id)).toEqual(['morning', 'afternoon', 'all-day', 'club']);
  });

  it('edits a preset in place by id', () => {
    const list = upsertPreset(DEFAULT_TIME_PRESETS, { id: 'morning', label: 'Early', start: '07:30', end: '12:00' });
    expect(list.find((p) => p.id === 'morning')).toEqual({ id: 'morning', label: 'Early', start: '07:30', end: '12:00' });
    expect(list.map((p) => p.id)).toEqual(['morning', 'afternoon', 'all-day']);
  });

  it('never lists the same times twice', () => {
    const list = upsertPreset(DEFAULT_TIME_PRESETS, { id: 'new', label: 'AM', start: '08:00', end: '12:00' });
    expect(list.filter((p) => p.start === '08:00' && p.end === '12:00')).toEqual([
      { id: 'new', label: 'AM', start: '08:00', end: '12:00' },
    ]);
  });

  it('names an unnamed preset after its times', () => {
    expect(upsertPreset([], { ...club, label: '  ' })[0].label).toBe('08:30–15:30');
  });
});

describe('removePreset', () => {
  it('removes a default like any other', () => {
    expect(removePreset(DEFAULT_TIME_PRESETS, 'all-day').map((p) => p.id)).toEqual(['morning', 'afternoon']);
  });
});
