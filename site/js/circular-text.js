/* =========================================================
   CircularText — vanilla JS port from React Bits.
   Creates rotating circular text without a build step.
   ========================================================= */
(function () {
  "use strict";

  function mount(el) {
    var text = el.getAttribute("data-circular-text") || "";
    if (!text) return;
    el.textContent = "";
    var chars = Array.from(text);
    chars.forEach(function (ch, i) {
      var span = document.createElement("span");
      span.textContent = ch;
      span.style.setProperty("--i", i);
      span.style.setProperty("--n", chars.length);
      el.appendChild(span);
    });
  }

  document.querySelectorAll("[data-circular-text]").forEach(mount);
})();
