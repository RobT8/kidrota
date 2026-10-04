import { useState } from 'react';
import type { RepeatRule } from '../db/assignments';
import DayRulePicker from './DayRulePicker';
import { JUST_THIS_DAY, type DayRule } from '../utils/dayRule';

interface RepeatChipsProps {
  /** The day being copied from. */
  date: string;
  holidayDates: string[];
  /** Nothing to repeat until something is booked. */
  disabled: boolean;
  /** Resolves to the number of days written to. */
  onRepeat: (rule: RepeatRule, customDays?: number[]) => Promise<number>;
}

/**
 * Copy this day's whole plan, every child, onto other days.
 *
 * Most holiday weeks are the same shape every day, so this turns a fortnight
 * of planning into one day plus a tap. Choosing the days only selects them;
 * Save applies it and says how many days it went to.
 */
export default function RepeatChips({ date, holidayDates, disabled, onRepeat }: RepeatChipsProps) {
  const [choice, setChoice] = useState<DayRule>(JUST_THIS_DAY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const ready = choice.rule !== null && (choice.rule !== 'custom' || choice.days.length > 0);

  async function save() {
    if (!choice.rule) return;
    setBusy(true);
    setDone(null);
    try {
      const count = await onRepeat(choice.rule, choice.days);
      setDone(count === 0 ? 'No other days matched' : `Saved ✓ Copied to ${count} ${count === 1 ? 'day' : 'days'}`);
      setChoice(JUST_THIS_DAY);
    } catch {
      setDone('Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="repeat card">
      <h2 className="repeat__title">Copy this whole day</h2>
      <p className="repeat__hint">
        {disabled
          ? 'Book someone above first, then copy this day to others.'
          : 'Copies every child’s plan for this day. It replaces what those days had.'}
      </p>

      <DayRulePicker
        date={date}
        holidayDates={holidayDates}
        value={choice}
        onChange={(value) => {
          setDone(null);
          setChoice(value);
        }}
        disabled={disabled || busy}
      />

      <button
        type="button"
        className="button button--primary"
        disabled={disabled || busy || !ready}
        onClick={save}
      >
        {busy ? 'Saving…' : 'Save'}
      </button>

      {done && (
        <p className="save-confirm" role="status">
          {done}
        </p>
      )}
    </section>
  );
}
