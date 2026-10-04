import type { RepeatRule } from '../db/assignments';
import { dayOfWeek } from '../utils/dates';
import type { DayRule } from '../utils/dayRule';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PICKABLE = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

interface DayRulePickerProps {
  /** The day on screen. */
  date: string;
  /** Every date in the holiday, so "Pick days" only offers days it has. */
  holidayDates: string[];
  value: DayRule;
  onChange: (value: DayRule) => void;
  /** Offer "Just this day" — the session form does; the copy-the-day card does not. */
  allowJustThisDay?: boolean;
  disabled?: boolean;
}

/**
 * Choose which days something applies to: just this one, every day, every
 * Tuesday, Mon–Fri, or days picked by hand. Choosing only selects — the
 * screen's Save button applies it, so nothing changes by accident.
 */
export default function DayRulePicker({
  date,
  holidayDates,
  value,
  onChange,
  allowJustThisDay = false,
  disabled = false,
}: DayRulePickerProps) {
  const weekdayName = WEEKDAY_NAMES[dayOfWeek(date)];
  const inHoliday = new Set(holidayDates.map(dayOfWeek));
  const hasWeekend = inHoliday.has(0) || inHoliday.has(6);

  const options: { rule: RepeatRule | null; label: string }[] = [
    ...(allowJustThisDay ? [{ rule: null, label: 'Just this day' }] : []),
    { rule: 'daily', label: 'Every day' },
    { rule: 'weekly', label: `Every ${weekdayName}` },
    // On a weekdays-only holiday "Mon–Fri" is the same as "Every day".
    ...(hasWeekend ? [{ rule: 'weekdays' as const, label: 'Mon–Fri' }] : []),
    { rule: 'custom', label: 'Pick days' },
  ];

  function toggleDay(day: number) {
    const days = value.days.includes(day) ? value.days.filter((item) => item !== day) : [...value.days, day];
    onChange({ rule: 'custom', days });
  }

  return (
    <div className="day-rule">
      <div className="chips">
        {options.map((option) => {
          const selected = value.rule === option.rule;
          return (
            <button
              key={option.label}
              type="button"
              className={selected ? 'chip chip--choice chip--choice-selected' : 'chip chip--choice'}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange({ rule: option.rule, days: option.rule === 'custom' ? value.days : [] })}
            >
              {selected && <span aria-hidden="true">✓</span>}
              {option.label}
            </button>
          );
        })}
      </div>

      {value.rule === 'custom' && (
        <div className="day-rule__days" role="group" aria-label="Days of the week">
          {PICKABLE.filter((option) => inHoliday.has(option.day)).map((option) => {
            const selected = value.days.includes(option.day);
            return (
              <button
                key={option.day}
                type="button"
                className={selected ? 'day-pick day-pick--selected' : 'day-pick'}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggleDay(option.day)}
              >
                <span className="day-pick__tick" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
