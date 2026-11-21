// Cover Coast Studio — page wiring: state, controls, undo/redo, export.
// The cover itself is drawn by cover.js; this file only moves state around
// and asks for a re-render. A `?shot=` query sets up a fixed scene instead
// (see shots.js).
import { drawCover } from './cover.js';
import { runShot } from './shots.js';
import { layoutPanels, LAYOUTS, GRADES, CAPTION_STYLES, SIZES, DEFAULT_CAPTIONS } from './presets.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const selectedPanelEl = document.getElementById('selected-panel');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('pan-x');
const panYInput = document.getElementById('pan-y');

let photoSeq = 0;

export function defaultState() {
  return {
    layout: 'hero-three',
    grade: 'vice-sunset',
    caption: 'Solstice Bay',
    subtitle: 'Golden Getaway',
    captionStyle: 'gradient',
    photos: [],
    panelPhoto: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2],
    panelCrop: Array.from({ length: 12 }, () => ({ ox: 0, oy: 0, zoom: 1 })),
    spanOne: false,
    heat: 4,
    badge: true,
    grain: true,
    vignette: true,
    frame: 'white',
    size: '1080x1080',
  };
}

let state = defaultState();
let selectedPanel = 0;
let undoStack = [];
let redoStack = [];

function snapshot() {
  const { photos, ...rest } = state;
  return JSON.stringify(rest);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function restore(json) {
  const rest = JSON.parse(json);
  const photos = state.photos;
  state = { ...rest, photos };
  syncControls();
  render();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { img.__id = `photo-${++photoSeq}`; resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function sizeOf() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

let renderQueued = false;
export function render() {
  // One render per animation frame at most: drags fire many input events.
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const { w, h } = sizeOf();
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    drawCover(ctx, state, w, h);
  });
}

function renderNow() {
  const { w, h } = sizeOf();
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  drawCover(canvas.getContext('2d'), state, w, h);
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Builds a radio-style button group into `el` from items [{id, name}]. */
function buildGroup(el, items, current, onPick, ariaLabel) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (item.id === current ? ' on' : '');
    b.textContent = item.name;
    b.setAttribute('aria-pressed', String(item.id === current));
    b.setAttribute('aria-label', `${ariaLabel}: ${item.name}`);
    b.addEventListener('click', () => {
      pushHistory();
      onPick(item.id);
      buildGroup(el, items, item.id, onPick, ariaLabel);
      render();
    });
    el.appendChild(b);
  }
}

function syncControls() {
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  buildGroup(document.getElementById('layouts'), LAYOUTS, state.layout, (id) => { state.layout = id; }, 'Layout');
  buildGroup(document.getElementById('grades'), GRADES, state.grade, (id) => { state.grade = id; }, 'Grade');
  buildGroup(document.getElementById('caption-styles'), CAPTION_STYLES, state.captionStyle, (id) => { state.captionStyle = id; }, 'Caption style');
  buildGroup(document.getElementById('sizes'), SIZES, state.size, (id) => { state.size = id; render(); }, 'Export size');
  document.getElementById('span-one').checked = state.spanOne;
  document.getElementById('badge').checked = state.badge;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('frame').value = state.frame;
  document.querySelectorAll('#heat button').forEach((b, i) => {
    b.classList.toggle('on', i < state.heat);
    b.setAttribute('aria-pressed', String(i < state.heat));
  });
  syncPanelControls();
  syncUndoButtons();
  renderThumbs();
}

function syncPanelControls() {
  const crop = state.panelCrop[selectedPanel] || { ox: 0, oy: 0, zoom: 1 };
  selectedPanelEl.textContent = `Panel ${selectedPanel + 1}`;
  zoomInput.value = String(crop.zoom);
  panXInput.value = String(crop.ox);
  panYInput.value = String(crop.oy);
  document.querySelectorAll('#assign button').forEach((b, i) => {
    b.disabled = !state.photos[i];
    b.classList.toggle('on', state.panelPhoto[selectedPanel] === i);
  });
}

function renderThumbs() {
  const strip = document.getElementById('photo-strip');
  strip.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const img = state.photos[i];
    if (img) {
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = `Photo ${i + 1}`;
      slot.appendChild(thumb);
      const label = document.createElement('span');
      label.textContent = `Photo ${i + 1}`;
      slot.appendChild(label);
    } else {
      slot.classList.add('empty');
      const label = document.createElement('span');
      label.textContent = `Photo ${i + 1} — empty`;
      slot.appendChild(label);
    }
    strip.appendChild(slot);
  }
}

async function addPhoto(fileOrUrl, fromSample = false) {
  try {
    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const img = await loadImage(url);
    pushHistory();
    if (state.photos.length >= 4) {
      // Dropping the oldest photo shifts every index down by one; remap the
      // panel assignments so the panels keep showing the same photos.
      state.photos.shift();
      state.panelPhoto = state.panelPhoto.map((i) => Math.max(0, (i ?? 0) - 1));
    }
    state.photos.push(img);
    if (!fromSample) {
      // A newly uploaded photo goes straight into the cover on the selected
      // panel (panel 1 by default) — it must never sit invisible in a slot
      // while the cover keeps showing the samples.
      state.panelPhoto[selectedPanel] = state.photos.length - 1;
      state.spanOne = false;
      document.getElementById('span-one').checked = false;
    }
    syncControls();
    render();
    setStatus(fromSample ? 'Sample photo loaded.' : `Loaded ${fileOrUrl.name || 'photo'} into panel ${selectedPanel + 1}.`);
  } catch {
    setStatus('That file could not be read as an image. Try a JPEG or PNG.');
  }
}

/** Renders the cover at exact export size and downloads it as a PNG. */
export function exportCover(sizeId) {
  const size = SIZES.find((s) => s.id === sizeId) || sizeOf();
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  drawCover(off.getContext('2d'), state, size.w, size.h);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-coast-cover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(`${size.w}x${size.h}`);
    }, 'image/png');
  });
}



document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await addPhoto(file);
  e.target.value = '';
});
document.getElementById('add-sample').addEventListener('click', async () => {
  const sample = state.photos.length % 2 === 0 ? 'samples/boulevard.jpg' : 'samples/pier.jpg';
  await addPhoto(sample, true);
});
captionInput.addEventListener('input', () => { state.caption = captionInput.value; render(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });
document.getElementById('span-one').addEventListener('change', (e) => { pushHistory(); state.spanOne = e.target.checked; render(); });
document.getElementById('badge').addEventListener('change', (e) => { pushHistory(); state.badge = e.target.checked; render(); });
document.getElementById('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; render(); });
document.getElementById('vignette').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; render(); });
document.getElementById('frame').addEventListener('change', (e) => { pushHistory(); state.frame = e.target.value; render(); });
document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
});
document.getElementById('randomize').addEventListener('click', () => {
  pushHistory();
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(LAYOUTS).id;
  state.grade = pick(GRADES).id;
  const cap = pick(DEFAULT_CAPTIONS);
  state.caption = cap.caption;
  state.subtitle = cap.subtitle;
  state.heat = 1 + Math.floor(Math.random() * 5);
  syncControls();
  render();
  setStatus('Shuffled layout, grade and caption. Export if you like it.');
});

// Heat meter: click star N sets heat to N.
document.querySelectorAll('#heat button').forEach((b, i) => {
  b.addEventListener('click', () => { pushHistory(); state.heat = i + 1; syncControls(); render(); });
});

// Assign-photo buttons: photo N goes into the selected panel.
document.querySelectorAll('#assign button').forEach((b, i) => {
  b.addEventListener('click', () => {
    if (!state.photos[i]) return;
    pushHistory();
    state.panelPhoto[selectedPanel] = i;
    state.spanOne = false;
    document.getElementById('span-one').checked = false;
    syncControls();
    render();
  });
});

// Per-panel crop sliders.
zoomInput.addEventListener('input', () => {
  state.panelCrop[selectedPanel].zoom = Number(zoomInput.value);
  render();
});
zoomInput.addEventListener('change', pushHistory);
panXInput.addEventListener('input', () => {
  state.panelCrop[selectedPanel].ox = Number(panXInput.value);
  render();
});
panXInput.addEventListener('change', pushHistory);
panYInput.addEventListener('input', () => {
  state.panelCrop[selectedPanel].oy = Number(panYInput.value);
  render();
});
panYInput.addEventListener('change', pushHistory);

// Click a panel on the preview to select it; drag pans it, wheel zooms it.
let dragging = null;
function panelAt(mx, my) {
  // Same geometry the engine draws, at the canvas's own pixel size.
  const panels = layoutPanels(state.layout, canvas.width, canvas.height).panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) return i;
  }
  return -1;
}
function currentPanels() {
  return layoutPanels(state.layout, canvas.width, canvas.height).panels;
}
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const mx = ((e.clientX - r.left) / r.width) * canvas.width;
  const my = ((e.clientY - r.top) / r.height) * canvas.height;
  const hit = panelAt(mx, my);
  if (hit < 0) return;
  selectedPanel = hit;
  syncPanelControls();
  if (state.spanOne) { setStatus('Span mode is on: one photo across all panels. Turn it off to crop per panel.'); return; }
  dragging = { x: mx, y: my, crop: { ...state.panelCrop[hit] } };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const mx = ((e.clientX - r.left) / r.width) * canvas.width;
  const my = ((e.clientY - r.top) / r.height) * canvas.height;
  const p = currentPanels()[selectedPanel];
  const crop = state.panelCrop[selectedPanel];
  // Drag fraction of the panel, mapped onto the crop slack (ox/oy in [-0.5, 0.5]).
  crop.ox = Math.max(-0.5, Math.min(0.5, dragging.crop.ox + (mx - dragging.x) / p.w));
  crop.oy = Math.max(-0.5, Math.min(0.5, dragging.crop.oy + (my - dragging.y) / p.h));
  syncPanelControls();
  render();
});
canvas.addEventListener('pointerup', () => {
  if (dragging) { pushHistory(); dragging = null; }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (state.spanOne) return;
  const crop = state.panelCrop[selectedPanel];
  crop.zoom = Math.max(1, Math.min(4, crop.zoom + (e.deltaY < 0 ? 0.15 : -0.15)));
  syncPanelControls();
  render();
}, { passive: false });

document.getElementById('export').addEventListener('click', async () => {
  const done = await exportCover(state.size);
  setStatus(`Saved cover-coast-cover-${done}.png`);
});
document.getElementById('export-all').addEventListener('click', async () => {
  setStatus('Exporting all three sizes…');
  for (const s of SIZES) {
    await exportCover(s.id);
    await new Promise((r) => setTimeout(r, 250));
  }
  setStatus('Saved all three sizes: 1080x1080, 1080x1350, 1920x1080.');
});

// --- Shot scenes + boot -----------------------------------------------------

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, {
    loadPhoto: loadImage,
    setState: (patch) => { Object.assign(state, patch); syncControls(); },
    renderNow,
    getState: () => state,
  });
} else {
  // Default path works with zero configuration: a sample photo is preloaded.
  syncControls();
  addPhoto('samples/boulevard.jpg', true).then(() => {
    addPhoto('samples/pier.jpg', true);
  });
  // Fonts must be ready before the first lettered render.
  Promise.all([
    document.fonts.load('100px Anton'),
    document.fonts.load('100px Pacifico'),
  ]).catch(() => {}).finally(render);
  render();
}

// Test / shot hooks.
window.__coverApp = {
  getState: () => state,
  setState: (patch) => { Object.assign(state, patch); syncControls(); render(); },
  renderNow,
  exportCover,
};
