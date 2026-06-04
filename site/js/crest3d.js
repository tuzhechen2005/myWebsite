/* =========================================================
   crest3d.js — CSS 3D extruded crest
   A vanilla port of the React-Bits <ModelViewer/> *feel* (3D depth,
   auto-motion, cursor parallax, drag-to-spin) without React/WebGL:
   it stacks layered copies of the crest PNG along Z for real thickness,
   then animates a gentle sway + pointer parallax, and lets you drag to
   spin it (with inertia). Degrades to a static badge under
   reduced-motion / no-JS.
   ========================================================= */
(function () {
  var el = document.querySelector('[data-crest3d]');
  if (!el) return;

  var src = el.getAttribute('data-crest3d');
  var LAYERS = 36;   // more, thinner layers => smoother edge
  var STEP = 0.7;    // px of depth between layers (~25px total)

  for (var i = LAYERS - 1; i >= 0; i--) {
    var layer = document.createElement('span');
    layer.className = 'crest3d__layer';
    layer.style.backgroundImage = 'url("' + src + '")';
    layer.style.transform = 'translateZ(' + (-i * STEP) + 'px)';
    // front face = full colour; every layer behind = solid black silhouette
    // (brightness(0) keeps the PNG's alpha, so the side reads as one clean
    //  black extrusion with no stair-stepped light/shadow banding)
    layer.style.filter = i === 0 ? 'none' : 'brightness(0)';
    el.appendChild(layer);
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches;
  var allowParallax = !reduce && !isTouch;
  var allowDrag = !isTouch;
  var stage = el.closest('.crest-stage') || el;

  var REST_X = -4;                      // resting tilt (deg)
  var pTX = 0, pTY = 0, pX = 0, pY = 0; // parallax target / current (deg)
  var dragYaw = 0, dragPitch = 0, vel = 0; // drag offset + inertia (deg)
  var dragging = false, lastX = 0, lastY = 0;
  var raf = 0, running = false, t0 = 0;

  function apply() {
    var t = (performance.now() - t0) / 1000;
    var sway = reduce ? 0 : Math.sin(t * 0.5) * 13; // gentle ±13° auto sway
    pX += (pTX - pX) * 0.08;
    pY += (pTY - pY) * 0.08;
    if (!dragging) { dragYaw += vel; vel *= 0.92; } // inertia after release
    // clamp so the badge never turns far enough to show its back
    if (dragYaw > 48) { dragYaw = 48; vel = 0; }
    else if (dragYaw < -48) { dragYaw = -48; vel = 0; }
    var rx = REST_X + pX + dragPitch;
    var ry = sway + pY + dragYaw;
    if (ry > 70) ry = 70; else if (ry < -70) ry = -70;
    el.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
  }

  function loop() {
    apply();
    var settled = reduce && !dragging && Math.abs(vel) < 0.01 &&
      Math.abs(pTX - pX) < 0.02 && Math.abs(pTY - pY) < 0.02;
    if (settled) { running = false; return; }
    raf = requestAnimationFrame(loop);
  }

  function kick() {
    if (running) return;
    running = true;
    if (!t0) t0 = performance.now();
    raf = requestAnimationFrame(loop);
  }

  if (allowParallax) {
    stage.addEventListener('pointermove', function (e) {
      if (dragging) return;
      var r = stage.getBoundingClientRect();
      pTX = -(((e.clientY - r.top) / r.height) * 2 - 1) * 10;
      pTY = (((e.clientX - r.left) / r.width) * 2 - 1) * 15;
      kick();
    });
    stage.addEventListener('pointerleave', function () { if (dragging) return; pTX = 0; pTY = 0; kick(); });
  }

  if (allowDrag) {
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', function (e) {
      dragging = true; vel = 0; lastX = e.clientX; lastY = e.clientY;
      el.style.cursor = 'grabbing';
      if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (_) {} }
      e.preventDefault();
      kick();
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      dragYaw += dx * 0.4;
      dragPitch = Math.max(-32, Math.min(32, dragPitch - dy * 0.3));
      vel = dx * 0.4;
      kick();
    });
    var endDrag = function () { if (!dragging) return; dragging = false; el.style.cursor = 'grab'; kick(); };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    window.addEventListener('pointerup', endDrag);
  }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { t0 = performance.now(); kick(); }
        else { running = false; cancelAnimationFrame(raf); }
      });
    }, { threshold: 0.04 }).observe(el);
  } else {
    kick();
  }

  // paint one static frame immediately (no unstyled flash)
  t0 = performance.now();
  apply();
})();
