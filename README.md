# js303 (static)

Static rebuild of [thedjinn/js303](https://github.com/thedjinn/js303) — a TB-303 clone in JavaScript.

No Ruby, Bundler, Thin, CoffeeScript, or Bower. Open `index.html` through a local HTTP server.

## Run

```bash
cd js303-static
python3 -m http.server 8080
```

Then open http://localhost:8080/

`file://` may fail to load `data/wavetable.png` (canvas / CORS). Use a local server.

## Layout

```
index.html
style.css
js/jquery.ui.dial.js   original
js/synth.js            original
js/js303.js            original + small audio / path patch
js/audio.js            new Web Audio adapter
images/                original panel / dial / sprites
data/wavetable.png     original wavetable
```

## What changed

- Permalink / `POST /store` removed
- Mozilla Audio Data API (`mozWriteAudio`) replaced by Web Audio `ScriptProcessorNode` in `audio.js`
- Wavetable path is `data/wavetable.png` (falls back to `genwavetable()` if the PNG does not load)
- Synth starts stopped; press **Run** (browser autoplay policy)

## License

Original work Copyright (C) 2014 Emil Loer, GNU GPL v3.
