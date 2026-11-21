// Layout, grade and caption-style data for Cover Coast Studio.
// Pure data + pure geometry: no DOM here, so Node can import this module
// for the layout tests (see /tmp tests, not part of the entry).

export const LAYOUTS = [
  { id: 'hero-three', name: 'Hero & Three', panels: 4, blurb: 'The classic GTA grid: one hero, three supporting shots.' },
  { id: 'nine', name: 'Nine Panel', panels: 9, blurb: 'The full poster grid with a title block.' },
  { id: 'full-bleed', name: 'Full Bleed', panels: 1, blurb: 'One photo, edge to edge, title over the bottom.' },
  { id: 'tilted', name: 'Tilted Snapshots', panels: 3, blurb: 'Overlapping tilted snapshots, like prints on a table.' },
  { id: 'diagonal', name: 'Diagonal', panels: 3, blurb: 'Hero bottom-left, world panels rising to top-right.' },
  { id: 'mosaic', name: 'Mosaic', panels: 12, blurb: 'One photo sliced across twelve small panels.' },
  { id: 'duo', name: 'Split Duo', panels: 2, blurb: 'Two panels side by side with a title block.' },
  { id: 'triple-strip', name: 'Triple Strip', panels: 3, blurb: 'Three vertical strips with a title block.' },
  { id: 'poster-title', name: 'Poster & Title', panels: 1, blurb: 'Big photo on top, halftone title block below.' },
];

export const GRADES = [
  {
    id: 'vice-sunset', name: 'Vice Sunset', mix: 0.72, sat: 1.12,
    stops: [[0, '#160a2e'], [0.35, '#7b1e5b'], [0.65, '#ff2e88'], [0.85, '#ff7a3d'], [1, '#ffd166']],
  },
  {
    id: 'neon-nights', name: 'Neon Nights', mix: 0.75, sat: 1.15,
    stops: [[0, '#050510'], [0.3, '#12063b'], [0.55, '#ff2e88'], [0.8, '#19e3d6'], [1, '#e8fff9']],
  },
  {
    id: 'golden-hour', name: 'Golden Hour', mix: 0.7, sat: 1.12,
    stops: [[0, '#241505'], [0.35, '#7a3c10'], [0.65, '#e2701d'], [0.85, '#ffb347'], [1, '#fff3c4']],
  },
  {
    id: 'palm-noir', name: 'Palm Noir', mix: 0.85, sat: 0.55,
    stops: [[0, '#000000'], [0.5, '#555555'], [1, '#ffffff']],
  },
  {
    id: 'bubblegum', name: 'Bubblegum', mix: 0.7, sat: 1.18,
    stops: [[0, '#2a0a2e'], [0.4, '#c2187a'], [0.7, '#ff7ad9'], [1, '#ffe3f2']],
  },
  {
    id: 'afterglow', name: 'Afterglow', mix: 0.75, sat: 1.15,
    stops: [[0, '#1a0533'], [0.35, '#5b1a6e'], [0.6, '#ff2e88'], [0.85, '#ff5e3a'], [1, '#ffe9c4']],
  },
  {
    id: 'teal-dawn', name: 'Teal Dawn', mix: 0.7, sat: 1.12,
    stops: [[0, '#03161c'], [0.35, '#0b5563'], [0.65, '#19b8a6'], [0.85, '#ffd166'], [1, '#fffbe8']],
  },
];

export const CAPTION_STYLES = [
  { id: 'gradient', name: 'Sunset gradient' },
  { id: 'white', name: 'White' },
  { id: 'outline', name: 'Outline' },
];

export const SIZES = [
  { id: '1080x1080', name: 'Square 1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', name: 'Portrait 1080', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', name: 'Wide 1920', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

export const DEFAULT_CAPTIONS = [
  { caption: 'Solstice Bay', subtitle: 'Golden Getaway' },
  { caption: 'Midnight Marina', subtitle: 'Neon Tide' },
  { caption: 'Palm Court', subtitle: 'Sunset Run' },
  { caption: 'Coral Keys', subtitle: 'Afterglow' },
];

/** Seeded PRNG (mulberry32) so the grain is identical on every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hex colour string -> [r, g, b]. */
export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Builds a 256-entry gradient-map lookup table from colour stops.
 * lut[i] is the mapped colour for luminance i (0-255), as [r, g, b].
 */
export function buildLut(stops) {
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    const ca = hexRgb(a[1]);
    const cb = hexRgb(b[1]);
    lut[i] = [
      Math.round(ca[0] + (cb[0] - ca[0]) * f),
      Math.round(ca[1] + (cb[1] - ca[1]) * f),
      Math.round(ca[2] + (cb[2] - ca[2]) * f),
    ];
  }
  return lut;
}

/**
 * Panel geometry for a layout at pixel size W x H.
 * Returns { panels: [{x, y, w, h, rot}], title: {x, y, w, h, align, band} }.
 * All coordinates are whole pixels; every panel stays inside the canvas.
 */
export function layoutPanels(id, W, H) {
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.012)); // gutter
  const band = (top) => ({ x: 0, y: Math.round(H * top), w: W, h: H - Math.round(H * top), align: 'center', band: true });
  switch (id) {
    case 'hero-three': {
      const heroW = Math.round(W * 0.6);
      const colX = heroW + g;
      const colW = W - colX;
      const rowH = Math.round((H - 2 * g) / 3);
      return {
        panels: [
          { x: 0, y: 0, w: heroW, h: H, rot: 0 },
          { x: colX, y: 0, w: colW, h: rowH, rot: 0 },
          { x: colX, y: rowH + g, w: colW, h: rowH, rot: 0 },
          { x: colX, y: 2 * (rowH + g), w: colW, h: H - 2 * (rowH + g), rot: 0 },
        ],
        title: { x: Math.round(W * 0.04), y: Math.round(H * 0.72), w: Math.round(W * 0.52), h: Math.round(H * 0.24), align: 'left', band: false },
      };
    }
    case 'nine': {
      const top = 0.74;
      const areaH = Math.round(H * top);
      const cw = Math.round((W - 2 * g) / 3);
      const ch = Math.round((areaH - 2 * g) / 3);
      const panels = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          panels.push({
            x: c * (cw + g), y: r * (ch + g),
            w: c === 2 ? W - 2 * (cw + g) : cw,
            h: r === 2 ? areaH - 2 * (ch + g) : ch,
            rot: 0,
          });
        }
      }
      return { panels, title: band(0.76) };
    }
    case 'full-bleed':
      return {
        panels: [{ x: 0, y: 0, w: W, h: H, rot: 0 }],
        title: { x: Math.round(W * 0.04), y: Math.round(H * 0.7), w: Math.round(W * 0.92), h: Math.round(H * 0.26), align: 'left', band: false },
      };
    case 'tilted':
      return {
        panels: [
          { x: Math.round(W * 0.05), y: Math.round(H * 0.05), w: Math.round(W * 0.44), h: Math.round(H * 0.6), rot: -5 },
          { x: Math.round(W * 0.51), y: Math.round(H * 0.08), w: Math.round(W * 0.44), h: Math.round(H * 0.6), rot: 4 },
          { x: Math.round(W * 0.27), y: Math.round(H * 0.44), w: Math.round(W * 0.46), h: Math.round(H * 0.36), rot: -2 },
        ],
        title: { x: Math.round(W * 0.04), y: Math.round(H * 0.8), w: Math.round(W * 0.62), h: Math.round(H * 0.17), align: 'left', band: false },
      };
    case 'diagonal': {
      const heroW = Math.round(W * 0.55);
      const colX = heroW + g;
      const colW = W - colX;
      return {
        panels: [
          { x: 0, y: Math.round(H * 0.42), w: heroW, h: H - Math.round(H * 0.42), rot: 0 },
          { x: colX, y: 0, w: colW, h: Math.round(H * 0.4), rot: 0 },
          { x: colX, y: Math.round(H * 0.4) + g, w: colW, h: H - Math.round(H * 0.4) - g, rot: 0 },
        ],
        title: { x: Math.round(W * 0.04), y: Math.round(H * 0.78), w: Math.round(W * 0.47), h: Math.round(H * 0.2), align: 'left', band: false },
      };
    }
    case 'mosaic': {
      const top = 0.8;
      const areaH = Math.round(H * top);
      const cw = Math.round((W - 3 * g) / 4);
      const ch = Math.round((areaH - 2 * g) / 3);
      const panels = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          panels.push({
            x: c * (cw + g), y: r * (ch + g),
            w: c === 3 ? W - 3 * (cw + g) : cw,
            h: r === 2 ? areaH - 2 * (ch + g) : ch,
            rot: 0,
          });
        }
      }
      return {
        panels,
        title: { x: Math.round(W * 0.04), y: Math.round(H * 0.82), w: Math.round(W * 0.92), h: Math.round(H * 0.16), align: 'center', band: false },
      };
    }
    case 'duo': {
      const pw = Math.round((W - g) / 2);
      const ph = Math.round(H * 0.72);
      return {
        panels: [
          { x: 0, y: 0, w: pw, h: ph, rot: 0 },
          { x: pw + g, y: 0, w: W - pw - g, h: ph, rot: 0 },
        ],
        title: band(0.74),
      };
    }
    case 'triple-strip': {
      const pw = Math.round((W - 2 * g) / 3);
      const ph = Math.round(H * 0.72);
      return {
        panels: [
          { x: 0, y: 0, w: pw, h: ph, rot: 0 },
          { x: pw + g, y: 0, w: pw, h: ph, rot: 0 },
          { x: 2 * (pw + g), y: 0, w: W - 2 * (pw + g), h: ph, rot: 0 },
        ],
        title: band(0.74),
      };
    }
    case 'poster-title':
    default:
      return {
        panels: [{ x: 0, y: 0, w: W, h: Math.round(H * 0.66), rot: 0 }],
        title: { x: 0, y: Math.round(H * 0.66), w: W, h: H - Math.round(H * 0.66), align: 'center', band: true },
      };
  }
}
