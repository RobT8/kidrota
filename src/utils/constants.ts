/** Carer categories. Drives the colour of every cell in the weekly grid. */
export type CarerType = 'parent' | 'family' | 'club' | 'playdate' | 'other';

/** Slot within a day when a holiday is in `simple` mode. */
export type Period = 'am' | 'pm' | 'all_day';

/** How a holiday is planned: AM/PM halves, or explicit time ranges. */
export type HolidayMode = 'simple' | 'detailed';

/** CSS custom-property pair for each carer type, plus the unassigned "gap" look. */
export const CARER_TYPE_VARS: Record<CarerType | 'gap', { bg: string; text: string }> = {
  family: { bg: 'var(--carer-family-bg)', text: 'var(--carer-family-text)' },
  club: { bg: 'var(--carer-club-bg)', text: 'var(--carer-club-text)' },
  parent: { bg: 'var(--carer-parent-bg)', text: 'var(--carer-parent-text)' },
  playdate: { bg: 'var(--carer-playdate-bg)', text: 'var(--carer-playdate-text)' },
  other: { bg: 'var(--carer-other-bg)', text: 'var(--carer-other-text)' },
  gap: { bg: 'var(--carer-gap-bg)', text: 'var(--carer-gap-text)' },
};

/** Human labels for carer types, used by the Carers screen grouping. */
export const CARER_TYPE_LABELS: Record<CarerType, string> = {
  family: 'Family',
  club: 'Clubs & camps',
  parent: 'Parents',
  playdate: 'Playdates',
  other: 'Other',
};

/**
 * The carers offered during onboarding. They start unticked and can be
 * renamed or removed there like any carer the parent types in.
 */
export const DEFAULT_CARERS: { name: string; short_name: string; type: CarerType }[] = [
  { name: 'Mum', short_name: 'Mum', type: 'parent' },
  { name: 'Dad', short_name: 'Dad', type: 'parent' },
  { name: 'Grandparents', short_name: 'Grands', type: 'family' },
  { name: 'Holiday club', short_name: 'Club', type: 'club' },
  { name: 'Playdate', short_name: 'Play', type: 'playdate' },
  { name: 'Childminder', short_name: 'CM', type: 'other' },
];

/**
 * Colour choices offered when adding a child: twelve, so a big family never
 * has to share. Each carries an initial at 4.5:1 or better (colour.test.ts),
 * and none is the red the grid keeps for gaps.
 */
export const CHILD_COLOURS = [
  '#378ADD',
  '#E2725B',
  '#5FA85F',
  '#B266C9',
  '#E8A33D',
  '#3FA9A0',
  '#1F4E9C',
  '#E07BB0',
  '#9BBF3B',
  '#A0522D',
  '#F2C14E',
  '#5D6D7E',
];

/**
 * Pro custom colours for carers. A fixed set rather than a free picker so
 * every one is known to carry readable text (dark text on each clears 4.5:1),
 * and none is red, which the grid keeps for gaps.
 */
export const CARER_COLOURS = [
  '#378ADD',
  '#5FA85F',
  '#B266C9',
  '#E8A33D',
  '#3FA9A0',
  '#7A8CA3',
];

/** Key used in the app_settings table to skip onboarding on later launches. */
export const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

/**
 * The longest holiday that can be planned, in calendar days: ten weeks, which
 * covers the longest UK summer break with room to spare. It applies to
 * everyone — it keeps the planner quick, and stops the free version's one
 * holiday being stretched across a whole school year.
 */
export const MAX_HOLIDAY_DAYS = 70;

/** Free-tier cap, lifted by Pro. Children are not capped. */
/** Counts every holiday ever added, not just those still on the phone. */
export const FREE_TIER_MAX_HOLIDAYS = 1;

/**
 * Outward-facing links and addresses, kept together so there is one place to
 * change them.
 *
 * The legal pages live on t80.dev; docs/ in this repository holds their
 * source. Google Play requires the privacy policy URL to be publicly
 * reachable before the app can be published.
 */
export const SUPPORT_EMAIL = 'kidrota@t80.dev';
export const PRIVACY_URL = 'https://t80.dev/kidrota/privacy.html';
export const TERMS_URL = 'https://t80.dev/kidrota/terms.html';
export const LICENSES_URL = 'https://t80.dev/kidrota/licenses.html';
/**
 * The Settings "Rate this app" row opens the listing rather than calling the
 * In-App Review API: Google asks apps not to put that API behind a button, as
 * it may silently show nothing. The https form opens the Play Store app on a
 * phone and a web page anywhere else. It returns "not found" until the first
 * publish.
 */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kidrota.app';
