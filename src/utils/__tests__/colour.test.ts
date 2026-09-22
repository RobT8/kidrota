import { describe, expect, it } from 'vitest';
import { carerSwatch, contrast, initialOf, textOn } from '../colour';
import { CARER_COLOURS, CARER_TYPE_VARS, CHILD_COLOURS } from '../constants';

describe('textOn', () => {
  it('picks white on dark backgrounds and near-black on light ones', () => {
    expect(textOn('#000000')).toBe('#FFFFFF');
    expect(textOn('#0C447C')).toBe('#FFFFFF');
    expect(textOn('#FFFFFF')).toBe('#1A1A1A');
    expect(textOn('#F5F3EE')).toBe('#1A1A1A');
  });

  it('always picks the better of the two, never just the darker background', () => {
    for (const colour of [...CHILD_COLOURS, '#185FA5', '#E8A33D', '#808080']) {
      const chosen = contrast(colour, textOn(colour));
      const other = contrast(colour, textOn(colour) === '#FFFFFF' ? '#1A1A1A' : '#FFFFFF');
      expect(chosen).toBeGreaterThanOrEqual(other);
    }
  });

  it('keeps every child avatar legible', () => {
    // A fixed white initial would sit near 2:1 on the lighter presets, which
    // is why the colour is chosen by luminance rather than hard-coded.
    for (const colour of CHILD_COLOURS) {
      // WCAG AA for normal-size text.
      expect(contrast(colour, textOn(colour))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('handles shorthand hex', () => {
    expect(textOn('#fff')).toBe('#1A1A1A');
    expect(textOn('#000')).toBe('#FFFFFF');
  });

  it('falls back to white for an unparseable colour rather than throwing', () => {
    expect(textOn('not-a-colour')).toBe('#FFFFFF');
  });
});

describe('initialOf', () => {
  it('takes the first letter, uppercased', () => {
    expect(initialOf('Ada')).toBe('A');
    expect(initialOf('bo')).toBe('B');
  });

  it('ignores leading whitespace', () => {
    expect(initialOf('  Ada')).toBe('A');
  });

  it('falls back to ? for a blank name', () => {
    expect(initialOf('')).toBe('?');
    expect(initialOf('   ')).toBe('?');
  });
});

describe('carerSwatch', () => {
  it('uses the type tokens when no custom colour is set', () => {
    expect(carerSwatch({ type: 'family', colour: null })).toEqual(CARER_TYPE_VARS.family);
  });

  it('picks readable text for every custom carer colour', () => {
    for (const colour of CARER_COLOURS) {
      const { bg, text } = carerSwatch({ type: 'club', colour });
      expect(bg).toBe(colour);
      expect(contrast(bg, text)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
