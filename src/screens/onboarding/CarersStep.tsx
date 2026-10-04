import { useEffect, useState } from 'react';
import CarerIcon from '../../components/CarerIcon';
import Loading from '../../components/Loading';
import { createCarer, deleteCarer, listCarers, updateCarer } from '../../db/carers';
import {
  CARER_TYPE_LABELS,
  CARER_TYPE_VARS,
  DEFAULT_CARERS,
  type CarerType,
} from '../../utils/constants';
import { MAX_CARER_NAME, suggestShortName } from '../../utils/status';

const CARER_TYPES = Object.keys(CARER_TYPE_LABELS) as CarerType[];

/** A suggestion keeps its hand-picked grid name ("Grands", not "Grandpa"). */
function shortNameFor(name: string): string {
  const preset = DEFAULT_CARERS.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
  return preset ? preset.short_name : suggestShortName(name);
}

interface CarersStepProps {
  onDone: () => void;
  busy: boolean;
}

/** One line in the list: a suggested carer, or one already saved. */
interface Row {
  key: string;
  name: string;
  type: CarerType;
  /** The saved carer, or null while unticked. */
  carerId: number | null;
}

/**
 * Pick who helps with childcare.
 *
 * The suggestions and the parent's own carers share one list and behave the
 * same: tap to tick or untick, Edit to rename, change the type or remove.
 * Ticking saves the carer straight away and unticking deletes it, so what is
 * ticked is exactly what the app will have.
 */
export default function CarersStep({ onDone, busy }: CarersStepProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  // The row being edited, or "new" for the add form.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CarerType>('other');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCarers().then((saved) => {
      const savedNames = new Set(saved.map((carer) => carer.name.trim().toLowerCase()));
      setRows([
        ...saved.map((carer) => ({ key: `c${carer.id}`, name: carer.name, type: carer.type, carerId: carer.id })),
        // Suggestions not already saved, unticked.
        ...DEFAULT_CARERS.filter((preset) => !savedNames.has(preset.name.toLowerCase())).map((preset) => ({
          key: `d-${preset.name}`,
          name: preset.name,
          type: preset.type,
          carerId: null,
        })),
      ]);
      setLoading(false);
    });
  }, []);

  function replaceRow(key: string, next: Row | null) {
    setRows((current) =>
      next ? current.map((row) => (row.key === key ? next : row)) : current.filter((row) => row.key !== key),
    );
  }

  async function toggle(row: Row) {
    setError(null);
    try {
      if (row.carerId !== null) {
        await deleteCarer(row.carerId);
        replaceRow(row.key, { ...row, carerId: null });
      } else {
        const carerId = await createCarer({ name: row.name, short_name: shortNameFor(row.name), type: row.type });
        replaceRow(row.key, { ...row, carerId });
      }
    } catch {
      setError('Could not save. Please try again.');
    }
  }

  function startEditing(row: Row | null) {
    setEditingKey(row ? row.key : 'new');
    setName(row?.name ?? '');
    setType(row?.type ?? 'other');
    setError(null);
  }

  /** Save the open form. Returns false when there is nothing to save. */
  async function commit(): Promise<boolean> {
    const trimmed = name.trim();
    if (!editingKey || !trimmed) return false;
    const values = { name: trimmed, short_name: shortNameFor(trimmed), type };
    if (editingKey === 'new') {
      // A carer typed in is clearly wanted, so it is added ticked.
      const carerId = await createCarer(values);
      setRows((current) => [...current, { key: `c${carerId}`, name: trimmed, type, carerId }]);
    } else {
      const row = rows.find((item) => item.key === editingKey);
      if (!row) return false;
      if (row.carerId !== null) await updateCarer(row.carerId, values);
      replaceRow(row.key, { ...row, name: trimmed, type });
    }
    setEditingKey(null);
    setName('');
    return true;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await commit();
    } catch {
      setError('Could not save. Please try again.');
    }
  }

  async function remove(row: Row) {
    if (row.carerId !== null) await deleteCarer(row.carerId);
    replaceRow(row.key, null);
    setEditingKey(null);
  }

  /**
   * A half-typed new carer would otherwise be thrown away in silence when the
   * user taps the button that finishes setup.
   */
  async function handleDone() {
    if (editingKey === 'new') await commit();
    onDone();
  }

  if (loading) return <Loading />;

  const ticked = rows.filter((row) => row.carerId !== null).length;

  const form = (row: Row | null) => (
    <form className="card add-form" onSubmit={save}>
      <label className="field">
        <span className="field__label">Name</span>
        <input
          className="field__input"
          value={name}
          maxLength={MAX_CARER_NAME}
          placeholder="e.g. Auntie Jo"
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Type — sets the colour</span>
        <select
          className="field__input"
          value={type}
          onChange={(event) => setType(event.target.value as CarerType)}
        >
          {CARER_TYPES.map((option) => (
            <option key={option} value={option}>
              {CARER_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </label>

      <div className="add-form__actions">
        <button type="submit" className="button button--primary" disabled={!name.trim()}>
          {row ? 'Save' : 'Add carer'}
        </button>
        <button type="button" className="link-button" onClick={() => setEditingKey(null)}>
          Cancel
        </button>
        {row && (
          <button type="button" className="link-button link-button--danger" onClick={() => remove(row)}>
            Remove
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="step">
      <header className="step__header">
        <h1 className="step__title">Who helps with childcare?</h1>
        <p className="step__subtitle">Tap to tick everyone who helps. Edit to rename or remove.</p>
      </header>

      <ul className="pick-list">
        {rows.map((row) =>
          editingKey === row.key ? (
            <li key={row.key}>{form(row)}</li>
          ) : (
            <li className="pick-row" key={row.key}>
              <button
                type="button"
                className={row.carerId !== null ? 'pick-row__toggle pick-row__toggle--on' : 'pick-row__toggle'}
                aria-pressed={row.carerId !== null}
                onClick={() => toggle(row)}
              >
                <span
                  className="carer-card__icon"
                  style={{ background: CARER_TYPE_VARS[row.type].bg, color: CARER_TYPE_VARS[row.type].text }}
                >
                  <CarerIcon type={row.type} />
                </span>
                <span className="pick-row__text">
                  <span className="pick-row__name">{row.name}</span>
                  <span className="pick-row__meta">{CARER_TYPE_LABELS[row.type]}</span>
                </span>
                <span className="pick-row__tick" aria-hidden="true">
                  {row.carerId !== null ? '✓' : ''}
                </span>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Edit ${row.name}`}
                onClick={() => startEditing(row)}
              >
                Edit
              </button>
            </li>
          ),
        )}
      </ul>

      {editingKey === 'new' ? (
        form(null)
      ) : (
        <button type="button" className="dashed-button" onClick={() => startEditing(null)}>
          + Add someone else
        </button>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="button button--primary"
        disabled={(ticked === 0 && !(editingKey === 'new' && name.trim())) || busy}
        onClick={handleDone}
      >
        {busy ? 'Setting up…' : 'Start planning'}
      </button>
    </div>
  );
}
