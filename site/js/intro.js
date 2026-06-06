/* =========================================================
   intro.js — scroll-scrubbed cinematic landing (canvas 2D).
   Scrolling advances an image sequence frame-by-frame while
   bilingual text lines cross-fade in; ends at an "Enter" portal.

   No video yet -> set FRAME_COUNT = 0 and a procedural placeholder
   animation is drawn instead (fully testable). When real frames
   exist, drop frame-0001.jpg… into assets/intro/ and set FRAME_COUNT.
   Canvas 2D only (no WebGL) -> GPU-light and safe.
   ========================================================= */
(function () {
  // ----- config (swap these in when the real frames are ready) -----
  var FRAME_COUNT = 360; // underwater sinking intro (背景视频.mp4), full 15s @ 24fps, q2 (source is 720p)
  // ?v bump = cache-bust: frames are served immutable (_headers /assets/*), and the
  // underwater set OVERWROTE the old baobab frames at the same filenames, so the URL
  // must change for browsers/Cloudflare edge to re-fetch. Bump this when frames change.
  var FRAME_V = '2';
  function FRAME_PATH(i) { return 'assets/intro/frame-' + String(i).padStart(4, '0') + '.jpg?v=' + FRAME_V; }
  var PLACEHOLDER_FRAMES = 120; // virtual count shown in the placeholder label
  // Still fallback (shown only if FRAME_COUNT=0 or a frame fails); drawn with a
  // subtle scroll-driven ken-burns push-in. Set '' to disable.
  var POSTER = 'assets/intro/frame-0001.jpg?v=' + '2';

  var canvas = document.getElementById('introCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var loaderEl = document.getElementById('introLoader');
  var barEl = loaderEl ? loaderEl.querySelector('.intro__bar i') : null;
  var labelEl = loaderEl ? loaderEl.querySelector('.intro__loadlabel') : null;

  var gsap = window.gsap, ST = window.ScrollTrigger;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var frames = [];
  var useFrames = FRAME_COUNT > 0;
  var poster = null;
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var lastP = 0;

  // mark intro-seen when the visitor leaves into the site
  Array.prototype.forEach.call(document.querySelectorAll('[data-intro-exit]'), function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('intro-seen', '1'); } catch (e) {} });
  });

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    draw(lastP);
  }

  function drawCoverScaled(img, scale, panX, panY) {
    var w = canvas.width, h = canvas.height;
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var s = Math.max(w / iw, h / ih) * scale, dw = iw * s, dh = ih * s;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2 + panX, (h - dh) / 2 + panY, dw, dh);
  }
  function drawCover(img) { drawCoverScaled(img, 1, 0, 0); }

  // single still + scroll-driven ken-burns push-in
  function drawPoster(p) {
    var scale = 1 + 0.10 * p;
    var panY = -canvas.height * 0.05 * p;
    var panX = canvas.width * 0.02 * Math.sin(p * 3.14159);
    drawCoverScaled(poster, scale, panX, panY);
  }

  function drawPlaceholder(p) {
    var w = canvas.width, h = canvas.height;
    var hue = 232 + p * 64; // navy -> violet over the scrub
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'hsl(' + hue + ',46%,9%)');
    g.addColorStop(1, 'hsl(' + (hue + 28) + ',58%,4%)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    var gx = w * (0.22 + 0.56 * p), gy = h * (0.5 + 0.16 * Math.sin(p * 6.283));
    var rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.5);
    rg.addColorStop(0, 'hsla(' + (hue + 42) + ',85%,62%,0.42)');
    rg.addColorStop(1, 'hsla(' + (hue + 42) + ',85%,62%,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    var step = Math.max(64, w / 18), off = (p * step * 4) % step;
    for (var x = -off; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h * 0.16, h); ctx.stroke(); }

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = '600 ' + Math.round(w * 0.012) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('PREVIEW · frame ' + (Math.round(p * (PLACEHOLDER_FRAMES - 1)) + 1) + '/' + PLACEHOLDER_FRAMES, w * 0.04, h * 0.94);
  }

  function draw(p) {
    lastP = p;
    if (useFrames && FRAME_COUNT > 0) {
      var idx = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(p * (FRAME_COUNT - 1))));
      var img = frames[idx];
      if (img && img.complete && (img.naturalWidth || 0) > 0) { drawCover(img); return; }
    }
    if (poster && poster.complete && (poster.naturalWidth || 0) > 0) { drawPoster(p); return; }
    drawPlaceholder(p);
  }

  function setLoad(frac) {
    if (barEl) barEl.style.width = Math.round(frac * 100) + '%';
    if (labelEl) labelEl.textContent = 'Loading ' + Math.round(frac * 100) + '%';
  }
  function hideLoader() {
    if (!loaderEl) return;
    loaderEl.classList.add('hidden');
    setTimeout(function () { loaderEl.style.display = 'none'; }, 650);
  }

  function preload(done) {
    var n = FRAME_COUNT, c = 0, finished = false;
    function maybeDone() { if (!finished && c >= n) { finished = true; done(); } }
    for (var i = 1; i <= n; i++) {
      (function (idx) {
        var img = new Image();
        img.onload = function () { c++; setLoad(c / n); maybeDone(); };
        img.onerror = function () { if (!finished) { finished = true; useFrames = false; done(); } };
        img.src = FRAME_PATH(idx);
        frames[idx - 1] = img;
      })(i);
    }
  }

  // ----- modes -----
  function scrubMode() {
    gsap.registerPlugin(ST);
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#introScroll', start: 'top top', end: 'bottom bottom', scrub: 0.6,
        onUpdate: function (self) { draw(self.progress); }
      }
    });
    // the BlurText intro statement fades out as you start scrolling
    tl.fromTo('.intro-blurtext', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.5, immediateRender: false }, 0);
    // scroll cue fades out once the visitor starts scrolling
    tl.to('.intro__scrollcue', { autoAlpha: 0, duration: 0.4 }, 0.2);
    // bilingual lines cross-fade, evenly spaced; last one stays
    var lines = gsap.utils.toArray('.intro__line');
    lines.forEach(function (ln, i) {
      var at = 0.6 + i * 2.0;
      tl.fromTo(ln, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' }, at);
      if (i < lines.length - 1) tl.to(ln, { autoAlpha: 0, y: -34, duration: 0.8, ease: 'power2.in' }, at + 1.1);
    });
    draw(0);
    requestAnimationFrame(function () { if (ST.refresh) ST.refresh(); });
  }

  function staticMode() {
    document.body.classList.add('intro--static');
    draw(0.45);
  }

  function boot() {
    resize();
    if (reduce || !gsap || !ST) staticMode();
    else scrubMode();
    hideLoader();
  }

  window.addEventListener('resize', resize);

  // go: real frames (with progress) > single poster still > procedural placeholder
  if (useFrames) {
    setLoad(0); preload(boot);
  } else if (POSTER) {
    setLoad(0.2);
    poster = new Image();
    poster.onload = function () { setLoad(1); boot(); };
    poster.onerror = function () { poster = null; boot(); };
    poster.src = POSTER;
  } else {
    boot();
  }
})();
