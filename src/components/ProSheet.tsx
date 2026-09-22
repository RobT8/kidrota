import { useState } from 'react';
import Modal from './Modal';
import {
  MANAGE_SUBSCRIPTION_URL,
  buyPro,
  restorePro,
  type BillingState,
  type ProPlan,
} from '../utils/billing';
import { limitMessage, type ProFeature } from '../utils/freeTier';

interface ProSheetProps {
  billing: BillingState;
  /** The limit that opened the sheet, if any. */
  feature?: ProFeature;
  onClose: () => void;
}

type Status = { kind: 'ok' | 'bad'; text: string } | null;

const BENEFITS = [
  'Plan for as many children as you have',
  'Plan every holiday of the year at once',
  'Pick your own colour for each carer',
];

export default function ProSheet({ billing, feature, onClose }: ProSheetProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function buy(plan: ProPlan) {
    setBusy(true);
    setStatus(null);
    const outcome = await buyPro(plan);
    setBusy(false);
    if (outcome.kind === 'failed') setStatus({ kind: 'bad', text: outcome.message });
    // A finished purchase shows itself: the sheet switches to the unlocked
    // view as soon as Play approves it. Cancelling needs no comment.
  }

  async function restore() {
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

  if (billing.pro) {
    return (
      <Modal title="KidRota Pro" onClose={onClose}>
        <p className="pro-sheet__lead">Pro is unlocked on this phone. Thank you for supporting KidRota!</p>
        <ul className="pro-sheet__benefits">
          {BENEFITS.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
        {billing.plan === 'yearly' && (
          <a className="button button--secondary pro-sheet__manage" href={MANAGE_SUBSCRIPTION_URL} target="_blank" rel="noopener">
            Manage subscription in Google Play
          </a>
        )}
        {status && (
          <p className={status.kind === 'bad' ? 'form-error' : 'form-success'} role="status">
            {status.text}
          </p>
        )}
        <button type="button" className="button button--primary" onClick={onClose}>
          Done
        </button>
      </Modal>
    );
  }

  const lifetime = billing.prices.lifetime;
  const yearly = billing.prices.yearly;

  return (
    <Modal title="KidRota Pro" onClose={onClose}>
      {feature && <p className="pro-sheet__reason">{limitMessage(feature)}</p>}
      <ul className="pro-sheet__benefits">
        {BENEFITS.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>

      <div className="pro-sheet__options">
        <button
          type="button"
          className="button button--primary"
          disabled={busy || !lifetime}
          onClick={() => buy('lifetime')}
        >
          {lifetime ? `Buy once — ${lifetime}` : 'Buy once'}
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={busy || !yearly}
          onClick={() => buy('yearly')}
        >
          {yearly ? `Yearly — ${yearly} a year` : 'Yearly'}
        </button>
      </div>

      {!billing.available && (
        <p className="pro-sheet__note">
          Prices appear once Google Play is reachable. Purchases only work in the app installed
          from Google Play.
        </p>
      )}

      {status && (
        <p className={status.kind === 'bad' ? 'form-error' : 'form-success'} role="status">
          {status.text}
        </p>
      )}

      <p className="pro-sheet__note">
        The yearly plan renews automatically until you cancel it in Google Play. If Pro ends,
        everything you have already planned stays on your phone and stays usable.
      </p>

      <button type="button" className="link-button pro-sheet__restore" disabled={busy} onClick={restore}>
        Restore purchases
      </button>
    </Modal>
  );
}
