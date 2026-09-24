import { useState } from 'react';
import { addTimeSlot, deleteAssignment, updateAssignment } from '../db/assignments';
import { createCarer } from '../db/carers';
import type { Assignment, Carer, Child } from '../db/types';
import { carerSwatch } from '../utils/colour';
import type { CarerType } from '../utils/constants';
import { suggestShortName } from '../utils/status';
import {
  defaultRange,
  formatRange,
  isValidRange,
  overlapping,
  timeChoices,
  type TimeChoice,
} from '../utils/timeSlots';
import CarerPicker from './CarerPicker';
import QuickAddCarer from './QuickAddCarer';

interface TimeSlotEditorProps {
  holidayId: number;
  child: Child;
  date: string;
  slots: Assignment[];
  carers: Carer[];
  carersById: Map<number, Carer>;
  /** The other children and their sessions today, for "Same for …". */
  siblings: { child: Child; slots: Assignment[] }[];
  onChanged: () => Promise<void>;
}

/** Adding a new session, or changing an existing one. */
type Editing = { kind: 'add' } | { kind: 'edit'; slot: Assignment } | null;

/** The chosen one-tap time, or "custom" for typed From/To times. */
const CUSTOM = 'custom';

/**
 * Detailed-mode cover: a day of sessions, each with a carer — Dad 08:00–10:00,
 * Gran 10:00–15:00, Mum 15:00–18:00.
 *
 * Adding one is two taps, matching the Morning/Afternoon mode: who, then when.
 * Each new session starts where the last one ended, so building a day of
 * hand-overs means typing only the hand-over times.
 */
export default function TimeSlotEditor({
  holidayId,
  child,
  date,
  slots,
  carers,
  carersById,
  siblings,
  onChanged,
}: TimeSlotEditorProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const [carerId, setCarerId] = useState<number | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [alsoFor, setAlsoFor] = useState<Set<number>>(new Set());
  const [addingCarer, setAddingCarer] = useState(false);
  const [newCarerName, setNewCarerName] = useState('');
  const [newCarerType, setNewCarerType] = useState<CarerType>('other');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choices = timeChoices(slots);

  function startAdding() {
    const range = defaultRange(slots);
    setEditing({ kind: 'add' });
    setCarerId(null);
    // Nothing one-tap left (the day is booked to its end): go straight to times.
    setChoice(choices.length === 0 ? CUSTOM : null);
    setStart(range.start);
    setEnd(range.end);
    setAlsoFor(new Set());
    setError(null);
  }

  function startEditing(slot: Assignment) {
    setEditing({ kind: 'edit', slot });
    setCarerId(slot.carer_id);
    setChoice(CUSTOM);
    setStart(slot.start_time ?? '');
    setEnd(slot.end_time ?? '');
    setAlsoFor(new Set());
    setError(null);
  }

  function close() {
    setEditing(null);
    setAddingCarer(false);
    setError(null);
  }

  function pickChoice(option: TimeChoice) {
    setChoice(option.key);
    setStart(option.start);
    setEnd(option.end);
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

  const editingSlot = editing?.kind === 'edit' ? editing.slot : null;
  const carer = carerId !== null ? (carersById.get(carerId) ?? null) : null;
  const ready = carer !== null && choice !== null && isValidRange(start, end);

  // Clashes are shown but not blocked: an overlap at a hand-over can be
  // deliberate, and the parent knows their day better than the app does.
  const clashes = ready
    ? [
        ...overlapping(
          slots.filter((slot) => slot.id !== editingSlot?.id),
          start,
          end,
        ).map((slot) => ({ who: null as string | null, slot })),
        ...siblings
          .filter((sibling) => alsoFor.has(sibling.child.id))
          .flatMap((sibling) =>
            overlapping(sibling.slots, start, end).map((slot) => ({ who: sibling.child.name, slot })),
          ),
      ]
    : [];

  async function save() {
    if (!ready || carerId === null) return;
    setSaving(true);
    setError(null);
    try {
      if (editingSlot) {
        await updateAssignment(editingSlot.id, { carer_id: carerId, start_time: start, end_time: end });
      } else {
        for (const childId of [child.id, ...alsoFor]) {
          await addTimeSlot({
            holiday_id: holidayId,
            child_id: childId,
            carer_id: carerId,
            date,
            start_time: start,
            end_time: end,
          });
        }
      }
      await onChanged();
      close();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingSlot) return;
    await deleteAssignment(editingSlot.id);
    await onChanged();
    close();
  }

  const saveLabel = !carer
    ? `Choose who is looking after ${child.name}`
    : !ready
      ? 'Choose when'
      : `${editingSlot ? 'Save' : 'Add'} ${carer.name}, ${formatRange(start, end)}`;

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

          <h3 className="session-form__question">When?</h3>
          {!editingSlot && choices.length > 0 && (
            <div className="time-choices">
              {choices.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={choice === option.key ? 'time-choice time-choice--selected' : 'time-choice'}
                  aria-pressed={choice === option.key}
                  onClick={() => pickChoice(option)}
                >
                  <span className="time-choice__label">{option.label}</span>
                  <span className="time-choice__range">{formatRange(option.start, option.end)}</span>
                </button>
              ))}
              <button
                type="button"
                className={choice === CUSTOM ? 'time-choice time-choice--selected' : 'time-choice'}
                aria-pressed={choice === CUSTOM}
                onClick={() => setChoice(CUSTOM)}
              >
                <span className="time-choice__label">Set times…</span>
                <span className="time-choice__range">From / To</span>
              </button>
            </div>
          )}

          {choice === CUSTOM && (
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
          )}

          {choice === CUSTOM && start && end && !isValidRange(start, end) && (
            <p className="form-error" role="alert">
              The end time must be after the start time.
            </p>
          )}

          {!editingSlot && siblings.length > 0 && (
            <div className="session-form__siblings">
              {siblings.map((sibling) => (
                <label className="checkbox" key={sibling.child.id}>
                  <input
                    type="checkbox"
                    checked={alsoFor.has(sibling.child.id)}
                    onChange={() => toggleSibling(sibling.child.id)}
                  />
                  Same for {sibling.child.name}
                </label>
              ))}
            </div>
          )}

          {clashes.length > 0 && (
            <p className="session-form__clash" role="status">
              Overlaps{' '}
              {clashes
                .map(({ who, slot }) => {
                  const name = carersById.get(slot.carer_id)?.name ?? 'another session';
                  return `${who ? `${who}’s ` : ''}${name} ${formatRange(slot.start_time, slot.end_time)}`;
                })
                .join(', ')}
              .
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
              <button type="button" className="link-button link-button--danger" onClick={remove}>
                Remove
              </button>
            )}
            <button type="button" className="link-button" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="button button--secondary" onClick={startAdding}>
          {slots.length === 0 ? `+ Who’s looking after ${child.name}?` : '+ Add another carer'}
        </button>
      )}
    </div>
  );
}
