// Cover Coast Studio — the cover engine. Draws a GTA-style multi-panel
// poster cover onto any 2D canvas context, at any pixel size.
// Pure canvas 2D, no library, no network: photos come in graded offscreen
// canvases, fonts are local @font-face faces (Anton + Pacifico).
import { layoutPanels, buildLut, mulberry32, GRADES, LAYOUTS } from './presets.js';

const gradeCache = new Map(); // `${photoId}|${gradeId}` -> graded canvas
const grainCache = new Map(); // size -> noise pattern canvas

function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

/**
 * Gradient-maps one photo into a graded offscreen canvas (long side capped
 * at 1600 px so a 12 MP phone photo never freezes the page). The grade is a
 * luminance -> colour map blended back with the original, then a saturation
 * lift. Cached per (photo, grade): re-grading only happens when either changes.
 */
export function gradedPhoto(photo, gradeId) {
  const key = `${photo.__id}|${gradeId}`;
  const hit = gradeCache.get(key);
  if (hit) return hit;
  const grade = gradeById(gradeId);
  const lut = buildLut(grade.stops);
  const scale = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
  const w = Math.max(2, Math.round(photo.naturalWidth * scale));
  const h = Math.max(2, Math.round(photo.naturalHeight * scale));
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const ctx = off.getContext('2d');
  ctx.drawImage(photo, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const mix = grade.mix;
  const sat = grade.sat;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const m = lut[lum];
    let nr = m[0] * mix + r * (1 - mix);
    let ng = m[1] * mix + g * (1 - mix);
    let nb = m[2] * mix + b * (1 - mix);
    // Saturation lift around the mean channel value.
    const avg = (nr + ng + nb) / 3;
    nr = avg + (nr - avg) * sat;
    ng = avg + (ng - avg) * sat;
    nb = avg + (nb - avg) * sat;
    d[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    d[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    d[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }
  ctx.putImageData(img, 0, 0);
  gradeCache.set(key, off);
  return off;
}

/** Seeded monochrome noise tile, drawn with 'overlay' for film grain. */
export function grainTile(size = 256) {
  const hit = grainCache.get(size);
  if (hit) return hit;
  const off = document.createElement('canvas');
  off.width = size; off.height = size;
  const ctx = off.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(rnd() * 64);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainCache.set(size, off);
  return off;
}

/**
 * Cover-fits `img` into rect (x, y, w, h) with a per-panel crop:
 * crop = { ox, oy, zoom } with ox/oy in [-0.5, 0.5] (fraction of the slack)
 * and zoom >= 1. Draws into ctx (already clipped to the panel).
 */
export function drawPhotoInto(ctx, img, x, y, w, h, crop) {
  const zoom = Math.max(1, crop?.zoom || 1);
  const iw = img.width || img.naturalWidth;
  const ih = img.height || img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const s = base * zoom;
  const dw = iw * s;
  const dh = ih * s;
  const slackX = Math.max(0, dw - w);
  const slackY = Math.max(0, dh - h);
  const ox = (crop?.ox || 0) * slackX;
  const oy = (crop?.oy || 0) * slackY;
  ctx.drawImage(img, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
}

/** Fits one font size so `text` fits `maxW` (shrinks, never grows past start). */
export function fitFont(ctx, text, startSize, maxW, family, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size = Math.max(12, size - 2);
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawStar(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd166' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.stroke();
}

/** Halftone dots across a title band: rows of dots, denser toward the top. */
function drawHalftone(ctx, x, y, w, h) {
  const step = Math.max(10, Math.round(w / 90));
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    const fade = 1 - (yy - y) / h; // denser at the top of the band
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const r = Math.max(0.6, (step * 0.28) * fade);
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draws the whole cover. `state` is the app state (see main.js):
 * layout, grade, caption, subtitle, captionStyle, photos[], panelPhoto[],
 * panelCrop[], spanOne, heat (0-5), badge, grain, vignette, frame.
 */
export function drawCover(ctx, state, W, H) {
  const { panels, title } = layoutPanels(state.layout, W, H);
  ctx.save();
  ctx.fillStyle = '#1b1030';
  ctx.fillRect(0, 0, W, H);

  // Background plate for the tilted layout: a sunset sky with a distant
  // skyline silhouette, so the gaps between snapshots are a world, not a void.
  if (state.layout === 'tilted') {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#ff7a3d');
    sky.addColorStop(0.45, '#ff2e88');
    sky.addColorStop(1, '#1b1030');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const rnd = mulberry32(20261119);
    ctx.fillStyle = '#160a2e';
    let bx = 0;
    while (bx < W) {
      const bw = W * (0.04 + rnd() * 0.07);
      const bh = H * (0.08 + rnd() * 0.16);
      ctx.fillRect(bx, H - bh, bw, bh);
      bx += bw + W * 0.008;
    }
    // A low sun disc behind the snapshots.
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.3, Math.min(W, H) * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Panels -------------------------------------------------------------
  const photos = state.photos.filter(Boolean);
  const bandW = Math.max(3, Math.round(Math.min(W, H) * 0.008)); // inked edge
  const seenPhoto = new Map(); // photo id -> occurrences so far (for varied crops)
  panels.forEach((p, i) => {
    const photo = photos.length
      ? photos[state.spanOne ? 0 : (state.panelPhoto[i] ?? 0) % photos.length]
      : null;
    ctx.save();
    if (p.rot) {
      const cx = p.x + p.w / 2; const cy = p.y + p.h / 2;
      ctx.translate(cx, cy); ctx.rotate((p.rot * Math.PI) / 180);
    }
    // Clip in the panel's (possibly rotated) space, then reset the transform:
    // the clip stays in device space, so the photo is drawn in absolute coords.
    ctx.beginPath();
    ctx.rect(p.rot ? -p.w / 2 : p.x, p.rot ? -p.h / 2 : p.y, p.w, p.h);
    ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (photo) {
      const graded = gradedPhoto(photo, state.grade);
      if (state.spanOne) {
        // One photo sliced across the panels: same full-canvas fit, clipped per panel.
        const iw = graded.width; const ih = graded.height;
        const s = Math.max(W / iw, H / ih);
        ctx.drawImage(graded, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
      } else {
        // A panel with its default crop gets a seeded focus point: a different
        // region and zoom per panel, so repeated photos read as distinct
        // poster moments, not tiles of the same shot. Panel 0 keeps the
        // centred hero crop; every other panel picks from the focus table by
        // (panel index, occurrence), so no two panels share a crop.
        const FOCUS = [
          { ox: 0, oy: -0.2, zoom: 1 }, // hero: face, upper third
          { ox: -0.5, oy: -0.5, zoom: 1.8 }, // top-left, tight
          { ox: 0.5, oy: -0.5, zoom: 1.8 }, // top-right, tight
          { ox: 0, oy: 0.5, zoom: 1.4 }, // bottom, mid
          { ox: -0.5, oy: 0.5, zoom: 2.2 }, // bottom-left detail
          { ox: 0.5, oy: 0.5, zoom: 1.6 }, // bottom-right
          { ox: -0.5, oy: 0, zoom: 1.4 }, // left, mid
          { ox: 0.5, oy: 0, zoom: 1.4 }, // right, mid
          { ox: 0, oy: -0.5, zoom: 2.2 }, // top detail
        ];
        const base = state.panelCrop[i] || { ox: 0, oy: 0, zoom: 1 };
        const occ = seenPhoto.get(photo.__id) || 0;
        seenPhoto.set(photo.__id, occ + 1);
        const isDefault = base.ox === 0 && base.oy === 0 && base.zoom === 1;
        const crop = isDefault && (i > 0 || occ > 0)
          ? FOCUS[(i * 5 + occ * 3) % FOCUS.length]
          : base;
        drawPhotoInto(ctx, graded, p.x, p.y, p.w, p.h, crop);
      }
    } else {
      // Empty panel: sunset placeholder gradient so the cover never looks broken.
      const g = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
      g.addColorStop(0, '#ff7a3d'); g.addColorStop(0.55, '#ff2e88'); g.addColorStop(1, '#1b1030');
      ctx.fillStyle = g;
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
    ctx.restore();
    // Inked / banded panel edge (poster-art framing).
    ctx.save();
    ctx.lineWidth = bandW;
    ctx.strokeStyle = state.frame === 'black' ? '#111111' : '#fff7ec';
    ctx.beginPath();
    if (p.rot) {
      const cx = p.x + p.w / 2; const cy = p.y + p.h / 2;
      ctx.translate(cx, cy); ctx.rotate((p.rot * Math.PI) / 180);
      ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.rect(p.x, p.y, p.w, p.h);
    }
    ctx.stroke();
    ctx.restore();
  });

  // --- Title band / overlay ----------------------------------------------
  if (title.band) {
    const bg = ctx.createLinearGradient(0, title.y, 0, title.y + title.h);
    bg.addColorStop(0, '#241239'); bg.addColorStop(1, '#12081f');
    ctx.fillStyle = bg;
    ctx.fillRect(title.x, title.y, title.w, title.h);
    drawHalftone(ctx, title.x, title.y, title.w, title.h * 0.55);
    ctx.fillStyle = '#fff7ec';
    ctx.fillRect(title.x, title.y, title.w, Math.max(2, H * 0.004));
  } else {
    // Scrim so the caption stays readable over the photo.
    const scrim = ctx.createLinearGradient(0, title.y - H * 0.08, 0, title.y + title.h);
    scrim.addColorStop(0, 'rgba(10,4,20,0)');
    scrim.addColorStop(1, 'rgba(10,4,20,0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(title.x - W * 0.02, title.y - H * 0.08, title.w + W * 0.04, title.h + H * 0.08);
  }

  // --- Caption lettering ---------------------------------------------------
  const caption = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const cx = title.align === 'center' ? title.x + title.w / 2 : title.x;
  const maxW = title.w * (title.align === 'center' ? 0.92 : 0.96);
  ctx.textAlign = title.align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  // Kicker line in the title block: layout + grade, so the band carries a
  // second line of information instead of empty navy below the subtitle.
  if (title.band) {
    const layoutName = (LAYOUTS.find((l) => l.id === state.layout) || {}).name || '';
    const gradeName = (GRADES.find((g) => g.id === state.grade) || {}).name || '';
    const kicker = `${layoutName} • ${gradeName}`.toUpperCase();
    const kickSize = Math.round(title.h * 0.1);
    ctx.font = `bold ${kickSize}px sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, Math.round(kickSize * 0.25))}px`; } catch { /* older canvas: no letter-spacing */ }
    ctx.fillStyle = '#ffd166';
    ctx.fillText(kicker, cx, title.y + title.h * 0.15);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
  if (caption) {
    const capSize = fitFont(ctx, caption, title.h * (title.band ? 0.44 : 0.42), maxW, 'Anton, sans-serif');
    const capY = title.y + title.h * (title.band ? 0.6 : 0.52);
    if (state.captionStyle === 'gradient') {
      const g = ctx.createLinearGradient(0, capY - capSize, 0, capY);
      g.addColorStop(0, '#ffd166'); g.addColorStop(0.5, '#ff7a3d'); g.addColorStop(1, '#ff2e88');
      ctx.fillStyle = g;
      ctx.lineWidth = Math.max(2, capSize * 0.06);
      ctx.strokeStyle = '#fff7ec';
      ctx.strokeText(caption, cx, capY);
      ctx.fillText(caption, cx, capY);
    } else if (state.captionStyle === 'outline') {
      ctx.lineWidth = Math.max(2, capSize * 0.07);
      ctx.strokeStyle = '#fff7ec';
      ctx.strokeText(caption, cx, capY);
    } else {
      ctx.fillStyle = '#fff7ec';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = capSize * 0.18;
      ctx.fillText(caption, cx, capY);
      ctx.shadowBlur = 0;
    }
    // Neon script subtitle, tucked under the title.
    if (subtitle) {
      const subSize = fitFont(ctx, subtitle, title.h * (title.band ? 0.2 : 0.22), maxW, 'Pacifico, cursive');
      ctx.font = `${subSize}px Pacifico, cursive`;
      ctx.fillStyle = '#ff5ea8';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = subSize * 0.55;
      ctx.fillText(subtitle, cx, title.y + title.h * (title.band ? 0.9 : 0.86));
      ctx.shadowBlur = 0;
    }
  }

  // --- Heat meter + badge ribbon -------------------------------------------
  // Both live in pills in the top corners, clear of the caption: the meter
  // used to sit inside the title zone and collide with the lettering.
  const meterR = Math.max(8, Math.round(Math.min(W, H) * 0.016));
  const pillPad = Math.round(Math.min(W, H) * 0.012);
  const pillH = Math.round(Math.min(W, H) * 0.032);
  const pillY = Math.round(H * 0.02);
  ctx.save();
  ctx.font = `bold ${Math.round(meterR * 1.5)}px sans-serif`;
  const heatLabel = 'HEAT';
  const labelW = ctx.measureText(heatLabel).width;
  const starGap = meterR * 1.2;
  const starsW = 5 * meterR * 2.4;
  const heatW = labelW + starGap + starsW + pillPad * 2;
  ctx.fillStyle = 'rgba(10,4,20,0.65)';
  ctx.beginPath();
  ctx.roundRect(Math.round(W * 0.02), pillY, heatW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,247,236,0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const heatX = Math.round(W * 0.02) + pillPad;
  const heatY = pillY + pillH / 2;
  ctx.fillText(heatLabel, heatX, heatY + 1);
  const starX0 = heatX + labelW + starGap;
  for (let s = 0; s < 5; s++) {
    drawStar(ctx, starX0 + s * meterR * 2.4, heatY, meterR, s < state.heat);
  }
  ctx.restore();
  if (state.badge) {
    const label = 'EST. 2026 • SOLSTICE BAY';
    ctx.save();
    ctx.font = `bold ${Math.round(Math.min(W, H) * 0.014)}px sans-serif`;
    const tw = ctx.measureText(label).width;
    const bw = tw + pillPad * 2;
    const bh = pillH;
    const bx = W - bw - Math.round(W * 0.02);
    const by = pillY;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#1b1030';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
    ctx.restore();
  }

  // --- Grain + vignette ------------------------------------------------------
  if (state.grain) {
    const tile = grainTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,2,16,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  // --- Outer frame -----------------------------------------------------------
  if (state.frame !== 'none') {
    const fw = Math.max(4, Math.round(Math.min(W, H) * 0.014));
    ctx.lineWidth = fw;
    ctx.strokeStyle = state.frame === 'black' ? '#111111' : '#fff7ec';
    ctx.strokeRect(fw / 2, fw / 2, W - fw, H - fw);
  }
  ctx.restore();
}
