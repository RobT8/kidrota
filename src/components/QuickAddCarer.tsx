import { CARER_TYPE_LABELS, type CarerType } from '../utils/constants';

/** Add a carer without leaving the day: a name and a type, then assign. */
export default function QuickAddCarer({
  name,
  type,
  onName,
  onType,
  onCancel,
  onAdd,
  addLabel = 'Add & assign',
}: {
  name: string;
  type: CarerType;
  onName: (value: string) => void;
  onType: (value: CarerType) => void;
  onCancel: () => void;
  onAdd: () => void;
  addLabel?: string;
}) {
  return (
    <div className="quick-add">
      <input
        className="field__input"
        value={name}
        placeholder="Name"
        maxLength={24}
        autoFocus
        onChange={(event) => onName(event.target.value)}
      />
      <select
        className="field__input"
        value={type}
        onChange={(event) => onType(event.target.value as CarerType)}
      >
        {(Object.keys(CARER_TYPE_LABELS) as CarerType[]).map((option) => (
          <option key={option} value={option}>
            {CARER_TYPE_LABELS[option]}
          </option>
        ))}
      </select>
      <div className="add-form__actions">
        <button type="button" className="button button--secondary" disabled={!name.trim()} onClick={onAdd}>
          {addLabel}
        </button>
        <button type="button" className="link-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
