// Team Ford · the nested host.
// Without this file the page still works: every build card is listed and every link works.
// With it: layers light up by due date, clicking a layer or a note sounds that note and
// opens its build card, and "Play the eight notes" plays them outermost to innermost.

(function () {
  document.documentElement.classList.add("js");

  // =====================================================================
  // Boot-up intro (home page, first visit per session). A black gate:
  // "Enter the park" (with sound) or "Enter silently". Then the lines
  // decode out of scrambled glyphs, TEAM FORD slams in on a low brass hit,
  // and two lids part like eyes opening onto the site. The music is an
  // original cue in a big cinematic style: riser, driving ostinato, BRAAM.
  // Skip, Esc or a tap on Skip ends it at once.
  // =====================================================================
  (function bootIntro() {
    var root = document.documentElement;
    if (!root.classList.contains("intro-pending")) return;
    try { sessionStorage.setItem("ford-booted", "1"); } catch (e) {}

    var done = 0, today = new Date();
    ["2026-09-11", "2026-09-25", "2026-10-09", "2026-10-23", "2026-11-06", "2026-11-20", "2026-12-04", "2026-12-18"]
      .forEach(function (d) { if (new Date(d + "T00:00:00") <= today) done++; });

    var boot = document.createElement("div");
    boot.className = "boot";
    boot.setAttribute("role", "dialog");
    boot.setAttribute("aria-label", "Intro");
    boot.innerHTML =
      '<div class="boot-lid boot-lid-top"></div><div class="boot-lid boot-lid-bottom"></div>' +
      '<div class="boot-flash" aria-hidden="true"></div>' +
      '<div class="boot-gate">' +
      '  <p class="boot-kicker">Team Ford · HNR 241</p>' +
      '  <button class="boot-enter" type="button"><span>Enter the park</span></button>' +
      '  <button class="boot-silent" type="button">Enter silently</button>' +
      '  <p class="boot-note">Best with sound on</p>' +
      "</div>" +
      '<div class="boot-stage" aria-live="polite">' +
      '  <p class="boot-line boot-line-lead"></p>' +
      '  <div class="boot-readout"></div>' +
      '  <h2 class="boot-title" aria-label="Team Ford"></h2>' +
      "</div>" +
      '<button class="boot-skip" type="button">Skip</button>';
    document.body.appendChild(boot);
    root.classList.add("waking");
    root.classList.remove("intro-pending");

    var stage = boot.querySelector(".boot-stage");
    var timers = [];
    var finished = false;
    var music = null;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    // ---------------------------------------------------------- text effects
    var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·:#*+";
    function decode(el, text, ms) {
      el.classList.add("is-in");
      var start = performance.now();
      (function frame(now) {
        var p = Math.min((now - start) / ms, 1);
        var solved = Math.floor(p * text.length);
        var out = text.slice(0, solved);
        for (var i = solved; i < text.length; i++) {
          out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1 && !finished) requestAnimationFrame(frame);
        else el.textContent = text;
      })(start);
    }
    function rise(el, text) {
      el.innerHTML = "";
      text.split("").forEach(function (ch, i) {
        var s = document.createElement("span");
        s.textContent = ch === " " ? " " : ch;
        s.style.setProperty("--d", i * 32 + "ms");
        el.appendChild(s);
      });
      el.classList.add("is-in");
    }
    function slam(el, text) {
      el.innerHTML = "";
      text.split("").forEach(function (ch, i) {
        var s = document.createElement("span");
        s.textContent = ch === " " ? " " : ch;
        s.style.setProperty("--d", Math.abs(i - (text.length - 1) / 2) * 40 + "ms");
        el.appendChild(s);
      });
      el.classList.add("is-in");
    }

    // ---------------------------------------------------------- the cue
    function cue() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      var ctx = new AC();
      var t0 = ctx.currentTime + 0.05;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      var master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp).connect(ctx.destination);
      var verb = ctx.createConvolver();
      var len = ctx.sampleRate * 4.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var c = 0; c < 2; c++) {
        var d = ir.getChannelData(c);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
      verb.buffer = ir;
      var wet = ctx.createGain(); wet.gain.value = 0.45;
      verb.connect(wet).connect(master);
      function out(node) { node.connect(master); node.connect(verb); }

      function noise(sec) {
        var b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
        var dd = b.getChannelData(0);
        for (var k = 0; k < dd.length; k++) dd[k] = Math.random() * 2 - 1;
        var s = ctx.createBufferSource(); s.buffer = b; return s;
      }

      var HIT = 5.1; // seconds after start: the slam

      // riser: filtered noise sweeping up, swelling
      var rn = noise(HIT + 0.2), bp = ctx.createBiquadFilter(), rg = ctx.createGain();
      bp.type = "bandpass"; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(180, t0);
      bp.frequency.exponentialRampToValueAtTime(7000, t0 + HIT);
      rg.gain.setValueAtTime(0.0001, t0);
      rg.gain.exponentialRampToValueAtTime(0.22, t0 + HIT - 0.05);
      rg.gain.linearRampToValueAtTime(0, t0 + HIT + 0.05);
      rn.connect(bp).connect(rg); out(rg);
      rn.start(t0); rn.stop(t0 + HIT + 0.2);

      // rising strings: three saws climbing an octave
      [110, 164.81, 220].forEach(function (f) {
        var o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(f, t0);
        o.frequency.exponentialRampToValueAtTime(f * 2, t0 + HIT);
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(300, t0);
        lp.frequency.exponentialRampToValueAtTime(3200, t0 + HIT);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.05, t0 + HIT - 0.1);
        g.gain.linearRampToValueAtTime(0, t0 + HIT + 0.05);
        o.connect(lp).connect(g); out(g);
        o.start(t0); o.stop(t0 + HIT + 0.2);
      });

      // driving ostinato: sixteenth notes on low A, getting louder
      var step = 60 / 132 / 4;
      for (var n = 0, t = t0 + 0.4; t < t0 + HIT - 0.05; n++, t += step) {
        var o2 = ctx.createOscillator(), f2 = ctx.createBiquadFilter(), g2 = ctx.createGain();
        o2.type = "sawtooth";
        o2.frequency.value = n % 4 === 3 ? 82.41 : 55; // A1, with E2 on the off-beat
        f2.type = "lowpass";
        f2.frequency.value = 420 + (t - t0) * 260;
        var v = 0.04 + ((t - t0) / HIT) * 0.16;
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(v, t + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.9);
        o2.connect(f2).connect(g2); g2.connect(master);
        o2.start(t); o2.stop(t + step);
      }

      // drum hits on the beat for the last stretch
      for (var b2 = 0, tb = t0 + 2.6; tb < t0 + HIT - 0.1; b2++, tb += 60 / 132) {
        var k2 = ctx.createOscillator(), kg = ctx.createGain();
        k2.frequency.setValueAtTime(110, tb);
        k2.frequency.exponentialRampToValueAtTime(42, tb + 0.35);
        kg.gain.setValueAtTime(0.5, tb);
        kg.gain.exponentialRampToValueAtTime(0.0001, tb + 0.5);
        k2.connect(kg); out(kg);
        k2.start(tb); k2.stop(tb + 0.55);
      }

      // the BRAAM: detuned brass-like saws, driven, filter blooming open
      var th = t0 + HIT;
      var shaper = ctx.createWaveShaper(), curve = new Float32Array(1024);
      for (var q = 0; q < 1024; q++) { var xx = q / 512 - 1; curve[q] = Math.tanh(xx * 3.2); }
      shaper.curve = curve;
      var bl = ctx.createBiquadFilter(), bg = ctx.createGain();
      bl.type = "lowpass";
      bl.frequency.setValueAtTime(250, th);
      bl.frequency.exponentialRampToValueAtTime(2400, th + 0.18);
      bl.frequency.exponentialRampToValueAtTime(500, th + 4);
      bg.gain.setValueAtTime(0.0001, th);
      bg.gain.exponentialRampToValueAtTime(0.34, th + 0.06);
      bg.gain.exponentialRampToValueAtTime(0.0001, th + 6);
      shaper.connect(bl).connect(bg); out(bg);
      [55, 82.41, 110, 130.81].forEach(function (f) {
        [-9, 9].forEach(function (cents) {
          var o3 = ctx.createOscillator();
          o3.type = "sawtooth"; o3.frequency.value = f; o3.detune.value = cents;
          var og = ctx.createGain(); og.gain.value = 0.25;
          o3.connect(og).connect(shaper);
          o3.start(th); o3.stop(th + 6.2);
        });
      });
      // sub boom under it
      var sub = ctx.createOscillator(), sg = ctx.createGain();
      sub.frequency.setValueAtTime(62, th);
      sub.frequency.exponentialRampToValueAtTime(30, th + 2.5);
      sg.gain.setValueAtTime(0.7, th);
      sg.gain.exponentialRampToValueAtTime(0.0001, th + 3.5);
      sub.connect(sg).connect(master);
      sub.start(th); sub.stop(th + 3.6);

      return {
        stop: function () {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
          master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
          setTimeout(function () { ctx.close(); }, 900);
        },
        close: function () { setTimeout(function () { ctx.close(); }, 7000); }
      };
    }

    // ---------------------------------------------------------- sequence
    function run(withSound) {
      boot.classList.add("is-running");
      if (withSound) music = cue();
      var lead = stage.querySelector(".boot-line-lead");
      var readout = stage.querySelector(".boot-readout");
      var lines = [
        "Host · Team Ford · HNR 241 · Fall 2026",
        "Cognition · 6 hosts responding",
        "Builds loaded · " + done + " of 8",
        "Reveries · present"
      ];
      later(function () { rise(lead, "Bringing yourself back online."); }, 350);
      lines.forEach(function (text, i) {
        later(function () {
          var p = document.createElement("p");
          p.className = "boot-line";
          readout.appendChild(p);
          decode(p, text, 520);
        }, 1900 + i * 620);
      });
      later(function () { stage.classList.add("is-clearing"); }, 4650);
      later(function () {
        stage.classList.add("is-title");
        boot.classList.add("is-hit");
        slam(stage.querySelector(".boot-title"), "TEAM FORD");
      }, 5100);
      later(open, 6900);
    }

    function open() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      boot.classList.add("is-opening");
      root.classList.remove("waking");
      window.removeEventListener("keydown", onKey, true);
      if (music) music.close();
      setTimeout(function () { boot.remove(); }, 1400);
    }

    function skip() {
      if (music) { music.stop(); music = null; }
      open();
    }

    function onKey(e) {
      if (e.key === "Escape") { skip(); return; }
      if (!boot.classList.contains("is-running") && e.key === "Enter") { e.preventDefault(); run(true); }
    }

    boot.querySelector(".boot-enter").addEventListener("click", function () { run(true); });
    boot.querySelector(".boot-silent").addEventListener("click", function () { run(false); });
    boot.querySelector(".boot-skip").addEventListener("click", skip);
    window.addEventListener("keydown", onKey, true);
    boot.querySelector(".boot-enter").focus();
  })();

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
  // Dolores dissolves (home page). The reflection photo is rebuilt from
  // thousands of particles. Scrolling shatters it into a drifting cloud,
  // gathers the cloud into the maze, then into TEAM FORD. Each particle
  // keeps its colour from the photo and brightens as it travels.
  // Needs three.js + WebGL; otherwise the section stays hidden.
  // =====================================================================
  (function doloresDissolve() {
    var section = document.querySelector(".dissolve-section");
    var canvas = section && section.querySelector(".dissolve-gl");
    if (!section || !canvas || !window.THREE) return;
    var T = window.THREE;
    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: "high-performance" }); } catch (e) { return; }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var small = window.innerWidth < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x090b10, 1);
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    var COLS = small ? 150 : 230, ROWS = Math.round(COLS / 1.5);
    var N = COLS * ROWS;
    var W = 6.6, H = W / 1.5;

    // seeded random so everyone sees the same shapes
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

    // ---- shape B: an original concentric maze glyph, as points along its lines
    function mazePoints(n) {
      var segs = [];
      var rings = [0.45, 0.85, 1.25, 1.65, 2.05];
      rings.forEach(function (r, i) {
        var gap = 0.5 / r + 0.15, start = i * 2.3 + 0.6;
        segs.push({ type: "arc", r: r, a0: start + gap, a1: start + Math.PI * 2 - 0.05, len: r * (Math.PI * 2 - gap) });
        if (i < rings.length - 1) {
          for (var k = 0; k < 2 + (i % 2); k++) {
            var a = start + 1.1 + k * 2.4;
            segs.push({ type: "line", a: a, r0: r, r1: rings[i + 1], len: rings[i + 1] - r });
          }
        }
      });
      var total = segs.reduce(function (s, g) { return s + g.len; }, 0);
      var out = new Float32Array(n * 3);
      for (var p = 0; p < n; p++) {
        var pick = rnd() * total, g = segs[0];
        for (var s = 0; s < segs.length; s++) { pick -= segs[s].len; if (pick <= 0) { g = segs[s]; break; } }
        var x, y, j = (rnd() - 0.5) * 0.035;
        if (g.type === "arc") {
          var ang = g.a0 + rnd() * (g.a1 - g.a0);
          x = Math.cos(ang) * (g.r + j); y = Math.sin(ang) * (g.r + j);
        } else {
          var rr = g.r0 + rnd() * (g.r1 - g.r0);
          x = Math.cos(g.a) * rr + j; y = Math.sin(g.a) * rr + j;
        }
        out[p * 3] = x; out[p * 3 + 1] = y; out[p * 3 + 2] = (rnd() - 0.5) * 0.08;
      }
      return out;
    }

    // ---- shape C: TEAM FORD, sampled from text drawn on a canvas
    function textPoints(n) {
      var c = document.createElement("canvas");
      c.width = 1200; c.height = 260;
      var x = c.getContext("2d");
      x.fillStyle = "#fff";
      x.font = "400 190px 'Times New Roman', Times, serif";
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText("TEAM FORD", 600, 138);
      var d = x.getImageData(0, 0, c.width, c.height).data;
      var hits = [];
      for (var yy = 0; yy < c.height; yy += 2) for (var xx = 0; xx < c.width; xx += 2) if (d[(yy * c.width + xx) * 4 + 3] > 128) hits.push(xx, yy);
      var out = new Float32Array(n * 3), sc = (small ? 4.6 : 6.4) / c.width;
      for (var p = 0; p < n; p++) {
        var h = ((rnd() * hits.length / 2) | 0) * 2;
        out[p * 3] = (hits[h] - c.width / 2 + rnd() * 2) * sc;
        out[p * 3 + 1] = -(hits[h + 1] - c.height / 2 + rnd() * 2) * sc;
        out[p * 3 + 2] = (rnd() - 0.5) * 0.05;
      }
      return out;
    }

    var img = new Image();
    img.src = "images/dolores-maze.jpg";
    img.decode().then(build).catch(function () {});

    var uniforms, points;

    function build() {
      // shape A: the photo, one particle per sampled pixel
      var c = document.createElement("canvas");
      c.width = COLS; c.height = ROWS;
      var x = c.getContext("2d");
      x.drawImage(img, 0, 0, COLS, ROWS);
      var px = x.getImageData(0, 0, COLS, ROWS).data;

      var posA = new Float32Array(N * 3), color = new Float32Array(N * 3), rand = new Float32Array(N * 4);
      for (var j = 0; j < ROWS; j++) {
        for (var i = 0; i < COLS; i++) {
          var k = j * COLS + i;
          posA[k * 3] = (i / (COLS - 1) - 0.5) * W;
          posA[k * 3 + 1] = (0.5 - j / (ROWS - 1)) * H;
          posA[k * 3 + 2] = 0;
          // a cool, muted grade to sit in the site's navy palette
          var r = px[k * 4] / 255, g = px[k * 4 + 1] / 255, b = px[k * 4 + 2] / 255;
          var l = r * 0.3 + g * 0.59 + b * 0.11;
          color[k * 3] = l * 0.55 + r * 0.45;
          color[k * 3 + 1] = l * 0.55 + g * 0.45;
          color[k * 3 + 2] = Math.min(1, l * 0.55 + b * 0.45 + 0.04);
          rand[k * 4] = rnd(); rand[k * 4 + 1] = rnd(); rand[k * 4 + 2] = rnd(); rand[k * 4 + 3] = rnd();
        }
      }

      var geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(posA, 3));
      geo.setAttribute("posB", new T.BufferAttribute(mazePoints(N), 3));
      geo.setAttribute("posC", new T.BufferAttribute(textPoints(N), 3));
      geo.setAttribute("color", new T.BufferAttribute(color, 3));
      geo.setAttribute("rand", new T.BufferAttribute(rand, 4));

      uniforms = {
        uP: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 4.3 * renderer.getPixelRatio() },
        uScale: { value: 1 }
      };

      var mat = new T.ShaderMaterial({
        uniforms: uniforms,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        vertexShader: [
          "attribute vec3 posB; attribute vec3 posC; attribute vec4 rand; attribute vec3 color;",
          "uniform float uP; uniform float uTime; uniform float uSize; uniform float uScale;",
          "varying vec3 vColor; varying float vGlow; varying float vAlpha;",
          "float ease(float t){ return t*t*(3.0-2.0*t); }",
          "float seg(float p, float a, float b, float jitter){ return ease(clamp((p - a - jitter) / (b - a), 0.0, 1.0)); }",
          "void main(){",
          "  float j = rand.x * 0.08;",
          // 0 photo | 0.12-0.40 shatter | 0.40-0.58 gather into maze | 0.72-0.92 become TEAM FORD
          "  float shatter = seg(uP, 0.10, 0.38, j);",
          "  float toMaze  = seg(uP, 0.38, 0.58, j);",
          "  float toText  = seg(uP, 0.72, 0.92, j);",
          "  vec3 p = position;",
          "  p = mix(p, posB, toMaze);",
          "  p = mix(p, posC, toText);",
          // the cloud: each particle flies along its own path, peaking between shapes
          "  float cloud = shatter * (1.0 - toMaze) + 0.55 * sin(3.14159 * toText);",
          "  vec3 dir = normalize(vec3(rand.y - 0.5, rand.z - 0.5, rand.w - 0.35) + 0.0001);",
          "  float t = uTime * (0.25 + rand.w * 0.35) + rand.x * 6.2831;",
          "  vec3 swirl = vec3(sin(t + p.y * 0.8), cos(t * 0.9 + p.x * 0.7), sin(t * 0.7 + rand.y * 6.0)) * 0.6;",
          "  p += (dir * (2.2 + rand.x * 3.2) + swirl) * cloud;",
          // shapes breathe gently once formed
          "  p += vec3(sin(uTime * 0.6 + rand.y * 6.28), cos(uTime * 0.5 + rand.z * 6.28), 0.0) * 0.012 * (toMaze + toText);",
          "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
          "  gl_Position = projectionMatrix * mv;",
          "  float glow = max(cloud, max(toMaze * (1.0 - toText) , toText));",
          "  gl_PointSize = uSize * uScale * mix(1.0, 0.55 + rand.z * 0.7, glow) * (9.0 / -mv.z);",
          "  vGlow = glow;",
          "  vColor = mix(color, vec3(0.86, 0.9, 0.97), clamp(glow * 1.1, 0.0, 1.0));",
          "  vAlpha = mix(0.8, 0.85, glow);",
          "}"
        ].join("\n"),
        fragmentShader: [
          "varying vec3 vColor; varying float vGlow; varying float vAlpha;",
          "void main(){",
          "  vec2 c = gl_PointCoord - 0.5; float d = length(c);",
          "  if (d > 0.5) discard;",
          "  float soft = smoothstep(0.5, mix(0.42, 0.05, vGlow), d);",
          "  gl_FragColor = vec4(vColor * mix(0.95, 1.05, vGlow), soft * vAlpha);",
          "}"
        ].join("\n")
      });

      points = new T.Points(geo, mat);
      scene.add(points);
      section.classList.add("is-ready");
      onScroll();
    }

    // ---- scroll, pointer, render
    var progress = 0, smooth = 0, mx = 0, my = 0, tx = 0, ty = 0;
    function onScroll() {
      var r = section.getBoundingClientRect();
      var span = section.offsetHeight - window.innerHeight;
      progress = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
      section.style.setProperty("--dp", progress.toFixed(3));
    }
    window.addEventListener("scroll", function () { requestAnimationFrame(onScroll); }, { passive: true });
    section.addEventListener("pointermove", function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    var visible = false;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: "150px" }).observe(section);

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight, pr = renderer.getPixelRatio();
      if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // fit the photo's width on narrow screens
        var fitZ = (W / 2) / Math.tan((camera.fov * Math.PI / 180) / 2) / camera.aspect * 1.08;
        // on narrow screens crop the photo's sides a little rather than shrinking it to a strip
        camera.position.z = Math.max(9, fitZ * 0.72);
        camera.updateProjectionMatrix();
      }
    }

    var clock = new T.Clock();
    (function frame() {
      requestAnimationFrame(frame);
      if (!visible || !uniforms) return;
      resize();
      smooth += (progress - smooth) * (reduce ? 0.2 : 0.06);
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      uniforms.uP.value = smooth;
      uniforms.uTime.value = reduce ? 0 : clock.getElapsedTime();
      var spin = smooth > 0.45 && smooth < 0.8 ? (smooth - 0.45) * 2.2 : smooth >= 0.8 ? 0.77 * (1 - Math.min((smooth - 0.8) / 0.12, 1)) : 0;
      points.rotation.set(my * 0.12, mx * 0.18, -spin * 0.6);
      renderer.render(scene, camera);
    })();
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
