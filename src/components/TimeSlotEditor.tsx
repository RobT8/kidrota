import { useState } from 'react';
import { applySession, removeSession, repeatTargets, type SessionShape } from '../db/assignments';
import { createCarer } from '../db/carers';
import type { Assignment, Carer, Child } from '../db/types';
import { carerSwatch } from '../utils/colour';
import type { CarerType } from '../utils/constants';
import { suggestShortName } from '../utils/status';
import { MAX_PRESET_LABEL, newPresetId, type TimePreset } from '../utils/timePresets';
import { defaultRange, formatRange, gapChoices, isValidRange, overlapping } from '../utils/timeSlots';
import CarerPicker from './CarerPicker';
import DayRulePicker from './DayRulePicker';
import { JUST_THIS_DAY, type DayRule } from '../utils/dayRule';
import QuickAddCarer from './QuickAddCarer';

interface TimeSlotEditorProps {
  holidayId: number;
  /** Every date in the holiday, for "Which days?". */
  holidayDates: string[];
  child: Child;
  date: string;
  slots: Assignment[];
  carers: Carer[];
  carersById: Map<number, Carer>;
  /** The other children and their sessions today, for "Also for …". */
  siblings: { child: Child; slots: Assignment[] }[];
  presets: TimePreset[];
  /** Save a new one-tap time from typed times. */
  onAddPreset: (preset: TimePreset) => Promise<void>;
  onManagePresets: () => void;
  onChanged: () => Promise<void>;
}

/** Adding a new session, or changing an existing one. */
type Editing = { kind: 'add' } | { kind: 'edit'; slot: Assignment } | null;

/** The chosen one-tap time, or "custom" for typed From/To times. */
const CUSTOM = 'custom';

function shapeOf(slot: Assignment): SessionShape {
  return { carer_id: slot.carer_id, start_time: slot.start_time ?? '', end_time: slot.end_time ?? '' };
}

function sameSession(slot: Assignment, shape: SessionShape): boolean {
  return (
    slot.carer_id === shape.carer_id && slot.start_time === shape.start_time && slot.end_time === shape.end_time
  );
}

/**
 * One child's day: a run of sessions, each with a carer — Dad 08:00–10:00,
 * Gran 10:00–15:00, Mum 15:00–18:00.
 *
 * Adding or changing a session asks who, when, for which children and on
 * which days, so "Gran 10–3 for both, every weekday" is one save. A child has
 * one carer at a time: times that overlap another of today's sessions are
 * refused, and on the other days chosen the new session replaces whatever
 * was booked at that time.
 */
export default function TimeSlotEditor({
  holidayId,
  holidayDates,
  child,
  date,
  slots,
  carers,
  carersById,
  siblings,
  presets,
  onAddPreset,
  onManagePresets,
  onChanged,
}: TimeSlotEditorProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const [carerId, setCarerId] = useState<number | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [alsoFor, setAlsoFor] = useState<Set<number>>(new Set());
  const [days, setDays] = useState<DayRule>(JUST_THIS_DAY);
  const [savePreset, setSavePreset] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');
  const [addingCarer, setAddingCarer] = useState(false);
  const [newCarerName, setNewCarerName] = useState('');
  const [newCarerType, setNewCarerType] = useState<CarerType>('other');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const editingSlot = editing?.kind === 'edit' ? editing.slot : null;
  const original = editingSlot ? shapeOf(editingSlot) : null;
  // A gap with exactly a saved time's times is already offered by that preset.
  const gaps = gapChoices(slots.filter((slot) => slot.id !== editingSlot?.id)).filter(
    (gap) => !presets.some((preset) => preset.start === gap.start && preset.end === gap.end),
  );

  function open(next: Editing) {
    setEditing(next);
    setAlsoFor(new Set());
    setDays(JUST_THIS_DAY);
    setSavePreset(false);
    setPresetLabel('');
    setAddingCarer(false);
    setError(null);
    setSaved(null);
  }

  function startAdding() {
    const range = defaultRange(slots);
    open({ kind: 'add' });
    setCarerId(null);
    setChoice(null);
    setStart(range.start);
    setEnd(range.end);
  }

  function startEditing(slot: Assignment) {
    open({ kind: 'edit', slot });
    setCarerId(slot.carer_id);
    const preset = presets.find((item) => item.start === slot.start_time && item.end === slot.end_time);
    setChoice(preset ? preset.id : CUSTOM);
    setStart(slot.start_time ?? '');
    setEnd(slot.end_time ?? '');
    // Children who have this same session today were most likely booked
    // together, so a change to one goes to them too unless unticked.
    const shape = shapeOf(slot);
    setAlsoFor(
      new Set(
        siblings
          .filter((sibling) => sibling.slots.some((other) => sameSession(other, shape)))
          .map((sibling) => sibling.child.id),
      ),
    );
  }

  function close() {
    setEditing(null);
    setAddingCarer(false);
    setError(null);
  }

  function pick(key: string, range: { start: string; end: string }) {
    setChoice(key);
    setStart(range.start);
    setEnd(range.end);
  }

  function toggleSibling(id: number) {
    const next = new Set(alsoFor);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAlsoFor(next);
  }

  async function addNewCarer() {
    const trimmed = newCarerName.trim();
    if (!trimmed) return;
    const id = await createCarer({
      name: trimmed,
      short_name: suggestShortName(trimmed),
      type: newCarerType,
    });
    await onChanged();
    setCarerId(id);
    setAddingCarer(false);
    setNewCarerName('');
    setNewCarerType('other');
  }

  const carer = carerId !== null ? (carersById.get(carerId) ?? null) : null;
  const timesChosen = choice !== null && isValidRange(start, end);

  // One carer at a time: today's other sessions for this child, and for any
  // child ticked under "Also for", must not overlap. The session being edited
  // (and its twins on the ticked children) are about to move, so they don't count.
  const clashes = timesChosen
    ? [
        ...overlapping(
          slots.filter((slot) => slot.id !== editingSlot?.id),
          start,
          end,
        ).map((slot) => ({ who: child.name, slot })),
        ...siblings
          .filter((sibling) => alsoFor.has(sibling.child.id))
          .flatMap((sibling) =>
            overlapping(
              sibling.slots.filter((slot) => !original || !sameSession(slot, original)),
              start,
              end,
            ).map((slot) => ({ who: sibling.child.name, slot })),
          ),
      ]
    : [];

  const daysReady = days.rule !== 'custom' || days.days.length > 0;
  const ready = carer !== null && timesChosen && clashes.length === 0 && daysReady;

  function scope() {
    const extraDays = days.rule ? repeatTargets(holidayDates, date, days.rule, days.days) : [];
    return { childIds: [child.id, ...alsoFor], dates: [date, ...extraDays] };
  }

  function describe(childCount: number, dayCount: number): string {
    const parts = [
      childCount > 1 ? `${childCount} children` : null,
      dayCount > 1 ? `${dayCount} days` : null,
    ].filter(Boolean);
    return parts.length ? ` for ${parts.join(', ')}` : '';
  }

  async function save() {
    if (!ready || carerId === null) return;
    setSaving(true);
    setError(null);
    try {
      const { childIds, dates } = scope();
      await applySession({ holidayId, childIds, dates, carerId, start, end, replaces: original });
      if (choice === CUSTOM && savePreset) {
        await onAddPreset({ id: newPresetId(), label: presetLabel, start, end });
      }
      await onChanged();
      setSaved(`Saved ✓ ${carer?.name ?? ''} ${formatRange(start, end)}${describe(childIds.length, dates.length)}`);
      close();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!original) return;
    setSaving(true);
    try {
      const { childIds, dates } = scope();
      await removeSession({ holidayId, childIds, dates, session: original });
      await onChanged();
      setSaved(`Removed ✓${describe(childIds.length, dates.length)}`);
      close();
    } catch {
      setError('Could not remove. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const saveLabel = !carer
    ? `Choose who is looking after ${child.name}`
    : !timesChosen
      ? 'Choose when'
      : `Save ${carer.name}, ${formatRange(start, end)}`;

  return (
    <div className="slot-section">
      {slots.length > 0 && (
        <ul className="session-list">
          {slots.map((slot) => {
            const slotCarer = carersById.get(slot.carer_id);
            const swatch = carerSwatch(slotCarer ?? { type: 'other', colour: null });
            const isEditing = editingSlot?.id === slot.id;
            return (
              <li key={slot.id}>
                <button
                  type="button"
                  className={isEditing ? 'session session--editing' : 'session'}
                  style={{ background: swatch.bg, color: swatch.text }}
                  aria-label={`${slotCarer?.name ?? 'Unknown carer'}, ${slot.start_time} to ${slot.end_time}. Change`}
                  onClick={() => (isEditing ? close() : startEditing(slot))}
                >
                  <span className="session__carer">{slotCarer?.name ?? 'Unknown'}</span>
                  <span className="session__time">{formatRange(slot.start_time, slot.end_time)}</span>
                  <span className="session__chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <div className="session-form">
          <h3 className="session-form__question">
            {editingSlot ? 'Who?' : `Who’s looking after ${child.name}?`}
          </h3>
          <CarerPicker
            carers={carers}
            selectedId={carerId}
            onSelect={setCarerId}
            onAddOther={() => setAddingCarer(true)}
          />
          {addingCarer && (
            <QuickAddCarer
              name={newCarerName}
              type={newCarerType}
              onName={setNewCarerName}
              onType={setNewCarerType}
              onCancel={() => setAddingCarer(false)}
              onAdd={addNewCarer}
              addLabel="Add carer"
            />
          )}

          <div className="session-form__heading">
            <h3 className="session-form__question">When?</h3>
            <button type="button" className="link-button" onClick={onManagePresets}>
              Edit saved times
            </button>
          </div>
          <div className="time-choices">
            {gaps.map((option) => (
              <TimeChoiceButton
                key={option.key}
                label={option.label}
                start={option.start}
                end={option.end}
                selected={choice === option.key}
                onClick={() => pick(option.key, option)}
              />
            ))}
            {presets.map((preset) => (
              <TimeChoiceButton
                key={preset.id}
                label={preset.label}
                start={preset.start}
                end={preset.end}
                selected={choice === preset.id}
                onClick={() => pick(preset.id, preset)}
              />
            ))}
            <button
              type="button"
              className={choice === CUSTOM ? 'time-choice time-choice--selected' : 'time-choice'}
              aria-pressed={choice === CUSTOM}
              onClick={() => setChoice(CUSTOM)}
            >
              <span className="time-choice__label">Other times…</span>
              <span className="time-choice__range">From / To</span>
            </button>
          </div>

          {choice === CUSTOM && (
            <>
              <div className="session-form__times">
                <label className="field">
                  <span className="field__label">From</span>
                  <input
                    type="time"
                    className="field__input"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field__label">To</span>
                  <input
                    type="time"
                    className="field__input"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </label>
              </div>
              {start && end && !isValidRange(start, end) && (
                <p className="form-error" role="alert">
                  The end time must be after the start time.
                </p>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={savePreset}
                  onChange={(event) => setSavePreset(event.target.checked)}
                />
                Save these times for next time
              </label>
              {savePreset && (
                <input
                  className="field__input"
                  value={presetLabel}
                  maxLength={MAX_PRESET_LABEL}
                  placeholder="Name, e.g. School club"
                  aria-label="Name for these times"
                  onChange={(event) => setPresetLabel(event.target.value)}
                />
              )}
            </>
          )}

          {siblings.length > 0 && (
            <>
              <h3 className="session-form__question">Also for</h3>
              <div className="session-form__siblings">
                {siblings.map((sibling) => (
                  <label className="checkbox" key={sibling.child.id}>
                    <input
                      type="checkbox"
                      checked={alsoFor.has(sibling.child.id)}
                      onChange={() => toggleSibling(sibling.child.id)}
                    />
                    {sibling.child.name}
                  </label>
                ))}
              </div>
            </>
          )}

          <h3 className="session-form__question">Which days?</h3>
          <DayRulePicker
            date={date}
            holidayDates={holidayDates}
            value={days}
            onChange={setDays}
            allowJustThisDay
          />
          {days.rule && (
            <p className="field-note">
              {editingSlot
                ? 'On those days this replaces the same session, and anything booked at the new times.'
                : 'On those days this replaces anything already booked at these times.'}
            </p>
          )}

          {clashes.length > 0 && (
            <p className="form-error" role="alert">
              One carer at a time:{' '}
              {clashes
                .map(({ who, slot }) => {
                  const name = carersById.get(slot.carer_id)?.name ?? 'someone';
                  return `${who} already has ${name} ${formatRange(slot.start_time, slot.end_time)}`;
                })
                .join('; ')}
              . Change the times, or change that session first.
            </p>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="button" className="button button--primary" disabled={!ready || saving} onClick={save}>
            {saving ? 'Saving…' : saveLabel}
          </button>
          <div className="session-form__secondary">
            {editingSlot && (
              <button
                type="button"
                className="link-button link-button--danger"
                disabled={saving || !daysReady}
                onClick={remove}
              >
                Remove{editingSlot ? describe(scope().childIds.length, scope().dates.length) : ''}
              </button>
            )}
            <button type="button" className="link-button" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {saved && (
            <p className="save-confirm" role="status">
              {saved}
            </p>
          )}
          <button type="button" className="button button--secondary" onClick={startAdding}>
            {slots.length === 0 ? `+ Who’s looking after ${child.name}?` : '+ Add another carer'}
          </button>
        </>
      )}
    </div>
  );
}

function TimeChoiceButton({
  label,
  start,
  end,
  selected,
  onClick,
}: {
  label: string;
  start: string;
  end: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? 'time-choice time-choice--selected' : 'time-choice'}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="time-choice__label">{label}</span>
      <span className="time-choice__range">{formatRange(start, end)}</span>
    </button>
  );
}
