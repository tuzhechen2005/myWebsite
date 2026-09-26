/* =========================================================
   AI Assistant — local knowledge-base engine
   Bilingual (zh/en), zero backend. Content from résumé.

   Want to upgrade to a real LLM later? Set CONFIG.useAPI = true
   and implement callLLM() to hit your own backend proxy.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    useAPI: false,           // flip to true to route through callLLM()
    apiEndpoint: "/api/chat" // your serverless proxy (keeps the API key safe)
  };

  /* ----------------------------------------------------------
     Knowledge base — each intent has keyword triggers (zh+en)
     and a bilingual answer. `acts` = optional action buttons.
     ---------------------------------------------------------- */
  var KB = [
    {
      id: "greeting",
      keys: ["你好", "您好", "hi", "hello", "hey", "嗨"],
      zh: "你好，我是涂喆宸网站的本地知识库助手。可以问我他的研究、项目、实习、技能或联系方式。",
      en: "Hi, I'm Zhechen's local knowledge-base assistant. Ask me about his research, projects, internships, skills, or contact details."
    },
    {
      id: "research",
      keys: ["甲状腺", "thyroid", "surgery", "外科", "研究", "research", "balentine", "mcmillan", "临床"],
      zh: "<b>甲状腺癌 AI 研究</b>是 UW–Madison 外科系一项获 $69K 资助的在研项目。涂喆宸负责 LLM 系统架构、临床 RAG、可溯源生成及幻觉和临床敏感案例的安全评测，与 Courtney Balentine, MD, MPH 和 Alan McMillan, PhD 两位 PI 合作。系统尚未进行患者端验证。",
      en: "The <b>thyroid cancer AI project</b> is an ongoing $69K-funded effort at UW–Madison Surgery. Zhechen leads the LLM architecture, clinical RAG, grounded generation, and safety evaluation with faculty PIs Courtney Balentine, MD, MPH and Alan McMillan, PhD. It has not yet undergone patient-facing validation.",
      acts: [{ zh: "查看研究 →", en: "View research →", href: "projects.html" }]
    },
    {
      id: "microsoft",
      keys: ["微软", "microsoft", "phi-3", "azure", "semantic kernel", "autogen"],
      zh: "<b>微软 Cloud &amp; AI 实习</b>(2026.07–09):为 Phi-3 构建 24 个 Azure REST 工具和 320 条双语测试指令，完整工具调用准确率从 61% 提升至 87%；另构建文档 ReAct、架构规划多智能体和事件响应系统。",
      en: "<b>Microsoft Cloud &amp; AI internship</b> (2026.07–09): built 24 Azure REST tools and 320 bilingual evaluations for Phi-3, improving complete tool-call accuracy from 61% to 87%; also built documentation ReAct, architecture-planning agents, and incident-response systems.",
      acts: [{ zh: "完整经历 →", en: "Full experience →", href: "about.html" }]
    },
    {
      id: "medical",
      keys: ["医疗", "问诊", "导诊", "分诊", "medical", "triage", "health", "急症"],
      zh: "<b>独立医疗预问诊项目</b>使用 LangGraph 编排五类 Agent，并检索 300+ 篇临床指南。测试中信息采集完整度达 92%，约 180 条评测案例中的急症召回率为 96%+。仅定位决策支持，不做诊断或处方。这与 UW Surgery 在研项目是两个不同项目。",
      en: "The <b>independent medical intake project</b> coordinates five LangGraph agent roles and retrieves from 300+ clinical guidelines. Intake completeness reached 92% in testing; emergency recall was 96%+ across ~180 evaluation cases. Decision support only, not diagnosis or prescribing. It is separate from the UW Surgery research project."
    },
    {
      id: "rag",
      keys: ["rag", "检索", "智能助手", "知识库", "retrieval", "milvus", "重排", "text-to-sql"],
      zh: "<b>企业级 RAG AI 助手</b>使用 BM25、Qwen3-Embedding、DistilBERT 路由和 Qwen3-Reranker。500 条评测中路由准确率 93%、复杂查询 Recall@10 提升 18%，回答可溯源率 92%。",
      en: "The <b>enterprise RAG assistant</b> uses BM25, Qwen3 embeddings, DistilBERT routing, and Qwen3 reranking. Across 500 evaluations, routing accuracy was 93%, complex-query Recall@10 improved by 18%, and answer traceability reached 92%.",
      acts: [{ zh: "查看项目 →", en: "View projects →", href: "projects.html" }]
    },
    {
      id: "experience",
      keys: ["实习", "工作", "经历", "experience", "intern", "蓝船", "力群", "公司"],
      zh: "三段技术实习：<b>微软 Cloud &amp; AI</b>(2026.07–09)、<b>江苏力群数据中台</b>(2025.09–12)、<b>蓝船科技 AI 研发</b>(2025.05–09)。详细成果见经历页。",
      en: "Three technical internships: <b>Microsoft Cloud &amp; AI</b> (2026.07–09), <b>Jiangsu Liqun Data Platform</b> (2025.09–12), and <b>Lanchuan Technology AI R&amp;D</b> (2025.05–09). See the experience page for outcomes.",
      acts: [{ zh: "查看经历 →", en: "View experience →", href: "about.html" }]
    },
    {
      id: "projects",
      keys: ["项目", "作品", "project", "portfolio", "案例"],
      zh: "项目页展示一项 <b>UW–Madison 外科系在研项目</b>，以及两个独立构建的系统：多智能体医疗预问诊和企业级 RAG 助手。",
      en: "The projects page features an <b>ongoing UW–Madison Surgery research project</b> and two independently built systems: multi-agent medical intake and an enterprise RAG assistant.",
      acts: [{ zh: "全部项目 →", en: "All projects →", href: "projects.html" }]
    },
    {
      id: "skills",
      keys: ["技能", "技术", "tech", "skill", "stack", "工具", "擅长", "能力", "agent", "智能体"],
      zh: "技术栈：Python、Java、SQL；LangGraph、Semantic Kernel、AutoGen、Outlines；Milvus、BM25、Qwen3 Embedding/Reranker；FastAPI、Pydantic、Redis、Kafka、Flink；LangSmith / Langfuse 评测追踪。",
      en: "Stack: Python, Java, SQL; LangGraph, Semantic Kernel, AutoGen, Outlines; Milvus, BM25, Qwen3 Embedding/Reranker; FastAPI, Pydantic, Redis, Kafka, Flink; LangSmith / Langfuse tracing.",
      acts: [{ zh: "完整技能 →", en: "Full skills →", href: "about.html" }]
    },
    {
      id: "education",
      keys: ["学校", "教育", "大学", "gpa", "uw", "madison", "威斯康星", "麦迪逊", "education", "school"],
      zh: "威斯康星大学麦迪逊分校计算机科学本科，2023.09–2027.05，GPA <b>3.7/4.0</b>，Dean's List (2023–2025)。",
      en: "UW–Madison Computer Science undergraduate, 2023.09–2027.05, GPA <b>3.7/4.0</b>, Dean's List (2023–2025)."
    },
    {
      id: "contact",
      keys: ["联系", "邮箱", "邮件", "微信", "github", "contact", "email", "reach", "wechat"],
      zh: "邮箱：<b>ztu29@wisc.edu</b>；GitHub：<b>@tuzhechen2005</b>；微信：<b>Jelly_Tu</b>。",
      en: "Email: <b>ztu29@wisc.edu</b>; GitHub: <b>@tuzhechen2005</b>; WeChat: <b>Jelly_Tu</b>.",
      acts: [{ zh: "发邮件", en: "Send email", href: "mailto:ztu29@wisc.edu" }]
    },
    {
      id: "hire",
      keys: ["招聘", "找工作", "全职", "机会", "求职", "hire", "hiring", "available", "opportunity"],
      zh: "欢迎就 AI 应用开发、Agent 工程及研究合作联系涂喆宸：<b>ztu29@wisc.edu</b>。",
      en: "For AI application engineering, agent engineering, or research collaboration, contact Zhechen at <b>ztu29@wisc.edu</b>.",
      acts: [{ zh: "发邮件", en: "Send email", href: "mailto:ztu29@wisc.edu" }]
    },
    {
      id: "thanks",
      keys: ["谢谢", "感谢", "thanks", "thank you", "thx"],
      zh: "不客气。还想了解研究、项目或经历吗？",
      en: "You're welcome. Want to know more about the research, projects, or experience?"
    }
  ];

  var FALLBACK = {
    zh: "这个问题我可能答不上来 😅 我最擅长聊涂喆宸的 <b>技能 / 项目 / 经历 / 联系方式</b>。要不试试下面的快捷问题,或直接邮件 <b>ztu29@wisc.edu</b> 找他本人?",
    en: "I'm not sure about that one 😅 I'm best at his <b>skills / projects / experience / contact</b>. Try a quick question below, or email <b>ztu29@wisc.edu</b> directly.",
    acts: [{ zh: "✉ 发邮件", en: "✉ Email", href: "mailto:ztu29@wisc.edu" }]
  };

  var CHIPS = [
    { zh: "他会哪些技术?", en: "What's his stack?", q: "技能" },
    { zh: "看看项目", en: "His projects", q: "项目" },
    { zh: "实习经历", en: "Experience", q: "实习" },
    { zh: "怎么联系他?", en: "How to reach him?", q: "联系" },
    { zh: "在找机会吗?", en: "Is he available?", q: "招聘" }
  ];

  var UI = {
    title: { zh: "作品导览", en: "Portfolio guide" },
    status: { zh: "本地知识库 · 固定问答", en: "Local KB · preset answers" },
    placeholder: { zh: "查找项目、经历或联系方式…", en: "Ask about projects, experience, or contact…" },
    foot: { zh: "本地知识库 · 内容来自简历", en: "Local knowledge base · from résumé" },
    nudge: { zh: "👋 问我关于涂喆宸的事", en: "👋 Ask me about Zhechen" }
  };

  /* ----------------------------------------------------------
     Intent matching — score by keyword hits
     ---------------------------------------------------------- */
  function match(text) {
    var t = text.toLowerCase().trim();
    if (!t) return null;
    var best = null, bestScore = 0;
    KB.forEach(function (item) {
      var score = 0;
      item.keys.forEach(function (k) {
        if (t.indexOf(k.toLowerCase()) !== -1) score += k.length > 1 ? 2 : 1;
      });
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return bestScore > 0 ? best : null;
  }

  function lang() { return document.body.getAttribute("data-lang") === "en" ? "en" : "zh"; }

  /* Optional LLM hook — implement against your own backend proxy */
  function callLLM(text) {
    return fetch(CONFIG.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, lang: lang() })
    }).then(function (r) { return r.json(); }).then(function (d) { return d.reply; });
  }

  /* ----------------------------------------------------------
     DOM
     ---------------------------------------------------------- */
  var root = document.createElement("div");
  root.className = "ai-root";
  root.innerHTML =
    '<div class="ai-nudge"><span class="zh">' + UI.nudge.zh + '</span><span class="en">' + UI.nudge.en + '</span></div>' +
    '<button class="ai-fab" aria-label="Open assistant" aria-expanded="false">' +
      '<span class="ai-fab__dot"></span>' +
      '<span class="ai-eyes"><span class="ai-eye"><span class="ai-pupil"></span></span><span class="ai-eye"><span class="ai-pupil"></span></span></span>' +
    '</button>' +
    '<div class="ai-panel" role="dialog" aria-label="AI assistant chat">' +
      '<div class="ai-head">' +
        '<div class="ai-head__avatar"><span class="ai-eyes"><span class="ai-eye"><span class="ai-pupil"></span></span><span class="ai-eye"><span class="ai-pupil"></span></span></span></div>' +
        '<div class="ai-head__meta"><strong><span class="zh">' + UI.title.zh + '</span><span class="en">' + UI.title.en + '</span></strong>' +
        '<span><span class="zh">' + UI.status.zh + '</span><span class="en">' + UI.status.en + '</span></span></div>' +
        '<button class="ai-head__close" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="ai-msgs" aria-live="polite" data-lenis-prevent></div>' +
      '<div class="ai-chips"></div>' +
      '<form class="ai-input"><input type="text" autocomplete="off" /><button type="submit" aria-label="Send">↑</button></form>' +
      '<div class="ai-foot"><span class="zh">' + UI.foot.zh + '</span><span class="en">' + UI.foot.en + '</span></div>' +
    '</div>';
  document.body.appendChild(root);

  var fab = root.querySelector(".ai-fab");
  var panel = root.querySelector(".ai-panel");
  var msgs = root.querySelector(".ai-msgs");
  var chipsBox = root.querySelector(".ai-chips");
  var form = root.querySelector(".ai-input");
  var input = form.querySelector("input");
  var closeBtn = root.querySelector(".ai-head__close");
  var nudge = root.querySelector(".ai-nudge");
  var dot = root.querySelector(".ai-fab__dot");

  input.placeholder = UI.placeholder[lang()];

  /* ----- render helpers ----- */
  var EYE_AV = '<span class="ai-msg__av"><span class="ai-eyes"><span class="ai-eye"><span class="ai-pupil"></span></span><span class="ai-eye"><span class="ai-pupil"></span></span></span></span>';

  function scroll() { msgs.scrollTop = msgs.scrollHeight; }

  function addBot(item) {
    var l = lang();
    var html = '<div class="ai-msg bot">' + EYE_AV + '<div class="ai-msg__bubble">' + item[l];
    if (item.acts && item.acts.length) {
      html += '<div class="ai-msg__acts">';
      item.acts.forEach(function (a) {
        var ext = /^https?:|^mailto:/.test(a.href);
        html += '<a class="ai-link" href="' + a.href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + a[l] + '</a>';
      });
      html += '</div>';
    }
    html += '</div></div>';
    msgs.insertAdjacentHTML("beforeend", html);
    scroll();
  }

  function addUser(text) {
    var div = document.createElement("div");
    div.className = "ai-msg user";
    div.innerHTML = '<span class="ai-msg__av"></span><div class="ai-msg__bubble"></div>';
    div.querySelector(".ai-msg__bubble").textContent = text; // safe: no HTML injection
    msgs.appendChild(div);
    scroll();
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "ai-msg bot ai-typing-row";
    div.innerHTML = EYE_AV + '<div class="ai-msg__bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>';
    msgs.appendChild(div);
    scroll();
    return div;
  }

  function respond(text) {
    var typing = showTyping();
    var delay = 420 + Math.random() * 360;
    if (CONFIG.useAPI) {
      callLLM(text).then(function (reply) {
        typing.remove();
        addBot({ zh: reply, en: reply });
      }).catch(function () {
        typing.remove();
        addBot(FALLBACK);
      });
      return;
    }
    setTimeout(function () {
      typing.remove();
      addBot(match(text) || FALLBACK);
    }, delay);
  }

  function renderChips() {
    chipsBox.innerHTML = "";
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "ai-chip";
      b.innerHTML = '<span class="zh">' + c.zh + '</span><span class="en">' + c.en + '</span>';
      b.addEventListener("click", function () { send(c.q, c[lang()]); });
      chipsBox.appendChild(b);
    });
  }

  function send(query, displayText) {
    addUser(displayText || query);
    input.value = "";
    respond(query);
  }

  /* ----- open / close ----- */
  var greeted = false;
  function openPanel() {
    root.classList.add("open");
    fab.setAttribute("aria-expanded", "true");
    dot.classList.remove("show");
    nudge.classList.remove("show");
    try { localStorage.setItem("ai-seen", "1"); } catch (e) {}
    if (!greeted) {
      greeted = true;
      renderChips();
      setTimeout(function () { addBot(KB[0]); }, 250);
    }
    setTimeout(function () { input.focus(); }, 350);
  }
  function closePanel() {
    root.classList.remove("open");
    fab.setAttribute("aria-expanded", "false");
  }

  fab.addEventListener("click", function () { root.classList.contains("open") ? closePanel() : openPanel(); });
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("open")) closePanel(); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (v) send(v);
  });

  /* keep placeholder in sync with language toggle */
  new MutationObserver(function () { input.placeholder = UI.placeholder[lang()]; })
    .observe(document.body, { attributes: true, attributeFilter: ["data-lang"] });

  /* ----- first-visit nudge ----- */
  var seen = false;
  try { seen = localStorage.getItem("ai-seen") === "1"; } catch (e) {}
  if (!seen) {
    setTimeout(function () { if (!root.classList.contains("open")) { nudge.classList.add("show"); dot.classList.add("show"); } }, 2600);
    setTimeout(function () { nudge.classList.remove("show"); }, 9000);
  }

  /* ----------------------------------------------------------
     Eyes follow the cursor (idle = gentle drift)
     ---------------------------------------------------------- */
  var pupils = [];
  function refreshPupils() { pupils = Array.prototype.slice.call(root.querySelectorAll(".ai-fab .ai-pupil, .ai-head__avatar .ai-pupil")); }
  refreshPupils();

  function moveEyes(cx, cy) {
    pupils.forEach(function (p) {
      var eye = p.parentElement.getBoundingClientRect();
      var ex = eye.left + eye.width / 2;
      var ey = eye.top + eye.height / 2;
      var ang = Math.atan2(cy - ey, cx - ex);
      var r = Math.min(eye.width, eye.height) * 0.18;
      p.style.transform = "translate(calc(-50% + " + (Math.cos(ang) * r).toFixed(1) + "px), calc(-50% + " + (Math.sin(ang) * r).toFixed(1) + "px))";
    });
  }
  var hasPointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (hasPointer) {
    window.addEventListener("mousemove", function (e) { moveEyes(e.clientX, e.clientY); }, { passive: true });
  } else {
    // touch devices: gentle autonomous drift
    var t = 0;
    setInterval(function () {
      t += 0.6;
      var r = root.getBoundingClientRect();
      moveEyes(r.left + 30 + Math.cos(t) * 40, r.top + 30 + Math.sin(t * 1.3) * 30);
    }, 1400);
  }
})();
