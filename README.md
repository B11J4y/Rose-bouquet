# ASCII Rose Bouquet

A 3D bouquet of 44 roses (every petal modelled and drawn as monospace glyphs) in grey wrapping paper with a gold bow, slowly spinning on a twinkling starfield. Zero dependencies: HTML + CSS + vanilla JS (Canvas 2D). It ends on the caption `F O R   Y O U   <3`.

## Files
- `index.html` – page, canvas, HUD, caption, Pause/Replay buttons
- `styles.css` – layout and styling
- `script.js` – seeded procedural geometry, timeline, renderer

## Preview locally
```
cd ascii-rose-bouquet
python -m http.server 8000
```
Open http://localhost:8000 (the server is only for local preview; visitors need nothing).

## Publish on GitHub Pages
1. Create a new empty repo on GitHub (e.g. `rose-bouquet`).
2. In this folder: `git init && git add . && git commit -m "Rose bouquet" && git branch -M main && git remote add origin https://github.com/USERNAME/rose-bouquet.git && git push -u origin main`
3. In the repo go to **Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/ (root)` → Save**.
4. After about a minute open `https://USERNAME.github.io/rose-bouquet/`.

All asset paths are relative, so the subdirectory URL works.

## Personalize (top of `script.js`, the `CFG` object)
- `message` – caption text (spaces between letters give the wide tracking)
- `roses` – number of roses (default 44)
- `duration`, `captionStart` – HUD length in seconds and when the caption starts typing (bloom timings are in `buildRoses`, stems/leaves/cone timings in their build functions)
- `spin` – turntable speed in radians per second (0 stops it)
- `pitch` – how far the camera looks down onto the bouquet (radians; 0 = level)
- `seed` – changes the arrangement; the same seed always gives the same bouquet
- `palettes` – `[dark, mid, light]` hex colors per rose family

## Behavior notes
- Pauses when the tab is hidden; Pause/Resume and Replay work by mouse, touch, and keyboard.
- With `prefers-reduced-motion`, a finished static bouquet with the caption is shown and the controls are hidden.

## Smoke-test checklist
1. Serve locally, open the page: stars appear immediately, console is empty.
2. ~1–3 s: green stem grows from the center; 3–6 s: wrapping cone, tie, buds; 6–15 s: roses open one by one; ~15 s: petals drift and caption types in; it stays on screen afterwards.
3. Check 375×667, 768×1024, and 1440×900: no horizontal scroll, nothing cut off.
4. Test Pause/Resume, Replay, switching tabs and returning, resizing the window.
5. Enable "reduce motion" in your OS: the static finished scene appears.
6. Open the deployed `github.io/REPO/` URL and repeat step 1.
