import { FREE_TIER_MAX_CHILDREN, FREE_TIER_MAX_HOLIDAYS } from './constants';

/**
 * What the free version allows, and why an action was refused.
 *
 * The caps only stop something new being added. Anything already on the
 * device stays usable even when it is over the cap — after restoring a
 * backup, importing a plan, or a Pro subscription lapsing — so nobody ever
 * loses a plan by not paying.
 */

/** What Pro unlocks, which is also what the upgrade sheet can be opened for. */
export type ProFeature = 'children' | 'holidays' | 'colours';

export function canAddChild(currentCount: number, pro: boolean): boolean {
  return pro || currentCount < FREE_TIER_MAX_CHILDREN;
}

export function canAddHoliday(currentCount: number, pro: boolean): boolean {
  return pro || currentCount < FREE_TIER_MAX_HOLIDAYS;
}

/** Names match loosely, so "Grandma" and "grandma " are the same person. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Would adding a shared plan take a free user past a cap?
 *
 * A plan code always adds one holiday, and adds only the children whose names
 * are not already on the device — the same matching the import itself uses —
 * so a code about the same two children never counts against the cap twice.
 */
export function importBlockedBy(
  existingChildNames: string[],
  planChildNames: string[],
  holidayCount: number,
  pro: boolean,
): ProFeature | null {
  if (pro) return null;
  if (!canAddHoliday(holidayCount, false)) return 'holidays';

  const known = new Set(existingChildNames.map(nameKey));
  const incoming = new Set(planChildNames.map(nameKey).filter((key) => !known.has(key)));
  if (known.size + incoming.size > FREE_TIER_MAX_CHILDREN && incoming.size > 0) return 'children';
  return null;
}

/** Why the upgrade sheet opened, in the words the user sees. */
export function limitMessage(feature: ProFeature): string {
  switch (feature) {
    case 'children':
      return `The free version plans for up to ${FREE_TIER_MAX_CHILDREN} children.`;
    case 'holidays':
      return `The free version plans up to ${FREE_TIER_MAX_HOLIDAYS} holidays at a time.`;
    case 'colours':
      return 'Custom carer colours are part of Pro.';
  }
}

/**
 * Is Pro unlocked right now?
 *
 * Until Google Play has loaded this account's purchases, the answer last seen
 * on this phone stands — otherwise a paying user would flash back to the free
 * version on every launch, and lose Pro entirely whenever Play is unreachable.
 * Once purchases have loaded, Play is the only authority, which is also how a
 * lapsed yearly plan, or a refunded purchase, turns Pro back off.
 */
export function resolvePro(
  cached: boolean,
  purchasesLoaded: boolean,
  owned: { lifetime: boolean; yearly: boolean },
): boolean {
  if (!purchasesLoaded) return cached;
  return owned.lifetime || owned.yearly;
}
