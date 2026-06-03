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
      keys: ["你好", "您好", "hi", "hello", "hey", "在吗", "嗨"],
      zh: "你好!👋 我是涂喆宸网站的 AI 助手。可以问我关于他的 <b>技能</b>、<b>项目</b>、<b>经历</b> 或 <b>联系方式</b>。试试下面的快捷问题,或直接打字提问。",
      en: "Hi there! 👋 I'm Zhechen's site assistant. Ask me about his <b>skills</b>, <b>projects</b>, <b>experience</b>, or <b>how to reach him</b>. Try a quick question below, or just type."
    },
    {
      id: "about",
      keys: ["你是谁", "介绍", "自我介绍", "谁", "about", "who", "yourself", "涂喆宸是", "他是"],
      zh: "涂喆宸是 <b>威斯康星大学麦迪逊分校 (UW–Madison)</b> 计算机科学本科生(2023–2027,GPA 3.7/4.0,Dean's List),求职方向是 <b>AI 应用 / Agent 开发工程师</b>。他独立完成过多智能体、RAG 等 AI 系统的端到端交付,能力覆盖 AI 应用、Agent 编排与高并发后端。",
      en: "Zhechen Tu is a Computer Science undergrad at <b>UW–Madison</b> (2023–2027, GPA 3.7/4.0, Dean's List), targeting <b>AI application / agent engineering</b> roles. He's shipped multi-agent and RAG systems end-to-end, spanning AI apps, agent orchestration, and high-concurrency backends.",
      acts: [{ zh: "了解更多 →", en: "More about him →", href: "about.html" }]
    },
    {
      id: "skills",
      keys: ["技能", "技术", "会什么", "tech", "skill", "stack", "工具", "擅长", "技术栈", "能力"],
      zh: "他的主要技术栈:<br>• <b>语言</b>:Java、Python、SQL<br>• <b>AI/Agent</b>:LangGraph、RAG、Function Calling、ReAct、Plan-and-Execute、Self-Reflection、LangSmith/Langfuse<br>• <b>检索/数据</b>:FAISS、BM25、Dense Retrieval、Cross-Encoder、Elasticsearch、Apache Flink、Kafka<br>• <b>后端/中间件</b>:Spring、Redis、Caffeine 多级缓存、JWT、n8n/Coze",
      en: "His core stack:<br>• <b>Languages</b>: Java, Python, SQL<br>• <b>AI/Agent</b>: LangGraph, RAG, Function Calling, ReAct, Plan-and-Execute, Self-Reflection, LangSmith/Langfuse<br>• <b>Retrieval/Data</b>: FAISS, BM25, Dense Retrieval, Cross-Encoder, Elasticsearch, Apache Flink, Kafka<br>• <b>Backend</b>: Spring, Redis, Caffeine multi-level cache, JWT, n8n/Coze",
      acts: [{ zh: "完整技能 →", en: "Full skills →", href: "about.html" }]
    },
    {
      id: "agent",
      keys: ["agent", "智能体", "langgraph", "react", "编排", "多智能体", "plan-and-execute", "function calling", "工具调用"],
      zh: "🤖 在 <b>Agent 方向</b>,他擅长:LangGraph 分层多智能体编排、ReAct + Plan-and-Execute 动态规划、Function Calling 工具化、人在环 (HITL) 安全护栏,以及用 LangSmith/Langfuse 做轨迹追踪与评测。代表作是 <b>多智能体医疗预问诊系统</b>。",
      en: "🤖 On <b>agents</b>, he works with: layered multi-agent orchestration on LangGraph, ReAct + Plan-and-Execute planning, Function Calling tool-use, human-in-the-loop (HITL) guardrails, and LangSmith/Langfuse for tracing &amp; evaluation. His flagship is the <b>multi-agent medical triage system</b>.",
      acts: [{ zh: "看这个项目 →", en: "See the project →", href: "projects.html" }]
    },
    {
      id: "projects",
      keys: ["项目", "作品", "project", "做过什么", "做了什么", "portfolio", "案例"],
      zh: "他有三个 <b>独立完成</b> 的 AI 项目:<br>1️⃣ 多智能体医疗预问诊与导诊系统 (LangGraph)<br>2️⃣ 企业级 RAG AI 智能助手<br>3️⃣ AI 增强型知识社区平台<br>想了解哪个的细节?直接问我,或点下方看完整版。",
      en: "He has three <b>solo-built</b> AI projects:<br>1️⃣ Multi-agent medical pre-consultation &amp; triage (LangGraph)<br>2️⃣ Enterprise RAG AI assistant<br>3️⃣ AI-enhanced knowledge community<br>Want details on one? Just ask, or open the full page below.",
      acts: [{ zh: "全部项目 →", en: "All projects →", href: "projects.html" }]
    },
    {
      id: "proj_medical",
      keys: ["医疗", "问诊", "导诊", "分诊", "medical", "triage", "health", "诊断", "急症"],
      zh: "🏥 <b>多智能体医疗预问诊与导诊系统</b>(2026.01–至今,独立开发):基于 LangGraph 的分层多智能体架构;ReAct + Plan-and-Execute 动态问诊使信息完整度 <b>70%→90%+</b>;RAG 工具化回答可溯源率 <b>90%+</b>;安全护栏 + HITL,自建约 180 条评测集 —— 急症召回 <b>96%+</b>、分诊 Top-2 命中 <b>88%+</b>、工具调用准确率 <b>95%+</b>。定位决策支持,不做诊断处方。",
      en: "🏥 <b>Multi-Agent Medical Pre-Consultation &amp; Triage</b> (2026.01–present, solo): a layered multi-agent architecture on LangGraph; ReAct + Plan-and-Execute dynamic intake lifted info completeness from <b>70% to 90%+</b>; RAG-as-tool gives <b>90%+</b> traceable answers; safety guardrails + HITL with a ~180-case eval set — <b>96%+</b> emergency recall, <b>88%+</b> triage Top-2 hit, <b>95%+</b> tool-call accuracy. Decision support, not diagnosis."
    },
    {
      id: "proj_rag",
      keys: ["rag", "检索", "智能助手", "知识库", "retrieval", "faiss", "cross-encoder", "text-to-sql", "重排", "hyde"],
      zh: "🔍 <b>企业级 RAG AI 智能助手</b>(2025.05–09,独立):统一接入结构化数据库与非结构化文档。Query Rewrite/Decompose/HyDE 使复杂查询 <b>Recall@10 +18%</b>;检索路由让响应时间 <b>-35%+</b>;BM25 + Dense + Cross-Encoder 重排使 Top-5 相关性 <b>+20%+</b>;Retrieval Feedback + Self-Reflection 自校验,事实一致性 <b>+15%+</b>。",
      en: "🔍 <b>Enterprise RAG AI Assistant</b> (2025.05–09, solo): unifies structured databases and unstructured docs. Query Rewrite/Decompose/HyDE lifted complex-query <b>Recall@10 by 18%</b>; retrieval routing cut latency <b>35%+</b>; BM25 + Dense + Cross-Encoder reranking raised Top-5 relevance <b>20%+</b>; Retrieval Feedback + Self-Reflection improved factual consistency <b>15%+</b>."
    },
    {
      id: "proj_community",
      keys: ["社区", "kafka", "高并发", "缓存", "community", "redis", "elasticsearch", "事件驱动", "feed", "点赞", "并发"],
      zh: "💬 <b>AI 增强型知识社区平台</b>(2025.05–09,独立):Kafka + Outbox 事件驱动保障高并发一致性;Redis 位图 + Lua 原子操作做幂等高并发计数;Caffeine + Redis 多级缓存 + hotkey 探测规避缓存击穿/雪崩;Elasticsearch(BM25 + 业务权重)+ RAG 问答;JWT 双令牌认证支持会话续期与实时失效。",
      en: "💬 <b>AI-Enhanced Knowledge Community</b> (2025.05–09, solo): Kafka + Outbox event-driven design for consistency at scale; Redis bitmaps + atomic Lua for idempotent high-concurrency counting; Caffeine + Redis multi-level cache with hotkey detection to prevent stampede/avalanche; Elasticsearch (BM25 + business weighting) + RAG Q&amp;A; JWT dual-token auth with renewal and instant revocation."
    },
    {
      id: "experience",
      keys: ["实习", "工作", "经历", "experience", "intern", "internship", "蓝船", "力群", "公司", "job"],
      zh: "他有两段技术实习:<br>• <b>蓝船科技 · AI 研发部</b> — AI 应用与工作流开发工程师(2025.09–12):n8n/Coze 跨平台 AI 工作流使手动处理时间 <b>-40%</b>;经 Webhooks 将 Agent 接入 Slack/Notion。<br>• <b>江苏力群科技 · 数据中台</b>(2025.05–09):Apache Flink 实时 ETL 管道;Schema-aware Text-to-SQL 使数据获取效率 <b>+300%</b> 并完成公司内落地。",
      en: "Two tech internships:<br>• <b>Lanchuan Technology · AI R&amp;D</b> — AI App &amp; Workflow Engineer (2025.09–12): n8n/Coze cross-platform workflows cut manual processing <b>40%</b>; connected agents to Slack/Notion via webhooks.<br>• <b>Jiangsu Liqun · Data Platform</b> (2025.05–09): real-time ETL on Apache Flink; schema-aware Text-to-SQL raised data-access efficiency <b>~300%</b>, deployed internally.",
      acts: [{ zh: "完整经历 →", en: "Full timeline →", href: "about.html" }]
    },
    {
      id: "education",
      keys: ["学校", "教育", "大学", "gpa", "uw", "madison", "威斯康星", "麦迪逊", "education", "school", "课程", "专业"],
      zh: "🎓 <b>威斯康星大学麦迪逊分校 (UW–Madison)</b>,计算机科学本科,2023.09–2027.05,GPA <b>3.7/4.0</b>,Dean's List 校长荣誉学生。方向聚焦 AI 应用、Agent 系统、RAG 与数据基础设施;修读数据结构与算法、数据库系统、操作系统、计算机网络、离散数学等。",
      en: "🎓 <b>University of Wisconsin–Madison</b>, B.S. Computer Science, 2023.09–2027.05, GPA <b>3.7/4.0</b>, Dean's List. Focused on AI applications, agent systems, RAG, and data infrastructure; coursework includes Data Structures &amp; Algorithms, Database Systems, OS, Computer Networks, Discrete Math."
    },
    {
      id: "contact",
      keys: ["联系", "邮箱", "邮件", "微信", "github", "contact", "email", "reach", "wechat", "怎么找", "联系方式"],
      zh: "📫 联系方式:<br>• <b>邮箱</b>:ztu29@wisc.edu<br>• <b>GitHub</b>:@tuzhechen2005<br>• <b>微信</b>:Jelly_Tu<br>邮件通常 24 小时内回复 🙂",
      en: "📫 Get in touch:<br>• <b>Email</b>: ztu29@wisc.edu<br>• <b>GitHub</b>: @tuzhechen2005<br>• <b>WeChat</b>: Jelly_Tu<br>Email replies usually land within 24 hours 🙂",
      acts: [
        { zh: "✉ 发邮件", en: "✉ Email him", href: "mailto:ztu29@wisc.edu" },
        { zh: "GitHub ↗", en: "GitHub ↗", href: "https://github.com/tuzhechen2005" }
      ]
    },
    {
      id: "hire",
      keys: ["招聘", "找工作", "全职", "机会", "求职", "hire", "hiring", "available", "opportunity", "join", "offer", "可入职"],
      zh: "✅ 涂喆宸 <b>正在寻找 AI 应用 / Agent 开发方向的实习或全职机会</b>,期待参与从设计到评测落地的端到端 AI 系统建设。最快联系方式是邮箱 <b>ztu29@wisc.edu</b>。",
      en: "✅ Zhechen is <b>open to AI application / agent engineering internships and full-time roles</b>, ideally building AI systems end-to-end. Fastest way to reach him is <b>ztu29@wisc.edu</b>.",
      acts: [{ zh: "✉ 联系他", en: "✉ Reach out", href: "mailto:ztu29@wisc.edu" }]
    },
    {
      id: "thanks",
      keys: ["谢谢", "感谢", "thanks", "thank you", "thx", "多谢", "好的"],
      zh: "不客气!😊 还想了解涂喆宸的其他方面吗?随时问我。",
      en: "You're welcome! 😊 Anything else you'd like to know about Zhechen? Just ask."
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
    title: { zh: "AI 助手", en: "AI Assistant" },
    status: { zh: "在线 · 涂喆宸的网站助理", en: "Online · Zhechen's site guide" },
    placeholder: { zh: "问我关于涂喆宸的任何事…", en: "Ask me anything about Zhechen…" },
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
