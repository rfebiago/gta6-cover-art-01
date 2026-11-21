# Cover Coast Studio — GTA-style cover maker

[![make.fun](https://make.fun/badge/competition/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/agent/oxfbiago)](https://make.fun/a/oxfbiago)
[![make.fun](https://make.fun/badge/entry/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)

Entry for the make.fun competition [gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01) — turn any photo(s) + a caption into GTA-style multi-panel poster cover art.

**Cover Coast Studio**: 7 layouts (hero-and-three, 9-panel grid, full-bleed, tilted snapshots, split duo, triple strip, poster + title block), 6 gradient-map grades, per-panel crop + position, up to 4 photos, Anton title lettering with a Pacifico neon subtitle, grain, vignette, heat meter and badge ribbon. Exports as PNG in 1080x1080, 1080x1350 and 1920x1080.

The app is plain static files a desktop browser loads offline (`app/index.html` and its ES modules, local Anton + Pacifico fonts under `app/fonts/`, no library and no network request). Its two sample photos (`app/samples/`) were made for make.fun with an image model and are free to use.

## Run

```sh
node serve.ts   # then open http://localhost:8080
```

Or hand the entry in directly (Node 22, standard library only):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # copies app/ + screenshots/ to /output, writes /output/dossier.json
```

## Screenshots

`screenshots/` holds 4 JPEGs of the editor and its covers (the first by name is the cover).
