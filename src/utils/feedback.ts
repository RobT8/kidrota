/**
 * The Settings feedback form. KidRota has no server, so feedback travels as an
 * email the user sends themselves: the form fills in a mailto: link and their
 * email app does the rest. Nothing leaves the phone unless they press send.
 */

export type FeedbackKind = 'idea' | 'problem' | 'other';

export const FEEDBACK_KINDS: { value: FeedbackKind; label: string; subject: string }[] = [
  { value: 'idea', label: 'Suggest an improvement', subject: 'Suggestion' },
  { value: 'problem', label: 'Report a problem', subject: 'Problem' },
  { value: 'other', label: 'Something else', subject: 'Feedback' },
];

/** Long enough for any real message, short enough for every email app's link. */
export const FEEDBACK_MAX_LENGTH = 2000;

/**
 * A mailto: link with the subject and body filled in. The app version goes at
 * the foot of the body, where the user can see it — it is the one thing that
 * makes a problem report actionable, and they can delete it before sending.
 */
export function feedbackMailto(to: string, kind: FeedbackKind, message: string, version: string): string {
  const subject = `KidRota ${FEEDBACK_KINDS.find((k) => k.value === kind)?.subject ?? 'Feedback'}`;
  const body = `${message.trim()}\n\n—\nKidRota ${version}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
