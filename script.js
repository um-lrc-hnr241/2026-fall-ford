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

  // =====================================================================
  // Full-screen reader for individual builds on member pages.
  // Tapping "Read Build N" opens the essay over the whole screen instead
  // of inside the narrow list. Without this script the <details> still
  // opens inline, so nothing is lost.
  // =====================================================================
  (function buildReader() {
    var essays = Array.prototype.slice.call(document.querySelectorAll("details.essay"));
    if (!essays.length || typeof HTMLDialogElement === "undefined") return;

    var who = (document.querySelector(".page-head h1") || {}).textContent || "";
    var dialog = document.createElement("dialog");
    dialog.className = "reader";
    dialog.setAttribute("aria-labelledby", "reader-title");
    dialog.innerHTML =
      '<div class="reader-bar">' +
      '  <p class="label reader-meta"></p>' +
      '  <button class="reader-close" type="button" aria-label="Close">&times;</button>' +
      "</div>" +
      '<article class="reader-page">' +
      '  <header class="reader-head"><h1 id="reader-title"></h1><p class="reader-sub"></p></header>' +
      '  <div class="prose reader-body"></div>' +
      '  <nav class="reader-nav" aria-label="Other builds">' +
      '    <button class="reader-prev" type="button"></button>' +
      '    <button class="reader-next" type="button"></button>' +
      "  </nav>" +
      "</article>";
    document.body.appendChild(dialog);

    var meta = dialog.querySelector(".reader-meta");
    var title = dialog.querySelector("#reader-title");
    var sub = dialog.querySelector(".reader-sub");
    var body = dialog.querySelector(".reader-body");
    var prev = dialog.querySelector(".reader-prev");
    var next = dialog.querySelector(".reader-next");
    var current = -1;

    function info(i) {
      var entry = essays[i].closest(".entry");
      return {
        date: (entry.querySelector(".label") || {}).textContent || "",
        title: (entry.querySelector("h3") || {}).textContent || "",
        sub: (entry.querySelector(".entry-title") || {}).textContent || ""
      };
    }

    function show(i) {
      current = i;
      var d = info(i);
      meta.textContent = who + " · " + d.date;
      title.textContent = d.title;
      sub.textContent = d.sub;
      sub.hidden = !d.sub;
      body.innerHTML = essays[i].querySelector(".prose").innerHTML;
      prev.hidden = i === 0;
      next.hidden = i === essays.length - 1;
      if (i > 0) prev.textContent = "← " + info(i - 1).title;
      if (i < essays.length - 1) next.textContent = info(i + 1).title + " →";
      dialog.scrollTop = 0;
    }

    function open(i) {
      show(i);
      if (!dialog.open) {
        dialog.showModal();
        document.documentElement.classList.add("reader-open");
        history.pushState({ reader: true }, "");
      }
      dialog.querySelector(".reader-close").focus();
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("reader-open");
      if (history.state && history.state.reader) history.back();
      var summary = essays[current] && essays[current].querySelector("summary");
      if (summary) summary.focus();
    });

    // phone back gesture / browser back closes the reader
    window.addEventListener("popstate", function () {
      if (dialog.open) dialog.close();
    });

    dialog.querySelector(".reader-close").addEventListener("click", close);
    prev.addEventListener("click", function () { show(current - 1); });
    next.addEventListener("click", function () { show(current + 1); });

    essays.forEach(function (d, i) {
      d.querySelector("summary").addEventListener("click", function (e) {
        e.preventDefault();
        open(i);
      });
    });
  })();

  // =====================================================================
  // The score: an original, generated soundtrack (organ, pulsing
  // arpeggio, ticking clock) in A minor. Off by default; a header button
  // turns it on, and the choice is remembered across pages. Browsers only
  // allow sound after a tap, so on later pages it resumes on first tap.
  // =====================================================================
  (function score() {
    var header = document.querySelector(".site-header .wrap");
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!header || !AC) return;

    var KEY = "ford-score";
    function pref() { try { return localStorage.getItem(KEY) === "on"; } catch (e) { return false; } }
    function save(on) { try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "score-toggle";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = '<span class="score-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="score-label">Score off</span>';
    header.appendChild(btn);
    var label = btn.querySelector(".score-label");

    var ctx = null, master = null, verb = null, timer = null, playing = false;
    var nextTime = 0, step = 0;
    var BPM = 66, BEAT = 60 / BPM;
    // A minor: Am – F – C – G, then Am – F – Dm – E (original progression)
    var CHORDS = [
      [57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62],
      [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]
    ];
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

    function impulse(seconds) {
      var len = Math.floor(ctx.sampleRate * seconds);
      var buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var c = 0; c < 2; c++) {
        var d = buf.getChannelData(c);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      return buf;
    }

    function setup() {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 5200;
      verb = ctx.createConvolver();
      verb.buffer = impulse(5.5);
      var wet = ctx.createGain(); wet.gain.value = 0.55;
      var dry = ctx.createGain(); dry.gain.value = 0.6;
      master.connect(lp);
      lp.connect(dry).connect(ctx.destination);
      lp.connect(verb).connect(wet).connect(ctx.destination);
    }

    // organ voice: drawbar-style harmonics with slow swell
    function organ(midi, t, dur, vol, attack) {
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 1.2));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      g.connect(master);
      [[1, 1], [2, 0.5], [3, 0.22], [4, 0.16], [6, 0.06], [8, 0.04]].forEach(function (h) {
        var o = ctx.createOscillator();
        var hg = ctx.createGain();
        o.type = "sine";
        o.frequency.value = hz(midi) * h[0];
        o.detune.value = (Math.random() - 0.5) * 6;
        hg.gain.value = h[1];
        o.connect(hg).connect(g);
        o.start(t);
        o.stop(t + dur + 0.05);
      });
    }

    function tick(t, vol) {
      var len = Math.floor(ctx.sampleRate * 0.03);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
      var s = ctx.createBufferSource();
      s.buffer = buf;
      var bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 6;
      var g = ctx.createGain(); g.gain.value = vol;
      s.connect(bp).connect(g).connect(master);
      s.start(t);
    }

    // one bar = 4 beats; 8 bars per cycle; layers enter as the cycles build
    function schedule() {
      while (nextTime < ctx.currentTime + 0.6) {
        var bar = Math.floor(step / 8) % 8;
        var cycle = Math.floor(step / 64);
        var sub = step % 8; // eighth notes within the bar
        var chord = CHORDS[bar];
        var t = nextTime;

        if (sub === 0) {
          // sustained chord + low pedal
          organ(chord[0] - 12, t, BEAT * 4.2, 0.05, 1.6);
          chord.forEach(function (m) { organ(m, t, BEAT * 4.2, 0.035, 1.8); });
          if (cycle >= 2) organ(chord[2] + 12, t, BEAT * 4.2, 0.02, 2.2);
        }
        if (sub % 2 === 0) tick(t, 0.05);
        if (cycle >= 1) {
          // pulsing arpeggio, rising through the chord
          var pattern = [0, 1, 2, 1, 0, 1, 2, 3];
          var idx = pattern[sub];
          var note = idx === 3 ? chord[0] + 12 : chord[idx];
          organ(note + 12, t, BEAT * 0.55, cycle >= 3 ? 0.03 : 0.022, 0.03);
        }
        nextTime += BEAT / 2;
        step++;
      }
    }

    function start() {
      if (!ctx) setup();
      ctx.resume();
      if (playing) return;
      playing = true;
      nextTime = ctx.currentTime + 0.1;
      step = 0;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 4);
      schedule();
      timer = setInterval(schedule, 120);
      btn.setAttribute("aria-pressed", "true");
      btn.classList.add("is-on");
      label.textContent = "Score on";
    }

    function stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      btn.setAttribute("aria-pressed", "false");
      btn.classList.remove("is-on");
      label.textContent = "Score off";
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (playing) { stop(); save(false); } else { start(); save(true); }
    });

    // carry the choice to the next page: resume on the first tap or key
    if (pref()) {
      label.textContent = "Score (tap to resume)";
      var resume = function (e) {
        if (e.target.closest && e.target.closest(".score-toggle")) return;
        start();
        window.removeEventListener("pointerdown", resume, true);
        window.removeEventListener("keydown", resume, true);
      };
      window.addEventListener("pointerdown", resume, true);
      window.addEventListener("keydown", resume, true);
    }
  })();

  // =====================================================================
  // The maze, in 3D (home page). Scrolling walks the camera inward toward
  // the glowing core; dragging turns the maze. Needs three.js + WebGL; if
  // either is missing the section simply stays hidden.
  // =====================================================================
  (function maze3d() {
    var section = document.querySelector(".maze-section");
    var canvas = section && section.querySelector(".maze-gl");
    if (!section || !canvas || !window.THREE) return;
    var T = window.THREE;
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
    } catch (e) { return; }
    section.classList.add("is-ready");

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x090b10, 1);

    var scene = new T.Scene();
    scene.fog = new T.Fog(0x090b10, 9, 26);
    var camera = new T.PerspectiveCamera(42, 1, 0.1, 100);

    scene.add(new T.HemisphereLight(0x8fa3c0, 0x090b10, 0.55));
    var key = new T.DirectionalLight(0xdfe4ec, 0.55);
    key.position.set(6, 12, 4);
    scene.add(key);
    var coreLight = new T.PointLight(0xf8f8f6, 2.2, 9, 2);
    coreLight.position.set(0, 0.6, 0);
    scene.add(coreLight);

    // seeded randomness so the maze is the same for everyone
    var seed = 241;
    function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

    var wallMat = new T.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.55, metalness: 0.25 });
    var edgeMat = new T.LineBasicMaterial({ color: 0xdfe4ec, transparent: true, opacity: 0.5 });
    var group = new T.Group();
    scene.add(group);

    function addMesh(geo) {
      var m = new T.Mesh(geo, wallMat);
      group.add(m);
      group.add(new T.LineSegments(new T.EdgesGeometry(geo, 30), edgeMat));
    }

    var H = 0.6, TH = 0.09, RINGS = 6;
    function arc(r, a0, a1) {
      var s = new T.Shape();
      s.absarc(0, 0, r + TH, a0, a1, false);
      s.absarc(0, 0, r - TH, a1, a0, true);
      var g = new T.ExtrudeGeometry(s, { depth: H, bevelEnabled: false, curveSegments: Math.max(8, Math.round((a1 - a0) * r * 10)) });
      g.rotateX(-Math.PI / 2);
      addMesh(g);
    }
    function radial(r0, r1, a) {
      var len = r1 - r0;
      var g = new T.BoxGeometry(len, H, TH * 2);
      g.translate(r0 + len / 2, H / 2, 0);
      g.rotateY(a); // matches the arcs, which the X-rotation mirrors
      addMesh(g);
    }

    var radii = [];
    for (var i = 0; i < RINGS; i++) radii.push(1.1 + i * 0.95);
    radii.forEach(function (r, i) {
      // one or two openings per ring, never lined up: you have to wind inward
      var gaps = i % 2 ? 2 : 1;
      var start = rand() * Math.PI * 2;
      var gapW = 0.55 / r + 0.18;
      var segs = [];
      for (var g = 0; g < gaps; g++) segs.push(start + g * (Math.PI * 2 / gaps));
      for (var k = 0; k < gaps; k++) {
        var a0 = segs[k] + gapW;
        var a1 = segs[k] + Math.PI * 2 / gaps;
        arc(r, a0, a1);
      }
      if (i < RINGS - 1) {
        var n = 2 + (i % 2);
        for (var j = 0; j < n; j++) radial(r + TH, radii[i + 1] - TH, start + Math.PI / gaps / 2 + j * (Math.PI * 2 / n) + rand() * 0.4);
      }
    });

    // floor with faint engraved circles
    var floor = new T.Mesh(new T.CircleGeometry(radii[RINGS - 1] + 1.4, 96), new T.MeshStandardMaterial({ color: 0x0d1526, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);
    for (var e = 0; e < 14; e++) {
      var rr = 0.6 + e * 0.48;
      var pts = [];
      for (var q = 0; q <= 128; q++) pts.push(new T.Vector3(Math.cos(q / 128 * Math.PI * 2) * rr, 0.005, Math.sin(q / 128 * Math.PI * 2) * rr));
      group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x2f4468, transparent: true, opacity: 0.35 })));
    }

    // the core: consciousness
    var core = new T.Mesh(new T.SphereGeometry(0.28, 32, 32), new T.MeshBasicMaterial({ color: 0xf8f8f6 }));
    core.position.y = 0.55;
    group.add(core);
    var glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 128;
    var gctx = glowCanvas.getContext("2d");
    var grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(248,248,246,0.9)");
    grad.addColorStop(0.25, "rgba(223,228,236,0.35)");
    grad.addColorStop(1, "rgba(143,163,192,0)");
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);
    var glow = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    glow.scale.set(2.4, 2.4, 1);
    glow.position.y = 0.55;
    group.add(glow);

    // drifting dust
    var dustGeo = new T.BufferGeometry();
    var dust = new Float32Array(420 * 3);
    for (var p = 0; p < 420; p++) {
      var ang = rand() * Math.PI * 2, rad = rand() * 8;
      dust[p * 3] = Math.cos(ang) * rad;
      dust[p * 3 + 1] = rand() * 5;
      dust[p * 3 + 2] = Math.sin(ang) * rad;
    }
    dustGeo.setAttribute("position", new T.BufferAttribute(dust, 3));
    var dustPts = new T.Points(dustGeo, new T.PointsMaterial({ color: 0xdfe4ec, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false }));
    scene.add(dustPts);

    // scroll → journey inward; drag → turn
    var progress = 0, smooth = 0, drag = 0, dragSmooth = 0;
    function onScroll() {
      var r = section.getBoundingClientRect();
      var span = section.offsetHeight - window.innerHeight;
      progress = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
      section.style.setProperty("--maze-p", progress.toFixed(3));
    }
    window.addEventListener("scroll", function () { requestAnimationFrame(onScroll); }, { passive: true });
    onScroll();

    var down = false, lastX = 0;
    canvas.addEventListener("pointerdown", function (e) { down = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", function (e) { if (!down) return; drag += (e.clientX - lastX) * 0.006; lastX = e.clientX; });
    canvas.addEventListener("pointerup", function () { down = false; });
    canvas.addEventListener("pointercancel", function () { down = false; });

    var visible = false;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: "100px" }).observe(section);

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w < 700 ? 55 : 42;
        camera.updateProjectionMatrix();
      }
    }

    var clock = new T.Clock();
    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      resize();
      var t = clock.getElapsedTime();
      smooth += (progress - smooth) * 0.06;
      dragSmooth += (drag - dragSmooth) * 0.12;
      var p = reduce ? 0.35 : smooth;
      var e2 = p * p * (3 - 2 * p);
      var radius = 14 - e2 * 10.6;
      var height = 12 - e2 * 9.2;
      var angle = 0.6 + e2 * Math.PI * 2.2 + dragSmooth + (reduce ? 0 : t * 0.03);
      camera.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      camera.lookAt(0, 0.35 - e2 * 0.1, 0);
      var pulse = 1 + Math.sin(t * 1.6) * 0.08;
      glow.scale.set(2.4 * pulse, 2.4 * pulse, 1);
      coreLight.intensity = 1.5 + e2 * 0.9 + Math.sin(t * 1.6) * 0.25;
      if (!reduce) dustPts.rotation.y = t * 0.02;
      renderer.render(scene, camera);
    }
    frame();
  })();

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
