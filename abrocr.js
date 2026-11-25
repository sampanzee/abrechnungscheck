// Liest die Posten einer DIAKOVERE-Gehaltsmitteilung aus erkannten Textzeilen (Tesseract).
// Eingabe: Zeilen der linken und rechten Hälfte, jede Zeile { words: [{ text, x0, x1, y0, y1 }] }.
(function (root) {
  "use strict";
  const AMT = /^[-–]?\d{1,3}(?:\.\d{3})*,\d{2}$|^[-–]?\d+,\d{2}$/;
  const num = s => parseFloat(String(s).replace(/[–]/g, "-").replace(/\./g, "").replace(",", "."));
  const lineText = l => l.words.map(w => w.text).join(" ");
  // Posten: Schlüssel, Erkennung (tolerant gegen Lesefehler), Einheit der Menge, Spalte (lfd/vor/beide)
  const ITEMS = [
    { key: "grund", re: /entgel/i, col: "lfd" },
    { key: "kinder", re: /kinderz/i, col: "lfd" },
    { key: "vl", re: /\bVL\b.*zul|VL\s*Zul/i, col: "lfd" },
    { key: "sz", re: /schicht/i, col: "vor" },
    { key: "zg", re: /zeitgut/i, col: "vor" },
    { key: "uezz", re: /[üu]berst/i, col: "vor" },
    { key: "so", re: /sonntag/i, col: "vor" },
    { key: "ft", re: /feiertag|oster|pfingst|mai\s*\/?\s*weihn/i, col: "vor", sum: true },
    { key: "na", re: /w[äa]hrend\s*B/i, col: "vor", multi: ["na1", "na2"] },
    { key: "bd", re: /bereitschafts/i, col: "vor" },
    { key: "ftbd", re: /FZZ/i, col: "vor", sum: true },
    { key: "bdzz", re: /stufe\s*D\s*3|ZZ\s*Stu/i, col: "vor" },
    { key: "vtz", re: /vertret/i, col: "vor" },
    { key: "nef", re: /einsatz|rettungsd/i, col: "vor" },
    { key: "krank", re: /kr[kc]\.?\s*-?\s*au|krank.*auf/i, col: "vor" },
    { key: "url", re: /ur[il1]\.?\s*-?\s*au|au\s*-?\s*s?chlag/i, col: "vor" },
    { key: "nnl", re: /SV-?\s*Pflicht\s*Z/i, col: "both" },
    { key: "summe", re: /summe\s*ges|gesamtbrut/i, col: "both" }
  ];
  // Wörter nach ihrer Höhe zu Zeilen gruppieren (die Erkennung trennt Text- und Betragsspalten oft in eigene Blöcke)
  function regroup(lines) {
    const words = lines.flatMap(l => l.words).filter(w => w.text && w.text.trim());
    if (!words.length) return [];
    const hs = words.map(w => w.y1 - w.y0).sort((a, b) => a - b), mh = hs[Math.floor(hs.length / 2)] || 20;
    words.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    const out = [];
    for (const w of words) {
      const cy = (w.y0 + w.y1) / 2, last = out[out.length - 1];
      if (last && Math.abs(cy - last.cy) < mh * 0.55) { last.words.push(w); last.cy = (last.cy * (last.words.length - 1) + cy) / last.words.length; }
      else out.push({ cy, words: [w] });
    }
    out.forEach(l => l.words.sort((a, b) => a.x0 - b.x0));
    return out;
  }
  const amtTok = w => { const t = w.text.replace(/[^\d,.\-–]/g, ""); return AMT.test(t) && /,\d\d$/.test(t) ? t : null; };
  // Spalten aus den rechten Kanten der Beträge ableiten: ganz rechts "Vormonate", links davon "lfd. Monat"
  function columns(lines) {
    const xs = lines.flatMap(l => l.words).filter(amtTok).map(w => w.x1).sort((a, b) => a - b);
    if (!xs.length) return null;
    const width = Math.max(...lines.flatMap(l => l.words).map(w => w.x1));
    const vor = xs[Math.floor(xs.length * 0.9)];
    const lfdCand = xs.filter(x => x < vor - width * 0.08 && x > vor - width * 0.3);
    const lfd = lfdCand.length ? lfdCand[Math.floor(lfdCand.length / 2)] : vor - width * 0.17;
    return { vor, lfd, width };
  }
  function amounts(l, cols) {
    const out = [];
    for (const w of l.words) {
      const t = amtTok(w); if (!t) continue;
      if (!cols) { out.push({ v: num(t), col: "?" }); continue; }
      const tol = cols.width * 0.05;
      if (Math.abs(w.x1 - cols.vor) < tol) out.push({ v: num(t), col: "vor" });
      else if (Math.abs(w.x1 - cols.lfd) < tol) out.push({ v: num(t), col: "lfd" });
    }
    return out;
  }
  function qtyOf(l) {
    const m = lineText(l).match(/(\d+[.,]\d{2})\s*[*x×%]{1,2}\s*(\d+[.,]\d{2})\s*(Std|Tg|Td)?/i);
    return m ? { rate: num(m[1].replace(".", ",")), q: num(m[2].replace(".", ",")) } : null;
  }
  const pctOf = l => { const m = lineText(l).match(/[*x×]\s*(\d{2,3}[.,]\d{2})\s*%/); return m ? num(m[1].replace(".", ",")) : null; };
  function parseLeft(lines) {
    lines = regroup(lines);
    const cols = columns(lines.filter(l => ITEMS.some(x => x.re.test(lineText(l))))), res = {}, raw = [];
    const naSeen = [];
    for (let i = 0; i < lines.length; i++) {
      const t = lineText(lines[i]);
      const it = ITEMS.find(x => x.re.test(t)); if (!it) continue;
      if (it.key === "bd" && /zz|stufe/i.test(t)) continue;
      // Betrag auf der Zeile, sonst auf einer der zwei folgenden Zeilen ohne eigenen Posten
      let am = amounts(lines[i], cols);
      for (let k = 1; !am.length && k <= 2 && i + k < lines.length; k++) {
        if (ITEMS.some(x => x.re.test(lineText(lines[i + k])))) break;
        am = amounts(lines[i + k], cols);
      }
      // Summenzeile: Vormonate-Betrag steht manchmal eine Zeile tiefer
      if (it.key === "summe" && !am.some(a => a.col === "vor") && i + 1 < lines.length) am = am.concat(amounts(lines[i + 1], cols).filter(a => a.col === "vor"));
      let q = null, calc = null;
      for (let k = 1; k <= 3 && i + k < lines.length; k++) {
        if (ITEMS.some(x => x.re.test(lineText(lines[i + k])))) break;
        const v = qtyOf(lines[i + k]);
        if (v != null) {
          q = v.q; let pct = pctOf(lines[i + k]);
          if (pct == null && i + k + 1 < lines.length && !ITEMS.some(x => x.re.test(lineText(lines[i + k + 1])))) pct = pctOf(lines[i + k + 1]);
          calc = Math.round(v.rate * v.q * (pct != null ? pct / 100 : 1) * 100) / 100;
          break;
        }
      }
      // Lesefehler im Betrag über Satz × Menge korrigieren
      let alt = null, ok = false;
      if (calc != null && it.col === "vor") {
        const a = am.find(x => x.col === "vor") || am[am.length - 1];
        if (!a) am = [{ v: calc, col: "vor", calc: true }];
        else if (Math.abs(a.v - calc) > 0.02) { alt = calc; a.col = "vor"; }
        else ok = true;
      }
      raw.push({ key: it.key, text: t, am, q, calc });
      const put = (key, a, qq) => {
        const cur = res[key] || {};
        cur.n = (cur.n || 0) + 1; cur.ok = (cur.ok == null ? true : cur.ok) && ok; if (alt != null) cur.alt = (it.sum && cur.alt != null ? cur.alt : (cur.b || 0)) + alt; else if (cur.alt != null) cur.alt += a.v;
        if (a.col === "lfd" || (a.col === "?" && it.col === "lfd")) cur.lfd = (it.sum && cur.lfd != null ? cur.lfd : 0) + a.v;
        else cur.b = (it.sum && cur.b != null ? cur.b : 0) + a.v;
        if (qq != null) cur.m = (it.sum && cur.m != null ? cur.m : 0) + qq;
        res[key] = cur;
      };
      if (it.multi) { const key = it.multi[Math.min(naSeen.length, 1)]; naSeen.push(1); if (am.length) put(key, am[am.length - 1], q); continue; }
      if (it.col === "both") { am.forEach(a => put(it.key, a, null)); continue; }
      if (am.length) put(it.key, am[am.length - 1], q);
      else if (q != null) res[it.key] = Object.assign(res[it.key] || {}, { m: q });
    }
    // Fallback: Tage-Posten (Satz × Menge Tg), dessen Name nicht lesbar war, ist meist der Urlaubsaufschlag
    if (!res.url) for (let i = 0; i < lines.length; i++) {
      const t = lineText(lines[i]); if (!/\bT[gq]\b/.test(t)) continue;
      const v = qtyOf(lines[i]); if (!v) continue;
      const near = [i - 1, i - 2].filter(k => k >= 0).map(k => lineText(lines[k]));
      if (near.some(x => ITEMS.some(it => it.re.test(x) && it.key !== "url"))) continue;
      res.url = { m: v.q, b: Math.round(v.rate * v.q * 100) / 100, guessed: true };
      break;
    }
    return { res, raw, cols };
  }
  function parseRight(lines) {
    lines = regroup(lines);
    const cols = columns(lines), out = {};
    for (let i = 0; i < lines.length; i++) {
      const t = lineText(lines[i]);
      if (/auszahlungs/i.test(t)) { amounts(lines[i], cols).forEach(a => { out[a.col === "vor" ? "netVor" : "netLfd"] = a.v; }); }
      if (/summe\s*ges|gesa?n?mtbrut/i.test(t)) { let am = amounts(lines[i], cols); if (!am.some(a => a.col === "vor") && i + 1 < lines.length) am = am.concat(amounts(lines[i + 1], cols).filter(a => a.col === "vor")); am.forEach(a => { out[a.col === "vor" ? "summeVor" : "summeLfd"] = a.v; }); }
      const mo = t.match(/f[üu]r\s+(Januar|Februar|M[äa]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(20\d\d)/i);
      if (mo && !out.monatKey) { const M = ["januar","februar","märz","april","mai","juni","juli","august","september","oktober","november","dezember"]; const i = M.indexOf(mo[1].toLowerCase().replace("marz", "märz")); if (i >= 0) { out.monatKey = mo[2] + "-" + String(i + 1).padStart(2, "0"); out.monat = mo[1] + " " + mo[2]; } }
      if (/berweisungs/i.test(t)) { const am = amounts(lines[i], null); if (am.length) out.ueberw = am[am.length - 1].v; }
    }
    return out;
  }
  const fmt = v => v == null ? "" : v.toFixed(2).replace(".", ",");
  // Ergebnis im Format der App: { key: { m, b } }, plus Summenabgleich
  function toAbr(left, right) {
    const r = left.res, abr = {};
    for (const k of ["grund", "kinder"]) if (r[k] && (r[k].lfd != null || r[k].b != null)) abr[k] = { b: fmt(r[k].lfd != null ? r[k].lfd : r[k].b) };
    for (const k of ["sz", "zg", "uezz", "so", "ft", "na1", "na2", "bd", "bdzz", "ftbd", "vtz", "nef", "url", "krank"]) if (r[k]) { abr[k] = { m: r[k].m != null ? fmt(r[k].m) : "", b: fmt(r[k].b != null ? r[k].b : r[k].lfd) }; if (r[k].ok) abr[k].ok = true; if (r[k].alt != null) abr[k].alt = fmt(r[k].alt); if (r[k].guessed) abr[k].guessed = true; }
    r.summe = r.summe || {};
    if (right.summeLfd != null) r.summe.lfd = right.summeLfd;
    if (right.summeVor != null) r.summe.b = right.summeVor;
    if (r.summe.lfd != null && r.grund && r.grund.lfd != null) {
      const vl = r.vl && r.vl.lfd != null ? r.vl.lfd : 0, kinder = Math.round((r.summe.lfd - r.grund.lfd - vl) * 100) / 100;
      if (kinder >= 0 && (!abr.kinder || Math.abs(parseFloat(abr.kinder.b.replace(",", ".")) - kinder) > 0.02)) abr.kinder = { b: fmt(kinder) };
    }
    if (r.summe && r.summe.lfd != null) abr.summeLfd = { b: fmt(r.summe.lfd) };
    if (r.nnl) { if (r.nnl.lfd != null) abr.nnlL = { b: fmt(r.nnl.lfd) }; if (r.nnl.b != null) abr.nnlV = { b: fmt(r.nnl.b) }; }
    if (right.netLfd != null) abr.netLfd = { b: fmt(right.netLfd) };
    if (right.netVor != null) abr.netVor = { b: fmt(right.netVor) };
    // Summenabgleich Vormonate
    const sumVor = Object.entries(abr).filter(([k]) => !["grund", "kinder", "netLfd", "netVor", "nnlL", "nnlV", "summeLfd"].includes(k)).reduce((s, [, v]) => s + (parseFloat(String(v.b).replace(",", ".")) || 0), 0);
    const VOR = ["sz", "zg", "uezz", "so", "ft", "na1", "na2", "bd", "bdzz", "ftbd", "vtz", "nef", "url", "krank"];
    const val = k => abr[k] ? parseFloat(String(abr[k].b).replace(",", ".")) || 0 : 0;
    const sumOf = () => Math.round(VOR.reduce((s, k) => s + val(k), 0) * 100) / 100;
    const check = { sumVor: sumOf(), summeVor: r.summe.b != null ? r.summe.b : null, summeLfd: r.summe.lfd != null ? r.summe.lfd : null, ueberw: right.ueberw != null ? right.ueberw : null };
    // Summe passt nicht: einen Posten durch Satz × Menge ersetzen, wenn die Summe dann stimmt
    if (check.summeVor != null && Math.abs(check.sumVor - check.summeVor) >= 0.02) {
      for (const k of VOR) if (abr[k] && abr[k].alt) { const old = abr[k].b; abr[k].b = abr[k].alt; if (Math.abs(sumOf() - check.summeVor) < 0.02) { delete abr[k].alt; break; } abr[k].b = old; }
      check.sumVor = sumOf();
    }
    check.okVor = check.summeVor != null && Math.abs(check.sumVor - check.summeVor) < 0.02;
    if (check.okVor) VOR.forEach(k => { if (abr[k]) abr[k].ok = true; });
    const nl = abr.netLfd ? val("netLfd") : null, nv = abr.netVor ? val("netVor") : null;
    check.okNet = check.ueberw != null && nl != null && nv != null && Math.abs(nl + nv - check.ueberw) < 0.02;
    if (check.okNet) { abr.netLfd.ok = abr.netVor.ok = true; }
    const lfd = (abr.grund ? val("grund") : NaN) + (abr.kinder ? val("kinder") : 0) + (r.vl && r.vl.lfd != null ? r.vl.lfd : 0);
    check.okLfd = check.summeLfd != null && Math.abs(lfd - check.summeLfd) < 0.02;
    return { abr, check };
  }
  function parse(leftLines, rightLines) { const L = parseLeft(leftLines), R = parseRight(rightLines); return Object.assign(toAbr(L, R), { raw: L.raw, monatKey: R.monatKey || null, monat: R.monat || null }); }
  // Mehrere Lesedurchgänge zusammenführen: bestätigte Werte (Satz × Menge, Summen) zuerst, sonst Mehrheit.
  // "sure": bestätigt oder in zwei Durchgängen gleich gelesen.
  function combine(results) {
    if (results.length === 1) { const r = results[0]; Object.values(r.abr).forEach(v => { v.sure = !!v.ok; }); return r; }
    const keys = [...new Set(results.flatMap(r => Object.keys(r.abr)))], abr = {};
    for (const k of keys) {
      const c = results.map(r => r.abr[k]).filter(Boolean);
      const okC = c.find(v => v.ok);
      const cnt = new Map(); c.forEach(v => cnt.set(v.b, (cnt.get(v.b) || 0) + 1));
      const best = okC || c.slice().sort((a, b) => cnt.get(b.b) - cnt.get(a.b))[0];
      const m = c.map(v => v.m).find(x => x) || best.m || "";
      abr[k] = Object.assign({}, best, { m, sure: !!okC || cnt.get(best.b) >= 2 });
    }
    const check = Object.assign({}, results.find(r => r.check.okVor) ? results.find(r => r.check.okVor).check : results[0].check);
    const mk = results.find(r => r.monatKey);
    return { abr, check, raw: results[0].raw, monatKey: mk ? mk.monatKey : null, monat: mk ? mk.monat : null };
  }
  const allSure = r => Object.entries(r.abr).every(([k, v]) => k === "summeLfd" || v.ok) && r.check.okVor && (r.check.ueberw == null || r.check.okNet);
  root.AbrOCR = { parse, parseLeft, parseRight, combine, allSure };
})(typeof window !== "undefined" ? window : globalThis);
