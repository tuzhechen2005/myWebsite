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
const sec = (i, name) => `■ ${String(i).padStart(2, '0')} / 05   ${name}`;
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
function sRag1(t) {
  bg(K.cream); const lt = t - S.rag1, f = font(F.cond, 214), X = 150;
  const words = ['ROUTE.', 'RETRIEVE.', 'RERANK.'], tags = ['DOCS ↔ SQL', 'BM25 + VECTOR', 'QWEN3-RERANKER'];
  words.forEach((wd, li) => {
    const t0 = Hh.rag[li], y = 400 + li * 215;
    const w = letters(wd, X, y, { font: f, fill: K.ink }, (i, n) => {
      const k = seg(t, t0 + i * .035, t0 + i * .035 + .32), e = backOut(k);
      return { dy: (1 - e) * -260, r: (1 - e) * (hash(li * 9 + i) - .5) * .9, a: k > 0 ? 1 : 0, fill: k < .6 ? K.mid : K.ink };
    });
    const tk = seg(t, Hh.ragTags + li * .12, Hh.ragTags + li * .12 + .25);
    if (tk > 0) { const tw = measure(tags[li], font(F.mono, 20, 700), 2) + 34, x = X + w + 30, yy = y - 64; ctx.save(); ctx.globalAlpha = tk; ctx.fillStyle = li === 1 ? K.lime : K.ink; ctx.fillRect(x, yy - 26 + (1 - easeOut(tk)) * 20, tw * easeOut(tk), 40); ctx.restore(); txt(tags[li], x + 17, yy + (1 - easeOut(tk)) * 20, { font: font(F.mono, 20, 700), fill: li === 1 ? K.ink : K.cream, ls: 2, a: seg(tk, .5, 1) }); }
  });
  const k = backOut(seg(t, S.rag1 + .25, S.rag1 + .6)), cx = 1500, cy = 520;
  circle(cx, cy, 200 * k, { fill: K.lime });
  jelly(cx, cy - 10, 92 * k, K.ink, t, seg(t, S.rag1 + .4, S.rag1 + 1.1), .06 * Math.sin(t * 2));
  line([[1770, 300], [1770, 740]], K.ink, 1.5, seg(lt, .3, .6)); circle(1770, 520, 6, { fill: K.ink, a: seg(lt, .5, .7) });
  hud(t, { dark: false, tl: '01 / ENTERPRISE RAG ASSISTANT', tr: 'NO. 01 — 2025.05–09 · SOLO', bl: 'BM25 + QWEN3 EMBEDDING + CASCADE RERANK', br: 'TEXT-TO-SQL · ACCESS CONTROL · SQL SAFETY', zh: '企业级 RAG 智能助手', zhRight: true, brackets: false, k: seg(lt, 0, .4) });
}
function sRag2(t) {
  bg(K.ink); const lt = t - S.rag2;
  const liq = liquid(t, { zoom: 2.2, seed: 3 });
  // bars filled with the liquid texture, plus a red curve
  const n = 17, x0 = 150, bw = 44, gap = 14, base = 860;
  ctx.save(); ctx.beginPath();
  const tops = [];
  for (let i = 0; i < n; i++) {
    const hgt = (220 + 330 * (.5 + .5 * Math.sin(i * .55 + 1)) * (.7 + .3 * hash(i))) * expoOut(seg(lt, .05 + i * .03, .6 + i * .03)) * (1 + .04 * Math.sin(t * 3 + i));
    const x = x0 + i * (bw + gap); ctx.rect(x, base - hgt, bw, hgt); tops.push([x + bw / 2, base - hgt]);
  }
  ctx.clip(); ctx.drawImage(liq, 0, 0, W, H); ctx.restore();
  const cp = expoOut(seg(lt, .4, 1.6)), m = Math.max(2, Math.floor(cp * tops.length));
  line(tops.slice(0, m).map(([x, y], i) => [x, y - 40 - 60 * Math.sin(i * .4)]), K.red, 3);
  line([[x0 - 20, base + 2], [x0 + n * (bw + gap), base + 2]], 'rgba(241,238,230,.5)', 1.5);
  txt('FIG. 01.1 — ROUTING ON THE PROJECT TEST SET', x0, 250, { font: font(F.mono, 17, 500), fill: 'rgba(241,238,230,.7)', ls: 2.5 });
  // counters
  const rx = 1250;
  line([[rx - 40, 230], [rx - 40, 860]], 'rgba(241,238,230,.2)', 1);
  txt(String(count(t, Hh.count1, Hh.count1 + 1, 0, 93)).padStart(2, '0') + '%', rx, 420, { font: font(F.cond, 190), fill: K.cream });
  txt('RETRIEVAL ROUTING ACCURACY', rx + 6, 470, { font: font(F.mono, 18, 700), fill: K.lime, ls: 3, a: seg(t, Hh.count1, Hh.count1 + .3) });
  const k2 = seg(t, Hh.count2, Hh.count2 + .3);
  txt('+' + count(t, Hh.count2, Hh.count2 + .8, 0, 18) + '%', rx, 660, { font: font(F.cond, 150), fill: K.lime, a: k2 });
  txt('RECALL@10 · COMPLEX QUERIES', rx + 6, 705, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.8)', ls: 3, a: k2 });
  // easing curve panel
  const px = 1600, py = 520, pw = 200, ph = 150, e = seg(lt, .6, 1.8);
  ctx.strokeStyle = 'rgba(241,238,230,.35)'; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
  const cur = []; for (let i = 0; i <= 40 * e; i++) { const q = i / 40; cur.push([px + q * pw, py + ph - ease(q) * ph]); }
  if (cur.length > 1) line(cur, K.cream, 2);
  txt('EASE — CASCADE RERANK', px, py - 14, { font: font(F.mono, 13, 500), fill: 'rgba(241,238,230,.55)', ls: 2 });
  hud(t, { tl: '01 / ENTERPRISE RAG ASSISTANT', tr: tc(t), bl: sec(1, 'RETRIEVAL'), br: 'PROJECT TEST SET · SELF-BUILT', zh: '检索路由与重排', zhRight: true });
  // diagonal wipe out
  const wk = seg(t, Hh.wipe, S.tri1 + .01);
  if (wk > 0) { ctx.save(); ctx.fillStyle = K.lime; ctx.beginPath(); const x = lerp(-900, W + 200, easeIn(wk)); ctx.moveTo(x, 0); ctx.lineTo(x + 700, 0); ctx.lineTo(x + 300, H); ctx.lineTo(x - 400, H); ctx.fill(); ctx.fillStyle = K.ink; ctx.beginPath(); ctx.moveTo(x - 900, 0); ctx.lineTo(x, 0); ctx.lineTo(x - 400, H); ctx.lineTo(x - 1300, H); ctx.fill(); ctx.restore(); }
}
function tunnel(t, cx, cy, spin, col2) {
  ctx.save(); ctx.translate(cx, cy);
  const n = 16;
  for (let i = n; i >= 0; i--) {
    const q = (i + (t * .9) % 1) / n, s = Math.pow(q, 1.6) * 1500 + 40, a = spin + Math.sin(t * .8) * .35 * q + i * .045 * Math.sin(t * .5);
    ctx.save(); ctx.rotate(a); ctx.strokeStyle = i % 3 === 0 ? col2 : 'rgba(241,238,230,.9)'; ctx.lineWidth = 2.5 + q * 3; ctx.globalAlpha = clamp(q * 3);
    ctx.strokeRect(-s * 1.2, -s * .7, s * 2.4, s * 1.4); ctx.restore();
  }
  ctx.restore();
}
function sTri1(t) {
  bg(K.ink); const lt = t - S.tri1;
  tunnel(t, W / 2, H / 2, -.08 + lt * .05, K.lime);
  const R = 250 * backOut(seg(lt, 0, .4));
  circle(W / 2, H / 2, R, { fill: K.ink, stroke: 'rgba(241,238,230,.6)', lw: 2 });
  if (lt > .15) {
    letters('FIVE', W / 2, H / 2 - 40, { font: font(F.cond, 150), align: 'center', fill: K.cream }, i => ({ dy: (1 - backOut(seg(lt, .15 + i * .04, .45 + i * .04))) * 60, a: seg(lt, .15 + i * .04, .25 + i * .04) }));
    txt('A G E N T S', W / 2, H / 2 + 12, { font: font(F.mono, 26, 700), fill: K.lime, align: 'center', ls: 4, a: seg(lt, .35, .5) });
    letters('ONE CASE', W / 2, H / 2 + 130, { font: font(F.cond, 110), align: 'center', fill: K.cream }, i => ({ dy: (1 - backOut(seg(lt, .4 + i * .03, .7 + i * .03))) * 60, a: seg(lt, .4 + i * .03, .5 + i * .03) }));
  }
  const roles = ['COORDINATOR', 'INTAKE', 'RETRIEVAL', 'TRIAGE', 'GUARDRAILS'];
  roles.forEach((r, i) => {
    const k = seg(t, Hh.roles[i], Hh.roles[i] + .25); if (k <= 0) return;
    const a = -Math.PI / 2 + i * TAU / 5 + lt * .12, x = W / 2 + Math.cos(a) * 330, y = H / 2 + Math.sin(a) * 300;
    circle(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R, 6, { fill: K.lime, a: k });
    line([[W / 2 + Math.cos(a) * (R + 8), H / 2 + Math.sin(a) * (R + 8)], [lerp(W / 2 + Math.cos(a) * R, x, easeOut(k)), lerp(H / 2 + Math.sin(a) * R, y, easeOut(k))]], K.lime, 1.5, k);
    const w = measure(r, font(F.mono, 19, 700), 3) + 26, bx = x + (Math.cos(a) < -.2 ? -w : Math.cos(a) > .2 ? 0 : -w / 2);
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = i === 4 ? K.lime : K.cream; ctx.fillRect(bx, y - 20, w, 38); ctx.restore();
    txt(r, bx + 13, y + 7, { font: font(F.mono, 19, 700), fill: K.ink, ls: 3, a: k });
  });
  hud(t, { tl: '02 / MULTI-AGENT PRE-CONSULTATION & TRIAGE', tr: 'NO. 02 — 2026.01– · SOLO', bl: 'LANGGRAPH · FUNCTION CALLING · HITL', br: '→ INTO THE CASE', zh: '多智能体预问诊与导诊', zhRight: true });
  if (lt < .15) { FX.slice = .6 * (1 - lt / .15); FX.seed = 21; }
}
function sTri2(t) {
  const lt = t - S.tri2, sh = (hash(Math.floor(t * FPS)) - .5) * 26 * (1 - seg(lt, 0, .6));
  bg(K.red);
  for (let i = -2; i < 12; i++) { ctx.save(); ctx.fillStyle = 'rgba(14,15,14,.12)'; ctx.translate(i * 220 + (lt * 400) % 220, 0); ctx.transform(1, 0, -.5, 1, 0, 0); ctx.fillRect(0, 0, 90, H); ctx.restore(); }
  ctx.save(); ctx.translate(sh, sh * .5);
  letters('RED FLAG', W / 2, H / 2 + 110, { font: font(F.cond, 330), align: 'center', fill: K.ink }, i => ({ s: backOut(seg(lt, i * .02, .2 + i * .02)), a: seg(lt, i * .02, .05 + i * .02) }));
  ctx.restore();
  txt('→ ESCALATE TO A CLINICIAN', W / 2, H / 2 + 220, { font: font(F.mono, 30, 700), fill: K.ink, ls: 6, align: 'center', a: seg(lt, .25, .4) });
  txt('急症红旗 · 立即转交医生', W / 2, H / 2 + 280, { font: font(F.zh, 26, 700), fill: 'rgba(14,15,14,.75)', ls: 8, align: 'center', a: seg(lt, .35, .5) });
  hud(t, { dark: false, tl: '02 / SAFETY GUARDRAILS', tr: tc(t), bl: sec(2, 'HUMAN IN THE LOOP'), br: 'OUT-OF-SCOPE REFUSAL · RE-CHECKS' });
  if (lt < .12) { FX.split = .01 * (1 - lt / .12); FX.slice = .5 * (1 - lt / .12); FX.seed = 31; }
}
function sTri3(t) {
  bg(K.ink); const lt = t - S.tri3;
  txt(String(count(t, S.tri3, S.tri3 + .9, 0, 96)) + '%', 150, 620, { font: font(F.cond, 400), fill: K.lime });
  const w = measure(count(t, S.tri3, S.tri3 + .9, 0, 96) + '%', font(F.cond, 400));
  txt('+', 150 + w + 10, 360, { font: font(F.cond, 200), fill: K.lime, a: seg(lt, .8, 1) });
  txt('EMERGENCY RECALL', 158, 690, { font: font(F.mono, 26, 700), fill: K.cream, ls: 6, a: seg(lt, .2, .4) });
  const stats = [['92%', 'INTAKE COMPLETENESS'], ['12 → 6.5', 'AVERAGE ROUNDS'], ['90%+', 'TRACEABLE ANSWERS']];
  stats.forEach(([v, l], i) => { const k = seg(lt, .4 + i * .18, .6 + i * .18), y = 330 + i * 160; line([[1180, y - 70], [1180 + 560 * easeOut(k), y - 70]], 'rgba(241,238,230,.3)', 1); txt(v, 1180, y + 10, { font: font(F.cond, 84), fill: K.cream, a: k }); txt(l, 1180, y + 50, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.65)', ls: 3, a: k }); });
  txt('~180 SELF-BUILT TEST CASES · 12 DEPARTMENTS · DECISION SUPPORT, NOT DIAGNOSIS', 158, 800, { font: font(F.mono, 16, 500), fill: 'rgba(241,238,230,.55)', ls: 2, a: seg(lt, .6, .9) });
  hud(t, { tl: '02 / MULTI-AGENT PRE-CONSULTATION & TRIAGE', tr: tc(t), bl: sec(2, 'EVALUATION'), br: 'PROJECT TEST SET', zh: '决策支持，不做诊断或处方', zhRight: true });
}
function sMs1(t) {
  bg(K.lime); const lt = t - S.ms1;
  // soft shadow under the knot, then the knot
  const g = ctx.createRadialGradient(1380, 900, 10, 1380, 900, 380); g.addColorStop(0, 'rgba(14,15,14,.28)'); g.addColorStop(1, 'rgba(14,15,14,0)');
  ctx.save(); ctx.scale(1, .28); ctx.fillStyle = g; ctx.fillRect(900, 900 / .28 - 400, 1000, 800); ctx.restore();
  glShot(knot(t, { x: 1.62, y: -.12, s: .8 * backOut(seg(lt, .1, .7)) }));
  const rows = [['CALL', 230, 390], ['THE RIGHT', 118, 530], ['TOOL.', 230, 760]];
  rows.forEach(([w, s, y], li) => letters(w, 140, y, { font: font(F.cond, s), fill: K.ink }, i => {
    const k = seg(t, Hh.ms[li] + i * .03, Hh.ms[li] + i * .03 + .3); return { dy: (1 - expoOut(k)) * 120, a: k > 0 ? clamp(k * 3) : 0 };
  }));
  for (const [x, y] of [[1770, 330], [1080, 800]]) { line([[x - 16, y], [x + 16, y]], K.ink, 2, seg(lt, .5, .8)); line([[x, y - 16], [x, y + 16]], K.ink, 2, seg(lt, .5, .8)); }
  hud(t, { dark: false, tl: '03 / MICROSOFT CLOUD & AI', tr: 'NO. 03 — 2026.07–09 · INTERN', bl: '24 AZURE REST TOOLS · TOOL-CALLING & MULTI-AGENT', br: '→ FORM FOLLOWS INTENT', zh: '微软 Cloud & AI 实习', zhRight: true, brackets: false });
  if (lt < .12) { FX.slice = .5 * (1 - lt / .12); FX.seed = 41; }
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
function sMs2(t) {
  bg(K.lime); const lt = t - S.ms2;
  glShot(knot(t, { x: 2.55, y: -1.1, s: .55 }));
  const f = font(F.cond, 420), k = seg(t, Hh.flip, Hh.flip + .9);
  const xEnd = odometer(61, 87, k, 150, 700, f, K.ink);
  txt('%', xEnd + 10, 700, { font: f, fill: K.ink });
  txt(k < .01 ? 'BEFORE' : k < 1 ? '→' : 'AFTER', 160, 250, { font: font(F.mono, 24, 700), fill: K.ink, ls: 8 });
  txt('PHI-3 COMPLETE-CALL ACCURACY', 160, 790, { font: font(F.mono, 26, 700), fill: K.ink, ls: 5 });
  txt('320 BILINGUAL EVAL PROMPTS · 24 TOOLS', 160, 836, { font: font(F.mono, 20, 500), fill: 'rgba(14,15,14,.7)', ls: 3 });
  arrowNE(1180, 330, 120 * backOut(seg(t, Hh.flip + .8, Hh.flip + 1.1)), K.ink, 12);
  hud(t, { dark: false, tl: '03 / MICROSOFT CLOUD & AI', tr: tc(t), bl: sec(3, 'EVALUATION'), br: 'INTERNAL EVAL SET', zh: '工具调用评测', zhRight: true, brackets: false });
  if (t > S.thy1 - .25) { const g = seg(t, S.thy1 - .25, S.thy1); FX.slice = g * .8; FX.split = .008 * g; FX.seed = Math.floor(t * FPS); }
}
function sThy1(t) {
  const lt = t - S.thy1, st = seg(t, Hh.strips, S.thy2);
  glShot(liquid(t, { zoom: 1.5, seed: 9, strips: st > 0 ? 18 : 0, stripAmt: easeIn(st) * 2.5 }));
  const words = ['Cite it', '—', 'or abstain.'], f = `italic 124px ${F.serif}`;
  const full = words.join(' '), total = measure(full, f); let x = W / 2 - total / 2;
  words.forEach((wd, i) => { const k = seg(t, Hh.thyWords[i], Hh.thyWords[i] + .3); txt(wd, x, H / 2 + 40 + (1 - easeOut(k)) * 30, { font: f, fill: K.cream, a: k, glow: 'rgba(14,15,40,.35)', glowR: 20 }); x += measure(wd + ' ', f); });
  txt('引用来源，或者拒答', W / 2, H / 2 + 130, { font: font(F.zh, 28, 500), fill: 'rgba(241,238,230,.85)', ls: 12, align: 'center', a: seg(lt, 1.1, 1.4) });
  hud(t, { tl: '04 / UW–MADISON DEPARTMENT OF SURGERY', tr: tc(t), bl: sec(4, 'CLINICAL AI'), br: 'THYROID CANCER AI SUPPORT SYSTEM' });
  if (lt < .12) { FX.slice = .6 * (1 - lt / .12); FX.seed = 51; }
}
function sThy2(t) {
  bg(K.cream); const lt = t - S.thy2;
  letters('CLINICAL', 140, 470, { font: font(F.cond, 250), fill: K.ink }, i => { const k = seg(lt, i * .03, .3 + i * .03); return { dy: (1 - expoOut(k)) * 160, a: k > 0 ? 1 : 0 }; });
  letters('RAG.', 140, 780, { font: font(F.cond, 330), fill: K.ink }, i => { const k = seg(lt, .15 + i * .04, .45 + i * .04); return { dy: (1 - expoOut(k)) * 200, a: k > 0 ? 1 : 0, fill: i === 3 ? K.red : K.ink }; });
  const items = ['LEAD AI ENGINEER', 'THYROID CANCER AI SUPPORT', '$69K FUNDED · TWO FACULTY PIs', 'GROUNDED, TRACEABLE ANSWERS', 'SAFETY EVALUATION'];
  items.forEach((it, i) => {
    const k = seg(t, Hh.ticks[i], Hh.ticks[i] + .2), y = 330 + i * 92, x = 1060;
    line([[x, y + 30], [x + 700, y + 30]], 'rgba(14,15,14,.2)', 1, k);
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = K.lime; ctx.fillRect(x, y - 22, 34, 34); ctx.restore();
    if (k > .5) line([[x + 7, y - 5], [x + 15, y + 4], [x + 28, y - 13]], K.ink, 4);
    txt(it, x + 56, y + 4, { font: font(F.mono, 24, 700), fill: K.ink, ls: 3, a: k });
  });
  hud(t, { dark: false, tl: '04 / UW–MADISON DEPARTMENT OF SURGERY', tr: 'NO. 04 — NOW · LEAD AI ENGINEER', bl: 'CLINICAL RAG · GROUNDED GENERATION · SAFETY EVAL', br: 'IN DEVELOPMENT', zh: '甲状腺癌 AI 支持系统', zhRight: true, brackets: false });
  if (lt < .1) { FX.split = .006 * (1 - lt / .1); }
}
function tape(t, y, rot, col, fg, words, speed, dir, k) {
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate(rot); ctx.translate(lerp(dir * W * 1.4, 0, expoOut(k)), 0);
  ctx.fillStyle = col; ctx.fillRect(-W * 1.5, -85, W * 3, 170);
  const f = font(F.cond, 128), unit = words.map(w => measure(w, f) + 170).reduce((a, b) => a + b, 0), off = ((t * speed) % unit + unit) % unit;
  let x = -W * 1.4 - off * dir;
  while (x < W * 1.5) for (const w of words) { txt(w, x, 50, { font: f, fill: fg }); const ww = measure(w, f); if (w !== '') { if (words.indexOf(w) % 2 === 0) asterisk(x + ww + 85, 0, 34, fg, 7, t); else arrowNE(x + ww + 55, -32, 62, fg, 8); } x += ww + 170; }
  ctx.restore();
}
function sThy3(t) {
  bg(K.cream); const lt = t - S.thy3, k = seg(t, Hh.tapes, Hh.tapes + .5);
  txt('04', 90, 590, { font: font(F.cond, 560), fill: K.lime, a: seg(lt, 0, .3) });
  txt('04', 90, 590, { font: font(F.cond, 560), fill: null, stroke: K.ink, lw: 3, a: seg(lt, 0, .3) });
  const fast = 1 + 3 * easeIn(seg(t, Hh.tapeGlitch, S.end));
  tape(t * fast, 470, -.13, K.ink, K.cream, ['TRACEABLE', 'GROUNDED', 'SAFE'], 260, -1, k);
  tape(t * fast, 640, .07, K.lime, K.ink, ['CITE', 'SOURCE', 'ABSTAIN'], 300, 1, seg(t, Hh.tapes + .15, Hh.tapes + .65));
  hud(t, { dark: false, tl: '04 / CHOREOGRAPHY OF A GROUNDED ANSWER', tr: '120 BPM — NO UNSOURCED CLAIMS', bl: 'IN DEVELOPMENT · NOT YET PATIENT-VALIDATED', br: 'EVERY CLAIM, TRACED.', zh: '研发中 · 尚未进行患者端验证', brackets: false });
  if (t > Hh.tapeGlitch) { const g = seg(t, Hh.tapeGlitch, S.end); FX.slice = g * .9; FX.split = .012 * g; FX.seed = Math.floor(t * FPS); }
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

const SCENES = [[S.boot, sBoot], [S.every, sEvery], [S.needs, sNeeds], [S.evid, sEvid], [S.name, sName], [S.rag1, sRag1], [S.rag2, sRag2], [S.tri1, sTri1], [S.tri2, sTri2], [S.tri3, sTri3], [S.ms1, sMs1], [S.ms2, sMs2], [S.thy1, sThy1], [S.thy2, sThy2], [S.thy3, sThy3], [S.end, sEnd]];
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
  document.fonts.load('500 20px "Noto Sans SC"', '每个回答都需要依据涂喆宸企业级智能助手检索路由与重排多体预问诊导决策支持不做断或处方微软实习工具调用评测引用来源者拒甲状腺癌系统研发中尚未进行患端验证作品集急红旗立即转交医生'),
  document.fonts.load('700 20px "Noto Sans SC"', '急症红旗立即转交医生'),
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
