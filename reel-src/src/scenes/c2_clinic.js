// c2_clinic.js · 二 27.5–45 s · Multi-agent pre-consultation & triage, as a coral clinic. A sick seahorse arrives;
// Jelly buds four helpers (intake, retrieval, triage, guardrail) who pass the case along a relay to the right door.
// Then a red flag: the guardrail raises it, everyone freezes, the octopus surgeon (the human in the loop) takes over.
(() => {
  const { C, MINI, jelly, seahorse, octo, page, icon, current, motes, rays, vel, lumpy, ribbonF } = SEA;
  const K = CUE.ch.cli, B = CUE.B, FLOOR = 990, DOOR = [1640, FLOOR];
  const E = CUE.cli;

  // ---------- the world ----------
  function clinic(t, doorOpen) {
    SEA.water(-600, 1300, .14, .46, -400, 2400, 12, t);
    rays(t, 700, -450, 950, .6);
    for (const [i, x, y, len, d] of [[0, 300, 120, 260, 1], [1, 1100, 70, 300, -1]]) current(t + i, x, y, len, C.sage, 1.1, 'cc' + i, d);
    // sea fans on the left
    for (let f = 0; f < 3; f++) {
      boilSeed('fan' + f);
      const bx = 120 + f * 170, by = FLOOR + 10, h = 280 + 90 * hash(f + 3), col = [C.verm, C.coral, C.gold][f];
      const br = (x, y, a, l, d) => { if (d > 3) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; inkLine([[x, y], [(x + x2) / 2 + Math.sin(t + d + f) * 4, (y + y2) / 2], [x2, y2]], 4.5 - d, col, 'ink', .5); br(x2, y2, a - .45, l * .72, d + 1); br(x2, y2, a + .4, l * .7, d + 1); };
      br(bx, by, -Math.PI / 2 + (f - 1) * .15, h * .42, 0);
    }
    // the clinic: a rounded coral house with round windows, a door, and a painted cross
    boilSeed('house');
    const hx = DOOR[0], hy = FLOOR;
    const house = lumpy(hx + 60, hy - 330, 430, 380, 4, 30, .06).map(([x, y]) => [x, Math.min(y, hy + 30)]);
    paint(house, { wash: '#EFB9A3', fill: C.coral, fillOp: 80, tex: .6, border: .6, ink: PAL.ink, sw: 1.2 });
    for (const [wx, wy, r] of [[hx - 230, hy - 470, 55], [hx + 300, hy - 420, 48], [hx + 90, hy - 610, 42]]) { paint(ellPts(wx, wy, r, r, 18), { wash: '#FFF1D8', ink: C.deep3, sw: 3.2 }); inkLine([[wx - r, wy], [wx, wy + 2], [wx + r, wy]], 1.2, C.deep3, 'inkfine', 0); glow(wx, wy, r * 2, C.goldLt, .35); }
    for (let i = 0; i < 12; i++) paint(ellPts(hx + 60 + (hash(i) - .5) * 700, hy - 330 + (hash(i + 5) - .5) * 600, 8 + 10 * hash(i + 9), 8 + 10 * hash(i + 9), 10), { wash: C.blush, ink: null });
    // the cross (teal) above the door
    boilSeed('cross');
    const cx = hx, cy = hy - 400;
    paint([[cx - 18, cy - 60], [cx + 18, cy - 60], [cx + 18, cy - 18], [cx + 60, cy - 18], [cx + 60, cy + 18], [cx + 18, cy + 18], [cx + 18, cy + 60], [cx - 18, cy + 60], [cx - 18, cy + 18], [cx - 60, cy + 18], [cx - 60, cy - 18], [cx - 18, cy - 18]], { wash: C.deep3, fill: C.sage, fillOp: 60, ink: PAL.ink, sw: 1 });
    // door: an arch; the leaf swings open (drawn as a narrowing panel against the hinge)
    boilSeed('door');
    const arch = []; for (let i = 0; i <= 12; i++) { const a = Math.PI + Math.PI * i / 12; arch.push([hx + Math.cos(a) * 105, hy - 200 + Math.sin(a) * 100]); }
    const hole = [[hx - 105, hy], ...arch, [hx + 105, hy]];
    paint(hole, { wash: C.deep2, ink: PAL.ink, sw: 1.1 });
    if (doorOpen > .3) glow(hx, hy - 150, 180, C.goldLt, doorOpen);
    const lw = 210 * (1 - .85 * ease(doorOpen));
    paint([[hx + 105 - lw, hy], ...arch.map(([x, y]) => [hx + 105 - (hx + 105 - x) * lw / 210, y]), [hx + 105, hy]], { wash: C.sageLt, fill: C.sage, fillOp: 60, tex: .5, ink: PAL.ink, sw: 1 });
    paint(ellPts(hx + 105 - lw * .82, hy - 130, 9, 9, 8), { wash: C.gold, ink: PAL.ink, sw: .5 });
    SEA.seabed(-400, 2400, FLOOR, C.sand, 'clibed');
    SEA.weed(t, 620, FLOOR + 10, 210, 26, C.sage, 'cw1', .4); SEA.weed(t, 1180, FLOOR + 10, 170, 22, C.deep3, 'cw2', 1.7);
    motes(t, -300, -300, 2500, 1400, 26, C.sage, 140);
  }

  // ---------- the relay stations ----------
  const J0 = [1030, 610];                                          // where Jelly (the coordinator) stays
  const SPOT = { intake: [860, 380], retrieve: [1120, 300], triage: [1380, 400], guard: [500, 380] };
  const ORDER = ['intake', 'retrieve', 'triage', 'guard'];
  const popT = n => E.pop + n * CUE.B(1), mergeT = n => E.merge + n * CUE.B(.5);
  // where each mini is at time t (pure): it buds from Jelly's crown, arcs out to its station, and later flies home
  function miniPos(name, t) {
    const n = ORDER.indexOf(name), s0 = popT(n), home = [J0[0], J0[1] - 150], spot = SPOT[name];
    if (t < s0) return null;
    let p = arcPt(home, spot, 140, easeOut(seg(t, s0, s0 + .45)));
    p = [p[0] + 10 * Math.sin(t * 1.6 + n * 2), p[1] + 10 * Math.sin(t * 2.1 + n)];
    const m0 = mergeT(n);
    if (t > m0 - .35) { const k = easeIn(seg(t, m0 - .35, m0)); p = arcPt(p, home, 90, k); if (t >= m0) return null; }
    return p;
  }
  const patient = t => {   // the seahorse: wobbles in from the left; later carried off by the octopus
    const k = seg(t, K + .3, K + 2.2);
    return [lerp(-120, 700, easeOut(k)) + 14 * Math.sin(t * 2.3), 620 + 20 * Math.sin(t * 1.7) - 40 * Math.sin(Math.PI * k) * 0];
  };
  const octoPos = t => {
    if (t < E.octoIn) return [DOOR[0], FLOOR - 60];
    if (t < E.scoop) return [lerp(DOOR[0], 880, easeOut(seg(t, E.octoIn, E.scoop - .1))), lerp(FLOOR - 60, 800, easeOut(seg(t, E.octoIn, E.scoop - .1)))];
    if (t < E.nod + .25) return [880, 800 - 10 * Math.sin((t - E.scoop) * 4)];
    return [lerp(880, DOOR[0] + 30, ease(seg(t, E.nod + .25, E.octoOut))), lerp(800, FLOOR - 40, ease(seg(t, E.nod + .25, E.octoOut)))];
  };
  const camAt = t => {
    const a = [860, 560, 1.08], b = [980, 500, 1.18], c = [650, 470, 1.36], d = [1000, 560, 1.02], e = [1000, 520, 1.14];
    let v = a.map((x, i) => lerp(x, b[i], ease(seg(t, E.pop - .6, E.pop + .3))));
    v = v.map((x, i) => lerp(x, c[i], ease(seg(t, E.red - .25, E.red + .35))));      // push in: the patient + the guard
    v = v.map((x, i) => lerp(x, d[i], ease(seg(t, E.bell - .2, E.octoIn + .2))));   // pull out: the surgeon comes in
    v = v.map((x, i) => lerp(x, e[i], ease(seg(t, E.octoOut, E.octoOut + .8))));
    v[0] += 900 * easeIn(seg(t, K + 16.9, K + 17.5));               // the whip pan out, to the right
    return [v[0] + 5 * Math.sin(t * .6), v[1] + 4 * Math.sin(t * .45), v[2]];
  };
  const note = (x, y, s, rot, key) => { boilSeed('note' + key); push(); translate(x, y); rotate(rot); paint(rectPts(-s, -s * .7, 2 * s, 1.4 * s), { wash: C.cream, ink: PAL.ink, sw: .6 }); inkLine([[-s * .6, -s * .15], [0, -s * .2], [s * .6, -s * .1]], .6, C.verm, 'inkfine', .4); inkLine([[-s * .6, s * .25], [s * .3, s * .22]], .5, C.deep3, 'inkfine', 0); pop(); };

  function scene(t, lt, dur) {
    const [cx, cy, z] = camAt(t), alarm = seg(t, E.flag, E.flag + .1) * (1 - seg(t, E.octoOut - .6, E.octoOut));
    const sh = t > E.flag && t < E.flag + .8 ? shakeXY(t, 9 * Math.exp(-(t - E.flag) * 4)) : [0, 0];
    camBegin(cx + sh[0], cy + sh[1], z);
    const doorOpen = seg(t, E.octoIn - .3, E.octoIn) * (1 - seg(t, E.octoOut - .1, E.octoOut + .35));
    clinic(t, doorOpen);
    // alarm rings from the red flag
    const G = miniPos('guard', t);
    if (alarm > 0 && G) for (let r = 0; r < 3; r++) { boilSeed('al' + r); const ph = frac((t - E.flag) * 1.3 + r / 3); inkLine(ellPts(G[0] + 60, G[1] - 120, 40 + 520 * ph, 40 + 380 * ph, 40), 5 * (1 - ph) * alarm, '#D8443A', 'ink', .6); }

    // ---- the octopus surgeon (behind the patient when carrying) ----
    const O = octoPos(t), carry = t > E.scoop - .1;
    const pS = patient(E.scoop - .1), P = carry ? [lerp(pS[0], O[0] - 150, ease(seg(t, E.scoop - .1, E.scoop + .35))), lerp(pS[1], O[1] - 235, ease(seg(t, E.scoop - .1, E.scoop + .35)))] : patient(t);
    const hMood = emotions(t, [[K, 'sad', { emote: 'sweat' }], [E.red, 'scared'], [E.scoop + .1, 'relieved', { emote: null }], [E.nod + .6, 'happy']], { take: .8 });
    const drawPatient = () => seahorse(P[0], P[1], 27, { ...hMood, fin: t < E.red ? 1 : .8, chest: seg(t, E.red, E.red + .2) * (1 - seg(t, E.scoop + .4, E.scoop + 1.2)), tint: t > E.red && t < E.scoop + .5 ? 'pale' : null, flip: false, rot: carry ? -.15 : .06 * Math.sin(t * 2), emote: hMood.emote, emoteK: hMood.emoteK, emoteAge: hMood.emoteAge, lookX: t > E.octoIn + .1 && t < E.scoop ? 1 : hMood.lookX });
    if (!carry) drawPatient();
    if (t > E.octoIn - .1 && t < E.octoOut + .1) {
      const [ovx] = vel(octoPos, t);
      const oMood = emotions(t, [[E.octoIn, 'determined'], [E.scoop + .2, 'neutral'], [E.nod, 'happy', { eyes: 'happy' }]]);
      octo(O[0], O[1], 26, { ...oMood, sq: (oMood.sq || 0) + (t > E.nod && t < E.nod + .4 ? .12 * Math.sin((t - E.nod) * 16) : 0),
        reachL: carry ? { x: P[0] + 30, y: P[1] + 10, k: 1 } : (t > E.scoop - .45 ? { x: P[0] + 20, y: P[1] + 20, k: seg(t, E.scoop - .45, E.scoop - .1) } : undefined),
        reachR: carry ? { x: P[0] + 60, y: P[1] + 110, k: 1 } : undefined,
        holdL: carry ? () => drawPatient() : undefined, dx: 0 });
      if (Math.abs(ovx) > 500) { boilSeed('osm'); for (let i = 0; i < 4; i++) { const yy = O[1] - 280 + i * 60, sx = -Math.sign(ovx); inkLine([[O[0] - sx * -120, yy], [O[0] - sx * -260, yy + 1], [O[0] - sx * -380, yy]].map(([a, b]) => [a + sx * 0, b]), .9, C.deep3, 'inkfine', 0); } }
    }

    // ---- the minis ----
    const frozen = seg(t, E.flag, E.flag + .1) * (1 - seg(t, E.scoop, E.scoop + .3));
    for (const name of ORDER) {
      const p = miniPos(name, t); if (!p) continue;
      const n = ORDER.indexOf(name), s0 = popT(n);
      let keys = [[s0, 'happy']];
      if (name === 'intake') keys = [[s0, 'happy'], [E.ask, 'confused', { emote: '?' }], [E.write, 'determined'], [E.pass1 + .2, 'happy']];
      if (name === 'retrieve') keys = [[s0, 'happy'], [E.pass1 + .1, 'thinking', { emote: null }], [E.pass2 + .2, 'happy']];
      if (name === 'triage') keys = [[s0, 'happy'], [E.pass2 + .1, 'determined'], [E.point + .3, 'proud']];
      if (name === 'guard') keys = [[s0, 'suspicious'], [E.see, 'surprised', { emote: '!' }], [E.flag, 'determined', { emote: null }], [E.octoOut - .3, 'relieved']];
      if (name !== 'guard') { keys.push([E.flag + .08, 'scared', { emote: '!!' }]); keys.push([E.scoop + .3, 'relieved']); }
      const m = emotions(t, keys, { take: .7 });
      const popAt = s0 + .45;
      let o = { ...m, pal: MINI[name], boilKey: 'mini' + name, phase: n * .3, sq: (m.sq || 0) + .25 * Math.exp(-(t - popAt) * 8) * Math.cos((t - popAt) * 20) * (t > popAt ? 1 : 0), tentLen: .9 };
      if (frozen > .5 && name !== 'guard') { o.dx = .08 * Math.sin(t * 60); }
      if (name === 'intake') {
        o.reachR = { x: p[0] + 70, y: p[1] + 40, k: 1 };
        o.holdR = (x, y) => { boilSeed('clip'); paint(rectPts(x - 26, y - 30, 52, 66), { wash: '#C99B62', ink: PAL.ink, sw: .6 }); paint(rectPts(x - 20, y - 22, 40, 52), { wash: C.cream, ink: null }); for (let k = 0; k < 3; k++) if (t > E.write + k * .15) inkLine([[x - 14, y - 10 + k * 13], [x - 4, y - 12 + k * 13], [x + 13, y - 10 + k * 13]], .7, C.deep3, 'inkfine', .3); };
        if (t > E.ask - .2 && t < E.write) o.lookX = -1;
      }
      if (name === 'retrieve') { o.reachL = { x: p[0] - 70, y: p[1] + 40, k: 1 }; o.holdL = (x, y) => page(x, y - 10, 9 + 3 * seg(t, E.pass1 + .2, E.pass1 + .5) * (1 - seg(t, E.pass2, E.pass2 + .4)), { key: 'rbook', rot: -.2, gold: seg(t, E.pass1 + .3, E.pass1 + .5) }); }
      if (name === 'triage') {
        const pt = ease(seg(t, E.point - .1, E.point + .15)) * (1 - seg(t, E.red, E.red + .3));
        o.reachR = { x: p[0] + 70, y: p[1] + 30, k: 1 };
        o.holdR = (x, y) => { boilSeed('sign'); inkLine([[x, y + 40], [x, y - 50], [x, y - 70]], 4, '#9A6B3E', 'ink', 0); push(); translate(x, y - 60); rotate(lerp(.9, 0, pt)); paint([[0, -18], [70, -18], [95, 0], [70, 18], [0, 18]], { wash: C.lilac, ink: PAL.ink, sw: .7 }); pop(); };
        if (pt > .5) o.lookX = 1;
      }
      if (name === 'guard') {
        const up = ease(seg(t, E.flag - .15, E.flag + .05)) * (1 - seg(t, E.octoOut - .3, E.octoOut + .2));
        o.reachL = { x: p[0] - 60, y: p[1] + 50, k: 1 }; o.holdL = (x, y) => { boilSeed('shield'); paint([[x - 30, y - 34], [x + 30, y - 34], [x + 28, y + 6], [x, y + 36], [x - 28, y + 6]], { wash: '#C9D6DA', fill: C.slate, fillOp: 60, ink: PAL.ink, sw: .8, curv: .3 }); inkLine([[x, y - 26], [x, y + 20]], 2.4, C.slate, 'ink', 0); };
        o.reachR = { x: p[0] + 60, y: lerp(p[1] + 50, p[1] - 120, up), k: 1 };
        o.holdR = (x, y) => { if (up < .02) return; boilSeed('flag'); inkLine([[x, y + 20], [x, y - 60 * up], [x, y - 140 * up]], 3.5, '#8C6A44', 'ink', 0); const fy = y - 140 * up, wv = Math.sin(t * 16); paint([[x, fy], [x + 50, fy + 6 + 8 * wv], [x + 100 * up, fy + 2 * wv], [x + 96 * up, fy + 50 + 6 * wv], [x + 48, fy + 56 - 6 * wv], [x, fy + 56]], { wash: '#D8443A', fill: C.vermDk, fillOp: 70, ink: PAL.ink, sw: .8, curv: .3 }); };
        o.lookX = t > E.see - .1 ? -.8 : .3; o.lookY = .5;
      }
      jelly(p[0], p[1], 15, o);
    }
    // the case note travels the relay: seahorse → intake → retrieval → triage
    const relay = [[E.write + .2, E.pass1, SPOT.intake, SPOT.retrieve], [E.pass1 + .35, E.pass2, SPOT.retrieve, SPOT.triage]];
    for (const [a, b, p0, p1] of relay) if (t > a && t < b + .05) { const k = seg(t, b - .45, b), p = arcPt([p0[0] + 40, p0[1] + 20], [p1[0] - 40, p1[1] + 20], 90, easeOut(k)); note(p[0], p[1], 20, k * 6, 'n'); }

    // ---- Jelly, the coordinator ----
    const away = ease(seg(t, E.bell + .1, E.octoIn + .3)) * (1 - ease(seg(t, E.octoOut + .2, E.merge - .4)));
    const J = [J0[0] + 6 * Math.sin(t * 1.3) + 170 * away, J0[1] - lerp(-60, 0, ease(seg(t, K + 1.8, K + 2.8))) - 150 * away];
    const jMood = emotions(t, [[K, 'neutral'], [K + 1.9, 'nervous', { emote: null, lookX: -1 }], [K + 3.0, 'determined', { lookX: -.6 }], [E.pop - .3, 'excited', { emote: null }],
      [E.pop + 2.2, 'happy'], [E.flag + .05, 'surprised', { emote: '!' }], [E.bell, 'determined'], [E.scoop + .3, 'relieved'], [E.merge + .2, 'excited', { emote: null }], [E.merge + 1.2, 'proud']], { take: .8 });
    const bud = (() => { let s = 0; for (let n = 0; n < 4; n++) { const a = t - popT(n); if (a > -.18 && a < .5) s += a < 0 ? .22 * ease((a + .18) / .18) : -.3 * Math.exp(-a * 7) * Math.cos(a * 18); const m = t - mergeT(n); if (m > 0 && m < .5) s += .22 * Math.exp(-m * 7) * Math.cos(m * 18); } return s; })();
    const bellK = seg(t, E.bell - .25, E.bell) * (1 - seg(t, E.scoop, E.scoop + .3));
    jelly(J[0], J[1], 20, { ...jMood, boilKey: 'J', sq: (jMood.sq || 0) + bud,
      reachR: bellK > 0 ? { x: J[0] + 130, y: J[1] - 170, k: bellK } : undefined,
      holdR: bellK > .3 ? (x, y) => { boilSeed('handbell'); SEA.tool('bell', x + 8 * Math.sin(t * 30), y - 30, 26, .35 * Math.sin(t * 30), C.gold); for (let r = 0; r < 3; r++) { const ph = frac(t * 3 + r / 3); inkLine([[x + 30 + 20 * ph, y - 70 - 10 * r], [x + 50 + 30 * ph, y - 60 - 10 * r], [x + 60 + 40 * ph, y - 40 - 10 * r]], 1.5 * (1 - ph), C.gold, 'ink', .5); } } : undefined });
    camEnd();
    // in: the page turn from ch.1 finishes; out: a horizontal whip pan with smear
    if (lt < .6) SEA.pageTurn(.5 + lt / 1.2);
    const wp = seg(t, K + 16.9, K + 17.5);
    if (wp > 0) for (let i = 0; i < 14; i++) { boilSeed('wp' + i); const y = hash(i) * H, x0 = (hash(i + 2) * W) - 300 * wp, len = 300 + 900 * wp; inkLine([[x0, y], [x0 + len / 2, y + jit(3)], [x0 + len, y]], .6 + 1.4 * wp, i % 3 ? C.sage : C.deep3, 'inkfine', .1); }
  }
  shots([[K, scene]]);
})();
