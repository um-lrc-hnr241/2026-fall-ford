// Team Ford · the nested host.
// Without this file the page still works: every build card is listed and every link works.
// With it: layers light up by due date, clicking a layer or a note sounds that note and
// opens its build card, and "Play the eight notes" plays them outermost to innermost.

(function () {
  document.documentElement.classList.add("js");

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
