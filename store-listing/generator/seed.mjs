// Demo plan for store screenshots and the video. The summer holidays lead,
// since parents everywhere recognise them; two shorter breaks fill the home screen.
const iso = (d) => d.toISOString().slice(0, 10);
const days = (a, b) => { const out = []; for (let d = new Date(a + 'T00:00:00Z'); iso(d) <= b; d.setUTCDate(d.getUTCDate() + 1)) if (![0, 6].includes(d.getUTCDay())) out.push(iso(d)); return out; };
const now = '2026-09-20T10:00:00.000Z';
export const children = [
  { id: 1, name: 'Maisie', colour: '#E2725B', sort_order: 0 },
  { id: 2, name: 'Leo', colour: '#378ADD', sort_order: 1 },
];
// Carer ids: 1 Mum, 2 Dad, 3 Grandma, 4 Grandad, 5 Holiday club, 6 Playdate
export const carers = [
  { id: 1, name: 'Mum', short_name: 'Mum', type: 'parent', cost_per_day: null, colour: null, sort_order: 0 },
  { id: 2, name: 'Dad', short_name: 'Dad', type: 'parent', cost_per_day: null, colour: null, sort_order: 1 },
  { id: 3, name: 'Grandma', short_name: 'Gran', type: 'family', cost_per_day: null, colour: null, sort_order: 2 },
  { id: 4, name: 'Grandad', short_name: 'Gramps', type: 'family', cost_per_day: null, colour: null, sort_order: 3 },
  { id: 5, name: 'Holiday club', short_name: 'Club', type: 'club', cost_per_day: 35, colour: null, sort_order: 4 },
  { id: 6, name: 'Playdate', short_name: 'Play', type: 'playdate', cost_per_day: null, colour: null, sort_order: 5 },
];
const h = (id, name, start_date, end_date) => ({ id, name, start_date, end_date, mode: 'simple', exclude_weekends: 1, created_at: now, updated_at: now });
export const holidays = [
  h(1, 'Summer holidays', '2027-07-26', '2027-09-03'),
  h(2, 'October half term', '2026-10-26', '2026-10-30'),
  h(3, 'Christmas holidays', '2026-12-21', '2027-01-01'),
];
// Per weekday [am, pm] carer ids; null is a gap.
const G = [3, 3], C = [5, 5], M = [1, 1], D = [2, 2], P = [1, 6], X = [null, null];
const summer = {
  // Week 1 is the one on screen: nearly planned, with two afternoon gaps for Leo.
  Maisie: [G, C, C, P, D,   C, C, C, G, G,   M, M, D, D, X,   C, C, C, X, X,   X, X, G, G, X,   X, X, X, X, X],
  Leo:    [G, C, [5, null], P, [2, null],   C, C, C, G, G,   M, M, D, D, X,   C, C, C, X, X,   X, X, G, G, X,   X, X, X, X, X],
};
const half = [G, C, C, P, D];
const xmas = [M, G, D, X, X, X, [4, 4], [4, 4], X, X];
export const assignments = [];
const add = (hid, dates, plan, childId) => dates.forEach((date, i) => {
  const [am, pm] = plan[i] ?? [null, null];
  for (const [period, carer] of [['am', am], ['pm', pm]]) {
    if (carer) assignments.push({ holiday_id: hid, child_id: childId, carer_id: carer, date, period, start_time: null, end_time: null, notes: null, cost: null });
  }
});
const su = days('2027-07-26', '2027-09-03'); add(1, su, summer.Maisie, 1); add(1, su, summer.Leo, 2);
const ht = days('2026-10-26', '2026-10-30'); add(2, ht, half, 1); add(2, ht, half, 2);
const xm = days('2026-12-21', '2027-01-01'); add(3, xm, xmas, 1); add(3, xm, xmas, 2);
assignments.forEach((a, i) => (a.id = i + 1));
export const dayNotes = [
  { holiday_id: 1, date: '2027-07-27', note: 'Pack swimming kit + packed lunch' },
];
export const backup = { app: 'kidrota', schemaVersion: 1, exportedAt: now, children, carers, holidays, assignments, dayNotes, settings: { onboarding_complete: 'true' } };
