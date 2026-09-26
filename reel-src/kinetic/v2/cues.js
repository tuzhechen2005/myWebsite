// kinetic/cues.js: the timeline of the kinetic-type reel (shared by the page and music/score_kinetic.mjs).
// v2 (Microsoft-focused): 52 s, 120 BPM (a beat is 0.5 s, a bar 2 s). Microsoft Cloud & AI takes 10–40 s.
var KCUE = (() => {
  const B = n => +(n * 0.5).toFixed(4);
  return {
    bpm: 120, fps: 30, dur: 52, B,
    // scene starts (s)
    S: { boot: 0, every: 4, needs: 6, evid: 7, name: 8,
         ms0: 10, m1a: 12, m1b: 14, m1c: 16, m1d: 18, m2: 21, m3: 25, m4: 29, m5: 34, msEnd: 38,
         thy: 40, proj: 43, end: 46 },
    hits: {
      dot: 2, mark: 3, answer: 5, evidSlam: 7, glitchOut1: 7.75, name: 8, nameFill: 8.5,
      msWord: 10, msSub: 10.5, msFive: 11,
      tiles: 12.25, route: 13.25,
      scan: 14.25,
      type: 16.1, mask: 16.75, tags: [17, 17.25, 17.5, 17.75],
      flip: 18.25, lat: 19.5,
      nodes: [21, 21.25, 21.5], hops: [22, 22.5, 23, 23.5, 24], stats2: 23.5,
      rounds: [25.5, 26.5, 27.5], rules: 26, stats3: 28,
      stages: 29, flow: 29.5, card: 31.5, stats4: 32.5,
      rows: [34.5, 35, 35.5, 36], tests: 34.75, stats5: 37,
      tapes: 38, tapeGlitch: 39.5,
      thyWords: [40, 40.5, 41], strips: 42.5,
      projRows: [43, 44],
      endLetters: 46, endMark: 46.5, glitchEnd: 50.5, endDot: 51.5,
    },
  };
})();
if (typeof module !== 'undefined') module.exports = KCUE;
