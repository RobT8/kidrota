/**
 * The KidRota icon (design "AB1"): a week-grid calendar page with a row of
 * cover slots (one still a red gap), and a grown-up and child standing on it.
 *
 * Drawn on a 108 x 108 canvas — Android's adaptive-icon grid — so the same
 * artwork serves the launcher icons, the Play Store icon and the splash.
 */
const BLUE = '#185FA5';

/** Everything except the background, in 108-unit coordinates. */
const ART = `
  <rect x="20" y="20" width="68" height="72" rx="9" fill="#fff"/>
  <rect x="20" y="20" width="68" height="14" rx="9" fill="#E6F1FB"/>
  <rect x="20" y="27" width="68" height="7" fill="#E6F1FB"/>
  <rect x="32" y="14" width="5" height="12" rx="2.5" fill="#fff"/>
  <rect x="71" y="14" width="5" height="12" rx="2.5" fill="#fff"/>
  <rect x="27" y="40" width="15" height="11" rx="3" fill="#E1F5EE" stroke="#1D9E75" stroke-width="1.5"/>
  <rect x="46.5" y="40" width="15" height="11" rx="3" fill="#FAEEDA" stroke="#BA7517" stroke-width="1.5"/>
  <rect x="66" y="40" width="15" height="11" rx="3" fill="#FCEBEB" stroke="#A32D2D" stroke-width="1.5" stroke-dasharray="3 2"/>
  <g transform="translate(47 74)" fill="${BLUE}">
    <circle cx="0" cy="-10" r="7"/>
    <path d="M-12 14 c0-10 5-16 12-16 s12 6 12 16 z"/>
  </g>
  <g transform="translate(64 78)" fill="#E8A33D">
    <circle cx="0" cy="-6" r="5.4"/>
    <path d="M-9 12 c0-7 4-11 9-11 s9 4 9 11 z"/>
  </g>`;

/** The artwork scaled about the canvas centre. */
function art(scale) {
  return `<g transform="translate(54 54) scale(${scale}) translate(-54 -53)">${ART}</g>`;
}

function svg(body, width = 108, height = 108) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 108 108">${body}</svg>`;
}

module.exports = {
  BLUE,
  /** Rounded tile: legacy launcher icon and the web favicon. */
  tile: () => svg(`<rect width="108" height="108" rx="24" fill="${BLUE}"/>${art(0.94)}`),
  /** Circle: the legacy round launcher icon. */
  round: () => svg(`<circle cx="54" cy="54" r="54" fill="${BLUE}"/>${art(0.8)}`),
  /** Full-bleed square: Google Play applies its own rounded mask. */
  square: () => svg(`<rect width="108" height="108" fill="${BLUE}"/>${art(0.9)}`),
  /**
   * Adaptive-icon foreground on transparent. Launchers show only the middle
   * 72 of the 108 units and may mask it to a circle, so the artwork is kept
   * inside the 66-unit safe zone.
   */
  foreground: () => svg(art(0.62)),
};
