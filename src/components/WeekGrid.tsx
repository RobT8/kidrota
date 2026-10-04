import ChildAvatar from './ChildAvatar';
import DayColumn from './DayColumn';
import type { Assignment, Carer, Child } from '../db/types';
import { dayKey } from '../hooks/useAssignments';
import { formatColumnHeader } from '../utils/dates';

interface WeekGridProps {
  dates: string[];
  /** Named childList: `children` is reserved by React for JSX content. */
  childList: Child[];
  byDayAndChild: Map<string, Assignment[]>;
  carersById: Map<number, Carer>;
  onSelect: (date: string, childId: number) => void;
  /**
   * Drawn for a shared picture: every column at a fixed width with nothing
   * scrolled out of sight, so the picture always holds the whole week.
   */
  picture?: boolean;
}

/**
 * The week at a glance: one column per day, one block per child.
 *
 * The column count varies — five weekdays, seven if weekends are included,
 * fewer in a part week. Five fit across a phone; a seven-day week scrolls
 * sideways on screen, and is drawn in full for a picture.
 */
export default function WeekGrid({
  dates,
  childList,
  byDayAndChild,
  carersById,
  onSelect,
  picture = false,
}: WeekGridProps) {
  const columns = {
    gridTemplateColumns: picture
      ? `repeat(${dates.length}, 84px)`
      : `repeat(${dates.length}, minmax(60px, 1fr))`,
  };

  return (
    <div className={picture ? 'week-grid week-grid--picture' : 'week-grid'}>
      <div className="week-grid__scroll">
        <div className="week-grid__head" style={columns}>
          {dates.map((date) => (
            <span className="week-grid__day" key={date}>
              {formatColumnHeader(date)}
            </span>
          ))}
        </div>

        {childList.map((child) => (
          <section className="week-grid__child" key={child.id}>
            <header className="week-grid__child-head">
              <ChildAvatar name={child.name} colour={child.colour} size={24} />
              <span className="week-grid__child-name">{child.name}</span>
            </header>
            <div className="week-grid__row" style={columns}>
              {dates.map((date) => (
                <DayColumn
                  key={date}
                  date={date}
                  child={child}
                  assignments={byDayAndChild.get(dayKey(date, child.id))}
                  carersById={carersById}
                  onSelect={() => onSelect(date, child.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
