(function () {
  function lin2exp(x, inMin, inMax, outMin, outMax) {
    var tmp = (x - inMin) / (inMax - inMin);
    return outMin * Math.exp(tmp * Math.log(outMax / outMin));
  }
  function lin2lin(x, inMin, inMax, outMin, outMax) {
    var tmp = (x - inMin) / (inMax - inMin);
    return outMin + tmp * (outMax - outMin);
  }
  function randomBool() {
    return !!Math.round(Math.random());
  }

  var PITCHES = [];
  for (var p = 52; p >= 40; p--) { PITCHES.push(p); }
  var FLAGS = ["gate", "slide", "accent", "up", "down"];
  var FLAG_LABELS = ["G", "S", "A", "U", "D"];
  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function midiToName(n) {
    return NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
  }

  function emptyStep() {
    return { pitch: 50, gate: true, slide: false, accent: false, up: false, down: false };
  }
  function randomStep() {
    var scale = [0, 2, 3, 5, 7, 8, 10, 12];
    return {
      pitch: 40 + scale[Math.round(7 * Math.random())],
      gate: randomBool(),
      slide: randomBool(),
      accent: randomBool(),
      up: randomBool(),
      down: randomBool()
    };
  }

  var patterns = [];
  var currentPattern = 0;
  for (var i = 0; i < 8; i++) {
    var steps = [];
    for (var s = 0; s < 16; s++) { steps.push(emptyStep()); }
    patterns.push(steps);
  }

  var state = {
    tempo: 120,
    tuning: 0,
    cutoff: 0.5,
    resonance: 0.5,
    envmod: 0.0,
    decay: 0.2,
    accent: 0.5,
    distortion: 0.0,
    foldback: 0.0,
    delaySteps: 3,
    delayMix: 0,
    delayFeedback: 0.5,
    waveform: 0
  };

  var synth = new TB303();
  synth.running = false;

  function pushPattern() {
    var src = patterns[currentPattern];
    var dst = [];
    for (var i = 0; i < 16; i++) {
      var st = src[i];
      dst.push([st.pitch, !!st.accent, !!st.slide, !!st.gate, !!st.down, !!st.up]);
    }
    synth.pattern = dst;
  }

  function applyParams() {
    synth.settempo(state.tempo);
    synth.tuning = state.tuning;
    synth.setcutoff(lin2exp(state.cutoff, 0, 1, 20, 20000));
    synth.setresonance(state.resonance);
    synth.setenvmod(state.envmod);
    synth.decay = lin2lin(state.decay, 0, 1, 20, 4000);
    synth.accent = state.accent;
    synth.setdistthreshold(state.distortion);
    synth.dist_shape = state.foldback;
    synth.waveform = state.waveform;
    var len = Math.round(synth.steplength * state.delaySteps);
    var max = synth.delaybuffer.length - 1;
    if (len < 64) { len = 64; }
    if (len > max) { len = max; }
    synth.delay_length = len;
    synth.delay_send = state.delayMix;
    synth.delay_feedback = state.delayFeedback;
    pushPattern();
  }

  function makeKnob(id, label, min, max, step, key) {
    var wrap = $('<div class="knob">');
    var input = $('<input type="text">').attr("id", id).val(state[key]);
    wrap.append(input).append($("<p>").text(label));
    input.knob({
      fgColor: "#fc3932",
      bgColor: "#cccccc",
      inputColor: "#000000",
      font: "Abel",
      fontWeight: "normal",
      min: min,
      max: max,
      step: step,
      width: 106,
      height: 85,
      angleOffset: -125,
      angleArc: 250,
      change: function (v) {
        state[key] = Number(v);
        applyParams();
      }
    });
    return wrap;
  }

  function renderKnobs() {
    $("#knobs-main")
      .empty()
      .append(makeKnob("k-tempo", "Tempo", 60, 240, 1, "tempo"))
      .append(makeKnob("k-tuning", "Tuning", -12, 12, 1, "tuning"))
      .append(makeKnob("k-cutoff", "Cutoff", 0, 1, 0.01, "cutoff"))
      .append(makeKnob("k-res", "Resonance", 0, 1, 0.01, "resonance"))
      .append(makeKnob("k-env", "Env.mod", 0, 1, 0.01, "envmod"))
      .append(makeKnob("k-dec", "Decay", 0, 1, 0.01, "decay"))
      .append(makeKnob("k-acc", "Accent", 0, 1, 0.01, "accent"));

    var fx = $("#knobs-fx").empty();
    fx.append(makeKnob("k-dist", "Distortion", 0, 1, 0.01, "distortion"));
    fx.append(makeKnob("k-fold", "Foldback", 0, 1, 0.01, "foldback"));
    fx.append(makeKnob("k-dsteps", "Delay steps", 1, 8, 1, "delaySteps"));
    fx.append(makeKnob("k-dmix", "Delay mix", 0, 1, 0.01, "delayMix"));
    fx.append(makeKnob("k-dfb", "Delay feedback", 0, 1, 0.01, "delayFeedback"));

    var wave = $('<div class="waveform"><p>Waveform</p></div>');
    var saw = $('<button type="button" class="waveform-button" data-w="0">Saw</button>');
    var sqr = $('<button type="button" class="waveform-button" data-w="1">Square</button>');
    function paintWave() {
      saw.toggleClass("grey", state.waveform !== 0);
      sqr.toggleClass("grey", state.waveform !== 1);
    }
    saw.add(sqr).on("click", function () {
      state.waveform = Number($(this).attr("data-w"));
      paintWave();
      applyParams();
    });
    paintWave();
    wave.append(saw, sqr);
    fx.append(wave);
  }

  function renderGrid() {
    var grid = $("#grid").empty();
    var names = $('<div class="step-column note-names">');
    PITCHES.forEach(function (pitch) {
      names.append($('<div class="pitch-label note-name">').text(midiToName(pitch)));
    });
    names.append($('<div class="pitch-label">'));
    FLAG_LABELS.forEach(function () {
      names.append($('<div class="pitch-label">'));
    });
    grid.append(names);

    var lab = $('<div class="step-column labels">');
    PITCHES.forEach(function (pitch) {
      lab.append($('<div class="pitch-label">').text(pitch));
    });
    lab.append($('<div class="pitch-label">'));
    FLAG_LABELS.forEach(function (t) {
      lab.append($('<div class="pitch-label">').text(t));
    });
    grid.append(lab);

    var steps = patterns[currentPattern];
    for (var c = 0; c < 16; c++) {
      (function (col) {
        var colEl = $('<div class="step-column">').toggleClass("highlight", col % 4 === 0);
        colEl.attr("data-col", col);
        PITCHES.forEach(function (pitch) {
          var btn = $('<button type="button" class="pitch-button">');
          btn.toggleClass("on", steps[col].pitch === pitch);
          btn.on("mousedown", function () {
            steps[col].pitch = pitch;
            pushPattern();
            renderGrid();
          });
          colEl.append(btn);
        });
        colEl.append($('<div class="step-label">').text(col + 1));
        FLAGS.forEach(function (flag) {
          var t = $('<button type="button" class="toggle-button">');
          t.toggleClass("on", !!steps[col][flag]);
          t.on("click", function () {
            steps[col][flag] = !steps[col][flag];
            pushPattern();
            renderGrid();
          });
          colEl.append(t);
        });
        grid.append(colEl);
      })(c);
    }

    var side = $('<div class="side">');
    var prow = $('<div class="pattern-row">');
    for (var n = 0; n < 8; n++) {
      (function (idx) {
        var b = $('<button type="button" class="pattern-button">').text(idx + 1);
        b.toggleClass("on", idx === currentPattern);
        b.on("click", function () {
          currentPattern = idx;
          pushPattern();
          renderGrid();
        });
        prow.append(b);
      })(n);
    }
    side.append(prow);
    side.append($('<button type="button" class="button" id="randomize">Randomize</button>'));
    side.append($('<button type="button" class="button" id="clear">Clear</button>'));
    side.append($('<br>'));
    side.append($('<button type="button" class="button" id="start">Start</button>'));
    side.append($('<button type="button" class="button" id="stop">Stop</button>'));
    side.append($('<p class="nav"><a href="index.html">Panel UI</a></p>'));
    grid.append(side);

    $("#randomize").on("click", function () {
      for (var i = 0; i < 16; i++) { patterns[currentPattern][i] = randomStep(); }
      pushPattern();
      renderGrid();
    });
    $("#clear").on("click", function () {
      for (var i = 0; i < 16; i++) { patterns[currentPattern][i] = emptyStep(); }
      pushPattern();
      renderGrid();
    });
    $("#start").on("click", function () {
      applyParams();
      if (typeof startAudio === "function") { startAudio(synth); }
      if (typeof resumeAudio === "function") { resumeAudio(); }
      synth.reset();
      synth.running = true;
    });
    $("#stop").on("click", function () {
      synth.running = false;
      $(".step-column").removeClass("playing");
    });
  }

  var lastPos = -1;
  function tickPlayhead() {
    if (synth.running && synth.pos !== lastPos) {
      lastPos = synth.pos;
      $(".step-column").removeClass("playing");
      $('.step-column[data-col="' + synth.pos + '"]').addClass("playing");
    }
    requestAnimationFrame(tickPlayhead);
  }

  $(function () {
    loadwavetable("data/wavetable.png", function () {});
    setTimeout(function () {
      if (typeof wavetable === "undefined" || !wavetable) {
        if (typeof genwavetable === "function") { genwavetable(); }
      }
    }, 2500);
    applyParams();
    renderKnobs();
    renderGrid();
    tickPlayhead();
  });
})();
