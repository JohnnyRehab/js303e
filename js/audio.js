/* Web Audio adapter — replaces the obsolete Mozilla Audio Data API.
   Exposes startAudio(synth) for js303.js. */
(function (global) {
	var context = null;
	var processor = null;
	var masterGain = null;
	var started = false;
	var masterVolume = 0.7;

	function ensureContext() {
		if (context) {
			return context;
		}
		var AC = global.AudioContext || global.webkitAudioContext;
		if (!AC) {
			return null;
		}
		context = new AC({ sampleRate: 44100 });
		return context;
	}

	function attachProcessor(synth) {
		if (processor || !context) {
			return;
		}
		var bufferSize = 2048;
		processor = context.createScriptProcessor(bufferSize, 0, 1);
		processor.onaudioprocess = function (e) {
			var out = e.outputBuffer.getChannelData(0);
			var before = +new Date();
			for (var i = 0; i < out.length; i++) {
				out[i] = synth.render();
			}
			var loadEl = document.getElementById("load");
			if (loadEl) {
				loadEl.textContent = (new Date() - before) + "ms";
			}
		};
		if (!masterGain) {
			masterGain = context.createGain();
			masterGain.gain.value = masterVolume;
			masterGain.connect(context.destination);
		}
		processor.connect(masterGain);
	}

	global.setMasterVolume = function (value) {
		var v = Number(value);
		if (isNaN(v)) {
			return;
		}
		if (v < 0) { v = 0; }
		if (v > 1) { v = 1; }
		masterVolume = v;
		if (masterGain) {
			masterGain.gain.setTargetAtTime(v, context.currentTime, 0.02);
		}
	};

	global.startAudio = function (synth) {
		if (started) {
			if (context && context.state === "suspended") {
				context.resume();
			}
			return;
		}
		if (!ensureContext()) {
			var loadEl = document.getElementById("load");
			if (loadEl) {
				loadEl.textContent = "no Web Audio";
			}
			return;
		}
		attachProcessor(synth);
		context.resume();
		started = true;
	};

	global.resumeAudio = function () {
		if (context && context.state === "suspended") {
			return context.resume();
		}
	};
})(window);
