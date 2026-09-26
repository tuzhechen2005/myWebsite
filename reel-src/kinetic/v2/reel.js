// reel.js: "Work Reel ’26", the kinetic-type cut. Every frame is a pure function of t (frames render in parallel).
// Layers per frame:  WebGL backgrounds (particle terrain, liquid marble, chrome knot) → 2D canvas (type, HUD, shapes)
// → WebGL post pass (RGB split, slice glitch, grain, vignette, flash) → #out. The render.mjs contract: window.ready,
// renderAt(t), renderSheet(...), gpuInfo(), globals DUR + PROJECT.
import * as THREE from '../../site/vendor/three/three.module.js';

const W = 1920, H = 1080, C = KCUE, S = C.S, Hh = C.hits, FPS = C.fps, BEAT = 60 / C.bpm;
window.DUR = C.dur; window.PROJECT = { audio: 'assets/kinetic.m4a' };
const K = { ink: '#0E0F0E', ink2: '#171917', cream: '#F1EEE6', lime: '#DDF53D', blue: '#2F3CFF', red: '#E8412F', grey: '#8B908A', mid: '#5E625D' };
const F = { cond: '"Anton"', wide: '"Archivo Black"', serif: '"Instrument Serif"', mono: '"JetBrains Mono"', zh: '"Noto Sans SC"' };

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const expoOut = x => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const backOut = x => { x = clamp(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const beatPulse = (t, k = 7) => Math.exp(-((t / BEAT) % 1) * k);
const TAU = Math.PI * 2;

// ---------- canvases ----------
const out = document.getElementById('out');
const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
const ctx = c2.getContext('2d');
const glA = document.createElement('canvas'); glA.width = W; glA.height = H;
const RA = new THREE.WebGLRenderer({ canvas: glA, antialias: true, alpha: true, preserveDrawingBuffer: true });
RA.setPixelRatio(1); RA.setSize(W, H, false);
const RP = new THREE.WebGLRenderer({ canvas: out, antialias: false, preserveDrawingBuffer: true });
RP.setPixelRatio(1); RP.setSize(W, H, false); RP.outputColorSpace = THREE.LinearSRGBColorSpace;

// ---------- GL layer 1: particle terrain ----------
const terrain = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, W / H, .1, 100);
  const nx = 220, nz = 140, pos = new Float32Array(nx * nz * 3);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const k = (i * nz + j) * 3; pos[k] = (i / (nx - 1) - .5) * 26; pos[k + 1] = 0; pos[k + 2] = -j / (nz - 1) * 30 + 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, amp: { value: 1 }, fade: { value: 1 }, tint: { value: new THREE.Color(K.cream) } },
    vertexShader: `uniform float time, amp; varying float vA;
      float wave(vec2 p, float t){ return sin(p.x*.5+t*.9)*.45 + sin(p.y*.38-t*.7)*.6 + sin((p.x+p.y)*.27+t*.5)*.7 + sin(length(p-vec2(3.,-9.))*.8-t*1.4)*.4; }
      void main(){ vec3 p = position; p.y = wave(p.xz, time)*amp; vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = 5.5 * (6.0 / -mv.z); float d = -mv.z; vA = clamp(1.0 - d/30.0, 0., 1.) * (.25 + .75*smoothstep(-1.2, 1.6, p.y)) * smoothstep(0.5, 3.5, d);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float fade; uniform vec3 tint; varying float vA;
      void main(){ vec2 c = gl_PointCoord-.5; float r = dot(c,c); if (r>.25) discard; gl_FragColor = vec4(tint, vA*fade*(1.0-r*2.5)); }`,
  });
  scene.add(new THREE.Points(g, mat));
  return (t, o = {}) => {
    mat.uniforms.time.value = t; mat.uniforms.amp.value = o.amp ?? 1; mat.uniforms.fade.value = o.fade ?? 1;
    cam.position.set(Math.sin(t * .15) * 1.5, o.camY ?? 3.2, 5 - (o.push ?? 0)); cam.lookAt(0, -.4, -8); cam.rotation.z += o.roll ?? 0;
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 2: liquid marble (domain-warped fbm, banded) ----------
const liquid = (() => {
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, strips: { value: 0 }, stripAmt: { value: 0 }, zoom: { value: 1.6 }, seed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform float time, strips, stripAmt, zoom, seed; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
      void main(){
        vec2 uv = vUv; vec2 p = (uv-.5)*vec2(res.x/res.y,1.)*zoom + seed;
        if (strips > 0.) { float s = floor(uv.x*strips); p.y += (h(vec2(s,3.))-.5)*stripAmt; p.x += (h(vec2(s,7.))-.5)*stripAmt*.25; }
        vec2 q = vec2(fbm(p + time*.06), fbm(p + vec2(5.2,1.3) - time*.05));
        vec2 r = vec2(fbm(p + 3.6*q + vec2(1.7,9.2) + time*.13), fbm(p + 3.6*q + vec2(8.3,2.8) - time*.11));
        float f = fbm(p + 3.8*r);
        float band = sin(f*22.0 + r.x*7.0)*.5+.5;
        vec3 blue = vec3(.19,.24,1.), red = vec3(.93,.33,.23), lil = vec3(.75,.68,.98), navy = vec3(.06,.07,.32), cream = vec3(.98,.9,.86);
        vec3 col = mix(blue, red, smoothstep(.38,.62,f));
        col = mix(col, lil, smoothstep(.62,.95,band)*.55);
        col = mix(col, navy, smoothstep(.55,.95,1.0-f)*.75);
        col = mix(col, cream, smoothstep(.93,1.,band)*smoothstep(.45,.7,f)*.5);
        gl_FragColor = vec4(col,1.);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.strips.value = o.strips || 0; u.stripAmt.value = o.stripAmt || 0; u.zoom.value = o.zoom ?? 1.6; u.seed.value = o.seed || 0;
    RA.setClearColor(0x000000, 1); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 3: chrome torus knot (matcap + inked outline) ----------
const knot = (() => {
  const mc = document.createElement('canvas'); mc.width = mc.height = 256; const m = mc.getContext('2d');
  m.fillStyle = '#202020'; m.fillRect(0, 0, 256, 256);
  let g = m.createRadialGradient(96, 84, 4, 128, 128, 132);
  [[0, '#ffffff'], [.18, '#f2f2f2'], [.38, '#b9b9b9'], [.55, '#5c5c5c'], [.7, '#262626'], [.84, '#9d9d9d'], [.93, '#e6e6e6'], [1, '#5a5a5a']].forEach(([s, c]) => g.addColorStop(s, c));
  m.fillStyle = g; m.beginPath(); m.arc(128, 128, 128, 0, TAU); m.fill();
  g = m.createLinearGradient(0, 120, 0, 170); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  m.fillStyle = g; m.fillRect(0, 120, 256, 50);
  const tex = new THREE.CanvasTexture(mc); tex.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, .1, 100); cam.position.set(0, 0, 9);
  const geo = new THREE.TorusKnotGeometry(1.25, .34, 360, 48, 2, 3);
  const body = new THREE.Mesh(geo, new THREE.MeshMatcapMaterial({ matcap: tex }));
  const hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0e0f0e, side: THREE.BackSide })); hull.scale.setScalar(1.045);
  const grp = new THREE.Group(); grp.add(hull, body); scene.add(grp);
  return (t, o = {}) => {
    grp.rotation.set(t * .55 + (o.r0 || 0), t * .8, t * .25);
    grp.position.set(o.x ?? 1.9, o.y ?? 0, 0); grp.scale.setScalar(o.s ?? 1);
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- post pass ----------
const post = (() => {
  const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.NoColorSpace; tex.minFilter = tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: tex }, split: { value: 0 }, slice: { value: 0 }, seed: { value: 0 }, grain: { value: .05 }, time: { value: 0 }, vign: { value: .5 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) }, res: { value: new THREE.Vector2(W, H) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D tex; uniform float split, slice, seed, grain, time, vign, flash; uniform vec3 flashCol; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        float band = floor(uv.y*28.0 + h(vec2(seed,1.))*3.0), hb = h(vec2(band, seed));
        if (hb < slice) uv.x += (h(vec2(band, seed+2.)) - .5) * .16 * slice;
        vec2 d = vec2(split, split*.15);
        vec3 c = vec3(texture2D(tex, uv + d).r, texture2D(tex, uv).g, texture2D(tex, uv - d).b);
        c += (h(vUv*res + time*61.7) - .5) * grain;
        vec2 q = vUv - .5; c *= 1.0 - vign*dot(q,q)*.9;
        c = mix(c, flashCol, flash);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, fx) => {
    tex.needsUpdate = true;
    const u = mat.uniforms; u.split.value = fx.split; u.slice.value = fx.slice; u.seed.value = fx.seed; u.time.value = Math.floor(t * FPS);
    u.grain.value = fx.grain; u.vign.value = fx.vign; u.flash.value = fx.flash; u.flashCol.value.set(fx.flashCol);
    RP.render(scene, cam);
  };
})();

// ---------- 2D helpers ----------
let FX;
const font = (fam, size, weight = '') => `${weight} ${size}px ${fam}`.trim();
function txt(s, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.globalAlpha = o.a ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 28; }
  if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  if (o.fill !== null) { ctx.fillStyle = o.fill || K.cream; ctx.fillText(s, x, y); }
  ctx.restore();
}
// per-letter animation: fn(i, n) → { dx, dy, r, s, a }
function letters(s, x, y, o, fn) {
  ctx.save(); ctx.font = o.font; ctx.letterSpacing = (o.ls || 0) + 'px';
  const total = ctx.measureText(s).width, x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s[i]; if (ch === ' ') continue;
    const px = ctx.measureText(s.slice(0, i)).width, cw = ctx.measureText(ch).width, a = fn(i, n);
    if ((a.a ?? 1) <= 0.001) continue;
    ctx.save(); ctx.globalAlpha = a.a ?? 1; ctx.translate(x0 + px + cw / 2 + (a.dx || 0), y + (a.dy || 0)); ctx.rotate(a.r || 0); ctx.scale(a.s ?? 1, a.s ?? 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(ch, 0, 0); }
    if (o.fill !== null) { ctx.fillStyle = a.fill || o.fill || K.cream; ctx.fillText(ch, 0, 0); }
    ctx.restore();
  }
  ctx.restore();
  return total;
}
const measure = (s, f, ls = 0) => { ctx.save(); ctx.font = f; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; };
const bg = col => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
function line(pts, col, lw = 2, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); }
function circle(x, y, r, o = {}) { if (!(r > .01)) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.beginPath(); ctx.arc(x, y, r, o.a0 ?? 0, o.a1 ?? TAU); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } ctx.restore(); }
// the Jelly mark: a dome and four tentacles. (x, y) = centre of the dome's base; r = dome radius; k = 0..1 build-in
function jelly(x, y, r, col, t, k = 1, rot = 0) {
  if (!(r > .01)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  const dome = easeOut(seg(k, 0, .55));
  if (dome > 0) { ctx.beginPath(); ctx.arc(0, 0, r * dome, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
  const tk = seg(k, .35, 1);
  for (let i = 0; i < 4; i++) {
    const xi = (-0.6 + i * .4) * r, L = r * (1.05 + .25 * (i % 2)) * easeOut(seg(tk, i * .12, .6 + i * .12));
    if (L < 1) continue;
    ctx.lineWidth = r * .16; ctx.beginPath(); ctx.moveTo(xi, r * .12);
    for (let s = 1; s <= 8; s++) { const q = s / 8; ctx.lineTo(xi + Math.sin(t * 5 + i * 1.3 - q * 4) * r * .12 * q, r * .12 + L * q); }
    ctx.stroke();
  }
  ctx.restore();
}
function starburst(x, y, r, n, col, rot = 0, inner = .62) { if (!(r > .01)) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, q = i % 2 ? r * inner : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill(); ctx.restore(); }
function asterisk(x, y, r, col, lw = 5, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); } ctx.restore(); }
function arrowNE(x, y, s, col, lw = 6) { line([[x, y + s], [x + s, y]], col, lw); line([[x + s * .35, y], [x + s, y], [x + s, y + s * .65]], col, lw); }
// HUD: corner brackets + micro-type in the four corners + a progress rule
function hud(t, o) {
  const dark = o.dark !== false, col = dark ? 'rgba(241,238,230,.85)' : 'rgba(14,15,14,.85)', dim = dark ? 'rgba(241,238,230,.45)' : 'rgba(14,15,14,.45)';
  const k = o.k ?? 1, m = 40, L = 26 * k;
  if (o.brackets !== false) for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) line([[cx, cy + sy * L], [cx, cy], [cx + sx * L, cy]], col, 2, k);
  const f = font(F.mono, 17, 500), a = clamp(k * 1.4 - .3);
  if (o.tl) txt(o.tl, m + 18, m + 30, { font: f, fill: col, ls: 2.5, a });
  if (o.tr) txt(o.tr, W - m - 18, m + 30, { font: f, fill: col, ls: 2.5, align: 'right', a });
  if (o.bl) txt(o.bl, m + 18, H - m - 18, { font: f, fill: col, ls: 2.5, a });
  if (o.br) txt(o.br, W - m - 18, H - m - 18, { font: f, fill: col, ls: 2.5, align: 'right', a });
  if (o.zh) txt(o.zh, o.zhRight ? W - m - 18 : m + 18, H - m - 52, { font: font(F.zh, 21, 500), fill: dim, ls: 3, align: o.zhRight ? 'right' : 'left', a });
  if (o.progress !== false) { const y = H - m + 10; line([[m + 18, y], [W - m - 18, y]], dim, 1, a * .6); line([[m + 18, y], [lerp(m + 18, W - m - 18, t / C.dur), y]], col, 2, a); }
}
const tc = t => { const f = Math.floor(t * FPS), s = Math.floor(f / FPS), fr = f % FPS, p = n => String(n).padStart(2, '0'); return `TC 00:00:${p(s)}:${p(fr)}`; };
const sec = (i, name) => `■ ${String(i).padStart(2, '0')} / 03   ${name}`;
const glShot = (canvas, a = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.drawImage(canvas, 0, 0, W, H); ctx.restore(); };
const count = (t, t0, t1, v0, v1) => Math.round(lerp(v0, v1, expoOut(seg(t, t0, t1))));

// ---------- scenes ----------
function sBoot(t) {
  bg(K.ink);
  glShot(terrain(t, { fade: ease(seg(t, .15, 1.6)) * (1 - .6 * seg(t, 3.2, 4)), amp: lerp(.2, 1.1, easeOut(seg(t, 0, 2.5))), push: t * .6 }));
  // the lime dot → Jelly mark
  const cx = W / 2, cy = H / 2 - 30;
  if (t > Hh.dot - .05) {
    const k = backOut(seg(t, Hh.dot, Hh.dot + .35)), p = beatPulse(t);
    if (t < Hh.mark) circle(cx, cy + 30, (14 + 10 * p) * k, { fill: K.lime });
    else { const r = 78 * backOut(seg(t, Hh.mark, Hh.mark + .4)); circle(cx, cy + 30, r * 1.9, { fill: 'rgba(221,245,61,.08)' }); jelly(cx, cy + 40, 70, K.lime, t, seg(t, Hh.mark, Hh.mark + .6)); }
  }
  txt('INITIALIZING', W / 2, H / 2 + 170, { font: font(F.mono, 18, 500), fill: 'rgba(241,238,230,.6)', ls: 8, align: 'center', a: seg(t, .6, 1) * (1 - seg(t, 2.8, 3.1)) });
  txt(String(count(t, .6, 3, 0, 100)).padStart(3, '0') + '%', W / 2, H / 2 + 210, { font: font(F.mono, 18, 700), fill: K.lime, ls: 4, align: 'center', a: seg(t, .6, 1) * (1 - seg(t, 2.8, 3.1)) });
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'BOOT'), br: '1920×1080 · 30 FPS · RENDERED IN CODE', zh: '作品集 · 2026', k: ease(seg(t, .15, .7)) });
  FX.flash = Math.max(0, 1 - Math.abs(t - 3.95) / .08) * .9 + (t > 3.9 ? seg(t, 3.9, 4) * .6 : 0);
}
function sEvery(t) {
  bg(K.ink);
  const lt = t - S.every, word = t < Hh.answer ? 'EVERY' : 'ANSWER', f = font(F.wide, 236);
  const flip = expoOut(seg(t, Hh.answer - .08, Hh.answer + .35)), scroll = (lt * 70) % 250;
  const rows = [-3, -2, -1, 1, 2, 3];
  for (const r of rows) {
    const y = H / 2 + 88 + r * 250 - scroll * (r < 0 ? -1 : 1) * .3 + (t < Hh.answer ? 0 : (1 - flip) * 250);
    txt(word, W / 2, y, { font: f, fill: null, stroke: 'rgba(241,238,230,.55)', lw: 2, align: 'center', a: 1 - Math.abs(r) * .22 });
  }
  const slam = t < Hh.answer ? backOut(seg(lt, 0, .35)) : backOut(seg(t, Hh.answer, Hh.answer + .3));
  ctx.save(); ctx.translate(W / 2, H / 2 + 88); ctx.scale(lerp(1.25, 1, slam), lerp(1.25, 1, slam));
  txt(word, 0, 0, { font: f, fill: K.cream, align: 'center', glow: 'rgba(241,238,230,.35)', glowR: 30 });
  ctx.restore();
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'THESIS'), br: '1920×1080 · 30 FPS · RENDERED IN CODE' });
  if (Math.abs(t - Hh.answer) < .1) { FX.split = .004 * (1 - Math.abs(t - Hh.answer) / .1); FX.slice = .3 * (1 - Math.abs(t - Hh.answer) / .1); FX.seed = 11; }
}
function sNeeds(t) {
  bg(K.cream); const lt = t - S.needs + .12;   // starts mid-motion: something is on screen from the cut frame
  circle(W / 2, H / 2, lerp(190, 128, expoOut(seg(lt, 0, .5))), { stroke: K.blue, lw: 2.5, a1: -Math.PI / 2 + TAU * expoOut(seg(lt, 0, .45)), a0: -Math.PI / 2 });
  circle(W / 2, H / 2 - 190, 7 * backOut(seg(lt, .15, .35)), { fill: K.red });
  ctx.save(); ctx.translate(W / 2, H / 2 + 36); const sc = lerp(1.35, 1, expoOut(seg(lt, 0, .4))); ctx.scale(sc, sc);
  txt('needs', 0, 0, { font: `italic 132px ${F.serif}`, fill: K.ink, align: 'center', a: seg(lt, 0, .12) });
  ctx.restore();
  hud(t, { dark: false, tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'THESIS'), br: 'EVERY ANSWER NEEDS —' });
}
function sEvid(t) {
  bg(K.blue); const lt = t - S.evid, f = font(F.wide, 250);
  const k = expoOut(seg(lt, 0, .28)), x = lerp(W * 1.3, W / 2, k);
  for (let i = 5; i >= 1; i--) txt('EVIDENCE', x + i * 70 * (1 - k) * 2.2, H / 2 + 90, { font: f, fill: K.cream, align: 'center', a: .12 * (1 - k) * (6 - i) });
  txt('EVIDENCE', x, H / 2 + 90, { font: f, fill: K.cream, align: 'center' });
  ctx.fillStyle = K.red; ctx.fillRect(1480, 250, 18, 64 * backOut(seg(lt, .2, .4)));
  txt('每个回答，都需要依据', W / 2, H / 2 + 200, { font: font(F.zh, 34, 500), fill: 'rgba(241,238,230,.85)', align: 'center', ls: 10, a: seg(lt, .3, .5) });
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'THESIS'), br: 'EVERY ANSWER NEEDS EVIDENCE.' });
  if (lt < .12) { FX.split = .006 * (1 - lt / .12); }
  if (t > Hh.glitchOut1) { const g = seg(t, Hh.glitchOut1, S.name); FX.slice = g; FX.split = .01 * g; FX.seed = Math.floor(t * FPS); }
}
function sName(t) {
  bg(K.ink); const lt = t - S.name;
  // a big dashed ring rotating
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(t * .12); ctx.setLineDash([2, 14]); circle(0, 0, 470, { stroke: 'rgba(241,238,230,.25)', lw: 2 }); ctx.restore();
  const f = font(F.wide, 172), fill = seg(t, Hh.nameFill - .05, Hh.nameFill + .1);
  const w = letters('ZHECHEN TU', W / 2, H / 2 + 60, { font: f, align: 'center', fill: null, stroke: K.cream, lw: 2.5 }, (i, n) => ({ a: seg(lt, i * .03, i * .03 + .1) }));
  if (fill > 0) txt('ZHECHEN TU', W / 2, H / 2 + 60, { font: f, fill: K.cream, align: 'center', a: fill, glow: 'rgba(241,238,230,.25)' });
  circle(W / 2 + w / 2 + 28, H / 2 + 44, 16 * backOut(seg(t, Hh.nameFill, Hh.nameFill + .3)), { fill: K.lime });
  txt('AI APPLICATION · AGENT ENGINEER', W / 2, H / 2 - 128, { font: font(F.mono, 22, 700), fill: 'rgba(241,238,230,.8)', ls: 7, align: 'center', a: seg(lt, .35, .55) });
  txt('every answer, with its source.', W / 2, H / 2 + 150, { font: `italic 50px ${F.serif}`, fill: K.cream, align: 'center', a: seg(lt, .7, .95) });
  txt('涂喆宸', W / 2, H / 2 + 222, { font: font(F.zh, 26, 500), fill: 'rgba(241,238,230,.55)', ls: 14, align: 'center', a: seg(lt, .9, 1.1) });
  hud(t, { tl: 'UW–MADISON CS ’27', tr: tc(t), bl: 'MICROSOFT CLOUD & AI ’26', br: 'UW SURGERY · CLINICAL AI' });
  if (lt < .3) { FX.split = .012 * (1 - lt / .3); FX.slice = .5 * (1 - lt / .3); FX.seed = Math.floor(t * FPS) + 3; }
}
function odometer(v0, v1, k, x, y, f, col) {   // digits roll from v0 to v1
  const s0 = String(v0), s1 = String(v1); ctx.save(); ctx.font = f;
  let xx = x; const hgt = parseFloat(f.match(/(\d+)px/)[1]) * .92;
  for (let i = 0; i < s1.length; i++) {
    const d0 = +s0[i], d1 = +s1[i], w = ctx.measureText(s1[i]).width, kk = expoOut(clamp(k * 1.2 - i * .15));
    ctx.save(); ctx.beginPath(); ctx.rect(xx - 10, y - hgt, w + 20, hgt * 1.12); ctx.clip();
    const steps = (d1 - d0 + 10) % 10 || 10, off = kk * steps;
    for (let j = -1; j <= steps + 1; j++) { const dy = (j - off) * hgt; if (Math.abs(dy) > hgt * 1.2) continue; ctx.fillStyle = col; ctx.fillText(String((d0 + j + 10) % 10), xx, y + dy); }
    ctx.restore(); xx += w;
  }
  ctx.restore(); return xx;
}
function tape(t, y, rot, col, fg, words, speed, dir, k) {
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate(rot); ctx.translate(lerp(dir * W * 1.4, 0, expoOut(k)), 0);
  ctx.fillStyle = col; ctx.fillRect(-W * 1.5, -85, W * 3, 170);
  const f = font(F.cond, 128), unit = words.map(w => measure(w, f) + 170).reduce((a, b) => a + b, 0), off = ((t * speed) % unit + unit) % unit;
  let x = -W * 1.4 - off * dir;
  while (x < W * 1.5) for (const w of words) { txt(w, x, 50, { font: f, fill: fg }); const ww = measure(w, f); if (w !== '') { if (words.indexOf(w) % 2 === 0) asterisk(x + ww + 85, 0, 34, fg, 7, t); else arrowNE(x + ww + 55, -32, 62, fg, 8); } x += ww + 170; }
  ctx.restore();
}
function sEnd(t) {
  bg('#121412'); const lt = t - S.end;
  letters('ZHECHEN', 130, 560, { font: font(F.cond, 280), fill: K.cream }, i => { const k = seg(lt, i * .04, .4 + i * .04); return { dy: (1 - expoOut(k)) * 220, a: k > 0 ? 1 : 0 }; });
  letters('TU.', 130, 820, { font: font(F.cond, 280), fill: K.cream }, i => { const k = seg(lt, .25 + i * .05, .65 + i * .05); return { dy: (1 - expoOut(k)) * 220, a: k > 0 ? 1 : 0, fill: i === 2 ? K.lime : K.cream }; });
  const mk = seg(t, Hh.endMark, Hh.endMark + .8), p = beatPulse(t, 6);
  starburst(1470, 440, 150 * backOut(mk), 14, 'rgba(221,245,61,.14)', t * .3, .8);
  jelly(1470, 430, 118 * backOut(mk), K.lime, t, mk, .05 * Math.sin(t * 1.5));
  circle(1470, 430, (200 + 12 * p) * backOut(mk), { stroke: 'rgba(221,245,61,.35)', lw: 2 });
  // progress ring
  const pr = seg(lt, .8, 4.2); circle(1470, 800, 52, { stroke: 'rgba(241,238,230,.2)', lw: 3 }); circle(1470, 800, 52, { stroke: K.lime, lw: 3, a0: -Math.PI / 2, a1: -Math.PI / 2 + TAU * pr, a: seg(lt, .6, .9) });
  circle(1470 + Math.cos(-Math.PI / 2 + TAU * pr) * 52, 800 + Math.sin(-Math.PI / 2 + TAU * pr) * 52, 8, { fill: K.lime, a: seg(lt, .6, .9) });
  txt('AI APPLICATION & AGENT ENGINEER', 140, 900, { font: font(F.mono, 26, 700), fill: K.cream, ls: 6, a: seg(lt, .8, 1.1) });
  line([[140 + measure('AI APPLICATION & AGENT ENGINEER', font(F.mono, 26, 700), 6) + 24, 891], [140 + measure('AI APPLICATION & AGENT ENGINEER', font(F.mono, 26, 700), 6) + 24 + 120 * easeOut(seg(lt, 1, 1.5)), 891]], K.cream, 2);
  hud(t, { tl: 'SELECTED WORK — 2026', tr: 'ANSWERS WITH SOURCES.', bl: 'ztu29@wisc.edu', br: 'github.com/tuzhechen2005 ↗', brackets: false, k: seg(lt, .5, 1) });
  // outro: glitch, collapse to a dot, black
  if (t > Hh.glitchEnd) { const g = seg(t, Hh.glitchEnd, Hh.endDot); FX.slice = g; FX.split = .02 * g; FX.seed = Math.floor(t * FPS); }
  if (t > Hh.endDot) {
    const k = seg(t, Hh.endDot, Hh.endDot + .25);
    bg(K.ink); circle(W / 2, H / 2, lerp(60, 4, easeIn(k)) * (1 - seg(t, C.dur - .25, C.dur)), { fill: K.cream });
    FX.slice = 0; FX.split = 0;
  }
}

// ---------- v2 helpers ----------
function rrect(x, y, w, h, r, o = {}) { if (!(w > .5) || !(h > .5)) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } ctx.restore(); }
// a label chip, left edge at x, vertically centred on y; k = 0..1 wipe-in. Returns its width.
function chip(s, x, y, o = {}) {
  const f = o.font || font(F.mono, 18, 700), ls = o.ls ?? 2, w = measure(s, f, ls) + 28, h = o.h || 38, k = o.k ?? 1;
  if (k <= 0) return w;
  rrect(x, y - h / 2, w * easeOut(k), h, o.r ?? 0, { fill: o.bg || K.ink, stroke: o.line, lw: o.lw, a: o.a });
  if (k > .6) txt(s, x + 14, y + 6.5, { font: f, fill: o.fg || K.cream, ls, a: (o.a ?? 1) * seg(k, .6, 1) });
  return w;
}
function arrow(x0, y0, x1, y1, col, lw = 2, a = 1, head = 13) {
  if (a <= 0) return;
  line([[x0, y0], [x1, y1]], col, lw, a); const g = Math.atan2(y1 - y0, x1 - x0);
  line([[x1 - Math.cos(g - .45) * head, y1 - Math.sin(g - .45) * head], [x1, y1], [x1 - Math.cos(g + .45) * head, y1 - Math.sin(g + .45) * head]], col, lw, a);
}
// big number + small label under it
function stat(v, label, x, y, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  txt(v, x, y + (1 - easeOut(k)) * 24, { font: font(F.cond, o.size || 110), fill: o.col || K.cream, a: k, align: o.align });
  txt(label, x + (o.align === 'right' ? 0 : 4), y + (o.gap || 38), { font: font(F.mono, o.ls ? 16 : 17, 700), fill: o.sub || 'rgba(241,238,230,.7)', ls: 2.5, a: k, align: o.align });
}
const pad2 = n => String(n).padStart(2, '0');
// drop-in word: letters fall from above with overshoot
const dropWord = (s, x, y, f, t0, t, o = {}) => letters(s, x, y, { font: f, fill: o.fill || K.cream, align: o.align }, (i) => {
  const k = seg(t, t0 + i * (o.stag ?? .03), t0 + i * (o.stag ?? .03) + (o.dur ?? .32)); return { dy: (1 - expoOut(k)) * (o.fall ?? 220), a: k > 0 ? 1 : 0, fill: o.fillAt ? o.fillAt(i) : undefined };
});
const glitchIn = (lt, seed, d = .14, amt = .5) => { if (lt < d) { FX.slice = Math.max(FX.slice, amt * (1 - lt / d)); FX.split = Math.max(FX.split, .006 * (1 - lt / d)); FX.seed = seed; } };
const MSHUD = (t, o) => hud(t, { tr: tc(t), ...o });

// ---------- 01 MICROSOFT CLOUD & AI ----------
function sMs0(t) {
  bg(K.ink); const lt = t - S.ms0;
  glShot(terrain(t, { fade: .4, amp: .9, push: 2.5 + lt * .6, camY: 2.2 }));
  dropWord('MICROSOFT', 140, 520, font(F.cond, 300), Hh.msWord, t, { fall: 260 });
  txt('CLOUD & AI', 150, 655, { font: font(F.wide, 104), fill: null, stroke: K.lime, lw: 2.5, a: seg(t, Hh.msSub, Hh.msSub + .15) });
  const k = seg(t, Hh.msFive, Hh.msFive + .3);
  txt('05', 1460, 520, { font: font(F.cond, 300), fill: K.lime, a: k });
  txt('SYSTEMS', 1468, 575, { font: font(F.mono, 24, 700), fill: K.cream, ls: 8, a: k });
  txt('ONE SUMMER', 1468, 612, { font: font(F.mono, 24, 700), fill: 'rgba(241,238,230,.6)', ls: 8, a: seg(t, Hh.msFive + .2, Hh.msFive + .4) });
  txt('微软 · 云计算与人工智能事业部 · AI 应用开发工程师（实习）', 150, 745, { font: font(F.zh, 26, 500), fill: 'rgba(241,238,230,.6)', ls: 4, a: seg(lt, .7, 1) });
  const y = 840, x0 = 150, x1 = 1770, p = easeOut(seg(lt, .4, 1.9));
  line([[x0, y], [x1, y]], 'rgba(241,238,230,.25)', 1.5, seg(lt, .3, .5)); line([[x0, y], [lerp(x0, x1, p), y]], K.lime, 3, seg(lt, .3, .5));
  circle(lerp(x0, x1, p), y, 8, { fill: K.lime, a: seg(lt, .3, .5) });
  txt('2026.07', x0, y - 18, { font: font(F.mono, 18, 700), fill: K.cream, ls: 3, a: seg(lt, .4, .6) });
  txt('2026.09', x1, y - 18, { font: font(F.mono, 18, 700), fill: K.cream, ls: 3, align: 'right', a: seg(lt, 1.4, 1.7) });
  txt('AI APPLICATION ENGINEER · INTERN', (x0 + x1) / 2, y - 18, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.75)', ls: 4, align: 'center', a: seg(lt, .8, 1) });
  MSHUD(t, { tl: '01 / MICROSOFT CLOUD & AI', bl: sec(1, 'FOCUS'), br: 'AZURE · PHI-3 · SEMANTIC KERNEL · AUTOGEN' });
  glitchIn(lt, 61, .18, .7);
}
function sM1a(t) {
  bg(K.lime); const lt = t - S.m1a;
  [['CALL', 230, 390], ['THE RIGHT', 118, 530], ['TOOL.', 230, 760]].forEach(([w, s, y], li) => dropWord(w, 140, y, font(F.cond, s), S.m1a + li * .12, t, { fill: K.ink, fall: 120 }));
  const X0 = 1000, Y0 = 240, TS = 118, G = 16;
  const tp = j => [X0 + (j % 6) * (TS + G), Y0 + Math.floor(j / 6) * (TS + G)];
  const routed = 6, rk = seg(t, Hh.route, Hh.route + .2);
  // prompt chip → routed tool
  const pc = [1000, 870], [rx, ry] = tp(routed);
  if (rk > 0) { const e = easeOut(seg(t, Hh.route - .2, Hh.route + .15)); line([[pc[0] + 150, pc[1] - 20], [lerp(pc[0] + 150, rx + TS / 2, e), lerp(pc[1] - 20, ry + TS / 2, e)]], K.ink, 3); }
  for (let j = 0; j < 24; j++) {
    const k = seg(t, Hh.tiles + j * .035, Hh.tiles + j * .035 + .2); if (k <= 0) continue;
    const [x, y] = tp(j), on = j === routed && rk > 0, h = TS * easeOut(k);
    rrect(x, y + (TS - h) / 2, TS, h, 6, { fill: on ? K.cream : K.ink });
    if (k > .7) {
      txt('T' + pad2(j + 1), x + 12, y + 28, { font: font(F.mono, 17, 700), fill: on ? K.ink : 'rgba(241,238,230,.75)', ls: 1.5 });
      txt('{ }', x + TS / 2, y + TS / 2 + 26, { font: font(F.mono, 34, 700), fill: on ? K.blue : K.lime, align: 'center', a: .9 });
    }
  }
  if (rk > 0) { const [x, y] = tp(routed); rrect(x - 6, y - 6, TS + 12, TS + 12, 10, { stroke: K.ink, lw: 3, a: rk }); }
  chip('PROMPT · 中 / EN', pc[0], pc[1], { k: seg(t, Hh.route - .5, Hh.route - .25), bg: K.ink, fg: K.lime });
  txt('24 AZURE REST API TOOLS', X0, Y0 + 4 * (TS + G) + 20, { font: font(F.mono, 19, 700), fill: K.ink, ls: 3, a: seg(lt, .8, 1) });
  MSHUD(t, { dark: false, tl: '01.1 / TOOL-CALLING EVAL', bl: sec(1, 'TOOL CALLING'), br: 'LOCAL PHI-3 · AZURE RESOURCE MANAGEMENT', zh: '工具调用评测体系 · 320 条中英文测试指令', zhRight: true, brackets: false });
  glitchIn(lt, 71);
}
function sM1b(t) {
  bg(K.ink); const lt = t - S.m1b;
  dropWord('SIX WAYS TO', 140, 300, font(F.cond, 150), S.m1b, t, { fall: 140 });
  dropWord('BE WRONG.', 140, 450, font(F.cond, 150), S.m1b + .12, t, { fall: 140, fillAt: i => i >= 3 ? K.lime : K.cream });
  const dims = ['JSON VALIDITY', 'TOOL ROUTING', 'PARAM EXTRACTION', 'SCHEMA VALIDITY', 'FIELD F1', 'EXACT MATCH'];
  const cols = 64, cx0 = 620, cx1 = 1780, pitch = (cx1 - cx0) / (cols - 1), ry0 = 560, rp = 62;
  const p = seg(t, Hh.scan, Hh.scan + 1.5), head = p * cols;
  dims.forEach((d, r) => {
    const y = ry0 + r * rp, k = seg(lt, .15 + r * .05, .35 + r * .05);
    txt(d, 140, y + 7, { font: font(F.mono, 20, 700), fill: K.cream, ls: 2.5, a: k });
    for (let c = 0; c < cols; c++) {
      const x = cx0 + c * pitch, lit = c < head - r * .6, isHead = Math.abs(c - (head - r * .6)) < 1;
      circle(x, y, isHead ? 6.5 : 4.5, { fill: isHead ? K.lime : lit ? 'rgba(241,238,230,.85)' : 'rgba(241,238,230,.14)', a: k });
    }
  });
  if (p > 0 && p < 1) line([[cx0 + head * pitch, ry0 - 40], [cx0 + head * pitch, ry0 + 5 * rp + 30]], K.lime, 2, .6);
  const n = Math.round(1920 * p);
  txt(String(n).padStart(4, '0'), 1780, 430, { font: font(F.cond, 190), fill: K.lime, align: 'right' });
  txt('CHECKS · 320 PROMPTS × 6 DIMENSIONS', 1780, 478, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.7)', ls: 2.5, align: 'right' });
  MSHUD(t, { tl: '01.2 / EVALUATION MATRIX', bl: sec(1, 'MEASURE FIRST'), br: 'EACH DOT = 5 PROMPTS', zh: '6 维评测矩阵', zhRight: true });
  glitchIn(lt, 81);
}
function sM1c(t) {
  bg(K.cream); const lt = t - S.m1c;
  dropWord('CONSTRAIN', 140, 360, font(F.cond, 170), S.m1c, t, { fill: K.ink, fall: 140 });
  dropWord('THE DECODER.', 140, 540, font(F.cond, 170), S.m1c + .12, t, { fill: K.ink, fall: 140, fillAt: i => i >= 4 ? K.blue : K.ink });
  txt('TARGET: PARAMETER HALLUCINATION', 146, 620, { font: font(F.mono, 20, 700), fill: K.ink, ls: 2.5, a: seg(lt, .4, .6) });
  txt('+ MULTI-TOOL CONFUSION', 146, 654, { font: font(F.mono, 20, 700), fill: K.mid, ls: 2.5, a: seg(lt, .5, .7) });
  // code panel: JSON typed under a schema; the next-token candidates, masked
  const px = 1010, py = 210, pw = 770, ph = 560;
  rrect(px, py, pw, ph, 14, { fill: K.ink, a: seg(lt, 0, .15) });
  for (let i = 0; i < 3; i++) circle(px + 28 + i * 22, py + 28, 6, { fill: ['#E8412F', '#DDF53D', '#8B908A'][i], a: seg(lt, .05, .2) });
  txt('guided_decoding.json', px + pw - 24, py + 34, { font: font(F.mono, 16, 500), fill: 'rgba(241,238,230,.45)', align: 'right', ls: 1 });
  const code = ['{', '  "tool": "T07",', '  "arguments": {', '    "param_1": "…",', '    "param_2": 3', '  }', '}'];
  const total = code.join('\n').length, shown = Math.floor(total * seg(t, Hh.type, Hh.type + 1.25));
  let used = 0, cur = [px + 40, py + 100];
  code.forEach((ln, i) => {
    const y = py + 100 + i * 44, n = clamp(shown - used, 0, ln.length); used += ln.length + 1;
    if (n <= 0) return;
    const s = ln.slice(0, n), f = font(F.mono, 27, 500);
    // simple syntax colours: keys cream, strings lime, numbers/punct grey
    ctx.save(); ctx.font = f; let x = px + 40;
    for (const part of s.split(/("[^"]*"?)/)) { if (!part) continue; ctx.fillStyle = /^"/.test(part) ? (part.endsWith(':') || /":?$/.test(part) && s.indexOf(part + ':') >= 0 ? K.cream : K.lime) : 'rgba(241,238,230,.6)'; ctx.fillText(part, x, y); x += ctx.measureText(part).width; }
    ctx.restore(); cur = [x2(px + 40, s, f), y];
  });
  function x2(x, s, f) { return x + measure(s, f); }
  if (Math.floor(t * 4) % 2 === 0 || shown < total) rrect(cur[0] + 4, cur[1] - 26, 14, 32, 1, { fill: K.lime });
  // candidates popover
  const mk = seg(t, Hh.mask, Hh.mask + .2);
  if (mk > 0) {
    const bx = px + 40, by = py + 420;
    txt('NEXT-TOKEN CANDIDATES · MASKED BY SCHEMA', bx, by - 14, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.55)', ls: 2, a: mk });
    const cands = [['"T07"', .62, true], ['"T7"', .21, false], ['"tool_7"', .1, false], ['}', .07, false]];
    cands.forEach(([s, pr, ok], i) => {
      const x = bx + i * 172, kk = seg(t, Hh.mask + i * .06, Hh.mask + i * .06 + .2);
      rrect(x, by, 160, 74, 6, { fill: ok ? 'rgba(221,245,61,.14)' : 'rgba(232,65,47,.12)', stroke: ok ? K.lime : 'rgba(232,65,47,.7)', lw: 1.5, a: kk });
      txt(s, x + 14, by + 32, { font: font(F.mono, 22, 700), fill: ok ? K.lime : 'rgba(241,238,230,.5)', a: kk });
      rrect(x + 14, by + 48, 132 * pr * easeOut(kk), 8, 2, { fill: ok ? K.lime : 'rgba(241,238,230,.35)', a: kk });
      if (!ok && kk > .5) line([[x + 10, by + 24], [x + 150, by + 24]], K.red, 3, seg(kk, .5, 1));
    });
  }
  const tags = [['OUTLINES GUIDED DECODING', K.ink, K.lime], ['FEW-SHOT CoT', K.ink, K.cream], ['NEGATIVE-SAMPLE ALIGNMENT', K.ink, K.cream], ['ABLATIONS: PROMPT · #TOOLS · PARAM LENGTH', K.blue, K.cream]];
  let tx = 140; tags.forEach(([s, b, f], i) => { tx += chip(s, tx, 870, { k: seg(t, Hh.tags[i], Hh.tags[i] + .2), bg: b, fg: f }) + 14; });
  MSHUD(t, { dark: false, tl: '01.3 / FIXES', bl: sec(1, 'STRUCTURED OUTPUT'), br: 'SCHEMATIC · NOT REAL TOOL NAMES', zh: '引导式解码 · 少样本思维链 · 负样本对齐 · 消融实验', brackets: false });
  glitchIn(lt, 91);
}
function sM1d(t) {
  bg(K.lime); const lt = t - S.m1d;
  glShot(knot(t, { x: 2.75, y: -1.25, s: .45 }));
  const f = font(F.cond, 400), k = seg(t, Hh.flip, Hh.flip + .9);
  const xEnd = odometer(61, 87, k, 150, 660, f, K.ink);
  txt('%', xEnd + 10, 660, { font: f, fill: K.ink });
  txt(k < .01 ? 'BEFORE' : k < 1 ? '→' : 'AFTER', 160, 210, { font: font(F.mono, 24, 700), fill: K.ink, ls: 8 });
  txt('PHI-3 COMPLETE-CALL ACCURACY', 160, 750, { font: font(F.mono, 25, 700), fill: K.ink, ls: 5 });
  txt('24 TOOLS · 320 ZH/EN PROMPTS · 6-DIM MATRIX', 160, 794, { font: font(F.mono, 19, 500), fill: 'rgba(14,15,14,.7)', ls: 3 });
  const lk = seg(t, Hh.lat, Hh.lat + .25), bx = 1080, bw = 600;
  txt('−28%', bx, 400, { font: font(F.cond, 200), fill: K.ink, a: lk });
  txt('AVG INFERENCE LATENCY', bx + 6, 450, { font: font(F.mono, 20, 700), fill: K.ink, ls: 3, a: lk });
  const sh = easeOut(seg(t, Hh.lat, Hh.lat + .7));
  txt('BEFORE', bx, 520, { font: font(F.mono, 15, 700), fill: 'rgba(14,15,14,.6)', ls: 2, a: lk }); rrect(bx, 532, bw, 20, 2, { fill: 'rgba(14,15,14,.25)', a: lk });
  txt('AFTER', bx, 590, { font: font(F.mono, 15, 700), fill: 'rgba(14,15,14,.6)', ls: 2, a: lk }); rrect(bx, 602, bw * lerp(1, .72, sh), 20, 2, { fill: K.ink, a: lk });
  MSHUD(t, { dark: false, tl: '01.4 / RESULT', bl: sec(1, 'EVALUATION'), br: 'INTERNAL EVAL SET', zh: '完整调用准确率 61% → 87% · 平均推理延迟 −28%', brackets: false });
}
function sM2(t) {
  bg(K.ink); const lt = t - S.m2;
  dropWord('REASON. ACT.', 140, 290, font(F.cond, 170), S.m2, t, { fall: 150 });
  const wR = measure('REASON. ACT. ', font(F.cond, 170));
  dropWord('CITE.', 140 + wR, 290, font(F.cond, 170), S.m2 + .25, t, { fall: 150, fill: K.lime });
  const N = [['RETRIEVE', 330], ['READ', 790], ['ANSWER', 1250]], ny = 580, nw = 290, nh = 110;
  N.forEach(([s, x], i) => {
    const k = seg(t, Hh.nodes[i], Hh.nodes[i] + .25), act = i === 2 && t > Hh.hops[4];
    rrect(x - nw / 2, ny - nh / 2, nw, nh, 55, { fill: act ? K.lime : K.ink2, stroke: act ? K.lime : 'rgba(241,238,230,.8)', lw: 2, a: k });
    txt(s, x, ny + 14, { font: font(F.cond, 50), fill: act ? K.ink : K.cream, align: 'center', a: k, ls: 2 });
    if (i < 2) arrow(x + nw / 2 + 10, ny, N[i + 1][1] - nw / 2 - 12, ny, 'rgba(241,238,230,.8)', 2.5, seg(t, Hh.nodes[i + 1], Hh.nodes[i + 1] + .2));
  });
  // loop: READ → RETRIEVE ("need more evidence")
  const lk = seg(t, Hh.nodes[2] + .3, Hh.nodes[2] + .6);
  if (lk > 0) { ctx.save(); ctx.globalAlpha = lk; ctx.strokeStyle = 'rgba(221,245,61,.8)'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(790, ny - nh / 2 - 8); ctx.bezierCurveTo(740, 400, 380, 400, 330, ny - nh / 2 - 8); ctx.stroke(); ctx.restore(); arrow(345, ny - nh / 2 - 30, 330, ny - nh / 2 - 8, K.lime, 2.5, lk); txt('NEED MORE EVIDENCE', 560, 398, { font: font(F.mono, 16, 700), fill: K.lime, ls: 2, align: 'center', a: lk }); }
  // the token: RETRIEVE → READ → RETRIEVE → READ → ANSWER on the beat
  const path = [330, 790, 330, 790, 1250], hp = Hh.hops;
  if (t > hp[0] - .1) {
    let x = 330, y = ny;
    for (let i = 0; i < 4; i++) if (t >= hp[i]) { const k = ease(seg(t, hp[i], hp[i + 1] - .1)); x = lerp(path[i], path[i + 1], k); y = (i === 1) ? ny - nh / 2 - 8 - Math.sin(Math.PI * k) * 150 : ny; }
    const fa = 1 - seg(t, hp[4] - .15, hp[4]);
    circle(x, y, (14 + 6 * beatPulse(t)) * fa, { fill: K.lime }); circle(x, y, 30, { stroke: 'rgba(221,245,61,.4)', lw: 2, a: fa });
  }
  const guards = [['ARG VALIDATION', 560], ['DUP-CALL BLOCK', 1020], ['CITATION TRACE', 1250]];
  guards.forEach(([s, x], i) => { const w = measure(s, font(F.mono, 16, 700), 2) + 28; chip(s, x - w / 2, 700, { font: font(F.mono, 16, 700), k: seg(lt, 1.2 + i * .12, 1.4 + i * .12), bg: 'rgba(241,238,230,.1)', fg: K.cream, h: 34 }); });
  chip('BOUNDED RETRY', 180, 420, { font: font(F.mono, 16, 700), k: seg(lt, 1.6, 1.8), bg: 'rgba(221,245,61,.14)', fg: K.lime, h: 34 });
  [['85%', 'ANSWER ACCURACY'], ['92%', 'VALID CITATIONS'], ['95%', 'INVALID-OUTPUT RECOVERY']].forEach(([v, l], i) => stat(v, l, 1540, 470 + i * 150, { k: seg(t, Hh.stats2 + i * .15, Hh.stats2 + i * .15 + .25), size: 96, col: i === 1 ? K.lime : K.cream }));
  txt('SEMANTIC KERNEL · PHI-3 · LOCAL AZURE DOCS · 120 EVAL QUESTIONS', 140, 860, { font: font(F.mono, 19, 700), fill: 'rgba(241,238,230,.7)', ls: 2.5, a: seg(lt, .6, .9) });
  MSHUD(t, { tl: '01.5 / DOCUMENT REACT AGENT', bl: sec(1, 'AGENTS'), br: 'EXPLICIT STATE MACHINE', zh: '文档 ReAct 智能体 · 自主检索—文档读取—证据回答', zhRight: true });
  glitchIn(lt, 101);
}
function sM3(t) {
  bg(K.blue); const lt = t - S.m3;
  dropWord('PLAN. REVIEW.', 140, 290, font(F.cond, 170), S.m3, t, { fall: 150 });
  dropWord('REVISE.', 140 + measure('PLAN. REVIEW. ', font(F.cond, 170)), 290, font(F.cond, 170), S.m3 + .3, t, { fall: 150, fill: K.lime });
  const A = [520, 610], Bc = [1080, 610], R = 140, ck = backOut(seg(lt, .1, .5));
  circle(...A, R * ck, { fill: K.cream }); circle(...Bc, R * ck, { fill: K.ink });
  txt('PLANNER', A[0], A[1] + 16, { font: font(F.cond, 56), fill: K.blue, align: 'center', a: seg(lt, .3, .5) });
  txt('REVIEWER', Bc[0], Bc[1] + 16, { font: font(F.cond, 56), fill: K.cream, align: 'center', a: seg(lt, .3, .5) });
  // the round trip: an arc over (plan) and under (revise)
  const ak = seg(lt, .4, .7);
  if (ak > 0) {
    ctx.save(); ctx.globalAlpha = ak; ctx.strokeStyle = 'rgba(241,238,230,.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(A[0] + 60, A[1] - R); ctx.quadraticCurveTo(800, 380, Bc[0] - 60, Bc[1] - R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Bc[0] - 60, Bc[1] + R); ctx.quadraticCurveTo(800, 840, A[0] + 60, A[1] + R); ctx.stroke(); ctx.restore();
    arrow(Bc[0] - 90, Bc[1] - R - 16, Bc[0] - 60, Bc[1] - R, K.cream, 2.5, ak); arrow(A[0] + 90, A[1] + R + 16, A[0] + 60, A[1] + R, K.cream, 2.5, ak);
    txt('PLAN / RE-REVIEW', 800, 392, { font: font(F.mono, 16, 700), fill: K.cream, ls: 2, align: 'center', a: ak });
    txt('REVISE', 800, 838, { font: font(F.mono, 16, 700), fill: K.cream, ls: 2, align: 'center', a: ak });
  }
  // a packet makes one round trip per round
  const r0 = Hh.rounds[0];
  if (t > r0) {
    const ph = ((t - r0) % 1), top = ph < .5, q = ease(top ? ph * 2 : (ph - .5) * 2);
    const p0 = top ? [A[0] + 60, A[1] - R] : [Bc[0] - 60, Bc[1] + R], p1 = top ? [Bc[0] - 60, Bc[1] - R] : [A[0] + 60, A[1] + R], c = top ? [800, 380] : [800, 840];
    const x = (1 - q) * (1 - q) * p0[0] + 2 * (1 - q) * q * c[0] + q * q * p1[0], y = (1 - q) * (1 - q) * p0[1] + 2 * (1 - q) * q * c[1] + q * q * p1[1];
    rrect(x - 13, y - 13, 26, 26, 4, { fill: K.lime });
  }
  const rn = Hh.rounds.filter(r => t >= r).length;
  if (rn) { txt('ROUND ' + pad2(rn), 800, 625, { font: font(F.cond, 60), fill: K.lime, align: 'center' }); txt('BOUNDED', 800, 660, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.7)', ls: 4, align: 'center' }); }
  // 12 state-transition rules
  txt('12 STATE-TRANSITION RULES', 1400, 465, { font: font(F.mono, 17, 700), fill: K.cream, ls: 2.5, a: seg(lt, .8, 1) });
  for (let i = 0; i < 12; i++) {
    const x = 1400 + (i % 6) * 64, y = 490 + Math.floor(i / 6) * 64, on = t > Hh.rules + i * .125;
    rrect(x, y, 56, 52, 4, { fill: on ? K.lime : 'rgba(241,238,230,.12)', a: seg(lt, .8, 1) });
    txt('R' + pad2(i + 1), x + 28, y + 33, { font: font(F.mono, 16, 700), fill: on ? K.ink : 'rgba(241,238,230,.6)', align: 'center', a: seg(lt, .8, 1) });
  }
  txt('PYDANTIC DATA CONTRACTS', 1400, 650, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.7)', ls: 2.5, a: seg(lt, 1.2, 1.4) });
  stat('96%', 'STRUCTURED OUTPUT SUCCESS', 1400, 770, { k: seg(t, Hh.stats3, Hh.stats3 + .25), size: 92, col: K.lime, gap: 34 });
  stat('<60s', 'PER ARCHITECTURE PLAN', 1400, 900, { k: seg(t, Hh.stats3 + .15, Hh.stats3 + .4), size: 92, gap: 34 });
  txt('AUTOGEN · PHI-3 · VALIDATES RESOURCES, DEPENDENCIES & REVIEW ADOPTION', 140, 900, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.75)', ls: 2, a: seg(lt, 1, 1.3) });
  MSHUD(t, { tl: '01.6 / MULTI-AGENT ARCHITECTURE DESIGN', bl: sec(1, 'MULTI-AGENT'), br: 'AZURE ARCHITECTURE PLANS', zh: '多智能体 Azure 架构设计 · 规划—审查—修订—再审', zhRight: true });
  glitchIn(lt, 111);
}
function sM4(t) {
  bg(K.cream); const lt = t - S.m4;
  dropWord('INCIDENT', 140, 270, font(F.cond, 150), S.m4, t, { fill: K.ink, fall: 130 });
  const wi = measure('INCIDENT', font(F.cond, 150));
  arrow(140 + wi + 30, 222, 140 + wi + 30 + 150 * easeOut(seg(lt, .2, .45)), 222, K.ink, 12, 1, 36);
  dropWord('PLAN.', 140 + wi + 230, 270, font(F.cond, 150), S.m4 + .35, t, { fill: K.blue, fall: 130 });
  const st = ['STATUS FEEDS', 'RSS / ATOM', 'NORMALIZE', 'FINGERPRINT', 'LLM TRIAGE', 'SQLITE', 'REST API', 'DASHBOARD'];
  const sub = ['MICROSOFT PUBLIC', 'SAFE PARSING', 'SCHEMA', 'DEDUPE', 'SEVERITY · SCOPE', 'PERSIST', 'FASTAPI', '中文监控面板'];
  const bx = i => 100 + i * 220, by = 400, bw = 180, bh = 96;
  line([[100, by + bh / 2], [bx(7) + bw, by + bh / 2]], K.ink, 2, seg(lt, 0, .3));
  st.forEach((s, i) => {
    const k = seg(t, Hh.stages + i * .08, Hh.stages + i * .08 + .2), hot = i === 4, dd = i === 3;
    rrect(bx(i), by, bw, bh * easeOut(k), 8, { fill: hot ? K.lime : K.ink, stroke: dd ? K.red : null, lw: 3 });
    if (k > .7) { txt(s, bx(i) + bw / 2, by + 44, { font: font(F.mono, 17, 700), fill: hot ? K.ink : K.cream, ls: 1, align: 'center' }); txt(sub[i], bx(i) + bw / 2, by + 72, { font: i === 7 ? font(F.zh, 15, 500) : font(F.mono, 13, 700), fill: hot ? 'rgba(14,15,14,.7)' : 'rgba(241,238,230,.55)', ls: 1, align: 'center' }); }
  });
  // packets flow through; every 3rd is a duplicate and drops out at the fingerprint stage
  const dropX = bx(3) + bw / 2, v = 720;
  for (let i = 0; i < 18; i++) {
    const t0 = Hh.flow + i * .25; if (t < t0) continue;
    let x = 80 + (t - t0) * v, y = by + bh + 34, dup = i % 3 === 2, a = 1;
    if (dup && x > dropX) { const f = (t - (t0 + (dropX - 80) / v)); x = dropX + f * 40; y += 90 * f * f * 4; a = clamp(1 - f * 1.8); }
    if (x > bx(7) + bw) continue;
    rrect(x - 9, y - 9, 18, 18, 3, { fill: dup && x >= dropX ? K.red : K.ink, a });
  }
  txt('DUPLICATE → SKIPPED', dropX, by + bh + 120, { font: font(F.mono, 14, 700), fill: K.red, ls: 2, align: 'center', a: seg(lt, 1.6, 1.9) });
  // the assessment card
  const ck = seg(t, Hh.card, Hh.card + .3), cx = 1000, cy = 640, cw = 780, chh = 300;
  if (ck > 0) {
    line([[bx(4) + bw / 2, by + bh], [bx(4) + bw / 2, cy]], K.ink, 2, ck);
    rrect(cx, cy, cw, chh * easeOut(ck), 12, { fill: K.ink });
    if (ck > .8) {
      txt('INCIDENT ASSESSMENT · SCHEMA-VALIDATED', cx + 28, cy + 44, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.55)', ls: 2 });
      [['SEVERITY', .35], ['CONFIDENCE', .55], ['IMPACT SCOPE', .75]].forEach(([s, w], i) => { const kk = seg(t, Hh.card + .2 + i * .15, Hh.card + .5 + i * .15); txt(s, cx + 28, cy + 96 + i * 50, { font: font(F.mono, 18, 700), fill: K.cream, ls: 2 }); rrect(cx + 260, cy + 80 + i * 50, 440 * w * easeOut(kk), 22, 2, { fill: i === 0 ? K.lime : 'rgba(241,238,230,.75)' }); });
      txt('RESPONSE PLAN', cx + 28, cy + 262, { font: font(F.mono, 18, 700), fill: K.cream, ls: 2 });
      for (let j = 0; j < 6; j++) { const on = t > Hh.card + .7 + j * .12; rrect(cx + 260 + j * 76, cy + 240, 66, 34, 4, { fill: on ? K.lime : 'rgba(241,238,230,.15)' }); txt('§' + (j + 1), cx + 293 + j * 76, cy + 263, { font: font(F.mono, 16, 700), fill: on ? K.ink : 'rgba(241,238,230,.6)', align: 'center' }); }
    }
  }
  stat('98%', 'STRUCTURED OUTPUT VALID', 140, 790, { k: seg(t, Hh.stats4, Hh.stats4 + .25), size: 120, col: K.ink, sub: 'rgba(14,15,14,.7)' });
  stat('91%', 'TRIAGE ACCURACY', 520, 790, { k: seg(t, Hh.stats4 + .15, Hh.stats4 + .4), size: 120, col: K.blue, sub: 'rgba(14,15,14,.7)' });
  txt('200-EVENT EVAL · LLM + FASTAPI + SQLITE', 144, 880, { font: font(F.mono, 17, 700), fill: 'rgba(14,15,14,.6)', ls: 2.5, a: seg(t, Hh.stats4 + .3, Hh.stats4 + .5) });
  MSHUD(t, { dark: false, tl: '01.7 / INCIDENT RESPONSE AGENT', bl: sec(1, 'PIPELINES'), br: 'SEVERITY · CONFIDENCE · IMPACT · 6-PART PLAN', zh: '事件响应智能体', zhRight: true, brackets: false });
  glitchIn(lt, 121);
}
function sM5(t) {
  bg(K.ink); const lt = t - S.m5;
  dropWord('FAIL', 140, 390, font(F.cond, 260), S.m5, t, { fall: 200 });
  dropWord('SAFE.', 140, 640, font(F.cond, 260), S.m5 + .15, t, { fall: 200, fill: K.lime });
  // error map
  const ex = 760; txt('ERROR MAP', ex, 300, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.55)', ls: 3, a: seg(lt, .2, .4) });
  ['TIMEOUT', 'RATE LIMIT', 'AUTH', 'INVALID OUTPUT'].forEach((s, i) => {
    const k = seg(t, Hh.rows[i], Hh.rows[i] + .2), y = 380 + i * 80;
    txt(s, ex, y, { font: font(F.cond, 50), fill: K.cream, a: k });
    arrow(ex + 345, y - 16, ex + 345 + 70 * easeOut(k), y - 16, K.lime, 2.5, k);
    if (k > .6) line([[ex + 440, y - 18], [ex + 450, y - 6], [ex + 470, y - 30]], K.lime, 4, seg(k, .6, 1));
  });
  let cx = ex; ['ERROR MAPPING', 'BOUNDED RETRY', 'SAFE DEGRADE'].forEach((s, i) => { cx += chip(s, cx, 700, { font: font(F.mono, 15, 700), k: seg(t, Hh.rows[3] + .3 + i * .12, Hh.rows[3] + .5 + i * .12), bg: 'rgba(221,245,61,.14)', fg: K.lime, h: 34 }) + 10; });
  // test runner: 329 python + 5 node
  const gx = 1320, gy = 300, cols = 23, pit = 20, N = 334, p = seg(t, Hh.tests, Hh.tests + 2), done = Math.floor(N * p);
  txt('TEST RUNNER', gx, gy - 24, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.55)', ls: 3, a: seg(lt, .2, .4) });
  for (let i = 0; i < N; i++) { const x = gx + (i % cols) * pit, y = gy + Math.floor(i / cols) * pit; rrect(x, y, 15, 15, 2, { fill: i < done ? (i >= 329 ? K.cream : K.lime) : 'rgba(241,238,230,.12)', a: seg(lt, .2, .4) }); }
  const ty = gy + Math.ceil(N / cols) * pit + 70;
  txt(`${Math.min(done, 329)} + ${Math.max(0, done - 329)} / 334 PASSED`, gx, ty, { font: font(F.cond, 56), fill: done >= N ? K.lime : K.cream, a: seg(lt, .3, .5) });
  txt('PYTHON · NODE.JS · 100% PASS', gx, ty + 36, { font: font(F.mono, 16, 700), fill: 'rgba(241,238,230,.6)', ls: 2.5, a: seg(lt, .3, .5) });
  stat('97%', 'REQUEST RECOVERY', 140, 830, { k: seg(t, Hh.stats5, Hh.stats5 + .25), size: 110, col: K.lime });
  stat('−72%', 'REPEAT MODEL CALLS', 440, 830, { k: seg(t, Hh.stats5 + .15, Hh.stats5 + .4), size: 110 });
  txt('JSON SCHEMA + PYDANTIC DUAL VALIDATION · EVENT-ID CONSISTENCY · LOG REDACTION · SECRET ISOLATION', 144, 935, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.5)', ls: 1.5, a: seg(lt, 1, 1.3) });
  MSHUD(t, { tl: '01.8 / RELIABILITY & QA', bl: sec(1, 'RELIABILITY'), br: 'STABLE IDS + CONTENT FINGERPRINTS → SKIP UNCHANGED', zh: '可靠性与质量保障', zhRight: false, progress: true });
  glitchIn(lt, 131);
}
function sMsEnd(t) {
  bg(K.cream); const lt = t - S.msEnd, k = seg(t, Hh.tapes, Hh.tapes + .5);
  txt('01', 90, 590, { font: font(F.cond, 560), fill: K.lime, a: seg(lt, 0, .3) });
  txt('01', 90, 590, { font: font(F.cond, 560), fill: null, stroke: K.ink, lw: 3, a: seg(lt, 0, .3) });
  const fast = 1 + 3 * easeIn(seg(t, Hh.tapeGlitch, S.thy));
  tape(t * fast, 470, -.13, K.ink, K.cream, ['EVAL-DRIVEN', 'SCHEMA-FIRST', 'FAIL-SAFE'], 260, -1, k);
  tape(t * fast, 640, .07, K.lime, K.ink, ['PHI-3', 'SEMANTIC KERNEL', 'AUTOGEN', 'FASTAPI'], 300, 1, seg(t, Hh.tapes + .15, Hh.tapes + .65));
  MSHUD(t, { dark: false, tl: '01 / MICROSOFT CLOUD & AI — RECAP', bl: 'EVERY CHANGE BACKED BY AN EVAL', br: 'FIVE SYSTEMS · ONE SUMMER', zh: '以评测驱动迭代，而不是凭感觉', brackets: false });
  if (t > Hh.tapeGlitch) { const g = seg(t, Hh.tapeGlitch, S.thy); FX.slice = g * .9; FX.split = .012 * g; FX.seed = Math.floor(t * FPS); }
}

// ---------- 02 UW SURGERY · 03 PROJECTS ----------
function sThy(t) {
  const lt = t - S.thy, st = seg(t, Hh.strips, S.proj);
  glShot(liquid(t, { zoom: 1.5, seed: 9, strips: st > 0 ? 18 : 0, stripAmt: easeIn(st) * 2.5 }));
  const words = ['Cite it', '—', 'or abstain.'], f = `italic 124px ${F.serif}`;
  const total = measure(words.join(' '), f); let x = W / 2 - total / 2;
  words.forEach((wd, i) => { const k = seg(t, Hh.thyWords[i], Hh.thyWords[i] + .3); txt(wd, x, H / 2 + 20 + (1 - easeOut(k)) * 30, { font: f, fill: K.cream, a: k, glow: 'rgba(14,15,40,.35)', glowR: 20 }); x += measure(wd + ' ', f); });
  txt('THYROID CANCER AI SUPPORT · CLINICAL RAG · GROUNDED GENERATION · SAFETY EVAL · $69K FUNDED', W / 2, H / 2 + 110, { font: font(F.mono, 19, 700), fill: K.cream, ls: 2.5, align: 'center', a: seg(lt, 1, 1.3) });
  txt('引用来源，或者拒答', W / 2, H / 2 + 170, { font: font(F.zh, 28, 500), fill: 'rgba(241,238,230,.85)', ls: 12, align: 'center', a: seg(lt, 1.2, 1.5) });
  hud(t, { tl: '02 / UW–MADISON DEPARTMENT OF SURGERY', tr: 'NOW · LEAD AI ENGINEER', bl: sec(2, 'CLINICAL AI'), br: 'IN DEVELOPMENT · NOT YET PATIENT-VALIDATED' });
  glitchIn(lt, 141, .12, .6);
}
function sProj(t) {
  bg(K.cream); const lt = t - S.proj;
  const rows = [
    { w: 'TRIAGE.', y: 400, t0: Hh.projRows[0], h: 'MULTI-AGENT PRE-CONSULTATION', a: 'LANGGRAPH · SUPERVISOR + REACT SUBGRAPHS · HITL', b: '5 AGENT ROLES · RULE + LLM RED-FLAG CHECK', s: '96%+ EMERGENCY RECALL · ~180 CASES' },
    { w: 'RETRIEVE.', y: 760, t0: Hh.projRows[1], h: 'ENTERPRISE RAG ASSISTANT', a: 'BM25 + QWEN3 DENSE → RRF FUSION', b: 'CASCADE RERANK: TOP-50 → TOP-10', s: '93% ROUTING · +18% RECALL@10' },
  ];
  rows.forEach(r => {
    dropWord(r.w, 140, r.y, font(F.cond, 220), r.t0, t, { fill: K.ink, fall: 180 });
    const k = seg(t, r.t0 + .3, r.t0 + .55), x = 1100;
    txt(r.h, x, r.y - 150, { font: font(F.mono, 22, 700), fill: K.ink, ls: 3, a: k });
    txt(r.a, x, r.y - 108, { font: font(F.mono, 17, 700), fill: K.mid, ls: 1.5, a: seg(t, r.t0 + .4, r.t0 + .6) });
    txt(r.b, x, r.y - 78, { font: font(F.mono, 17, 700), fill: K.mid, ls: 1.5, a: seg(t, r.t0 + .5, r.t0 + .7) });
    chip(r.s, x, r.y - 22, { k: seg(t, r.t0 + .6, r.t0 + .85), bg: K.ink, fg: K.lime, font: font(F.mono, 18, 700) });
  });
  line([[140, 540], [1780, 540]], 'rgba(14,15,14,.25)', 1.5, seg(lt, .2, .5));
  hud(t, { dark: false, tl: '03 / INDEPENDENT PROJECTS', tr: tc(t), bl: sec(3, 'PROJECTS'), br: 'SELF-BUILT EVAL SETS · DECISION SUPPORT ONLY', zh: '独立项目 · 自建评测集', zhRight: false, brackets: false });
  glitchIn(lt, 151);
}
function sEnd2(t) {
  sEnd(t);
  const lt = t - S.end;
  if (t < Hh.endDot) txt('MICROSOFT CLOUD & AI ’26 · UW SURGERY · UW–MADISON CS ’27', 140, 960, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.55)', ls: 3, a: seg(lt, 1.2, 1.5) });
}

const SCENES = [[S.boot, sBoot], [S.every, sEvery], [S.needs, sNeeds], [S.evid, sEvid], [S.name, sName],
  [S.ms0, sMs0], [S.m1a, sM1a], [S.m1b, sM1b], [S.m1c, sM1c], [S.m1d, sM1d], [S.m2, sM2], [S.m3, sM3], [S.m4, sM4], [S.m5, sM5], [S.msEnd, sMsEnd],
  [S.thy, sThy], [S.proj, sProj], [S.end, sEnd2]];
function frame(t) {
  FX = { split: 0, slice: 0, seed: 0, grain: .05, vign: .28, flash: 0, flashCol: '#ffffff' };
  let i = 0; while (i + 1 < SCENES.length && t >= SCENES[i + 1][0]) i++;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  SCENES[i][1](t);
  // a one-frame white flash on every hard cut, very subtle
  const cut = SCENES.find(([s]) => s > 0 && t >= s && t < s + 1 / FPS); if (cut) FX.flash = Math.max(FX.flash, .08);
  post(t, FX);
}

// ---------- render contract ----------
const fontsReady = Promise.all([
  document.fonts.load('100px "Anton"'), document.fonts.load('100px "Archivo Black"'), document.fonts.load('italic 100px "Instrument Serif"'),
  document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"'),
  document.fonts.load('500 20px "Noto Sans SC"', '不与业个中主习事云交人代令以件企体作依保修做具再决准凭划动助医即发取可品响喆回均处多完实审宸对导少尚工师平应延建开式引微思急性患感或手拒持指据排控推支整文断方旗是智未本条来板构架查样档检每测涂消源状独率理生用由甲症癌监目矩码研确程立端答策算系索红级统维者而能腺自英融行要规觉解计订设证评诊试读调负质路转软进迟迭部都重量链问阵障集需靠面项预驱验齐（），'),
  document.fonts.load('700 20px "Noto Sans SC"', '不与业个中主习事云交人代令以件企体作依保修做具再决准凭划动助医即发取可品响喆回均处多完实审宸对导少尚工师平应延建开式引微思急性患感或手拒持指据排控推支整文断方旗是智未本条来板构架查样档检每测涂消源状独率理生用由甲症癌监目矩码研确程立端答策算系索红级统维者而能腺自英融行要规觉解计订设证评诊试读调负质路转软进迟迭部都重量链问阵障集需靠面项预驱验齐（），'),
]);
window.renderAt = async (t, type = 'image/png', q = .92) => { frame(t); return out.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null) => {
  const [, , cw, ch] = crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); frame(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h, [cx, cy] = crop || [0, 0];
    c.drawImage(out, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => { const gl = RA.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); };
fontsReady.then(() => {
  window.ready = true;
  if (!location.search.includes('render')) {
    const s = document.getElementById('scrub'), lab = document.getElementById('tt');
    const go = () => { const t0 = performance.now(); frame(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
    s.addEventListener('input', go); s.value = new URLSearchParams(location.search).get('t') || 0; go();
  }
});
