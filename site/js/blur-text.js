/* =========================================================
   blur-text.js — vanilla port of React-Bits <BlurText/> (gsap, not motion).
   Splits text into words; each animates in from blurred + transparent +
   offset, with a per-word stagger. Driven by gsap (blur via onUpdate, since
   gsap can't tween filter strings directly). Starts once the intro loader
   is gone. Reduced-motion = instant.
   ========================================================= */
(function () {
  var gsap = window.gsap;
  var roots = document.querySelectorAll('[data-blurtext]');
  if (!roots.length) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(roots, function (root) {
    var stagger = parseInt(root.getAttribute('data-stagger') || '120', 10) / 1000;
    var lines = root.querySelectorAll('.bt-line');
    var words = [];
    Array.prototype.forEach.call(lines, function (line) {
      var parts = (line.textContent || '').split(' ');
      line.textContent = '';
      parts.forEach(function (w, wi) {
        var span = document.createElement('span');
        span.className = 'bt-word';
        span.textContent = w;
        line.appendChild(span);
        if (wi < parts.length - 1) line.appendChild(document.createTextNode(' '));
        words.push(span);
      });
    });

    if (!gsap || reduce) {
      words.forEach(function (w) { w.style.opacity = 1; w.style.filter = 'none'; });
      return;
    }

    gsap.set(words, { opacity: 0, y: -24 });
    words.forEach(function (w) { w.style.filter = 'blur(10px)'; });

    function reveal() {
      words.forEach(function (w, i) {
        var d = i * stagger;
        gsap.to(w, { opacity: 1, y: 0, duration: 0.55, delay: d, ease: 'power2.out' });
        var o = { b: 10 };
        gsap.to(o, { b: 0, duration: 0.55, delay: d, ease: 'power2.out',
          onUpdate: function () { w.style.filter = o.b < 0.05 ? 'none' : 'blur(' + o.b.toFixed(2) + 'px)'; },
          onComplete: function () { w.style.filter = 'none'; } });
      });
    }

    var loader = document.getElementById('introLoader');
    if (loader && !loader.classList.contains('hidden')) {
      var mo = new MutationObserver(function () {
        if (loader.classList.contains('hidden')) { mo.disconnect(); gsap.delayedCall(0.15, reveal); }
      });
      mo.observe(loader, { attributes: true, attributeFilter: ['class'] });
      gsap.delayedCall(9, function () { mo.disconnect(); reveal(); }); // safety fallback
    } else {
      gsap.delayedCall(0.3, reveal);
    }
  });
})();
