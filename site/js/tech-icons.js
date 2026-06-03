/* =========================================================
   Tech-stack icons — renders brand logos into .tech chips,
   with a graceful monogram fallback when a logo is missing.

   Markup: <span class="tech" data-tech="Java"></span>
   ========================================================= */
(function () {
  "use strict";

  function icon(name) {
    return "assets/icons/" + name + ".svg";
  }

  // key (lowercased label) -> { ico: url|null, mono, color }
  var MAP = {
    "java":           { ico: icon("java"), mono: "Ja", color: "#f89820" },
    "python":         { ico: icon("python"), mono: "Py", color: "#3776ab" },
    "sql":            { ico: null, mono: "SQL", color: "#336791" },
    "langgraph":      { ico: icon("langgraph"), mono: "LG", color: "#1c3c3c" },
    "langsmith":      { ico: null, mono: "LS", color: "#1c3c3c" },
    "langfuse":       { ico: null, mono: "Lf", color: "#e11d48" },
    "faiss":          { ico: null, mono: "Fa", color: "#0467df" },
    "elasticsearch":  { ico: icon("elasticsearch"), mono: "ES", color: "#005571" },
    "apache flink":   { ico: icon("apache-flink"), mono: "Fl", color: "#e6526f" },
    "kafka":          { ico: icon("kafka"), mono: "Kf", color: "#231f20" },
    "spring":         { ico: icon("spring"), mono: "Sp", color: "#6db33f" },
    "redis":          { ico: icon("redis"), mono: "Re", color: "#dc382d" },
    "caffeine":       { ico: null, mono: "Cf", color: "#6f4e37" },
    "jwt":            { ico: icon("jwt"), mono: "JWT", color: "#d63aff" },
    "n8n":            { ico: icon("n8n"), mono: "n8", color: "#ea4b71" },
    "coze":           { ico: null, mono: "Cz", color: "#4d53e8" }
  };

  function monogram(ico, info, label) {
    ico.classList.remove("is-img");
    ico.classList.add("is-mono");
    ico.style.background = (info && info.color) || "#6b6880";
    ico.textContent = (info && info.mono) || label.slice(0, 2);
  }

  function render(el) {
    var label = el.getAttribute("data-tech") || "";
    var info = MAP[label.toLowerCase()];

    var ico = document.createElement("span");
    ico.className = "tech__ico";
    var text = document.createElement("span");
    text.className = "tech__label";
    text.textContent = label;

    if (info && info.ico) {
      ico.classList.add("is-img");
      var img = new Image();
      img.alt = label;
      img.loading = "lazy";
      img.decoding = "async";
      img.onerror = function () { monogram(ico, info, label); };
      img.src = info.ico;
      ico.appendChild(img);
    } else {
      monogram(ico, info, label);
    }

    el.textContent = "";
    el.appendChild(ico);
    el.appendChild(text);
  }

  function init() {
    var chips = document.querySelectorAll("[data-tech]");
    Array.prototype.forEach.call(chips, render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
