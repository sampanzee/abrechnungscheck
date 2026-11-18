// Fotoerkennung der Gehaltsmitteilung im Browser: Bild aufbereiten, mit Tesseract lesen, Posten zuordnen (AbrOCR).
(function (root) {
  "use strict";
  const TESS_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  let loading = null, worker = null;
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Texterkennung konnte nicht geladen werden. Beim ersten Mal ist eine Internetverbindung nötig.")); document.head.appendChild(s); });
  }
  async function getWorker(onStatus) {
    if (worker) return worker;
    if (!root.Tesseract) { loading = loading || loadScript(TESS_URL); await loading; }
    onStatus && onStatus("Texterkennung wird vorbereitet …");
    worker = await root.Tesseract.createWorker("deu", 1, {
      langPath: new URL("./", location.href).href, gzip: false, cacheMethod: "none",
      logger: m => { if (onStatus && m.status === "recognizing text") onStatus(`Text wird gelesen … ${Math.round(m.progress * 100)} %`); }
    });
    await worker.setParameters({ tessedit_pageseg_mode: "4", preserve_interword_spaces: "1" });
    return worker;
  }
  // Bildaufbereitung: leicht weichzeichnen (Rasterpunkte der grauen Spalte verschmelzen), Hintergrund per Schließen
  // (Max-, dann Min-Filter) schätzen und herausdividieren, Kontrast strecken, dann linke und rechte Hälfte doppelt so groß.
  function blur1D(src, dst, w, h, k, horiz) {
    const r = (k.length - 1) / 2;
    if (horiz) for (let y = 0; y < h; y++) { const o = y * w; for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) { const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i; s += src[o + xx] * k[i + r]; } dst[o + x] = s; } }
    else for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) { const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i; s += src[yy * w + x] * k[i + r]; } dst[y * w + x] = s; }
  }
  // gleitendes Maximum/Minimum einer Zeile/Spalte (van Herk/Gil-Werman), Fenster 2r+1
  function extreme1D(src, dst, w, h, r, horiz, isMax) {
    const n = horiz ? w : h, m = horiz ? h : w, k = 2 * r + 1, f = isMax ? Math.max : Math.min, pad = isMax ? -Infinity : Infinity;
    const len = n + 2 * r, g = new Float32Array(len), hh = new Float32Array(len), line = new Float32Array(len);
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < len; i++) { const ii = i - r; line[i] = ii < 0 || ii >= n ? pad : src[horiz ? j * w + ii : ii * w + j]; }
      for (let i = 0; i < len; i++) g[i] = i % k === 0 ? line[i] : f(g[i - 1], line[i]);
      for (let i = len - 1; i >= 0; i--) hh[i] = (i % k === k - 1 || i === len - 1) ? line[i] : f(hh[i + 1], line[i]);
      for (let i = 0; i < n; i++) { const v = f(hh[i], g[i + 2 * r]); if (horiz) dst[j * w + i] = v; else dst[i * w + j] = v; }
    }
  }
  function boxBlur(a, w, h, r) {
    const t = new Float32Array(w * h), out = new Float32Array(w * h), k = 2 * r + 1;
    for (let y = 0; y < h; y++) { const o = y * w; let s = 0; for (let i = -r; i <= r; i++) s += a[o + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) { t[o + x] = s / k; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += t[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = s / k; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
    return out;
  }
  async function scaled(file, W) {
    try { const b = await createImageBitmap(file, { imageOrientation: "from-image" }); const H = Math.round(b.height * W / b.width);
      try { return await createImageBitmap(file, { imageOrientation: "from-image", resizeWidth: W, resizeHeight: H, resizeQuality: "high" }); } catch (e) {}
      // schrittweise halbieren, damit beim Verkleinern nichts verloren geht
      let c = document.createElement("canvas"), cw = b.width, ch = b.height; c.width = cw; c.height = ch; c.getContext("2d").drawImage(b, 0, 0);
      while (cw / 2 > W) { const n = document.createElement("canvas"); n.width = Math.round(cw / 2); n.height = Math.round(ch / 2); const x = n.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, n.width, n.height); c = n; cw = n.width; ch = n.height; }
      const o = document.createElement("canvas"); o.width = W; o.height = H; const ox = o.getContext("2d"); ox.imageSmoothingQuality = "high"; ox.drawImage(c, 0, 0, W, H); return o;
    } catch (e) { throw new Error("Das Foto ließ sich nicht öffnen."); }
  }
  async function prepare(file, opt) {
    opt = Object.assign({ sigma: 1, k: 21, lo: 40, hi: 230 }, opt || {});
    const W = 1600, src = await scaled(file, W), H = src.height;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(src, 0, 0, W, H);
    const img = x.getImageData(0, 0, W, H), px = img.data, N = W * H;
    const g = new Float32Array(N);
    for (let i = 0; i < N; i++) g[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    const R = Math.ceil(opt.sigma * 3), ker = []; let ks = 0;
    for (let i = -R; i <= R; i++) { const v = Math.exp(-i * i / (2 * opt.sigma * opt.sigma)); ker.push(v); ks += v; }
    const kn = ker.map(v => v / ks), t1 = new Float32Array(N), b = new Float32Array(N);
    blur1D(g, t1, W, H, kn, true); blur1D(t1, b, W, H, kn, false);
    const r = (opt.k - 1) / 2, m1 = new Float32Array(N), m2 = new Float32Array(N);
    extreme1D(b, m1, W, H, r, true, true); extreme1D(m1, m2, W, H, r, false, true);
    extreme1D(m2, m1, W, H, r, true, false); extreme1D(m1, m2, W, H, r, false, false);
    const bg = boxBlur(m2, W, H, Math.floor(opt.k / 2));
    for (let i = 0; i < N; i++) {
      const a = b[i] / (bg[i] + 1) * 255, v = Math.max(0, Math.min(255, (a - opt.lo) / (opt.hi - opt.lo) * 255));
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const half = (from, to) => { const w = Math.round(W * (to - from)); const o = document.createElement("canvas"); o.width = w * 2; o.height = H * 2; const ox = o.getContext("2d"); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = "high"; ox.drawImage(c, Math.round(W * from), 0, w, H, 0, 0, w * 2, H * 2); return o; };
    return { left: half(0, 0.52), right: half(0.48, 1) };
  }
  function wordsOf(data) {
    let ws = data.words;
    if (!ws || !ws.length) { ws = []; (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => (l.words || []).forEach(w => ws.push(w))))); }
    return [{ words: ws.map(w => ({ text: w.text, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1 })) }];
  }
  // Bis zu drei Durchgänge mit leicht unterschiedlicher Aufbereitung; Schluss, sobald alle Werte bestätigt sind.
  const PASSES = [{}, { lo: 60 }, { sigma: 0.8, lo: 30 }];
  async function readPayslip(file, onStatus) {
    const w = await getWorker(onStatus), results = [];
    let res = null;
    for (let i = 0; i < PASSES.length; i++) {
      const tag = PASSES.length > 1 ? ` (Durchgang ${i + 1})` : "";
      onStatus && onStatus("Foto wird aufbereitet …" + tag);
      const parts = await prepare(file, PASSES[i]);
      onStatus && onStatus("Linke Seite wird gelesen …" + tag);
      const L = await w.recognize(parts.left, {}, { text: true, blocks: true });
      onStatus && onStatus("Rechte Seite wird gelesen …" + tag);
      const R = await w.recognize(parts.right, {}, { text: true, blocks: true });
      results.push(root.AbrOCR.parse(wordsOf(L.data), wordsOf(R.data)));
      res = root.AbrOCR.combine(results);
      res.passes = results.length;
      const keys = Object.keys(res.abr).filter(k => k !== "summeLfd");
      if (keys.length && keys.every(k => res.abr[k].sure) && res.check.okVor) break;
    }
    return res;
  }
  root.PayslipOCR = { readPayslip, prepare };
})(window);
