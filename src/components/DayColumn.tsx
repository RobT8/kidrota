import type { Assignment, Carer, Child } from '../db/types';
import { formatColumnHeader } from '../utils/dates';
import { timeSlotsIn } from '../hooks/useAssignments';
import { dayTimeline, formatShortRange } from '../utils/timeSlots';
import SlotCell from './SlotCell';

interface DayColumnProps {
  date: string;
  child: Child;
  assignments: Assignment[] | undefined;
  carersById: Map<number, Carer>;
  /** Opens this child's day. */
  onSelect: () => void;
}

/** One child's sessions on one day, with any gaps where they fall. */
export default function DayColumn({ date, child, assignments, carersById, onSelect }: DayColumnProps) {
  const heading = formatColumnHeader(date);
  const slots = timeSlotsIn(assignments);

  return (
    <div className="day-col">
      {slots.length === 0 ? (
        <SlotCell
          // No time: a day with nothing booked is simply a gap.
          label=""
          carer={null}
          onClick={onSelect}
          accessibleLabel={`${child.name}, ${heading}: no cover`}
        />
      ) : (
        dayTimeline(slots).map((entry) => {
          // A hole in the day shows as a red "?" where it falls.
          if (entry.kind === 'gap') {
            return (
              <SlotCell
                key={`gap-${entry.start}`}
                label={formatShortRange(entry.start, entry.end)}
                carer={null}
                onClick={onSelect}
                accessibleLabel={`${child.name}, ${heading} ${entry.start}–${entry.end}: no cover`}
              />
            );
          }
          const slot = entry.slot;
          const carer = carersById.get(slot.carer_id) ?? null;
          return (
            <SlotCell
              key={slot.id}
              label={formatShortRange(slot.start_time, slot.end_time)}
              carer={carer}
              onClick={onSelect}
              accessibleLabel={
                carer
                  ? `${child.name}, ${heading} ${slot.start_time}–${slot.end_time}: ${carer.name}`
                  : `${child.name}, ${heading}: no cover`
              }
            />
          );
        })
      )}
    </div>
  );
}
