import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DayList from '../components/DayList';
import Loading from '../components/Loading';
import WeekGrid from '../components/WeekGrid';
import { useAssignments } from '../hooks/useAssignments';
import Modal from '../components/Modal';
import { isShareCancelled, shareElementsAsImages } from '../utils/share';
import { formatDateRange, todayISO } from '../utils/dates';
import { getHolidayCoverage } from '../db/coverage';
import { maybeAskForReview } from '../utils/review';

type View = 'week' | 'list';

/**
 * List first: a day per row reads more easily on a phone than the grid, which
 * stays one tap away. Kept outside the component so the choice survives going
 * into a day and back — the planner remounts on the way — until the app is
 * next launched.
 */
let lastView: View = 'list';

export default function WeeklyPlannerScreen() {
  const { holidayId } = useParams();
  const navigate = useNavigate();
  const id = Number(holidayId);

  const { holiday, children, carersById, dates, weeks, byDayAndChild, loading, error } =
    useAssignments(id);

  // Null until the user pages somewhere, so the default below can follow the
  // data as it loads without an effect writing state back during render.
  const [chosenWeek, setChosenWeek] = useState<number | null>(null);
  const [view, setViewState] = useState<View>(() => lastView);
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function setView(next: View) {
    lastView = next;
    setViewState(next);
  }

  // The weeks being drawn off screen for the picture, or null when not sharing.
  const [picturing, setPicturing] = useState<number[] | null>(null);
  const pictures = useRef<HTMLDivElement>(null);

  // Open on the week containing today, so a holiday already under way does not
  // start the parent on a week that has been and gone.
  const defaultWeek = useMemo(() => {
    const today = todayISO();
    const current = weeks.findIndex((week) => week.some((date) => date >= today));
    return current === -1 ? 0 : current;
  }, [weeks]);

  // A holiday with every day covered is the moment the app has just done its
  // job, so that is when to ask for a review. The planner remounts on the way
  // back from a day, so this runs after each change; the timing rule in
  // utils/reviewPrompt.ts keeps it from asking more than rarely.
  useEffect(() => {
    if (loading) return;
    getHolidayCoverage(id)
      .then((coverage) => {
        if (coverage && !coverage.empty && coverage.gapDays === 0) return maybeAskForReview();
      })
      .catch(() => {});
  }, [id, loading]);

  const weekIndex = Math.min(chosenWeek ?? defaultWeek, Math.max(0, weeks.length - 1));

  if (loading) {
    return (
      <div className="screen">
        <Loading />
      </div>
    );
  }

  if (error || !holiday) {
    return (
      <div className="screen">
        <button type="button" className="link-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <p className="form-error" role="alert">
          That holiday could not be found.
        </p>
      </div>
    );
  }

  const week = weeks[weekIndex] ?? [];
  /** Open a day, scrolled to the child whose cell was tapped. */
  const openDay = (date: string, childId?: number) =>
    navigate(`/holiday/${id}/day/${date}${childId === undefined ? '' : `?child=${childId}`}`);

  /**
   * Share whole weeks as pictures. They are drawn off screen at full width
   * rather than captured from the screen, where a week wider than the phone
   * would be cut off at the edge.
   */
  async function sharePictures(weekIndexes: number[]) {
    setBusy(true);
    setShareStatus(null);
    setPicturing(weekIndexes);
    try {
      // Let React draw the off-screen weeks before capturing them.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const pages = [...(pictures.current?.querySelectorAll<HTMLElement>('.share-page') ?? [])];
      if (pages.length === 0) throw new Error('nothing to draw');
      const result = await shareElementsAsImages(pages, holiday!.name);
      setShareStatus(result.shared ? null : `Saved ${result.filename}`);
      if (result.shared) setSharing(false);
    } catch (error) {
      if (!isShareCancelled(error)) setShareStatus(`Could not create the picture: ${(error as Error).message}`);
    } finally {
      setPicturing(null);
      setBusy(false);
    }
  }

  const weekNav =
    weeks.length > 1 ? (
      <nav className="week-nav" aria-label="Weeks">
        <button
          type="button"
          className="week-nav__arrow"
          disabled={weekIndex === 0}
          onClick={() => setChosenWeek(Math.max(0, weekIndex - 1))}
        >
          <span aria-hidden="true">‹</span> Prev
        </button>
        <span className="week-nav__dots">
          {weeks.map((weekDates, i) => (
            <button
              key={weekDates[0]}
              type="button"
              className={i === weekIndex ? 'dot dot--active' : 'dot'}
              aria-label={`Week ${i + 1}`}
              aria-current={i === weekIndex}
              onClick={() => setChosenWeek(i)}
            />
          ))}
        </span>
        <button
          type="button"
          className="week-nav__arrow"
          disabled={weekIndex >= weeks.length - 1}
          onClick={() => setChosenWeek(Math.min(weeks.length - 1, weekIndex + 1))}
        >
          Next <span aria-hidden="true">›</span>
        </button>
      </nav>
    ) : null;

  return (
    <div className="screen">
      <header className="planner-header">
        <button
          type="button"
          className="back-button"
          aria-label="Back to holidays"
          onClick={() => navigate('/')}
        >
          ←
        </button>
        <div className="planner-header__titles">
          <h1 className="planner-header__name">{holiday.name}</h1>
          {view === 'week' && weeks.length > 0 && (
            <p className="planner-header__week">
              Week {weekIndex + 1} of {weeks.length}
            </p>
          )}
        </div>
        <button
          type="button"
          className="share-button"
          onClick={() => {
            setShareStatus(null);
            setSharing(true);
          }}
        >
          Share <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="segmented segmented--compact">
        <button
          type="button"
          className={view === 'week' ? 'segmented__option segmented__option--active' : 'segmented__option'}
          aria-pressed={view === 'week'}
          onClick={() => setView('week')}
        >
          Week
        </button>
        <button
          type="button"
          className={view === 'list' ? 'segmented__option segmented__option--active' : 'segmented__option'}
          aria-pressed={view === 'list'}
          onClick={() => setView('list')}
        >
          List
        </button>
      </div>

      {children.length === 0 ? (
        <div className="empty-state card">
          <p className="empty-state__title">No children yet</p>
          <p className="empty-state__body">Add a child before planning cover.</p>
          <button type="button" className="button button--primary" onClick={() => navigate('/children')}>
            Add a child
          </button>
        </div>
      ) : view === 'week' ? (
        <>
          {weekNav}
          <WeekGrid
            dates={week}
            childList={children}
            byDayAndChild={byDayAndChild}
            carersById={carersById}
            onSelect={openDay}
          />
          {weekNav}
        </>
      ) : (
        <DayList
          dates={dates}
          childList={children}
          byDayAndChild={byDayAndChild}
          carersById={carersById}
          onSelect={openDay}
        />
      )}
      {sharing && (
        <Modal title="Share as a picture" onClose={() => setSharing(false)}>
          <p className="paste-hint">
            A picture of the plan, ready for WhatsApp or a message. Every day of the week is
            included.
          </p>
          <button
            type="button"
            className="setting-row setting-row--action"
            disabled={busy}
            onClick={() => sharePictures([weekIndex])}
          >
            <span className="setting-row__label">
              {weeks.length > 1 ? `Week ${weekIndex + 1}` : 'This week'}
              <span className="setting-row__sub">{formatDateRange(week[0], week[week.length - 1])}</span>
            </span>
            <span className="setting-row__chevron">›</span>
          </button>

          {weeks.length > 1 && (
            <button
              type="button"
              className="setting-row setting-row--action"
              disabled={busy}
              onClick={() => sharePictures(weeks.map((_, i) => i))}
            >
              <span className="setting-row__label">
                The whole holiday
                <span className="setting-row__sub">One picture per week, {weeks.length} in all</span>
              </span>
              <span className="setting-row__chevron">›</span>
            </button>
          )}

          {busy && <p className="paste-hint">Drawing the picture…</p>}
          {shareStatus && (
            <p className="form-success share-status" role="status">
              {shareStatus}
            </p>
          )}
        </Modal>
      )}

      {picturing && (
        // Off screen, never seen: just something for the capture to draw.
        <div ref={pictures} className="share-pages" aria-hidden="true">
          {picturing.map((index) => (
            <div className="share-page" key={index}>
              <p className="share-page__caption">
                {holiday.name}
                {weeks.length > 1 ? ` · Week ${index + 1} of ${weeks.length}` : ''}
              </p>
              <WeekGrid
                dates={weeks[index]}
                childList={children}
                byDayAndChild={byDayAndChild}
                carersById={carersById}
                onSelect={() => {}}
                picture
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
