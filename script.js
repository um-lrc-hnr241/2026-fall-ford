// Team Ford · the nested host.
// Without this file the page still works: every build card is listed and every link works.
// With it: layers light up by due date, clicking a layer or a note sounds that note and
// opens its build card, and "Play the eight notes" plays them outermost to innermost.

(function () {
  document.documentElement.classList.add("js");

  // =====================================================================
  // Home hero: Dolores at the puddle. Scrolling through the hero reveals
  // the maze on her reflection (--mix 0→1). With WebGL, the water ripples
  // and two droplets send out rings; without it, the two <img> layers
  // cross-fade with CSS. Ported from the team's Dolores scroll animation.
  // =====================================================================
  (function doloresHero() {
    var hero = document.querySelector(".hero");
    var canvas = hero && hero.querySelector(".hero-gl");
    if (!hero || !canvas) return;

    var imgA = hero.querySelector(".hero-img-base");
    var imgB = hero.querySelector(".hero-img-maze");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var target = 0;
    var smooth = 0;

    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function onScroll() {
      var r = hero.getBoundingClientRect();
      var span = hero.offsetHeight - window.innerHeight;
      var raw = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
      var t = Math.min(Math.max((raw - 0.05) / 0.8, 0), 1);
      target = ease(t);
      hero.style.setProperty("--progress", raw.toFixed(4));
      if (!glReady) hero.style.setProperty("--mix", target.toFixed(4));
    }

    var glReady = false;
    window.addEventListener("scroll", function () { requestAnimationFrame(onScroll); }, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    if (reduce) return; // keep the calm CSS cross-fade

    var gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    var VERT =
      "attribute vec2 a_position; varying vec2 v_uv;" +
      "void main(){ v_uv = a_position * 0.5 + 0.5; v_uv.y = 1.0 - v_uv.y; gl_Position = vec4(a_position, 0.0, 1.0); }";

    // Effects are placed in IMAGE coordinates (0–1 across the photo), so the
    // puddle, face and droplets stay put whatever the screen shape.
    var FRAG = [
      "precision highp float;",
      "uniform sampler2D u_a; uniform sampler2D u_b;",
      "uniform float u_time; uniform float u_mix;",
      "uniform vec2 u_res; uniform vec2 u_img; uniform vec2 u_focus;",
      "varying vec2 v_uv;",
      "const vec2 PUDDLE = vec2(0.66, 0.42); const vec2 PUDDLE_R = vec2(0.30, 0.42);",
      "const vec2 DROP1 = vec2(0.855, 0.345); const vec2 DROP2 = vec2(0.90, 0.62);",
      "vec2 rings(vec2 uv, vec2 c, vec2 squash, float speed, float period, float phase, float maxR, float w, float amp) {",
      "  vec2 d = (uv - c) / squash; float dist = length(d); vec2 dir = dist > 0.001 ? normalize(d) : vec2(0.0);",
      "  float s = 0.0;",
      "  for (int k = 0; k < 3; k++) {",
      "    float r = mod(u_time * speed + phase + float(k) * period / 3.0, period) / period;",
      "    float fade = (1.0 - r) * (1.0 - r);",
      "    s += exp(-pow((dist - r * maxR) / w, 2.0)) * fade;",
      "  }",
      "  return dir * s * amp;",
      "}",
      "void main() {",
      "  float ca = u_res.x / u_res.y; float ia = u_img.x / u_img.y;",
      "  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);",
      "  vec2 center = clamp(u_focus, scale * 0.5, 1.0 - scale * 0.5);",
      "  vec2 uv = (v_uv - 0.5) * scale + center;",
      "  vec2 base = uv; float t = u_time;",
      // gentle swell across the puddle
      "  vec2 pd = (base - PUDDLE) / PUDDLE_R; float pdist = length(pd);",
      "  float pmask = smoothstep(1.0, 0.3, pdist);",
      "  if (pmask > 0.0) {",
      "    float wave = (sin(pdist * 28.0 - t * 1.8) * 0.0028 + sin(pdist * 52.0 - t * 2.6 + 1.2) * 0.0016 + sin(pdist * 80.0 - t * 3.9 + 2.5) * 0.0009) * pmask;",
      "    vec2 dir = pdist > 0.001 ? normalize(pd) : vec2(0.0);",
      "    dir += vec2(sin(t * 0.7) * 0.08, cos(t * 0.5) * 0.05) * pmask;",
      "    uv += dir * wave;",
      "  }",
      // droplet one: wobble always, rings grow stronger as the maze appears
      "  vec2 dd = (base - DROP1) / vec2(1.0, 1.6);",
      "  float dm = smoothstep(0.038, 0.008, length(dd));",
      "  uv += vec2(sin(t * 1.1 + 0.3) * 0.0018, sin(t * 0.8 + 1.7) * 0.0022) * dm;",
      "  uv += rings(base, DROP1, vec2(1.0, 1.6), 0.55, 3.0, 0.0, 0.18, 0.012, 0.0025 * (0.35 + 0.65 * smoothstep(0.5, 1.0, u_mix)));",
      // droplet two: always on, subtle, out of phase
      "  vec2 dd2 = (base - DROP2) / vec2(1.0, 1.4);",
      "  float dm2 = smoothstep(0.032, 0.006, length(dd2));",
      "  uv += vec2(sin(t * 0.9 + 1.8) * 0.0014, sin(t * 1.2 + 0.6) * 0.0016) * dm2;",
      "  uv += rings(base, DROP2, vec2(1.0, 1.4), 0.45, 3.2, 0.5, 0.12, 0.010, 0.0018);",
      "  vec4 a = texture2D(u_a, uv); vec4 b = texture2D(u_b, uv);",
      "  gl_FragColor = mix(a, b, u_mix);",
      "}"
    ].join("\n");

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT);
    var fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ["u_a", "u_b", "u_time", "u_mix", "u_res", "u_img", "u_focus"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    function texture(img, unit) {
      var tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    function loaded(img) {
      return img.complete && img.naturalWidth ? Promise.resolve() : new Promise(function (res) { img.addEventListener("load", res, { once: true }); });
    }

    var visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
    }

    Promise.all([loaded(imgA), loaded(imgB)]).then(function () {
      texture(imgA, 0);
      texture(imgB, 1);
      gl.uniform1i(U.u_a, 0);
      gl.uniform1i(U.u_b, 1);
      gl.uniform2f(U.u_img, imgA.naturalWidth, imgA.naturalHeight);
      glReady = true;
      hero.classList.add("gl-on");

      function frame(now) {
        requestAnimationFrame(frame);
        if (!visible) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.round(canvas.clientWidth * dpr);
        var h = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        smooth += (target - smooth) * 0.06;
        hero.style.setProperty("--mix", smooth.toFixed(4));
        var narrow = canvas.clientWidth < 896;
        gl.uniform1f(U.u_time, now * 0.001);
        gl.uniform1f(U.u_mix, smooth);
        gl.uniform2f(U.u_res, w, h);
        gl.uniform2f(U.u_focus, narrow ? 0.66 : 0.62, narrow ? 0.40 : 0.42);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      requestAnimationFrame(frame);
    });
  })();

  // ---- pie slices sweep in, and sections rise in, as they scroll into view
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".section-head, .feature, .host-stage, .pie-legend"));
  var pie = document.querySelector(".pie");
  if ("IntersectionObserver" in window) {
    reveals.forEach(function (el) { el.classList.add("reveal"); });
    if (pie) pie.classList.add("is-armed");
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        if (!it.isIntersecting) return;
        it.target.classList.add("is-in");
        io.unobserve(it.target);
      });
    }, { threshold: 0.2 });
    reveals.concat(pie ? [pie] : []).forEach(function (el) { io.observe(el); });
  }

  var stage = document.querySelector(".host-stage");
  if (!stage) return;

  var layers = Array.prototype.slice.call(stage.querySelectorAll(".layer"));
  var dots = Array.prototype.slice.call(stage.querySelectorAll(".note-dot"));
  var cards = Array.prototype.slice.call(stage.querySelectorAll(".layer-card"));
  var core = stage.querySelector(".core");
  var DATES = {
    1: "2026-09-11", 2: "2026-09-25", 3: "2026-10-09", 4: "2026-10-23",
    5: "2026-11-06", 6: "2026-11-20", 7: "2026-12-04", 8: "2026-12-18"
  };

  // An original eight-note motif in D minor, falling back to an unresolved low A.
  var FREQS = [293.66, 349.23, 440.0, 392.0, 349.23, 329.63, 293.66, 220.0];

  function byBuild(list, n) {
    return list.filter(function (el) { return el.dataset.build === String(n); });
  }

  // Keep "completed" honest as the semester moves on.
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  Object.keys(DATES).forEach(function (n) {
    var done = new Date(DATES[n] + "T00:00:00") <= today;
    byBuild(layers.concat(dots), n).forEach(function (el) {
      el.classList.toggle("is-done", done);
      el.classList.toggle("is-open", !done);
    });
  });
  if (core && layers.every(function (l) { return l.classList.contains("is-done"); })) {
    core.classList.add("is-awake");
  }

  // ---- sound
  var audio = null;
  function strike(freq) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audio) audio = new AC();
    if (audio.state === "suspended") audio.resume();
    var t = audio.currentTime;
    var out = audio.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.3, t + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    out.connect(audio.destination);
    // piano-ish: fundamental plus quieter overtones that die away first
    [[1, "triangle", 1], [2, "sine", 0.4], [3, "sine", 0.12]].forEach(function (p) {
      var osc = audio.createOscillator();
      var g = audio.createGain();
      osc.type = p[1];
      osc.frequency.value = freq * p[0];
      g.gain.setValueAtTime(p[2], t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / p[0]);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 2.3);
    });
  }

  function flash(n) {
    byBuild(layers.concat(dots), n).forEach(function (el) {
      el.classList.add("is-sounding");
      setTimeout(function () { el.classList.remove("is-sounding"); }, 420);
    });
  }

  // ---- selection
  function select(n, withSound) {
    layers.concat(dots, cards).forEach(function (el) {
      el.classList.toggle("is-selected", el.dataset.build === String(n));
    });
    dots.forEach(function (d) { d.setAttribute("aria-pressed", d.dataset.build === String(n) ? "true" : "false"); });
    if (withSound) {
      strike(FREQS[n - 1]);
      flash(n);
    }
  }

  layers.forEach(function (layer) {
    var n = Number(layer.dataset.build);
    layer.addEventListener("click", function () { select(n, true); });
    layer.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(n, true);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        var next = layers[Math.min(n, layers.length - 1)];
        next.focus();
        select(Number(next.dataset.build), true);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        var prev = layers[Math.max(n - 2, 0)];
        prev.focus();
        select(Number(prev.dataset.build), true);
      }
    });
  });

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () { select(Number(dot.dataset.build), true); });
  });

  // Start on the most recent finished layer that has a published team build.
  select(2, false);

  // ---- play all eight
  var button = stage.querySelector(".play-button");
  var playing = false;
  if (button) {
    button.addEventListener("click", function () {
      if (playing) return;
      playing = true;
      button.setAttribute("aria-pressed", "true");
      if (core) core.classList.remove("is-awake");
      var step = 560;
      for (var i = 1; i <= 8; i++) {
        (function (n) {
          setTimeout(function () { select(n, true); }, (n - 1) * step);
        })(i);
      }
      setTimeout(function () {
        if (core) core.classList.add("is-awake");
      }, 8 * step);
      setTimeout(function () {
        var allDone = layers.every(function (l) { return l.classList.contains("is-done"); });
        if (core && !allDone) core.classList.remove("is-awake");
        playing = false;
        button.setAttribute("aria-pressed", "false");
      }, 8 * step + 1600);
    });
  }
})();
