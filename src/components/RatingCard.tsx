interface RatingCardProps {
  onRate: () => void;
  onLater: () => void;
}

/**
 * A gentle, dismissible ask for a Play rating. It sits in the page rather
 * than popping up, so it never stands between a parent and their plan.
 */
export default function RatingCard({ onRate, onLater }: RatingCardProps) {
  return (
    <section className="rating-card card" aria-labelledby="rating-card-title">
      <p className="rating-card__title" id="rating-card-title">
        <span aria-hidden="true">⭐ </span>Finding KidRota useful?
      </p>
      <p className="rating-card__body">A rating on Google Play helps other parents find it.</p>
      <div className="rating-card__actions">
        <button type="button" className="button button--primary" onClick={onRate}>
          Rate KidRota
        </button>
        <button type="button" className="button button--secondary" onClick={onLater}>
          Not now
        </button>
      </div>
    </section>
  );
}
