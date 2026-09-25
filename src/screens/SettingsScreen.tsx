import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { BackupError, exportData, importData, wipeAllData } from '../db/backup';
import { importSharedPlan } from '../db/importPlan';
import { ShareCodeError, decodePlan } from '../utils/shareCode';
import { plural } from '../utils/status';
import Modal from '../components/Modal';
import { listHolidays } from '../db/holidays';
import { listChildren } from '../db/children';
import { usePro } from '../hooks/usePro';
import { importBlockedBy } from '../utils/freeTier';
import { restorePro } from '../utils/billing';
import { buildPlanCode } from '../db/exportPlan';
import { formatDateRange } from '../utils/dates';
import type { Holiday } from '../db/types';
import { getSetting, setSetting } from '../db/settings';
import {
  DEFAULT_REMINDER_DAYS,
  cancelAllReminders,
  remindersSupported,
  rescheduleReminders,
} from '../utils/notifications';
import { getThemePreference, setThemePreference, type ThemePreference } from '../utils/theme';
import {
  PLAY_STORE_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL,
  TERMS_URL,
} from '../utils/constants';
import { downloadBackup, sharePlanCode } from '../utils/share';

const REMINDER_KEY = 'reminder_days';
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];


export default function SettingsScreen() {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);
  const [status, setStatus] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { pro, openUpgrade } = usePro();
  // The holidays offered by "Send a plan", or null while that sheet is shut.
  const [sendHolidays, setSendHolidays] = useState<Holiday[] | null>(null);

  useEffect(() => {
    getSetting(REMINDER_KEY).then((saved) => {
      const parsed = Number(saved);
      if (Number.isFinite(parsed) && parsed >= 0) setReminderDays(parsed);
    });
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
      setStatus({ kind: 'bad', text: `Export failed: ${(error as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file twice still fires a change event.
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setStatus(null);
    try {
      const restored = await importData(JSON.parse(await file.text()));
      setStatus({
        kind: 'ok',
        text: `Restored ${restored.children.length} children and ${restored.holidays.length} holidays. Reopening…`,
      });
      // Everything on screen was read from the old data; restart cleanly.
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setStatus({
        kind: 'bad',
        text:
          error instanceof BackupError
            ? error.message
            : 'That file could not be read. It may not be a KidRota backup.',
      });
      setBusy(false);
    }
  }

  /** Take a plan code from the other parent and add it to this device. */
  async function handlePasteCode() {
    setBusy(true);
    setStatus(null);
    try {
      const plan = decodePlan(code);
      // A backup restore is exempt — it brings back what was already yours —
      // but a plan code adds, so it counts against the free-tier caps.
      const blocked = importBlockedBy(
        (await listChildren()).map((child) => child.name),
        plan.children.map((child) => child.name),
        (await listHolidays()).length,
        pro,
      );
      if (blocked) {
        openUpgrade(blocked);
        return;
      }
      const result = await importSharedPlan(plan);
      const people = [
        result.childrenAdded > 0 ? `${plural(result.childrenAdded, 'child', 'children')}` : null,
        result.carersAdded > 0 ? `${plural(result.carersAdded, 'carer', 'carers')}` : null,
      ].filter(Boolean);
      setStatus({
        kind: 'ok',
        text: `Added “${result.holidayName}” with ${plural(result.assignments, 'slot', 'slots')}${
          people.length ? `, plus ${people.join(' and ')}` : ''
        }.`,
      });
      setPasting(false);
      setCode('');
    } catch (error) {
      setStatus({
        kind: 'bad',
        text: error instanceof ShareCodeError ? error.message : 'That code could not be read.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function openSendPlan() {
    setStatus(null);
    setSendHolidays(await listHolidays());
  }

  /** Send one holiday's plan through the share sheet. */
  async function sendPlan(holidayId: number) {
    setBusy(true);
    try {
      const built = await buildPlanCode(holidayId);
      if (!built) throw new Error('that holiday could not be found');
      const how = await sharePlanCode(built.code, built.name);
      setSendHolidays(null);
      if (how === 'copied') setStatus({ kind: 'ok', text: 'Plan copied — paste it into a message.' });
    } catch (error) {
      setSendHolidays(null);
      setStatus({ kind: 'bad', text: `Could not send the plan: ${(error as Error).message}` });
    } finally {
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
        <h2 className="settings-group__title">Shared plans</h2>
        <button
          type="button"
          className="setting-row setting-row--action"
          disabled={busy}
          onClick={openSendPlan}
        >
          <span className="setting-row__label">
            Send a plan to someone
            <span className="setting-row__sub">
              A message they paste into their own KidRota
            </span>
          </span>
          <span className="setting-row__chevron">›</span>
        </button>
        <button
          type="button"
          className="setting-row setting-row--action"
          disabled={busy}
          onClick={() => {
            setStatus(null);
            setPasting(true);
          }}
        >
          <span className="setting-row__label">
            Add a plan someone sent you
            <span className="setting-row__sub">
              Paste their code — it adds to your plans, it does not replace them
            </span>
          </span>
          <span className="setting-row__chevron">›</span>
        </button>
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
              {pro ? 'Thank you for supporting KidRota' : 'Unlimited children and holidays, custom carer colours'}
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
        <button type="button" className="setting-row setting-row--action" onClick={() => openUrl(PLAY_STORE_URL)}>
          <span className="setting-row__label">Rate this app</span>
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

      {pasting && (
        <Modal title="Add a shared plan" onClose={() => setPasting(false)}>
          <label className="field">
            <span className="field__label">Paste the message they sent you</span>
            <textarea
              className="field__input code-input"
              value={code}
              rows={5}
              placeholder="Paste the whole message — KidRota finds the plan in it"
              autoFocus
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <p className="paste-hint">
            No need to trim it: paste the whole message, and KidRota picks out the part starting
            “KIDROTA1:”.
            {code && (
              <>
                {' '}
                <button type="button" className="link-button paste-hint__clear" onClick={() => setCode('')}>
                  Clear
                </button>
              </>
            )}
          </p>
          <div className="holiday-form__actions">
            <button type="button" className="button button--secondary" onClick={() => setPasting(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={!code.trim() || busy}
              onClick={handlePasteCode}
            >
              {busy ? 'Adding…' : 'Add plan'}
            </button>
          </div>
        </Modal>
      )}

      {sendHolidays && (
        <Modal title="Send a plan" onClose={() => setSendHolidays(null)}>
          {sendHolidays.length === 0 ? (
            <p className="placeholder-note">Add a holiday first, then you can send its plan.</p>
          ) : (
            <>
              <p className="paste-hint">Which holiday? It opens your share sheet — WhatsApp, Messages, email.</p>
              {sendHolidays.map((holiday) => (
                <button
                  type="button"
                  key={holiday.id}
                  className="setting-row setting-row--action"
                  disabled={busy}
                  onClick={() => sendPlan(holiday.id)}
                >
                  <span className="setting-row__label">
                    {holiday.name}
                    <span className="setting-row__sub">
                      {formatDateRange(holiday.start_date, holiday.end_date)}
                    </span>
                  </span>
                  <span className="setting-row__chevron">›</span>
                </button>
              ))}
            </>
          )}
        </Modal>
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
