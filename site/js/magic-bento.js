/* =========================================================
   MagicBento — vanilla port (from React Bits, GSAP-based).
   Applies cursor-following border glow, a global spotlight,
   hover particles, magnetism/tilt, and click ripples to the
   site's card elements. Requires window.gsap.
   ========================================================= */
(function () {
  "use strict";

  var gsap = window.gsap;
  if (!gsap) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var isMobile =
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;
  if (isMobile) return; // hover effects only make sense with a pointer

  var GLOW = "93, 77, 255"; // site accent rgb
  var SPOTLIGHT_RADIUS = 340;
  var PARTICLE_COUNT = 9;

  // selector -> which effects to enable (all get border-glow + spotlight)
  // Scoped to the one deliberate card affordance (.proj). The other former
  // "cards" (exp/skill/hl/stat/contact/faq) are now borderless typographic
  // blocks, so a glowing border-ring + tilt would look wrong on them.
  var CONFIG = [
    { sel: ".proj",         tilt: false, magnet: true,  stars: true,  click: true }
  ];

  var allCards = [];

  function makeParticle(x, y) {
    var el = document.createElement("div");
    el.className = "mb-particle";
    el.style.cssText =
      "position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(" + GLOW +
      ",1);box-shadow:0 0 6px rgba(" + GLOW + ",.6);pointer-events:none;z-index:100;left:" +
      x + "px;top:" + y + "px;";
    return el;
  }

  function enhance(card, opts) {
    card.classList.add("mb-card", "mb-border-glow");
    allCards.push(card);

    var clones = [];
    var timeouts = [];
    var protos = null;
    var hovered = false;
    var magnetTween = null;

    function initProtos() {
      if (protos) return;
      var r = card.getBoundingClientRect();
      protos = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        protos.push(makeParticle(Math.random() * r.width, Math.random() * r.height));
      }
    }

    function clearParticles() {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      if (magnetTween) magnetTween.kill();
      clones.forEach(function (p) {
        gsap.to(p, {
          scale: 0, opacity: 0, duration: 0.3, ease: "back.in(1.7)",
          onComplete: function () { gsap.killTweensOf(p); if (p.parentNode) p.parentNode.removeChild(p); }
        });
      });
      clones = [];
    }

    function spawnParticles() {
      initProtos();
      protos.forEach(function (proto, i) {
        var id = setTimeout(function () {
          if (!hovered) return;
          var clone = proto.cloneNode(true);
          card.appendChild(clone);
          clones.push(clone);
          gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
          gsap.to(clone, {
            x: (Math.random() - 0.5) * 90, y: (Math.random() - 0.5) * 90,
            rotation: Math.random() * 360, duration: 2 + Math.random() * 2,
            ease: "none", repeat: -1, yoyo: true
          });
          gsap.to(clone, { opacity: 0.3, duration: 1.5, ease: "power2.inOut", repeat: -1, yoyo: true });
        }, i * 100);
        timeouts.push(id);
      });
    }

    card.addEventListener("mouseenter", function () {
      hovered = true;
      if (opts.stars) spawnParticles();
      if (opts.tilt) gsap.to(card, { rotateX: 4, rotateY: 4, duration: 0.3, ease: "power2.out", transformPerspective: 800 });
    });

    card.addEventListener("mouseleave", function () {
      hovered = false;
      if (opts.stars) clearParticles();
      if (opts.tilt) gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.3, ease: "power2.out" });
      if (opts.magnet) gsap.to(card, { x: 0, y: 0, duration: 0.3, ease: "power2.out" });
    });

    if (opts.tilt || opts.magnet) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        var cx = r.width / 2, cy = r.height / 2;
        if (opts.tilt) {
          gsap.to(card, {
            rotateX: ((y - cy) / cy) * -7, rotateY: ((x - cx) / cx) * 7,
            duration: 0.15, ease: "power2.out", transformPerspective: 800
          });
        }
        if (opts.magnet) {
          magnetTween = gsap.to(card, { x: (x - cx) * 0.04, y: (y - cy) * 0.04, duration: 0.3, ease: "power2.out" });
        }
      });
    }

    if (opts.click) {
      card.addEventListener("click", function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        var maxD = Math.max(
          Math.hypot(x, y), Math.hypot(x - r.width, y),
          Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height)
        );
        var ripple = document.createElement("div");
        ripple.style.cssText =
          "position:absolute;width:" + maxD * 2 + "px;height:" + maxD * 2 +
          "px;border-radius:50%;background:radial-gradient(circle, rgba(" + GLOW +
          ",.35) 0%, rgba(" + GLOW + ",.18) 30%, transparent 70%);left:" + (x - maxD) +
          "px;top:" + (y - maxD) + "px;pointer-events:none;z-index:1000;";
        card.appendChild(ripple);
        gsap.fromTo(ripple, { scale: 0, opacity: 1 },
          { scale: 1, opacity: 0, duration: 0.8, ease: "power2.out", onComplete: function () { ripple.remove(); } });
      });
    }
  }

  CONFIG.forEach(function (g) {
    Array.prototype.forEach.call(document.querySelectorAll(g.sel), function (el) { enhance(el, g); });
  });
  if (!allCards.length) return;

  /* ----- global spotlight + proximity-based border glow ----- */
  var spotlight = document.createElement("div");
  spotlight.className = "mb-spotlight";
  document.body.appendChild(spotlight);

  var proximity = SPOTLIGHT_RADIUS * 0.5;
  var fade = SPOTLIGHT_RADIUS * 0.75;
  var raf = null, mx = 0, my = 0;

  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    if (!raf) raf = requestAnimationFrame(update);
  }

  function update() {
    raf = null;
    var minDist = Infinity;
    for (var i = 0; i < allCards.length; i++) {
      var card = allCards[i];
      var r = card.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) { card.style.setProperty("--glow-intensity", "0"); continue; }
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dist = Math.hypot(mx - cx, my - cy) - Math.max(r.width, r.height) / 2;
      var eff = Math.max(0, dist);
      if (eff < minDist) minDist = eff;
      var intensity = 0;
      if (eff <= proximity) intensity = 1;
      else if (eff <= fade) intensity = (fade - eff) / (fade - proximity);
      card.style.setProperty("--glow-x", ((mx - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--glow-y", ((my - r.top) / r.height) * 100 + "%");
      card.style.setProperty("--glow-intensity", String(intensity));
      card.style.setProperty("--glow-radius", SPOTLIGHT_RADIUS + "px");
    }
    var op = minDist <= proximity ? 0.5
      : minDist <= fade ? ((fade - minDist) / (fade - proximity)) * 0.5 : 0;
    gsap.to(spotlight, { left: mx, top: my, duration: 0.12, ease: "power2.out" });
    gsap.to(spotlight, { opacity: op, duration: op > 0 ? 0.2 : 0.5, ease: "power2.out" });
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseleave", function () {
    allCards.forEach(function (c) { c.style.setProperty("--glow-intensity", "0"); });
    gsap.to(spotlight, { opacity: 0, duration: 0.3 });
  });
})();
