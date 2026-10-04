import type { DayCoverage } from '../db/coverage';

interface ProgressBarProps {
  days: DayCoverage[];
  /** An untouched holiday shows grey throughout rather than all-red. */
  empty: boolean;
}

/**
 * One segment per day of the holiday: green complete, amber part-planned,
 * red nothing booked.
 *
 * Carer-type colours live in the weekly grid; on the home screen the only
 * question is "is this day sorted or not" — amber shows the work already
 * done on days not yet finished.
 */
export default function ProgressBar({ days, empty }: ProgressBarProps) {
  return (
    <div className="progress" aria-hidden="true">
      {days.map((day) => (
        <span
          key={day.date}
          className={
            empty
              ? 'progress__seg'
              : day.covered
                ? 'progress__seg progress__seg--covered'
                : day.booked
                  ? 'progress__seg progress__seg--partial'
                  : 'progress__seg progress__seg--gap'
          }
        />
      ))}
    </div>
  );
}
