import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { BackupError, backupDate, exportData, importData, validateBackup, wipeAllData, type BackupFile } from '../db/backup';
import { plural } from '../utils/status';
import Modal from '../components/Modal';
import { listHolidays } from '../db/holidays';
import { usePro } from '../hooks/usePro';
import { restorePro } from '../utils/billing';
import { FEEDBACK_KINDS, FEEDBACK_MAX_LENGTH, feedbackMailto, type FeedbackKind } from '../utils/feedback';
import { getSetting, setSetting } from '../db/settings';
import {
  DEFAULT_REMINDER_DAYS,
  cancelAllReminders,
  parseReminderDays,
  remindersSupported,
  rescheduleReminders,
  syncReminders,
} from '../utils/notifications';
import { getThemePreference, setThemePreference, type ThemePreference } from '../utils/theme';
import {
  LICENSES_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL,
  TERMS_URL,
} from '../utils/constants';
import { rateOnPlay } from '../utils/review';
import { downloadBackup, isShareCancelled } from '../utils/share';

const REMINDER_KEY = 'reminder_days';
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];


export default function SettingsScreen() {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);
  const [status, setStatus] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  // A backup that has been read and checked, waiting for "Replace everything".
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { pro, openUpgrade } = usePro();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>('idea');
  // Kept when the sheet closes by accident, so a half-written message survives.
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    getSetting(REMINDER_KEY).then((saved) => setReminderDays(parseReminderDays(saved)));
  }, []);

  function chooseTheme(value: ThemePreference) {
    setTheme(value);
    setThemePreference(value);
  }

  async function changeReminder(value: number) {
    setReminderDays(value);
    await setSetting(REMINDER_KEY, String(value));

    const result = await rescheduleReminders(value, await listHolidays());
    switch (result.status) {
      case 'scheduled':
        setStatus({
          kind: 'ok',
          text: result.count === 0 ? 'No upcoming holidays to remind you about yet.' : `${result.count} reminder${result.count === 1 ? '' : 's'} set.`,
        });
        break;
      case 'off':
        setStatus({ kind: 'ok', text: 'Reminders turned off.' });
        break;
      case 'denied':
        setStatus({ kind: 'bad', text: 'Notifications are blocked. Turn them on in your phone’s settings.' });
        break;
      case 'unsupported':
        setStatus({ kind: 'ok', text: 'Reminders only work in the installed app.' });
        break;
      case 'error':
        setStatus({ kind: 'bad', text: `Could not set reminders: ${result.message}` });
        break;
    }
  }

  async function handleExport() {
    setBusy(true);
    setStatus(null);
    try {
      const file = await exportData();
      const result = await downloadBackup(file);
      setStatus(
        result.shared
          ? { kind: 'ok', text: `Backup ready — ${result.filename}` }
          : { kind: 'ok', text: `Saved ${result.filename}` },
      );
    } catch (error) {
      if (!isShareCancelled(error)) setStatus({ kind: 'bad', text: `Export failed: ${(error as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Read and check the chosen file, then ask before replacing anything. The
   * file picker alone is not enough of a "yes": choosing last month's backup
   * by mistake would silently throw away everything planned since.
   */
  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file twice still fires a change event.
    event.target.value = '';
    if (!file) return;

    setStatus(null);
    try {
      setPendingRestore(validateBackup(JSON.parse(await file.text())));
    } catch (error) {
      setStatus({
        kind: 'bad',
        text:
          error instanceof BackupError
            ? error.message
            : 'That file could not be read. It may not be a KidRota backup.',
      });
    }
  }

  async function restoreBackup(file: BackupFile) {
    setPendingRestore(null);
    setBusy(true);
    setStatus(null);
    try {
      const restored = await importData(file);
      // The backup brings its own reminder setting and holidays; line the
      // phone's scheduled reminders up with them before starting afresh.
      await syncReminders();
      setStatus({
        kind: 'ok',
        text: `Restored ${plural(restored.children.length, 'child', 'children')} and ${plural(restored.holidays.length, 'holiday', 'holidays')}. Reopening…`,
      });
      // Everything on screen was read from the old data; restart cleanly.
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setStatus({
        kind: 'bad',
        text:
          error instanceof BackupError
            ? error.message
            : 'That backup could not be restored. Your plans are unchanged.',
      });
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    setStatus(null);
    const outcome = await restorePro();
    setBusy(false);
    switch (outcome.kind) {
      case 'restored':
        setStatus({ kind: 'ok', text: 'Pro restored. Thank you!' });
        break;
      case 'none':
        setStatus({ kind: 'bad', text: 'No Pro purchase found for the Google account on this phone.' });
        break;
      case 'failed':
        setStatus({ kind: 'bad', text: outcome.message });
        break;
    }
  }

  async function handleWipe() {
    setConfirmWipe(false);
    setBusy(true);
    await cancelAllReminders();
    await wipeAllData();
    // Onboarding state was read at launch, so a reload is the clean reset.
    window.location.reload();
  }

  function openUrl(url: string) {
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="screen">
      <header className="home-header">
        <div>
          <p className="page-eyebrow">KidRota</p>
          <h1 className="page-title">Settings</h1>
        </div>
      </header>

      {status && (
        <p className={status.kind === 'bad' ? 'form-error' : 'form-success'} role="status">
          {status.text}
        </p>
      )}

      <section className="settings-group">
        <h2 className="settings-group__title">Appearance</h2>
        <div className="setting-row">
          <span className="setting-row__label">Theme</span>
          <div className="segmented segmented--inline">
            {THEMES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  theme === option.value
                    ? 'segmented__option segmented__option--active'
                    : 'segmented__option'
                }
                aria-pressed={theme === option.value}
                onClick={() => chooseTheme(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">Reminders</h2>
        <div className="setting-row">
          <span className="setting-row__label">
            Remind me before a holiday
            {!remindersSupported() && (
              <span className="setting-row__sub">Only works in the installed app</span>
            )}
          </span>
          <select
            className="field__input setting-row__control"
            value={reminderDays}
            aria-label="Days before a holiday to remind me"
            onChange={(event) => changeReminder(Number(event.target.value))}
          >
            <option value={0}>Off</option>
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>
        </div>
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">Backup</h2>
        <button type="button" className="setting-row setting-row--action" disabled={busy} onClick={handleExport}>
          <span className="setting-row__label">
            Export a backup
            <span className="setting-row__sub">Saves everything as a JSON file</span>
          </span>
          <span className="setting-row__chevron">›</span>
        </button>
        <button
          type="button"
          className="setting-row setting-row--action"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <span className="setting-row__label">
            Restore from a backup
            <span className="setting-row__sub">Replaces everything on this phone</span>
          </span>
          <span className="setting-row__chevron">›</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={handleImportFile}
        />
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">KidRota Pro</h2>
        <button
          type="button"
          className="setting-row setting-row--action setting-row--accent"
          onClick={() => openUpgrade()}
        >
          <span className="setting-row__label">
            {pro ? 'Pro is unlocked' : 'Upgrade to Pro'}
            <span className="setting-row__sub">
              {pro ? 'Thank you for supporting KidRota' : 'Plan every holiday of the year, custom carer colours'}
            </span>
          </span>
          <span className="setting-row__chevron">›</span>
        </button>
        {!pro && (
          <button type="button" className="setting-row setting-row--action" disabled={busy} onClick={handleRestore}>
            <span className="setting-row__label">
              Restore purchases
              <span className="setting-row__sub">Already bought Pro on this Google account?</span>
            </span>
            <span className="setting-row__chevron">›</span>
          </button>
        )}
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">About</h2>
        <button type="button" className="setting-row setting-row--action" onClick={() => rateOnPlay()}>
          <span className="setting-row__label">Rate this app</span>
          <span className="setting-row__chevron">›</span>
        </button>
        <button
          type="button"
          className="setting-row setting-row--action"
          onClick={() => {
            setStatus(null);
            setFeedbackOpen(true);
          }}
        >
          <span className="setting-row__label">
            Send feedback
            <span className="setting-row__sub">Ideas for improvements, or something not working</span>
          </span>
          <span className="setting-row__chevron">›</span>
        </button>
        <button type="button" className="setting-row setting-row--action" onClick={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}>
          <span className="setting-row__label">Contact support</span>
          <span className="setting-row__chevron">›</span>
        </button>
        <button type="button" className="setting-row setting-row--action" onClick={() => openUrl(PRIVACY_URL)}>
          <span className="setting-row__label">Privacy policy</span>
          <span className="setting-row__chevron">›</span>
        </button>
        <button type="button" className="setting-row setting-row--action" onClick={() => openUrl(TERMS_URL)}>
          <span className="setting-row__label">Terms of service</span>
          <span className="setting-row__chevron">›</span>
        </button>
        <button type="button" className="setting-row setting-row--action" onClick={() => openUrl(LICENSES_URL)}>
          <span className="setting-row__label">Open-source licences</span>
          <span className="setting-row__chevron">›</span>
        </button>
        <div className="setting-row">
          <span className="setting-row__label">Version</span>
          <span className="setting-row__value">{__APP_VERSION__}</span>
        </div>
      </section>

      <section className="settings-group">
        <button
          type="button"
          className="setting-row setting-row--action setting-row--danger"
          disabled={busy}
          onClick={() => setConfirmWipe(true)}
        >
          <span className="setting-row__label">Delete all data</span>
        </button>
      </section>

      {feedbackOpen && (
        <Modal title="Send feedback" onClose={() => setFeedbackOpen(false)}>
          <fieldset className="field">
            <legend className="field__label">What is it about?</legend>
            <div className="chips">
              {FEEDBACK_KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={feedbackKind === option.value ? 'chip chip--choice chip--choice-selected' : 'chip chip--choice'}
                  aria-pressed={feedbackKind === option.value}
                  onClick={() => setFeedbackKind(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span className="field__label">Your message</span>
            <textarea
              className="field__input feedback-input"
              value={feedbackText}
              rows={6}
              maxLength={FEEDBACK_MAX_LENGTH}
              placeholder={
                feedbackKind === 'problem'
                  ? 'What happened, and what did you expect?'
                  : 'What would make KidRota better for you?'
              }
              onChange={(event) => setFeedbackText(event.target.value)}
            />
          </label>
          <p className="paste-hint">
            This opens your email app with your message ready to send to {SUPPORT_EMAIL}. Nothing is
            sent until you press send there.
          </p>
          <div className="holiday-form__actions">
            <button type="button" className="button button--secondary" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={!feedbackText.trim()}
              onClick={() => {
                openUrl(feedbackMailto(SUPPORT_EMAIL, feedbackKind, feedbackText, __APP_VERSION__));
                setFeedbackOpen(false);
                setFeedbackText('');
              }}
            >
              Open email
            </button>
          </div>
        </Modal>
      )}

      {pendingRestore && (
        <ConfirmDialog
          title="Restore this backup?"
          message={`This replaces everything on this phone with the backup${
            backupDate(pendingRestore) ? ` from ${backupDate(pendingRestore)}` : ''
          }: ${plural(pendingRestore.children.length, 'child', 'children')}, ${plural(
            pendingRestore.carers.length,
            'carer',
            'carers',
          )} and ${plural(pendingRestore.holidays.length, 'holiday', 'holidays')}. Anything added since that backup will be lost.`}
          confirmLabel="Replace everything"
          onConfirm={() => restoreBackup(pendingRestore)}
          onCancel={() => setPendingRestore(null)}
        />
      )}

      {confirmWipe && (
        <ConfirmDialog
          title="Delete all data"
          message="This removes every child, carer, holiday and plan from this phone. If you have not exported a backup, this cannot be undone."
          confirmLabel="Delete everything"
          onConfirm={handleWipe}
          onCancel={() => setConfirmWipe(false)}
        />
      )}
    </div>
  );
}
