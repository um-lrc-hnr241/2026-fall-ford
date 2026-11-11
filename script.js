// Team Ford · the player-piano roll.
// The page works without this file: the roll is a plain list of links.
// This adds: up-to-date "played / not yet played" status, and a "Play the roll" button
// that sweeps a playhead across the builds and sounds one piano-ish note per build.

(function () {
  document.documentElement.classList.add("js");

  var roll = document.querySelector(".roll");
  if (!roll) return;

  var notes = Array.prototype.slice.call(roll.querySelectorAll(".note"));
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  // Keep status honest as the semester moves on.
  notes.forEach(function (note) {
    if (note.dataset.status === "published") return;
    var due = new Date(note.dataset.date + "T00:00:00");
    var status = due <= today ? "played" : "unplayed";
    note.dataset.status = status;
    var label = note.querySelector(".note-status");
    if (label) label.textContent = status === "played" ? "Played" : "Not yet played";
  });

  // A pentatonic scale, low to high: the roll rises as the semester goes on.
  var FREQS = [196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 493.88];
  var audio = null;

  function ctx() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  function strike(freq, quiet) {
    var ac = ctx();
    if (!ac) return;
    var t = ac.currentTime;
    var out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(quiet ? 0.12 : 0.28, t + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    out.connect(ac.destination);
    // fundamental + a soft octave = a plucked, slightly mechanical tone
    [[1, "triangle", 1], [2, "sine", 0.35]].forEach(function (p) {
      var osc = ac.createOscillator();
      var g = ac.createGain();
      osc.type = p[1];
      osc.frequency.value = freq * p[0];
      g.gain.value = p[2];
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 1.7);
    });
  }

  function sound(note, i, quiet) {
    var playable = note.dataset.status !== "unplayed";
    if (playable) strike(FREQS[i % FREQS.length], quiet);
    note.classList.add("is-sounding");
    setTimeout(function () {
      note.classList.remove("is-sounding");
    }, 380);
  }

  // Hovering a note sounds it once the visitor has started audio with the button.
  notes.forEach(function (note, i) {
    note.addEventListener("pointerenter", function () {
      if (audio && audio.state === "running") sound(note, i, true);
    });
  });

  var button = document.querySelector(".play-button");
  var head = document.querySelector(".playhead");
  var paper = document.querySelector(".roll-paper");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var playing = false;

  if (!button) return;

  button.addEventListener("click", function () {
    if (playing) return;
    playing = true;
    button.setAttribute("aria-pressed", "true");
    var step = 520;

    notes.forEach(function (note, i) {
      setTimeout(function () {
        sound(note, i, false);
        if (head && paper && !reduce) {
          var pr = paper.getBoundingClientRect();
          var nr = note.getBoundingClientRect();
          head.style.opacity = "1";
          head.style.transform = "translateX(" + (nr.left - pr.left + nr.width / 2) + "px)";
          head.style.top = nr.top - pr.top + "px";
          head.style.height = nr.height + "px";
        }
      }, i * step);
    });

    setTimeout(function () {
      if (head) head.style.opacity = "0";
      playing = false;
      button.setAttribute("aria-pressed", "false");
    }, notes.length * step + 300);
  });
})();
