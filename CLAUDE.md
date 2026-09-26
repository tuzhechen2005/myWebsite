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
  and must **never be edited or served**. Current content source is the September 2026 résumé copied to
  `site/assets/resume.pdf`, plus the owner's separately supplied UW Surgery research role.
- Deployable site assets live under `site/`; root `dist/` zip bundles are generated artifacts and are ignored.

## Site structure (`site/`)
```
site/
├── index.html        ENTRY: the Work Reel ’26 plays full-screen (css/intro-reel.css + js/intro-reel.js):
│                     skip + sound during playback, then an end screen with “Enter the site” / “Watch again”.
│                     Exit = lime iris → home.html. Autoplay-blocked / reduced-motion → same screen in “start” mode.
├── story.html        Optional cinematic underwater intro (intro.js, canvas 2D), with hanging
│                     Lanyard ID card (Contact toggles drop/retract) and an Enter link to home.html.
├── home.html         Main portfolio — portrait hero, current UW Surgery and Microsoft work, featured projects, CTA (no video)
├── about.html        About — hero, stats, current clinical research and three internships, education with crest stage and campus photos, skills, honors
├── projects.html     Projects — Ballpit hero, three case studies, synthetic evidence-chain walkthrough (no video)
├── contact.html      Contact — email/GitHub/WeChat/phone cards, FAQ accordion
├── _headers          Cloudflare caching/security headers
├── assets/           profile.jpg, resume.pdf, local brand-logo SVGs, crest.png (W 校徽), bascom-hall/-mall.jpg (campus, CC BY-SA),
│                     intro/frame-0001..0360.jpg (underwater scrub frames), badge-card.png (designed ID-card face),
│                     idphoto.jpg (source portrait used inside the badge-card artwork),
│                     lanyard/card.glb + lanyard.png (React-Bits Lanyard model + band texture),
│                     reel/work-reel-26.mp4 (1600×900) + work-reel-26-540.mp4 (phones / save-data) + poster.jpg
├── fonts/            local Inter + Space Grotesk font files; Anton + JetBrains Mono (woff2) for the intro page
├── vendor/           local GSAP, ScrollTrigger, Lenis, three.js
├── css/
│   ├── style.css         design tokens, layout, nav, theming, reveal, marquee, ScrollFloat, Lenis
│   ├── assistant.css     AI chat widget (incl. dark-theme overrides)
│   ├── intro-reel.css    entry page (index.html): full-screen reel, skip/sound pills, end screen, CTAs, iris exit
│   ├── intro.css         story.html: scrub stage, text reveals, loader, Enter portal, #introLanyard placement, Contact button
│   └── magic-bento.css   archived card effects, not loaded by portfolio pages
└── js/
    ├── main.js           lang toggle, theme toggle, mobile nav, GSAP scroll-reveal, marquee, Lenis, FAQ
    ├── assistant.js      Portfolio guide (local preset knowledge base, no backend)
    ├── evidence-lab.js   Synthetic RAG evidence-state walkthrough on projects.html
    ├── intro-reel.js     index.html: reel playback, skip/sound, end screen, replay, iris exit, 2D dot-field background
    ├── liquid-ether.js   ESM — Three.js fluid hero background (home only)
    ├── ballpit.js        ESM — Three.js zero-gravity floating ball background (projects hero)
    ├── circular-text.js  vanilla CircularText text splitter for rotating resume CTA
    ├── magic-bento.js    archived hover effects, not loaded by portfolio pages
    ├── crest3d.js        CSS 3D extruded W-crest (about education); stacks layered PNG copies for depth + sway + pointer parallax + drag (clamped, no back face). Sides = solid black via brightness(0). No WebGL.
    ├── prism.js          raw-WebGL port of React-Bits <Prism/> (no ogl); glowing raymarched prism bg on the crest stage (<canvas data-prism>). HARDENED: on context-loss / shader error / <5fps stall it removes itself and the stage falls back to the pure-CSS .crest-stage__rays bg (adds/removes .prism-on on .crest-stage).
    ├── intro.js          landing scroll-scrub: preloads assets/intro/frame-####.jpg, ScrollTrigger scrub → canvas 2D frame draw + GSAP text timeline. Single-poster + procedural-placeholder fallbacks; static under reduced-motion.
    ├── lanyard.bundle.js BUILT artifact (~3MB) — the React-Bits <Lanyard/> (React+R3F+drei+Rapier-wasm+meshline) bundled by lanyard-src/. Mounts into #introLanyard; toggles the hanging Jelly ID card on the `lanyard:drop` window event (fired by the Contact button). DO NOT hand-edit — rebuild from lanyard-src/.
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
re-run the build** — never hand-edit `lanyard.bundle.js`, and **bump the `?v=` on its `<script>` in `story.html`**
each rebuild (the file path is cached; the owner tests in a real browser).

Card face = a `THREE.CanvasTexture` drawn in `entry.jsx` `makeCardTexture(badge)` and passed in to replace the
glb's `materials.base.map`. It loads the designed black/white cyber ID-card artwork from `site/assets/badge-card.png`
and draws it into the GLB's visible UV region. The current tuned mapping is:
`targetX = -25, targetY = -30, targetW = 300, targetH = 600`; **do not change these unless explicitly asked**,
because the owner tuned them manually in-browser. `flipY=false` so the canvas maps right-side-up onto the glb UVs.

Two gotchas that cost real time — keep them:
1. **Load the badge artwork BEFORE building the texture.** `entry.jsx` `App` loads `assets/badge-card.png`, and only
   then does `setTex(makeCardTexture(img))` and mount `<Lanyard>`. Drawing an image async + `tex.needsUpdate=true`
   does NOT repaint reliably (R3F won't re-render an idle frame) → the card face can silently go missing.
2. **Persistent invisible `<mesh>`** stays in the scene so R3F keeps rendering until the glb/texture/Rapier finish
   loading; without it the Suspense'd card never paints.

Placement/size/interaction: it hangs from a top-right container (`css/intro.css .intro__lanyard`; on mobile it spans
`100vw`/`100dvh` so touch drag has room). Contact dispatches `lanyard:drop` and now **toggles** the card: first click
drops/mounts it, second click adds `.is-retracting`, animates `.lanyard-wrapper` upward with `translateY(-112vh)`,
then unmounts the canvas after ~850ms. `story.html?drop=1` forces it open for dev. Touch dragging is supported via
R3F pointer events with `pointercancel` / `lostpointercapture` cleanup; dragging adds `body.lanyard-dragging` to lock
page scroll and prevent mobile touch-scroll conflicts. Headless screenshots render it only intermittently
(virtual-time race) — judge it in a real browser.

## Reels — the second build-only workspace (`reel-src/`)
The site shows ONE video: the kinetic Work Reel ’26, as the entry page (`index.html`). The portfolio pages mention no
video at all (owner's call, 2026-09-26). "The Paper Sea" (the hand-painted short, `reel-src/src/`, `STORYBOARD.md`) is
kept in `reel-src/` as a source project only and is no longer on the site.
The kinetic style is packaged as a Claude skill: `~/.claude/skills/kinetic-reel` (template + guides + this reel as
the worked example).

### Second cut: kinetic-type reel (`reel-src/kinetic/`)
"Work Reel ’26": kinetic typography in the style of the owner's reference clip (`diff_style_example.MP4`, gitignored):
Anton / Archivo Black / Instrument Serif / JetBrains Mono, black + cream + lime, three.js layers (particle terrain,
liquid marble, chrome knot, a particle cloud that condenses into a thyroid), a WebGL post pass (RGB split, slice
glitch, grain) and shape-continuity transitions (zoom through a UI element, iris, wipe, slats, pixel grid, push).
Current = **v3, 84 s**, in the order of emphasis the owner asked for: 01 Microsoft (30 s) → 02 UW–Madison Dept. of Surgery,
role **"AI Researcher"** (18 s) → 03 Enterprise RAG (14 s) → trace finale. v1/v2 sources are archived in
`kinetic/v1/` and `kinetic/v2/` (videos `out/kinetic-v1*.mp4`, `out/kinetic-v2*.mp4`). Page `kinetic/kinetic.html` +
`reel.js`, timeline `kinetic/cues.js`, score `music/score_kinetic.mjs`.
```bash
node render.mjs --page=kinetic/kinetic.html --fps=30 --frames --frames-dir=out/frames_k --workers=4   # ~25 s
node music/score_kinetic.mjs && ffmpeg -y -i music/kinetic.wav -af "highpass=f=30,equalizer=f=250:t=q:w=1:g=-2,loudnorm=I=-14:TP=-1.2:LRA=8" -c:a aac -b:a 192k assets/kinetic.m4a
```
Sound rule (owner feedback): no noise whooshes on transitions, they got tiring fast. Chapter changes get an in-key
reversed-pad swell; cuts inside a chapter get quiet tonal cues (bloom / glide / harp / hat roll) or nothing at all.
The pre-change score is kept as `kinetic/v3_score_whoosh.mjs`. Web copies for the entry page: `bash encode-intro.sh (run in reel-src/)` → `site/assets/reel/work-reel-26{,-540}.mp4` (2-pass, ~15 MB / ~7.4 MB); bump `?v=` in `js/intro-reel.js` when replacing them. The Range worker covers `/assets/reel/*`. On-screen numbers are only résumé/site figures, shown with their evaluation scope. Schematic
visuals (tool IDs, doc IDs, the AST, example answers) are labelled SCHEMATIC. No clinical efficacy claims.

## Conventions (follow these when editing)
- **Bilingual**: every translatable string is two sibling spans: `<span class="zh">…</span><span class="en">…</span>`.
  CSS `body[data-lang="en"] .zh{display:none}` / `…="zh" .en{…}` shows one. Toggle button persists choice in
  `localStorage["site-lang"]` (default `zh`). When adding content, always add both languages.
- **Theme**: `data-theme` on `<html>` (`light`/`dark`). An **inline `<head>` script** sets it before first paint
  (reads `localStorage["site-theme"]`, falls back to OS preference) to avoid FOUC. Dark palette = `:root[data-theme="dark"]`
  overrides of the CSS variables. Toggling adds a temporary `.theme-anim` class for a smooth color crossfade.
  Hard-coded colors that must survive theme flips use semantic vars (`--btn-fg`, `--cta-bg`, etc.).
- **Scroll reveal**: content stays visible by default; GSAP adds subtle position motion when available.
  Section `<h2>` headings are handled by ScrollFloat, which keeps an unsplit accessible copy.
- **Tech chips**: `<span class="tech" data-tech="Java"></span>` (or `.marquee-item[data-tech]`). `tech-icons.js`
  fills in icon + label. Brand logos are local SVGs in `site/assets/icons/`; monogram fallbacks remain for tools
  without stable local logos.
- The site now lists concrete tools in its tech chips; BM25 is included as a retrieval method. Keep project claims
  tied to the current résumé or an explicit owner update, especially for medical evaluation figures.

## Third-party dependencies (vendored locally, no install)
- **GSAP 3.12.5** + **ScrollTrigger**: `site/vendor/gsap/`.
- **Lenis 1.1.20**: `site/vendor/lenis/`.
- **three.js 0.160.0** ESM: `site/vendor/three/three.module.js`, imported by `liquid-ether.js` and `ballpit.js`.
- **Fonts**: local Inter and Space Grotesk files in `site/fonts/`, declared via `@font-face` in `style.css`.
- **Tech logos**: local SVGs in `site/assets/icons/`.
Avoid reintroducing Google Fonts, cdnjs, jsdelivr, Devicon, or Simple Icons runtime dependencies unless there is a clear reason; mainland China access is a goal.
Script load order per page: `gsap → ScrollTrigger → lenis → main.js → scroll-float.js → [tech-icons.js on about] → [circular-text.js on home] → [prism.js + crest3d.js on about] → assistant.js → [evidence-lab.js + showreel.js on projects] → [ESM modules as needed]`. Bump `?v=` for changed CSS/JS because Cloudflare caches these paths for one day.

## Ported React-Bits components (all converted to vanilla)
- **LiquidEther** → `liquid-ether.js` (`createLiquidEther(el, opts)`); inited from an inline module script in `home.html`.
- **MagicBento** → archived `magic-bento.js` and stylesheet are not loaded; project rows now use plain rules and spacing.
- **ScrollFloat** → `scroll-float.js`; targets `.sec-head h2`, splits inside `.zh`/`.en` spans (bilingual-safe).
- **Ballpit** → `ballpit.js`; inited from an inline module script in `projects.html`. It is zero-gravity, slowly expands from center, then drifts. Count is area-responsive; mobile resize/address-bar jitter should not reset physics.
- **CircularText** → `circular-text.js`; targets `[data-circular-text]` and wraps letters for the rotating resume CTA on the home hero.
- **Prism** → `prism.js` (raw WebGL, no `ogl`); glowing raymarched-prism background on the about-page crest stage (`<canvas data-prism>`), `rotate` mode. Hardened with a context-loss / shader-error / <5fps-stall watchdog that disposes the canvas and falls back to the CSS `.crest-stage__rays` background (toggles `.prism-on` on `.crest-stage`).
- **ShinyText** → CSS-only (no `motion`): `.crest-stage__word` ("UW–Madison") uses a silver→white→silver `background-clip:text` gradient swept via `@keyframes shiny-text`.
- **ModelViewer / LightRays** were tried earlier for the crest area and removed — ModelViewer/3D-coin replaced by the flat `crest3d.js`, and the WebGL LightRays caused a GPU-hang black-screen on the owner's hardware (replaced by the CSS rays + the hardened Prism). Avoid reintroducing unguarded WebGL backgrounds.

## Key tunables (where to change things)
- **Scroll speed / motion-sickness cap**: `js/main.js` Lenis block — Chinese uses `wheelMultiplier: 0.5`, English `0.55`,
  `lerp` (0.09), `MAX_GAP` (260, lower = lower peak flick speed). Language changes dispatch `site:langchange`.
- **MagicBento**: legacy files remain for reference but are not currently active.
- **ScrollFloat**: `js/scroll-float.js` — Chinese and English use separate char arrays and animation params; refreshes on language changes.
- **LiquidEther**: init opts in the `<script type="module">` at the bottom of `home.html`.
- **Ballpit**: init opts in the `<script type="module">` at the bottom of `projects.html`; `count`, `minCount`,
  `explosionStrength`, `drift`, and `maxVelocity` control the projects hero background.
- **Mobile nav**: `css/style.css` `@media (max-width: 680px)` + `js/main.js`. Menu opens as a full-screen overlay,
  locks body scroll with `body.nav-open`, closes on link click or Escape.
- **AI assistant**: knowledge base (`KB` array), `CHIPS`, `FALLBACK` in `js/assistant.js`.
  To upgrade to a real LLM, flip `CONFIG.useAPI = true` and implement `callLLM()` against a backend proxy
  (keeps the API key server-side). Currently **local KB only — no backend, no API key, zero cost.**

## Content facts (September 2026 résumé + owner-supplied research role)
- Email `ztu29@wisc.edu` · GitHub `tuzhechen2005` · WeChat `Jelly_Tu`.
- Current research: Lead AI Engineer, thyroid cancer AI support system, UW–Madison Department of Surgery,
  $69K funded project. Faculty PIs Courtney Balentine, MD, MPH and Alan McMillan, PhD. Owns clinical RAG,
  grounded generation, safety evaluation, and requirements collaboration. In development; future patient-facing
  validation is planned, not completed. No start date was provided, so do not invent one.
- Three internships: Microsoft Cloud & AI (2026.07–09), Jiangsu Liqun data platform (2025.09–12),
  Lanchuan AI workflow (2025.05–09). The older site's Lanchuan/Liqun dates were reversed.
- Two independent projects: multi-agent medical pre-consultation/triage (2026.01–present) and enterprise RAG
  assistant (2025.05–09). The old knowledge community is not featured in the new résumé.
- Medical project evaluation metrics are from its own test sets, not clinical validation or diagnostic approval.
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
- Cloudflare has historically tracked/deployed `codex1`; current local working branch is
  `design/declutter-cards-color`. Verify the actual Cloudflare branch setting before pushing.
- Cloudflare URL observed: `https://mywebsite.ztu29.workers.dev`.
- Cloudflare added `wrangler`/Workers autoconfig via remote commits; always `git pull --rebase` or `git fetch && git rebase origin/codex1` before pushing if remote changed.
- Cloudflare settings for static site: output directory is `site/`; no build step.
- `wrangler.jsonc` + root `worker.js`: everything is served as static assets except `/assets/reel/*` (the entry-page video), which runs
  through the Worker first (`assets.run_worker_first`) to add HTTP Range (206) support — Workers static assets answer
  Range requests with the full file, which breaks video seeking and Safari/iOS playback. Test locally with
  `npx wrangler@4.86.0 dev --local --compatibility-date=2026-05-03` (the latest wrangler needs Node 22).
- `site/_headers` configures basic security headers and cache headers.
- Optional upload bundle can be regenerated with:
```bash
mkdir -p dist && (cd site && zip -rq ../dist/zhechen-tu-cloudflare-pages.zip . -x '*.DS_Store')
```

## Status / not done yet
- Deployed through Cloudflare Workers static assets, but a custom personal domain has not been bound yet.
- The default entry at `index.html` plays the Work Reel ’26, then links to `home.html`. The optional underwater intro and card live at `story.html`.
- `/assets/*` is cached immutable for a year. When replacing `resume.pdf` or intro frames, bump the URL query
  version in every referencing file before deploying.
- Root scratch/source files to keep out of git: `image.png`, `工牌.png`, `证件照.jpg`, `效果图.png`/`校徽.png`
  (some already in `.gitignore`), `video_out/`. The real deployed badge asset is the copy under
  `site/assets/badge-card.png`.
- Possible next steps: custom domain, favicon/OG tags, WeChat QR image, additional mobile QA, intro copy polish.

## Accessibility / robustness baked in
- `prefers-reduced-motion`: disables Lenis, LiquidEther, ScrollFloat, and marquee motion.
- Touch/mobile: LiquidEther auto-skips; Ballpit disables cursor following on touch.
- No-JS: content stays visible (`html:not(.js)` rule); local asset failures fall back cleanly where possible.
