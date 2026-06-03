/* =========================================================
   Zhechen Tu — Personal Site interactions
   ========================================================= */
(function () {
  "use strict";

  /* ----- Language toggle (persisted) ----- */
  var STORAGE_KEY = "site-lang";
  var body = document.body;

  function setLang(lang) {
    body.setAttribute("data-lang", lang);
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      var en = btn.querySelector(".en-label");
      var zh = btn.querySelector(".zh-label");
      if (en) en.className = "en-label " + (lang === "en" ? "on" : "off");
      if (zh) zh.className = "zh-label " + (lang === "zh" ? "on" : "off");
    });
    window.dispatchEvent(new CustomEvent("site:langchange", { detail: { lang: lang } }));
  }

  var saved = "zh";
  try { saved = localStorage.getItem(STORAGE_KEY) || "zh"; } catch (e) {}
  setLang(saved);

  document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(body.getAttribute("data-lang") === "zh" ? "en" : "zh");
    });
  });

  /* ----- Theme toggle (initial value is set in the <head> to avoid FOUC) ----- */
  var root = document.documentElement;
  var themeTimer;
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("site-theme", t); } catch (e) {}
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      root.classList.add("theme-anim");
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
      clearTimeout(themeTimer);
      themeTimer = setTimeout(function () { root.classList.remove("theme-anim"); }, 520);
    });
  });

  /* ----- Smooth, slower scrolling with a velocity cap (Lenis) ----- */
  (function () {
    if (!window.Lenis) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var lenis = new Lenis({ wheelMultiplier: 0.5, touchMultiplier: 0.72, lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    if (window.ScrollTrigger) lenis.on("scroll", window.ScrollTrigger.update);

    function syncLenisLangSpeed() {
      if (!lenis.options) return;
      var isZh = document.body.getAttribute("data-lang") !== "en";
      lenis.options.wheelMultiplier = isZh ? 0.5 : 0.55;
      lenis.options.touchMultiplier = isZh ? 0.72 : 0.8;
    }
    syncLenisLangSpeed();

    // Cap how far the scroll target may run ahead of the current position.
    // Peak speed ≈ lerp * MAX_GAP * fps, so a sudden fast flick can no longer
    // whip the page across the screen — it glides at a steady, comfortable max.
    var MAX_GAP = 260;
    function tick(time) {
      var gap = lenis.targetScroll - lenis.animatedScroll;
      if (gap > MAX_GAP) lenis.targetScroll = lenis.animatedScroll + MAX_GAP;
      else if (gap < -MAX_GAP) lenis.targetScroll = lenis.animatedScroll - MAX_GAP;
      lenis.raf(time * 1000);
    }
    if (window.gsap) {
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { tick(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }

    window.addEventListener("site:langchange", function () {
      requestAnimationFrame(function () {
        syncLenisLangSpeed();
        if (lenis.resize) lenis.resize();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    });
  })();

  /* ----- Sticky nav shadow ----- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----- Mobile menu ----- */
  var burger = document.querySelector(".nav__burger");
  var links = document.querySelector(".nav__links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        burger.classList.remove("open");
      });
    });
  }

  /* ----- Scroll reveal — GSAP when available, IntersectionObserver fallback ----- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");

  if (window.gsap && !reduceMotion) {
    initGsap();
  } else if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  function initGsap() {
    root.classList.add("has-gsap");
    var ST = window.ScrollTrigger;
    if (ST) gsap.registerPlugin(ST);

    // nav drops in
    gsap.from(".nav", { y: -18, opacity: 0, duration: 0.7, ease: "power3.out" });

    // hero plays on load
    var hero = gsap.utils.toArray(".hero .reveal");
    if (hero.length) {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(hero, { y: 34, opacity: 0, duration: 0.9, stagger: 0.1, delay: 0.15 });
    }

    // everything else reveals on scroll
    // .sec-head h2 headings are handled by ScrollFloat (per-character), so skip them here
    var rest = gsap.utils.toArray(".reveal").filter(function (el) {
      return !el.closest(".hero") && !el.matches(".sec-head h2");
    });
    if (rest.length && ST) {
      gsap.set(rest, { opacity: 0, y: 42 });
      ST.batch(rest, {
        start: "top 87%",
        onEnter: function (b) {
          gsap.to(b, { opacity: 1, y: 0, duration: 0.85, stagger: 0.1, ease: "power3.out", overwrite: true });
        }
      });
      window.addEventListener("load", function () { ST.refresh(); });
    } else {
      gsap.set(rest, { opacity: 1, y: 0 });
    }
  }

  /* ----- Marquee — rAF driven for smooth hover slowdown ----- */
  (function () {
    var marquee = document.querySelector(".marquee");
    if (!marquee || reduceMotion) return; // reduced-motion: CSS leaves it static
    var track = marquee.querySelector(".marquee__track");
    if (!track) return;
    track.style.animation = "none"; // take over from the CSS fallback

    var BASE = 95, HOVER = 24; // px per second
    var speed = BASE, target = BASE, x = 0, half = 0, last = performance.now();

    function measure() { half = track.scrollWidth / 2; }
    measure();
    window.addEventListener("load", measure);
    window.addEventListener("resize", measure);
    setTimeout(measure, 600);   // re-measure after icon images load
    setTimeout(measure, 1800);

    marquee.addEventListener("pointerenter", function () { target = HOVER; });
    marquee.addEventListener("pointerleave", function () { target = BASE; });

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      speed += (target - speed) * Math.min(1, dt * 6); // ease toward target speed
      x -= speed * dt;
      if (half > 0 && -x >= half) x += half;            // seamless loop
      track.style.transform = "translateX(" + x.toFixed(2) + "px)";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ----- FAQ accordion ----- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var open = item.classList.toggle("open");
      a.style.maxHeight = open ? a.scrollHeight + "px" : null;
      q.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ----- Footer year ----- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
