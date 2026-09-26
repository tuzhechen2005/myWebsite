/* =========================================================
   ScrollFloat — vanilla port (from React Bits, GSAP-based).
   Splits section headings into characters that float up,
   scrubbed to scroll. Bilingual-safe: splits inside the
   .zh / .en spans so the language toggle keeps working.
   Requires window.gsap + window.ScrollTrigger.
   ========================================================= */
(function () {
  "use strict";

  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // split an element's text into .char spans (keeps word breaks at spaces)
  function splitInto(el, collector) {
    var text = el.textContent;
    el.textContent = "";
    var langClass = el.classList.contains("zh") ? "zh-char" : (el.classList.contains("en") ? "en-char" : "");
    var tokens = text.split(/(\s+)/);
    tokens.forEach(function (tok) {
      if (tok === "") return;
      if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(" ")); return; }
      // Latin words stay unbreakable (chars are inline-blocks, which the browser may otherwise wrap between);
      // CJK runs keep a break opportunity between every character.
      var host = el;
      if (/^[\u0000-\u024F\u2010-\u2027]+$/.test(tok)) { host = document.createElement("span"); host.className = "word"; el.appendChild(host); }
      for (var i = 0; i < tok.length; i++) {
        var s = document.createElement("span");
        s.className = "char" + (langClass ? " " + langClass : "");
        s.textContent = tok[i];
        host.appendChild(s);
        collector.push(s);
      }
    });
  }

  var heads = document.querySelectorAll(".sec-head h2");
  Array.prototype.forEach.call(heads, function (h) {
    h.classList.add("scroll-float");

    var zhChars = [];
    var enChars = [];
    var accessible = [];
    if (h.children.length) {
      Array.prototype.forEach.call(h.children, function (node) {
        if (node.nodeType !== 1) return;
        var original = node.textContent;
        var copy = document.createElement("span");
        copy.className = "sr-only " + (node.classList.contains("zh") ? "zh" : "en");
        copy.textContent = original;
        accessible.push(copy);
        node.setAttribute("aria-hidden", "true");
        splitInto(node, node.classList.contains("zh") ? zhChars : enChars); // .zh / .en spans
      });
      accessible.forEach(function (copy) { h.appendChild(copy); });
    } else {
      var originalText = h.textContent;
      splitInto(h, enChars);
      h.setAttribute("aria-label", originalText);
    }

    if (reduce || (!zhChars.length && !enChars.length)) return; // leave as static text

    if (zhChars.length) {
      gsap.fromTo(
        zhChars,
        {
          yPercent: 36,
          transformOrigin: "50% 72%",
          willChange: "transform"
        },
        {
          yPercent: 0,
          duration: 0.65,
          ease: "power3.out",
          stagger: 0.015,
          scrollTrigger: { trigger: h, start: "top bottom", end: "bottom center", scrub: 0.6 }
        }
      );
    }

    if (enChars.length) {
      gsap.fromTo(
        enChars,
        { yPercent: 36, transformOrigin: "50% 0%", willChange: "transform" },
        {
          yPercent: 0,
          duration: 0.65, ease: "power3.out", stagger: 0.015,
          scrollTrigger: { trigger: h, start: "top bottom", end: "bottom center", scrub: 0.6 }
        }
      );
    }
  });

  window.addEventListener("load", function () { ST.refresh(); });
  window.addEventListener("site:langchange", function () {
    requestAnimationFrame(function () { ST.refresh(); });
  });
})();
