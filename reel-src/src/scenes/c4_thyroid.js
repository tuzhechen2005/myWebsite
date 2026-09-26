// c4_thyroid.js · 四 60–85 s + 尾 85–95 s · UW Surgery thyroid-cancer AI support (the climax) and the signature.
// A worried paper butterfly (the thyroid is butterfly-shaped) sinks to Jelly. A shiny star in a bubble tempts it:
// it's a prop on a stick, and Jelly pops it. Jelly dives to the deep, pulls three glowing sources from their clams on
// gold threads (a fourth clam is empty), rises and stitches each source into a wing. The last panel has no source:
// Jelly remembers the empty clam, shakes its head and hands the butterfly to the surgeon, who completes it.
// Epilogue: the butterfly flies up through the surface; Jelly pops its head out and writes the signature.
(() => {
  const { C, jelly, butterfly, page, octo, current, motes, rays, vel, lumpy, ribbonF, qbez } = SEA;
  const K = CUE.ch.thy, E = CUE.thy, P = CUE.epi;
  const SURF = -420, FLOOR = 2280, HOME = [880, 320];
  const CLAMS = [[600, 2160], [860, 2190], [1130, 2170], [1400, 2185]];
  const BF_WAIT = [1080, 190];

  // ---------- world: the surface above, paper water, the dark deep below ----------
  function world(t, cy) {
    SEA.water(SURF, 2500, .02, 1, -600, 2500, 22, t);
    // the surface: paper "air" above a wavy ink line
    boilSeed('surf');
    const sl = []; for (let k = 0; k <= 16; k++) sl.push([lerp(-600, 2500, k / 16), SURF + 10 * Math.sin(k * 1.4 + t * 1.6)]);
    inkLine(sl, 1.6, C.deep3, 'ink', .6);
    for (let r = 0; r < 5; r++) { boilSeed('sw' + r); const x = 200 + r * 380 + 40 * Math.sin(t * .5 + r); inkLine([[x, SURF + 26], [x + 60, SURF + 20 + 4 * Math.sin(t * 2 + r)], [x + 120, SURF + 26]], .9, C.sage, 'inkfine', .6); }
    rays(t, 960, SURF + 20, 900, .9);
    if (cy < 900) { current(t, 150, 60, 260, C.sage, 1.1, 'fc0', 1); current(t + 1, 1720, 520, 260, C.sage, 1.1, 'fc1', -1); }
    // the deep: dark rock, sleeping clams, bioluminescent specks
    if (cy > 900) {
      boilSeed('rock');
      const rk = []; for (let i = 0; i <= 14; i++) rk.push([lerp(-500, 2400, i / 14), FLOOR - 60 + 40 * Math.sin(i * 2.1) + jit(3)]);
      paint(rk.concat([[2400, FLOOR + 900], [-500, FLOOR + 900]]), { wash: '#10231F', fill: C.deep2, fillOp: 90, tex: .6, ink: PAL.ink, sw: 1 });
      for (let i = 0; i < 26; i++) { boilSeed('bio' + i); const x = hash(i) * 2200 - 150, y = 1450 + hash(i + 3) * 700 + 20 * Math.sin(t + i), tw = .5 + .5 * Math.sin(t * 2 + i * 1.7); glow(x, y, 16 + 12 * tw, i % 3 ? '#9FF0D0' : C.goldLt, .5 * tw); }
      for (let i = 0; i < 5; i++) SEA.weed(t, [200, 470, 1000, 1640, 1880][i], FLOOR - 40, 180 + 60 * hash(i), 22, '#2E5A52', 'dw' + i, i);
    }
    motes(t, -300, SURF, 2500, 2700, 50, C.sage, 130);
  }
  // A clam: open 0..1 lifts the top shell on its hinge; glowK lights what's inside (a source page), empty = nothing.
  function clam(x, y, s, open, glowK, empty, key) {
    boilSeed('clam' + key);
    if (glowK > .02) glow(x, y - 20, 150, C.goldLt, glowK);
    const shell = (up) => { const pts = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; pts.push([x - Math.cos(a) * 80 * s, y - (up ? 1 : -.35) * Math.sin(a) * 44 * s]); } return pts; };
    paint(shell(false), { wash: '#5E7E78', fill: C.deep3, fillOp: 90, ink: PAL.ink, sw: .9 });
    if (open > .05) paint(ellPts(x, y - 4, 70 * s, 18 * s * open, 16), { wash: empty ? '#1B302B' : '#FFF1D2', ink: null });
    push(); translate(x + 80 * s, y); rotate(open * .75); translate(-(x + 80 * s), -y);
    const top = shell(true);
    paint(top, { wash: '#6F948C', fill: C.sage, fillOp: 70, tex: .5, ink: PAL.ink, sw: .9 });
    for (let r = 1; r < 6; r++) inkLine([[x, y - 4], [x - Math.cos(r / 6 * Math.PI) * 70 * s, y - Math.sin(r / 6 * Math.PI) * 38 * s]], .6, '#3F5F58', 'inkfine', 0);
    pop();
  }
  // The temptation: a rainbow bubble holding a glittering star, which turns to show it's a cut-out on a stick.
  function fakeStar(t) {
    if (t < E.bubble - .1 || t > E.shake + 1.8) return null;
    const inK = easeOut(seg(t, E.bubble, E.bubble + .9));
    const bx = lerp(1780, 1320, inK) + 10 * Math.sin(t * 1.3), by = 250 + 16 * Math.sin(t * 1.9);
    const popK = seg(t, E.poke, E.poke + .35);
    // the star: front (gold, sparkling) → edge → back (grey card, tape, a stick)
    const tk = seg(t, E.turn, E.turn + .45), view = tk < .33 ? 'front' : tk < .66 ? 'edge' : 'back';
    let sx = bx, sy = by, srot = .1 * Math.sin(t * 2);
    if (popK > 0) { const f = seg(t, E.poke + .1, E.poke + 1.9); sx += 60 * Math.sin(f * 7) * (1 - f); sy += 700 * easeIn(f); srot = f * 2.2; }
    boilSeed('star');
    push(); translate(sx, sy); rotate(srot);
    if (view !== 'front') inkLine([[0, 30], [4, 150], [2, 260]], 7, '#9A6B3E', 'ink', .2);   // the stick it's propped on
    const flop = popK > 0 ? .35 : 1;
    if (view === 'front') { paint(starPts(0, 0, 95, .45, 5), { wash: '#F6C94C', fill: C.gold, fillOp: 70, ink: PAL.ink, sw: 1.1 }); for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.6; paint(starPts(Math.cos(a) * 120, Math.sin(a) * 90, 14 + 6 * Math.sin(t * 9 + i), .35, 4), { wash: C.cream, ink: PAL.ink, sw: .4 }); } }
    else if (view === 'edge') paint(rectPts(-10, -95, 20, 190), { wash: '#C9B892', ink: PAL.ink, sw: 1 });
    else { push(); scale(1, flop); paint(starPts(0, 0, 95, .45, 5), { wash: '#B9B1A1', fill: '#9C9486', fillOp: 60, tex: .6, ink: PAL.ink, sw: 1.1 }); paint(rectPts(-40, -12, 80, 24), { wash: '#E8E0C8', washOp: 220, ink: PAL.ink, sw: .5 }); pop(); }
    pop();
    // the bubble
    if (popK < 1) {
      boilSeed('bubble');
      const R = 185 * (1 + .03 * Math.sin(t * 3)) * (1 + .25 * popK);
      if (popK === 0) {
        paint(ellPts(bx, by, R, R, 36), { wash: '#EAF2F4', washOp: 70, ink: null });
        const cols = ['#E88AA8', '#F2C45A', '#7FC8C0', '#A994CB'];
        for (let i = 0; i < 4; i++) { const a0 = t * .6 + i * TAU / 4, arc = []; for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * 1.4; arc.push([bx + Math.cos(a) * R, by + Math.sin(a) * R]); } inkLine(arc, 4, cols[i], 'ink', .7); }
        inkLine(ellPts(bx, by, R, R, 36).concat([[bx + R, by]]), .9, PAL.ink, 'inkfine', .6);
        paint(lumpy(bx - R * .45, by - R * .5, 40, 16, 1, 12, .05).map(p => SEA.rotP(p, -.6, [bx - R * .45, by - R * .5])), { wash: C.cream, washOp: 230, ink: null });
      } else for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = R * (1 + .5 * popK); paint(ellPts(bx + Math.cos(a) * r, by + Math.sin(a) * r, 9 * (1 - popK), 9 * (1 - popK), 8), { wash: '#DDEEF0', ink: PAL.ink, sw: .5 }); }
    }
    return [bx, by];
  }
  const thread = (pts, a = 1, key = 'th') => { if (a <= .02) return; boilSeed(key); inkLine(pts, 2.4 * a, C.gold, 'ink', .6); for (let i = 1; i < pts.length; i += 2) glow(pts[i][0], pts[i][1], 26, C.goldLt, .45 * a); };
  // thread from a point down to a clam, sagging a little
  const threadTo = (p, c, t, i) => { const m = [(p[0] + c[0]) / 2 + 40 * Math.sin(t * .8 + i), (p[1] + c[1]) / 2]; return through([p, m, [c[0], c[1] - 30]], 5); };

  // ---------- paths ----------
  const jPos = t => {
    let x = HOME[0] + 10 * Math.sin(t * 1.1), y = HOME[1] + 8 * Math.sin(t * 1.6);
    const dv = seg(t, E.dive, E.deep - .2), up = seg(t, E.rise, E.back);
    y += (1880 - HOME[1]) * (Math.pow(dv, 1.5) * (1 - up) + 0) - (1880 - HOME[1]) * 0;
    if (t > E.rise) y = lerp(1880, HOME[1], ease(up));
    if (t > E.dive && t < E.rise) x = lerp(x, 1010, ease(dv));
    if (t > E.rise) x = lerp(1010, HOME[0], ease(up)) + 10 * Math.sin(t * 1.1);
    if (t > E.octo) x += 90 * ease(seg(t, E.octo, E.hand)) - 90 * ease(seg(t, E.fly, E.fly + 1));
    if (t > P.up) { const k = ease(seg(t, P.up + .8, P.surface + .6)); x = lerp(x, 1330, k); y = lerp(y, SURF + 22, k); }
    if (t > P.dive) y += 520 * easeIn(seg(t, P.dive, P.dive + .5));
    return [x, y];
  };
  const bPos = t => {   // the butterfly
    if (t < E.surface) { const k = seg(t, K + .2, E.surface); return [lerp(1330, 1010, easeOut(k)) + 30 * Math.sin(t * 5), lerp(-1000, SURF - 10, k)]; }
    if (t < E.land) { const k = seg(t, E.surface, E.land), J = jPos(E.land); return [lerp(1010, J[0] - 175, ease(k)) + 50 * Math.sin(t * 2.6) * (1 - k), lerp(SURF - 10, J[1] + 40, ease(k))]; }
    if (t < E.dive - .15) { const J = jPos(t); return null; }
    if (t < E.hand) { const k = seg(t, E.dive - .15, E.dive + .4), J = jPos(E.dive - .15); return [lerp(J[0] - 175, BF_WAIT[0], ease(k)) + 8 * Math.sin(t * 2), lerp(J[1] + 40, BF_WAIT[1], ease(k)) + 10 * Math.sin(t * 1.7)]; }
    if (t < E.fly) { const k = ease(seg(t, E.hand, E.hand + .8)); return [lerp(BF_WAIT[0], 730, k) + 8 * Math.sin(t * 2), lerp(BF_WAIT[1], 250, k) + 10 * Math.sin(t * 1.7)]; }
    const k = seg(t, E.fly, P.surface + 2.6); return [lerp(730, 1010, ease(k)) + 60 * Math.sin(t * 2.2) * k, lerp(250, SURF - 1900, Math.pow(k, 1.25))];
  };
  const octoPos = t => [lerp(380, 500, ease(seg(t, E.octo - .6, E.hand))), lerp(1150, 610, easeOut(seg(t, E.octo - .6, E.hand))) + 10 * Math.sin(t * 1.4) + 700 * easeIn(seg(t, P.up + 1.5, P.surface + 1))];
  const camAt = t => {
    let cx = 960, cy, z = 1.12;
    if (t < E.land) { const bb = bPos(t); cy = Math.max(SURF - 120, Math.min(260, bb[1] + 160)); }
    else if (t < E.dive) cy = 260;
    else if (t < E.rise) cy = Math.max(260, Math.min(1930, jPos(t - .12)[1] + 40));
    else if (t < E.back) cy = Math.max(260, jPos(t - .1)[1] - 40);
    else cy = 260;
    if (t > E.deep - .5 && t < E.rise) { z = lerp(1.12, 1.22, seg(t, E.deep - .5, E.deep)); cx = 1000; }
    if (t > E.back - .3) z = lerp(1.12, 1.24, ease(seg(t, E.back - .3, E.s1)));
    if (t > E.notice - .3) { z = lerp(1.24, 1.1, ease(seg(t, E.notice - .3, E.octo))); cx = lerp(960, 860, ease(seg(t, E.octo - .5, E.hand))); cy = lerp(260, 330, ease(seg(t, E.octo - .5, E.hand))); }
    if (t > E.fly) { const k = ease(seg(t, E.fly, P.surface)); cy = lerp(330, SURF - 280, k); cx = lerp(cx, 960, k); z = lerp(z, 1, k); }
    return [cx, cy + 4 * Math.sin(t * .5), z];
  };

  // ---------- the pages (sources) ----------
  const PULL = [E.c1, E.c2, E.c3], STITCH = [E.s1, E.s2, E.s3];
  const orbit = (i, J, t) => [J[0] + [-190, 0, 190][i], J[1] + [-10, -250, -10][i] + 8 * Math.sin(t * 2 + i)];
  const patchAt = (i, b, s) => [b[0] + [-3.4, 3.4, -2.7, 2.7][i] * s * .85, b[1] + [-2.6, -2.6, 2.4, 2.4][i] * s];
  function pagesAndThreads(t, J, b, bs) {
    for (let i = 0; i < 3; i++) {
      if (t < PULL[i] - .3) continue;
      const c = CLAMS[i], out = [c[0], c[1] - 110];
      let p, sc = 13, gone = false;
      if (t < PULL[i] + .35) p = [c[0], lerp(c[1] - 20, out[1], easeOut(seg(t, PULL[i] - .1, PULL[i] + .35)))];
      else if (t < STITCH[i] - .4) { const o = orbit(i, J, t), k = ease(seg(t, PULL[i] + .35, PULL[i] + .9)); p = [lerp(out[0], o[0], k), lerp(out[1], o[1], k)]; sc = lerp(13, 16, k); }
      else { const o = orbit(i, J, STITCH[i] - .4), tgt = patchAt(i, b, bs), k = ease(seg(t, STITCH[i] - .4, STITCH[i])); p = [lerp(o[0], tgt[0], k), lerp(o[1], tgt[1], k)]; sc = lerp(16, 4, k); gone = t > STITCH[i]; }
      const end = gone ? patchAt(i, b, bs) : p;
      const fade = 1 - seg(t, E.fly + .2 + i * .15, E.fly + 1.4 + i * .15);   // once it flies, the threads let go as light
      if (fade <= 0) continue;
      thread(threadTo(end, c, t, i), (gone ? .8 : 1) * fade, 'th' + i);
      if (fade < 1) glow(end[0], end[1], 60, C.goldLt, fade);
      if (!gone) page(p[0], p[1], sc, { gold: 1, glowA: t < E.rise + .8 ? .9 : .4, key: 'src' + i, rot: .08 * Math.sin(t * 2 + i), seed: i });
    }
  }

  function thyroid(t) {
    const [cx, cy, z] = camAt(t);
    camBegin(cx, cy, z);
    world(t, cy);
    // clams (only when the deep is in view)
    if (cy > 900) for (let i = 0; i < 4; i++) {
      const tt = i < 3 ? PULL[i] : E.c4, open = ease(seg(t, tt - .35, tt - .05));
      clam(...CLAMS[i], 1.25, open, i < 3 ? open * (1 - .6 * seg(t, tt + .4, tt + 1.2)) : 0, i === 3, i);
      if (i === 3 && t > E.c4) { boilSeed('silt'); const k = seg(t, E.c4, E.c4 + 1); for (let j = 0; j < 6; j++) paint(ellPts(CLAMS[3][0] + (j - 2.5) * 30 * (1 + k), CLAMS[3][1] - 30 - 60 * k * hash(j), 14 * (1 - k * .6), 10 * (1 - k * .6), 10), { wash: '#4E6B64', washOp: 200 * (1 - k), ink: null }); }
    }
    const J = jPos(t), [vx, vy] = vel(jPos, t);
    // the octopus surgeon rises in on the left for the hand-off
    const O = octoPos(t), b = bPos(t), bs = 24;
    const litPanels = [0, 1, 2].map(i => seg(t, STITCH[i], STITCH[i] + .35)).concat([seg(t, E.touch, E.touch + .35)]);
    const bfOpts = { patches: litPanels, unknown: t > E.s3 + .2 ? 1 - seg(t, E.touch - .05, E.touch + .2) : 0, crumple: 1 - ease(seg(t, E.perk - .3, E.perk + .2)), key: 'bf',
      eyes: t > E.perk ? 'happy' : 'sad', glowA: 0,
      flap: t < E.surface ? undefined : t > E.back - .5 && t < E.fly ? .12 + .12 * Math.sin(t * 5) : .5 + .5 * Math.sin(t * (t > E.perk ? 9 : 4)) };
    if (t > E.octo - .6 && t < P.surface + 1) {
      const om = emotions(t, [[E.octo - .6, 'happy'], [E.touch - .5, 'determined', { eyes: 'determined' }], [E.touch + .2, 'happy', { eyes: 'happy' }]]);
      octo(O[0], O[1], 25, { ...om, reachR: t > E.touch - .5 && t < E.touch + .5 ? { x: patchAt(3, b, bs)[0], y: patchAt(3, b, bs)[1], k: seg(t, E.touch - .5, E.touch - .1) * (1 - seg(t, E.touch + .2, E.touch + .5)) } : undefined, wave: seg(t, E.fly, E.fly + .3) * (1 - seg(t, P.up + 1, P.up + 1.5)) });
    }
    if (t > E.touch && t < E.touch + .5) { boilSeed('touch'); const p = patchAt(3, b, bs), k = seg(t, E.touch, E.touch + .5); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; paint(starPts(p[0] + Math.cos(a) * 60 * k, p[1] + Math.sin(a) * 60 * k, 12 * (1 - k), .35, 4), { wash: C.gold, ink: PAL.ink, sw: .4 }); } }
    if (t > E.c1 - .3) pagesAndThreads(t, J, b || [0, 0], bs);
    // carried over from ch.3: the tossed key flies on up through the surface and out of frame
    if (t < K + .45) { boilSeed('key4'); const k = seg(t, K, K + .45), kx = 1051 - 20 * k, ky = lerp(cy - 333, cy - 700, easeIn(k)); glow(kx, ky, 90, C.goldLt, .9); SEA.tool('key', kx, ky, 34 * (1 / z) * 1.13, (t - CUE.tool.toss) * 11, C.gold); }
    // the temptation
    const star = fakeStar(t);
    // Jelly
    const mood = emotions(t, [[K, 'hopeful', { lookY: -1 }], [E.surface + .3, 'sad', { emote: null, lookY: -.6 }], [E.land - .1, 'love', { emote: null, eyes: 'closed' }],
      [E.spark, 'starstruck'], [E.turn + .1, 'surprised', { emote: null }], [E.sus, 'suspicious'], [E.poke + .1, 'surprised', { emote: null }], [E.shake, 'determined'],
      [E.deep, 'determined'], [E.c1 + .1, 'happy'], [E.c4 + .1, 'confused'], [E.rise, 'determined'], [E.s1 - .2, 'happy'], [E.perk, 'excited', { emote: null }],
      [E.notice, 'thinking', { emote: null }], [E.shake2, 'sad', { emote: null, gloom: 0 }], [E.octo + .3, 'hopeful'], [E.touch + .2, 'happy'], [E.fly, 'love', { emote: null }],
      [P.surface + .3, 'happy'], [P.write - .2, 'determined', { eyes: 'look' }], [P.seal + .3, 'proud', { emote: null }], [P.bow, 'happy', { lookX: -.3 }]], { take: .8 });
    const flip = kf(t, [[E.dive - .1, 0], [E.dive + .25, Math.PI * .96], [E.deep - .5, Math.PI * .96], [E.deep - .05, 0]], ease) + kf(t, [[P.dive - .15, 0], [P.dive + .15, Math.PI * .96]], ease);
    let o = { ...mood, vx, vy, rot: flip, boilKey: 'J', glowA: clamp((cy - 900) / 700), glowTips: 0 };
    const deepK = clamp((J[1] - 1000) / 700);
    o.glowA = deepK;
    if (t > E.land - .8 && t < E.dive + .2) {   // the butterfly rests on the left tentacle
      o.reachL = { x: J[0] - 175, y: J[1] + 40, k: seg(t, E.land - .8, E.land - .3) * (1 - seg(t, E.dive - .2, E.dive + .1)) };
      if (t > E.land && t < E.dive - .15) o.holdL = (x, y) => butterfly(x, y - 30, bs, { ...bfOpts, flap: .5 + .5 * Math.sin(t * 3), rot: -.1 });
    }
    if (t > E.spark && t < E.poke + .15 && star) { o.reachR = { x: star[0] - 150, y: star[1] + 40, k: seg(t, E.reach - .3, E.reach + .3) * (1 - seg(t, E.turn + .1, E.sus)) + seg(t, E.poke - .35, E.poke) * (1 - seg(t, E.poke + .02, E.poke + .15)) }; o.lookX = 1; o.lookY = -.2; }
    if (t > E.shake && t < E.shake + .9) o.rot = (o.rot || 0) + .2 * Math.sin((t - E.shake) * 20) * (1 - seg(t, E.shake, E.shake + .9));
    // the dive: reach into the clams
    if (t > E.deep - .1 && t < E.rise) {
      const idx = t < E.c1 + .3 ? 0 : t < E.c2 + .3 ? 1 : t < E.c3 + .3 ? 2 : 3, c = CLAMS[idx], tt = [E.c1, E.c2, E.c3, E.c4][idx];
      const k = seg(t, tt - .45, tt - .05) * (1 - seg(t, tt + .15, tt + .35));
      const side = c[0] < J[0] ? 'L' : 'R';
      o['reach' + side] = { x: c[0], y: c[1] - 40, k };
      o.lookY = .9; o.lookX = clamp((c[0] - J[0]) / 300, -1, 1); o.glowTips = .8;
    }
    // stitching: tentacles guide each page to its wing panel
    if (t > E.back - .2 && t < E.s3 + .3 && b) { const i = t < E.s1 + .1 ? 0 : t < E.s2 + .1 ? 1 : 2, tgt = patchAt(i, b, bs), k = seg(t, STITCH[i] - .5, STITCH[i] - .1) * (1 - seg(t, STITCH[i] + .05, STITCH[i] + .25)); o.reachR = { x: tgt[0], y: tgt[1], k }; o.lookX = clamp((tgt[0] - J[0]) / 250, -1, 1); o.lookY = -.5; }
    // the honest shake + hand-off
    if (t > E.shake2 && t < E.shake2 + .9) { o.rot = (o.rot || 0) + .16 * Math.sin((t - E.shake2) * 18) * (1 - seg(t, E.shake2, E.shake2 + .9)); o.aL = -.6; o.aR = -.6; }
    if (t > E.hand - .3 && t < E.hand + .9 && b) o.reachL = { x: b[0] + 70, y: b[1] + 40, k: seg(t, E.hand - .3, E.hand) * (1 - seg(t, E.hand + .6, E.hand + .9)) };
    if (t > E.fly && t < P.up + .5) { o.aR = 1.3 + .3 * Math.sin(t * 12); }   // waves goodbye
    // epilogue: writing
    const sig = t > P.write - .3 && t < P.bow + .2;
    if (sig) { const tip = sigTip(t); o.reachL = { x: tip[0], y: tip[1], k: seg(t, P.write - .3, P.write) * (1 - seg(t, P.seal - .2, P.seal + .1)) }; o.glowTips = .9; }
    const res = jelly(J[0], J[1], t > P.up ? 26 : 24, o);
    // at the surface: the waterline crosses Jelly, with little ripples; after the dive, rings spread
    if (t > P.surface - .3) {
      boilSeed('wl');
      const wl = []; for (let k = 0; k <= 6; k++) { const x = J[0] - 190 + k * 63; wl.push([x, SURF + 10 * Math.sin((x - 600) / 3100 * 16 * 1.4 + t * 1.6) + 2]); }
      if (t < P.dive + .3) { boilSeed('wband'); paint([[J[0] - 200, SURF + 8], [J[0] + 200, SURF + 8], [J[0] + 200, SURF + 420], [J[0] - 200, SURF + 420]], { fill: '#D5E2D8', fillOp: 70, bleed: .15, tex: .3, ink: null }); boilSeed('wl'); inkLine(wl, 1.6, C.deep3, 'ink', .6); }
      for (let r = 0; r < 3; r++) { const ph = t > P.dive + .2 ? seg(t, P.dive + .2 + r * .22, P.dive + 1.6 + r * .22) : frac(t * .7 + r / 3); if (ph <= 0 || ph >= 1) continue; const rx = (t > P.dive ? 60 + 520 * easeOut(ph) : 150 + 90 * ph), ry = rx * .12; boilSeed('rip' + r); inkLine(ellPts(J[0], SURF + 6, rx, ry, 30).slice(0, 16), (t > P.dive ? 2.2 : 1) * (1 - ph), C.deep3, 'inkfine', .6); }
    }
    if (b && !(t > E.land && t < E.dive - .15)) butterfly(b[0], b[1], bs, bfOpts);
    // the thought: the empty clam, remembered
    const th = seg(t, E.think - .1, E.think + .25) * (1 - seg(t, E.shake2 - .1, E.shake2 + .2));
    if (th > 0) {
      boilSeed('thought');
      const tx = J[0] - 230, ty = J[1] - 300;
      for (const [dx, dy, r] of [[150, 170, 12], [100, 120, 20]]) paint(ellPts(tx + dx, ty + dy, r * th, r * th, 10), { wash: C.cream, ink: PAL.ink, sw: .7 });
      paint(lumpy(tx, ty, 150 * backOut(th), 100 * backOut(th), 3, 30, .1), { wash: C.cream, ink: PAL.ink, sw: 1, curv: .6 });
      if (th > .6) { push(); translate(tx, ty + 30); scale(.9); clam(0, 0, .9, .8, 0, true, 'think'); pop(); emote('?', tx + 70, ty - 40, 14, th, t); }
    }
    camEnd();
    // epilogue overlay: the signature, written under the grain
    if (t > P.write) signature(t);
    // in from ch.3's tilt (carry-through); out: the end, on paper
    if (t > P.end - .6) flash(ease(seg(t, P.end - .6, P.end)) * .0, PAL.paper);
  }

  // ---------- the signature ----------
  // English only: one hand-written line, written left to right by the glowing tentacle; a vermilion "ZT" seal lands on
  // the beat (the score has its hit there).
  const SIG = { en: 'Zhechen Tu', x: 790, y: 400, font: '700 212px "Caveat"', seal: '600 44px "Space Grotesk"' };
  const sigProg = t => seg(t, P.write, P.seal - .25);
  let sigW = 0;
  const sigWidth = () => { if (!sigW) { const m = document.createElement('canvas').getContext('2d'); m.font = SIG.font; sigW = m.measureText(SIG.en).width; } return sigW; };
  const sigTip = t => {   // world point the writing tentacle follows (camera is settled at the end)
    const k = sigProg(t), cam = camAt(t), w = sigWidth();
    const sx = SIG.x - w / 2 + w * k, sy = SIG.y + 20 + 38 * Math.sin(k * 42);
    return [cam[0] + (sx - W / 2) / cam[2], cam[1] + (sy - H / 2) / cam[2]];
  };
  function signature(t) {
    const k = sigProg(t), stamp = seg(t, P.seal - .12, P.seal + .12), w = sigWidth();
    flushBrush();
    const g = letG, c = g.drawingContext;
    g.clear();
    if (k > 0) {
      c.save();
      c.font = SIG.font; c.textAlign = 'center'; c.textBaseline = 'middle';
      const x0 = SIG.x - w / 2 - 30, edge = x0 + (w + 60) * k;
      c.beginPath(); c.rect(0, 0, edge, H); c.clip();
      c.shadowColor = 'rgba(29,42,41,.35)'; c.shadowBlur = 7; c.fillStyle = PAL.ink; c.fillText(SIG.en, SIG.x, SIG.y);
      c.shadowBlur = 0; c.fillText(SIG.en, SIG.x, SIG.y);
      c.restore();
    }
    if (stamp > 0) {   // the vermilion seal thumps down on the beat
      const s = lerp(1.5, 1, easeIn(stamp)), sx = SIG.x + w / 2 + 95, sy = SIG.y + 30;
      c.save(); c.translate(sx, sy); c.rotate(-.06); c.scale(s, s); c.globalAlpha = clamp(stamp * 2);
      c.fillStyle = '#C8412F'; c.beginPath(); c.roundRect(-46, -46, 92, 92, 8); c.fill();
      c.strokeStyle = '#F7E9DA'; c.lineWidth = 3; c.strokeRect(-38, -38, 76, 76);
      c.fillStyle = '#F7E9DA'; c.font = SIG.seal; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '1px'; c.fillText('ZT', 0, 3); c.letterSpacing = '0px';
      c.restore();
    }
    push(); resetMatrix(); translate(-W / 2, -H / 2); image(g, 0, 0); pop();
  }

  shots([[K, thyroid]]);
})();
