const POINTS = [
  {
    icon: 'calendar',
    title: 'School holidays sorted',
    body: 'Every break on one screen, with the gaps that still need cover in red.',
  },
  {
    icon: 'tap',
    title: 'One tap planning',
    body: 'Assign carers to mornings and afternoons. Repeat across the week.',
  },
  {
    icon: 'lock',
    title: 'No account needed',
    body: 'Everything stays on your phone. Private and offline.',
  },
];

function PointIcon({ name }: { name: string }) {
  const common = {
    width: 32,
    height: 32,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="M11 14h2v3h-2z" />
      </svg>
    );
  }
  if (name === 'tap') {
    return (
      <svg {...common}>
        <path d="M9 11V6a1.5 1.5 0 0 1 3 0v5" />
        <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
        <path d="M15 11V7.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-2a1.5 1.5 0 0 1 3 0" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M10.5 18.5h3" />
      <path d="M9.5 11V9.5a2.5 2.5 0 0 1 5 0V11" />
      <rect x="8.5" y="11" width="7" height="5" rx="1.2" />
    </svg>
  );
}

interface WelcomeProps {
  onDone: () => void;
}

/**
 * The first screen anyone sees: what KidRota is, and one way forward.
 *
 * One page rather than swipeable slides, so the way in is a single obvious
 * button instead of three pages of Next.
 */
export default function Welcome({ onDone }: WelcomeProps) {
  return (
    <div className="welcome">
      <header className="welcome__header">
        <h1 className="welcome__title">Welcome to KidRota</h1>
        <p className="welcome__body">
          Plan who’s looking after the kids in every school holiday.
        </p>
      </header>

      <ul className="welcome__points">
        {POINTS.map((point) => (
          <li className="welcome__point" key={point.title}>
            <span className="welcome__icon">
              <PointIcon name={point.icon} />
            </span>
            <span>
              <span className="welcome__point-title">{point.title}</span>
              <span className="welcome__point-body">{point.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <button type="button" className="button button--primary" onClick={onDone}>
        Get started
      </button>
    </div>
  );
}
