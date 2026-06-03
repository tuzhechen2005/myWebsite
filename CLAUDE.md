# CLAUDE.md

Project memory for this repo. Read this first when starting work here.

## What this is
A **bilingual (中文/English) personal portfolio website** for **涂喆宸 / Zhechen Tu**
(UW–Madison CS undergrad, 2023–2027, targeting **AI Application / Agent Engineer** roles).
Hand-written **static site** — plain HTML/CSS/JS, no build step, no framework. Deployable
to GitHub Pages / Netlify / Vercel as-is.

## Important: where the real site lives
- **All real work is in `site/`.** Edit those files.
- The four big `*.html` files in the **repo root** (`About_Me...html`, `Devraj_Chatribin...html`,
  `My_Projects...html`, `Contact_Me...html`) are **saved Wix pages from a reference portfolio
  (Devraj Chatribin)** used only as a **design reference**. They are 0.4–12 MB each, auto-generated,
  and must **never be edited or served**. `user_resume.pdf` (root) is the source of the site's content.

## Site structure (`site/`)
```
site/
├── index.html        Home — hero (LiquidEther bg), marquee, expertise cards, featured projects, CTA
├── about.html        About — hero, stats, education/experience timeline, skills (tech-stack icons), honors
├── projects.html     Projects — 3 detailed project cards with quantified-metric side panels
├── contact.html      Contact — email/GitHub/WeChat/phone cards, FAQ accordion
├── css/
│   ├── style.css         design tokens, layout, nav, theming, reveal, marquee, ScrollFloat, Lenis
│   ├── assistant.css     AI chat widget (incl. dark-theme overrides)
│   └── magic-bento.css   card border-glow / spotlight / particles
└── js/
    ├── main.js           lang toggle, theme toggle, mobile nav, GSAP scroll-reveal, marquee, Lenis, FAQ
    ├── assistant.js      AI chat assistant (local knowledge base, no backend)
    ├── liquid-ether.js   ESM — Three.js fluid hero background (home only)
    ├── magic-bento.js    cursor glow / spotlight / particles / magnetism / ripple on cards
    ├── scroll-float.js   per-character scrubbed reveal for section <h2> headings
    └── tech-icons.js      renders brand logos into [data-tech] chips, monogram fallback
```

## Conventions (follow these when editing)
- **Bilingual**: every translatable string is two sibling spans: `<span class="zh">…</span><span class="en">…</span>`.
  CSS `body[data-lang="en"] .zh{display:none}` / `…="zh" .en{…}` shows one. Toggle button persists choice in
  `localStorage["site-lang"]` (default `zh`). When adding content, always add both languages.
- **Theme**: `data-theme` on `<html>` (`light`/`dark`). An **inline `<head>` script** sets it before first paint
  (reads `localStorage["site-theme"]`, falls back to OS preference) to avoid FOUC. Dark palette = `:root[data-theme="dark"]`
  overrides of the CSS variables. Toggling adds a temporary `.theme-anim` class for a smooth color crossfade.
  Hard-coded colors that must survive theme flips use semantic vars (`--btn-fg`, `--cta-bg`, etc.).
- **Scroll reveal**: elements with `.reveal` fade up. Driven by GSAP+ScrollTrigger when available
  (`html.has-gsap`), else IntersectionObserver, else visible (`html:not(.js)`). Section `<h2>` headings are
  **excluded** from this and handled by ScrollFloat instead (see main.js filter).
- **Tech chips**: `<span class="tech" data-tech="Java"></span>` (or `.marquee-item[data-tech]`). `tech-icons.js`
  fills in icon + label. Icon map + monogram fallback colors live in that file.
- **Only real tools go in the "tech stack"** (About skills section + marquee). Concepts/methodologies
  (RAG, ReAct, Function Calling, Plan-and-Execute, Self-Reflection, BM25, Cross-Encoder, Text-to-SQL, etc.)
  are intentionally **kept out of the tech stack** but may appear as project/expertise descriptors.

## Third-party dependencies (all via CDN, no install)
- **GSAP 3.12.5** + **ScrollTrigger** (cdnjs) — animations; loaded on all pages before `main.js`.
- **Lenis 1.1.20** (jsdelivr) — smooth + speed-limited scrolling.
- **three.js 0.160.0** (jsdelivr ESM) — imported by `liquid-ether.js` only.
- **Devicon** (jsdelivr) + **Simple Icons** (cdn.simpleicons.org) — tech-stack brand logos.
- **Google Fonts**: Space Grotesk (display) + Inter (body).
Script load order per page: `gsap → ScrollTrigger → lenis → main.js → magic-bento.js → scroll-float.js → [tech-icons.js] → assistant.js → [liquid-ether module, home only]`.

## Ported React-Bits components (all converted to vanilla)
- **LiquidEther** → `liquid-ether.js` (`createLiquidEther(el, opts)`); inited from an inline module script in `index.html`. Colors `#5227FF/#FF9FFC/#B497CF`.
- **MagicBento** → `magic-bento.js` (config array maps selectors → effects). Glow color = site accent `93,77,255`.
- **ScrollFloat** → `scroll-float.js`; targets `.sec-head h2`, splits inside `.zh`/`.en` spans (bilingual-safe).

## Key tunables (where to change things)
- **Scroll speed / motion-sickness cap**: `js/main.js` Lenis block — `wheelMultiplier` (0.55, lower = slower),
  `lerp` (0.09), `MAX_GAP` (260, lower = lower peak flick speed).
- **MagicBento**: `js/magic-bento.js` — `GLOW`, `SPOTLIGHT_RADIUS`, `PARTICLE_COUNT`, per-selector `CONFIG` flags
  (tilt/magnet/stars/click). Border/spotlight styling in `css/magic-bento.css`.
- **ScrollFloat**: `js/scroll-float.js` — `stagger`, `ease`, scrollTrigger `start`/`end`/`scrub`.
- **LiquidEther**: init opts in the `<script type="module">` at the bottom of `index.html`.
- **AI assistant**: knowledge base (`KB` array, 14 bilingual intents), `CHIPS`, `FALLBACK` in `js/assistant.js`.
  To upgrade to a real LLM, flip `CONFIG.useAPI = true` and implement `callLLM()` against a backend proxy
  (keeps the API key server-side). Currently **local KB only — no backend, no API key, zero cost.**

## Content facts (from `user_resume.pdf`)
- Email `ztu29@wisc.edu` · GitHub `tuzhechen2005` · WeChat `Jelly_Tu`.
- 3 solo projects: multi-agent medical pre-consultation/triage (LangGraph), enterprise RAG assistant, AI knowledge community.
- 2 internships: 蓝船科技 (AI workflow, n8n/Coze), 江苏力群科技 (data platform, Flink/Text-to-SQL).

## Local preview
```bash
cd site && python3 -m http.server 8765   # then open http://localhost:8765/index.html
```
Hard-refresh (Cmd+Shift+R) after JS/CSS changes. LiquidEther + brand icons need internet (CDN); everything
degrades gracefully offline.

## Status / not done yet
- **Not deployed.** Target is GitHub Pages (repo is not yet a git repo — would need `git init`).
- Possible next steps discussed: profile photo, WeChat QR image, resume-download button, favicon/OG tags.

## Accessibility / robustness baked in
- `prefers-reduced-motion`: disables Lenis, LiquidEther, ScrollFloat, MagicBento, marquee.
- Touch/mobile: heavy hover effects (MagicBento, LiquidEther) auto-skip.
- No-JS: content stays visible (`html:not(.js)` rule); CDN failures fall back cleanly.
