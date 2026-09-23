import type { HolidayCoverage } from '../db/coverage';
import type { Holiday } from '../db/types';
import { formatDateRange } from '../utils/dates';
import { coverageSummary } from '../utils/status';
import ProgressBar from './ProgressBar';

interface HolidayCardProps {
  holiday: Holiday;
  coverage: HolidayCoverage | undefined;
  onOpen: () => void;
  onEdit: () => void;
}

/** What opening the holiday lets you do, given how much is planned. */
function openLabel(coverage: HolidayCoverage | undefined): string {
  if (!coverage || coverage.empty) return 'Start planning';
  return coverage.gapDays > 0 ? 'Fill the gaps' : 'View plan';
}

export default function HolidayCard({ holiday, coverage, onOpen, onEdit }: HolidayCardProps) {
  const summary = coverage ? coverageSummary(coverage) : '';

  return (
    <div className="holiday-card">
      {/* The card body opens the planner; editing sits on its own control so a
          mistap goes to the planner rather than into a form. */}
      <button type="button" className="holiday-card__body" onClick={onOpen}>
        <span className="holiday-card__name">{holiday.name}</span>
        <span className="holiday-card__dates">
          {formatDateRange(holiday.start_date, holiday.end_date)}
          {holiday.exclude_weekends ? ' · Weekdays only' : ''}
        </span>
        {coverage && <ProgressBar days={coverage.days} empty={coverage.empty} />}
        <span
          className={
            coverage && !coverage.empty && coverage.gapDays > 0
              ? 'holiday-card__summary holiday-card__summary--gaps'
              : 'holiday-card__summary'
          }
        >
          {summary}
        </span>
        {/* The whole card is the button; this makes that visible, and says
            what opening it is for right now. */}
        <span className="holiday-card__cta">
          {openLabel(coverage)} <span aria-hidden="true">›</span>
        </span>
      </button>

      <button
        type="button"
        className="holiday-card__edit"
        aria-label={`Edit ${holiday.name}`}
        onClick={onEdit}
      >
        Edit
      </button>
    </div>
  );
}
