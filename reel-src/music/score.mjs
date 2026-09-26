// score.mjs: the original score for "The Paper Sea", synthesized from scratch (no samples) and locked to the picture:
// it reads src/cues.js, the same timeline the scenes animate to, so every hit lands on its frame.
//   node music/score.mjs            → music/score.wav, then encode: ffmpeg -i music/score.wav -c:a aac -b:a 192k assets/score.m4a
// 96 BPM, D major. Jelly's motif: A4 D5 E5 F#5 · E5 D5. It is heard hopeful (prologue), busy (archive), spelled by the
// tool-wall hits (round two), stitched note by note into the butterfly, and completed by the surgeon's touch.
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const CUE = require('../src/cues.js');
const { B } = CUE, BEAT = 60 / 96, BAR = BEAT * 4;

const SR = 44100, DUR = CUE.ch.end + 1.5, N = Math.ceil(SR * DUR);
const dryL = new Float32Array(N), dryR = new Float32Array(N), revL = new Float32Array(N), revR = new Float32Array(N);
let seed = 1234567; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;

// write one voice: gen(i, tt) → sample at local time tt; pan -1..1; rev = reverb send
function voice(t0, len, gen, gain = 1, pan = 0, rev = .3) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + len) * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = i0; i < i1; i++) {
    const v = gen((i - t0 * SR) / SR);
    dryL[i] += v * gl; dryR[i] += v * gr; revL[i] += v * gl * rev; revR[i] += v * gr * rev;
  }
}
const att = (tt, a) => tt < a ? tt / a : 1;

// ---------- instruments ----------
const INST = {
  piano(f, len, v) { const P = [1, 2, 3, 4, 5, 6], A = [1, .42, .2, .11, .05, .025]; return [len + 1.6, tt => { let s = 0; for (let k = 0; k < 6; k++) s += A[k] * Math.sin(TAU * f * P[k] * (1 + k * .0004) * tt) * Math.exp(-tt * (1.1 + k * .9)); const rel = tt > len ? Math.exp(-(tt - len) * 5) : 1; return v * .32 * s * att(tt, .004) * rel; }]; },
  pluck(f, len, v) { return [1.8, tt => v * .3 * (Math.sin(TAU * f * tt) + .18 * Math.sin(TAU * f * 2 * tt) * Math.exp(-tt * 6) + .1 * Math.sin(TAU * f * 5.4 * tt) * Math.exp(-tt * 14)) * Math.exp(-tt * 3.2) * att(tt, .003)]; },
  bell(f, len, v) { const P = [1, 2, 3, 4.2, 5.4], A = [1, .5, .22, .12, .06]; return [3, tt => { let s = 0; for (let k = 0; k < 5; k++) s += A[k] * Math.sin(TAU * f * P[k] * tt) * Math.exp(-tt * (1.6 + k * 1.2)); return v * .22 * s * att(tt, .002); }]; },
  glass(f, len, v) { return [4, tt => v * .2 * (Math.sin(TAU * f * tt) + .3 * Math.sin(TAU * f * 2.76 * tt) + .12 * Math.sin(TAU * f * 5.4 * tt)) * Math.exp(-tt * 1.1) * (1 + .25 * Math.sin(TAU * 5.5 * tt)) * att(tt, .01)]; },
  marimba(f, len, v) { return [1, tt => v * .34 * (Math.sin(TAU * f * tt) * Math.exp(-tt * 5) + .35 * Math.sin(TAU * f * 3.93 * tt) * Math.exp(-tt * 14) + .08 * Math.sin(TAU * f * 9.8 * tt) * Math.exp(-tt * 30)) * att(tt, .002)]; },
  bass(f, len, v) { return [len + .3, tt => { const e = att(tt, .012) * (tt < len ? .55 + .45 * Math.exp(-tt * 5) : .55 * Math.exp(-(tt - len) * 14)); return v * .42 * e * (Math.sin(TAU * f * tt) + .28 * Math.sin(TAU * f * 2 * tt) + .08 * Math.sin(TAU * f * 3 * tt)); }]; },
  pizz(f, len, v) { return [.5, tt => v * .35 * (Math.sin(TAU * f * tt) + .4 * Math.sin(TAU * f * 2 * tt) * Math.exp(-tt * 20)) * Math.exp(-tt * 9) * att(tt, .003)]; },
  pad(f, len, v) {   // two detuned voices, soft harmonics, slow swell
    const d = [1, 1.0035], ph = [rnd() * TAU, rnd() * TAU];
    return [len + 1.4, tt => { let s = 0; for (let j = 0; j < 2; j++) for (let k = 1; k <= 5; k++) s += Math.sin(TAU * f * d[j] * k * tt + ph[j] * k) / Math.pow(k, 1.5); const e = Math.min(1, tt / .9) * (tt > len ? Math.exp(-(tt - len) * 2.6) : 1); return v * .06 * s * e * (1 + .12 * Math.sin(TAU * .3 * tt)); }];
  },
};
function note(t, m, beats, inst, v = .7, pan = 0, rev = .3) { const f = typeof m === 'number' && m < 200 ? mtof(m) : m; const [len, g] = INST[inst](f, beats * BEAT, v); voice(t, len, g, 1, pan, rev); }
function chord(t, notes, beats, inst = 'pad', v = .6, rev = .5) { notes.forEach((m, i) => note(t, m, beats, inst, v, (i / (notes.length - 1) - .5) * .6, rev)); }

// ---------- drums & sfx (noise from the seeded PRNG) ----------
function noiseVoice(t0, len, env, filt, gain, pan = 0, rev = .15) {
  let lp = 0, bp = 0, hp = 0;
  voice(t0, len, tt => { const n = rnd() * 2 - 1, [fc, q] = filt(tt), f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); lp += f * bp; hp = n - lp - q * bp; bp += f * hp; return env(tt) * bp; }, gain, pan, rev);
}
const SFX = {
  kick: (t, v = 1) => voice(t, .4, tt => v * .9 * Math.sin(TAU * (45 * tt + 75 * (1 - Math.exp(-tt * 28)) / 28)) * Math.exp(-tt * 8), 1, 0, .05),
  hat: (t, v = 1, pan = .2) => noiseVoice(t, .08, tt => v * .5 * Math.exp(-tt * 55), () => [8000, .7], .5, pan, .05),
  shaker: (t, v = 1, pan = -.2) => noiseVoice(t, .12, tt => v * .5 * Math.min(1, tt / .012) * Math.exp(-tt * 30), () => [6000, .9], .5, pan, .08),
  clap: (t, v = 1) => { for (let k = 0; k < 3; k++) noiseVoice(t + k * .011, .18, tt => v * .6 * Math.exp(-tt * (k === 2 ? 18 : 60)), () => [1500, .6], .7, 0, .3); },
  whoosh: (t, len, v = 1, f0 = 300, f1 = 3000, pan = 0) => noiseVoice(t, len, tt => v * Math.sin(Math.PI * Math.min(1, tt / len)) ** 2, tt => [f0 * Math.pow(f1 / f0, tt / len), .35], .9, pan, .4),
  swish: (t, len, v = 1) => noiseVoice(t, len, tt => v * Math.sin(Math.PI * Math.min(1, tt / len)) * (.6 + .4 * Math.sin(tt * 90)), tt => [1800 + 2500 * tt / len, .8], .6, .3, .3),
  plip: (t, v = 1, pan = 0) => { voice(t, .5, tt => v * .5 * Math.sin(TAU * (500 * tt + 1100 * (1 - Math.exp(-tt * 30)) / 30)) * Math.exp(-tt * 12) * att(tt, .002), 1, pan, .6); },
  pop: (t, v = 1, pan = 0) => voice(t, .15, tt => v * .45 * Math.sin(TAU * (380 * tt + 1500 * tt * tt * 12)) * Math.exp(-tt * 40), 1, pan, .3),
  clonk: (t, v = 1, pan = .3) => { note(t, 38 + 12, .4, 'marimba', v * .9, pan, .15); noiseVoice(t, .06, tt => v * .5 * Math.exp(-tt * 70), () => [900, .5], .6, pan, .1); note(t, 50.6, .3, 'marimba', v * .5, pan, .1); },
  clack: (t, v = 1) => { for (const r of [1, 2.31, 3.72, 5.1]) voice(t, .3, tt => v * .16 * Math.sin(TAU * 1180 * r * tt) * Math.exp(-tt * 26), 1, .3, .2); noiseVoice(t, .04, tt => v * .8 * Math.exp(-tt * 90), () => [3000, .5], .8, .3, .1); },
  boing: (t, v = 1) => voice(t, .8, tt => v * .4 * Math.sin(TAU * (190 * tt + 40 * Math.sin(TAU * 9 * tt) * Math.exp(-tt * 3) / 9)) * Math.exp(-tt * 4) * att(tt, .005), 1, .4, .3),
  heart: (t, v = 1) => { for (const [d, a] of [[0, 1], [.2, .7]]) voice(t + d, .35, tt => v * a * .8 * Math.sin(TAU * (48 * tt + 30 * (1 - Math.exp(-tt * 20)) / 20)) * Math.exp(-tt * 12), 1, 0, .1); },
  alarm: (t, v = 1) => { for (let k = 0; k < 6; k++) { const f = k % 2 ? 659 : 880; voice(t + k * B(.5), B(.45), tt => v * .12 * (Math.sin(TAU * f * tt) + Math.sin(TAU * f * 3 * tt) / 3 + Math.sin(TAU * f * 5 * tt) / 5) * att(tt, .01) * Math.min(1, (B(.45) - tt) / .02), 1, -.3, .35); } },
  handbell: (t, v = 1) => { for (let k = 0; k < 4; k++) note(t + k * .09, 88, 1, 'bell', v * (.9 - k * .15), .4, .5); },
  sparkle: (t, v = 1, n = 6, base = 86) => { for (let k = 0; k < n; k++) note(t + k * .05, base + [0, 4, 7, 12, 16, 19, 24][k % 7], .5, 'bell', v * .5, (k / n - .5), .6); },
  splash: (t, v = 1) => { noiseVoice(t, .6, tt => v * Math.exp(-tt * 7) * att(tt, .005), tt => [2500 - 1500 * tt, .5], .7, 0, .5); SFX.plip(t + .05, v * .6, .2); SFX.plip(t + .13, v * .4, -.3); },
};

// ---------- harmony ----------
const CH = {
  Dadd9: [50, 57, 62, 64, 66], D: [50, 57, 62, 66, 69], Bm: [47, 54, 59, 62, 66], G: [43, 55, 59, 62, 67], Gmaj7: [43, 55, 59, 62, 66], A: [45, 52, 57, 61, 64],
  Em: [40, 52, 55, 59, 64], FSm: [42, 54, 57, 61, 66], 'D/F#': [42, 57, 62, 66, 69], Dmaj7: [50, 57, 61, 66, 69], Em7: [40, 50, 55, 59, 62], Asus: [45, 52, 57, 62, 64],
};
// one chord per bar (bar n starts at n·2.5 s); '-' = hold, null = silence
const BARS = ['Dadd9', 'Dadd9', 'Gmaj7', 'Bm',                          // prologue 0–10
  'D', 'Bm', 'G', 'A', 'D', 'Bm', 'A',                                     // archive 10–27.5
  'Em', 'A', 'D', 'G', 'Bm', 'G', 'D',                                     // clinic 27.5–45
  'D', 'G', 'Em', 'D', 'G', 'A',                                           // tools 45–60
  'Bm', 'G', 'Dmaj7', 'Em', 'Bm', 'FSm', 'D', 'G', 'Bm', 'A',              // thyroid 60–85
  'G', 'D/F#', 'Em7', 'D'];                                                // epilogue 85–95
const ROOT = { Dadd9: 38, D: 38, Bm: 35, G: 31, Gmaj7: 31, A: 33, Em: 40, FSm: 42, 'D/F#': 42, Dmaj7: 38, Em7: 40, Asus: 33 };
BARS.forEach((c, n) => { if (!c) return; const t = n * BAR + (n === 0 ? B(2) : 0), len = (n === 0 ? 2 : 4) + .15; chord(t, CH[c], len, 'pad', n < 4 ? .5 : .62, .55); });

// ---------- sections ----------
const M = [69, 74, 76, 78, 76, 74], MR = [.5, .5, .5, 1.5, .5, .5];   // the motif, in beats
const motif = (t, inst, v, oct = 0, rev = .4, stretch = 1) => { let x = t; M.forEach((m, i) => { note(x, m + oct, MR[i] * stretch + .3, inst, v, 0, rev); x += MR[i] * BEAT * stretch; }); };
const bassBar = (n, pattern = [0, 2, 2.5], v = .7) => { const r = ROOT[BARS[n]]; pattern.forEach((b, i) => note(n * BAR + B(b), r + (i === 2 ? 12 : 0) + 12, .9, 'bass', v)); };
const groove = (n, o = {}) => { const t = n * BAR; for (let b = 0; b < 4; b++) { if (!o.noKick && (b === 0 || b === 2)) SFX.kick(t + B(b), .8); if (o.clap && (b === 1 || b === 3)) SFX.clap(t + B(b), .5); for (let e = 0; e < 2; e++) SFX.shaker(t + B(b + e / 2), e ? .5 : .8); } };

// prologue: the drop, the bloom's harp, the eyes, the hopeful motif, the catch, the dive
const P = CUE.pro;
SFX.plip(P.hit, 1); note(P.hit + .02, 86, 2, 'glass', .6, 0, .8);
[62, 69, 74, 76, 78, 81, 86].forEach((m, i) => note(P.hit + .35 + i * .16, m, 3, 'pluck', .45, (i - 3) * .12, .7));
note(P.eyes, 93, 2, 'bell', .6, .2, .7); note(P.eyes + .08, 86, 2, 'bell', .4, -.2, .7);
motif(B(9), 'bell', .5, 12, .6);
note(P.bottle + .6, 88, 1, 'bell', .45, .3); note(P.catch, 74, 2, 'piano', .7); note(P.catch, 78, 2, 'piano', .5); note(P.catch, 81, 2, 'piano', .45);
for (let k = 0; k < 4; k++) note(B(12.5 + k * .5), [71, 74, 78, 81][k], .6, 'pluck', .5, .1);
SFX.whoosh(P.dive - .1, 1.3, .9, 250, 4000); note(P.dive, 38, 4, 'bass', .6);

// archive: groove, router marimba (panned toward the store it goes to), net/whirl/sieve, the eel, the lock, the page turn
for (let n = 5; n <= 9; n++) { groove(n); bassBar(n); }
bassBar(4, [0, 2]); SFX.kick(B(16), 1);
[[15.0, 'doc'], [16.25, 'grid'], [16.875, 'doc'], [17.5, 'grid'], [17.8125, 'doc']].forEach(([tt, k], i) => { note(tt, [74, 78, 81, 83, 86][i], 1, 'marimba', .8, k === 'doc' ? -.7 : .7, .25); note(tt + .55, [86, 90, 93, 95, 98][i], 1, 'bell', .35, k === 'doc' ? -.8 : .8, .6); });
SFX.whoosh(19.375 - .05, .6, .7, 400, 2500, -.5); note(19.95, 71, 1, 'pluck', .6, -.5); note(19.95, 74, 1, 'pluck', .5, -.5);
for (let k = 0; k < 10; k++) note(20.625 + k * B(.25), [74, 78, 81, 85, 86, 90, 93, 85, 81, 78][k], .4, 'pluck', .45, .5 * Math.sin(k), .5);
SFX.shaker(22.5, 1.2, 0); SFX.shaker(22.56, 1, 0); SFX.shaker(23.125, 1.2, 0); SFX.shaker(23.19, 1, 0);
SFX.sparkle(23.2, .8, 6, 86); note(23.75, 74, 2, 'piano', .6); note(23.75, 78, 2, 'piano', .5); note(23.75, 83, 2, 'piano', .45);
motif(B(32), 'piano', .45, 0, .35);
for (let k = 0; k < 6; k++) note(24.9 + k * B(.5), [47, 48, 49, 50, 49, 48][k], .4, 'pizz', .7, .3);                 // the eel sneaks
SFX.clack(25.625, 1); SFX.kick(25.625, .9); SFX.boing(25.7, .9); note(26.25, 83, .5, 'pluck', .6, -.2); note(26.5, 86, 1, 'pluck', .6, -.2);
SFX.swish(26.9, 1.2, .9);

// clinic: the sad seahorse, four pops = four voices joining, the relay; then the heart, the alarm, the bell,
// the surgeon (a warm swell), the nod; the merge pops; the whip pan
note(28.2, 76, 2, 'piano', .45); note(29.4, 74, 2, 'piano', .4); note(30.6, 71, 3, 'piano', .4);
bassBar(12, [0, 2]); bassBar(13); bassBar(14); groove(13, { clap: false }); groove(14);
const E2 = CUE.cli, VO = ['marimba', 'pluck', 'bell', 'pizz'], VP = [[74, 78], [81, 78], [86, 90], [62, 69]];
for (let n = 0; n < 4; n++) { const tt = E2.pop + n * B(1); SFX.pop(tt, .9, (n - 1.5) * .4); note(tt + .02, [74, 78, 81, 86][n], 1, VO[n], .6, (n - 1.5) * .4); }
for (let k = 0; k < 10; k++) for (let n = 0; n < 4; n++) if ((k + n) % 2 === 0 || n === 3) note(E2.ask + k * B(.5), VP[n][k % 2] + (n === 3 ? 0 : 0), .5, VO[n], .35, (n - 1.5) * .5, .3);
note(E2.point, 90, 1, 'bell', .5, .6);
SFX.heart(E2.red, 1); SFX.heart(E2.red + B(1), .8);
SFX.alarm(E2.flag, 1); SFX.kick(E2.flag, .8);
SFX.handbell(E2.bell, .9);
SFX.whoosh(E2.octoIn - .2, .8, .8, 300, 2000, .6);
chord(E2.octoIn, [43, 55, 62, 67, 71], 4, 'pad', .9, .6); note(E2.scoop, 67, 2, 'piano', .6); note(E2.scoop, 71, 2, 'piano', .5);
note(E2.nod, 62, 3, 'piano', .6); note(E2.nod, 66, 3, 'piano', .5); note(E2.nod, 69, 3, 'piano', .5); note(E2.nod, 74, 3, 'piano', .5);
SFX.whoosh(E2.nod + .3, 1, .6, 400, 1500, .7);
for (let n = 0; n < 4; n++) { const tt = E2.merge + n * B(.5); SFX.pop(tt, .8, (1.5 - n) * .3); note(tt, [86, 81, 78, 74][n], .5, 'pluck', .5); }
note(E2.merge + B(2.5), 74, 2, 'bell', .5); groove(17); bassBar(17);
SFX.whoosh(44.35, .7, 1, 500, 5000, .8);

// tools: tighter groove with claps; hits ring, misses clonk; round two spells the motif; the reset; the toss
const E3 = CUE.tool;
for (let n = 18; n <= 23; n++) { if (n !== 20) groove(n, { clap: true }); bassBar(n, [0, 1.5, 2.5, 3]); }
const hit = (tt, m, pan = .5) => { note(tt, m, .6, 'marimba', .8, pan, .25); note(tt + .01, m + 12, .5, 'bell', .35, pan, .5); };
const R1T = [E3.r1, E3.r1 + B(2), ...Array.from({ length: 8 }, (_, n) => E3.r1fast + n * B(.5))], R1H = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0];
const R2T = [0, .5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5].map(x => E3.r2 + B(x)), R2H = [1, 1, 1, 1, 1, 1, 0, 1, 1, 1];
R1T.forEach((tt, i) => R1H[i] ? hit(tt, [74, 78, 76, 81, 74, 79, 76, 83, 81, 74][i]) : SFX.clonk(tt, .9));
for (let k = 0; k < 6; k++) note(50.4 + k * .1, 81 - k * 2.5, .3, 'pluck', .4, Math.sin(k * 2) * .5);    // dizzy wobble
SFX.whoosh(E3.reset - .4, .5, .7, 3000, 400, 0); SFX.clap(E3.reset, .7); note(E3.reset, 62, 2, 'piano', .5); note(E3.reset + B(1), 69, 1, 'piano', .5);
const SPELL = [69, 74, 76, 78, 76, 74, 0, 78, 81, 86];
R2T.forEach((tt, i) => R2H[i] ? hit(tt, SPELL[i], .4) : SFX.clonk(tt, .5));
SFX.sparkle(55.7, .8, 7, 86); chord(55.6, [50, 62, 66, 69, 74], 3, 'piano', .5, .4);
SFX.whoosh(E3.toss - .1, 2.4, .9, 300, 6000, 0); for (let k = 0; k < 8; k++) note(E3.toss + k * .2, 74 + [0, 4, 7, 12, 16, 19, 24, 28][k], .5, 'bell', .4 - k * .03, (k % 2 - .5) * .4, .7);

// thyroid: fragile music box for the butterfly; the too-sweet shimmer and its detuned collapse; the pop; the dive into a
// drone; three found notes; the empty clam; the stitched motif; the honest minor; the surgeon's touch completes it
const E4 = CUE.thy, EP = CUE.epi;
[81, 78, 74, 76, 74, 71].forEach((m, i) => note(60.3 + i * B(.75), m + 12, 1.5, 'bell', .35, .3, .7));
note(E4.surface, 62, 3, 'glass', .5); SFX.plip(E4.surface, .6);
note(E4.land, 74, 3, 'piano', .5); note(E4.land, 78, 3, 'piano', .4);
for (let k = 0; k < 12; k++) { const tt = E4.bubble + k * B(.5), det = tt > E4.turn ? 1 - .06 * Math.min(1, (tt - E4.turn) / 1.2) : 1; if (tt < E4.poke) note(tt, mtof([86, 90, 93, 97][k % 4]) * det, .8, 'glass', .35, (k % 2 - .5) * .7, .7); }
SFX.pop(E4.poke, 1.1, .4); SFX.whoosh(E4.poke + .1, 1.2, .4, 1500, 200, .4);
note(E4.shake, 47, 1, 'piano', .6); note(E4.shake + B(1), 45, 1.5, 'piano', .6);
SFX.whoosh(E4.dive, 1.8, .8, 2000, 150, 0); note(E4.dive + .5, 26 + 12, 10, 'pad', .9, 0, .5); note(E4.dive + .5, 33 + 12, 10, 'pad', .6, 0, .5);
for (let k = 0; k < 8; k++) note(E4.deep + k * B(.75), [86, 93, 90, 98, 86, 95, 93, 90][k], 1, 'glass', .22, Math.sin(k * 1.7) * .7, .8);
[E4.c1, E4.c2, E4.c3].forEach((tt, i) => { note(tt, [78, 81, 86][i], 2, 'bell', .7, (i - 1) * .5, .6); note(tt, [66, 69, 74][i], 2, 'piano', .4, (i - 1) * .5); });
note(E4.c4, 38, .5, 'marimba', .7); note(E4.c4 + .25, 68, 1, 'pluck', .35);                               // the empty clam
for (let k = 0; k < 6; k++) note(E4.rise + k * B(.25), [62, 66, 69, 74, 78, 81][k], .5, 'pluck', .45, 0, .6);
[E4.s1, E4.s2, E4.s3].forEach((tt, i) => { note(tt, [78, 81, 86][i], 2, 'bell', .7, 0, .6); SFX.sparkle(tt + .05, .35, 3, [90, 93, 98][i]); });
motif(E4.perk, 'piano', .7, 0, .45); chord(E4.perk, [43, 55, 62, 67, 71], 4, 'pad', .6, .6); groove(31, { noKick: true });
note(E4.think, 76, 1, 'pluck', .4); note(E4.think + B(1), 74, 1, 'pluck', .35); note(E4.think + B(2), 71, 2, 'pluck', .35);
note(E4.shake2, 59, 3, 'piano', .5); note(E4.shake2, 62, 3, 'piano', .45); note(E4.shake2, 66, 3, 'piano', .4);
chord(E4.octo, [45, 57, 61, 64, 69], 4, 'pad', .8, .6); note(E4.hand, 73, 2, 'piano', .45);
// the completion: the missing top note, a full D chord, a sparkle
note(E4.touch, 86, 4, 'bell', .8, 0, .6); note(E4.touch, 86 - 12, 4, 'piano', .7); chord(E4.touch, [38, 50, 57, 62, 66, 69], 5, 'piano', .5, .5); SFX.sparkle(E4.touch + .05, .7, 7, 86);
SFX.whoosh(E4.fly, 2.5, .6, 400, 3000, 0);

// epilogue: the motif, slow, while the name is written; the seal thumps on the beat; the dive answers the opening drop
motif(EP.up + B(1), 'bell', .45, 12, .7, 1);
SFX.splash(EP.surface, .7);
motif(EP.write, 'piano', .6, 0, .5, 1.5);
for (let k = 0; k < 12; k++) note(EP.write + k * B(.5), [62, 69, 74, 69, 64, 69, 76, 69, 66, 69, 78, 69][k], .6, 'pluck', .3, (k % 2 - .5) * .5, .6);
SFX.kick(EP.seal, .9); note(EP.seal, 38, 4, 'bass', .6); chord(EP.seal, [50, 57, 62, 66, 69, 74], 6, 'piano', .5, .6); note(EP.seal, 86, 4, 'bell', .6, 0, .7);
SFX.plip(EP.dive + .2, 1); SFX.splash(EP.dive + .22, .5); note(EP.dive + .25, 86, 3, 'glass', .5, 0, .9);

// ---------- reverb (Freeverb), mix, master ----------
function freeverb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => ({ b: new Float32Array(d + spread), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map(d => ({ b: new Float32Array(d + spread), i: 0 }));
  const out = new Float32Array(N), fb = .86, damp = .25;
  for (let n = 0; n < N; n++) {
    const x = inp[n] * .015; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.s = o * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * fb; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * .5; a.i = (a.i + 1) % a.b.length; y = o - y; }
    out[n] = y;
  }
  return out;
}
const wetL = freeverb(revL, 0), wetR = freeverb(revR, 23);
const outL = new Float32Array(N), outR = new Float32Array(N);
let peak = 0;
for (let n = 0; n < N; n++) {
  let l = dryL[n] + wetL[n] * 5.5, r = dryR[n] + wetR[n] * 5.5;
  l = Math.tanh(l * .9); r = Math.tanh(r * .9);
  outL[n] = l; outR[n] = r; peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const g = .89 / peak, fadeIn = .08 * SR, fadeOut = 1.6 * SR, end = Math.floor(CUE.ch.end * SR) + SR;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const f = Math.min(1, n / fadeIn) * Math.min(1, Math.max(0, (end - n) / fadeOut));
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[n] * g * f)) * 32767), 44 + n * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[n] * g * f)) * 32767), 46 + n * 4);
}
writeFileSync(new URL('./score.wav', import.meta.url), buf);
console.log(`score.wav: ${DUR.toFixed(1)} s, peak ${peak.toFixed(2)} → normalized`);
