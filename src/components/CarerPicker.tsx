import type { Carer } from '../db/types';
import { carerSwatch } from '../utils/colour';
import CarerIcon from './CarerIcon';

interface CarerPickerProps {
  carers: Carer[];
  /** The carer currently booked into this slot, if any. */
  selectedId: number | null;
  onSelect: (carerId: number) => void;
  /** Opens the quick-add form. */
  onAddOther: () => void;
}

/**
 * A tap-grid of carers, two per row.
 *
 * Deliberately not a dropdown: assigning cover is the action repeated most in
 * the app, and a grid makes it one tap with everyone visible at once.
 */
export default function CarerPicker({
  carers,
  selectedId,
  onSelect,
  onAddOther,
}: CarerPickerProps) {
  return (
    <div className="carer-picker">
      {carers.map((carer) => {
        const selected = carer.id === selectedId;
        const palette = carerSwatch(carer);
        return (
          <button
            key={carer.id}
            type="button"
            className={selected ? 'carer-card carer-card--selected' : 'carer-card'}
            aria-pressed={selected}
            onClick={() => onSelect(carer.id)}
          >
            <span
              className="carer-card__icon"
              style={{ background: palette.bg, color: palette.text }}
            >
              <CarerIcon type={carer.type} />
            </span>
            <span className="carer-card__name">{carer.name}</span>
          </button>
        );
      })}

      <button type="button" className="carer-card carer-card--other" onClick={onAddOther}>
        <span className="carer-card__icon carer-card__icon--other">+</span>
        <span className="carer-card__name">Other</span>
      </button>
    </div>
  );
}
