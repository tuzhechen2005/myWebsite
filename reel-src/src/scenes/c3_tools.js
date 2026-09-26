// c3_tools.js · 三 45–60 s · Microsoft Cloud & AI: tool calling. A coral wall hung with 24 tools; each question bottle
// shows the tool it needs. Round one is fast and fumbled (6 of 10 pearls light), a beat of practice with a sweatband,
// round two lands on the beat (9 of 10). Jelly tosses the last key up and the camera follows it to the surface.
(() => {
  const { C, jelly, bottle, current, motes, rays, vel, lumpy, ribbonF, TOOLS } = SEA;
  const K = CUE.ch.tool, E = CUE.tool, b8 = CUE.B(.5);
  const WALL = [360, 190, 1200, 700], SLOT0 = [470, 290], DX = 206, DY = 160;
  const slotPos = (j, t) => { const c = j % 6, r = Math.floor(j / 6); return [SLOT0[0] + c * DX, SLOT0[1] + r * DY + 4 * Math.sin(t * 1.5 + j)]; };
  const slotKind = j => TOOLS[j % 12];
  const slotCol = j => [null, C.lilac, C.verm, '#6FA39A'][Math.floor(j / 6)];
  const J0 = [960, 690], BOT = [1400, 700];

  // the two rounds: [time the tool hits the bottle, needed tool, hit?]
  const R1T = [E.r1, E.r1 + CUE.B(2), ...Array.from({ length: 8 }, (_, n) => E.r1fast + n * b8)];
  const R2T = [0, .5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5].map(x => E.r2 + CUE.B(x));
  const R1H = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0], R2H = [1, 1, 1, 1, 1, 1, 0, 1, 1, 1];
  const NEED = [1, 4, 0, 6, 2, 3, 9, 5, 10, 7];
  const ATT = [...R1T.map((tt, i) => ({ t: tt, i, round: 1, hit: R1H[i], need: NEED[i] })), ...R2T.map((tt, i) => ({ t: tt, i, round: 2, hit: R2H[i], need: NEED[(i + 3) % 10] }))];
  ATT.forEach(a => { a.dur = a.round === 1 && a.i < 2 ? .5 : .24; a.slot = a.hit ? a.need + (a.i % 2 ? 12 : 0) : ((a.need + 5) % 12) + (a.i % 2 ? 0 : 12); });

  // pearls: lit / crossed by round
  function pearls(t) {
    const x0 = 540, x1 = 1380, y = 112;
    boilSeed('string');
    const str = []; for (let k = 0; k <= 12; k++) { const q = k / 12; str.push([lerp(x0 - 60, x1 + 60, q), y - 30 + 40 * Math.sin(q * Math.PI)]); }
    inkLine(str, 1.2, PAL.ink, 'inkfine', .5);
    const reset = seg(t, E.reset, E.reset + .5);
    for (let i = 0; i < 10; i++) {
      boilSeed('pearl' + i);
      const q = (i + .5) / 10, px = lerp(x0, x1, q), py = y - 30 + 40 * Math.sin(q * Math.PI) + 26;
      const a1 = ATT[i], a2 = ATT[10 + i];
      let lit = 0, miss = 0;
      if (t > a1.t + .05) { lit = a1.hit; miss = !a1.hit; }
      if (t > E.reset + i * .04) { lit = 0; miss = 0; }
      if (t > a2.t + .05) { lit = a2.hit; miss = !a2.hit; }
      const pop = lit ? backOut(seg(t, (t > E.reset ? a2.t : a1.t) + .05, (t > E.reset ? a2.t : a1.t) + .3)) : 1;
      if (lit) glow(px, py, 60 * pop, C.goldLt, .9);
      paint(ellPts(px, py, 27 * (lit ? pop : 1), 27 * (lit ? pop : 1), 16), { wash: lit ? C.gold : '#D9D2C2', fill: lit ? C.goldLt : C.grey, fillOp: 60, ink: PAL.ink, sw: .8 });
      paint(ellPts(px - 7, py - 8, 6, 5, 8), { wash: C.cream, washOp: lit ? 255 : 160, ink: null });
      if (miss) { inkLine([[px - 14, py - 14], [px, py], [px + 14, py + 14]], 2.2, C.vermDk, 'ink', 0); inkLine([[px + 14, py - 14], [px, py], [px - 14, py + 14]], 2.2, C.vermDk, 'ink', 0); }
      if (reset > 0 && reset < 1 && Math.abs(q - reset) < .12) glow(px, py, 70, C.cream, .8);
    }
  }
  function wall(t, taken) {
    SEA.water(-700, 1500, .06, .32, -400, 2400, 10, t);
    rays(t, 1100, -400, 900, .7);
    current(t, 150, 300, 220, C.sage, 1.1, 'tc0', 1); current(t + 2, 1780, 820, 240, C.sage, 1.1, 'tc1', -1);
    boilSeed('wall');
    const [x, y, w, h] = WALL, rim = lumpy(x + w / 2, y + h / 2, w / 2 + 40, h / 2 + 40, 7, 30, .04);
    paint(rim, { wash: '#E7C98C', fill: C.ochre, fillOp: 90, tex: .7, border: .6, ink: PAL.ink, sw: 1.3 });
    paint(rrPts(x, y, w, h, 40, 2), { wash: '#29483F', fill: C.deep3, fillOp: 90, tex: .6, border: .5, hatch: { d: 30, a: .6, o: { rand: .1 }, b: 'HB', c: '#3F6B61', w: .6 }, ink: PAL.ink, sw: 1 });
    for (let j = 0; j < 24; j++) {
      const [px, py] = slotPos(j, t);
      boilSeed('peg' + j);
      paint(ellPts(px, py - 70, 7, 7, 8), { wash: C.gold, ink: PAL.ink, sw: .4 });
      inkLine([[px, py - 66], [px, py - 58], [px, py - 50]], .8, C.goldLt, 'inkfine', 0);
      if (taken(j)) { paint(ellPts(px, py, 34, 44, 14), { fill: '#1E3833', fillOp: 120, bleed: .2, ink: null }); continue; }
      SEA.tool(slotKind(j), px, py, 36, .06 * Math.sin(t * 1.3 + j), slotCol(j));
    }
    SEA.seabed(-400, 2400, 1000, C.sand, 'toolbed');
    SEA.weed(t, 250, 1010, 240, 28, C.sage, 'tw1', 0); SEA.weed(t, 1700, 1010, 200, 26, C.deep3, 'tw2', 1);
    motes(t, -200, -300, 2400, 1400, 24, C.sage, 130);
    pearls(t);
  }
  const keyY = t => J0[1] - 60 - 2300 * (1 - Math.pow(1 - seg(t, E.toss, K + 15.6), 1.6));
  const camAt = t => {
    const a = [960, 545, 1.13], b = [960, 640, 1.34], c = [960, 545, 1.13];
    let v = a.map((x, i) => lerp(x, b[i], ease(seg(t, E.reset - .6, E.reset))));
    v = v.map((x, i) => lerp(x, c[i], ease(seg(t, E.r2 - .7, E.r2 - .1))));
    v[0] -= 700 * (1 - easeOut(seg(t, K, K + .6)));                           // arriving from the whip pan
    if (t > E.toss) v[1] = Math.min(v[1], keyY(t) + 330);                     // tilt up, following the tossed key
    return [v[0], v[1] + 4 * Math.sin(t * .5), v[2]];
  };

  function scene(t, lt, dur) {
    const [cx, cy, z] = camAt(t);
    camBegin(cx, cy, z);
    const active = ATT.filter(a => t > a.t - (a.dur + .35) && t < a.t + .6);
    const taken = j => ATT.some(a => a.slot === j && t > a.t - a.dur && t < a.t + .6);
    wall(t, taken);
    // attempts: a bottle bobs in at the right, a tool flies from its peg to the bottle
    let reach = null;
    for (const a of active) {
      const age = t - a.t, bp = [BOT[0] + (a.i % 2) * 30, BOT[1] + 10 * Math.sin(t * 3)];
      const inK = easeOut(seg(age, -(a.dur + .35), -a.dur));
      let bpos = [lerp(bp[0] + 400, bp[0], inK), bp[1]], bKey = 'ab' + a.round + a.i;
      if (age > 0) {
        if (a.hit) { bottle(bpos[0], bpos[1], 26, TOOLS[a.need], { key: bKey, burst: seg(age, 0, .5), rot: 0, glowA: 1 - seg(age, 0, .4) }); }
        else { const k = seg(age, .05, .6); bpos = [bpos[0] + 30 * Math.sin(age * 40) * (1 - k), bpos[1] + 300 * easeIn(k)]; bottle(bpos[0], bpos[1], 26, TOOLS[a.need], { key: bKey, rot: .6 * k }); }
      } else bottle(bpos[0], bpos[1], 26, TOOLS[a.need], { key: bKey, rot: .1 * Math.sin(t * 4) });
      // the tool
      const sp = slotPos(a.slot, t), fk = seg(age, -a.dur, 0);
      if (age < 0 && fk > 0) { const p = arcPt(sp, [bpos[0] - 10, bpos[1] - 40], 160, easeIn(fk)); SEA.tool(slotKind(a.slot), p[0], p[1], 36, fk * 5, slotCol(a.slot)); }
      if (age >= 0 && !a.hit && age < .6) { const k = seg(age, 0, .6), p = arcPt([bpos[0] - 30, bpos[1] - 60], [bpos[0] - 260, bpos[1] + 380], 200, k); SEA.tool(slotKind(a.slot), p[0], p[1], 36, -k * 9, slotCol(a.slot)); if (age < .25) { boilSeed('clonk' + a.i); for (let r = 0; r < 5; r++) { const an = r / 5 * TAU; inkLine([[bpos[0] - 20 + Math.cos(an) * 40, bpos[1] - 50 + Math.sin(an) * 40], [bpos[0] - 20 + Math.cos(an) * 70, bpos[1] - 50 + Math.sin(an) * 70], [bpos[0] - 20 + Math.cos(an) * 80, bpos[1] - 50 + Math.sin(an) * 80]], 2 * (1 - age / .25), C.vermDk, 'ink', 0); } } }
      if (age < 0 && age > -a.dur - .12) reach = { x: lerp(sp[0], bpos[0], easeIn(fk)), y: lerp(sp[1], bpos[1] - 40, easeIn(fk)), k: seg(age, -a.dur - .12, -a.dur) };
    }
    // Jelly
    const J = [J0[0] + 8 * Math.sin(t * 1.2), J0[1] + 6 * Math.sin(t * 1.7)];
    const mood = emotions(t, [[K, 'neutral', { lookX: .8 }], [E.r1 - .9, 'determined'], [E.r1 + CUE.B(2) + .1, 'surprised', { emote: null }], [E.r1fast - .1, 'nervous'], [E.r1fast + 8 * b8 + .1, 'dizzy'],
      [E.reset - .2, 'determined'], [E.r2 - .5, 'cool', { emote: null, eyes: 'determined', mouth: 'smirk' }], [E.r2 + CUE.B(5) + .2, 'starstruck'], [E.toss - .6, 'proud'], [E.toss + .1, 'excited', { emote: null }]], { take: .8 });
    let o = { ...mood, boilKey: 'J', hat: t > E.reset ? 'band' : null };
    if (t > E.reset && t < E.reset + .3) o.sq = (o.sq || 0) + .2 * Math.sin((t - E.reset) * 30) * Math.exp(-(t - E.reset) * 8);
    if (reach) { o.reachL = reach; o.lookX = clamp((reach.x - J[0]) / 300, -1, 1); o.lookY = clamp((reach.y - J[1]) / 300, -1, 1); }
    else if (active.length) { o.lookX = .8; }
    if (t > E.reset && t < E.r2 - .5) { o.lookX = Math.sin((t - E.reset) * 4); o.lookY = -.6; }
    // the toss: grab the key, wind up, throw it straight up
    let key = null;
    if (t > E.toss - .8) {
      const wind = seg(t, E.toss - .8, E.toss - .1);
      if (t < E.toss) { o.reachR = { x: J[0] + 150, y: J[1] + 60 + 60 * wind, k: 1 }; o.holdR = (x, y) => SEA.tool('key', x, y - 30, 34, .3, C.gold); o.sq = (o.sq || 0) + .18 * wind; }
      else { const k = seg(t, E.toss, K + 15); key = [J[0] + 150 - 60 * k, keyY(t)]; o.reachR = { x: J[0] + 120, y: J[1] - 220, k: 1 - seg(t, E.toss + .2, E.toss + .6) }; o.lookY = -1; o.lookX = .2; }
    }
    jelly(J[0], J[1], 24, o);
    if (key) { boilSeed('tosskey'); glow(key[0], key[1], 90, C.goldLt, .9); SEA.tool('key', key[0], key[1], 34, (t - E.toss) * 11, C.gold); for (let i = 0; i < 3; i++) inkLine([[key[0] - 30 + i * 30, key[1] + 70], [key[0] - 30 + i * 30, key[1] + 150], [key[0] - 30 + i * 30, key[1] + 220]], 1, C.ochreDk, 'inkfine', 0); }
    camEnd();
    // in: finish the whip pan from ch.2
    if (lt < .5) for (let i = 0; i < 14; i++) { const k = 1 - lt / .5; boilSeed('wpi' + i); const y = hash(i + 30) * H, x0 = hash(i + 32) * W, len = 900 * k; inkLine([[x0, y], [x0 + len / 2, y], [x0 + len, y]], .6 + 1.4 * k, i % 3 ? C.sage : C.deep3, 'inkfine', .1); }
  }
  shots([[K, scene]]);
})();
