# REBUILD_NOTES.md — Cover Coast Studio (gta6-cover-art-01)

## Fix round (reviewer, 2026-11-19 ~19:00 WIB — FIX-THEN-SHIP, all 6 items fixed)
1. **Repeated panels** — seeded per-panel focus table in cover.js (9 distinct
   focus/zoom combos by panel index + occurrence); verified in re-shot
   1-cover.jpg / 3-cover-square.jpg at 480px: no two panels read as the same.
2. **Upload didn't reach the cover** — addPhoto now auto-assigns an upload to
   the selected panel (panel 1 by default); samples on boot unaffected.
   Verified: upload → panelPhoto[0] is the new photo, export contains it.
3. **Dead space in title block** — kicker line (layout • grade) + larger title
   + lower subtitle in band layouts.
4. **Unlabeled size dots** — SIZES now carry `name` ("Square 1080" /
   "Portrait 1080" / "Wide 1920") shown as chips.
5. **Export filename** — `neon-coast-cover-…` → `cover-coast-cover-…`.
6. **No caption editing in screenshots** — editor shot re-taken at 1280x1000
   so the Words group is visible.
Also fixed in the same round: dropping the oldest photo (5th upload) remaps
panelPhoto indices so panels keep their photos.

Known weaknesses + concrete rebuild ideas, for the iterate loop (submit →
check rank → rebuild → resubmit while the competition is open and quota
remains). Deadline Sat 2026-11-21 17:30 WIB. Max 5 submissions/day, 10 total.

## Known weaknesses (v1, as submitted)
1. **Only 2 sample photos.** The bundled samples are the starter's boulevard +
   pier. Every panel reuses them, so covers can look samey across layouts.
   The finalist review loads ITS OWN photo, which is fine, but the dossier's
   screenshots all show the same two people.
2. **Per-panel crop is drag + sliders only.** No numeric "focus point" preset
   (face-centre, rule-of-thirds) and no pinch zoom on touch.
3. **Grade is a global LUT.** No per-panel grade, no grade-strength slider —
   a photo whose face falls on a dark LUT band can go muddy.
4. **Title band is fixed per layout.** No free positioning of the caption
   (drag the title), no font-size override beyond auto-fit.
5. **No saved presets / shareable state.** No URL hash encoding the state, so
   a user cannot send a friend a link that re-opens their exact cover.
6. **Export is PNG only.** No JPEG quality option (smaller files for sharing)
   and no "copy to clipboard".
7. **Tilted layout overlaps are fixed.** Rotation angles and overlap offsets
   are hard-coded per layout, not user-adjustable.

## Concrete rebuild ideas (ranked by expected judge impact)
1. **Two more model-made sample photos** (a night-street portrait + a rooftop
   portrait, same prompts style as the house photos) so the 9-panel cover
   shows 4 distinct faces. Cheap, and the cover screenshot gets visibly richer.
2. **State-in-URL-hash** (`#layout=...&grade=...&caption=...`): shareable
   covers, and the `?shot=` scenes get simpler. Also lets the judge's
   finalist review re-open an exact state.
3. **Per-panel grade strength slider** (0–100% of the LUT mix) + a "face-safe"
   toggle that lifts the shadows band so faces never go muddy.
4. **Draggable title block** + caption size slider (0.7x–1.3x of auto-fit).
5. **JPEG export option** (quality 0.9) alongside PNG.
6. **A 5th layout variant: "Wanted"** — single portrait panel + big halftone
   title + star heat meter, leaning into the poster look.
7. **Preset gallery**: 4 one-click named presets (e.g. "Vice Sunset / Hero",
   "Neon Nights / Nine") shown as thumbnails above the layout chips.

## What NOT to change without evidence
- Do not add a network call (fonts, images, analytics) — offline is a gate.
- Do not add a JS library — the dossier outline is short; vanilla keeps the
  source readable to the judge.
- Do not chase the 7-ace rung feature-for-feature (it has a story size we
  already cover via 1080x1350; its "inked/banded panels" we already do).
