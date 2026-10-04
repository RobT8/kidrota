import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ChildAvatar from '../components/ChildAvatar';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import RepeatChips from '../components/RepeatChips';
import TimePresetManager from '../components/TimePresetManager';
import TimeSlotEditor from '../components/TimeSlotEditor';
import { repeatAssignments, type RepeatRule } from '../db/assignments';
import { getDayNote, setDayNote } from '../db/dayNotes';
import { listTimePresets, saveTimePresets } from '../db/timePresets';
import type { Assignment } from '../db/types';
import { dayKey, timeSlotsIn, useAssignments } from '../hooks/useAssignments';
import { formatLongDate } from '../utils/dates';
import { upsertPreset, type TimePreset } from '../utils/timePresets';
import { dayGaps, formatRange } from '../utils/timeSlots';

export default function DayAssignScreen() {
  const { holidayId, date = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(holidayId);
  // The child whose cell was tapped in the week, brought into view.
  const focusChild = Number(searchParams.get('child')) || null;

  const { holiday, children, carers, carersById, dates, byDayAndChild, loading, error, reload } =
    useAssignments(id);

  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const [presets, setPresets] = useState<TimePreset[]>([]);
  const [managingPresets, setManagingPresets] = useState(false);
  const focused = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    getDayNote(id, date).then((saved) => {
      if (cancelled) return;
      setNote(saved);
      setSavedNote(saved);
      setNoteLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id, date]);

  useEffect(() => {
    listTimePresets().then(setPresets);
  }, []);

  useEffect(() => {
    if (!loading) focused.current?.scrollIntoView({ block: 'start' });
  }, [loading]);

  if (loading) {
    return (
      <div className="screen">
        <Loading />
      </div>
    );
  }

  if (error || !holiday) {
    return (
      <div className="screen">
        <button type="button" className="link-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <p className="form-error" role="alert">
          That day could not be loaded.
        </p>
      </div>
    );
  }

  const back = () => navigate(`/holiday/${id}`);

  async function handleRepeat(rule: RepeatRule, customDays?: number[]): Promise<number> {
    const written = await repeatAssignments(id, date, rule, customDays);
    await reload();
    return written.length;
  }

  async function saveNote() {
    setNoteStatus(null);
    try {
      await setDayNote(id, date, note);
      setSavedNote(note.trim());
      setNote(note.trim());
      setNoteStatus('Saved ✓');
    } catch {
      setNoteStatus('Could not save. Please try again.');
    }
  }

  async function storePresets(next: TimePreset[]) {
    await saveTimePresets(next);
    setPresets(await listTimePresets());
  }

  const dayHasCover = children.some(
    (child) => (byDayAndChild.get(dayKey(date, child.id)) ?? []).length > 0,
  );
  const noteChanged = note.trim() !== savedNote;

  return (
    <div className="screen">
      <header className="planner-header">
        <button type="button" className="back-button" aria-label="Back to the week" onClick={back}>
          ←
        </button>
        <div className="planner-header__titles">
          <h1 className="planner-header__name">{formatLongDate(date)}</h1>
          <p className="planner-header__week">{holiday.name}</p>
        </div>
      </header>

      {carers.length === 0 && (
        <div className="empty-state card">
          <p className="empty-state__title">No carers yet</p>
          <p className="empty-state__body">
            Add the people and clubs who help, then you can book them in.
          </p>
          <button type="button" className="button button--primary" onClick={() => navigate('/carers')}>
            Add a carer
          </button>
        </div>
      )}

      {children.map((child) => {
        const assignments = byDayAndChild.get(dayKey(date, child.id));
        const isFocus = child.id === focusChild;
        return (
          <section
            className={isFocus ? 'child-card card child-card--focus' : 'child-card card'}
            key={child.id}
            ref={isFocus ? focused : undefined}
          >
            <header className="child-card__head">
              <ChildAvatar name={child.name} colour={child.colour} size={28} />
              <span className="child-card__name">{child.name}</span>
              <StatusBadge assignments={assignments} />
            </header>

            <TimeSlotEditor
              holidayId={id}
              holidayDates={dates}
              child={child}
              date={date}
              slots={timeSlotsIn(assignments)}
              carers={carers}
              carersById={carersById}
              siblings={children
                .filter((other) => other.id !== child.id)
                .map((other) => ({
                  child: other,
                  slots: timeSlotsIn(byDayAndChild.get(dayKey(date, other.id))),
                }))}
              presets={presets}
              onAddPreset={(preset) => storePresets(upsertPreset(presets, preset))}
              onManagePresets={() => setManagingPresets(true)}
              onChanged={reload}
            />
          </section>
        );
      })}

      <RepeatChips date={date} holidayDates={dates} disabled={!dayHasCover} onRepeat={handleRepeat} />

      <section className="card note-card">
        <label className="field note-field">
          <span className="field__label">Notes for this day</span>
          <input
            className="field__input"
            value={note}
            placeholder="e.g. pack swimming kit"
            maxLength={200}
            disabled={!noteLoaded}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteStatus(null);
            }}
          />
        </label>
        <button
          type="button"
          className="button button--primary"
          disabled={!noteLoaded || !noteChanged}
          onClick={saveNote}
        >
          Save note
        </button>
        {noteStatus && (
          <p className="save-confirm" role="status">
            {noteStatus}
          </p>
        )}
      </section>

      {managingPresets && (
        <Modal title="Saved times" onClose={() => setManagingPresets(false)}>
          <TimePresetManager
            presets={presets}
            onSave={storePresets}
            onClose={() => setManagingPresets(false)}
          />
        </Modal>
      )}
    </div>
  );
}

/** "Needs cover" / "Gap 12–15" / "Covered", so the state reads without counting cells. */
function StatusBadge({ assignments }: { assignments: Assignment[] | undefined }) {
  const slots = timeSlotsIn(assignments);
  if (slots.length === 0) return <span className="badge badge--gap">Needs cover</span>;
  const gaps = dayGaps(slots);
  if (gaps.length === 0) return <span className="badge badge--ok">Covered</span>;
  return (
    <span className="badge badge--gap">
      {gaps.length === 1 ? `Gap ${formatRange(gaps[0].start, gaps[0].end)}` : `${gaps.length} gaps`}
    </span>
  );
}
