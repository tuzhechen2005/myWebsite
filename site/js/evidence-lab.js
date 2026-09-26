(function () {
  "use strict";

  var lab = document.querySelector("[data-evidence-lab]");
  if (!lab) return;

  var buttons = Array.prototype.slice.call(lab.querySelectorAll("[data-evidence-mode]"));
  var outputs = Array.prototype.slice.call(lab.querySelectorAll("[data-evidence-output]"));

  function show(mode) {
    buttons.forEach(function (button) {
      var active = button.getAttribute("data-evidence-mode") === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    outputs.forEach(function (output) {
      output.hidden = output.getAttribute("data-evidence-output") !== mode;
    });
    lab.setAttribute("data-mode", mode);
  }

  buttons.forEach(function (button, index) {
    button.addEventListener("click", function () { show(button.getAttribute("data-evidence-mode")); });
    button.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      var next = buttons[(index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      next.focus();
      show(next.getAttribute("data-evidence-mode"));
    });
  });
})();
