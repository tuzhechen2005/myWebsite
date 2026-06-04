# CLAUDE.md

Project memory for this repo. Read this first when starting work here.

## What this is
A **bilingual (中文/English) personal portfolio website** for **涂喆宸 / Zhechen Tu**
(UW–Madison CS undergrad, 2023–2027, targeting **AI Application / Agent Engineer** roles).
Hand-written **static site** — plain HTML/CSS/JS, no build step, no framework. Currently deployed via
Cloudflare Workers static assets from the GitHub repo.

## Important: where the real site lives
- **All real work is in `site/`.** Edit those files.
- The four big `*.html` files in the **repo root** (`About_Me...html`, `Devraj_Chatribin...html`,
  `My_Projects...html`, `Contact_Me...html`) are **saved Wix pages from a reference portfolio
  (Devraj Chatribin)** used only as a **design reference**. They are 0.4–12 MB each, auto-generated,
  and must **never be edited or served**. `user_resume.pdf` (root) is the source of the site's content.
- Deployable site assets live under `site/`; root `dist/` zip bundles are generated artifacts and are ignored.

## Site structure (`site/`)
```
site/
├── index.html        LANDING = cinematic scroll-scrubbed intro (NOT the home page anymore). Full-screen
│                     baobab-dusk image-sequence scrubbed by scroll (intro.js, canvas 2D) + bilingual text
│                     reveals + a top-right hanging Lanyard ID card (React bundle, drops in when the Contact
│                     button is pressed) + an "Enter" portal → home.html. First-visit gate (INTRO_DEV flag).
├── home.html         Home (the former index.html) — portrait hero (LiquidEther bg), CircularText resume CTA, marquee, expertise cards, featured projects, CTA
├── about.html        About — hero, stats, education (crest stage: 3D extruded W-crest over a Prism WebGL bg [CSS-rays fallback] + shiny-metallic UW–Madison wordmark, ranking/alumni/numbers highlight cards, degree timeline, campus photos) / experience timeline, skills, honors
├── projects.html     Projects — Ballpit hero bg + 3 detailed project cards with quantified-metric side panels
├── contact.html      Contact — email/GitHub/WeChat/phone cards, FAQ accordion
├── _headers          Cloudflare caching/security headers
├── assets/           profile.jpg, resume.pdf, local brand-logo SVGs, crest.png (W 校徽), bascom-hall/-mall.jpg (campus, CC BY-SA),
│                     intro/frame-0001..0144.jpg (baobab-dusk scrub frames, from Pexels 33165323), idphoto.jpg (证件照 for the card),
│                     lanyard/card.glb + lanyard.png (React-Bits Lanyard model + band texture)
├── fonts/            local Inter + Space Grotesk font files
├── vendor/           local GSAP, ScrollTrigger, Lenis, three.js
├── css/
│   ├── style.css         design tokens, layout, nav, theming, reveal, marquee, ScrollFloat, Lenis
│   ├── assistant.css     AI chat widget (incl. dark-theme overrides)
│   ├── intro.css         landing intro: scrub stage, text reveals, loader, Enter portal, #introLanyard placement, Contact button
│   └── magic-bento.css   card border-glow / spotlight / particles
└── js/
    ├── main.js           lang toggle, theme toggle, mobile nav, GSAP scroll-reveal, marquee, Lenis, FAQ
    ├── assistant.js      AI chat assistant (local knowledge base, no backend)
    ├── liquid-ether.js   ESM — Three.js fluid hero background (home only)
    ├── ballpit.js        ESM — Three.js zero-gravity floating ball background (projects hero)
    ├── circular-text.js  vanilla CircularText text splitter for rotating resume CTA
    ├── magic-bento.js    cursor glow / spotlight / particles / magnetism / ripple on cards
    ├── crest3d.js        CSS 3D extruded W-crest (about education); stacks layered PNG copies for depth + sway + pointer parallax + drag (clamped, no back face). Sides = solid black via brightness(0). No WebGL.
    ├── prism.js          raw-WebGL port of React-Bits <Prism/> (no ogl); glowing raymarched prism bg on the crest stage (<canvas data-prism>). HARDENED: on context-loss / shader error / <5fps stall it removes itself and the stage falls back to the pure-CSS .crest-stage__rays bg (adds/removes .prism-on on .crest-stage).
    ├── intro.js          landing scroll-scrub: preloads assets/intro/frame-####.jpg, ScrollTrigger scrub → canvas 2D frame draw + GSAP text timeline. Single-poster + procedural-placeholder fallbacks; static under reduced-motion.
    ├── lanyard.bundle.js BUILT artifact (~3MB) — the React-Bits <Lanyard/> (React+R3F+drei+Rapier-wasm+meshline) bundled by lanyard-src/. Mounts into #introLanyard; shows the hanging Jelly ID card on the `lanyard:drop` window event (fired by the Contact button). DO NOT hand-edit — rebuild from lanyard-src/.
    ├── scroll-float.js   per-character scrubbed reveal for section <h2> headings
    └── tech-icons.js      renders brand logos into [data-tech] chips, monogram fallback
```

## Lanyard widget — the ONE exception to "no build step"
The hanging ID card on the intro is the actual React-Bits `<Lanyard/>` (React + @react-three/fiber +
@react-three/drei + @react-three/rapier + meshline + three), which **cannot** run as vanilla. It lives in
**`lanyard-src/`** (build workspace, `node_modules` gitignored) and is **bundled once, locally**, into the
committed `site/js/lanyard.bundle.js`:
```bash
cd lanyard-src && npm install && npm run build   # esbuild → ../site/js/lanyard.bundle.js (~3MB, wasm inlined)
```
Deploy stays 100% static (Cloudflare just serves the pre-built file; the Rapier wasm is base64-inlined so it's
self-hosted / China-accessible). **Edit the card/physics/look in `lanyard-src/Lanyard.jsx` + `entry.jsx`, then
re-run the build** — never hand-edit `lanyard.bundle.js`, and **bump the `?v=` on its `<script>` in `index.html`**
each rebuild (the file path is cached; the owner tests in a real browser).

Card face = a `THREE.CanvasTexture` drawn in `entry.jsx` `makeCardTexture(photo, name)` and passed in to replace
the glb's `materials.base.map`. Layout: dark card, **"Jelly" top-left**, **证件照 small in the top-right corner**
(not full-bleed — `pbw/pbh/pbx/pby` size/place it), then `AI · AGENT ENGINEER` / `涂喆宸` / email / holo + barcode.
`flipY=false` so the canvas maps right-side-up onto the glb UVs.

Two gotchas that cost real time — keep them:
1. **Load the photo BEFORE building the texture.** `entry.jsx` `App` loads `assets/idphoto.jpg`, and only then
   does `setTex(makeCardTexture(img,…))` and mount `<Lanyard>`. Drawing the photo async + `tex.needsUpdate=true`
   does NOT repaint (R3F won't re-render an idle frame) → the photo silently goes missing.
2. **Persistent invisible `<mesh>`** stays in the scene so R3F keeps rendering until the glb/texture/Rapier finish
   loading; without it the Suspense'd card never paints.

Placement/size: it hangs from a small **top-right** container (`css/intro.css .intro__lanyard`). It "drops from the
top of the screen" because the camera (`position` z in `Lanyard.jsx`, default 22) puts the rope anchor just above
the top edge; smaller z = bigger card + anchor higher. It mounts/drops only on the `lanyard:drop` event (Contact
button); `index.html?drop=1` forces it for dev. Headless screenshots render it only intermittently (virtual-time
race) — judge it in a real browser.

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
  fills in icon + label. Brand logos are local SVGs in `site/assets/icons/`; monogram fallbacks remain for tools
  without stable local logos.
- **Only real tools go in the "tech stack"** (About skills section + marquee). Concepts/methodologies
  (RAG, ReAct, Function Calling, Plan-and-Execute, Self-Reflection, BM25, Cross-Encoder, Text-to-SQL, etc.)
  are intentionally **kept out of the tech stack** but may appear as project/expertise descriptors.

## Third-party dependencies (vendored locally, no install)
- **GSAP 3.12.5** + **ScrollTrigger**: `site/vendor/gsap/`.
- **Lenis 1.1.20**: `site/vendor/lenis/`.
- **three.js 0.160.0** ESM: `site/vendor/three/three.module.js`, imported by `liquid-ether.js` and `ballpit.js`.
- **Fonts**: local Inter and Space Grotesk files in `site/fonts/`, declared via `@font-face` in `style.css`.
- **Tech logos**: local SVGs in `site/assets/icons/`.
Avoid reintroducing Google Fonts, cdnjs, jsdelivr, Devicon, or Simple Icons runtime dependencies unless there is a clear reason; mainland China access is a goal.
Script load order per page: `gsap → ScrollTrigger → lenis → main.js → magic-bento.js → scroll-float.js → [tech-icons.js] → [circular-text.js on home] → [prism.js + crest3d.js on about] → assistant.js → [ESM modules as needed]`. (Cache-busted `?v=` query strings are used on about-page assets — bump them when editing.)

## Ported React-Bits components (all converted to vanilla)
- **LiquidEther** → `liquid-ether.js` (`createLiquidEther(el, opts)`); inited from an inline module script in `index.html`. Colors `#5227FF/#FF9FFC/#B497CF`.
- **MagicBento** → `magic-bento.js` (config array maps selectors → effects). Glow color = site accent `93,77,255`.
- **ScrollFloat** → `scroll-float.js`; targets `.sec-head h2`, splits inside `.zh`/`.en` spans (bilingual-safe).
- **Ballpit** → `ballpit.js`; inited from an inline module script in `projects.html`. It is zero-gravity, slowly expands from center, then drifts. Count is area-responsive; mobile resize/address-bar jitter should not reset physics.
- **CircularText** → `circular-text.js`; targets `[data-circular-text]` and wraps letters for the rotating resume CTA on the home hero.
- **Prism** → `prism.js` (raw WebGL, no `ogl`); glowing raymarched-prism background on the about-page crest stage (`<canvas data-prism>`), `rotate` mode. Hardened with a context-loss / shader-error / <5fps-stall watchdog that disposes the canvas and falls back to the CSS `.crest-stage__rays` background (toggles `.prism-on` on `.crest-stage`). MagicBento is also applied to the `.hl-card` ranking/alumni/numbers boxes.
- **ShinyText** → CSS-only (no `motion`): `.crest-stage__word` ("UW–Madison") uses a silver→white→silver `background-clip:text` gradient swept via `@keyframes shiny-text`.
- **ModelViewer / LightRays** were tried earlier for the crest area and removed — ModelViewer/3D-coin replaced by the flat `crest3d.js`, and the WebGL LightRays caused a GPU-hang black-screen on the owner's hardware (replaced by the CSS rays + the hardened Prism). Avoid reintroducing unguarded WebGL backgrounds.

## Key tunables (where to change things)
- **Scroll speed / motion-sickness cap**: `js/main.js` Lenis block — Chinese uses `wheelMultiplier: 0.5`, English `0.55`,
  `lerp` (0.09), `MAX_GAP` (260, lower = lower peak flick speed). Language changes dispatch `site:langchange`.
- **MagicBento**: `js/magic-bento.js` — `GLOW`, `SPOTLIGHT_RADIUS`, `PARTICLE_COUNT`, per-selector `CONFIG` flags
  (tilt/magnet/stars/click). Border/spotlight styling in `css/magic-bento.css`.
- **ScrollFloat**: `js/scroll-float.js` — Chinese and English use separate char arrays and animation params; refreshes on language changes.
- **LiquidEther**: init opts in the `<script type="module">` at the bottom of `index.html`.
- **Ballpit**: init opts in the `<script type="module">` at the bottom of `projects.html`; `count`, `minCount`,
  `explosionStrength`, `drift`, and `maxVelocity` control the projects hero background.
- **Mobile nav**: `css/style.css` `@media (max-width: 680px)` + `js/main.js`. Menu opens as a full-screen overlay,
  locks body scroll with `body.nav-open`, closes on link click or Escape.
- **AI assistant**: knowledge base (`KB` array, 14 bilingual intents), `CHIPS`, `FALLBACK` in `js/assistant.js`.
  To upgrade to a real LLM, flip `CONFIG.useAPI = true` and implement `callLLM()` against a backend proxy
  (keeps the API key server-side). Currently **local KB only — no backend, no API key, zero cost.**

## Content facts (from `user_resume.pdf`)
- Email `ztu29@wisc.edu` · GitHub `tuzhechen2005` · WeChat `Jelly_Tu`.
- 3 solo projects: multi-agent medical pre-consultation/triage (LangGraph), enterprise RAG assistant, AI knowledge community.
- 2 internships: 蓝船科技 (AI workflow, n8n/Coze), 江苏力群科技 (data platform, Flink/Text-to-SQL).
- Deployed resume asset: `site/assets/resume.pdf`.
- Home portrait asset: `site/assets/profile.jpg` copied from root `写真.jpg`; root original is ignored.

## Local preview
```bash
cd site && python3 -m http.server 8765   # then open http://localhost:8765/index.html
```
Hard-refresh (Cmd+Shift+R) after JS/CSS changes. Core runtime assets are local; external network is not needed for fonts,
animations, Three.js, or tech logos.

## Deployment
- GitHub repo: `https://github.com/tuzhechen2005/myWebsite` (private).
- Active branch: `codex1`; Cloudflare currently tracks/deploys this branch.
- Cloudflare URL observed: `https://mywebsite.ztu29.workers.dev`.
- Cloudflare added `wrangler`/Workers autoconfig via remote commits; always `git pull --rebase` or `git fetch && git rebase origin/codex1` before pushing if remote changed.
- Cloudflare settings for static site: output directory is `site/`; no build step.
- `site/_headers` configures basic security headers and cache headers.
- Optional upload bundle can be regenerated with:
```bash
mkdir -p dist && (cd site && zip -rq ../dist/zhechen-tu-cloudflare-pages.zip . -x '*.DS_Store')
```

## Status / not done yet
- Deployed through Cloudflare Workers static assets, but a custom personal domain has not been bound yet.
- **Cinematic intro + Lanyard work is uncommitted on a local feature state; not yet pushed/deployed.** The intro
  (scroll-scrub baobab bg + text + hanging Jelly card) replaces the old home as the landing; old home → `home.html`.
- **BEFORE DEPLOY: set `INTRO_DEV = false`** in `index.html`'s `<head>` (currently `true` so refresh always shows
  the intro during dev; `false` restores "first visit only", returning visitors `location.replace('home.html')`).
- Root scratch files to keep out of git: `image.png`, `证件照.jpg`, `效果图.png`/`校徽.png` (some already in
  `.gitignore`), `video_out/`. The real assets are the copies under `site/assets/`.
- Possible next steps: custom domain, favicon/OG tags, WeChat QR image, additional mobile QA, intro copy polish.

## Accessibility / robustness baked in
- `prefers-reduced-motion`: disables Lenis, LiquidEther, ScrollFloat, MagicBento, marquee.
- Touch/mobile: heavy hover effects (MagicBento, LiquidEther) auto-skip; Ballpit disables cursor following on touch.
- No-JS: content stays visible (`html:not(.js)` rule); local asset failures fall back cleanly where possible.
