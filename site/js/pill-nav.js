/* =========================================================
   pill-nav.js — vanilla port of React-Bits <PillNav/> (gsap).
   Hover = a circle wipes up to fill the pill (base color) while the
   label swaps to the hover-color label. Markup is plain HTML
   (.pill > .hover-circle + .label-stack > .pill-label + .pill-label-hover);
   this just wires the geometry + gsap timelines. Square styling is CSS.
   ========================================================= */
(function () {
  var gsap = window.gsap;
  if (!gsap) return;
  var EASE = 'power3.out';

  Array.prototype.forEach.call(document.querySelectorAll('[data-pillnav]'), function (nav) {
    var pills = Array.prototype.slice.call(nav.querySelectorAll('.pill'));
    var tls = [], active = [];

    function layout() {
      pills.forEach(function (pill, i) {
        var circle = pill.querySelector('.hover-circle');
        if (!circle) return;
        var rect = pill.getBoundingClientRect();
        var w = rect.width, h = rect.height;
        if (!w || !h) return;

        var R = ((w * w) / 4 + h * h) / (2 * h);
        var D = Math.ceil(2 * R) + 2;
        var delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        var originY = D - delta;

        circle.style.width = D + 'px';
        circle.style.height = D + 'px';
        circle.style.bottom = '-' + delta + 'px';
        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: '50% ' + originY + 'px' });

        var label = pill.querySelector('.pill-label');
        var hover = pill.querySelector('.pill-label-hover');
        if (label) gsap.set(label, { y: 0 });
        if (hover) gsap.set(hover, { y: h + 12, opacity: 0 });

        if (tls[i]) tls[i].kill();
        var tl = gsap.timeline({ paused: true });
        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease: EASE, overwrite: 'auto' }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease: EASE, overwrite: 'auto' }, 0);
        if (hover) { gsap.set(hover, { y: Math.ceil(h + 100), opacity: 0 }); tl.to(hover, { y: 0, opacity: 1, duration: 2, ease: EASE, overwrite: 'auto' }, 0); }
        tls[i] = tl;
      });
    }

    layout();
    window.addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout).catch(function () {});

    pills.forEach(function (pill, i) {
      var pinned = false; // click toggles a sticky "filled/inverted" state
      function fwd(d) { var tl = tls[i]; if (!tl) return; if (active[i]) active[i].kill();
        active[i] = tl.tweenTo(tl.duration(), { duration: d, ease: EASE, overwrite: 'auto' }); }
      function rev(d) { var tl = tls[i]; if (!tl) return; if (active[i]) active[i].kill();
        active[i] = tl.tweenTo(0, { duration: d, ease: EASE, overwrite: 'auto' }); }

      // hover previews the fill on pointer devices (skipped while pinned)
      pill.addEventListener('mouseenter', function () { if (!pinned) fwd(0.3); });
      pill.addEventListener('mouseleave', function () { if (!pinned) rev(0.2); });

      // click toggles it: 1st click fills/inverts, 2nd click plays the reverse
      // (also works on touch, where there is no hover) — kept in sync with the
      // Contact button's lanyard drop/retract toggle.
      pill.addEventListener('click', function () {
        pinned = !pinned;
        if (pinned) fwd(0.35); else rev(0.32);
      });
    });
  });
})();
