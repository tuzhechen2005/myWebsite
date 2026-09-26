// c1_archive.js · 一 10–27.5 s · Enterprise RAG, as a sunken archive. Page towers (documents) on the left, a reef of
// tables (structured data) behind a locked gate on the right. Jelly routes questions to the right store, fetches with a
// keyword net + a meaning whirlpool, reranks through a sieve, and the gate's lock stops an eel with a skeleton key.
(() => {
  const { C, jelly, bottle, page, icon, current, motes, rays, bubbles, vel, lumpy, ribbonF, qbez } = SEA;
  const K = CUE.ch.arc, FLOOR = 980;

  // ---------- the world ----------
  const TOWERS = [[110, 640, 0], [330, 780, 1], [560, 560, 2]];
  function tower(t, bx, h, id) {
    const n = Math.floor(h / 30);
    for (let i = 0; i < n; i++) {
      boilSeed(`tw${id}.${i}`);
      const q = i / n, sway = Math.sin(t * .8 + id * 2) * 22 * q * q, w = 150 + 34 * hash(id * 50 + i), x = bx + sway + (hash(id * 70 + i) - .5) * 22, y = FLOOR - i * 30;
      const rot = (hash(id * 90 + i) - .5) * .09, P = rectPts(-w / 2, -26, w, 26).map(p => SEA.rotP([x + p[0], y + p[1]], rot, [x, y]));
      paint(P, { wash: i % 3 ? C.cream : '#F4E9D3', ink: PAL.ink, sw: .7 });
      if (hash(id * 11 + i) < .22) { const tx = x + w / 2 - 8 - 30 * hash(i); paint(rectPts(tx, y - 40, 16, 20), { wash: [C.verm, C.gold, C.sage][i % 3], ink: PAL.ink, sw: .5 }); }
      inkLine([[x - w / 2 + 12, y - 12], [x, y - 13], [x + w / 2 - 12, y - 12]], .45, C.deep3, 'inkfine', .3);
    }
  }
  const BLOCKS = [[1250, 600, 260, 210, C.sage], [1500, 460, 300, 280, C.deep3], [1720, 700, 240, 280, C.sage], [1210, 810, 250, 170, C.deep3]];
  function tableBlock(x, y, w, h, head, id) {
    boilSeed('blk' + id);
    paint(rectPts(x, y, w, h, 2), { wash: '#EEF1E8', ink: PAL.ink, sw: .9 });
    paint(rectPts(x, y, w, h * .2), { wash: head, ink: null });
    const cols = Math.round(w / 70), rows = Math.round(h / 44);
    for (let c = 1; c < cols; c++) inkLine([[x + c * w / cols, y], [x + c * w / cols, y + h * .5], [x + c * w / cols, y + h]], .5, PAL.ink, 'inkfine', 0);
    for (let r = 1; r < rows; r++) inkLine([[x, y + r * h / rows], [x + w * .5, y + r * h / rows], [x + w, y + r * h / rows]], .5, PAL.ink, 'inkfine', 0);
    for (let k = 0; k < 3; k++) { const cx = x + (hash(id * 5 + k) * (cols - 1) + .5) * w / cols, cy = y + (hash(id * 7 + k) * (rows - 2) + 1.5) * h / rows; paint(ellPts(cx, cy, 8, 5, 8), { wash: k ? C.gold : C.verm, ink: null }); }
  }
  const GATE = [1560, FLOOR];
  function gate(t, lockK, shake) {
    const [gx, gy] = GATE;
    boilSeed('gate');
    const arch = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + Math.PI * i / 14; arch.push([gx + Math.cos(a) * 120, gy - 170 + Math.sin(a) * 110]); }
    const outer = [[gx - 150, gy], ...arch.map(([x, y]) => [gx + (x - gx) * 1.25, gy - 170 + (y - gy + 170) * 1.25]), [gx + 150, gy]];
    paint(outer, { wash: C.deep3, fill: C.deep2, fillOp: 90, tex: .6, ink: PAL.ink, sw: 1.1 });
    paint([[gx - 120, gy], ...arch, [gx + 120, gy]], { wash: '#2A4A43', ink: PAL.ink, sw: .8 });
    for (let i = -2; i <= 2; i++) inkLine([[gx + i * 44, gy - 5], [gx + i * 44, gy - 160 - (2 - Math.abs(i)) * 30]], 2.2, C.sageLt, 'ink', 0);
    // the padlock: open (shackle up) → snaps shut
    boilSeed('lock');
    const [dx, dy] = shake, lx = gx + dx, ly = gy - 150 + dy, up = 22 * (1 - lockK);
    paint(SEA.ribbonF([[lx - 22, ly - 18 - up], [lx - 22, ly - 50 - up], [lx, ly - 66 - up], [lx + 22, ly - 50 - up], [lx + 22, ly - 18 - (lockK > .5 ? 0 : up)]], () => 11, 4), { wash: '#A9B6B2', fill: '#7F8F8C', fillOp: 60, ink: PAL.ink, sw: .7 });
    paint(rrPts(lx - 38, ly - 26, 76, 62, 12), { wash: C.gold, fill: C.ochreDk, fillOp: 60, ink: PAL.ink, sw: 1.1 });
    paint([[lx - 6, ly + 4], [lx + 6, ly + 4], [lx + 4, ly + 22], [lx - 4, ly + 22]], { wash: PAL.ink, ink: null });
    paint(ellPts(lx, ly + 2, 9, 9, 10), { wash: PAL.ink, ink: null });
  }
  function school(t, n, cx, cy, key) {   // pages swimming as a school of fish
    for (let i = 0; i < n; i++) {
      const ph = t * .12 + i / n, x = cx + ((frac(ph) * 2400) - 1200), y = cy + Math.sin(ph * 9 + i) * 40 + (i % 3) * 36;
      page(x, y, 9 + 2 * hash(i), { rot: .15 * Math.sin(t * 3 + i), sx: Math.cos(t * 6 + i * 1.7) > 0 ? 1 : .35, key: key + i, seed: i });
    }
  }
  function world(t, o = {}) {
    SEA.water(-700, 1300, .16, .5, -500, 2400, 12, t);
    rays(t, 900, -500, 900, .55);
    school(t, 9, 960, 170, 'sch');
    for (const [i, x, y, len, d] of [[0, 760, 80, 260, 1], [1, 1300, 300, 240, -1], [2, 880, 760, 200, 1]]) current(t + i, x, y, len, C.sage, 1.1, 'ac' + i, d);
    for (const [x, h, id] of TOWERS) tower(t, x, h, id);
    for (let i = 0; i < BLOCKS.length; i++) tableBlock(...BLOCKS[i].slice(0, 4), BLOCKS[i][4], i);
    gate(t, o.lockK || 0, o.shake || [0, 0]);
    SEA.seabed(-500, 2400, FLOOR, C.sand, 'arcbed');
    SEA.weed(t, 760, FLOOR + 10, 230, 30, C.sage, 'aw1', 0); SEA.weed(t, 800, FLOOR + 10, 170, 24, C.deep3, 'aw2', 1.3);
    SEA.weed(t, 1110, FLOOR + 10, 260, 28, C.deep3, 'aw3', 2.1); SEA.weed(t, 1880, FLOOR + 10, 200, 28, C.sage, 'aw4', .6);
    motes(t, -300, -400, 2500, 1500, 30, C.sage, 150);
  }

  // ---------- Jelly's path through the chapter ----------
  const jPos = t => {
    const a = t - K;
    let x = 960, y = lerp(-420, 470, easeOut(seg(a, 0, 1.1)));
    y += 12 * Math.sin(t * 1.4) * seg(a, 1.2, 2);
    y += 50 * ease(seg(a, 3.8, 4.4));                               // settles into the router spot
    x = lerp(x, 700, ease(seg(t, 18.75, 19.4))); y -= 20 * ease(seg(t, 18.75, 19.4));
    x = lerp(x, 1150, ease(seg(t, 24.35, 25.1))); y += 70 * ease(seg(t, 24.35, 25.1));
    return [x, y];
  };
  const camAt = t => {
    // S1 wide descent → S2 router → S3 towers → S4 gate
    const s1 = [960, lerp(40, 470, easeOut(seg(t, K, K + 1.6))), .92];
    const s2 = [960, 500, 1.28], s3 = [650, 470, 1.22], s4 = [1330, 600, 1.2];
    let c = s1;
    c = c.map((v, i) => lerp(v, s2[i], ease(seg(t, 13.6, 14.3))));
    c = c.map((v, i) => lerp(v, s3[i], ease(seg(t, 18.75, 19.5))));
    c = c.map((v, i) => lerp(v, s4[i], ease(seg(t, 24.35, 25.15))));
    return [c[0] + 6 * Math.sin(t * .5), c[1] + 5 * Math.sin(t * .37), c[2] + .01 * Math.sin(t * .3)];
  };

  // ---------- S2 router: questions sorted to the right store ----------
  const ROUTE = [[14.2, 15.0, 'doc'], [15.45, 16.25, 'grid'], [16.35, 16.875, 'doc'], [16.95, 17.5, 'grid'], [17.45, 17.8125, 'doc']];
  const DEST = { doc: [420, 520], grid: [1480, 600] };
  function routeBottles(t, J) {
    let reach = null;
    ROUTE.forEach(([ta, tf, ic], i) => {
      if (t < ta - .9 || t > tf + 1.2) return;
      const left = ic === "doc", rest = [J[0] + (left ? 40 : -40), J[1] - 290];
      let p, rot = .15 * Math.sin(t * 2 + i), fly = 0;
      if (t < ta) p = [rest[0] + 30 * Math.sin(i * 2 + t), lerp(J[1] - 900, rest[1], easeOut(seg(t, ta - .9, ta)))];
      else if (t < tf) p = [rest[0] + 3 * Math.sin((t - ta) * 9), rest[1] + 8 * Math.sin((t - ta) * 5)];
      else { fly = seg(t, tf, tf + .55); p = arcPt(rest, DEST[ic], 240, easeOut(fly)); rot += (left ? -1 : 1) * 6.5 * easeOut(fly); }
      if (fly < 1) bottle(p[0], p[1], 30 * (1 - .45 * fly), ic, { rot, key: 'rb' + i });
      // it lands: a ring of light where the store takes it in
      const land = seg(t, tf + .55, tf + 1.1);
      if (land > 0 && land < 1) { boilSeed('land' + i); inkLine(ellPts(DEST[ic][0], DEST[ic][1], 30 + 110 * easeOut(land), 20 + 70 * easeOut(land), 26), 3 * (1 - land), C.gold, 'ink', .6); glow(DEST[ic][0], DEST[ic][1], 120, C.goldLt, 1 - land); }
      if (t > tf - .28 && t < tf + .15) reach = { x: rest[0] + (left ? 55 : -55), y: rest[1] + 25, k: seg(t, tf - .28, tf - .04) * (1 - seg(t, tf + .03, tf + .15)), side: left ? 'R' : 'L', left };
    });
    return reach;
  }
  // ---------- S3: net + whirlpool + sieve ----------
  const NET = { cast: 19.375, hit: 19.95, back: 20.6 }, WHIRL = { start: 20.625, end: 21.8 }, SIEVE = { fill: 21.875, s1: 22.5, s2: 23.125, rise: 23.2, pick: 23.75 };
  const NETPAGES = [0, 1, 2, 3, 4], WHPAGES = [5, 6, 7, 8], GOLD = [1, 6, 3];
  const sieveShake = t => [SIEVE.s1, SIEVE.s2].reduce((acc, s0) => acc + (t > s0 ? 18 * Math.exp(-(t - s0) * 6) * Math.sin((t - s0) * 55) : 0), 0);
  const sieveAt = (t, J) => [J[0] + sieveShake(t), J[1] + 250];
  function retrieval(t, J) {
    const out = { reachL: null, reachR: null, holdL: null, holdR: null };
    const netTarget = [300, 420], sv = sieveAt(t, J);
    // the net: flung from the left tentacle to the tower, closes on a clump of pages, hauled back
    const tipRest = [J[0] - 170, J[1] + 120];
    let netP = null, netR = 0;
    if (t > NET.cast && t < SIEVE.fill + .3) {
      if (t < NET.hit) netP = arcPt(tipRest, netTarget, 120, easeOut(seg(t, NET.cast, NET.hit)));
      else if (t < NET.back) netP = netTarget.map((v, i) => lerp(v, [J[0] - 140, J[1] + 40][i], ease(seg(t, NET.hit + .15, NET.back))));
      else netP = [lerp(J[0] - 140, sv[0] - 40, ease(seg(t, SIEVE.fill - .3, SIEVE.fill))), lerp(J[1] + 40, sv[1] - 90, ease(seg(t, SIEVE.fill - .3, SIEVE.fill)))];
      netR = t < NET.hit ? lerp(30, 160, easeOut(seg(t, NET.cast, NET.hit))) : lerp(160, 100, ease(seg(t, NET.hit, NET.hit + .3)));
      out.reachL = { x: netP[0] + 20, y: netP[1] - netR * .6, k: 1 };
    }
    // the whirlpool
    const wc = [J[0] + 330, J[1] - 60], wk = seg(t, WHIRL.start, WHIRL.start + .35) * (1 - seg(t, WHIRL.end - .2, WHIRL.end + .2));
    if (wk > 0) {
      for (let r = 0; r < 3; r++) {
        boilSeed('wh' + r);
        const pts = []; for (let k = 0; k <= 22; k++) { const q = k / 22, a = q * 9 + r * 2.1 - t * 7, rr = (18 + 190 * q) * wk; pts.push([wc[0] + Math.cos(a) * rr, wc[1] + Math.sin(a) * rr * .7]); }
        inkLine(pts, 1.6 - r * .3, r ? C.sage : C.deep3, 'ink', .7);
      }
      out.reachR = { x: wc[0] - 60, y: wc[1] + 60, k: wk };
    }
    // pages: net pages ride in the net; whirl pages spiral in; all fall into the sieve, get shaken, 3 rise gold
    for (let i = 0; i < 9; i++) {
      const gi = GOLD.indexOf(i), isNet = i < 5;
      let p, rot = 0, s = 15, o = { key: 'rp' + i, seed: i };
      if (t < SIEVE.fill) {
        if (isNet) {
          const home = [netTarget[0] + (i - 2) * 44, netTarget[1] + (i % 2) * 50 - 25];
          p = t < NET.hit ? home : netP ? [netP[0] + (i - 2) * 28 + 4 * Math.sin(t * 5 + i), netP[1] + (i % 2) * 30 - 14] : home;
          rot = .3 * Math.sin(i * 2 + t * 2);
        } else {
          const k = seg(t, WHIRL.start + .1 + (i - 5) * .12, WHIRL.end - .1), a = (1 - k) * 7 + i * 1.6 - t * 3, rr = lerp(420, 40, easeIn(k));
          p = [wc[0] + Math.cos(a) * rr, wc[1] + Math.sin(a) * rr * .7]; rot = a;
          if (t > WHIRL.end - .1) p = [lerp(wc[0], sv[0] + 40, ease(seg(t, WHIRL.end - .1, SIEVE.fill))), lerp(wc[1], sv[1] - 80, ease(seg(t, WHIRL.end - .1, SIEVE.fill)))];
        }
      } else {
        const inS = [sv[0] + (i - 4) * 30, sv[1] - 40 - (i % 3) * 18];
        p = inS.map((v, j) => j ? v : v); rot = .4 * Math.sin(i * 3 + t * 6) * (t > SIEVE.s1 ? 1 : .3);
        if (t < SIEVE.fill + .3) p = [p[0], p[1] - 60 * (1 - easeIn(seg(t, SIEVE.fill, SIEVE.fill + .3)))];
        if (gi < 0 && t > SIEVE.s1) {   // rejected: falls through the mesh and sinks, dimming
          const k = seg(t, SIEVE.s1 + (i % 3) * .1, SIEVE.s1 + 1.6 + (i % 3) * .1);
          p = [p[0] + 40 * Math.sin(k * 6 + i), p[1] + 380 * easeIn(k)]; o.dim = seg(t, SIEVE.s1, SIEVE.s1 + .4); rot += k * 3;
        }
        if (gi >= 0 && t > SIEVE.rise) {   // chosen: rises gold into a row above
          const k = backOut(seg(t, SIEVE.rise + gi * .1, SIEVE.rise + .55 + gi * .1)), dest = [J[0] + (gi - 1) * 230, J[1] - 280 - (gi === 1 ? 30 : 0)];
          p = [lerp(p[0], dest[0], k), lerp(p[1], dest[1], k)]; rot = lerp(rot, 0, k); s = lerp(15, 24, k); o.gold = seg(t, SIEVE.rise, SIEVE.rise + .4);
        }
        if (gi === 1 && t > SIEVE.pick) continue;   // the best one is in Jelly's hand now
      }
      page(p[0], p[1], s, { ...o, rot });
      if (o.gold > .5) { boilSeed('gs' + i); for (let k = 0; k < 2; k++) paint(starPts(p[0] + (k ? 34 : -30) * s / 14, p[1] - 40 * s / 14 + 6 * Math.sin(t * 5 + k), (8 + 5 * Math.sin(t * 7 + i + k)) * s / 14, .35, 4), { wash: C.gold, ink: PAL.ink, sw: .4 }); }
    }
    // the net itself (over the pages it holds)
    if (netP) { boilSeed('net'); paint(lumpy(netP[0], netP[1], netR, netR * .75, 3, 18, .1), { hatch: { d: 12, a: .8, o: { rand: .1 }, b: 'HB', c: C.deep3, w: .7 }, ink: C.deep3, sw: .8 }); paint(lumpy(netP[0], netP[1], netR, netR * .75, 3, 18, .1), { hatch: { d: 12, a: -.8, o: { rand: .1 }, b: 'HB', c: C.deep3, w: .7 }, ink: null }); }
    // the sieve (held by both hands while it's in use)
    const svK = seg(t, SIEVE.fill - .5, SIEVE.fill - .1) * (1 - seg(t, SIEVE.pick - .1, SIEVE.pick + .3));
    if (svK > 0) {
      boilSeed('sieve');
      const bowl = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * i / 14; bowl.push([sv[0] - Math.cos(a) * 185, sv[1] - 40 + Math.sin(a) * 115]); }
      push(); translate(0, 40 * (1 - svK));
      paint(bowl, { wash: '#DCE4D8', washOp: 170, hatch: { d: 14, a: .7, o: { rand: .05 }, b: 'HB', c: PAL.ink, w: .5 }, ink: PAL.ink, sw: 1.1 });
      inkLine([[sv[0] - 195, sv[1] - 40], [sv[0], sv[1] - 46], [sv[0] + 195, sv[1] - 40]], 3.5, C.ochreDk, 'ink', .3);
      pop();
      out.reachL = { x: sv[0] - 185, y: sv[1] - 40, k: svK }; out.reachR = { x: sv[0] + 185, y: sv[1] - 40, k: svK };
    }
    if (t > SIEVE.pick - .3) {
      const dest = [J[0], J[1] - 310], k = seg(t, SIEVE.pick - .3, SIEVE.pick);
      out.reachR = { x: lerp(J[0] + 150, dest[0] + 10, k), y: lerp(J[1] - 40, dest[1] + 50, k), k: 1 };
      if (t > SIEVE.pick) out.holdR = (x, y) => page(x - 4, y - 70, 24, { gold: 1, key: 'best', rot: .08 * Math.sin(t * 3) });
    }
    return out;
  }

  // ---------- S4: the eel and the lock ----------
  const EEL = { in: 24.9, bonk: 25.625, out: 26.4 };
  function eelLock(t) {
    if (t < EEL.in - .2) return;
    const g = [GATE[0] + 40, GATE[1] - 150], k = seg(t, EEL.in, EEL.bonk);
    let x = lerp(2150, g[0] + 60, ease(k)), y = lerp(870, g[1], ease(k)) + 20 * Math.sin(t * 5);
    let dazed = 0;
    if (t > EEL.bonk) { const b = seg(t, EEL.bonk, EEL.bonk + .5); x = lerp(g[0] + 60, g[0] + 360, easeOut(b)); y = g[1] - 110 * Math.sin(Math.PI * b) + 40 * b; dazed = 1; }
    SEA.eel(x, y, 30, { len: 12, dazed, eyes: 'narrow', flip: true });
    // the skeleton key in its mouth: flies off on the bonk
    let kp = [x - 36, y + 24], kr = 1.2;
    if (t > EEL.bonk) { const b = seg(t, EEL.bonk, EEL.bonk + .9); kp = arcPt([g[0] + 10, g[1] + 20], [g[0] + 250, FLOOR - 20], 180, b); kr = 1.2 + b * 9; }
    boilSeed('skey'); SEA.tool('key', kp[0], kp[1], 30, kr, '#9DA7A2');
    if (dazed) emote('stars', x + 20, y - 70, 18, 1, t - EEL.bonk);
  }

  function archive(t, lt, dur) {
    const [cx, cy, z] = camAt(t), lockK = backOut(seg(t, EEL.bonk - .08, EEL.bonk + .05));
    const shake = t > EEL.bonk ? shakeXY(t, 10 * Math.exp(-(t - EEL.bonk) * 7)) : [0, 0];
    camBegin(cx + shake[0] * .5, cy + shake[1] * .5, z);
    world(t, { lockK, shake });
    const J = jPos(t), [vx, vy] = vel(jPos, t);
    // mood across the chapter
    const mood = emotions(t, [[K, 'determined'], [K + 1.1, 'surprised', { emote: null }], [K + 1.6, 'starstruck'], [12.6, 'surprised', { lookY: -1, emote: '!' }], [13.2, 'nervous'],
      [14.3, 'thinking', { emote: null }], [17.95, 'proud'], [18.8, 'determined'], [21.9, 'thinking', { emote: null }], [SIEVE.rise + .2, 'happy'], [SIEVE.pick + .05, 'proud'],
      [EEL.in + .2, 'suspicious'], [EEL.bonk + .35, 'smug']], { take: .8 });
    const flip = kf(t, [[K, Math.PI * .96], [K + .55, Math.PI * .96], [K + 1.0, 0]], ease);
    let o = { ...mood, vx, vy, rot: flip, boilKey: 'J', u: 22 };
    // S1: three more bottles rain down; S2: routing
    if (t < 14.6) for (let i = 0; i < 3; i++) { const ta = 12.2 + i * .4, k = seg(t, ta, ta + 2.4); if (k > 0) bottle(700 + i * 330 + 40 * Math.sin(t + i), lerp(-150, 180 + 30 * i, easeOut(k)) - 700 * seg(t, 13.8, 14.4), 18, i % 2 ? 'grid' : 'doc', { rot: .3 * Math.sin(t * 2 + i), key: 'rain' + i }); }
    if (t >= 13.5 && t < 18.75) {
      const r = routeBottles(t, J);
      const cur = ROUTE.find(([ta, tf]) => t > ta - .2 && t < tf + .05);
      if (cur) { o.lookY = t < cur[1] - .1 ? -.9 : 0; o.lookX = t < cur[1] - .1 ? 0 : (cur[2] === 'doc' ? -1 : 1); }
      if (r) { const reach = { x: r.x, y: r.y, k: r.k }; if (r.side === 'R') o.reachR = reach; else o.reachL = reach; o.rot = (r.left ? -1 : 1) * .2 * r.k; o.dx = (r.left ? -1 : 1) * .5 * r.k; }
    }
    if (t >= 18.75 && t < 24.9) Object.assign(o, Object.fromEntries(Object.entries(retrieval(t, J)).filter(([, v]) => v)));
    if (t >= 24.9) {
      o.reachR = { x: lerp(J[0], J[0] + 170, ease(seg(t, 24.35, 25))), y: lerp(J[1] - 260, J[1] - 120, ease(seg(t, 24.35, 25))), k: 1 }; o.holdR = (x, y) => page(x - 4, y - 70, lerp(24, 20, ease(seg(t, 24.35, 25))), { gold: 1, key: 'best', rot: .08 * Math.sin(t * 3) });
      o.lookX = t < EEL.bonk + .35 ? .9 : .4;
      if (t > EEL.bonk + .35) { o.eyes = ['happy', 'normal']; }   // the wink
    }
    jelly(J[0], J[1], 24, o);
    if (t > 24.4) eelLock(t);
    if (t > EEL.bonk - .05 && t < EEL.bonk + .3) { boilSeed('clack'); const k = seg(t, EEL.bonk - .05, EEL.bonk + .3); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r0 = 60 + 60 * k, r1 = r0 + 40 * (1 - k); inkLine([[GATE[0] + Math.cos(a) * r0, GATE[1] - 150 + Math.sin(a) * r0], [GATE[0] + Math.cos(a) * (r0 + r1) / 2, GATE[1] - 150 + Math.sin(a) * (r0 + r1) / 2], [GATE[0] + Math.cos(a) * r1, GATE[1] - 150 + Math.sin(a) * r1]], 2.2 * (1 - k), C.gold, 'ink', 0); } }
    camEnd();
    // out: a giant page turns over the frame (finished by ch.2's first frames)
    if (t > dur + K - .6) SEA.pageTurn((t - (K + dur - .6)) / 1.2);
  }
  shots([[K, archive]]);
})();
