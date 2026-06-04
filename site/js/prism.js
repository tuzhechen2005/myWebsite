/* =========================================================
   prism.js — vanilla WebGL port of React-Bits <Prism/> (no ogl).
   A glowing raymarched prism background for the crest stage.

   Hardened against the GPU hang / black-screen seen with WebGL
   backgrounds on some hardware: on context-creation failure, shader
   compile/link error, WebGL context loss, render exception, OR a
   sustained <5fps stall, it disposes itself and falls back to the
   pure-CSS light-rays background (the `.crest-stage__rays` element).
   ========================================================= */
(function () {
  function start() {
    var canvas = document.querySelector('[data-prism]');
    if (!canvas) return;
    var stage = canvas.closest('.crest-stage');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function fallback() {
      try { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) {}
      if (stage) stage.classList.remove('prism-on'); // re-show CSS rays
    }

    // props (from the usage example)
    var P = { height: 3.5, baseWidth: 5.5, glow: 1, noise: 0.12, scale: 3.6,
      hueShift: 0, colorFrequency: 1, bloom: 1, timeScale: 0.5, transparent: true };
    var H = Math.max(0.001, P.height);
    var BASE_HALF = Math.max(0.001, P.baseWidth) * 0.5;
    var SAT = P.transparent ? 1.5 : 1;
    var SCALE = Math.max(0.001, P.scale);

    var glo = { alpha: true, antialias: false, premultipliedAlpha: false, depth: false, powerPreference: 'high-performance' };
    var gl = canvas.getContext('webgl', glo) || canvas.getContext('experimental-webgl', glo);
    if (!gl) { fallback(); return; }

    var VERT = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
    var FRAG = `precision highp float;
      uniform vec2 iResolution; uniform float iTime;
      uniform float uHeight; uniform float uBaseHalf; uniform mat3 uRot; uniform int uUseBaseWobble;
      uniform float uGlow; uniform vec2 uOffsetPx; uniform float uNoise; uniform float uSaturation;
      uniform float uScale; uniform float uHueShift; uniform float uColorFreq; uniform float uBloom;
      uniform float uCenterShift; uniform float uInvBaseHalf; uniform float uInvHeight; uniform float uMinAxis;
      uniform float uPxScale; uniform float uTimeScale;
      vec4 tanh4(vec4 x){ vec4 e2x = exp(2.0*x); return (e2x - 1.0)/(e2x + 1.0); }
      float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233)))*43758.5453123); }
      float sdOctaAnisoInv(vec3 p){
        vec3 q = vec3(abs(p.x)*uInvBaseHalf, abs(p.y)*uInvHeight, abs(p.z)*uInvBaseHalf);
        float m = q.x + q.y + q.z - 1.0; return m*uMinAxis*0.5773502691896258; }
      float sdPyramidUpInv(vec3 p){ float oct = sdOctaAnisoInv(p); float halfSpace = -p.y; return max(oct, halfSpace); }
      mat3 hueRotation(float a){ float c=cos(a),s=sin(a);
        mat3 W = mat3(0.299,0.587,0.114, 0.299,0.587,0.114, 0.299,0.587,0.114);
        mat3 U = mat3(0.701,-0.587,-0.114, -0.299,0.413,-0.114, -0.300,-0.588,0.886);
        mat3 V = mat3(0.168,-0.331,0.500, 0.328,0.035,-0.500, -0.497,0.296,0.201);
        return W + U*c + V*s; }
      void main(){
        vec2 f = (gl_FragCoord.xy - 0.5*iResolution.xy - uOffsetPx) * uPxScale;
        float z = 5.0; float d = 0.0; vec3 p; vec4 o = vec4(0.0);
        float centerShift = uCenterShift; float cf = uColorFreq;
        mat2 wob = mat2(1.0);
        if (uUseBaseWobble == 1) {
          float t = iTime * uTimeScale;
          float c0 = cos(t + 0.0); float c1 = cos(t + 33.0); float c2 = cos(t + 11.0);
          wob = mat2(c0, c1, c2, c0);
        }
        const int STEPS = 100;
        for (int i = 0; i < STEPS; i++) {
          p = vec3(f, z); p.xz = p.xz * wob; p = uRot * p;
          vec3 q = p; q.y += centerShift;
          d = 0.1 + 0.2*abs(sdPyramidUpInv(q)); z -= d;
          o += (sin((p.y + z)*cf + vec4(0.0,1.0,2.0,3.0)) + 1.0)/d;
        }
        o = tanh4(o*o*(uGlow*uBloom)/1e5);
        vec3 col = o.rgb;
        float n = rand(gl_FragCoord.xy + vec2(iTime));
        col += (n - 0.5)*uNoise; col = clamp(col, 0.0, 1.0);
        float L = dot(col, vec3(0.2126,0.7152,0.0722));
        col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);
        if(abs(uHueShift) > 0.0001){ col = clamp(hueRotation(uHueShift)*col, 0.0, 1.0); }
        gl_FragColor = vec4(col, o.a);
      }`;

    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { fallback(); return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fallback(); return; }
    gl.useProgram(prog);

    var lost = false;
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); lost = true; cancelAnimationFrame(raf); fallback();
    }, false);

    var pbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    function U(n) { return gl.getUniformLocation(prog, n); }
    var u = {
      iResolution: U('iResolution'), iTime: U('iTime'), uHeight: U('uHeight'), uBaseHalf: U('uBaseHalf'),
      uRot: U('uRot'), uUseBaseWobble: U('uUseBaseWobble'), uGlow: U('uGlow'), uOffsetPx: U('uOffsetPx'),
      uNoise: U('uNoise'), uSaturation: U('uSaturation'), uScale: U('uScale'), uHueShift: U('uHueShift'),
      uColorFreq: U('uColorFreq'), uBloom: U('uBloom'), uCenterShift: U('uCenterShift'), uInvBaseHalf: U('uInvBaseHalf'),
      uInvHeight: U('uInvHeight'), uMinAxis: U('uMinAxis'), uPxScale: U('uPxScale'), uTimeScale: U('uTimeScale')
    };
    gl.uniformMatrix3fv(u.uRot, false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
    gl.uniform1i(u.uUseBaseWobble, 1);
    gl.uniform1f(u.uHeight, H);
    gl.uniform1f(u.uBaseHalf, BASE_HALF);
    gl.uniform1f(u.uGlow, Math.max(0, P.glow));
    gl.uniform1f(u.uNoise, Math.max(0, P.noise));
    gl.uniform1f(u.uSaturation, SAT);
    gl.uniform1f(u.uScale, SCALE);
    gl.uniform1f(u.uHueShift, P.hueShift || 0);
    gl.uniform1f(u.uColorFreq, Math.max(0, P.colorFrequency || 1));
    gl.uniform1f(u.uBloom, Math.max(0, P.bloom || 1));
    gl.uniform1f(u.uCenterShift, H * 0.25);
    gl.uniform1f(u.uInvBaseHalf, 1 / BASE_HALF);
    gl.uniform1f(u.uInvHeight, 1 / H);
    gl.uniform1f(u.uMinAxis, Math.min(BASE_HALF, H));
    gl.uniform1f(u.uTimeScale, Math.max(0, P.timeScale || 1));

    var dpr = Math.min(2, window.devicePixelRatio || 1); // full sharpness (watchdog guards perf)
    function resize() {
      var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      var W = Math.max(1, Math.floor(w * dpr)), Hh = Math.max(1, Math.floor(h * dpr));
      canvas.width = W; canvas.height = Hh;
      gl.viewport(0, 0, W, Hh);
      gl.uniform2f(u.iResolution, W, Hh);
      gl.uniform2f(u.uOffsetPx, 0, 0);
      gl.uniform1f(u.uPxScale, 1 / ((Hh || 1) * 0.1 * SCALE));
    }
    var ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);

    var raf = 0, running = false, t0 = performance.now(), last = 0, frames = 0, slow = 0;
    function draw(time) {
      gl.uniform1f(u.iTime, time);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      if (lost) return;
      if (last) {            // sustained <5fps after warmup -> bail to CSS bg
        var dt = now - last; frames++;
        if (frames > 30) { if (dt > 200) { if (++slow >= 10) { running = false; cancelAnimationFrame(raf); fallback(); return; } } else slow = 0; }
      }
      last = now;
      try { draw((now - t0) * 0.001); }
      catch (e) { running = false; cancelAnimationFrame(raf); fallback(); return; }
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (running) return; running = true; raf = requestAnimationFrame(loop); }

    if (stage) stage.classList.add('prism-on'); // success: hide CSS rays, show prism

    if (reduce) { draw(0); return; } // static single frame, no loop

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) kick(); else { running = false; cancelAnimationFrame(raf); } });
      }, { threshold: 0.02 }).observe(canvas);
    } else { kick(); }
    draw(0); // paint first frame immediately
  }

  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
