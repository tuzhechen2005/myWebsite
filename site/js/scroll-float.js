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
      for (var i = 0; i < tok.length; i++) {
        var s = document.createElement("span");
        s.className = "char" + (langClass ? " " + langClass : "");
        s.textContent = tok[i];
        el.appendChild(s);
        collector.push(s);
      }
    });
  }

  var heads = document.querySelectorAll(".sec-head h2");
  Array.prototype.forEach.call(heads, function (h) {
    h.classList.add("scroll-float");

    var zhChars = [];
    var enChars = [];
    if (h.children.length) {
      Array.prototype.forEach.call(h.children, function (node) {
        if (node.nodeType !== 1) return;
        splitInto(node, node.classList.contains("zh") ? zhChars : enChars); // .zh / .en spans
      });
    } else {
      splitInto(h, enChars);
    }

    if (reduce || (!zhChars.length && !enChars.length)) return; // leave as static text

    if (zhChars.length) {
      gsap.fromTo(
        zhChars,
        {
          opacity: 0,
          yPercent: 86,
          rotateX: -18,
          scale: 0.92,
          transformOrigin: "50% 72%",
          willChange: "opacity, transform"
        },
        {
          opacity: 1,
          yPercent: 0,
          rotateX: 0,
          scale: 1,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.045,
          scrollTrigger: { trigger: h, start: "top bottom-=8%", end: "bottom center+=6%", scrub: 0.75 }
        }
      );
    }

    if (enChars.length) {
      gsap.fromTo(
        enChars,
        { opacity: 0, yPercent: 120, scaleY: 2.3, scaleX: 0.7, transformOrigin: "50% 0%", willChange: "opacity, transform" },
        {
          opacity: 1, yPercent: 0, scaleY: 1, scaleX: 1,
          duration: 1, ease: "back.inOut(2)", stagger: 0.03,
          scrollTrigger: { trigger: h, start: "center bottom+=50%", end: "bottom bottom-=40%", scrub: true }
        }
      );
    }
  });

  window.addEventListener("load", function () { ST.refresh(); });
  window.addEventListener("site:langchange", function () {
    requestAnimationFrame(function () { ST.refresh(); });
  });
})();
