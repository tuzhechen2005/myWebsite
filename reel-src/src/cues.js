// cues.js: the shared timeline. Scenes read it, and music/score.mjs evaluates this same file, so every hit in the
// score lands on its frame. 96 BPM: one beat = 0.625 s, one bar = 2.5 s. B(n) = the time of beat n.
const CUE = (() => {
  const b = 60 / 96, B = n => +(n * b).toFixed(4);
  return {
    bpm: 96, B,
    ch: { pro: 0, arc: 10, cli: 27.5, tool: 45, thy: 60, epi: 85, end: 95 },
    pro: { hit: B(2), pop: B(5), eyes: B(7), bottle: B(9), catch: B(12), dive: B(14) },
    // ch.2 clinic (27.5 = beat 44)
    cli: { pop: B(50), ask: B(54), write: B(55), pass1: B(56), pass2: B(57), point: B(57.5), red: B(58), see: B(59), flag: B(60),
           bell: B(61), octoIn: B(62), scoop: B(63), nod: B(64), octoOut: B(65.5), merge: B(68) },
    // ch.3 tool wall (45 = beat 72): two slow tries, eight fast ones, reset + sweatband, round two, the toss
    tool: { r1: B(74), r1fast: B(77), reset: B(82), r2: B(84), toss: B(92) },
    // ch.4 thyroid research (60 = beat 96): the paper butterfly, the fake star, the dive for sources, the stitch,
    // the empty clam remembered, the hand-off to the surgeon
    thy: { surface: B(97.6), land: B(101), bubble: B(102), spark: B(103), reach: B(104), turn: B(105), sus: B(106), poke: B(107),
           shake: B(108), dive: B(110), deep: B(113), c1: B(114), c2: B(115), c3: B(116), c4: B(117), rise: B(118), back: B(120),
           s1: B(121), s2: B(122), s3: B(123), perk: B(124), notice: B(126.5), think: B(127), shake2: B(129), octo: B(130),
           hand: B(131), touch: B(133), fly: B(134) },
    // epilogue (85 = beat 136)
    epi: { up: B(136), surface: B(139), write: B(142), seal: B(148), bow: B(149), dive: B(150), end: B(152) },
  };
})();
if (typeof module !== 'undefined') module.exports = CUE;
