import { describe, expect, it } from 'vitest';
import { SHARE_PREFIX, ShareCodeError, decodePlan, encodePlan, extractShareCode, planMessage } from '../shareCode';
import type { Assignment, Carer, Child, Holiday } from '../../db/types';

const holiday: Holiday = {
  id: 1, name: 'October half term', start_date: '2026-10-19', end_date: '2026-10-30',
  mode: 'simple', exclude_weekends: 1, created_at: '', updated_at: '',
};

const children: Child[] = [
  { id: 7, name: 'Ada', colour: '#378ADD', sort_order: 0 },
  { id: 9, name: 'Bo', colour: '#E2725B', sort_order: 1 },
];

const carers: Carer[] = [
  { id: 3, name: 'Grandma', short_name: 'Gran', type: 'family', cost_per_day: null, colour: null, sort_order: 0 },
  { id: 5, name: 'Holiday club', short_name: 'Club', type: 'club', cost_per_day: 32.5, colour: null, sort_order: 1 },
];

const assignment = (over: Partial<Assignment>): Assignment => ({
  id: 1, holiday_id: 1, child_id: 7, carer_id: 3, date: '2026-10-19',
  period: 'am', start_time: null, end_time: null, notes: null, cost: null, ...over,
});

const plan = {
  holiday,
  children,
  carers,
  assignments: [
    assignment({ id: 1, child_id: 7, carer_id: 3, date: '2026-10-19', period: 'am' }),
    assignment({ id: 2, child_id: 9, carer_id: 5, date: '2026-10-20', period: 'pm', cost: 32.5, notes: 'swimming' }),
  ],
  dayNotes: [{ date: '2026-10-19', note: 'pack swimming kit' }],
};

describe('round trip', () => {
  it('preserves the holiday', () => {
    const decoded = decodePlan(encodePlan(plan));
    expect(decoded.holiday).toEqual({
      name: 'October half term', start_date: '2026-10-19', end_date: '2026-10-30',
      mode: 'simple', exclude_weekends: 1,
    });
  });

  it('preserves children and carers in order', () => {
    const decoded = decodePlan(encodePlan(plan));
    expect(decoded.children).toEqual([
      { name: 'Ada', colour: '#378ADD' },
      { name: 'Bo', colour: '#E2725B' },
    ]);
    expect(decoded.carers[1]).toEqual({
      name: 'Holiday club', short_name: 'Club', type: 'club', cost_per_day: 32.5,
    });
  });

  it('preserves assignments, including who they point at', () => {
    const decoded = decodePlan(encodePlan(plan));
    expect(decoded.assignments).toHaveLength(2);
    expect(decoded.assignments[0]).toMatchObject({
      childIndex: 0, carerIndex: 0, date: '2026-10-19', period: 'am',
    });
    expect(decoded.assignments[1]).toMatchObject({
      childIndex: 1, carerIndex: 1, date: '2026-10-20', period: 'pm', cost: 32.5, notes: 'swimming',
    });
  });

  it('preserves day notes', () => {
    const decoded = decodePlan(encodePlan(plan));
    expect(decoded.dayNotes).toEqual([{ date: '2026-10-19', note: 'pack swimming kit' }]);
  });

  it('preserves detailed-mode time slots', () => {
    const detailed = {
      ...plan,
      holiday: { ...holiday, mode: 'detailed' as const },
      assignments: [
        assignment({ period: null, start_time: '09:00', end_time: '12:30' }),
      ],
    };
    const decoded = decodePlan(encodePlan(detailed));
    expect(decoded.holiday.mode).toBe('detailed');
    expect(decoded.assignments[0]).toMatchObject({
      period: null, start_time: '09:00', end_time: '12:30',
    });
  });

  it('survives names with accents, emoji and punctuation', () => {
    const awkward = {
      ...plan,
      children: [{ id: 7, name: 'Zoë 🎈', colour: '#378ADD', sort_order: 0 }],
      carers: [{ id: 3, name: "Nan & Grandad's", short_name: 'Nan', type: 'family' as const, cost_per_day: null, colour: null, sort_order: 0 }],
      assignments: [assignment({ child_id: 7, carer_id: 3 })],
    };
    const decoded = decodePlan(encodePlan(awkward));
    expect(decoded.children[0].name).toBe('Zoë 🎈');
    expect(decoded.carers[0].name).toBe("Nan & Grandad's");
  });

  it('handles a holiday with nothing planned', () => {
    const decoded = decodePlan(encodePlan({ ...plan, assignments: [], dayNotes: [] }));
    expect(decoded.assignments).toEqual([]);
    expect(decoded.dayNotes).toEqual([]);
  });

  it('handles dates before the holiday start without corrupting them', () => {
    // Defensive: a stray assignment dated earlier encodes as a negative offset.
    const decoded = decodePlan(
      encodePlan({ ...plan, assignments: [assignment({ date: '2026-10-16' })] }),
    );
    expect(decoded.assignments[0].date).toBe('2026-10-16');
  });
});

describe('size', () => {
  it('keeps a full fortnight small enough to paste into a message', () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2026-10-${19 + (i < 5 ? i : i + 2)}`);
    const many = dates.flatMap((date, i) =>
      [7, 9].flatMap((child) =>
        (['am', 'pm'] as const).map((period) =>
          assignment({ id: i * 10 + child, child_id: child, carer_id: 3, date, period }),
        ),
      ),
    );
    const code = encodePlan({ ...plan, assignments: many });
    expect(many).toHaveLength(40);
    // Measured at roughly 1.1KB. The guard is a regression check: if the
    // format ever bloats past this, the code stops being comfortable to paste.
    expect(code.length).toBeLessThan(1400);
    console.log(`    fortnight, 2 children, 40 assignments: ${code.length} characters`);
  });
});

describe('rejecting bad codes', () => {
  it('rejects text that is not a plan code', () => {
    expect(() => decodePlan('hello')).toThrow(ShareCodeError);
    expect(() => decodePlan('')).toThrow(/does not look like/);
  });

  it('rejects a truncated code', () => {
    const code = encodePlan(plan);
    expect(() => decodePlan(code.slice(0, code.length - 12))).toThrow(ShareCodeError);
  });

  it('rejects a code from another version', () => {
    const other = SHARE_PREFIX + btoa(JSON.stringify({ v: 99, h: [], c: [], k: [], a: [], n: [] }));
    expect(() => decodePlan(other)).toThrow(/different version/);
  });

  it('rejects a code missing its tables', () => {
    const broken = SHARE_PREFIX + btoa(JSON.stringify({ v: 1, h: ['a', 'b', 'c', 'simple', 1] }));
    expect(() => decodePlan(broken)).toThrow(/incomplete or damaged/);
  });

  it('tolerates surrounding whitespace from a paste', () => {
    expect(() => decodePlan(`  \n${encodePlan(plan)}\n `)).not.toThrow();
  });

  it('drops assignments pointing at someone who is not in the code', () => {
    const decoded = decodePlan(
      encodePlan({ ...plan, assignments: [assignment({ child_id: 999 }), assignment({ carer_id: 999 })] }),
    );
    expect(decoded.assignments).toEqual([]);
  });
});

describe('pasting a whole message', () => {
  it('finds the code inside the message it was sent in', () => {
    const code = encodePlan(plan);
    const pasted = `[25/09, 10:14] Rob: ${planMessage('October half term', code)}`;
    expect(extractShareCode(pasted)).toBe(code);
    expect(decodePlan(pasted).holiday.name).toBe(decodePlan(code).holiday.name);
  });

  it('stops at the end of the code when text follows it', () => {
    const code = encodePlan(plan);
    expect(extractShareCode(`${code} see you Monday!`)).toBe(code);
  });

  it('still takes a bare code', () => {
    const code = encodePlan(plan);
    expect(extractShareCode(`  ${code}\n`)).toBe(code);
  });

  it('says so when there is no code at all', () => {
    expect(extractShareCode('open this in KidRota to load the plan')).toBeNull();
    expect(() => decodePlan('open this in KidRota')).toThrow('does not look like a KidRota plan code');
  });

  it('puts the instructions before the code, which comes last', () => {
    const message = planMessage('Summer', 'KIDROTA1:abc');
    expect(message).toContain('Settings');
    expect(message).toContain('Add a plan someone sent you');
    expect(message.endsWith('KIDROTA1:abc')).toBe(true);
  });
});

describe('planMessage wording', () => {
  it('points at the code below rather than the whole message', () => {
    const message = planMessage('Summer', 'KIDROTA1:abc');
    expect(message).toContain('then paste the text below.');
    expect(message).not.toContain('whole message');
  });
});

describe('refusing damaged or hand-made codes', () => {
  /** A code built from the compact form, the way a damaged or edited code arrives. */
  function codeOf(compact: unknown): string {
    const bytes = new TextEncoder().encode(JSON.stringify(compact));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return SHARE_PREFIX + btoa(binary);
  }
  const good = {
    v: 1,
    h: ['October half term', '2026-10-19', '2026-10-23', 'simple', 1],
    c: [['Ada', '#378ADD']],
    k: [['Grandma', 'Gran', 'family', null]],
    a: [[0, 0, 0, 'am'], [0, 0, 1, null, '09:00', '12:00']],
    n: [[0, 'pack swimming kit']],
  };

  it('accepts a well-formed code', () => {
    const decoded = decodePlan(codeOf(good));
    expect(decoded.assignments).toHaveLength(2);
    expect(decoded.assignments[1]).toMatchObject({ date: '2026-10-20', start_time: '09:00', end_time: '12:00' });
  });

  it.each([
    ['an unknown carer type', { k: [['Bob', 'Bob', 'hacker', null]] }],
    ['a colour that could load a web address', { c: [['Ada', 'url(https://example.invalid/x)']] }],
    ['a name that is not text', { k: [[123, 'B', 'family', null]] }],
    ['an empty name', { c: [['  ', '#378ADD']] }],
    ['a start date that is not a date', { h: ['X', 'garbage', '2026-10-23', 'simple', 1] }],
    ['an impossible date', { h: ['X', '2026-02-30', '2026-03-02', 'simple', 1] }],
    ['dates the wrong way round', { h: ['X', '2026-10-23', '2026-10-19', 'simple', 1] }],
    ['an unknown planning mode', { h: ['X', '2026-10-19', '2026-10-23', 'weird', 1] }],
    ['a weekend flag that is not 0 or 1', { h: ['X', '2026-10-19', '2026-10-23', 'simple', 'yes'] }],
    ['day notes that are not a list', { n: 'notarray' }],
    ['a slot period the app never makes', { a: [[0, 0, 0, 'all_day']] }],
    ['a timed session ending before it starts', { a: [[0, 0, 0, null, '12:00', '09:00']] }],
    ['a slot with times as well', { a: [[0, 0, 0, 'am', '09:00', '12:00']] }],
    ['a day offset centuries away', { a: [[0, 0, 100000, 'am']] }],
    ['a negative cost', { k: [['Grandma', 'Gran', 'family', -5]] }],
    ['far too many children', { c: Array.from({ length: 21 }, (_, i) => [`Child ${i}`, '#378ADD']) }],
  ])('refuses %s', (_what, change) => {
    expect(() => decodePlan(codeOf({ ...good, ...change }))).toThrow(ShareCodeError);
  });

  it('refuses a holiday longer than the app can plan, saying why', () => {
    expect(() => decodePlan(codeOf({ ...good, h: ['Year', '2026-09-01', '2027-08-31', 'simple', 1] }))).toThrow(/longer than KidRota can hold/);
  });

  it('refuses an enormous paste quickly', () => {
    const started = Date.now();
    expect(() => decodePlan(`${'x'.repeat(1_000_000)} ${SHARE_PREFIX}${'A'.repeat(1_000_000)}`)).toThrow(ShareCodeError);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
