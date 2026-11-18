(() => {
'use strict';
/* ---------- Settings (edit these) ---------- */
const CFG = {
  message: 'F O R   Y O U   <3',
  roses: 19,            // number of roses
  duration: 20,         // seconds shown in the HUD / progress bar
  captionStart: 15,     // seconds when the caption begins typing
  seed: 1402,           // same seed = same bouquet
  palettes: [           // [dark, mid, light] per rose family
    ['#7a0c1c', '#b3122b', '#e0294a'],   // ruby
    ['#8e3347', '#c4607a', '#e38ea3'],   // dusty rose
    ['#a7677a', '#d490a2', '#f0bccb']    // muted pink
  ]
};

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d');
const hud = $('hud'), statusEl = $('status'), caption = $('caption');
const btnPause = $('pause'), btnReplay = $('replay');
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const jitter = (c, r) => { const f = (r() - .5) * .34; return f > 0 ? mix(c, [255, 255, 255], f) : mix(c, [0, 0, 0], -f); };
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// glyph that follows a line with direction angle (screen coords, y down)
function lineChar(ang) {
  const t = ((ang % Math.PI) + Math.PI) % Math.PI;
  return (t < Math.PI / 8 || t > 7 * Math.PI / 8) ? '-' : t < 3 * Math.PI / 8 ? '\\' : t < 5 * Math.PI / 8 ? '|' : '/';
}
// glyph tangent to a circle at angle a
const ringChar = a => lineChar(a + Math.PI / 2);

/* ---------- Procedural scene data (scene units: 100 x 150) ---------- */
const rnd = mulberry32(CFG.seed);
const TIE = [50, 112];
const GREENS = ['#2f8f4a', '#3fae5a', '#256d3a', '#58c474'].map(hex);
const BUD = [34, 72, 42];
const roses = [], stems = [], leaves = [], cone = [], tieG = [], petalDefs = [];

(function buildRoses() {
  const N = CFG.roses, sc = Math.sqrt(19 / N);
  for (let i = 0; i < N; i++) {
    const rr = Math.sqrt((i + .5) / N), a = i * 2.39996 + rnd() * .3;
    const pr = rnd(), pal = CFG.palettes[pr < .4 ? 0 : pr < .75 ? 1 : 2 % CFG.palettes.length];
    const r = {
      x: 50 + Math.cos(a) * rr * 33 + (rnd() - .5) * 2,
      y: 46 + Math.sin(a) * rr * 26 + (rnd() - .5) * 2,
      R: (7 + rnd() * 2.8) * sc, key: rr * .6 + rnd() * .7, depth: .7 + rnd() * .6,
      rot: rnd() * 6.28, dur: 2.4, t0: 0, g: []
    };
    const rf = [0, .27, .52, .76, 1], idx = [0, 0, 1, 2, 1];
    r.g.push({ ch: '@', ring: 0, a: 0, r: 0, rgb: hex(pal[0]), css: css(hex(pal[0])) });
    for (let k = 1; k <= 4; k++) {
      const rad = r.R * rf[k], n = Math.max(5, Math.round(2 * Math.PI * rad / 1.55)), spin = rnd() * 6.28 + k * .9;
      for (let j = 0; j < n; j++) {
        const ang = spin + j / n * 2 * Math.PI;
        if (Math.sin(ang * 5 + k * 1.7 + r.rot) > .82) continue;   // dark gap between petals
        let ch;
        if (k <= 2) ch = '8@#&%'[Math.floor(rnd() * 5)];
        else ch = rnd() < .25 ? '()co'[Math.floor(rnd() * 4)] : ringChar(ang);
        const rgb = jitter(hex(pal[idx[k]]), rnd);
        r.g.push({ ch, ring: k, a: ang, r: rad, rgb, css: css(rgb) });
      }
    }
    roses.push(r);
  }
  [...roses].sort((a, b) => a.key - b.key).forEach((r, i) => { r.t0 = 4.2 + i / Math.max(1, roses.length - 1) * 8.2; });
  roses.sort((a, b) => a.y - b.y);   // back (top) to front (bottom)
})();

function addStem(x0, y0, x1, y1, bend, t0, dur, glow) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), n = Math.max(2, Math.ceil(len / 1.1));
  const cx = (x0 + x1) / 2 - dy / len * bend, cy = (y0 + y1) / 2 + dx / len * bend, pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    const x = v * v * x0 + 2 * v * u * cx + u * u * x1, y = v * v * y0 + 2 * v * u * cy + u * u * y1;
    const tx = 2 * v * (cx - x0) + 2 * u * (x1 - cx), ty = 2 * v * (cy - y0) + 2 * u * (y1 - cy);
    const c = glow ? mix(hex('#8dffae'), hex('#3fae5a'), u * .6) : jitter(GREENS[Math.floor(rnd() * 3)], rnd);
    pts.push({ x, y, u, ch: lineChar(Math.atan2(ty, tx)), col: css(c) });
  }
  stems.push({ pts, t0, dur });
}
(function buildStems() {
  let c = roses[0];
  roses.forEach(r => { if (Math.hypot(r.x - 50, r.y - 46) < Math.hypot(c.x - 50, c.y - 46)) c = r; });
  addStem(50, 140, c.x, c.y + c.R * .4, 0, 1, 2.2, true);   // the first glowing stem
  roses.forEach(r => { if (r !== c) addStem(TIE[0] + (rnd() - .5) * 3, TIE[1], r.x, r.y + r.R * .4, (rnd() - .5) * 6, 2.6 + rnd() * 2.4, 2.2, false); });
  [-1.8, 1.8].forEach(d => addStem(50 + d, 139, 50, TIE[1], 0, 2.4, 1.5, false));
})();

(function buildLeaves() {
  for (let i = 0; i < 34; i++) {
    let ax, ay, dir;
    if (i < 28) { const a = rnd() * 6.283, rr = .7 + rnd() * .5; ax = 50 + Math.cos(a) * rr * 33; ay = 46 + Math.sin(a) * rr * 26; dir = a + (rnd() - .5) * .9; }
    else { const side = rnd() < .5 ? -1 : 1; ay = 62 + rnd() * 14; ax = 50 + side * 27 * (142 - ay) / 78; dir = (side < 0 ? -2.6 : -.54) + (rnd() - .5) * .5; }
    const len = 6 + rnd() * 5, n = Math.ceil(len / 1.2), pts = [], nx = -Math.sin(dir), ny = Math.cos(dir);
    for (let s = 0; s <= n; s++) {
      const u = s / n, px = ax + Math.cos(dir) * len * u, py = ay + Math.sin(dir) * len * u, w = Math.sin(Math.PI * u) * len * .2;
      pts.push({ x: px, y: py, u, ch: lineChar(dir), col: css(jitter(GREENS[Math.floor(rnd() * 4)], rnd)) });
      if (w > .7) for (const sg of [-1, 1]) pts.push({ x: px + nx * w * sg * .8, y: py + ny * w * sg * .8, u, ch: 'v^"\'*'[Math.floor(rnd() * 5)], col: css(jitter(GREENS[Math.floor(rnd() * 4)], rnd)) });
    }
    leaves.push({ pts, t0: 3 + rnd() * 5, dur: 1.6 });
  }
})();

(function buildCone() {
  for (let y = 64; y <= 142; y += 1.35) {
    const half = 27 * (142 - y) / 78;
    for (let x = 50 - half; x <= 50 + half + .01; x += 1.3) {
      const edge = x - (50 - half) < 1.3 || (50 + half) - x < 1.3, f = half > 0 ? Math.abs(x - 50) / half : 0;
      if (edge) cone.push({ ch: x < 50 ? '\\' : '/', x, y, al: .55, col: '#8a8a96' });
      else if (Math.abs(f - .38) < .045) cone.push({ ch: x < 50 ? '\\' : '/', x, y, al: .32, col: '#7a7a86' });
      else if (rnd() < .42) cone.push({ ch: '.:\'`'[Math.floor(rnd() * 4)], x, y, al: .22, col: '#6c6c78' });
    }
  }
  for (let x = 23.5; x <= 76.5; x += 1.2) { const s = Math.sin(x * .55); cone.push({ ch: '~', x, y: 63.8 + s * 1.2, al: .6, col: '#9a9aa6' }); }
  [111, 112.2, 113.4].forEach((y, row) => { for (let x = 46.5; x <= 53.6; x += 1.2) tieG.push({ ch: row === 1 ? '#' : '=', x, y, col: row === 1 ? '#f5d36b' : '#e6b422' }); });
  tieG.push({ ch: '@', x: 46.2, y: 109.2, col: '#f5d36b' }, { ch: '@', x: 53.8, y: 109.2, col: '#f5d36b' }, { ch: '%', x: 50, y: 110, col: '#e6b422' });
})();

(function buildPetals() {
  const early = [...roses].sort((a, b) => a.t0 - b.t0).slice(0, 12), cols = ['#b3122b', '#c4607a', '#e38ea3', '#d490a2'];
  for (let j = 0; j < 7; j++) petalDefs.push({ r: early[Math.floor(rnd() * early.length)], ph: j * .9, L: 9 + rnd() * 4, vy: 7 + rnd() * 3, dr: (rnd() - .5) * 3, ch: '`*o\''[j % 4], col: cols[j % 4], j });
})();

/* ---------- Layout / stars ---------- */
let w = 0, h = 0, dpr = 1, S = 1, ox = 0, oy = 0, cw = 6, chh = 8, fontStr = '';
let stars = [], crosses = [];
function buildStars() {
  const r = mulberry32(7), n = Math.min(420, Math.floor(w * h / 4500)), cols = ['#ffffff', '#bdbdc7', '#ffd9e2'];
  stars = []; crosses = [];
  for (let i = 0; i < n; i++) stars.push({ x: r(), y: r(), s: r() < .15 ? 2 : 1, ph: r() * 6.28, sp: .6 + r() * 2, a: .25 + r() * .6, c: cols[Math.floor(r() * 3)] });
  for (let i = 0; i < 7; i++) crosses.push({ x: .06 + r() * .88, y: .05 + r() * .85, L: 10 + r() * 16, ph: r() * 6.28, sp: .5 + r() });
}
function resize() {
  w = window.innerWidth; h = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S = Math.min(w * .92 / 100, h * .82 / 150); ox = (w - 100 * S) / 2; oy = h * .05;
  const fs = Math.max(7, Math.min(15, S * 1.9));
  cw = fs * .6; chh = fs * .95; fontStr = `${fs}px "Courier New", ui-monospace, monospace`;
  ctx.font = fontStr; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  buildStars();
  if (paused || reduce) draw();
}

/* ---------- State ---------- */
let T = reduce ? CFG.duration + 1 : 0, paused = false, raf = 0, last = 0, typed = -1, lastHud = '', lastStat = '';
const swayX = y => Math.sin(T * .8 + y * .035) * .9 * clamp01((138 - y) / 100);
function put(ch, ux, uy, col, al) {
  ctx.globalAlpha = al; ctx.fillStyle = col;
  ctx.fillText(ch, Math.round((ox + ux * S) / cw) * cw, Math.round((oy + uy * S) / chh) * chh);
}

/* ---------- Drawing ---------- */
function drawStars() {
  for (const s of stars) { ctx.globalAlpha = s.a * (.5 + .5 * Math.sin(T * s.sp + s.ph)); ctx.fillStyle = s.c; ctx.fillRect(s.x * w, s.y * h, s.s, s.s); }
  ctx.strokeStyle = '#ffe9f0'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1;
  for (const c of crosses) {
    const al = .35 + .4 * Math.sin(T * c.sp + c.ph) * .5 + .2, x = c.x * w, y = c.y * h;
    ctx.globalAlpha = al * .8; ctx.beginPath(); ctx.moveTo(x - c.L, y); ctx.lineTo(x + c.L, y); ctx.moveTo(x, y - c.L); ctx.lineTo(x, y + c.L); ctx.stroke();
    ctx.globalAlpha = al; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}
function drawRose(R) {
  const p = clamp01((T - R.t0) / R.dur), budA = clamp01((T - (R.t0 - 1.6)) / 1);
  if (budA <= 0) return;
  const cx = R.x + swayX(R.y) * R.depth, cy = R.y, e = easeOut(p);
  if (p > 0) {
    const px = ox + cx * S, py = oy + cy * S, rad = R.R * S * Math.max(.2, e);
    ctx.globalAlpha = .93; ctx.fillStyle = '#0c0307'; ctx.beginPath(); ctx.arc(px, py, rad * .98, 0, 6.2832); ctx.fill();
    const gr = ctx.createRadialGradient(px, py, 0, px, py, rad * 1.5);
    gr.addColorStop(0, 'rgba(225,45,85,.16)'); gr.addColorStop(1, 'rgba(225,45,85,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, p * 2); ctx.fillStyle = gr; ctx.fillRect(px - rad * 1.5, py - rad * 1.5, rad * 3, rad * 3);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (p < .35) put('o', cx, cy, css(BUD), budA);
  if (p <= 0) return;
  for (const g of R.g) {
    const pk = clamp01((p - g.ring * .16) / .55);
    if (pk <= 0) continue;
    const r = g.r * (.3 + .7 * easeOut(pk));
    put(g.ch, cx + Math.cos(g.a) * r, cy + Math.sin(g.a) * r * .92, pk >= 1 ? g.css : css(mix(BUD, g.rgb, pk)), Math.min(1, pk * 3));
  }
}
function draw() {
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#03030a'; ctx.fillRect(0, 0, w, h);
  drawStars();
  ctx.font = fontStr;
  for (const s of stems) {
    const p = clamp01((T - s.t0) / s.dur); if (p <= 0) continue;
    const lim = easeOut(p);
    for (const pt of s.pts) { if (pt.u > lim) break; put(pt.ch, pt.x + swayX(pt.y), pt.y, pt.col, .95); }
  }
  for (const l of leaves) {
    const p = clamp01((T - l.t0) / l.dur); if (p <= 0) continue;
    const lim = easeOut(p);
    for (const pt of l.pts) if (pt.u <= lim) put(pt.ch, pt.x + swayX(pt.y), pt.y, pt.col, .9);
  }
  const cp = clamp01((T - 3) / 3.2);
  if (cp > 0) { const thr = 142 - 78 * easeIO(cp); for (const c of cone) if (c.y >= thr) put(c.ch, c.x, c.y, c.col, c.al); }
  let open = 0;
  for (const R of roses) { drawRose(R); if (T >= R.t0 + R.dur) open++; }
  const ta = easeOut(clamp01((T - 3.4) / 1.4));
  if (ta > 0) for (const g of tieG) put(g.ch, 50 + (g.x - 50) * ta, g.y, g.col, ta);
  let falling = 0;
  if (T >= 12) for (const d of petalDefs) {
    const loc = T - 12 - d.ph; if (loc < 0) continue;
    const c = loc % d.L, x = d.r.x + Math.sin(c * 1.3 + d.j) * 3 + d.dr * c, y = d.r.y + c * d.vy;
    if (y > 146) continue;
    falling++; put(d.ch, x, y, d.col, .9 * (1 - clamp01((y - 130) / 16)));
  }
  ctx.globalAlpha = 1;
  // caption (typewriter)
  const len = CFG.message.length, n = T < CFG.captionStart ? 0 : Math.min(len, Math.floor((T - CFG.captionStart) * len / 1.2) + 1);
  if (n !== typed) { typed = n; caption.textContent = CFG.message.slice(0, n); }
  const tt = Math.min(T, CFG.duration), hs = `● t ${tt.toFixed(2)}s`;
  if (hs !== lastHud) { lastHud = hs; hud.textContent = hs; }
  const fill = Math.round(clamp01(T / CFG.duration) * 12);
  const ss = `> [${'#'.repeat(fill)}${'-'.repeat(12 - fill)}] roses open ${open}/${roses.length} | petals falling ${falling}`;
  if (ss !== lastStat) { lastStat = ss; statusEl.textContent = ss; }
}

/* ---------- Loop / controls ---------- */
function tick(ts) {
  raf = requestAnimationFrame(tick);
  if (ts - last < 1000 / (T > CFG.duration + 1 ? 30 : 45)) return;
  const dt = Math.min(.1, (ts - last) / 1000); last = ts;
  T += dt; draw();
}
function start() { if (!raf && !paused && !reduce) { last = performance.now(); raf = requestAnimationFrame(tick); } }
function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
function setPaused(v) {
  paused = v; btnPause.textContent = v ? 'Resume' : 'Pause'; btnPause.setAttribute('aria-pressed', String(v));
  if (v) { stop(); draw(); } else start();
}
btnPause.addEventListener('click', () => setPaused(!paused));
btnReplay.addEventListener('click', () => { T = 0; typed = -1; setPaused(false); draw(); start(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
let rz = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resize); });
if (reduce) document.getElementById('controls').hidden = true;

resize(); draw(); start();
})();
