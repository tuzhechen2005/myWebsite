// c0_prologue.js · 序 0–10 s. An ink drop falls into the paper and blooms into Jelly; the first question (a bottle
// with a '?') sinks down, Jelly catches it, makes up its mind and dives. The camera whips down after it into ch.1.
(() => {
  const { C, jelly, bottle, current, motes, rays, bubbles, vel, lumpy, ribbonF } = SEA;
  const LAND = [960, 560], T_HIT = CUE.pro.hit, T_POP = CUE.pro.pop, T_EYES = CUE.pro.eyes;
  const T_BOT = CUE.pro.bottle, T_CATCH = CUE.pro.catch, T_DIVE = CUE.pro.dive;

  // Jelly's path (world px)
  const jPos = t => {
    let x = 960 + 18 * Math.sin(t * .9) * seg(t, 4.6, 5.6), y = 600;
    y -= 40 * ease(seg(t, 5, 7));
    x += 30 * ease(seg(t, 7, 7.5)) - 30 * ease(seg(t, 7.8, 8.4));
    y -= 30 * ease(seg(t, T_DIVE - .5, T_DIVE));                 // the inhale before the dive
    y += t > T_DIVE ? 1500 * Math.pow(t - T_DIVE, 1.5) : 0;         // the dive, still accelerating at the cut
    return [x, y];
  };
  const bPos = t => [1030 + 36 * Math.sin(t * 2.1), lerp(-120, 330, easeOut(seg(t, T_BOT, T_BOT + 1.8)))];
  // the camera follows the dive a beat late, so Jelly drops toward the bottom of frame, then is chased
  const camY = t => t < T_DIVE ? 540 : Math.max(540, jPos(Math.min(t, 9.55) - .16)[1] - 20 + 600 * seg(t, 9.55, 10) * seg(t, 9.55, 10));
  const camZ = t => lerp(1.55, 1.12, ease(seg(t, .3, 5.2))) + .03 * ease(seg(t, 5.2, 8.5));

  // ink bloom: tendrils curl out from the landing point, then the colour gathers back into the bell
  function bloom(t) {
    const k = easeOut(seg(t, T_HIT, T_HIT + 1.7)), fade = 1 - ease(seg(t, T_POP - .5, T_POP + .7));
    if (k <= 0 || fade <= 0) return;
    const [x, y] = LAND;
    boilSeed('bloom halo');
    paint(lumpy(x, y + 30, 420 * k, 300 * k, 2, 26, .16), { fill: C.sageLt, fillOp: 110 * fade, bleed: .35, tex: .6, border: .7, ink: null });
    for (let i = 0; i < 7; i++) {
      boilSeed('tendril' + i);
      const a0 = i / 7 * TAU + .4, pts = [];
      for (let j = 0; j <= 6; j++) { const q = j / 6, r = (40 + 300 * q) * k, a = a0 + q * (1.2 + .5 * hash(i)) * (i % 2 ? 1 : -1); pts.push([x + Math.cos(a) * r, y + 30 + Math.sin(a) * r * .72]); }
      paint(ribbonF(pts, q => (46 - 40 * q) * k), { fill: i % 3 ? C.deep3 : C.deep, fillOp: 235 * fade, bleed: .12, tex: .7, border: .5, ink: null });
    }
    boilSeed('bloom core');
    const gather = ease(seg(t, T_POP - .9, T_POP)), cr = lerp(170 * k, 60, gather);
    paint(lumpy(x, lerp(y + 30, y - 30, gather), cr, cr * .85, 5, 22, .2), { fill: SEA.JELLY.bell, fillOp: 230 * fade, bleed: .2, tex: .5, border: .6, ink: null });
    paint(lumpy(x, lerp(y + 30, y - 30, gather), cr * .55, cr * .45, 8, 18, .2), { fill: C.verm, fillOp: 170 * fade, bleed: .15, tex: .5, ink: null });
  }

  function prologue(t) {
    const cy = camY(t);
    camBegin(960, cy - 40 * (1 - ease(seg(t, .3, 5.2))), camZ(t));
    // the world coming alive after the bloom: rays, currents, motes
    const alive = ease(seg(t, T_POP - .4, T_POP + 1.4));
    SEA.water(1000, 2700, 0, .55, -700, W + 700, 14, t);
    if (alive > 0) {
      rays(t, 1000, -250, 950, .8 * alive);
      for (const [i, cx, cyy, len, d] of [[0, 140, 250, 300, 1], [1, 1780, 200, 320, -1], [2, 220, 880, 260, 1], [3, 1720, 860, 300, -1]]) current(t + i, cx + d * 30 * Math.sin(t * .4 + i), cyy, len * alive, i % 2 ? C.sage : C.sageLt, 1.3, 'cur' + i, d);
      motes(t, -100, -100, 2100, 1400, 36, C.sage, 150 * alive);
    }
    // the drop: a shadow grows on the paper as it falls, then the splash
    const fall = seg(t, .45, T_HIT);
    if (t < T_HIT) {
      boilSeed('shadow');
      paint(ellPts(LAND[0], LAND[1] + 30, 20 + 50 * fall, 8 + 18 * fall, 16), { fill: C.deep, fillOp: 30 + 90 * fall, bleed: .3, ink: null });
      if (t > .45) {
        boilSeed('drop');
        const dy = lerp(-120, LAND[1], easeIn(fall)), st = 1 + .5 * easeIn(fall);
        const d = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = 1 - .55 * Math.max(0, -Math.sin(a)); d.push([LAND[0] + Math.cos(a) * 22 * r / Math.sqrt(st), dy + Math.sin(a) * 26 * st - (Math.sin(a) < 0 ? 18 * st * Math.pow(-Math.sin(a), 3) : 0)]); }
        paint(d, { wash: C.deep, washOp: 255, ink: PAL.ink, sw: .9, curv: .4 });
        paint(ellPts(LAND[0] - 7, dy - 6, 5, 8, 8), { wash: C.cream, ink: null });
      }
    } else {
      // crown splash + rings
      const a = t - T_HIT;
      for (let i = 0; i < 9; i++) {
        boilSeed('spl' + i);
        const k = seg(a, 0, .55 + .2 * hash(i)), ang = Math.PI + (i + .5) / 9 * Math.PI, dist = 90 + 90 * hash(i + 3);
        if (k >= 1) continue;
        const p = SEA.qbez(LAND, [LAND[0] + Math.cos(ang) * dist * .6, LAND[1] - 120 - 60 * hash(i)], [LAND[0] + Math.cos(ang) * dist, LAND[1] + 20], k);
        paint(ellPts(p[0], p[1], 9 * (1 - k * .6), 11 * (1 - k * .6), 8), { wash: C.deep, ink: PAL.ink, sw: .5 });
      }
      for (let r = 0; r < 3; r++) { boilSeed('ring' + r); const k = seg(a, r * .18, 1.4 + r * .2); if (k > 0 && k < 1) inkLine(ellPts(LAND[0], LAND[1] + 30, 40 + 420 * easeOut(k), 16 + 150 * easeOut(k), 40), 1.4 * (1 - k), C.deep3, 'ink', .6); }
    }
    bloom(t);

    // the whip down: thin speed streaks rushing up past the camera (behind Jelly)
    const wk = seg(t, T_DIVE + .15, 9.6), z = camZ(t);
    if (wk > 0) for (let i = 0; i < 16; i++) {
      boilSeed('whip' + i);
      const sx = hash(i) * W, sp = 2600 + 1600 * hash(i + 2), sy = frac(hash(i + 3) - (t - T_DIVE) * sp / 1600) * (H + 900) - 450, len = 160 + 420 * wk * hash(i + 5);
      const wx = 960 + (sx - 960) / z, wy = cy + (sy - 540) / z;
      inkLine([[wx, wy], [wx + jit(2), wy + len * .5], [wx, wy + len]], .5 + 1.1 * wk * hash(i + 8), i % 3 ? C.sage : C.deep3, 'inkfine', .1);
    }
    // the question bottle
    const bp = bPos(t), caught = t >= T_CATCH;
    if (t > T_BOT && !caught) bottle(bp[0], bp[1], 24, 'q', { rot: .25 * Math.sin(t * 1.7), key: 'q1' });

    // Jelly
    if (t >= T_POP - .05) {
      const [jx, jy] = jPos(t), [vx, vy] = vel(jPos, t);
      const grow = backOut(seg(t, T_POP - .05, T_POP + .35)), u = 30 * Math.max(.05, grow);
      const mood = emotions(t, [[0, 'sleepy', { eyes: 'closed', mouth: null, emote: null }], [T_EYES, 'surprised', { emote: null, mouth: 'o' }], [T_EYES + .5, 'happy'],
        [T_BOT + .5, 'surprised', { lookY: -1 }], [T_BOT + 1.1, 'hopeful'], [T_CATCH + .15, 'thinking', { emote: null }], [T_DIVE - .55, 'determined']]);
      if (t > T_BOT + .4 && t < T_CATCH + .1) { mood.lookX = clamp((bp[0] - jx) / 250, -1, 1); mood.lookY = clamp((bp[1] - (jy - 70)) / 200, -1, 1); }
      if (t > T_CATCH + .15 && t < T_DIVE - .55) { mood.lookX = .8; mood.lookY = -.3; }
      if (t > T_EYES + .5 && t < T_BOT + .4) mood.lookX = Math.sin((t - T_EYES) * 3.2) > 0 ? -.8 : .8;
      const inhale = t > T_DIVE - .5 && t < T_DIVE ? .22 * ease(seg(t, T_DIVE - .5, T_DIVE)) : 0;
      const dive = t > T_DIVE ? -.22 * Math.min(1, (t - T_DIVE) * 4) : 0;
      const flip = kf(t, [[T_DIVE - .1, 0], [T_DIVE + .2, Math.PI * .96]], easeOut);
      const reach = t > T_DIVE - .1 ? { x: jx + 150 * Math.cos(flip * .5), y: jy - 60 - 120 * flip / Math.PI, k: 1 } : t < T_CATCH ? { x: bp[0] - 6, y: bp[1] + 52, k: seg(t, T_CATCH - .45, T_CATCH) } : { x: lerp(bp[0], jx + 190, ease(seg(t, T_CATCH, T_CATCH + .5))), y: lerp(bp[1] + 52, jy - 40, ease(seg(t, T_CATCH, T_CATCH + .5))), k: 1 };
      jelly(jx, jy, u, {
        ...mood, sq: (mood.sq || 0) + inhale + dive, vx, vy, rot: flip + .08 * Math.sin(t * 9) * seg(t, T_DIVE, T_DIVE + .3), tentLen: ease(seg(t, T_POP, T_POP + .8)) * .9 + .1,
        pump: t < T_POP + .8 ? 0 : undefined, boilKey: 'J', smear: dive < -.1 ? .6 : 0,
        reachR: t > T_CATCH - .45 ? reach : undefined,
        holdR: caught ? (x, y) => bottle(x + 8, y - 48, 24, 'q', { rot: -.2 + .1 * Math.sin(t * 3), key: 'q1', glowA: 0 }) : undefined,
      });
      if (t > T_DIVE) bubbles(t, jx, jy - 150, 7, 110, 'divebub');
    }
    camEnd();
    // open from paper: the first frames are pure paper, the grain settles in
    if (t < .35) flash(1 - t / .35, PAL.paper);
  }
  shots([[0, prologue]]);
})();
