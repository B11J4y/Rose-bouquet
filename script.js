(() => {
'use strict';
/* ---------- Settings (edit these) ---------- */
const CFG = {
  word: 'F O R   Y O U', heart: '<3',
  roses: 19, duration: 20, captionStart: 15, seed: 1402,
  spin: 0.45,                 // radians per second (0 = no spin)
  palettes: [['#6b0a18', '#b3122b', '#e8344f'], ['#7d2a40', '#c4607a', '#e68aa0'], ['#9a5a6e', '#d490a2', '#f3c0cd']]
};
const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d');
const hud = $('hud'), statusEl = $('status'), cap1 = $('cap1'), cap2 = $('cap2'), btnPause = $('pause'), btnReplay = $('replay');
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/* ---------- Procedural 3D scene (units: x 0-100 centred on 50, y down, z toward viewer) ---------- */
const rnd = mulberry32(CFG.seed), PI2 = Math.PI * 2;
const RAMP = '.:-=+rxtjucnvz*o%&8#BQ@', RAMP_P = ".:'`,;-:.";
const code = (b, ramp = RAMP) => Math.max(0, Math.min(ramp.length - 1, Math.floor(b * (ramp.length - 1) + (rnd() - .5) * 3)));
const jit = (c, a) => { const f = 1 + (rnd() - .5) * a; return [c[0] * f, c[1] * f, c[2] * f]; };
const GREEN = ['#1f7a3a', '#2f9a4e', '#46b862', '#7de39a'].map(hex), BUD = [28, 66, 38], GOLD = [hex('#e6b422'), hex('#f5d36b')];
const A = { x: [], y: [], z: [], p: [], t: [], d: [], r: [], g: [], b: [], c: [], k: [] };
function addS(x, y, z, par, t0, dur, rgb, ch, k) {
  A.x.push(x); A.y.push(y); A.z.push(z); A.p.push(par); A.t.push(t0); A.d.push(dur);
  A.r.push(rgb[0]); A.g.push(rgb[1]); A.b.push(rgb[2]); A.c.push(ch); A.k.push(k || 0);
}
// thick green stalk (grows first, glowing)
for (let y = 148; y >= 112; y -= 1) {
  const n = 19;
  for (let k = 0; k < n; k++) {
    const a = k / n * PI2, br = .3 + .7 * (.5 + .5 * Math.cos(a - .8));
    addS(50 + 3.4 * Math.cos(a), y, 3.4 * Math.sin(a), (148 - y) / 36, 1, 2.2, jit(mix(GREEN[0], hex('#8dffae'), br), .2), code(br), 0);
  }
}
// gold tie, bow and tails
[121.6, 123, 124.4].forEach((y, row) => { for (let k = 0; k < 22; k++) { const a = k / 22 * PI2; addS(50 + 3.9 * Math.cos(a), y, 3.9 * Math.sin(a), 0, 3.6, 1.2, jit(GOLD[row === 1 ? 1 : 0], .15), code(row === 1 ? .85 : .6), 0); } });
[-1, 1].forEach(sd => {
  for (let k = 0; k < 18; k++) { const a = k / 18 * PI2; addS(50 + sd * 4.4 + Math.cos(a) * 3.2, 120.2 + Math.sin(a) * 2, 4.4, 0, 4.2, 1, jit(GOLD[1], .2), code(.8), 0); }
  for (let y = 122; y < 134; y += 1.1) addS(50 + sd * (1.5 + (y - 122) * .22), y, 4.8, 0, 4.4, 1, jit(GOLD[0], .2), code(.7), 0);
});
addS(50, 121, 5, 0, 4.2, 1, GOLD[1], RAMP.length - 1, 0);
// semi-transparent grey paper: hexagonal flared cone with folds and a ruffled rim
{
  const APEX_Y = 128, RIM_Y = 34, RIM_R = 38, HEXC = Math.cos(Math.PI / 6);
  for (let a = 1; a <= 78; a++) {
    const v = a / 78, nphi = Math.max(8, Math.round(PI2 * RIM_R * v / 1.2));
    for (let k = 0; k < nphi; k++) {
      const phi = (k + rnd() * .6) / nphi * PI2, m = ((phi % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
      const rh = RIM_R * HEXC / Math.cos(m - Math.PI / 6), rimY = RIM_Y + 2.5 * (1 - Math.cos(6 * phi));
      const f = m / (Math.PI / 3), fold = f < .05 || f > .95, rim = v > .96;
      const br = rim ? .85 : fold ? .75 : .38 + .15 * Math.sin(v * 9 + phi * 3) + .12 * rnd();
      addS(50 + v * rh * Math.cos(phi), APEX_Y + v * (rimY - APEX_Y), v * rh * Math.sin(phi), v, 3, 3.2, jit([150, 150, 162], .2).map(c => c * br / .6),
        rim ? RAMP.indexOf('=') : code(br, RAMP_P) + 0, rim ? 60 : fold ? 45 : 30);
    }
  }
}
function leaf(ax, ay, az, d0, len, wid, t0) {
  const d = norm(d0), p1 = norm(cross(d, [rnd() - .5, rnd() - .5, rnd() - .5])), p2 = cross(d, p1), nv = Math.ceil(len / 1.1);
  for (let a = 0; a <= nv; a++) {
    const v = a / nv, wv = wid * Math.pow(Math.sin(Math.PI * Math.min(1, v * .95 + .05)), .8) * (v < .08 ? v / .08 : 1), nu = Math.max(1, Math.round(wv * 2 / 1.1));
    for (let b = 0; b <= nu; b++) {
      const u = b / nu * 2 - 1, lat = u * wv, edge = Math.abs(u) > .85 || a === nv, mid = Math.abs(u) < .12, f = .18 * Math.abs(lat);
      const br = edge ? .85 : mid ? .7 : .35 + .3 * rnd() + .1 * v;
      addS(ax + d[0] * len * v + p1[0] * lat + p2[0] * f, ay + d[1] * len * v + p1[1] * lat + p2[1] * f + .22 * len * v * v, az + d[2] * len * v + p1[2] * lat + p2[2] * f,
        v, t0, 1.6, jit(mix(GREEN[0], GREEN[3], br), .2), code(br), 0);
    }
  }
}
// roses on an ellipsoid dome, each built petal by petal
const N = CFG.roses, AX = 29, AY = 22, AZ = 29, CY = 62, BMAX = 1.3, LAY = 5, CNT = [3, 4, 6, 8, 10], AO = [.2, .5, .8, 1.1, 1.4], AC = [.06, .1, .14, .18, .22];
const roses = [], RP = { x0: [], y0: [], z0: [], x1: [], y1: [], z1: [], r: [], g: [], b: [], c: [] };
for (let i = 0; i < N; i++) {
  const bb = BMAX * Math.sqrt((i + .5) / N), gg = i * 2.39996 + rnd() * .2;
  const ex = AX * Math.sin(bb) * Math.cos(gg), ey = -AY * Math.cos(bb), ez = AZ * Math.sin(bb) * Math.sin(gg);
  const nz = norm([ex / (AX * AX), ey / (AY * AY), ez / (AZ * AZ)]);
  let bx = cross([0, -1, 0], nz); bx = Math.hypot(bx[0], bx[1], bx[2]) < .1 ? [1, 0, 0] : norm(bx);
  const by = cross(nz, bx), pr = rnd(), pal = CFG.palettes[pr < .4 ? 0 : pr < .75 ? 1 : 2 % CFG.palettes.length].map(hex);
  const R = 8.2 + rnd() * 1.6, Rb = R * .76, rose = { p: [50 + ex, CY + ey, ez], bx, by, bz: nz, key: bb + rnd() * .5, bud: 2.8 + rnd() * 2.2, t0: 0, lay: [] };
  for (let l = 0; l < LAY; l++) {
    const a0 = RP.x0.length;
    for (let q = 0; q < CNT[l]; q++) {
      const phi = q / CNT[l] * PI2 + l * .95 + rnd() * .3, Lp = Rb * (.5 + .16 * l), half = Lp * (l < 2 ? .8 : .7), r0 = Rb * (.04 + .04 * l), curl = l < 2 ? .15 : .55 + .1 * l;
      const nv = Math.max(4, Math.round(Lp / 1.15)), nu = Math.max(3, Math.round(2 * half / 1.15));
      for (let a = 0; a < nv; a++) {
        const v = Math.min(1, (a + .5 + (rnd() - .5) * .5) / nv), lim = v < .8 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((v - .8) / .2, 2))), wv = half * (.3 + .7 * Math.sqrt(v)) * (1 - .2 * v * v);
        for (let b = 0; b < nu; b++) {
          const u = (b + .5 + (rnd() - .5) * .5) / nu * 2 - 1; if (Math.abs(u) > lim) continue;
          const lat = u * wv, geo = al => { const a2 = al + curl * v * .6, rad = r0 + Lp * v * Math.sin(a2) * (1 - .3 * u * u * (l < 3 ? 1 : .3)); return [rad * Math.cos(phi) - lat * Math.sin(phi), rad * Math.sin(phi) + lat * Math.cos(phi), Lp * v * Math.cos(a2) + .07 * lat * lat]; };
          const o = geo(AO[l]), c = geo(AC[l]), tc = clamp01(.2 + .55 * v + .14 * l / 4 + (rnd() - .5) * .12), edge = Math.abs(u) > .86 || v > .9;
          let rgb = tc < .5 ? mix(pal[0], pal[1], tc * 2) : mix(pal[1], pal[2], (tc - .5) * 2); if (edge) rgb = mix(rgb, [255, 235, 240], .16);
          RP.x0.push(c[0]); RP.y0.push(c[1]); RP.z0.push(c[2]); RP.x1.push(o[0]); RP.y1.push(o[1]); RP.z1.push(o[2]);
          RP.r.push(rgb[0]); RP.g.push(rgb[1]); RP.b.push(rgb[2]); RP.c.push(code(tc + (edge ? .1 : 0)));
        }
      }
    }
    rose.lay.push([a0, RP.x0.length]);
  }
  roses.push(rose);
  // stem fan from the gathered stalk to this rose
  const B = [rose.p[0] - nz[0] * R * .5, rose.p[1] - nz[1] * R * .5, rose.p[2] - nz[2] * R * .5], F = [50, 118, 0], t0 = 2.4 + rnd() * 1.8;
  const M = [(F[0] + B[0]) / 2 + (rnd() - .5) * 5, (F[1] + B[1]) / 2, (F[2] + B[2]) / 2 + (rnd() - .5) * 5], n = Math.ceil(Math.hypot(B[0] - F[0], B[1] - F[1], B[2] - F[2]) / 1);
  for (let s = 0; s <= n; s++) { const u = s / n, w = 1 - u; for (const off of [-.7, 0, .7]) addS(w * w * F[0] + 2 * w * u * M[0] + u * u * B[0] + off, w * w * F[1] + 2 * w * u * M[1] + u * u * B[1], w * w * F[2] + 2 * w * u * M[2] + u * u * B[2] + (rnd() - .5) * .8, u, t0, 2, jit(mix(GREEN[1], GREEN[2], rnd()), .3), code(.3 + rnd() * .4), 0); }
}
[...roses].sort((a, b) => a.key - b.key).forEach((r, i) => { r.t0 = 5 + i / Math.max(1, N - 1) * 7.2; });
// foliage shell, skirt leaves and two big side leaves
for (let i = 0; i < 54; i++) {
  const bb = .3 + rnd() * 1.7, gg = rnd() * PI2, ex = .88 * AX * Math.sin(bb) * Math.cos(gg), ey = -.88 * AY * Math.cos(bb), ez = .88 * AZ * Math.sin(bb) * Math.sin(gg);
  const nz = norm([ex / (AX * AX), ey / (AY * AY), ez / (AZ * AZ)]);
  leaf(50 + ex, CY + ey, ez, [nz[0] + (rnd() - .5) * .6, nz[1] + .25 + (rnd() - .5) * .4, nz[2] + (rnd() - .5) * .6], 6 + rnd() * 5, 2 + rnd() * 1.3, 3 + rnd() * 4);
}
[.2, Math.PI + .2].forEach(g => leaf(50 + Math.cos(g) * 8, 106, Math.sin(g) * 8, [Math.cos(g), .45, Math.sin(g)], 20, 5.5, 4.5));
const NS = A.x.length, SX = Float32Array.from(A.x), SY = Float32Array.from(A.y), SZ = Float32Array.from(A.z), SP = Float32Array.from(A.p), ST = Float32Array.from(A.t), SD = Float32Array.from(A.d);
const SR = Uint8ClampedArray.from(A.r), SG = Uint8ClampedArray.from(A.g), SB = Uint8ClampedArray.from(A.b), SC = Uint8Array.from(A.c), SK = Uint8Array.from(A.k);
const X0 = Float32Array.from(RP.x0), Y0 = Float32Array.from(RP.y0), Z0 = Float32Array.from(RP.z0), X1 = Float32Array.from(RP.x1), Y1 = Float32Array.from(RP.y1), Z1 = Float32Array.from(RP.z1);
const RR = Uint8ClampedArray.from(RP.r), RG = Uint8ClampedArray.from(RP.g), RB = Uint8ClampedArray.from(RP.b), RC = Uint8Array.from(RP.c);
const petalDefs = Array.from({ length: 7 }, (_, j) => ({ x: 28 + rnd() * 44, y: 40 + rnd() * 14, ph: j * .9, L: 9 + rnd() * 4, vy: 7 + rnd() * 3, dr: (rnd() - .5) * 3, ch: '`*o\''[j % 4], col: ['#b3122b', '#c4607a', '#e38ea3', '#d490a2'][j % 4], j }));

/* ---------- Layout, stars, z-buffer ---------- */
let w = 0, h = 0, dpr = 1, S = 1, ox = 0, oy = 0, cw = 6, chh = 8, cols = 0, rows = 0, fontStr = '', stars = [], crosses = [], plus = [];
let ZO, ZS, CO, CS, RO, GO, BO, RS, GS, BS, AS;
function resize() {
  w = window.innerWidth; h = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S = Math.min(w * .94 / 84, h * .8 / 130); ox = w / 2 - 50 * S; oy = h * .05 - 20 * S;
  const fs = Math.max(7, Math.min(16, S * 1.9)); cw = fs * .6; chh = fs * .95; fontStr = `${fs}px "Courier New", ui-monospace, monospace`;
  cols = Math.ceil(w / cw) + 2; rows = Math.ceil(h / chh) + 2; const n = cols * rows;
  ZO = new Float32Array(n); ZS = new Float32Array(n); CO = new Uint8Array(n); CS = new Uint8Array(n);
  RO = new Uint8Array(n); GO = new Uint8Array(n); BO = new Uint8Array(n); RS = new Uint8Array(n); GS = new Uint8Array(n); BS = new Uint8Array(n); AS = new Uint8Array(n);
  const r = mulberry32(7), cs = ['#ffffff', '#bdbdc7', '#ffd9e2'], ns = Math.min(420, Math.floor(w * h / 4500));
  stars = []; crosses = []; plus = [];
  for (let i = 0; i < ns; i++) stars.push({ x: r(), y: r(), s: r() < .15 ? 2 : 1, ph: r() * 6.28, sp: .6 + r() * 2, a: .25 + r() * .6, c: cs[Math.floor(r() * 3)] });
  for (let i = 0; i < 9; i++) crosses.push({ x: .05 + r() * .9, y: .04 + r() * .85, L: 10 + r() * 20, ph: r() * 6.28, sp: .5 + r() });
  for (let i = 0; i < 60; i++) plus.push({ x: r(), y: r(), ph: r() * 6.28, sp: .4 + r() });
  if (paused || reduce) draw();
}

/* ---------- State and drawing ---------- */
let T = reduce ? CFG.duration + 1 : 0, theta = reduce ? .35 : 0, paused = false, raf = 0, last = 0, typed = -1, lastHud = '', lastStat = '';
function plot(x, y, z, ch, r, g, b, k, c, s) {
  const dx = x - 50, xr = dx * c + z * s, zr = -dx * s + z * c, pf = 1 / (1 - zr * .0035);
  const col = Math.round((ox + (50 + xr * pf) * S) / cw), row = Math.round((oy + (80 + (y - 80) * pf) * S) / chh);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return;
  const ci = row * cols + col, df = .58 + .42 * clamp01((zr + 40) / 80);
  if (k) { if (zr > ZS[ci]) { ZS[ci] = zr; CS[ci] = ch; RS[ci] = r * df; GS[ci] = g * df; BS[ci] = b * df; AS[ci] = k; } }
  else if (zr > ZO[ci]) { ZO[ci] = zr; CO[ci] = ch; RO[ci] = r * df; GO[ci] = g * df; BO[ci] = b * df; }
}
function drawStars() {
  for (const s of stars) { ctx.globalAlpha = s.a * (.5 + .5 * Math.sin(T * s.sp + s.ph)); ctx.fillStyle = s.c; ctx.fillRect(s.x * w, s.y * h, s.s, s.s); }
  ctx.fillStyle = '#9a9aa6'; ctx.font = '8px "Courier New", monospace';
  for (const p of plus) { ctx.globalAlpha = .2 + .3 * (.5 + .5 * Math.sin(T * p.sp + p.ph)); ctx.fillText('+', p.x * w, p.y * h); }
  ctx.strokeStyle = '#ffe9f0'; ctx.fillStyle = '#fff'; ctx.lineWidth = 1;
  for (const c of crosses) {
    const al = .3 + .35 * (.5 + .5 * Math.sin(T * c.sp + c.ph)), x = c.x * w, y = c.y * h, d = c.L * .55;
    ctx.globalAlpha = al * .7; ctx.beginPath(); ctx.moveTo(x - c.L, y); ctx.lineTo(x + c.L, y); ctx.moveTo(x, y - c.L); ctx.lineTo(x, y + c.L);
    ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x - d, y + d); ctx.lineTo(x + d, y - d); ctx.stroke();
    ctx.globalAlpha = al + .2; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}
function draw() {
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#03030a'; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; drawStars();
  const gx = ox + 50 * S, gy = oy + 70 * S, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 55 * S), gp = clamp01((T - 4) / 8);
  gr.addColorStop(0, 'rgba(200,40,80,.13)'); gr.addColorStop(1, 'rgba(200,40,80,0)'); ctx.globalAlpha = gp; ctx.fillStyle = gr; ctx.fillRect(gx - 55 * S, gy - 55 * S, 110 * S, 110 * S);
  ZO.fill(-1e9); ZS.fill(-1e9);
  const c = Math.cos(theta), s = Math.sin(theta);
  for (let i = 0; i < NS; i++) {
    const t = ST[i]; if (T < t) continue;
    if (SP[i] > easeOut(clamp01((T - t) / SD[i]))) continue;
    plot(SX[i], SY[i], SZ[i], SC[i], SR[i], SG[i], SB[i], SK[i], c, s);
  }
  let open = 0;
  for (const R of roses) {
    const bud = easeOut(clamp01((T - R.bud) / 1.2)); if (bud <= 0) continue;
    const [bx, by, bz, p] = [R.bx, R.by, R.bz, R.p];
    for (let l = 0; l < LAY; l++) {
      const e = easeIO(clamp01((T - R.t0 - l * .32) / 1.5)), m = .3 + .7 * e, rg = R.lay[l];
      if (l === LAY - 1 && e >= 1) open++;
      for (let i = rg[0]; i < rg[1]; i++) {
        const lx = (X0[i] + (X1[i] - X0[i]) * e) * bud, ly = (Y0[i] + (Y1[i] - Y0[i]) * e) * bud, lz = (Z0[i] + (Z1[i] - Z0[i]) * e) * bud;
        plot(p[0] + lx * bx[0] + ly * by[0] + lz * bz[0], p[1] + lx * bx[1] + ly * by[1] + lz * bz[1], p[2] + lx * bx[2] + ly * by[2] + lz * bz[2], RC[i],
          BUD[0] + (RR[i] - BUD[0]) * m, BUD[1] + (RG[i] - BUD[1]) * m, BUD[2] + (RB[i] - BUD[2]) * m, 0, c, s);
      }
    }
  }
  ctx.font = fontStr; ctx.globalAlpha = 1; let lr = -1, lg = -1, lb = -1;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const ci = row * cols + col, hasO = ZO[ci] > -1e8, hasS = ZS[ci] > -1e8;
    if (!hasO && !hasS) continue;
    const px = col * cw, py = row * chh;
    if (hasO) { if (RO[ci] !== lr || GO[ci] !== lg || BO[ci] !== lb) { lr = RO[ci]; lg = GO[ci]; lb = BO[ci]; ctx.fillStyle = `rgb(${lr},${lg},${lb})`; } ctx.fillText(RAMP[CO[ci]], px, py); }
    if (hasS && ZS[ci] > ZO[ci]) { ctx.globalAlpha = AS[ci] / 100 * (hasO ? 1 : 1.2); ctx.fillStyle = `rgb(${RS[ci]},${GS[ci]},${BS[ci]})`; lr = -1; ctx.fillText(RAMP_P[CS[ci] % RAMP_P.length] || '.', px, py); ctx.globalAlpha = 1; }
  }
  let falling = 0;
  if (T >= 12) for (const d of petalDefs) {
    const loc = T - 12 - d.ph; if (loc < 0) continue;
    const cc = loc % d.L, x = d.x + Math.sin(cc * 1.3 + d.j) * 3 + d.dr * cc, y = d.y + cc * d.vy; if (y > 146) continue;
    falling++; ctx.globalAlpha = .9 * (1 - clamp01((y - 130) / 16)); ctx.fillStyle = d.col; ctx.fillText(d.ch, ox + x * S, oy + y * S);
  }
  ctx.globalAlpha = 1;
  const full = CFG.word + ' ' + CFG.heart, n = T < CFG.captionStart ? 0 : Math.min(full.length, Math.floor((T - CFG.captionStart) * full.length / 1.2) + 1);
  if (n !== typed) { typed = n; const t = full.slice(0, n); cap1.textContent = t.slice(0, CFG.word.length); cap2.textContent = t.slice(CFG.word.length); }
  const hs = `● t ${Math.min(T, CFG.duration).toFixed(2)}s`; if (hs !== lastHud) { lastHud = hs; hud.textContent = hs; }
  const fill = Math.round(clamp01(T / CFG.duration) * 12), ss = `> [${'#'.repeat(fill)}${'-'.repeat(12 - fill)}] roses open ${open}/${roses.length} | petals falling ${falling}`;
  if (ss !== lastStat) { lastStat = ss; statusEl.textContent = ss; }
}

/* ---------- Loop / controls ---------- */
function tick(ts) {
  raf = requestAnimationFrame(tick);
  if (ts - last < 1000 / (T > CFG.duration + 1 ? 30 : 40)) return;
  const dt = Math.min(.1, (ts - last) / 1000); last = ts; T += dt;
  theta += CFG.spin * easeIO(clamp01((T - 2) / 3)) * dt; draw();
}
function start() { if (!raf && !paused && !reduce) { last = performance.now(); raf = requestAnimationFrame(tick); } }
function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
function setPaused(v) { paused = v; btnPause.textContent = v ? 'Resume' : 'Pause'; btnPause.setAttribute('aria-pressed', String(v)); if (v) { stop(); draw(); } else start(); }
btnPause.addEventListener('click', () => setPaused(!paused));
btnReplay.addEventListener('click', () => { T = 0; theta = 0; typed = -1; setPaused(false); draw(); start(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
let rz = 0; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resize); });
if (reduce) document.getElementById('controls').hidden = true;
resize(); draw(); start();
})();
