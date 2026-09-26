// sea_set.js: the one world of "The Paper Sea" (纸海): palette, the cast (Jelly, the mini-jellies, the seahorse, the
// octopus surgeon, the eel, the paper butterfly) and the props every chapter shares. Chapters live in c*_*.js and
// pull what they need out of SEA. Everything here draws one frame; motion comes from what the shot passes in.

const SEA = {};
(() => {
  // ---------- palette: cream paper, woodblock-flat colour, green-black ink (the site's --ink / --deep family) ----------
  PAL.paper = '#F2EBDD';
  PAL.ink = '#1D2A29';
  PAL.cream = '#FFF7E8';
  const C = SEA.C = {
    deep: '#17312D', deep2: '#24443E', deep3: '#3B665D', sage: '#83A897', sageLt: '#B9D0C3', mist: '#DCE6DD',
    verm: '#D4553B', vermDk: '#A83A28', coral: '#EF9A7E', blush: '#F8CDBD',
    gold: '#E2A93B', goldLt: '#F5D896', ochre: '#E6B04A', ochreDk: '#BE8A2A',
    lilac: '#A994CB', lilacDk: '#7D69A6', slate: '#5E7E8B', slateDk: '#3F5A66',
    cream: '#FFF7E8', sand: '#E8DBC2', sandDk: '#CDBB98', paperDk: '#E2D7C2', grey: '#B9B3A6'
  };
  const JELLY = SEA.JELLY = { bell: '#F2A088', rim: C.verm, inner: '#FBD5C5', tent: '#DE6A50', lt: '#FFE9DF', glow: '#FF9C78' };
  SEA.MINI = {
    intake:    { bell: '#F0C35E', rim: C.ochreDk, inner: '#FBE6B0', tent: '#D9A23C', lt: '#FFF3D2', glow: '#FFD27A' },
    retrieve:  { bell: '#9CC2B2', rim: C.deep3, inner: '#D6E8DE', tent: '#6E9C8B', lt: '#EEF7F1', glow: '#9FF0D0' },
    triage:    { bell: '#BBA7DA', rim: C.lilacDk, inner: '#E3D9F1', tent: '#9A84C2', lt: '#F4EEFB', glow: '#D2B8FF' },
    guard:     { bell: '#8FAAB6', rim: C.slateDk, inner: '#D2DFE5', tent: '#6B8B98', lt: '#EDF3F6', glow: '#A8D8FF' },
  };

  // ---------- geometry helpers ----------
  // A ribbon whose width follows f(s), s = 0..1 along the path (belly-shaped bodies, tapering tentacles).
  const ribbonF = SEA.ribbonF = (P, f, n = 6) => {
    const Cv = through(P, n), m = Cv.length, L = [], R = [];
    for (let i = 0; i < m; i++) {
      const a = Cv[Math.max(0, i - 1)], b = Cv[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = f(i / Math.max(1, m - 1)) / 2;
      L.push([Cv[i][0] - dy / d * w, Cv[i][1] + dx / d * w]); R.push([Cv[i][0] + dy / d * w, Cv[i][1] - dx / d * w]);
    }
    return L.concat(R.reverse());
  };
  const rotP = SEA.rotP = (p, a, c = [0, 0]) => { const cs = Math.cos(a), sn = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs]; };
  const qbez = SEA.qbez = (A, Cc, B, s) => [(1 - s) * (1 - s) * A[0] + 2 * (1 - s) * s * Cc[0] + s * s * B[0], (1 - s) * (1 - s) * A[1] + 2 * (1 - s) * s * Cc[1] + s * s * B[1]];
  const lumpy = SEA.lumpy = (cx, cy, rx, ry, seed, n = 22, amp = .13) => {
    const p = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, w = 1 + amp * Math.sin(a * 5 + seed) + amp * .55 * Math.sin(a * 9 + seed * 2); p.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]); }
    return p;
  };
  // velocity of a pure path fn(t) → [x, y], for tentacle drag and follow-through
  SEA.vel = (fn, t, h = 1 / 24) => { const a = fn(t - h), b = fn(t); return [(b[0] - a[0]) / h, (b[1] - a[1]) / h]; };
  // the swim pump: 1 at each contraction (on the beat), easing back out
  SEA.pumpAt = (t, rate = 1) => { const f = frac(bpOf(t) * rate); return f < .18 ? ease(f / .18) : 1 - ease((f - .18) / .82); };

  // ---------- Jelly ----------
  // (x, y) = centre of the bell's rim. The bell is 10u wide and 6.4u tall; the tentacles hang ~10u below the rim.
  // Takes feel()/emotions() fields (eyes, mouth, lookX/Y, squint, blush, emote, sq, dy, dx, rot, aL, aR) plus:
  //   pump 0..1 (swim contraction; default: on the beat), vx/vy (px/s, tentacles drag behind), glowA (0..1, deep sea),
  //   reachL/reachR = { x, y, k } (a hand tentacle reaches a world point), holdL/holdR(x, y, ang) (draw a prop at its tip),
  //   pal (a palette like SEA.JELLY), tentLen (×), noFace, boilKey, hat ('band' = the practice sweatband).
  SEA.jelly = (x, y, u, o = {}) => {
    const id = o.boilKey ?? 'jelly' + (++CLAWD_N), rs = p => boilSeed(`${id} ${p}`);
    const P = o.pal || JELLY, sw = clamp(u / 16, .4, 2.2) * (o.swMul || 1);
    x += (o.dx || 0) * u; y += (o.dy || 0) * u;
    const pump = o.pump ?? SEA.pumpAt(T + (o.phase || 0));
    const sq = (o.sq || 0);
    const sx = (1 + sq * .6) * (1 - .1 * pump), sy = (1 - sq) * (1 + .09 * pump);
    const rot = o.rot || 0, vx = o.vx || 0, vy = o.vy || 0;
    const W2 = (px, py) => rotP([x + px * sx, y + py * sy], rot, [x, y]);   // bell-local → world

    // ---- light (deep water only) ----
    if (o.glowA > .01) { rs('glow'); glow(...W2(0, -3.4 * u), 13 * u, P.glow, o.glowA); glow(...W2(0, -3 * u), 6 * u, '#FFE3C8', o.glowA * .6); }

    // ---- tentacles ----
    const anchors = [-3.7, -2.3, -.8, .8, 2.3, 3.7];
    const len = (o.tentLen || 1) * u;
    const drag = [clamp(-vx * .18, -18 * u, 18 * u), clamp(-vy * .18, -18 * u, 18 * u)];
    // tentacles trail AWAY from the motion: their hanging direction swings toward the drag, keeping their length
    const tentPts = (i, L0, phase) => {
      const ax = anchors[i] * u, A = W2(ax, .35 * u), pts = [];
      const rest = [-Math.sin(rot * .75), Math.cos(rot * .75)];   // hanging direction (tilts with the bell)
      const dv = [rest[0] * L0 + drag[0] * 1.3, rest[1] * L0 + drag[1] * 1.3], dl = Math.hypot(dv[0], dv[1]) || 1, dir = [dv[0] / dl, dv[1] / dl];
      for (let k = 0; k <= 6; k++) {
        const s = k / 6, bend = Math.pow(s, 1.4);
        const dd = [lerp(rest[0], dir[0], bend), lerp(rest[1], dir[1], bend)], dn = Math.hypot(dd[0], dd[1]) || 1, nrm = [-dd[1] / dn, dd[0] / dn];
        const sway = Math.sin(T * 1.9 + i * 1.3 + phase - s * 4.2) * (.25 + .8 * s) * u * (1 + Math.min(2, dl / L0 - 1) * .4);
        const side = ax * .12 * s - Math.sign(ax) * pump * 1.1 * u * s;   // roots splay out; the pump pulls them in
        pts.push([A[0] + dd[0] / dn * L0 * s + nrm[0] * (sway - side), A[1] + dd[1] / dn * L0 * s + nrm[1] * (sway - side)]);
      }
      return pts;
    };
    const handPts = (i, R) => {
      const free = tentPts(i, 9.5 * len, 0), side = i === 0 ? -1 : 1;
      const arm = side < 0 ? (o.aL ?? .2) : (o.aR ?? .2);
      // a raised arm (emotions) lifts the free tentacle outward, like Clawd's arm nubs
      const lift = clamp(arm, -1, 1.6);
      for (let k = 1; k <= 6; k++) { const s = k / 6; free[k] = rotP(free[k], -side * lift * .55 * s, free[0]); }
      if (!R || (R.k ?? 1) <= 0) return free;
      const A = free[0], B = [R.x, R.y], d = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const Cc = [A[0] + (B[0] - A[0]) * .2 + side * .22 * d, A[1] + (B[1] - A[1]) * .45 + .28 * d];
      const reach = []; for (let k = 0; k <= 6; k++) { const s = k / 6; const q = qbez(A, Cc, B, s); reach.push([q[0] + Math.sin(T * 3 + k) * .08 * u * s, q[1]]); }
      const kk = ease(R.k ?? 1); return free.map((p, k) => [lerp(p[0], reach[k][0], kk), lerp(p[1], reach[k][1], kk)]);
    };
    const tentPaint = (pts, w0, key) => { rs(key); paint(ribbonF(pts, s => lerp(w0, .16 * u, Math.pow(s, .8)), 5), { wash: P.tent, washOp: 255, ink: mixCol(P.rim, PAL.ink, .45), sw: sw * .42 }); };
    for (const i of [1, 2, 3, 4]) tentPaint(tentPts(i, (7.5 + 2.5 * hash(i + 3)) * len, .7 * i), .72 * u, 't' + i);
    // oral arms: two frilly ribbons hanging from the middle
    for (const s of [-1, 1]) {
      rs('oral' + s);
      const A = W2(s * .7 * u, .2 * u), pts = [];
      const rst = [-Math.sin(rot * .75), Math.cos(rot * .75)], ov = [rst[0] * 5.6 * len + drag[0] * 1.1, rst[1] * 5.6 * len + drag[1] * 1.1], ol = Math.hypot(ov[0], ov[1]) || 1;
      for (let k = 0; k <= 5; k++) { const q = k / 5, bd = Math.pow(q, 1.3), dx = lerp(rst[0], ov[0] / ol, bd), dy = lerp(rst[1], ov[1] / ol, bd), dn = Math.hypot(dx, dy) || 1, wv = (s * .3 + Math.sin(T * 2.4 + s + k * 1.1) * .55) * u * q; pts.push([A[0] + dx / dn * 5.6 * len * q - dy / dn * wv, A[1] + dy / dn * 5.6 * len * q + dx / dn * wv]); }
      paint(ribbonF(pts, q => (1.35 - .9 * q) * u * (1 + .25 * Math.sin(q * 18 + T * 3))), { wash: P.inner, washOp: 255, fill: P.bell, fillOp: 90, bleed: .08, tex: .4, ink: PAL.ink, sw: sw * .5 });
    }

    // ---- bell ----
    rs('bell');
    const dome = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; dome.push(W2(-Math.cos(a) * 5 * u * (1 + .04 * Math.sin(a)), -Math.pow(Math.sin(a), .75) * 6.4 * u + jit(u * .04))); }
    const rim = [];
    for (let j = 1; j < 32; j++) { const q = j / 32; rim.push(W2(lerp(4.95, -4.95, q) * u, (.15 + .55 * Math.abs(Math.sin(Math.PI * j / 4))) * u)); }
    const bell = dome.concat(rim);
    paint(bell, { wash: P.bell, washOp: 255, ink: null });
    // subumbrella shade + the glassy crown highlight
    const sub = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; sub.push(W2(-Math.cos(a) * 4.3 * u, -Math.sin(a) * 2.2 * u + .3 * u)); }
    paint(sub, { fill: P.rim, fillOp: 70, bleed: .15, tex: .6, border: .5, ink: null });
    const hl = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * (.12 + .42 * i / 8); hl.push(W2(-Math.cos(a) * 3.9 * u, -Math.sin(a) * 5.2 * u)); }
    for (let i = 8; i >= 0; i--) { const a = Math.PI * (.12 + .42 * i / 8); hl.push(W2(-Math.cos(a) * 3.3 * u, -Math.sin(a) * 4.5 * u)); }
    paint(hl, { wash: P.lt, washOp: 220, ink: null });
    // rim band
    rs('rimband');
    const band = []; for (let j = 0; j <= 16; j++) band.push(W2(lerp(4.8, -4.8, j / 16) * u, (.1 + .45 * Math.abs(Math.sin(Math.PI * j / 2))) * u - .35 * u));
    paint(ribbonF(band, () => .55 * u, 3), { wash: P.rim, washOp: 230, ink: null });
    // crown freckles
    for (const [fx, fy, r] of [[-1.4, -5.2, .32], [0, -5.75, .4], [1.4, -5.2, .32]]) paint(ellPts(...W2(fx * u, fy * u), r * u, r * u, 8), { wash: P.rim, washOp: 200, ink: null });
    rs('bellink');
    paint(bell, { ink: PAL.ink, sw, curv: .15 });

    // ---- face ----
    if (!o.noFace) {
      const fu = u * .8, [fxw, fyw] = W2((o.lookX || 0) * .5 * u, -2.7 * u);
      push(); translate(fxw, fyw); rotate(rot); scale(sx * .82, sy);
      push(); translate(0, 6 * fu);
      if (o.blush) { rs('blush'); for (const s of [-1, 1]) paint(ellPts(s * 3.7 * fu, -4.5 * fu, fu * .85, fu * .42, 14), { fill: C.verm, fillOp: 150 * clamp(o.blush === true ? 1 : o.blush), bleed: .2, ink: null }); }
      rs('eyes'); eyes(fu, { ...o, lookX: (o.lookX || 0) * .7 }, sw, [-1, 1], o.smear || 0);
      rs('mouth'); push(); translate(0, .15 * fu); mouth(fu, o.mouth, sw); pop();
      pop(); pop();
    }
    if (o.hat === 'band') {   // practice sweatband across the crown
      rs('band');
      const bd = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (.08 + .84 * i / 10); bd.push(W2(-Math.cos(a) * 4.9 * u, -Math.pow(Math.sin(a), .75) * 5.2 * u)); }
      paint(ribbonF(bd, () => .9 * u, 3), { wash: C.cream, ink: PAL.ink, sw: sw * .6 });
      for (let i = 0; i < 4; i++) { const q = .2 + i * .2, a = Math.PI * q, p = W2(-Math.cos(a) * 4.9 * u, -Math.pow(Math.sin(a), .75) * 5.2 * u); inkLine([[p[0] - .25 * u, p[1] + .3 * u], [p[0] + .15 * u, p[1] - .3 * u]], sw * .5, C.verm, 'inkfine', 0); }
      const knot = W2(4.6 * u, -3.4 * u);
      for (const s of [0, 1]) inkLine([knot, [knot[0] + (1.4 + s * .5) * u, knot[1] + (s * 1.1 - .2) * u + Math.sin(T * 6 + s) * .3 * u]], sw * 1.6, C.cream, 'ink', .4);
    }
    if (o.draw) { rs('draw'); o.draw(u, sw, W2); }

    // ---- hand tentacles (outermost), drawn over the bell so they can hold things ----
    for (const [i, R, hold] of [[0, o.reachL, o.holdL], [5, o.reachR, o.holdR]]) {
      const pts = handPts(i, R);
      const tip = pts[6], pre = pts[5], ang = Math.atan2(tip[1] - pre[1], tip[0] - pre[0]);
      if (hold) { rs('hold' + i); hold(tip[0], tip[1], ang); }
      tentPaint(pts, .85 * u, 'hand' + i);
      if (o.glowTips) { rs('tipg' + i); glow(tip[0], tip[1], 2.2 * u, C.goldLt, o.glowTips); }
    }

    rs('emote');
    if (o.emote) emote(o.emote, ...W2(5.6 * u, -7.2 * u), u * .85, o.emoteK ?? 1, o.emoteAge ?? T);
    rs('after');
    return { top: W2(0, -6.4 * u), face: W2(0, -2.7 * u), tipL: handPts(0, o.reachL)[6], tipR: handPts(5, o.reachR)[6] };
  };

  // ---------- the seahorse (patient) ----------
  // (x, y) = middle of the body; s = unit (the seahorse is ~10s tall). Faces right (flip for left).
  // o: eyes/lookX/squint (face fields), fin = 0..1 (0 = pectoral fin out, 1 = pressed to the belly), chest = 0..1 red
  //    warning glow on the chest, tint ('pale' / 'green'), emote/emoteK/emoteAge, rot, sq, dy
  SEA.seahorse = (x, y, s, o = {}) => {
    const rs = p => boilSeed(`seahorse ${p}`), sw = clamp(s / 22, .45, 1.4);
    const body = o.tint === 'pale' ? '#F1D79B' : C.ochre, dk = C.ochreDk, lt = '#F8E2A6';
    push(); translate(x, y + (o.dy || 0) * s); if (o.rot) rotate(o.rot); scale((o.flip ? -1 : 1) * (1 + (o.sq || 0) * .5), 1 - (o.sq || 0));
    const sway = Math.sin(T * 2.2) * .15;
    // dorsal fin (behind)
    rs('dorsal');
    const fan = [[-.6 * s, -1.6 * s]]; for (let i = 0; i <= 8; i++) { const a = Math.PI * (.55 + .7 * i / 8); const r = (1.7 + .25 * Math.sin(T * 22 + i)) * s; fan.push([-.6 * s + Math.cos(a) * r, -.4 * s + Math.sin(a) * r * .9]); }
    paint(fan, { wash: C.goldLt, fill: C.ochre, fillOp: 60, ink: PAL.ink, sw: sw * .5 });
    for (let i = 1; i < 8; i += 2) inkLine([fan[0], fan[i + 1]], sw * .35, C.ochreDk, 'inkfine', 0);
    // body + curled tail: one shape
    rs('body');
    const spine = [[.25, -3.5], [1.1, -2.4], [1.55, -1.0], [1.1, .55], [.1, 1.75], [-.4, 2.9], [.1, 3.95], [.95, 4.05], [1.2, 3.4], [.75, 3.05]].map(([a, b]) => [(a + sway * b * .15) * s, b * s]);
    const outline = ribbonF(spine, q => (q < .28 ? lerp(2.1, 3.1, q / .28) : lerp(3.1, .35, (q - .28) / .72)) * s * (q > .9 ? .75 : 1), 5);
    paint(outline, { wash: body, washOp: 255, fill: dk, fillOp: 55, bleed: .05, tex: .5, ink: null });
    // pale belly along the front edge
    paint(ribbonF([[1.25, -2.6], [1.95, -1.1], [1.6, .4], [.8, 1.4]].map(([a, b]) => [a * s, b * s]), q => lerp(.9, .35, q) * s, 4), { wash: lt, washOp: 235, ink: null });
    paint(outline, { ink: PAL.ink, sw });
    // belly plates
    for (let i = 0; i < 6; i++) { const q = .12 + i * .1, p = spine[Math.floor(q * 9)], p2 = spine[Math.floor(q * 9) + 1], m = [lerp(p[0], p2[0], .5), lerp(p[1], p2[1], .5)]; inkLine([[m[0] - 1.0 * s, m[1] - .15 * s], [m[0], m[1] + .12 * s], [m[0] + 1.05 * s, m[1] - .1 * s]], sw * .4, dk, 'inkfine', .5); }
    // chest warning (the red flag's cause)
    if (o.chest > .01) { rs('chest'); paint(heartPts(.9 * s, -2.1 * s, .75 * s * (1 + .18 * pulse(T, 5))), { wash: '#E0493A', washOp: 255 * clamp(o.chest), ink: PAL.ink, sw: sw * .5 }); for (let r = 1; r < 3; r++) { const ph = frac(T * 1.6 + r * .5); inkLine(ellPts(.9 * s, -2.1 * s, (1 + ph * 1.6) * s, (1 + ph * 1.6) * s, 18), sw * .5 * (1 - ph), '#E0493A', 'inkfine', .6); } }
    // head + snout
    rs('head');
    paint(ribbonF([[1.5 * s, -4.55 * s], [2.5 * s, -4.3 * s], [3.4 * s, -4.15 * s]], q => lerp(1.05, .8, q) * s, 4), { wash: body, washOp: 255, ink: PAL.ink, sw: sw * .9 });
    paint(ellPts(3.4 * s, -4.15 * s, .28 * s, .42 * s, 8), { wash: dk, ink: PAL.ink, sw: sw * .4 });
    for (let i = 0; i < 3; i++) paint([[(-.5 + i * .5) * s, -5.9 * s], [(-.3 + i * .5) * s, -6.9 * s + i * .18 * s], [(0 + i * .5) * s, -5.95 * s]], { wash: dk, ink: PAL.ink, sw: sw * .45 });
    paint(ellPts(.35 * s, -4.75 * s, 1.75 * s, 1.5 * s, 20, 0, -.25), { wash: body, washOp: 255, fill: dk, fillOp: 40, tex: .4, ink: PAL.ink, sw });
    if (o.blush) paint(ellPts(1.25 * s, -4.1 * s, .5 * s, .28 * s, 10), { fill: C.verm, fillOp: 140 * o.blush, bleed: .2, ink: null });
    rs('eye'); push(); translate(.6 * s, -4.95 * s); eye(o.eyes || 'normal', 1, s * .62, o, sw); pop();
    // pectoral fin: out by the neck, or pressed to the belly (sick / clutching)
    rs('fin');
    const fk = ease(o.fin || 0), fp = [lerp(-.2, 1.2, fk) * s, lerp(-3.2, -1.6 + (o.chest > .5 ? -.6 : 0), fk) * s];
    const fa = lerp(3.4, 2.3, fk) + Math.sin(T * 14) * .25 * (1 - fk), fanP = [fp];
    for (let i = 0; i <= 6; i++) { const a = fa - .65 + 1.3 * i / 6; fanP.push([fp[0] + Math.cos(a) * 1.05 * s, fp[1] + Math.sin(a) * 1.05 * s]); }
    paint(fanP, { wash: C.goldLt, ink: PAL.ink, sw: sw * .45 });
    for (let i = 2; i <= 6; i += 2) inkLine([fp, fanP[i]], sw * .3, C.ochreDk, 'inkfine', 0);
    pop();
    rs('emote');
    if (o.emote) emote(o.emote, x + (o.flip ? -1 : 1) * 2.6 * s, y - 6.6 * s, s * .75, o.emoteK ?? 1, o.emoteAge ?? T);
    rs('after');
  };

  // ---------- the octopus surgeon (the human in the loop) ----------
  // (x, y) = base of the mantle, where the arms start; s = unit (mantle ~7s wide, 8s tall; arms reach ~7s).
  // o: face fields, reachL/reachR { x, y, k } (the two front arms), holdL/holdR(x, y, ang), wave 0..1 (right arm waves)
  SEA.octo = (x, y, s, o = {}) => {
    const rs = p => boilSeed(`octo ${p}`), sw = clamp(s / 15, .5, 2);
    const body = '#2F5C53', dk = '#1F403A', spot = '#4F8176', under = '#E9B9A2';
    x += (o.dx || 0) * s; y += (o.dy || 0) * s;
    const sq = o.sq || 0, bob = Math.sin(T * 2.1) * .12 * s;
    // back arms
    const arm = (i, n, front) => {
      rs('arm' + i);
      const side = i < n / 2 ? -1 : 1, ax = lerp(-2.8, 2.8, i / (n - 1)) * s, A = [x + ax, y - .4 * s + bob], pts = [];
      const ph = T * 2 + i * .9;
      for (let k = 0; k <= 7; k++) { const q = k / 7, curl = Math.pow(q, 2) * 2.4 * side; pts.push([A[0] + side * (q * 2.4 + Math.sin(ph - q * 3) * .5 * q) * s + Math.sin(curl * 2 + ph) * .4 * s * q, A[1] + (q * 5.8 - Math.pow(q, 3) * 2.2 - .6 * Math.sin(ph - q * 3) * q) * s]); }
      return pts;
    };
    const armPaint = (pts, key) => { rs(key); paint(ribbonF(pts, q => lerp(1.25, .2, Math.pow(q, .9)) * s, 5), { wash: body, washOp: 255, fill: dk, fillOp: 60, tex: .5, ink: PAL.ink, sw: sw * .7 }); };
    for (let i = 0; i < 6; i++) armPaint(arm(i, 6), 'back' + i);
    // mantle
    rs('mantle');
    const m = []; for (let i = 0; i <= 20; i++) { const a = Math.PI + Math.PI * i / 20; const r = 1 + .06 * Math.sin(a * 3); m.push([x + Math.cos(a) * 3.7 * s * r * (1 + sq * .5) * (1 - .12 * Math.pow(Math.sin(a), 8)), y + bob - .6 * s + Math.sin(a) * 9.6 * s * (1 - sq)]); }
    for (let i = 0; i <= 8; i++) m.push([x + lerp(3.6, -3.6, i / 8) * s, y + bob - .6 * s + Math.sin(i / 8 * Math.PI) * .7 * s]);
    paint(m, { wash: body, washOp: 255, fill: dk, fillOp: 70, bleed: .05, tex: .5, ink: null });
    for (const [px, py, r] of [[-2.2, -6.2, .42], [2.3, -6.6, .35], [2.7, -4.9, .3], [-2.8, -4.2, .3]]) paint(ellPts(x + px * s, y + bob + py * s, r * s, r * s, 10), { wash: spot, ink: null });
    paint(m, { ink: PAL.ink, sw, curv: .2 });
    // surgical cap
    rs('cap');
    const cap = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + Math.PI * i / 14; cap.push([x + Math.cos(a) * 3.55 * s, y + bob - 7.4 * s + Math.sin(a) * 3.1 * s]); }
    for (let i = 0; i <= 6; i++) cap.push([x + lerp(3.55, -3.55, i / 6) * s, y + bob - 7.1 * s + Math.sin(i / 6 * Math.PI) * .35 * s]);
    paint(cap, { wash: '#A9CFC0', fill: C.sage, fillOp: 60, tex: .5, ink: PAL.ink, sw: sw * .8 });
    for (let i = 0; i < 7; i++) paint(ellPts(x + (-2.4 + (i % 4) * 1.6 + (i > 3 ? .8 : 0)) * s, y + bob + (i > 3 ? -9.2 : -8.1) * s, .22 * s, .22 * s, 8), { wash: C.cream, ink: null });
    // eyes + mask
    rs('face');
    push(); translate(x, y + bob - 4.3 * s + 6 * s * .75); eyes(s * .75, o, sw, [-1, 1]); pop();
    if (o.blush) for (const sd of [-1, 1]) paint(ellPts(x + sd * 2.6 * s, y + bob - 2.3 * s, .5 * s, .25 * s, 10), { fill: C.verm, fillOp: 150 * o.blush, bleed: .2, ink: null });
    const mk = [[-2.1, -2.3], [2.1, -2.3], [1.9, -.9], [0, -.55], [-1.9, -.9]].map(([a, b]) => [x + a * s, y + bob + b * s]);
    paint(mk, { wash: '#E4F0EA', ink: PAL.ink, sw: sw * .6, curv: .3 });
    for (const sd of [-1, 1]) { inkLine([[x + sd * 2.1 * s, y + bob - 2.2 * s], [x + sd * 3.5 * s, y + bob - 2.9 * s]], sw * .45, PAL.ink, 'inkfine', 0); inkLine([[x + sd * 1.95 * s, y + bob - 1.0 * s], [x + sd * 3.5 * s, y + bob - 1.6 * s]], sw * .45, PAL.ink, 'inkfine', 0); }
    for (const k of [0, 1]) inkLine([[x - 1.2 * s, y + bob + (-1.9 + k * .45) * s], [x + 1.2 * s, y + bob + (-1.9 + k * .45) * s]], sw * .3, C.sage, 'inkfine', 0);
    // front arms (can reach and hold)
    for (const [i, R, hold] of [[0, o.reachL, o.holdL], [1, o.reachR, o.holdR]]) {
      const side = i ? 1 : -1, A = [x + side * 1.6 * s, y - .5 * s + bob];
      let free = []; for (let k = 0; k <= 7; k++) { const q = k / 7, ph = T * 2.3 + i * 2; free.push([A[0] + side * (q * 1.6 + Math.sin(ph - q * 3) * .4 * q) * s, A[1] + (q * 5 - Math.pow(q, 3) * 2.4) * s]); }
      if (o.wave && i === 1) free = free.map((p, k) => rotP(p, -1.9 * o.wave * (1 + .25 * Math.sin(T * 12)) * (k / 7), A));
      let pts = free;
      if (R && (R.k ?? 1) > 0) {
        const B = [R.x, R.y], d = Math.hypot(B[0] - A[0], B[1] - A[1]), Cc = [A[0] + (B[0] - A[0]) * .3 + side * .2 * d, A[1] + (B[1] - A[1]) * .5 + .3 * d];
        const kk = ease(R.k ?? 1); pts = free.map((p, k) => { const q = qbez(A, Cc, B, k / 7); return [lerp(p[0], q[0], kk), lerp(p[1], q[1], kk)]; });
      }
      const tip = pts[7], pre = pts[6];
      if (hold) { rs('hold' + i); hold(tip[0], tip[1], Math.atan2(tip[1] - pre[1], tip[0] - pre[0])); }
      rs('front' + i);
      paint(ribbonF(pts, q => lerp(1.3, .22, Math.pow(q, .9)) * s, 5), { wash: body, washOp: 255, fill: under, fillOp: 50, tex: .4, ink: PAL.ink, sw: sw * .7 });
      for (let k = 2; k < 7; k += 2) paint(ellPts(pts[k][0], pts[k][1] + .25 * s, .2 * s, .2 * s, 8), { wash: under, ink: null });
    }
    rs('emote');
    if (o.emote) emote(o.emote, x + 4.2 * s, y + bob - 11 * s, s * .8, o.emoteK ?? 1, o.emoteAge ?? T);
    rs('after');
  };

  // ---------- the eel (an unsafe query with a skeleton key) ----------
  // (x, y) = head; body trails to the left (flip: to the right). o: len (in s), k (swim phase speed), dazed (0..1), eyes, flip
  SEA.eel = (x, y, s, o = {}) => {
    const rs = p => boilSeed(`eel ${p}`), sw = clamp(s / 15, .45, 1.6);
    if (o.flip) { push(); translate(x, 0); scale(-1, 1); translate(-x, 0); }   // flip: faces left, body trails right
    const n = 9, L = (o.len || 14) * s, pts = [];
    for (let k = 0; k <= n; k++) { const q = k / n; pts.push([x - q * L, y + Math.sin(T * 7 * (o.k || 1) - q * 7) * 1.1 * s * q]); }
    rs('body');
    paint(ribbonF(pts, q => (q < .15 ? lerp(2.2, 2.6, q / .15) : lerp(2.6, .25, (q - .15) / .85)) * s, 5), { wash: '#6D5F93', washOp: 255, fill: '#4B4070', fillOp: 70, tex: .5, ink: PAL.ink, sw });
    for (let k = 2; k < n; k++) paint(ellPts(pts[k][0], pts[k][1] - .5 * s, .25 * s, .2 * s, 8), { wash: C.goldLt, washOp: 200, ink: null });
    rs('face');
    push(); translate(x - .8 * s, y - .5 * s + 6 * s * .45); scale(.8, 1); eyes(s * .45, { eyes: o.dazed > .5 ? 'swirl' : (o.eyes || 'narrow'), lookX: .6 }, sw, [1]); pop();
    inkLine([[x + .6 * s, y + .45 * s], [x - .6 * s, y + .75 * s], [x - 1.4 * s, y + .5 * s]], sw * .7, PAL.ink, 'ink', .5);
    if (o.flip) pop();
    rs('after');
  };

  // ---------- the paper butterfly (the patient's question; the thyroid is butterfly-shaped) ----------
  // (x, y) = body centre; s = unit (wingspan ~12s when open). o.flap: 0 = open, 1 = closed (drawn key poses, stepped),
  // o.patches = [4 values 0..1] how much each wing panel is lit (UL, UR, LL, LR), o.unknown = 0..1 (a grey panel with
  // a '?'), o.crumple = 0..1 (a creased, drooping wing: worry), o.eyes / o.mouth / o.glowA, o.rot
  SEA.butterfly = (x, y, s, o = {}) => {
    const rs = p => boilSeed(`bfly ${o.key || ''} ${p}`), sw = clamp(s / 14, .4, 1.6);
    const fl = o.flap ?? (.5 + .5 * Math.sin(T * 9)), step = Math.round(fl * 3) / 3;   // on 4 drawn poses
    const wk = lerp(1, .18, step), cr = o.crumple || 0;
    push(); translate(x, y); if (o.rot) rotate(o.rot);
    if (o.glowA > .01) { rs('g'); glow(0, 0, 9 * s, C.goldLt, o.glowA); }
    const lit = o.patches || [0, 0, 0, 0];
    const panels = [   // [side, upper?]
      [-1, 1, 0], [1, 1, 1], [-1, 0, 2], [1, 0, 3]
    ];
    for (const [sd, up, idx] of panels) {
      rs('w' + idx);
      const droop = (sd < 0 && cr > 0) ? cr * .45 : 0;
      push(); rotate(sd * droop * (up ? .6 : .9)); scale(sd * wk, 1);
      const wing = up ? [[.2, -.3], [1.6, -3.4], [3.8, -4.9], [5.6, -4.4], [5.9, -2.6], [4.6, -.9], [2.2, .1]]
                      : [[.2, .2], [2.4, .6], [4.3, 1.9], [4.4, 3.8], [2.9, 4.6], [1.3, 3.6], [.3, 1.2]];
      const P = wing.map(([a, b]) => [a * s, b * s]);
      paint(P, { wash: C.cream, washOp: 255, fill: C.paperDk, fillOp: 70, tex: .7, border: .6, ink: null, curv: .5 });
      // lit panel: the answer's colour, stitched in
      const k = clamp(lit[idx]);
      if (k > .01) {
        const cx = up ? 3.4 : 2.7, cy = up ? -2.6 : 2.4, r = (up ? 1.7 : 1.2) * s * backOut(k);
        paint(lumpy(cx * s, cy * s, r, r * .85, idx * 3, 18, .08), { wash: up ? C.verm : C.gold, washOp: 255, fill: up ? C.gold : C.verm, fillOp: 60, ink: PAL.ink, sw: sw * .4 });
        paint(ellPts(cx * s, cy * s, r * .38, r * .38, 10), { wash: C.cream, washOp: 230, ink: null });
      }
      if (o.unknown > .01 && idx === 3) {
        paint(lumpy(2.7 * s, 2.4 * s, 1.25 * s, 1.1 * s, 9, 18, .08), { wash: C.grey, washOp: 255 * o.unknown, ink: PAL.ink, sw: sw * .35 });
      }
      paint(P, { ink: PAL.ink, sw: sw * .8, curv: .5 });
      // edge band (vermilion, like the Jelly rim) + vein lines
      inkLine(up ? [[3.8 * s, -4.9 * s], [5.6 * s, -4.4 * s], [5.9 * s, -2.6 * s]] : [[4.3 * s, 1.9 * s], [4.4 * s, 3.8 * s], [2.9 * s, 4.6 * s]], sw * 2.2, C.verm, 'ink', .5);
      inkLine(up ? [[.4 * s, -.4 * s], [2.6 * s, -2.2 * s], [4.4 * s, -3.4 * s]] : [[.4 * s, .5 * s], [2.2 * s, 1.6 * s], [3.4 * s, 3.2 * s]], sw * .35, PAL.ink, 'inkfine', .5);
      if (sd < 0 && cr > .05) inkLine((up ? [[1, -1], [2.2, -2.9], [3, -1.6], [4.2, -3.6]] : [[1, 1], [2, 2.6], [2.9, 1.5]]).map(([a, b]) => [a * s, b * s]), sw * .5 * cr, PAL.ink, 'inkfine', 0);
      pop();
    }
    if (o.unknown > .01) { rs('q'); const qx = 2.7 * s * wk; emote('?', qx, 2.1 * s, s * .5, o.unknown, T); }
    // body + head + antennae
    rs('body');
    paint(ribbonF([[0, -1.6 * s], [0, 0], [0, 2.6 * s]], q => lerp(1.1, .45, q) * s, 3), { wash: PAL.ink, washOp: 255, ink: null });
    paint(ellPts(0, -2.1 * s, .95 * s, .9 * s, 12), { wash: PAL.ink, ink: null });
    for (const sd of [-1, 1]) {
      const tip = [sd * (1.3 + .15 * Math.sin(T * 5 + sd)) * s, -4.3 * s];
      inkLine([[sd * .3 * s, -2.8 * s], [sd * .8 * s, -3.8 * s], tip], sw * .6, PAL.ink, 'inkfine', .6);
      paint(ellPts(tip[0], tip[1], .28 * s, .28 * s, 8), { wash: C.verm, ink: null });
    }
    // tiny face (cream dots on the ink head)
    const ey = o.eyes || 'dot';
    for (const sd of [-1, 1]) {
      if (ey === 'happy') inkLine([[sd * .5 * s - .22 * s, -2.05 * s], [sd * .5 * s, -2.3 * s], [sd * .5 * s + .22 * s, -2.05 * s]], sw * .5, C.cream, 'inkfine', .5);
      else if (ey === 'sad') { paint(ellPts(sd * .42 * s, -2.1 * s, .16 * s, .2 * s, 8), { wash: C.cream, ink: null }); inkLine([[sd * .22 * s, -2.55 * s], [sd * .66 * s, -2.42 * s]], sw * .4, C.cream, 'inkfine', 0); }
      else paint(ellPts(sd * .42 * s, -2.1 * s, .17 * s, .22 * s, 8), { wash: C.cream, ink: null });
    }
    pop();
    rs('after');
  };

  // ---------- props ----------
  // A message bottle (a question). (x, y) = centre, s ≈ 1 unit (bottle ~3s wide, 5s tall). icon: 'q' | 'doc' | 'grid' |
  // any tool kind (the tool it needs). o: rot, glowA, opened 0..1 (cork out), burst 0..1 (answered: sparkles)
  SEA.bottle = (x, y, s, icon = 'q', o = {}) => {
    boilSeed(`bottle ${o.key || ''}`);
    const sw = clamp(s / 14, .4, 1.4);
    push(); translate(x, y); rotate(o.rot || 0);
    if (o.glowA > .01) glow(0, 0, 5 * s, '#FFE6B0', o.glowA);
    const body = [[-1.4, -.9], [-1.5, 1.9], [-1.2, 2.5], [1.2, 2.5], [1.5, 1.9], [1.4, -.9], [.6, -1.6], [.55, -2.6], [-.55, -2.6], [-.6, -1.6]].map(([a, b]) => [a * s, b * s]);
    paint(body, { wash: '#DDEBE2', washOp: 235, fill: C.sageLt, fillOp: 60, tex: .3, ink: null, curv: .25 });
    push(); translate(0, .7 * s); SEA.icon(icon, 0, 0, s * .95, o.iconCol); pop();
    paint(body, { ink: PAL.ink, sw: sw * .8, curv: .25 });
    inkLine([[-1.0 * s, -.4 * s], [-1.1 * s, 1.6 * s]], sw * .9, C.cream, 'inkfine', .3);
    const ck = (o.opened || 0);
    paint(rectPts(-.5 * s, (-3.3 - ck * 1.5) * s, s, .9 * s), { wash: '#B58355', ink: PAL.ink, sw: sw * .6 });
    pop();
    if (o.burst > .01 && o.burst < 1) {
      const b = o.burst;
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + .3, r = (1.5 + 5 * easeOut(b)) * s; paint(starPts(x + Math.cos(a) * r, y + Math.sin(a) * r, (1 - b) * 1.1 * s, .4, 4), { wash: i % 2 ? C.gold : C.cream, ink: PAL.ink, sw: sw * .4 }); }
    }
    boilSeed(`bottle ${o.key || ''} after`);
  };

  // Icons: glyphs drawn inside bottles and hung on the tool wall. (x, y) = centre, s = size unit (~2s across).
  SEA.icon = (kind, x, y, s, col) => {
    const sw = clamp(s / 14, .35, 1.3), ink = PAL.ink, P = pts => pts.map(([a, b]) => [x + a * s, y + b * s]);
    switch (kind) {
      case 'q': emote('?', x, y - .2 * s, s * .55, 1, 0); break;
      case 'doc':
        paint(P([[-.8, -1.05], [.45, -1.05], [.8, -.7], [.8, 1.05], [-.8, 1.05]]), { wash: C.cream, ink, sw: sw * .7 });
        for (let i = 0; i < 3; i++) inkLine(P([[-.5, -.5 + i * .45], [.5, -.5 + i * .45]]), sw * .5, C.deep3, 'inkfine', 0);
        break;
      case 'grid':
        paint(P([[-1, -.8], [1, -.8], [1, .8], [-1, .8]]), { wash: C.cream, ink, sw: sw * .7 });
        paint(P([[-1, -.8], [1, -.8], [1, -.35], [-1, -.35]]), { wash: C.sage, ink: null });
        for (const gx of [-.33, .33]) inkLine(P([[gx, -.8], [gx, .8]]), sw * .45, ink, 'inkfine', 0);
        for (const gy of [-.35, .22]) inkLine(P([[-1, gy], [1, gy]]), sw * .45, ink, 'inkfine', 0);
        break;
      default: SEA.tool(kind, x, y, s, 0, col);
    }
  };

  // Tools for the tool wall (the Azure REST tools, as a toy chest). (x, y) = centre, s = unit (~2.4s long), rot.
  SEA.TOOLS = ['wrench', 'key', 'hammer', 'magnifier', 'gear', 'scissors', 'lantern', 'hook', 'screwdriver', 'anchor', 'bell', 'ladle'];
  SEA.tool = (kind, x, y, s, rot = 0, col) => {
    const sw = clamp(s / 14, .35, 1.3), ink = PAL.ink, metal = col || '#9FB5B0', dark = '#5E7773', wood = '#B8834F';
    push(); translate(x, y); rotate(rot);
    const P = pts => pts.map(([a, b]) => [a * s, b * s]);
    switch (kind) {
      case 'wrench':
        paint(P([[-.22, -.9], [.22, -.9], [.22, .9], [-.22, .9]]), { wash: metal, ink, sw: sw * .7 });
        paint(ellPts(0, -1.15 * s, .55 * s, .5 * s, 12), { wash: metal, ink, sw: sw * .7 });
        paint(P([[-.18, -1.7], [.18, -1.7], [.18, -1.1], [-.18, -1.1]]), { wash: PAL.paper, ink: null });
        paint(ellPts(0, 1.05 * s, .38 * s, .38 * s, 10), { wash: metal, ink, sw: sw * .7 });
        break;
      case 'key':
        paint(ellPts(0, -.9 * s, .6 * s, .6 * s, 14), { wash: col || C.gold, ink, sw: sw * .7 });
        paint(ellPts(0, -.9 * s, .22 * s, .22 * s, 8), { wash: PAL.paper, ink, sw: sw * .4 });
        paint(P([[-.14, -.35], [.14, -.35], [.14, 1.3], [-.14, 1.3]]), { wash: col || C.gold, ink, sw: sw * .6 });
        paint(P([[.14, .7], [.5, .7], [.5, .9], [.14, .9]]), { wash: col || C.gold, ink, sw: sw * .5 });
        paint(P([[.14, 1.05], [.42, 1.05], [.42, 1.25], [.14, 1.25]]), { wash: col || C.gold, ink, sw: sw * .5 });
        break;
      case 'hammer':
        paint(P([[-.15, -.6], [.15, -.6], [.15, 1.3], [-.15, 1.3]]), { wash: wood, ink, sw: sw * .6 });
        paint(P([[-.8, -1.2], [.8, -1.2], [.8, -.55], [-.8, -.55]]), { wash: col || '#7E8E96', ink, sw: sw * .7 });
        break;
      case 'magnifier':
        paint(P([[-.14, .1], [.14, .1], [.3, 1.3], [.02, 1.35]]), { wash: wood, ink, sw: sw * .6 });
        paint(ellPts(0, -.5 * s, .7 * s, .7 * s, 16), { wash: '#CFE3DA', fill: C.sageLt, fillOp: 60, ink, sw: sw * .8 });
        inkLine(P([[-.35, -.75], [-.1, -.95]]), sw * .6, C.cream, 'inkfine', .3);
        break;
      case 'gear': {
        const g = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? .75 : 1; g.push([Math.cos(a) * r * s, Math.sin(a) * r * s]); }
        paint(g, { wash: col || C.ochre, ink, sw: sw * .7 });
        paint(ellPts(0, 0, .3 * s, .3 * s, 10), { wash: PAL.paper, ink, sw: sw * .5 });
        break;
      }
      case 'scissors':
        for (const sd of [-1, 1]) {
          paint(P([[sd * -.1, .15], [sd * .5, -1.35], [sd * .22, -1.45], [sd * -.12, -.05]]), { wash: metal, ink, sw: sw * .6 });
          paint(ellPts(sd * .45 * s, .75 * s, .38 * s, .38 * s, 10), { wash: col || C.verm, ink, sw: sw * .6 });
        }
        break;
      case 'lantern':
        inkLine(P([[-.4, -1.1], [0, -1.45], [.4, -1.1]]), sw * .6, ink, 'inkfine', .5);
        paint(P([[-.5, -1], [.5, -1], [.6, .9], [-.6, .9]]), { wash: C.goldLt, fill: C.gold, fillOp: 60, ink, sw: sw * .7 });
        paint(P([[-.7, .85], [.7, .85], [.7, 1.1], [-.7, 1.1]]), { wash: dark, ink, sw: sw * .5 });
        paint(ellPts(0, 0, .2 * s, .32 * s, 8), { wash: C.verm, ink: null });
        break;
      case 'hook':
        paint(P([[-.12, -1.3], [.12, -1.3], [.12, .2], [-.12, .2]]), { wash: metal, ink, sw: sw * .6 });
        inkLine(P([[0, .1], [0, .8], [-.5, 1.05], [-.8, .6]]), sw * 2, metal, 'ink', .7);
        inkLine(P([[0, .1], [0, .8], [-.5, 1.05], [-.8, .6]]), sw * .4, ink, 'inkfine', .7);
        break;
      case 'screwdriver':
        paint(P([[-.3, -1.3], [.3, -1.3], [.3, -.1], [-.3, -.1]]), { wash: col || C.lilac, ink, sw: sw * .7 });
        paint(P([[-.08, -.1], [.08, -.1], [.08, 1.2], [-.08, 1.2]]), { wash: metal, ink, sw: sw * .5 });
        break;
      case 'anchor':
        paint(P([[-.12, -1], [.12, -1], [.12, 1.1], [-.12, 1.1]]), { wash: col || C.slate, ink, sw: sw * .6 });
        paint(ellPts(0, -1.15 * s, .28 * s, .28 * s, 10), { wash: PAL.paper, ink, sw: sw * .5 });
        inkLine(P([[-.8, .5], [-.6, 1.05], [0, 1.2], [.6, 1.05], [.8, .5]]), sw * 1.6, col || C.slate, 'ink', .6);
        inkLine(P([[-.55, -.5], [.55, -.5]]), sw * 1.4, col || C.slate, 'ink', 0);
        break;
      case 'bell':
        paint(P([[-.3, -1], [.3, -1], [.55, -.2], [.85, .7], [-.85, .7], [-.55, -.2]]), { wash: col || C.gold, ink, sw: sw * .7, curv: .4 });
        paint(ellPts(0, .95 * s, .22 * s, .22 * s, 8), { wash: dark, ink: null });
        break;
      case 'ladle':
        paint(P([[-.1, -1.3], [.1, -1.3], [.1, .3], [-.1, .3]]), { wash: metal, ink, sw: sw * .5 });
        paint(ellPts(0, .75 * s, .6 * s, .5 * s, 14), { wash: metal, ink, sw: sw * .6 });
        break;
    }
    pop();
  };

  // A page (a document). (x, y) = centre, s = unit (page 3s × 4s). o: rot, gold (0..1: a glowing, chosen source),
  // dim (0..1: a rejected page), glowA (deep water light)
  SEA.page = (x, y, s, o = {}) => {
    boilSeed(`page ${o.key || ''}`);
    const sw = clamp(s / 14, .35, 1.2);
    push(); translate(x, y); rotate(o.rot || 0); scale(o.sx ?? 1, 1);
    if (o.glowA > .01) glow(0, 0, 4.5 * s, '#FFE0A0', o.glowA);
    const dim = clamp(o.dim || 0), gold = clamp(o.gold || 0);
    const col = mixCol(mixCol(C.cream, '#C9C2B4', dim), '#FFF1CC', gold);
    const P = [[-1.5, -2], [.9, -2], [1.5, -1.4], [1.5, 2], [-1.5, 2]].map(([a, b]) => [a * s, b * s]);
    paint(P, { wash: col, ink: gold > .3 ? C.gold : PAL.ink, sw: sw * (gold > .3 ? 1.6 : .7) });
    paint([[.9 * s, -2 * s], [.9 * s, -1.4 * s], [1.5 * s, -1.4 * s]], { wash: mixCol(C.paperDk, '#B7AE9D', dim), ink: PAL.ink, sw: sw * .5 });
    const lc = mixCol(C.deep3, '#9A958A', dim);
    for (let i = 0; i < 4; i++) { const w = i === 3 ? .55 : .9 + .2 * hash(i + (o.seed || 0)); inkLine([[-1.05 * s, (-1.2 + i * .75) * s], [(-1.05 + w * 2) * s, (-1.2 + i * .75) * s]], sw * .55, lc, 'inkfine', 0); }
    if (o.mark) paint(ellPts(.9 * s, 1.35 * s, .35 * s, .35 * s, 10), { wash: o.mark, ink: null });
    pop();
  };

  // ---------- the world ----------
  // Water colour by depth (world y): the shallows ARE the paper; the deep is the site's green-black.
  SEA.depthCol = (d) => d < .5 ? mixCol(PAL.paper, C.sageLt, d * 2 * .6) : mixCol(mixCol(PAL.paper, C.sageLt, .6), C.deep, (d - .5) * 2);
  // Paint water between world y0 and y1 with depth d0 → d1: stacked wash layers with wavy, hand-cut top edges (a
  // woodblock bokashi), only where the camera sees.
  SEA.water = (y0, y1, d0, d1, x0 = -700, x1 = W + 700, n = 14, t = 0) => {
    for (let i = 0; i < n; i++) {
      const a = lerp(y0, y1, i / n), d = lerp(d0, d1, (i + .5) / n);
      if (d < .02) continue;
      boilSeed('water' + i);
      const top = []; for (let k = 0; k <= 12; k++) top.push([lerp(x0, x1, k / 12), a + 14 * Math.sin(k * 1.3 + i * 2 + t * .4) + jit(2)]);
      paint(top.concat([[x1, y1 + 900], [x0, y1 + 900]]), { wash: SEA.depthCol(d), washOp: 255, ink: null });
    }
  };
  // Soft light shafts from the surface (pale gold fills, slowly swaying).
  SEA.rays = (t, x0, y0, len, a = 1, n = 5, col = C.goldLt) => {   // keep len ≲ 1000: huge bleeding fills get clipped into slabs
    for (let i = 0; i < n; i++) {
      boilSeed('ray' + i);
      const x = x0 + (i - n / 2) * 260 + 60 * Math.sin(t * .3 + i), w = 70 + 60 * hash(i + 4), sk = 180 + 80 * hash(i);
      paint([[x, y0], [x + w, y0], [x + w + sk, y0 + len], [x + sk - w * .6, y0 + len]], { fill: col, fillOp: (60 + 50 * hash(i + 1)) * a * (.75 + .25 * Math.sin(t * .8 + i * 2)), bleed: .3, tex: .3, border: .1, ink: null });
    }
  };
  // Drifting motes (tiny specks of plankton), in a world rectangle.
  SEA.motes = (t, x0, y0, w, h, n = 30, col = C.sage, op = 180) => {
    boilSeed('motes');
    for (let i = 0; i < n; i++) {
      const x = x0 + frac(hash(i) + t * (.004 + .006 * hash(i + 7))) * w, y = y0 + frac(hash(i + 3) - t * (.01 + .01 * hash(i + 9))) * h, r = 2 + 4 * hash(i + 5);
      paint(ellPts(x, y, r, r, 6), { wash: col, washOp: op * (.5 + .5 * Math.sin(t * 2 + i)), ink: null });
    }
  };
  // Decorative current: three parallel wavy strokes (the woodblock sign for flowing water), drifting.
  SEA.current = (t, x, y, len, col = C.sage, sw = 1.2, key = 'cur', dir = 1) => {
    if (len < 8) return;
    for (let r = 0; r < 3; r++) {
      boilSeed(key + r);
      const L = len * (1 - r * .22), x0 = x + dir * r * len * .08, pts = [];
      for (let k = 0; k <= 12; k++) { const q = k / 12; pts.push([x0 + dir * q * L, y + r * 16 + Math.sin(q * 7 + t * 1.3 + r) * 9]); }
      inkLine(pts, sw * (1 - r * .25), col, 'ink', .7);
    }
  };
  // Seaweed: a swaying ribbon rooted at (x, y).
  SEA.weed = (t, x, y, h, w, col = C.sage, key = 'weed', ph = 0) => {
    boilSeed(key);
    const pts = []; for (let k = 0; k <= 6; k++) { const q = k / 6; pts.push([x + Math.sin(t * 1.2 + ph - q * 2.5) * 26 * q * (h / 300), y - q * h]); }
    paint(ribbonF(pts, q => w * (1 - q * .8)), { wash: col, washOp: 255, fill: mixCol(col, PAL.ink, .25), fillOp: 60, tex: .5, ink: PAL.ink, sw: .7 });
  };
  // Rising bubbles from a point (for a swim stroke or a surprise).
  SEA.bubbles = (t, x, y, n = 5, spread = 30, key = 'bub', col = C.cream) => {
    boilSeed(key);
    for (let i = 0; i < n; i++) {
      const ph = frac(t * .7 + hash(i)), r = 4 + 7 * hash(i + 2);
      const bx = x + (hash(i + 9) - .5) * spread + Math.sin(t * 3 + i) * 8, by = y - ph * 260;
      if (ph > .95) continue;
      paint(ellPts(bx, by, r, r, 10), { wash: col, washOp: 200 * (1 - ph), ink: PAL.ink, sw: .45 });
    }
  };
  // A seabed of sand with pebbles, between x0..x1 at world y.
  SEA.seabed = (x0, x1, y, col = C.sand, key = 'bed') => {
    boilSeed(key);
    const pts = []; for (let i = 0; i <= 14; i++) pts.push([lerp(x0, x1, i / 14), y + Math.sin(i * 1.7) * 18 + jit(3)]);
    pts.push([x1, y + 900], [x0, y + 900]);
    paint(pts, { wash: col, washOp: 255, fill: C.sandDk, fillOp: 70, tex: .6, border: .5, ink: null });
    inkLine(pts.slice(0, 15), 1.1, PAL.ink, 'ink', .5);
    for (let i = 0; i < 9; i++) paint(ellPts(lerp(x0, x1, hash(i + 40)), y + 60 + 120 * hash(i + 41), 10 + 14 * hash(i + 42), 7 + 8 * hash(i + 43), 10), { wash: C.sandDk, ink: PAL.ink, sw: .5 });
  };

  // ---------- transitions ----------
  // A page turns over the frame, right to left: p 0 → .5 it covers the frame (cut under it at .5), .5 → 1 it slides off
  // to the left, uncovering the next shot. Screen space; call it last.
  SEA.pageTurn = (p, col = '#FBF4E6') => {
    if (p <= 0 || p >= 1) return;
    const e1 = lerp(W + 60, -260, ease(clamp(p * 2))), e2 = p < .5 ? W + 300 : lerp(W + 300, -260, ease((p - .5) * 2));
    const L = p < .5 ? e1 : -260, R = e2;
    if (R - L < 4) return;
    boilSeed('turn');
    const curl = 60 + 60 * Math.sin(Math.PI * p);
    // shadow cast on the frame beside the moving edge
    const edge = p < .5 ? L : R, dir = p < .5 ? -1 : 1;
    paint([[edge, -40], [edge + dir * 110, -40], [edge + dir * 70, H + 40], [edge, H + 40]], { fill: PAL.ink, fillOp: 70, bleed: .3, tex: .2, ink: null });
    const P = [[L, -60], [R, -60], [R, H + 60], [L, H + 60]];
    paint(P, { wash: col, washOp: 255, ink: null });
    for (let i = 0; i < 9; i++) {   // the document's lines ride on the page
      const y = 170 + i * 92, x0 = Math.max(L + 40, (p < .5 ? L : R - W - 300) + 260), x1 = Math.min(R - 40, x0 + 900 + 300 * hash(i));
      if (x1 - x0 > 30) inkLine([[x0, y], [(x0 + x1) / 2, y + jit(2)], [x1, y]], 1.4, i === 0 ? SEA.C.verm : SEA.C.deep3, 'inkfine', 0);
    }
    // the curl: the page's underside, a darker flap along the moving edge
    const flap = [[edge, -60], [edge - dir * curl, -20], [edge - dir * curl * 1.1, H * .5], [edge - dir * curl, H + 20], [edge, H + 60]];
    paint(flap, { wash: '#E3D6BC', fill: SEA.C.sandDk, fillOp: 90, tex: .5, ink: PAL.ink, sw: 1.2, curv: .5 });
    inkLine([[edge, -60], [edge, H * .5], [edge, H + 60]], 1.6, PAL.ink, 'ink', 0);
  };

  // ---------- model sheet (node render.mjs --loop=cast --sheet=...) ----------
  LOOPS.cast = t => {
    SEA.rays(t, 900, -100, 1200, .6);
    SEA.jelly(360, 420, 28, { ...feel('happy', t), vx: 0 });
    SEA.jelly(760, 330, 14, { ...feel('neutral', t), pal: SEA.MINI.intake, holdR: (x, y) => SEA.icon('doc', x + 10, y + 16, 12) });
    SEA.jelly(760, 640, 14, { ...feel('determined', t), pal: SEA.MINI.guard });
    SEA.jelly(960, 330, 14, { ...feel('thinking', t), pal: SEA.MINI.retrieve });
    SEA.jelly(960, 640, 14, { ...feel('surprised', t), pal: SEA.MINI.triage });
    SEA.seahorse(1260, 520, 30, { ...feel('sad', t), fin: 1, emote: 'sweat' });
    SEA.octo(1620, 700, 34, { ...feel('happy', t), eyes: 'happy', wave: .8 });
    SEA.butterfly(400, 860, 24, { patches: [1, 1, .6, 0], unknown: 1, flap: 0 }); SEA.butterfly(200, 900, 16, { crumple: 1, eyes: "sad", flap: .34, key: 2 });
    SEA.bottle(760, 900, 20, 'grid');
    SEA.bottle(900, 900, 20, 'doc');
    SEA.page(1060, 900, 26, { gold: 1 });
    SEA.eel(1450, 970, 16, {});
    SEA.SEA_TOOLS_SHOW && 0;
    for (let i = 0; i < 6; i++) SEA.tool(SEA.TOOLS[i], 1620 + (i % 3) * 90, 180 + Math.floor(i / 3) * 120, 22);
  };
  LOOPS.cast.len = 4;
})();
