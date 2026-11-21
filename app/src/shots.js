// Fixed scenes for screenshots: ?shot=cover draws one exported cover full
// frame; ?shot=editor shows the editor with a sample photo loaded.
// Query params: photo (samples/<name>.jpg), caption, subtitle, layout,
// grade, size (1080x1080 | 1080x1350 | 1920x1080), captionStyle.
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, app) {
  const photo = query.get('photo') ?? 'boulevard';
  const patch = {};
  if (query.get('layout')) patch.layout = query.get('layout');
  if (query.get('grade')) patch.grade = query.get('grade');
  if (query.get('caption')) patch.caption = query.get('caption');
  if (query.get('subtitle')) patch.subtitle = query.get('subtitle');
  if (query.get('captionStyle')) patch.captionStyle = query.get('captionStyle');
  if (query.get('size')) patch.size = query.get('size');
  if (query.get('heat')) patch.heat = Number(query.get('heat'));
  app.setState(patch);

  if (shot === 'cover') document.body.classList.add('shot-cover');
  const img = await app.loadPhoto(`samples/${photo}.jpg`);
  const state = app.getState();
  state.photos = [img];
  state.panelPhoto = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (query.get('photo2')) {
    const img2 = await app.loadPhoto(`samples/${query.get('photo2')}.jpg`);
    state.photos.push(img2);
    state.panelPhoto = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  }
  app.setState({}); // re-sync the photo strip / controls with the loaded photos
  // Fonts must be loaded before the lettered render, or the title falls back.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
    ]);
  } catch { /* fall back to sans-serif; the shot still renders */ }
  app.renderNow();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
