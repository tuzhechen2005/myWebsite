// score_kinetic.mjs: the score for the kinetic-type reel (v2, Microsoft-focused, 52 s). Synthesized from scratch (no samples) and locked to
// kinetic/cues.js. 120 BPM, A minor-ish, electronic: 808-style kick, clap/snare, hats, a saw-ish bass, a pluck
// arpeggio and a riser; every cut and slam gets an impact / whoosh / glitch / blip.
//   node music/score_kinetic.mjs  → music/kinetic.wav (then EQ + loudnorm → assets/kinetic.m4a, see CLAUDE.md)
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const C = require('../kinetic/cues.js'), S = C.S, Hh = C.hits;
const SR = 44100, DUR = C.dur + 1, N = Math.ceil(SR * DUR), BEAT = .5, TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), sendL = new Float32Array(N), sendR = new Float32Array(N);
const duck = new Float32Array(N).fill(1);   // sidechain: kick ducks the music bus
const musL = new Float32Array(N), musR = new Float32Array(N);
let seed = 7; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function put(t0, len, gen, { gain = 1, pan = 0, rev = 0, bus = 'drum' } = {}) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + len) * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  const BL = bus === 'mus' ? musL : L, BR = bus === 'mus' ? musR : R;
  // float rounding can make the first sample's local time -1e-16, and pow() of a negative is NaN: clamp it
  for (let i = i0; i < i1; i++) { const v = gen(Math.max(0, (i - t0 * SR) / SR)); BL[i] += v * gl; BR[i] += v * gr; sendL[i] += v * gl * rev; sendR[i] += v * gr * rev; }
}
function noise(t0, len, env, filt, o = {}) {
  let lp = 0, bp = 0;
  put(t0, len, tt => { const n = rnd() * 2 - 1, [fc, q0] = filt(tt), q = Math.max(q0, .45), f = Math.min(.85, 2 * Math.sin(Math.PI * Math.min(fc, SR / 7) / SR)); lp += f * bp; const hp = n - lp - q * bp; bp += f * hp; return env(tt) * (o.hp ? hp : o.lp ? lp : bp); }, o);   // f/q clamped: the SVF blows up near f = 1
}
// ---------- drums ----------
const kick = (t, v = 1) => {
  put(t, .55, tt => v * Math.sin(TAU * (48 * tt + 110 * (1 - Math.exp(-tt * 32)) / 32)) * Math.exp(-tt * 6.5) * (tt < .003 ? tt / .003 : 1), { gain: .95 });
  noise(t, .02, tt => v * .5 * Math.exp(-tt * 300), () => [3000, .5], { gain: .5 });
  const i0 = Math.floor(t * SR); for (let i = 0; i < SR * .3 && i0 + i < N; i++) duck[i0 + i] = Math.min(duck[i0 + i], 1 - .65 * Math.exp(-i / SR * 11));
};
const clap = (t, v = 1) => { for (let k = 0; k < 3; k++) noise(t + k * .012, .25, tt => v * (k === 2 ? .8 * Math.exp(-tt * 14) : .6 * Math.exp(-tt * 70)), () => [1400, .5], { gain: .75, rev: .25 }); put(t, .12, tt => v * .25 * Math.sin(TAU * 190 * tt) * Math.exp(-tt * 30), { gain: .6 }); };
const hat = (t, v = 1, open = false) => noise(t, open ? .3 : .06, tt => v * .45 * Math.exp(-tt * (open ? 12 : 70)), () => [9000, .6], { gain: .5, pan: .25, hp: true });
const tick = (t, v = 1) => put(t, .03, tt => v * .3 * Math.sin(TAU * 2600 * tt) * Math.exp(-tt * 180), { gain: .5, pan: -.3 });
// ---------- fx ----------
const impact = (t, v = 1) => { kick(t, v); noise(t, 1.4, tt => v * .9 * Math.exp(-tt * 3.2), tt => [1800 * Math.exp(-tt * 2) + 200, .7], { gain: .7, rev: .6, lp: true }); put(t, 1.6, tt => v * .5 * Math.sin(TAU * (38 * tt + 30 * (1 - Math.exp(-tt * 8)) / 8)) * Math.exp(-tt * 2.2), { gain: .8 }); };
const whoosh = (t, len, v = 1, up = true, pan = 0) => noise(t, len, tt => v * Math.pow(Math.sin(Math.PI * Math.min(1, tt / len)), 2), tt => [up ? 300 * Math.pow(25, tt / len) : 7000 * Math.pow(1 / 25, tt / len), .35], { gain: .7, pan, rev: .4 });
const riser = (t, len, v = 1) => { noise(t, len, tt => v * Math.pow(tt / len, 2.2), tt => [400 * Math.pow(30, tt / len), .25], { gain: .55, rev: .5 }); put(t, len, tt => v * .12 * Math.sin(TAU * (220 * tt + 440 * tt * tt / len)) * Math.pow(tt / len, 2), { gain: .6, rev: .4, bus: 'mus' }); };
const glitch = (t, len, v = 1) => { for (let k = 0; k < Math.floor(len / .035); k++) { const tt = t + k * .035, f = 300 + 3000 * rnd(); put(tt, .03, x => v * .22 * Math.sign(Math.sin(TAU * f * x)) * (rnd() < .5 ? 1 : .3), { gain: .6, pan: rnd() * 2 - 1 }); } };
const blip = (t, m = 93, v = 1, pan = 0) => put(t, .14, tt => v * .28 * Math.sin(TAU * mtof(m) * tt) * Math.exp(-tt * 28), { gain: .7, pan, rev: .35, bus: 'mus' });
const stab = (t, notes, v = 1) => notes.forEach((m, i) => put(t, .7, tt => v * .12 * (Math.sin(TAU * mtof(m) * tt) + .5 * Math.sin(TAU * mtof(m) * 2.001 * tt) + .25 * Math.sin(TAU * mtof(m) * 3 * tt)) * Math.exp(-tt * 5), { gain: .8, pan: (i - 1) * .4, rev: .45, bus: 'mus' }));
const odo = (t, len, v = 1) => { for (let k = 0; k < len / .045; k++) tick(t + k * .045 * (1 + k * .02), v * (.5 + .5 * rnd())); };
// ---------- synths ----------
const bass = (t, m, len, v = 1) => { let ph = 0; put(t, len + .05, tt => { ph += mtof(m) / SR; const saw = 2 * (ph % 1) - 1, sq = (ph % 1) < .5 ? 1 : -1, env = Math.min(1, tt / .005) * (tt < len ? 1 : Math.exp(-(tt - len) * 60)); return v * .32 * env * (Math.tanh(1.8 * (saw * .6 + sq * .25 + Math.sin(TAU * ph * .5) * .8))); }, { gain: .75, bus: 'mus' }); };
const pluck = (t, m, v = 1, pan = 0) => put(t, .5, tt => v * .16 * (Math.sin(TAU * mtof(m) * tt) + .35 * Math.sin(TAU * mtof(m) * 2 * tt) * Math.exp(-tt * 12) + .15 * Math.sin(TAU * mtof(m) * 3.01 * tt) * Math.exp(-tt * 20)) * Math.exp(-tt * 9), { gain: .8, pan, rev: .3, bus: 'mus' });
const pad = (t, notes, len, v = 1) => notes.forEach((m, i) => { const d = [1, 1.004, .996]; put(t, len + .8, tt => { let s = 0; for (const k of d) for (let h = 1; h <= 4; h++) s += Math.sin(TAU * mtof(m) * k * h * tt + h) / (h * h); return v * .025 * s * Math.min(1, tt / .4) * (tt > len ? Math.exp(-(tt - len) * 4) : 1); }, { gain: .8, pan: (i - 1) * .5, rev: .6, bus: 'mus' }); });

// ---------- arrangement (bars of 2 s) ----------
const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // Am F C G
const ROOT = [33, 29, 36, 31];
const barOf = t => Math.floor(t / 2);
const inMs = t => t >= S.ms0 && t < S.thy;
// intro: pad + riser, the dot blips on the beat, impact at the mark
pad(0, [57, 64, 69], 3.6, .8); riser(.5, 3.4, .9);
for (let b = 4; b < 8; b++) blip(b * BEAT, 81 + (b % 2) * 7, .8);
impact(Hh.mark, .9); whoosh(3.5, .5, .9);
// groove from 4 s; the Microsoft chapter gets 16th-note hats and a busier bass
for (let t = 4; t < Hh.glitchEnd; t += BEAT) {
  const b = Math.round(t / BEAT), beatIn = b % 4, ch = barOf(t) % 4;
  if (t >= S.needs && t < S.evid) { if (beatIn === 0) kick(t, .5); continue; }   // breath on "needs"
  if (t >= Hh.tapeGlitch && t < S.thy) { hat(t, 1); hat(t + .25, .8); continue; }  // drop out under the recap glitch
  const calm = t >= S.thy && t < S.proj;                                             // the clinical line breathes
  kick(t, calm ? (beatIn === 0 ? .8 : 0) : beatIn === 0 ? 1 : .85);
  if ((beatIn === 1 || beatIn === 3) && !calm) clap(t, .75);
  const sub = inMs(t) ? 4 : 2;
  for (let e = 0; e < sub; e++) hat(t + e * BEAT / sub, e % 2 ? .9 : .45, e === sub - 1 && beatIn === 3);
  if (t >= S.name) { bass(t, ROOT[ch] + 12, BEAT * .45, .9); bass(t + BEAT / 2, ROOT[ch] + (beatIn === 3 ? 19 : 12), BEAT * .4, .75); if (inMs(t) && beatIn % 2) bass(t + BEAT * .75, ROOT[ch] + 24, BEAT * .2, .5); }
  if (t >= S.ms0 && !calm) for (let s2 = 0; s2 < 4; s2++) { const n = CH[ch][(b * 4 + s2) % 3] + 12 + (s2 === 3 ? 12 : 0); pluck(t + s2 * BEAT / 4, n, .5, s2 % 2 ? .35 : -.35); }
  if (beatIn === 0 && t >= S.name) pad(t, CH[ch].map(m => m + 12), 1.9, .7);
}
// ---- intro hits
whoosh(Hh.answer - .3, .35, .8, true, .3); stab(Hh.answer, [69, 72, 76], .9);
blip(S.needs + .05, 88, .8); blip(S.needs + .3, 93, .6);
impact(Hh.evidSlam, 1); stab(Hh.evidSlam, [57, 60, 64, 69], 1);
glitch(Hh.glitchOut1, .25, .8);
impact(Hh.name, .8); stab(Hh.nameFill, [69, 72, 76, 81], .8); blip(Hh.nameFill, 100, .7);
// ---- 01 Microsoft
riser(S.ms0 - 1.2, 1.2, .8); impact(S.ms0, 1.2); stab(S.ms0, [57, 64, 69, 72], 1);
for (let i = 0; i < 9; i++) tick(Hh.msWord + i * .03, .8);
stab(Hh.msFive, [64, 69, 72, 76], .8); blip(Hh.msFive, 100, .7);
whoosh(S.m1a - .2, .3, .7, false);
for (let j = 0; j < 24; j++) tick(Hh.tiles + j * .035, .7);
stab(Hh.route, [69, 72, 76, 81], .9); blip(Hh.route, 105, .8, .4);
glitch(S.m1b, .12, .6);
for (let c = 0; c < 32; c++) blip(Hh.scan + c * 1.5 / 32, 84 + (c % 8) * 2, .35, -.6 + 1.2 * c / 32);
stab(Hh.scan + 1.5, [69, 72, 76], .7);
whoosh(S.m1c - .2, .3, .7, false);
for (let k = 0; k < 40; k++) tick(Hh.type + k * .031, .55);
for (let i = 0; i < 3; i++) put(Hh.mask + .06 * (i + 1), .12, tt => .2 * Math.sign(Math.sin(TAU * 110 * tt)) * Math.exp(-tt * 20), { gain: .6, pan: .3, bus: 'mus' });
blip(Hh.mask, 96, .8, .3);
Hh.tags.forEach((t, i) => blip(t, 88 + i * 3, .6, -.3 + i * .2));
odo(Hh.flip, 1, .9); stab(Hh.flip + 1, [72, 76, 79, 84], 1); whoosh(Hh.lat - .15, .5, .6, false, .4);
impact(S.m2, .7); Hh.nodes.forEach((t, i) => blip(t, 81 + i * 4, .7, -.4 + i * .4));
Hh.hops.forEach((t, i) => blip(t, [84, 88, 84, 88, 93][i], .8, [-.5, 0, -.5, 0, .5][i]));
stab(Hh.stats2, [69, 72, 76], .8); blip(Hh.stats2 + .15, 96, .5); blip(Hh.stats2 + .3, 100, .5);
impact(S.m3, .8); Hh.rounds.forEach((t, i) => { whoosh(t, .45, .5, true, -.4); whoosh(t + .5, .45, .5, false, .4); stab(t, [[64, 69], [66, 71], [67, 72, 76]][i], .6); });
for (let i = 0; i < 12; i++) blip(Hh.rules + i * .125, 84 + i, .45, .5);
stab(Hh.stats3, [69, 72, 76, 81], .8);
impact(S.m4, .7); for (let i = 0; i < 8; i++) tick(Hh.stages + i * .08, .9);
for (let i = 0; i < 18; i++) { const t0 = Hh.flow + i * .25, drop = t0 + (100 + 3 * 220 + 90 - 80) / 720; if (i % 3 === 2) put(drop, .25, tt => .18 * Math.sin(TAU * (300 - 600 * tt) * tt) * Math.exp(-tt * 10), { gain: .6, pan: -.1, bus: 'mus' }); }
stab(Hh.card, [67, 71, 74], .7); for (let j = 0; j < 6; j++) blip(Hh.card + .7 + j * .12, 88 + j * 2, .5, .4);
stab(Hh.stats4, [69, 72, 76, 81], .8);
impact(S.m5, 1); Hh.rows.forEach((t, i) => { blip(t, 86 + i * 3, .7, -.3); blip(t + .1, 98, .4, .3); });
for (let k = 0; k < 48; k++) tick(Hh.tests + k * 2 / 48, .7);
stab(Hh.tests + 2, [72, 76, 79, 84], .9); stab(Hh.stats5, [69, 72, 76], .7);
impact(Hh.tapes, 1); whoosh(Hh.tapes, .5, .7, false, -.5); whoosh(Hh.tapes + .15, .5, .7, false, .5);
riser(Hh.tapeGlitch, S.thy - Hh.tapeGlitch, .9); glitch(Hh.tapeGlitch, S.thy - Hh.tapeGlitch, .6);
// ---- 02 UW Surgery · 03 projects
pad(S.thy, [57, 64, 69, 72], 3, 1.2); Hh.thyWords.forEach((t, i) => stab(t, [[69, 72], [71, 74], [72, 76, 81]][i], .8)); glitch(Hh.strips, .5, .6);
impact(S.proj, .8); Hh.projRows.forEach((t, i) => { whoosh(t - .2, .3, .6, false, i ? .3 : -.3); stab(t + .6, [[69, 72, 76], [72, 76, 79]][i], .7); });
// ---- end
impact(S.end, 1.1); stab(S.end, [57, 60, 64, 69], 1); pad(S.end, [45, 57, 64, 69, 72], 4.3, 1.2);
stab(Hh.endMark, [69, 72, 76, 81], .8);
glitch(Hh.glitchEnd, 1, .9); whoosh(Hh.glitchEnd + .5, .5, .9, false, 0);
impact(Hh.endDot, .9); put(Hh.endDot, 1.4, tt => .25 * Math.sin(TAU * 1760 * tt) * Math.exp(-tt * 4), { gain: .6, rev: .8, bus: 'mus' });

// ---------- mix: sidechain music bus, reverb, glue, master ----------
function verb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491].map(d => ({ b: new Float32Array(d + spread), i: 0, s: 0 })), aps = [556, 441, 341].map(d => ({ b: new Float32Array(d + spread), i: 0 }));
  const o = new Float32Array(N);
  for (let n = 0; n < N; n++) { const x = inp[n] * .02; let y = 0; for (const c of combs) { const v = c.b[c.i]; c.s = v * .7 + c.s * .3; c.b[c.i] = x + c.s * .82; c.i = (c.i + 1) % c.b.length; y += v; } for (const a of aps) { const v = a.b[a.i]; a.b[a.i] = y + v * .5; a.i = (a.i + 1) % a.b.length; y = v - y; } o[n] = y; }
  return o;
}
const wl = verb(sendL, 0), wr = verb(sendR, 23);
const oL = new Float32Array(N), oR = new Float32Array(N); let peak = 0;
for (let n = 0; n < N; n++) {
  let l = L[n] + musL[n] * duck[n] + wl[n] * 4, r = R[n] + musR[n] * duck[n] + wr[n] * 4;
  l = Math.tanh(l * 1.2) / 1.2 * 1.1; r = Math.tanh(r * 1.2) / 1.2 * 1.1;
  oL[n] = l; oR[n] = r; peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const g = .9 / peak, fadeOut = Math.floor((C.dur - .2) * SR);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const f = Math.min(1, n / (.02 * SR)) * (n > fadeOut ? Math.max(0, 1 - (n - fadeOut) / (1.2 * SR)) : 1);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oL[n] * g * f)) * 32767), 44 + n * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oR[n] * g * f)) * 32767), 46 + n * 4);
}
writeFileSync(new URL('./kinetic.wav', import.meta.url), buf);
console.log(`kinetic.wav: ${DUR} s, peak ${peak.toFixed(2)} → normalized`);
