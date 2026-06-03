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
    var tokens = text.split(/(\s+)/);
    tokens.forEach(function (tok) {
      if (tok === "") return;
      if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(" ")); return; }
      for (var i = 0; i < tok.length; i++) {
        var s = document.createElement("span");
        s.className = "char";
        s.textContent = tok[i];
        el.appendChild(s);
        collector.push(s);
      }
    });
  }

  var heads = document.querySelectorAll(".sec-head h2");
  Array.prototype.forEach.call(heads, function (h) {
    h.classList.add("scroll-float");

    var chars = [];
    if (h.children.length) {
      Array.prototype.forEach.call(h.children, function (node) {
        if (node.nodeType === 1) splitInto(node, chars); // .zh / .en spans
      });
    } else {
      splitInto(h, chars);
    }

    if (reduce || !chars.length) return; // leave as static text

    gsap.fromTo(
      chars,
      { opacity: 0, yPercent: 120, scaleY: 2.3, scaleX: 0.7, transformOrigin: "50% 0%", willChange: "opacity, transform" },
      {
        opacity: 1, yPercent: 0, scaleY: 1, scaleX: 1,
        duration: 1, ease: "back.inOut(2)", stagger: 0.03,
        scrollTrigger: { trigger: h, start: "center bottom+=50%", end: "bottom bottom-=40%", scrub: true }
      }
    );
  });

  window.addEventListener("load", function () { ST.refresh(); });
})();
