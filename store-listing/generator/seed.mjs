// Demo plan for store screenshots.
const iso = (d) => d.toISOString().slice(0, 10);
const days = (a, b) => { const out = []; for (let d = new Date(a + 'T00:00:00Z'); iso(d) <= b; d.setUTCDate(d.getUTCDate() + 1)) if (![0,6].includes(d.getUTCDay())) out.push(iso(d)); return out; };
const now = '2026-09-20T10:00:00.000Z';
export const children = [
  { id: 1, name: 'Maisie', colour: '#E2725B', sort_order: 0 },
  { id: 2, name: 'Leo', colour: '#378ADD', sort_order: 1 },
];
export const carers = [
  { id: 1, name: 'Mum', short_name: 'Mum', type: 'parent', cost_per_day: null, colour: null, sort_order: 0 },
  { id: 2, name: 'Dad', short_name: 'Dad', type: 'parent', cost_per_day: null, colour: null, sort_order: 1 },
  { id: 3, name: 'Grandma', short_name: 'Gran', type: 'family', cost_per_day: null, colour: null, sort_order: 2 },
  { id: 4, name: 'Grandad', short_name: 'Gramps', type: 'family', cost_per_day: null, colour: null, sort_order: 3 },
  { id: 5, name: 'Holiday club', short_name: 'Club', type: 'club', cost_per_day: 35, colour: null, sort_order: 4 },
  { id: 6, name: 'Playdate', short_name: 'Play', type: 'playdate', cost_per_day: null, colour: null, sort_order: 5 },
];
export const holidays = [
  { id: 1, name: 'October half term', start_date: '2026-10-26', end_date: '2026-10-30', mode: 'simple', exclude_weekends: 1, created_at: now, updated_at: now },
  { id: 2, name: 'Christmas holidays', start_date: '2026-12-21', end_date: '2027-01-01', mode: 'simple', exclude_weekends: 1, created_at: now, updated_at: now },
  { id: 3, name: 'February half term', start_date: '2027-02-15', end_date: '2027-02-19', mode: 'simple', exclude_weekends: 1, created_at: now, updated_at: now },
];
// [carerAm, carerPm] per weekday per child; null = gap; same both = all_day
const half = {
  Maisie: [[3,3],[5,5],[5,5],[1,6],[2,2]],
  Leo:    [[3,3],[5,5],[5,null],[1,6],[2,null]],
};
const xmas = {
  Maisie: [[1,1],[3,3],[2,2],[null,null],[null,null],[null,null],[4,4],[4,4],[null,null],[null,null]],
  Leo:    [[1,1],[3,3],[2,2],[null,null],[null,null],[null,null],[4,4],[4,4],[null,null],[null,null]],
};
export const assignments = [];
const add = (hid, dates, plan, childId) => dates.forEach((date, i) => {
  const [am, pm] = plan[i] ?? [null, null];
  {
    if (am) assignments.push({ holiday_id: hid, child_id: childId, carer_id: am, date, period: 'am', start_time: null, end_time: null, notes: null, cost: null });
    if (pm) assignments.push({ holiday_id: hid, child_id: childId, carer_id: pm, date, period: 'pm', start_time: null, end_time: null, notes: null, cost: null });
  }
});
const ht = days('2026-10-26', '2026-10-30'), xm = days('2026-12-21', '2027-01-01');
add(1, ht, half.Maisie, 1); add(1, ht, half.Leo, 2);
add(2, xm, xmas.Maisie, 1); add(2, xm, xmas.Leo, 2);
const fb = days('2027-02-15', '2027-02-19'); const feb = [[3,3],[3,3],[null,null],[null,null],[null,null]];
add(3, fb, feb, 1); add(3, fb, feb, 2);
assignments.forEach((a, i) => (a.id = i + 1));
export const dayNotes = [
  { holiday_id: 1, date: '2026-10-27', note: 'Pack swimming kit + packed lunch' },
  { holiday_id: 1, date: '2026-10-29', note: 'Playdate at the Patels’ from 1pm' },
];
export const backup = { app: 'kidrota', schemaVersion: 1, exportedAt: now, children, carers, holidays, assignments, dayNotes, settings: { onboarding_complete: 'true' } };
