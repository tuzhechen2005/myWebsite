// captions.js: short bilingual explainer cards (zh + en), neutral in tone, one per key beat. A hand-cut paper label is
// painted in the lower-left (it boils with the frame, under the grain); the text is drawn crisp on top through
// window.overlayHook so it stays legible when the video is shown small on the web page.
// Facts only from the résumé / site copy. The epilogue (the signature) has no caption.
const CAPS = (() => {
  const C = CUE, T = C.tool, E2 = C.cli, E4 = C.thy;
  const TAG = {
    pro: ['序', 'PROLOGUE'],
    c1: ['01  企业级 RAG 助手', 'ENTERPRISE RAG ASSISTANT'],
    c2: ['02  多智能体预问诊与导诊', 'MULTI-AGENT PRE-CONSULTATION & TRIAGE'],
    c3: ['03  微软 Cloud & AI · 工具调用', 'MICROSOFT CLOUD & AI · TOOL CALLING'],
    c4: ['04  甲状腺癌 AI 支持系统 · UW–Madison 外科系', 'THYROID CANCER AI SUPPORT · UW–MADISON SURGERY'],
  };
  const L = [
    ['pro', C.pro.bottle + .1, C.pro.dive - .1, '问题从海面沉下来。', 'Questions sink down from the surface.'],
    ['c1', 10.9, 13.9, '两种知识来源：文档，和结构化数据表。', 'Two knowledge sources: documents and structured data tables.'],
    ['c1', 14.2, 18.6, '每个问题按类型路由到对应的来源。', 'Each question is routed to the matching source.'],
    ['c1', 18.9, 24.2, '关键词（BM25）与语义检索并用，再重排筛选。', 'Keyword (BM25) and semantic retrieval, then reranking.'],
    ['c1', 24.5, 26.8, 'SQL 查询先经过安全校验。', 'SQL queries pass a safety check first.'],
    ['c2', 28.3, 31.1, '一位患者前来预问诊。', 'A patient arrives for pre-consultation.'],
    ['c2', 31.4, 36.1, '协调者把任务分给采集、检索、导诊、护栏四个 Agent。', 'A coordinator splits the work across intake, retrieval, triage and guardrail agents.'],
    ['c2', 36.4, 41.1, '识别到急症红旗时，立即转交医生。', 'On an emergency red flag, the case goes straight to a clinician.'],
    ['c2', 41.4, 44.2, '定位为决策支持，不做诊断或处方。', 'Decision support only; no diagnosis or prescribing.'],
    ['c3', 45.7, 50.3, '为每个请求，从 24 个 Azure 工具中选出正确的调用。', 'For each request, pick the right call among 24 Azure tools.'],
    ['c3', 50.6, 57.3, '基于 320 条双语评测迭代：Phi-3 完整调用准确率 61% → 87%。', 'Iterated on 320 bilingual evals: Phi-3 complete-call accuracy 61% → 87%.'],
    ['c4', 60.5, 63.5, '一个患者的问题。甲状腺的形状像一只蝴蝶。', "A patient's question. The thyroid is shaped like a butterfly."],
    ['c4', 63.8, 68.5, '没有来源支持的回答，不予采用。', 'Answers without supporting sources are not used.'],
    ['c4', 68.8, 74.1, '从临床文档中检索证据，保留每一条来源。', 'Evidence is retrieved from clinical documents, each source kept.'],
    ['c4', 74.4, 78.8, '回答的每一部分，都能追溯到出处。', 'Every part of the answer traces back to its source.'],
    ['c4', 79.1, 82.8, '证据不足时拒答，交由医生判断。', 'When evidence runs out, it abstains and defers to a clinician.'],
    ['c4', 83.1, 85.4, '项目仍在研发中，尚未进行患者端验证。', 'In development; not yet validated with patients.'],
  ].map(([g, t0, t1, zh, en]) => ({ g, t0, t1, zh, en }));
  return { TAG, L };
})();

(() => {
  const X = 64, BOTTOM = H - 58, PAD = 26, MAXW = 860;
  const F = { tag: '600 15px "Inter"', zh: '500 31px "Noto Sans SC"', en: '500 22px "Inter"' };
  const INK = '#1D2A29', SUB = '#3B665D', ACC = '#A83A28';
  window.EXTRA_FONTS = (window.EXTRA_FONTS || []).concat([
    [F.zh, CAPS.L.map(c => c.zh).join('') + Object.values(CAPS.TAG).map(v => v[0]).join('')],
    [F.en, 'abc'], [F.tag, 'ABC'],
  ]);
  // measure once (fonts are loaded before the first frame renders)
  const mc = document.createElement('canvas').getContext('2d');
  const wrap = (txt, font, max, cjk) => {
    mc.font = font; const out = []; let line = '';
    const units = cjk ? [...txt] : txt.split(/(\s+)/);
    const noStart = /^[。，、；：！？）」』》%·…]/;   // CJK line-breaking: punctuation never starts a line
    for (const u of units) { const test = line + u; if (mc.measureText(test).width > max && line.trim() && !noStart.test(u)) { out.push(line.trim()); line = u.trimStart(); } else line = test; }
    if (line.trim()) out.push(line.trim());
    return out;
  };
  const layoutCache = new Map();
  function layout(c) {
    if (layoutCache.has(c)) return layoutCache.get(c);
    const tag = CAPS.TAG[c.g], zh = wrap(c.zh, F.zh, MAXW, true), en = wrap(c.en, F.en, MAXW, false);
    mc.font = F.tag; const t0w = mc.measureText(tag[0] + '   ').width; mc.letterSpacing = '1.6px'; const tagW = t0w + mc.measureText(tag[1]).width + 12; mc.letterSpacing = '0px';
    mc.font = F.zh; const zw = Math.max(...zh.map(l => mc.measureText(l).width));
    mc.font = F.en; const ew = Math.max(...en.map(l => mc.measureText(l).width));
    const w = Math.max(tagW, zw, ew) + PAD * 2, h = PAD * 2 + 18 + 16 + zh.length * 44 + 8 + en.length * 31;
    const L = { tag, zh, en, w, h }; layoutCache.set(c, L); return L;
  }
  // the card for a chapter group stays up across its consecutive captions (text crossfades inside it)
  function groupSpan(i) { let a = i, b = i; const L = CAPS.L; while (a > 0 && L[a - 1].g === L[i].g && L[a].t0 - L[a - 1].t1 < 1) a--; while (b < L.length - 1 && L[b + 1].g === L[i].g && L[b + 1].t0 - L[b].t1 < 1) b++; return [a, b]; }
  function state(t) {
    const L = CAPS.L; let i = L.findIndex((c, k) => t >= c.t0 - .05 && (t < c.t1 + .05 || (k + 1 < L.length && t < L[k + 1].t0 && L[k + 1].g === c.g && L[k + 1].t0 - c.t1 < 1)));
    if (i < 0) return null;
    const [a, b] = groupSpan(i), g0 = L[a].t0, g1 = L[b].t1;
    const card = easeOut(seg(t, g0 - .05, g0 + .3)) * (1 - easeIn(seg(t, g1 - .15, g1 + .15)));   // the card unrolls / rolls up
    let w = 0, h = 0; for (let k = a; k <= b; k++) { const l = layout(L[k]); w = Math.max(w, l.w); h = Math.max(h, l.h); }
    const c = L[i], txt = seg(t, c.t0, c.t0 + .35) * (1 - seg(t, c.t1 - .3, c.t1 - .05)) * clamp((card - .93) / .07);
    return { c, card, txt, w, h, slide: 0 };
  }
  // painted card: after the frame's world, under the grain
  const _drawWorld = drawWorld;
  drawWorld = function (t) {
    _drawWorld(t);
    const s = state(t); if (!s || s.card <= .01) return;
    const y0 = BOTTOM - s.h + 18 * s.slide, x0 = X - 14 * s.slide;
    boilSeed('capshadow');
    const w = Math.max(24, s.w * s.card);
    paint(rrPts(x0 + 6, y0 + 9, w, s.h, 10, 1.5), { fill: PAL.ink, fillOp: 60, bleed: .12, tex: .2, border: .1, ink: null });
    boilSeed('capcard');
    paint(rrPts(x0, y0, w, s.h, 10, 1.2), { wash: '#F8F2E6', washOp: 242, ink: null });
    boilSeed('capbar');
    paint(rrPts(x0, y0 + 14, 5, s.h - 28, 2), { wash: '#C8412F', washOp: 255, ink: null });
    boilSeed('capedge'); paint(rrPts(x0, y0, w, s.h, 10, 1.2), { ink: PAL.ink, sw: .45 });
    window.__CAP = { x0, y0, s };
  };
  // crisp text on top
  const prevHook = window.overlayHook;
  window.overlayHook = (ctx, t) => {
    if (prevHook) prevHook(ctx, t);
    const s = state(t); if (!s || s.card <= .01) return;
    const l = layout(s.c), y0 = BOTTOM - s.h + 18 * s.slide, x0 = X - 14 * s.slide, a = s.card * s.txt;
    ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const tx = x0 + PAD + 8; let y = y0 + PAD + 14;
    ctx.globalAlpha = clamp((s.card - .93) / .07);
    ctx.font = F.tag; ctx.fillStyle = ACC; ctx.fillText(l.tag[0], tx, y);
    const tw = ctx.measureText(l.tag[0] + '   ').width; ctx.fillStyle = SUB; ctx.letterSpacing = '1.6px'; ctx.fillText(l.tag[1], tx + tw, y); ctx.letterSpacing = '0px';
    ctx.globalAlpha = s.txt; y += 16;
    ctx.font = F.zh; ctx.fillStyle = INK; for (const line of l.zh) { y += 44; ctx.fillText(line, tx, y - 6 + 6 * (1 - s.txt)); }
    ctx.font = F.en; ctx.fillStyle = SUB; y += 8; for (const line of l.en) { y += 31; ctx.fillText(line, tx, y - 4 + 6 * (1 - s.txt)); }
    ctx.restore();
  };
})();
