// kinetic/cues.js: the timeline of the kinetic-type reel (shared by the page and music/score_kinetic.mjs).
// 120 BPM: a beat is 0.5 s, a bar 2 s. Every cut lands on a beat.
var KCUE = (() => {
  const B = n => +(n * 0.5).toFixed(4);
  return {
    bpm: 120, fps: 30, dur: 42, B,
    // scene starts (s)
    S: { boot: 0, every: 4, needs: 6, evid: 7, name: 8, rag1: 10, rag2: 13, tri1: 16, tri2: 19, tri3: 20, ms1: 22, ms2: 25, thy1: 28, thy2: 30, thy3: 32, end: 36 },
    hits: {
      dot: 2, mark: 3, flashMark: 3.75, answer: 5, needsCircle: 6, evidSlam: 7, glitchOut1: 7.75, name: 8, nameFill: 8.5,
      rag: [10, 10.5, 11], ragTags: 12, count1: 13.25, count2: 14.5, wipe: 15.75,
      roles: [16.5, 17, 17.5, 18, 18.5], red: 19, stat: 20,
      ms: [22, 22.5, 23], flip: 26, thyWords: [28, 28.5, 29], strips: 29.5, ticks: [30.5, 31, 31.5, 32, 32.5],
      tapes: 32, tapeGlitch: 35.5, endLetters: 36, endMark: 36.5, glitchEnd: 40.5, endDot: 41.5,
    },
  };
})();
if (typeof module !== 'undefined') module.exports = KCUE;
