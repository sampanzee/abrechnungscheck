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
  // Hintergrund ausgleichen (entfernt graue Spalten und Schatten), dann linke und rechte Hälfte doppelt so groß ausschneiden
  async function prepare(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const W = 1600, scale = W / bmp.width, H = Math.round(bmp.height * scale);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(bmp, 0, 0, W, H);
    const img = x.getImageData(0, 0, W, H), px = img.data;
    const g = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    // Hintergrund: stark verkleinern und wieder vergrößern
    const sw = Math.max(1, Math.round(W / 24)), sh = Math.max(1, Math.round(H / 24));
    const sc = document.createElement("canvas"); sc.width = sw; sc.height = sh;
    const sx = sc.getContext("2d", { willReadFrequently: true }); sx.imageSmoothingEnabled = true; sx.drawImage(c, 0, 0, sw, sh);
    const bc = document.createElement("canvas"); bc.width = W; bc.height = H;
    const bx = bc.getContext("2d", { willReadFrequently: true }); bx.imageSmoothingEnabled = true; bx.drawImage(sc, 0, 0, W, H);
    const bp = bx.getImageData(0, 0, W, H).data;
    for (let i = 0; i < W * H; i++) {
      const b = bp[i * 4] * 0.299 + bp[i * 4 + 1] * 0.587 + bp[i * 4 + 2] * 0.114 + 1;
      const v = Math.max(0, Math.min(255, g[i] / b * 255));
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v; px[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const half = (from, to) => { const w = Math.round(W * (to - from)); const o = document.createElement("canvas"); o.width = w * 2; o.height = H * 2; const ox = o.getContext("2d"); ox.imageSmoothingEnabled = true; ox.drawImage(c, Math.round(W * from), 0, w, H, 0, 0, w * 2, H * 2); return o; };
    return { left: half(0, 0.52), right: half(0.48, 1) };
  }
  function wordsOf(data) {
    let ws = data.words;
    if (!ws || !ws.length) { ws = []; (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => (l.words || []).forEach(w => ws.push(w))))); }
    return [{ words: ws.map(w => ({ text: w.text, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1 })) }];
  }
  async function readPayslip(file, onStatus) {
    onStatus && onStatus("Foto wird aufbereitet …");
    const parts = await prepare(file);
    const w = await getWorker(onStatus);
    onStatus && onStatus("Linke Seite wird gelesen …");
    const L = await w.recognize(parts.left, {}, { text: true, blocks: true });
    onStatus && onStatus("Rechte Seite wird gelesen …");
    const R = await w.recognize(parts.right, {}, { text: true, blocks: true });
    return root.AbrOCR.parse(wordsOf(L.data), wordsOf(R.data));
  }
  root.PayslipOCR = { readPayslip };
})(window);
