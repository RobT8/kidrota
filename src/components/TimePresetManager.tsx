import { useState } from 'react';
import { MAX_PRESET_LABEL, newPresetId, removePreset, upsertPreset, type TimePreset } from '../utils/timePresets';
import { formatRange, isValidRange } from '../utils/timeSlots';

interface TimePresetManagerProps {
  presets: TimePreset[];
  onSave: (presets: TimePreset[]) => Promise<void>;
  onClose: () => void;
}

/**
 * Rename, retime or remove the one-tap times — the starting three included —
 * so the day screen only offers the ones this family uses.
 */
export default function TimePresetManager({ presets, onSave, onClose }: TimePresetManagerProps) {
  const [editing, setEditing] = useState<TimePreset | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(list: TimePreset[]) {
    setError(null);
    try {
      await onSave(list);
    } catch {
      setError('Could not save. Please try again.');
    }
  }

  async function saveEditing() {
    if (!editing || !isValidRange(editing.start, editing.end)) return;
    await save(upsertPreset(presets, editing));
    setEditing(null);
  }

  return (
    <div className="preset-manager">
      {presets.length === 0 && !editing && (
        <p className="placeholder-note">No saved times. Add one, or type times when booking someone.</p>
      )}

      <ul className="entity-list">
        {presets.map((preset) =>
          editing?.id === preset.id ? null : (
            <li className="entity-row" key={preset.id}>
              <span className="entity-row__main entity-row__main--static">
                <span className="entity-row__title">{preset.label}</span>
                <span className="entity-row__sub">{formatRange(preset.start, preset.end)}</span>
              </span>
              <button type="button" className="icon-button" onClick={() => setEditing(preset)}>
                Edit
              </button>
              <button
                type="button"
                className="icon-button icon-button--danger"
                aria-label={`Remove ${preset.label}`}
                onClick={() => save(removePreset(presets, preset.id))}
              >
                Remove
              </button>
            </li>
          ),
        )}
      </ul>

      {editing ? (
        <div className="quick-add">
          <label className="field">
            <span className="field__label">Name</span>
            <input
              className="field__input"
              value={editing.label}
              maxLength={MAX_PRESET_LABEL}
              placeholder="e.g. School club"
              autoFocus
              onChange={(event) => setEditing({ ...editing, label: event.target.value })}
            />
          </label>
          <div className="session-form__times">
            <label className="field">
              <span className="field__label">From</span>
              <input
                type="time"
                className="field__input"
                value={editing.start}
                onChange={(event) => setEditing({ ...editing, start: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">To</span>
              <input
                type="time"
                className="field__input"
                value={editing.end}
                onChange={(event) => setEditing({ ...editing, end: event.target.value })}
              />
            </label>
          </div>
          {editing.start && editing.end && !isValidRange(editing.start, editing.end) && (
            <p className="form-error" role="alert">
              The end time must be after the start time.
            </p>
          )}
          <div className="add-form__actions">
            <button
              type="button"
              className="button button--primary"
              disabled={!isValidRange(editing.start, editing.end)}
              onClick={saveEditing}
            >
              Save
            </button>
            <button type="button" className="link-button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="dashed-button"
          onClick={() => setEditing({ id: newPresetId(), label: '', start: '', end: '' })}
        >
          + Add saved time
        </button>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="button button--secondary" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
