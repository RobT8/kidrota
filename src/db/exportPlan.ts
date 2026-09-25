import { encodePlan } from '../utils/shareCode';
import { listAssignments } from './assignments';
import { listCarers } from './carers';
import { listChildren } from './children';
import { listDayNotes } from './dayNotes';
import { getHoliday } from './holidays';

/**
 * Pack a whole holiday into a plan code for the other parent — dates,
 * children, carers, cover and day notes. Null if the holiday has gone.
 */
export async function buildPlanCode(holidayId: number): Promise<{ name: string; code: string } | null> {
  const holiday = await getHoliday(holidayId);
  if (!holiday) return null;
  const code = encodePlan({
    holiday,
    children: await listChildren(),
    carers: await listCarers(),
    assignments: await listAssignments(holidayId),
    dayNotes: [...(await listDayNotes(holidayId))].map(([date, note]) => ({ date, note })),
  });
  return { name: holiday.name, code };
}
