// Abrechnungscheck – Oberfläche, Speicher, Einrichtung, Netto, Tarif-Editor, Fotoerkennung
"use strict";
const APP_VERSION = "1.5.0";
const KEY = "abrcheck.app.v1";

const DEF_SET = {
  grp: "A I", stf: 1, woStd: 38.5, tagStd: 7.7, kinder: 0, schicht: "18", vl: 0,
  stkl: "1", zkf: 0, kist: "0", kvArt: "gkv", kvz: 2.9, pvKinder: 0, pvKinderlos: false, pkvBeitrag: 0, pkvZuschuss: 0,
  versorgungswerk: "1", bveSatz: 18.6, zvSatz: 1.3, entgeltumwandlung: 0, vwlSparrate: 0, agZuschussFrei: 0, setupDone: false
};

// ---------- Speicher ----------
function loadState() {
  let s = null;
  try { const v = localStorage.getItem(KEY); if (v) s = JSON.parse(v); } catch (e) {}
  if (!s || !s.months) s = { set: {}, codes: {}, months: {}, cur: null, urlBase: {}, tarif: null };
  s.set = Object.assign({}, DEF_SET, s.set || {});
  s.codes = s.codes || {}; s.urlBase = s.urlBase || {};
  if (!s.months[s.cur]) s.cur = Object.keys(s.months).sort().pop() || null;
  return s;
}
let S = loadState();
let saveOk = true;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; } }
setTarif(S.tarif);
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

const parsed = new Map();
function vivOf(key) {
  const m = S.months[key]; if (!m || !m.vivText) return null;
  if (!parsed.has(key) || parsed.get(key).src !== m.vivText) parsed.set(key, { src: m.vivText, v: parseVivendi(m.vivText) });
  return JSON.parse(JSON.stringify(parsed.get(key).v));
}
const neighbour = (key, k) => { const [y, m] = key.split("-").map(Number); const n = addMonths(y, m, k); return monthKey(n.y, n.m); };
let memo = { base: {}, ev: {} };
function evalMonth(key) {
  if (memo.ev[key]) return memo.ev[key];
  const res = evalMonthRaw(key); memo.ev[key] = res; return res;
}
function evalMonthRaw(key) {
  const viv = vivOf(key); if (!viv) return null;
  const t = tarifFor(viv.jahr, viv.monat), r = t && t.std[S.set.grp];
  const rates = r ? { so: r.so, ft: r.ft, nacht: r.nacht } : { so: 25, ft: 35, nacht: 27.5 };
  const win = [neighbour(key, -2), neighbour(key, -1)];
  const miss = win.filter(k => !S.months[k]);
  const c0 = win.reduce((x, k) => x + (S.months[k] && vivOf(k) ? bdTage(vivOf(k)) : 0), 0);
  const ctx = { rates, c0, known: !miss.length, missing: miss.map(monthName).join(", "), planSpaet: !!S.months[key].planSpaet, kurz: S.months[key].kurz || {}, nefSammeln: nefSammelnOf(key) };
  const own = nachzaehlen(viv, setForLogic(), S.codes, vivOf(neighbour(key, -1)), vivOf(neighbour(key, 1)), ctx);
  const rows = S.months[key].bz ? [] : pruefen(viv, own, setForLogic(), S.months[key].abr || {}, { nefSammeln: nefSammelnOf(key), nefEinsaetze: S.months[key].nefEinsaetze });
  return { viv, own, rows };
}
// NEF nur zum Sammeln: im Monat angehakt, sonst alle Monate vor „NEF regulär ab“ aus den Einstellungen
const nefSammelnOf = k => { const m = S.months[k] || {}; if (m.nefSammeln != null) return !!m.nefSammeln; return !!(S.set.nefAb && k < S.set.nefAb); };
const setForLogic = () => Object.assign({}, S.set, { stf: +S.set.stf, kinder: +S.set.kinder || 0 });

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const idOf = s => "c-" + String(s).replace(/[^A-Za-z0-9]/g, c => "_" + c.charCodeAt(0));
const monthName = key => { const [y, m] = key.split("-").map(Number); return `${MONATE[m - 1]} ${y}`; };
const abrName = key => { const [y, m] = key.split("-").map(Number); const a = addMonths(y, m, 2); return `${MONATE[a.m - 1]} ${a.y}`; };

// ---------- Urlaubs-/Krankheitsaufschlag (§ 32 Abs. 13) ----------
// Summe der Zulagen der 3 Arbeitsmonate vor dem Urlaubsmonat, ohne Schichtzulage, Zeitguthaben und Überstunden-Zuschlag, ÷ 54 (3 × 18 Tage bei 4-Tage-Woche)
const BASE_EXCL = new Set(["grund", "kinder", "sz", "zg", "uezz"]);
function urlTeiler() { const tage = Math.round(22 * Math.min(5, Math.max(1, (S.set.tageWoche || (S.set.woStd && S.set.tagStd ? S.set.woStd / S.set.tagStd : 5)))) / 5); return 3 * tage; }
function baseOf(k) {
  if (k in memo.base) return memo.base[k];
  memo.base[k] = null;
  let r = null;
  const hb = S.urlBase[k];
  if (hb != null && hb !== "") r = { v: num(hb), src: "Startwert" };
  else if (S.months[k] && !S.months[k].bz) {
    const ev = evalMonth(k);
    if (ev && ev.viv.jahr) { let sum = 0, est = false; ev.rows.forEach(x => { if (BASE_EXCL.has(x.p.key)) return; const v = x.aB != null ? x.aB : x.exp; if (v == null) return; if (x.aB == null) est = true; sum += v; }); r = { v: r2(sum), src: est ? "Schätzung" : "Abrechnung", est }; }
  }
  return memo.base[k] = r;
}
const prevKeys = v => [3, 2, 1].map(i => { const a = addMonths(v.jahr, v.monat, -i); return monthKey(a.y, a.m); });
function urlRateOf(v) { const b = prevKeys(v).map(baseOf); if (b.some(x => !x)) return null; return r2(b.reduce((s, x) => s + x.v, 0) / urlTeiler()); }
function urlRateTxt(v) {
  const ks = prevKeys(v), b = ks.map(baseOf);
  if (b.some(x => !x)) return `Satz je Tag nicht berechenbar, es fehlen: ${ks.filter((k, i) => !b[i]).map(monthName).join(", ")}. Trag sie als Startwerte in den Einstellungen ein oder lade diese Monate.`;
  return `Ø ${ks.map(monthName).map(s => s.split(" ")[0]).join("/")} ÷ ${urlTeiler()}${b.some(x => x.est) ? ", teils geschätzt" : ""}`;
}

// ---------- Netto ----------
const TAXFREE = new Set(["so", "ft", "nacht", "x2412", "na1", "na2"]);
function nettoParams() {
  const s = S.set;
  return { stkl: +s.stkl, zkf: +s.zkf || 0, kist: +s.kist || 0, kvz: +s.kvz || 0, pvKinder: +s.pvKinder || 0, pvKinderlos: !!s.pvKinderlos,
    pkv: s.kvArt === "pkv", pkvBeitrag: +s.pkvBeitrag || 0, pkvZuschuss: +s.pkvZuschuss || 0, versorgungswerk: s.versorgungswerk === "1",
    bveSatz: +s.bveSatz || 0, zvSatz: +s.zvSatz || 0, entgeltumwandlung: +s.entgeltumwandlung || 0, vwlSparrate: +s.vwlSparrate || 0, agZuschussFrei: +s.agZuschussFrei || 0 };
}
function netFor(key, ev) {
  const [y, m] = key.split("-").map(Number), A = addMonths(y, m, 2);
  const tz = (+S.set.woStd || VOLLZEIT) / VOLLZEIT, g = S.set.grp, st = +S.set.stf;
  const tA = tarifFor(A.y, A.m), tW = tarifFor(y, m);
  if (!tA || !tW || !tA.monat[g] || !tW.monat[g]) return null;
  const kiA = byDate(KINDER, A.y, A.m), kiW = byDate(KINDER, y, m), n = +S.set.kinder || 0;
  let frei = 0, stpfl = 0, zg = 0, nichtZV = 0;
  ev.rows.forEach(r => {
    if (["grund", "kinder"].includes(r.p.key)) return;
    const v = r.aB != null ? r.aB : r.exp; if (v == null) return;
    if (r.p.key === "zg") zg += v; else if (TAXFREE.has(r.p.key)) frei += v; else { stpfl += v; if (r.p.key === "nef") nichtZV += v; }
  });
  const abr = S.months[key].abr || {};
  let nnlL = num((abr.nnlL || {}).b), nnlV = num((abr.nnlV || {}).b), nnlFrom = null;
  if (nnlL == null && nnlV == null) {
    // SV-pflichtige ZV-Umlage aus einer früheren Abrechnung desselben Jahres übernehmen
    for (const k of Object.keys(S.months).sort().reverse()) {
      if (k >= key) continue; const kA = addMonths(+k.slice(0, 4), +k.slice(5, 7), 2); if (kA.y !== A.y) continue;
      const a = S.months[k].abr || {}; const l = num((a.nnlL || {}).b), v = num((a.nnlV || {}).b);
      if (l != null || v != null) { nnlL = l; nnlV = v; nnlFrom = k; break; }
    }
  }
  const res = Netto.abrechnung(nettoParams(), {
    jahr: A.y, entgelt: r2(tA.monat[g][st - 1] * tz), kinder: r2((kiA ? kiA.v : 0) * n * tz), vl: +S.set.vl || 0,
    arbeitsJahr: y, entgeltArbeitsmonat: r2(tW.monat[g][st - 1] * tz), kinderArbeitsmonat: r2((kiW ? kiW.v : 0) * n * tz), vlArbeitsmonat: +S.set.vl || 0,
    zulagenStpfl: r2(stpfl), zulagenNichtZV: r2(nichtZV), zulagenFrei: r2(frei), zeitguthaben: r2(zg), nnlL: nnlL || 0, nnlV: nnlV || 0
  });
  res.nnlFrom = nnlFrom; res.paramsJahr = Math.max(A.y, y) > 2026;
  return res;
}

// ---------- Einstellungen ----------
const SET_FIELDS = {
  grp: { l: "Entgeltgruppe", t: "select", opts: () => GRUPPEN.map(g => [g, g]), help: "Auf der Gehaltsmitteilung unter „Tar-Grp“, z. B. „A I.“ für Ärztin/Arzt in Weiterbildung." },
  stf: { l: "Stufe", t: "select", opts: () => (TARIF[TARIF.length - 1].monat[S.set.grp] || []).map((_, i) => [String(i + 1), "Stufe " + (i + 1)]), help: "Unter „Stf“, z. B. „06“ für Stufe 6." },
  woStd: { l: "Std/Woche laut Vertrag", t: "num", help: "Unter „TZ-Zähl“. Vollzeit sind 38,5 Std. Wird beim Laden eines Vivendi-PDFs übernommen." },
  tagStd: { l: "Std/Tag", t: "num", help: "Steht in Vivendi unter „Stunden/Tag“, wird beim Laden übernommen." },
  kinder: { l: "Kinder mit Kinderzulage", t: "int", help: "Anzahl der Kinder, für die du „JLL Kinderzulage“ bekommst." },
  schicht: { l: "Schichtzulage", t: "select", opts: () => [["18", "Schichtarbeit über mind. 18 Std"], ["13", "Schichtarbeit über mind. 13 Std"], ["0", "keine"]], help: "Steht als „JLL Schichtzulage“ auf der Gehaltsmitteilung." },
  vl: { l: "VL-Zulage € je Monat", t: "num", help: "„JLL VL Zulage“ in der Spalte „lfd. Monat“." },
  stkl: { l: "Steuerklasse", t: "select", opts: () => [["1", "I"], ["2", "II"], ["3", "III"], ["4", "IV"], ["5", "V"], ["6", "VI"]], help: "Auf der Gehaltsmitteilung unter „St Kl“." },
  zkf: { l: "Kinderfreibeträge", t: "num", help: "Unter „Kinder-Freib.“, z. B. 2,0. Wirkt nur auf Soli und Kirchensteuer." },
  kist: { l: "Kirchensteuer", t: "select", opts: () => [["0", "keine"], ["9", "9 % (u. a. Niedersachsen)"], ["8", "8 % (Bayern, Baden-Württemberg)"]], help: "Unter „Konf“: leer heißt keine Kirchensteuer." },
  kvArt: { l: "Krankenversicherung", t: "select", opts: () => [["gkv", "gesetzlich"], ["pkv", "privat"]], help: "Gesetzlich, wenn auf der Gehaltsmitteilung „AN-Beitrag zur KV“ steht." },
  kvz: { l: "Zusatzbeitrag der Krankenkasse in %", t: "num", help: "Gesamter Zusatzbeitrag deiner Kasse, z. B. 2,98 für die AOK Niedersachsen 2026. Rechnung zur Kontrolle: „AN-Beitrag zum ZB“ ÷ KV-Brutto × 200." },
  pvKinder: { l: "Kinder unter 25 (Pflegeversicherung)", t: "int", help: "Ab dem 2. Kind sinkt der Pflegebeitrag. Steht als „PV-Satz“ auf der Gehaltsmitteilung (1,80 % mit einem Kind, 1,55 % mit zwei)." },
  pvKinderlos: { l: "Kinderlos und älter als 23", t: "check", help: "Dann zahlst du den Kinderlosenzuschlag in der Pflegeversicherung." },
  pkvBeitrag: { l: "PKV-Beitrag €/Monat (Kranken + Pflege)", t: "num", help: "Nur bei privater Krankenversicherung." },
  pkvZuschuss: { l: "Arbeitgeberzuschuss PKV €/Monat", t: "num", help: "Nur bei privater Krankenversicherung." },
  versorgungswerk: { l: "Rentenversicherung", t: "select", opts: () => [["1", "Ärzteversorgung (Versorgungswerk)"], ["0", "Deutsche Rentenversicherung"]], help: "Versorgungswerk, wenn „Gesamtbeitrag BVE“ und „Zuschuss BVE“ auf der Gehaltsmitteilung stehen." },
  bveSatz: { l: "Beitragssatz Versorgungswerk % (gesamt)", t: "num", help: "Meist 18,6 %. Rechnung: „Gesamtbeitrag BVE“ (Seite 1, Spalte „lfd. Monat“) ÷ „RV-Brutto“ (Seite 2 unter „Summen“, Spalte „Monat“) × 100. Die Hälfte zahlt der Arbeitgeber als „Zuschuss BVE“." },
  zvSatz: { l: "Eigenbeitrag Zusatzversorgung (ZVK) %", t: "num", help: "Meist 1,3 %. Rechnung: „AN-Beitrag ZV“ (Seite 1, Spalte „lfd. Monat“) ÷ „ZV-Brutto“ (Seite 2 unter „Summen“, Spalte „Monat“) × 100." },
  entgeltumwandlung: { l: "Entgeltumwandlung €/Monat", t: "num", help: "z. B. „UnterstützKasse“ auf der rechten Seite." },
  vwlSparrate: { l: "VL-Sparrate €/Monat", t: "num", help: "„Vw-Leistung“ auf der rechten Seite." },
  nefAb: { l: "NEF regulär mit Einsatzzuschlag ab Arbeitsmonat", t: "month", help: "Leer lassen, wenn du kein NEF fährst. Monate davor gelten als „nur Fahrten sammeln“: BD-Stunden zählen, aber kein Einsatzzuschlag. In jedem Monat einzeln änderbar." },
  agZuschussFrei: { l: "Steuerfreier Arbeitgeberzuschuss €/Monat", t: "num", help: "z. B. „NNN Zuschuss Betr.“ in der Spalte „lfd. Monat“." }
};
const SET_GROUPS = [
  { t: "Tarif", keys: ["grp", "stf", "woStd", "tagStd"] },
  { t: "Zulagen", keys: ["kinder", "schicht", "vl", "nefAb"] },
  { t: "Steuer", keys: ["stkl", "zkf", "kist"] },
  { t: "Kranken- und Pflegeversicherung", keys: ["kvArt", "kvz", "pvKinder", "pvKinderlos", "pkvBeitrag", "pkvZuschuss"] },
  { t: "Altersvorsorge und Abzüge", keys: ["versorgungswerk", "bveSatz", "zvSatz", "entgeltumwandlung", "vwlSparrate", "agZuschussFrei"] }
];
function fieldHtml(k, prefix) {
  const f = SET_FIELDS[k], id = prefix + k, v = S.set[k];
  if (f.t === "select") return `<label class="f" for="${id}">${f.l}<select id="${id}" data-k="${k}">${f.opts().map(([val, txt]) => `<option value="${esc(val)}" ${String(v) === String(val) ? "selected" : ""}>${esc(txt)}</option>`).join("")}</select></label>`;
  if (f.t === "month") return `<label class="f" for="${id}">${f.l}<input type="month" id="${id}" data-k="${k}" value="${esc(v || "")}"></label>`;
  if (f.t === "check") return `<label class="check" for="${id}"><input type="checkbox" id="${id}" data-k="${k}" ${v ? "checked" : ""}> ${f.l}</label>`;
  return `<label class="f" for="${id}">${f.l}<input id="${id}" data-k="${k}" class="num" inputmode="${f.t === "int" ? "numeric" : "decimal"}" value="${esc(f.t === "int" ? (v ?? "") : de(+v || 0))}"></label>`;
}
function readField(el) {
  const k = el.dataset.k, f = SET_FIELDS[k]; if (!f) return;
  if (f.t === "month") S.set[k] = el.value || "";
  else if (f.t === "check") S.set[k] = el.checked;
  else if (f.t === "num") S.set[k] = num(el.value) ?? 0;
  else if (f.t === "int") S.set[k] = Math.max(0, Math.round(num(el.value) ?? 0));
  else S.set[k] = el.value;
  if (k === "grp") { const n = (TARIF[TARIF.length - 1].monat[S.set.grp] || [1]).length; if (+S.set.stf > n) S.set.stf = String(n); }
}
function buildSettings() {
  const ub = Object.entries(S.urlBase || {}).sort();
  $("setBody").innerHTML = SET_GROUPS.map(g => `<h3 class="eyebrow" style="margin:0">${g.t}</h3><div class="grid2">${g.keys.map(k => fieldHtml(k, "set-")).join("")}</div>`).join("") + `
    <h3 class="eyebrow" style="margin:0">Startwerte Urlaubsaufschlag</h3>
    <p class="hint">Der Urlaubs- und Krankheitsaufschlag braucht die Zulagen der 3 Monate vor dem Urlaubsmonat. Fehlen dir diese Monate in der App, trag hier je Arbeitsmonat die Summe der Spalte „Vormonate“ ohne Schichtzulage, Zeitguthaben und Überstunden-Zuschlag ein.</p>
    <div id="ubList" class="inline">${ub.map(([k, v], i) => `<label class="f">Arbeitsmonat<input type="month" data-ub="k" data-i="${i}" value="${k}"></label><label class="f">Betrag €<input class="num" inputmode="decimal" data-ub="v" data-i="${i}" value="${esc(v)}"></label>`).join("")}</div>
    <div class="btns"><button type="button" class="sec small" id="ubAdd">Startwert hinzufügen</button>${ub.length ? `<button type="button" class="danger small" id="ubDel">Letzten entfernen</button>` : ""}</div>
    <div class="btns"><button type="button" class="sec" id="setWizard">Einrichtung erneut durchgehen</button></div>`;
  $("setShort").textContent = `${S.set.grp} · Stufe ${S.set.stf} · ${de(+S.set.woStd)} Std`;
}
$("setBody").addEventListener("change", e => {
  if (e.target.dataset.k) { readField(e.target); save(); if (e.target.dataset.k === "grp") buildSettings(); render(); return; }
  if (e.target.dataset.ub) {
    const items = Object.entries(S.urlBase).sort(); const i = +e.target.dataset.i;
    if (e.target.dataset.ub === "k") { const [ok, ov] = items[i]; delete S.urlBase[ok]; if (e.target.value) S.urlBase[e.target.value] = ov; }
    else S.urlBase[items[i][0]] = e.target.value;
    save(); buildSettings(); render();
  }
});
$("setBody").addEventListener("click", e => {
  if (e.target.id === "ubAdd") { const first = Object.keys(S.months).sort()[0] || monthKey(new Date().getFullYear(), new Date().getMonth() + 1); let k = neighbour(first, -1); while (S.urlBase[k] != null) k = neighbour(k, -1); S.urlBase[k] = ""; save(); buildSettings(); }
  if (e.target.id === "ubDel") { const ks = Object.keys(S.urlBase).sort(); delete S.urlBase[ks[0]]; save(); buildSettings(); render(); }
  if (e.target.id === "setWizard") openWizard();
});

// ---------- Abrechnungsformular ----------
function buildAbr() {
  if (!S.cur) return;
  const abr = S.months[S.cur].abr || {};
  let h = `<span class="h">Posten</span><span class="h r">Menge</span><span class="h r">Betrag €</span>`;
  for (const p of POSTEN) {
    const v = abr[p.key] || {};
    h += `<span class="n">${esc(p.label)}<small>${esc(p.code)}</small></span>`;
    h += ["grund", "kinder", "sz"].includes(p.kind) ? `<span></span>` : `<input class="num" inputmode="decimal" id="m-${p.key}" aria-label="${esc(p.label)} Menge" value="${esc(v.m || "")}">`;
    h += `<input class="num" inputmode="decimal" id="b-${p.key}" aria-label="${esc(p.label)} Betrag" value="${esc(v.b || "")}">`;
  }
  $("abrForm").innerHTML = h;
  $("planSpaet").checked = !!S.months[S.cur].planSpaet;
  $("bzMonth").checked = !!S.months[S.cur].bz;
  $("nefSammeln").checked = nefSammelnOf(S.cur);
  $("nefEinsaetze").value = S.months[S.cur].nefEinsaetze ?? "";
  $("nefBox").hidden = !(vivOf(S.cur) || { tage: [] }).tage.some(t => /^NEF/.test(t.ist || "")) && !S.months[S.cur].nefEinsaetze && S.months[S.cur].nefSammeln == null;
  for (const k of ["netLfd", "netVor", "nnlL", "nnlV"]) $(k).value = (abr[k] || {}).b || "";
}
function readAbr() {
  const abr = {};
  for (const k of ["netLfd", "netVor", "nnlL", "nnlV"]) abr[k] = { b: $(k).value };
  for (const p of POSTEN) { const m = $("m-" + p.key), b = $("b-" + p.key); abr[p.key] = { m: m ? m.value : "", b: b ? b.value : "" }; }
  S.months[S.cur].abr = abr; save();
}

// ---------- Dienstkürzel ----------
function buildCodes() {
  const found = new Map();
  for (const key of Object.keys(S.months)) {
    const v = vivOf(key); if (!v) continue;
    for (const t of v.tage) {
      if (!t.ist || t.ist === "/") continue;
      const f = found.get(t.ist) || { n: 0, kind: null };
      f.n++; if (!f.kind) { const k = dayKind(t, {}); if (k !== "leer") f.kind = k; }
      found.set(t.ist, f);
    }
  }
  const codes = [...found.keys()].sort();
  const unbek = codes.filter(c => !knownCode(c) && !(S.codes[c] || {}).desc);
  $("codesShort").textContent = codes.length ? `${codes.length} Kürzel${unbek.length ? ` · ${unbek.length} ohne Bedeutung` : ""}` : "";
  if (!codes.length) { $("codesTbl").innerHTML = `<p class="hint">Noch keine Kürzel gefunden.</p>`; return; }
  $("codesTbl").innerHTML = `<table class="codes"><thead><tr><th>Kürzel</th><th>Tage</th><th>Erkannt</th><th>Regel</th><th>Bedeutung</th></tr></thead><tbody>${codes.map(c => {
    const f = found.get(c), cur = S.codes[c] || {}, id = idOf(c);
    return `<tr><td class="mono">${esc(c)}</td><td>${f.n}</td><td class="l muted">${esc(KIND_TXT[f.kind] || "–")}</td>
      <td class="l"><select id="${id}-r" data-code="${esc(c)}" aria-label="Regel für ${esc(c)}">${Object.entries(REGELN).map(([k, t]) => `<option value="${k}" ${(cur.rule || "auto") === k ? "selected" : ""}>${t}</option>`).join("")}</select></td>
      <td class="l"><input id="${id}-d" data-code="${esc(c)}" value="${esc(cur.desc || (knownCode(c) || {}).desc || "")}" placeholder="Bedeutung noch offen" aria-label="Bedeutung von ${esc(c)}"></td></tr>`;
  }).join("")}</tbody></table>`;
}
$("codesTbl").addEventListener("change", e => {
  const c = e.target.dataset.code; if (!c) return;
  S.codes[c] = S.codes[c] || {};
  if (e.target.tagName === "SELECT") S.codes[c].rule = e.target.value; else S.codes[c].desc = e.target.value;
  save(); render();
});

// ---------- Verlauf ----------
const delArm = new Set();
const openRows = new Set();
document.getElementById("result").addEventListener("toggle", e => { const k = e.target.dataset && e.target.dataset.key; if (!k) return; if (e.target.open) openRows.add(k); else openRows.delete(k); }, true);
function buildHist() {
  const keys = Object.keys(S.months).sort().reverse();
  $("histShort").textContent = `${keys.length} ${keys.length === 1 ? "Monat" : "Monate"}`;
  $("hist").innerHTML = keys.map(k => {
    const ev = evalMonth(k); const rows = ev ? ev.rows : [];
    const c = s => rows.filter(r => r.status === s).length;
    const warn = ev ? ev.own.msgs.filter(m => m.lvl === "warn").length : 0;
    return `<div class="hrow ${k === S.cur ? "cur" : ""}"><div class="t">Abrechnung ${abrName(k)}<small>Arbeitsmonat ${monthName(k)}${S.months[k].bz ? " · nur Dienste" : ""}${warn ? ` · ${warn} Hinweis${warn > 1 ? "e" : ""}` : ""}</small></div>
      <div class="cnt"><span class="v ok">${c("ok")} ✓</span><span class="v bad">${c("bad")} ✗</span><span class="v open">${c("open")} ?</span></div>
      <div class="btns">${k === S.cur ? `<span class="muted" style="font-size:.82rem">angezeigt</span>` : `<button type="button" class="sec small" data-open="${k}">Anzeigen</button>`}
      <button type="button" class="danger small" data-del="${k}">${delArm.has(k) ? "Wirklich löschen?" : "Löschen"}</button></div></div>`;
  }).join("");
  if (!S.cur) { $("stats").innerHTML = ""; return; }
  const [cy, cm] = S.cur.split("-").map(Number); const hj = cm <= 6 ? 1 : 2;
  const inHj = keys.filter(k => { const [y, m] = k.split("-").map(Number); return y === cy && (m <= 6 ? 1 : 2) === hj; });
  let bdN = 0; inHj.forEach(k => { const ev = evalMonth(k); if (ev) bdN += ev.own.dienste.length; });
  const inJahr = keys.filter(k => +k.slice(0, 4) === cy);
  let nh = 0; inJahr.forEach(k => { const ev = evalMonth(k); if (ev) nh += ev.own.na1 + ev.own.na2 + ev.own.nachtAll; });
  nh = r2(nh); const ntage = Math.min(4, Math.floor(nh / 110));
  const fehlend = MONATE.filter((_, i) => !S.months[monthKey(cy, i + 1)]).length;
  const last = keys.find(k => vivOf(k) && vivOf(k).azk != null);
  $("stats").innerHTML = `
    <div><span class="eyebrow">BD im ${hj}. Halbjahr ${cy}</span><span class="v ${bdN >= 30 ? "ok" : ""}">${bdN} / 30</span><span class="hint">${bdN >= 30 ? "Zusatzurlaubstag erreicht" : `noch ${30 - bdN} bis zum Zusatzurlaubstag`} · aus ${inHj.length} gespeicherten Monat${inHj.length === 1 ? "" : "en"}</span></div>
    <div><span class="eyebrow">Nachtstunden ${cy}</span><span class="v ${ntage ? "ok" : ""}">${de(nh, 0)} Std</span><span class="hint">${ntage} Zusatzurlaubstag${ntage === 1 ? "" : "e"} für ${cy + 1} (je 110 Std bei Schichtarbeit, höchstens 4)${ntage < 4 ? ` · noch ${de(110 - (nh % 110), 0)} Std bis zum nächsten` : ""}${fehlend ? ` · ${12 - fehlend} von 12 Monaten gespeichert` : ""}</span></div>
    ${last ? (() => { const v = vivOf(last); return `<div><span class="eyebrow">Arbeitszeitkonto laut Vivendi</span><span class="v">${v.azk > 0 ? "+" : ""}${de(v.azk)} Std</span><span class="hint">Stand Ende ${monthName(last)}${v.resturlaub != null ? ` · Resturlaub ${de(v.resturlaub, v.resturlaub % 1 ? 1 : 0)} Tage` : ""}</span></div>`; })() : ""}`;
}
$("hist").addEventListener("click", e => {
  const o = e.target.dataset.open, d = e.target.dataset.del;
  if (o) { goMonth(o); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (d) {
    if (!delArm.has(d)) { delArm.add(d); buildHist(); return; }
    delete S.months[d]; delArm.delete(d);
    if (!S.months[S.cur]) S.cur = Object.keys(S.months).sort().pop() || null;
    save(); buildAbr(); render();
  }
});

// ---------- Ausgabe ----------
function render() {
  memo = { base: {}, ev: {} };
  const has = !!S.cur && !!S.months[S.cur];
  $("welcome").hidden = has; $("main").hidden = !has; $("monthnav").hidden = !has;
  ["sec-abr", "sec-own", "sec-hist", "sec-codes"].forEach(id => $(id).hidden = !has);
  buildTarifShort();
  $("setShort").textContent = `${S.set.grp} · Stufe ${S.set.stf} · ${de(+S.set.woStd)} Std`;
  if (!has) { $("period").textContent = S.set.setupDone ? "Lade als Nächstes ein Vivendi-PDF (Abschnitt 1)." : ""; $("vivShort").textContent = ""; return; }
  const ev = evalMonth(S.cur); const { viv, own, rows } = ev;
  const bz = !!S.months[S.cur].bz;
  const okN = rows.filter(r => r.status === "ok").length, badN = rows.filter(r => r.status === "bad").length, openN = rows.filter(r => r.status === "open").length;
  let diff = 0; rows.forEach(r => { if (r.p.kind === "open") return; if (r.exp != null && r.aB != null) diff += r.aB - r.exp; else if (r.exp != null && r.status === "bad") diff -= r.exp; });
  diff = r2(diff);
  $("period").innerHTML = `Arbeitsmonat <b>${MONATE[viv.monat - 1]} ${viv.jahr}</b> → Abrechnung <b>${abrName(S.cur)}</b>`;
  $("summary").hidden = bz;
  $("summary").innerHTML = `
    <div><span class="eyebrow">Geprüft</span><span class="v ok">${okN}</span></div>
    <div><span class="eyebrow">Weicht ab</span><span class="v bad">${badN}</span></div>
    <div><span class="eyebrow">Ungeprüft</span><span class="v open">${openN}</span></div>
    <div><span class="eyebrow">Differenz</span><span class="v ${Math.abs(diff) > 0.02 ? "bad" : "ok"}">${diff > 0 ? "+" : ""}${de(diff)} €</span></div>`;

  // Brutto und Netto
  let lfd = +S.set.vl || 0, vor = 0;
  rows.forEach(r => { const v = r.exp != null ? r.exp : r.aB; if (v == null) return; if (["grund", "kinder"].includes(r.p.key)) lfd += v; else vor += v; });
  lfd = r2(lfd); vor = r2(vor);
  let netHtml = "";
  const nt = bz ? null : netFor(S.cur, ev);
  if (nt) {
    const ab = S.months[S.cur].abr || {}, aL = num((ab.netLfd || {}).b), aV = num((ab.netVor || {}).b);
    const row = (l, a, b) => `<tr><td>${l}</td><td>${a == null ? "–" : eur(a)}</td><td>${b == null ? "–" : eur(b)}</td></tr>`;
    const L = nt.lfd, V = nt.vor;
    netHtml = `<div class="netline"><span class="eyebrow">Geschätzte Überweisung (netto)</span><span class="big">≈ ${eur(nt.ueberweisung)}</span>
      <div class="parts"><span>lfd. Monat <b>${eur(L.ausz)}</b></span><span>Vormonate <b>${eur(V.ausz)}</b></span></div>
      ${aL != null || aV != null ? `<p class="hint">Laut Gehaltsmitteilung: ${aL != null ? `lfd. Monat <b>${eur(aL)}</b> (${aL - L.ausz >= 0 ? "+" : ""}${de(r2(aL - L.ausz))} €)` : ""}${aL != null && aV != null ? " · " : ""}${aV != null ? `Vormonate <b>${eur(aV)}</b> (${aV - V.ausz >= 0 ? "+" : ""}${de(r2(aV - V.ausz))} €)` : ""}</p>` : ""}
      <details class="netdetail"><summary class="muted" style="cursor:pointer">Abzüge im Einzelnen</summary><div class="tbl"><table>
        <thead><tr><th></th><th>lfd. Monat</th><th>Vormonate</th></tr></thead><tbody>
        ${row("Brutto", L.brutto, V.brutto)}${row("Lohnsteuer", -L.lst, -V.lst)}${L.soli || V.soli ? row("Solidaritätszuschlag", -L.soli, -V.soli) : ""}${L.kist || V.kist ? row("Kirchensteuer", -L.kist, -V.kist) : ""}
        ${row("Kranken- und Pflegeversicherung", -r2(L.sv.kv + L.sv.zb + L.sv.pv), -r2(V.sv.kv + V.sv.zb + V.sv.pv))}${row("Arbeitslosenversicherung", -L.sv.av, -V.sv.av)}
        ${L.sv.bve || V.sv.bve ? row("Versorgungswerk (dein Anteil)", -r2(L.sv.bve - L.sv.bveZuschuss), -r2(V.sv.bve - V.sv.bveZuschuss)) : row("Rentenversicherung", -L.sv.rv, -V.sv.rv)}
        ${row("Zusatzversorgung (Eigenbeitrag)", -L.zv, -V.zv)}
        ${S.set.entgeltumwandlung ? row("Entgeltumwandlung", -(+S.set.entgeltumwandlung), null) : ""}${S.set.vwlSparrate ? row("VL-Sparrate", -(+S.set.vwlSparrate), null) : ""}${S.set.agZuschussFrei ? row("Steuerfreier Zuschuss", +S.set.agZuschussFrei, null) : ""}
        <tr class="sum"><td>Auszahlung</td><td>${eur(L.ausz)}</td><td>${eur(V.ausz)}</td></tr></tbody></table></div>
        <p class="hint">Lohnsteuer nach dem Programmablaufplan 2026 des BMF. Die Zulagen der Vormonate werden wie auf der Gehaltsmitteilung im Arbeitsmonat aufgerollt, das Zeitguthaben läuft als sonstiger Bezug.${nt.nnlFrom ? ` Die SV-pflichtige ZV-Umlage ist aus der Abrechnung ${abrName(nt.nnlFrom)} übernommen.` : ""}${nt.paramsJahr ? " Für 2027 sind noch die Steuer- und Beitragswerte 2026 hinterlegt (anpassbar unter „Tarifwerte“)." : ""}</p></details></div>`;
  }
  $("brutto").hidden = bz;
  $("brutto").innerHTML = bz ? "" : `<span class="eyebrow">Erwartetes Gesamtbrutto ${abrName(S.cur)}</span>
    <span class="big">${eur(r2(lfd + vor))}</span>
    <div class="parts"><span>lfd. Monat <b>${eur(lfd)}</b></span><span>Vormonate <b>${eur(vor)}</b></span></div>${netHtml}`;

  const msgs = own.msgs.slice(); if (!saveOk) msgs.unshift({ lvl: "warn", t: "Speichern ist in diesem Browser nicht möglich. Die Daten gehen beim Schließen verloren." });
  $("warnings").innerHTML = msgs.map(m => `<div class="msg ${m.lvl}">${esc(m.t)}</div>`).join("");
  $("warnings").hidden = !msgs.length;

  const chip = { ok: "geprüft", bad: "weicht ab", open: "ungeprüft" };
  $("result").innerHTML = bz ? `<div class="row open"><div class="lbl">Dieser Monat zählt nur für Dienste, Nachtstunden und die BD-Regeln. Die Gehaltsmitteilung wird nicht geprüft (Einstellung in Abschnitt 2).</div></div>` : rows.length ? rows.map(r => {
    const notes = r.notes.map(n => typeof n === "string" ? `<div class="note">${esc(n)}</div>` : `<div class="note ${n.bad ? "bad" : ""}">${esc(n.t)}</div>`).join("");
    const amts = r.p.kind === "open"
      ? `<span><i>Abrechnung</i> ${eur(r.aB)}</span>${r.q != null ? `<span><i>Vivendi</i> ${de(r.q)} ${r.p.unit}</span>` : ""}`
      : `<span><i>Erwartet</i> ${eur(r.exp)}</span><span><i>Abrechnung</i> ${eur(r.aB)}</span>${r.aB != null && r.exp != null && Math.abs(r.aB - r.exp) > 0.02 ? `<span style="color:var(--bad)"><i>Diff.</i> ${de(r2(r.aB - r.exp))} €</span>` : ""}`;
    const shown = r.aB != null ? r.aB : r.exp, diff = r.aB != null && r.exp != null && Math.abs(r.aB - r.exp) > 0.02 ? r2(r.aB - r.exp) : null;
    return `<details class="row ${r.status}" data-key="${r.p.key}" ${openRows.has(r.p.key) ? "open" : ""}><summary class="rsum"><span class="lbl">${esc(r.p.label)}</span><span class="val">${shown == null ? "–" : eur(shown)}${diff != null ? `<small class="d">${diff > 0 ? "+" : ""}${de(diff)} €</small>` : ""}</span><span class="chip ${r.status}">${chip[r.status]}</span></summary>
      <div class="rdet"><div class="code">${esc(r.p.code)}</div><div class="amts">${amts}</div>${r.formula ? `<div class="note mono">${esc(r.formula)}</div>` : ""}${notes}</div></details>`;
  }).join("") : `<div class="row open"><div class="lbl">Keine Posten gefunden.</div></div>`;

  const unknown = viv.lohnarten.filter(l => !knownLa(l.name));
  $("vivShort").textContent = `${MONATE[viv.monat - 1]} ${viv.jahr}`;
  $("vivStatus").hidden = false; $("vivStatus").className = "status";
  $("vivStatus").innerHTML = `${MONATE[viv.monat - 1]} ${viv.jahr} · ${viv.tage.length} Tage · ${own.dienste.length} Bereitschaftsdienste · ${viv.lohnarten.length} Lohnarten${unknown.length ? `<br>Noch nicht zugeordnet: ${unknown.map(l => esc(l.name) + " (" + de(l.menge) + ")").join(", ")}` : ""}`;
  $("abrShort").textContent = abrName(S.cur);

  const laV = n => { const x = viv.lohnarten.find(l => l.name === n); return x ? x.menge : null; };
  const cmpLine = (lbl, mine, vv, u = "Std") => vv == null ? `<div>${lbl}: nachgezählt ${de(mine)} ${u}, in Vivendi keine Lohnart</div>`
    : `<div class="${Math.abs(mine - vv) > 0.01 ? "bad" : "ok"}">${lbl}: nachgezählt ${de(mine)} ${u} · Vivendi ${de(vv)} ${u}</div>`;
  const fnbPrev = viv.tage.filter(t => t.fnbPrev);
  $("ownShort").textContent = own.dienste.length ? `${own.dienste.length} BD` : "";
  $("ownBody").innerHTML = `
    ${own.dienste.length ? `<div class="tbl"><table>
      <thead><tr><th>BD-Beginn</th><th>Stufe</th><th>Bewertung</th><th>&lt;72 Std geändert</th><th>Bereitschaft</th><th>22–2 Uhr</th><th>2–6 Uhr</th><th>Feiertag</th><th>Freizeitausgleich</th><th>Abzug</th></tr></thead>
      <tbody>${own.dienste.map(d => `<tr><td>${d.wd} ${dm(d.date)}</td><td>${d.stufe || "–"}</td><td>${d.factor} %${d.extra ? " ↑" : ""}</td><td class="l">${d.kurzAuto ? "ja (VZ 2)" : `<input type="checkbox" class="kz" id="kz-${iso(d.date)}" data-d="${iso(d.date)}" ${d.kurz ? "checked" : ""} aria-label="BD am ${dm(d.date)} kurzfristig geändert">`}</td><td>${de(d.bereit)}</td><td>${de(d.na1)}</td><td>${de(d.na2)}</td><td>${d.ftH ? de(d.ftH) : "–"}</td><td class="${d.fza === "fehlt" ? "v bad" : ""}">${esc(d.fza)}</td><td>${d.abzug ? "−" + de(d.abzug) : "–"}</td></tr>`).join("")}
      ${fnbPrev.map(t => `<tr><td>Vormonat</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>am ${dm(t.date)}</td><td>−${de(t.fnbH)}</td></tr>`).join("")}
      <tr class="sum"><td>Summe</td><td></td><td></td><td></td><td>${de(own.bdRoh)}</td><td>${de(own.na1)}</td><td>${de(own.na2)}</td><td>${own.dienste.some(d => d.ftH) ? de(own.dienste.reduce((x, d) => x + d.ftH, 0)) : "–"}</td><td></td><td>−${de(own.fza)}</td></tr></tbody>
    </table></div>` : `<p class="hint">Keine Bereitschaftsdienste in diesem Monat.</p>`}
    <div class="cmp">
      ${cmpLine("Bereitschaft bezahlt (gewertet)", own.bdW, laV("BD"))}
      ${cmpLine("Nacht 22–2 Uhr", own.na1, laV("Na 1 BD"))}
      ${cmpLine("Nacht 2–6 Uhr", own.na2, laV("Na 2 BD"))}
      ${cmpLine("Sonntag (Vollarbeit)", own.so, laV("So"))}
      ${cmpLine("Urlaubstage", own.urlaub, laV("U"), "Tage")}
      ${own.ft ? `<div>Feiertag (Vollarbeit): ${de(own.ft)} Std</div>` : ""}
      ${own.nacht ? `<div>Nachtarbeit außerhalb BD: ${de(own.nacht)} Std</div>` : ""}
      ${own.x2412 ? `<div>24./31.12. ab 6 Uhr: ${de(own.x2412)} Std</div>` : ""}
      ${own.krank ? `<div>Krankheitstage: ${own.krank}</div>` : ""}
    </div>
    <p class="hint">Freizeitausgleich nach BD wird dort abgezogen, wo Vivendi ihn einträgt, auch im Folgemonat. Sonntag, Feiertag und Nacht zählen nur bei Vollarbeit, und davon nur der höchste Zuschlag. Feiertage: Niedersachsen. Bewertung: Stufe I 70 %, II 85 %, III 100 %, ↑ = +10 Punkte ab dem 16. BD in 3 Monaten. „&lt;72 Std geändert“: BD, die weniger als 72 Std vorher in den Plan kamen oder geändert wurden, zählen laut Dienstvereinbarung 10 Punkte mehr. Bei VZ 2a/2b setzt die App das automatisch.</p>`;

  buildCodes(); buildHist();
  const keys = Object.keys(S.months).sort();
  $("monthSel").innerHTML = keys.slice().reverse().map(k => `<option value="${k}" ${k === S.cur ? "selected" : ""}>Abrechnung ${abrName(k)} · Arbeitsmonat ${monthName(k)}</option>`).join("");
  $("prevM").disabled = keys.indexOf(S.cur) <= 0; $("nextM").disabled = keys.indexOf(S.cur) >= keys.length - 1;
}
function goMonth(k) { if (!k || !S.months[k]) return; S.cur = k; save(); delArm.clear(); buildAbr(); render(); $("ocrResult").hidden = true; $("ocrStatus").hidden = true; }

// ---------- Vivendi ----------
function quickMsg(t, err) { const q = $("quickStatus"); q.hidden = false; q.className = "status" + (err ? " err" : ""); q.textContent = t; }
function loadViv(text) {
  const p = parseVivendi(text);
  if (!p.jahr) { quickMsg("Monat konnte nicht erkannt werden. Ist das die Einzelabrechnung aus Vivendi?", true); return; }
  const key = monthKey(p.jahr, p.monat); const old = S.months[key];
  S.months[key] = Object.assign({ abr: {} }, old || {}, { vivText: text });
  let extra = "";
  if (S.pendingAbr && S.pendingAbr[key]) { S.months[key].abr = Object.assign({}, S.months[key].abr || {}, S.pendingAbr[key]); delete S.pendingAbr[key]; extra = ` Die schon fotografierte Abrechnung ${abrName(key)} ist jetzt zugeordnet.`; }
  S.cur = key;
  quickMsg(`Vivendi ${monthName(key)} geladen${old ? " (ersetzt)" : ""}. Zugehörige Abrechnung: ${abrName(key)}.${extra}`);
  if (p.wochenStd) S.set.woStd = p.wochenStd; if (p.tagStd) S.set.tagStd = p.tagStd;
  save(); buildSettings(); buildAbr(); render();
  $("sec-viv").open = false; window.scrollTo({ top: 0, behavior: "smooth" });
}
async function pdfToText(file) {
  if (!window.pdfjsLib) throw new Error("PDF-Leser nicht geladen. Beim ersten Mal ist eine Internetverbindung nötig.");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent(); const lines = new Map();
    for (const it of c.items) { if (!it.str) continue; const y = Math.round(it.transform[5] / 2) * 2; if (!lines.has(y)) lines.set(y, []); lines.get(y).push(it); }
    [...lines.keys()].sort((a, b) => b - a).forEach(y => out.push(lines.get(y).sort((a, b) => a.transform[4] - b.transform[4]).map(x => x.str).join(" ").replace(/\s+/g, " ").trim()));
  }
  return out.join("\n");
}
$("pdfBtn").addEventListener("click", () => $("pdf").click());
$("quickPdf").addEventListener("click", () => $("pdf").click());
$("pdf").addEventListener("change", async e => {
  const files = [...e.target.files]; if (!files.length) return;
  quickMsg("PDF wird gelesen …");
  for (const f of files) {
    try { const t = await pdfToText(f); $("vivText").value = t; loadViv(t); }
    catch (err) { quickMsg("Das PDF ließ sich nicht lesen (" + err.message + "). Unter „1 · Vivendi-Monatsauswertung“ kannst du den Text auch einfügen.", true); }
  }
  e.target.value = "";
});
$("useText").addEventListener("click", () => loadViv($("vivText").value));

// ---------- Gehaltsmitteilung per Foto ----------
const OCR_LABEL = Object.assign(Object.fromEntries(POSTEN.map(p => [p.key, p.label])), { netLfd: "Auszahlung lfd. Monat", netVor: "Auszahlung Vormonate", nnlL: "SV-pflichtige ZV-Umlage lfd.", nnlV: "SV-pflichtige ZV-Umlage Vormonate", summeLfd: "Summe lfd. Monat" });
let ocrPending = null;
const OCR_ORDER = ["grund", "kinder", "sz", "zg", "uezz", "so", "ft", "nacht", "x2412", "na1", "na2", "bd", "bdzz", "ftbd", "vtz", "nef", "url", "krank", "nnlL", "nnlV", "netLfd", "netVor"];
let ocrTarget = null;
$("photoBtn").addEventListener("click", () => $("photo").click());
$("camBtn").addEventListener("click", () => $("photoCam").click());
$("photoCam").addEventListener("change", e => onPhoto(e));
$("photo").addEventListener("change", e => onPhoto(e));
async function onPhoto(e) {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  const st = $("ocrStatus"); st.hidden = false; st.className = "status"; $("ocrResult").hidden = true; $("quickStatus").hidden = true;
  try {
    const r = await PayslipOCR.readPayslip(f, t => { st.textContent = t; });
    ocrPending = r;
    // Arbeitsmonat = Abrechnungsmonat − 2
    ocrTarget = { key: S.cur, pending: false, known: false };
    if (r.monatKey) { const w = neighbour(r.monatKey, -2); ocrTarget = { key: w, pending: !S.months[w] || !S.months[w].vivText, known: true }; if (!ocrTarget.pending && w !== S.cur) { goMonth(w); st.hidden = false; } }
    const tgtHtml = r.monatKey
      ? `<div class="msg ${ocrTarget.pending ? "" : "good"}">Gehaltsmitteilung für <b>${esc(monthName(r.monatKey))}</b> erkannt, gehört zum Arbeitsmonat <b>${esc(monthName(ocrTarget.key))}</b>.${ocrTarget.pending ? ` Für diesen Monat ist noch kein Vivendi-PDF geladen. Die Werte werden gespeichert und zugeordnet, sobald du es lädst.` : ""}</div>`
      : `<label class="f">Monat nicht erkannt. Gehaltsmitteilung für<select id="ocrMonth">${Object.keys(S.months).sort().reverse().map(k => `<option value="${k}" ${k === S.cur ? "selected" : ""}>${abrName(k)} (Arbeitsmonat ${monthName(k)})</option>`).join("")}</select></label>`;
    const keys = OCR_ORDER.filter(k => r.abr[k]);
    if (!keys.length) { st.className = "status err"; st.textContent = "Es wurden keine Posten erkannt. Versuch ein Foto von oben bei gutem Licht, das ganze Blatt im Bild, oder trag die Werte von Hand ein."; return; }
    const unsure = keys.filter(k => !r.abr[k].sure);
    st.textContent = `${keys.length} Posten erkannt${r.passes > 1 ? ` (${r.passes} Lesedurchgänge)` : ""}. ` + (unsure.length ? `${unsure.length} davon unsicher, bitte mit dem Papier vergleichen und bei Bedarf korrigieren.` : "Alle Werte sind durch Rechnung oder Summen bestätigt.");
    // Posten, die laut Vivendi zu erwarten wären, aber nicht gelesen wurden
    let missing = [];
    try { const ev = !ocrTarget.pending && ocrTarget.key && S.months[ocrTarget.key] && !S.months[ocrTarget.key].bz ? evalMonth(ocrTarget.key) : null; if (ev) missing = ev.rows.filter(x => x.exp != null && x.exp > 0 && !r.abr[x.p.key] && OCR_ORDER.includes(x.p.key)).map(x => x.p.key); } catch (e) {}
    missing.forEach(k => { r.abr[k] = { m: "", b: "", sure: false, missing: true }; });
    const shown = OCR_ORDER.filter(k => r.abr[k]);
    const c = r.check;
    const sumTxt = c.summeVor != null ? (c.okVor ? `<div class="msg good">Summe der Vormonate ${eur(c.summeVor)} passt zu den erkannten Posten.</div>` : `<div class="msg warn">Erkannte Posten ergeben ${eur(c.sumVor)}, auf der Gehaltsmitteilung steht als Summe der Vormonate ${eur(c.summeVor)}. Ein Posten fehlt oder ist falsch gelesen.</div>`) : `<div class="msg">Die Summe der Vormonate („Summe Gesamtbrutto“) war nicht lesbar.</div>`;
    $("ocrResult").innerHTML = `${tgtHtml}${sumTxt}${missing.length ? `<div class="msg warn">Nicht gelesen, laut Vivendi aber zu erwarten: ${esc(missing.map(k => OCR_LABEL[k] || k).join(", "))}. Die Felder sind unten leer, bitte von Hand eintragen.</div>` : ""}
      <div class="ocrlist" style="margin-top:8px"><span class="h eyebrow">Posten</span><span class="h eyebrow r">Menge</span><span class="h eyebrow r">Betrag €</span>
      ${shown.map(k => { const v = r.abr[k], noM = ["grund", "kinder", "sz", "netLfd", "netVor", "nnlL", "nnlV"].includes(k);
        return `<span class="${v.sure ? "" : "unsure"}">${v.sure ? "✓" : "⚠"} ${esc(OCR_LABEL[k] || k)}${v.guessed ? " <small class=muted>(vermutet)</small>" : ""}${v.missing ? " <small class=muted>(nicht gelesen)</small>" : ""}</span>
        ${noM ? "<span></span>" : `<input class="num" inputmode="decimal" data-om="${k}" value="${esc(v.m || "")}" aria-label="${esc(OCR_LABEL[k] || k)} Menge">`}
        <input class="num ${v.sure ? "" : "unsure"}" inputmode="decimal" data-ob="${k}" value="${esc(v.b || "")}" aria-label="${esc(OCR_LABEL[k] || k)} Betrag">`; }).join("")}</div>
      <p class="hint">✓ bestätigt (Satz × Menge oder Summe stimmt) · ⚠ unsicher, bitte prüfen. Du kannst jeden Wert hier direkt ändern.</p>
      <div class="btns" style="margin-top:8px"><button type="button" id="ocrApply">Werte übernehmen</button><button type="button" class="sec" id="ocrDiscard">Verwerfen</button></div>`;
    $("ocrResult").hidden = false;
  } catch (err) { st.className = "status err"; st.textContent = "Das Foto ließ sich nicht auswerten: " + err.message; }
}
$("ocrResult").addEventListener("click", e => {
  if (e.target.id === "ocrDiscard") { $("ocrResult").hidden = true; $("ocrStatus").hidden = true; ocrPending = null; }
  if (e.target.id === "ocrApply" && ocrPending) {
    const sel = $("ocrMonth"); if (sel) ocrTarget = { key: sel.value, pending: false };
    const vals = {};
    $("ocrResult").querySelectorAll("[data-ob]").forEach(el => { const k = el.dataset.ob, m = $("ocrResult").querySelector(`[data-om="${k}"]`); if (!el.value.trim()) return; vals[k] = { m: m ? m.value : "", b: el.value.trim() }; });
    ocrPending = null; $("ocrResult").hidden = true;
    if (ocrTarget.pending || !S.months[ocrTarget.key]) {
      S.pendingAbr = S.pendingAbr || {}; S.pendingAbr[ocrTarget.key] = vals; save();
      $("ocrStatus").className = "status"; $("ocrStatus").textContent = `Gespeichert. Lade das Vivendi-PDF für ${monthName(ocrTarget.key)}, dann wird die Abrechnung automatisch zugeordnet.`;
      return;
    }
    const target = ocrTarget.key, abr = Object.assign({}, S.months[target].abr || {});
    for (const [k, v] of Object.entries(vals)) abr[k] = { m: v.m || ((abr[k] || {}).m || ""), b: v.b };
    S.months[target].abr = abr; save();
    if (target !== S.cur) goMonth(target); else { buildAbr(); render(); }
    $("ocrStatus").hidden = false; $("ocrStatus").className = "status"; $("ocrStatus").textContent = `Werte übernommen für Abrechnung ${abrName(target)}.`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ---------- Weitere Bedienelemente ----------
$("monthSel").addEventListener("change", e => goMonth(e.target.value));
$("prevM").addEventListener("click", () => { const k = Object.keys(S.months).sort(); goMonth(k[k.indexOf(S.cur) - 1]); });
$("nextM").addEventListener("click", () => { const k = Object.keys(S.months).sort(); goMonth(k[k.indexOf(S.cur) + 1]); });
$("ownBody").addEventListener("change", e => { const d = e.target.dataset.d; if (!d) return; const m = S.months[S.cur]; m.kurz = m.kurz || {}; if (e.target.checked) m.kurz[d] = true; else delete m.kurz[d]; save(); render(); });
$("clearAbr").addEventListener("click", () => { S.months[S.cur].abr = {}; save(); buildAbr(); render(); });
$("abrForm").addEventListener("input", () => { readAbr(); render(); });
["netLfd", "netVor", "nnlL", "nnlV"].forEach(id => $(id).addEventListener("input", () => { readAbr(); render(); }));
$("planSpaet").addEventListener("change", e => { S.months[S.cur].planSpaet = e.target.checked; save(); render(); });
$("bzMonth").addEventListener("change", e => { S.months[S.cur].bz = e.target.checked; save(); render(); });
$("nefSammeln").addEventListener("change", e => { S.months[S.cur].nefSammeln = e.target.checked; save(); render(); });
$("nefEinsaetze").addEventListener("input", e => { const v = e.target.value.trim(); if (v === "") delete S.months[S.cur].nefEinsaetze; else S.months[S.cur].nefEinsaetze = Math.max(0, Math.round(num(v) ?? 0)); save(); render(); });

// ---------- Sicherung ----------
function backupJson() { return JSON.stringify({ app: "abrechnungscheck", version: 3, exportiert: new Date().toISOString(), set: S.set, codes: S.codes, months: S.months, urlBase: S.urlBase, tarif: S.tarif, pendingAbr: S.pendingAbr || {} }); }
function importJson(txt) {
  const d = JSON.parse(txt);
  if (!d || d.app !== "abrechnungscheck" || !d.months) throw new Error("keine Sicherung");
  Object.assign(S.months, d.months); Object.assign(S.codes, d.codes || {}); Object.assign(S.urlBase, d.urlBase || {}); if (d.pendingAbr) S.pendingAbr = Object.assign(S.pendingAbr || {}, d.pendingAbr);
  if (d.set) S.set = Object.assign({}, S.set, d.set, { setupDone: true });
  if (d.tarif) { S.tarif = d.tarif; setTarif(S.tarif); }
  if (!S.months[S.cur]) S.cur = Object.keys(S.months).sort().pop() || null;
  save(); buildSettings(); buildTarif(); buildAbr(); render();
  return Object.keys(d.months).length;
}
const bkStatus = (t, err) => { const s = $("backupStatus"); s.hidden = false; s.className = "status" + (err ? " err" : ""); s.textContent = t; };
$("openBackup").addEventListener("click", () => { $("backupStatus").hidden = true; $("backupDlg").showModal(); });
$("closeBackup").addEventListener("click", () => $("backupDlg").close());
$("welcomeImport").addEventListener("click", () => { $("backupStatus").hidden = true; $("backupDlg").showModal(); });
$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([backupJson()], { type: "application/json" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `abrechnungscheck-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  bkStatus(`Sicherung mit ${Object.keys(S.months).length} Monaten gespeichert.`);
});
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try { const n = importJson(await f.text()); bkStatus(`${n} Monate importiert.`); } catch (err) { bkStatus("Das ist keine gültige Sicherungsdatei.", true); }
});
$("copyBackup").addEventListener("click", () => {
  const t = backupJson(); $("backup").value = t; $("backup").select();
  try { navigator.clipboard.writeText(t).then(() => bkStatus("Sicherung in die Zwischenablage kopiert."), () => bkStatus("Text markiert, bitte selbst kopieren.")); } catch (e) { bkStatus("Text markiert, bitte selbst kopieren."); }
});
$("pasteImport").addEventListener("click", () => { try { const n = importJson($("backup").value); bkStatus(`${n} Monate importiert.`); } catch (e) { bkStatus("Der Text ist keine gültige Sicherung.", true); } });
let wipeArm = false;
$("wipeBtn").addEventListener("click", () => {
  if (!wipeArm) { wipeArm = true; $("wipeBtn").textContent = "Wirklich alles löschen?"; return; }
  try { localStorage.removeItem(KEY); } catch (e) {}
  S = loadState(); setTarif(null); wipeArm = false; $("wipeBtn").textContent = "Alles löschen";
  buildSettings(); buildTarif(); render(); bkStatus("Alle Daten gelöscht.");
});

// ---------- Tarif-Editor ----------
const STD_COLS = [["std", "Stundenentgelt"], ["so", "Sonntag"], ["ft", "Feiertag"], ["x2412", "24./31.12."], ["nacht", "Nacht"], ["bdz", "BD-Zuschlag"], ["bdStd", "BD-Stunde A II–IV"]];
let tarifIdx = null;
function curTarifData() { return S.tarif ? S.tarif : JSON.parse(JSON.stringify(DEFAULT_TARIF)); }
function buildTarifShort() { $("tarifShort").textContent = `${TARIF.length} Stichtage${S.tarif ? " · angepasst" : ""}`; }
function buildTarif() {
  const d = curTarifData(); const list = d.tarif.slice().sort((a, b) => a.ab < b.ab ? -1 : 1);
  if (tarifIdx == null || tarifIdx >= list.length) tarifIdx = list.length - 1;
  const t = list[tarifIdx];
  const inp = (path, v) => `<input class="num" inputmode="decimal" data-tp="${path}" value="${v == null ? "" : esc(de(v))}">`;
  const maxSt = Math.max(...GRUPPEN.map(g => (t.monat[g] || []).length));
  const maxUe = Math.max(...GRUPPEN.map(g => ((t.ue || {})[g] || []).length));
  $("tarifBody").innerHTML = `
    <p class="hint">Hier stehen die Werte aus dem TV DN. Wenn neue Tabellen kommen (z. B. nach Tarifverhandlungen), leg einen neuen Stichtag an und trag die Werte ein. Es gilt jeweils der letzte Stichtag vor dem Arbeitsmonat.</p>
    <div class="inline">
      <label class="f" for="tarifSel">Gültig ab<select id="tarifSel">${list.map((x, i) => `<option value="${i}" ${i === tarifIdx ? "selected" : ""}>${x.ab.split("-").reverse().join(".")}</option>`).join("")}</select></label>
      <label class="f" for="tarifNew">Neuer Stichtag<input type="date" id="tarifNew"></label>
      <div class="btns"><button type="button" class="sec small" id="tarifAdd">Als Kopie anlegen</button><button type="button" class="danger small" id="tarifDel">Stichtag löschen</button></div>
    </div>
    <h3 class="eyebrow" style="margin:0">Monatsentgelt (Vollzeit)</h3>
    <div class="tbl"><table class="edit"><thead><tr><th>Gruppe</th>${Array.from({ length: maxSt }, (_, i) => `<th>Stufe ${i + 1}</th>`).join("")}</tr></thead><tbody>
      ${GRUPPEN.map(g => `<tr><td>${g}</td>${Array.from({ length: maxSt }, (_, i) => `<td>${(t.monat[g] || [])[i] != null || i < (t.monat[g] || []).length ? inp(`monat.${g}.${i}`, t.monat[g][i]) : ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <h3 class="eyebrow" style="margin:0">Stundenentgelt und Zeitzuschläge je Stunde (Tabelle 1a)</h3>
    <div class="tbl"><table class="edit"><thead><tr><th>Gruppe</th>${STD_COLS.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>
      ${GRUPPEN.map(g => `<tr><td>${g}</td>${STD_COLS.map(([k]) => `<td>${inp(`std.${g}.${k}`, (t.std[g] || {})[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <h3 class="eyebrow" style="margin:0">Überstunden-Zuschlag je Stunde (Tabelle 1b)</h3>
    <div class="tbl"><table class="edit"><thead><tr><th>Gruppe</th>${Array.from({ length: maxUe }, (_, i) => `<th>Stufe ${i + 1}</th>`).join("")}</tr></thead><tbody>
      ${GRUPPEN.map(g => `<tr><td>${g}</td>${Array.from({ length: maxUe }, (_, i) => `<td>${i < ((t.ue || {})[g] || []).length ? inp(`ue.${g}.${i}`, t.ue[g][i]) : ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="inline"><label class="f">Sonntagszuschlag (Text)<input data-tp="pct.so" value="${esc((t.pct || {}).so || "")}"></label><label class="f">Nachtzuschlag (Text)<input data-tp="pct.nacht" value="${esc((t.pct || {}).nacht || "")}"></label></div>
    <h3 class="eyebrow" style="margin:0">Schichtzulage und Kinderzulage (Vollzeit, € je Monat)</h3>
    <div class="tbl"><table class="edit"><thead><tr><th>Gültig ab</th><th>Schicht 18 Std</th><th>Schicht 13 Std</th></tr></thead><tbody>
      ${d.schicht.map((s, i) => `<tr><td><input type="date" data-tl="schicht.${i}.ab" value="${s.ab}"></td><td><input class="num" data-tl="schicht.${i}.18" value="${esc(de(s["18"]))}"></td><td><input class="num" data-tl="schicht.${i}.13" value="${esc(de(s["13"]))}"></td></tr>`).join("")}</tbody></table></div>
    <div class="tbl"><table class="edit"><thead><tr><th>Gültig ab</th><th>Kinderzulage je Kind</th></tr></thead><tbody>
      ${d.kinder.map((s, i) => `<tr><td><input type="date" data-tl="kinder.${i}.ab" value="${s.ab}"></td><td><input class="num" data-tl="kinder.${i}.v" value="${esc(de(s.v))}"></td></tr>`).join("")}</tbody></table></div>
    <div class="tbl"><table class="edit"><thead><tr><th>Gültig ab</th><th>Einsatzzuschlag Rettungsdienst je Einsatz</th></tr></thead><tbody>
      ${(d.nef || DEFAULT_TARIF.nef).map((x, i) => `<tr><td><input type="date" data-tl="nef.${i}.ab" value="${x.ab}"></td><td><input class="num" data-tl="nef.${i}.v" value="${esc(de(x.v))}"></td></tr>`).join("")}</tbody></table></div>
    <div class="btns"><button type="button" class="sec small" data-addrow="schicht">Zeile Schichtzulage</button><button type="button" class="sec small" data-addrow="kinder">Zeile Kinderzulage</button><button type="button" class="sec small" data-addrow="nef">Zeile Einsatzzuschlag</button></div>
    <h3 class="eyebrow" style="margin:0">Vertretungszuschlag (€) und BD-Bewertung (%)</h3>
    <div class="inline">${Object.entries(d.vz).map(([k, v]) => `<label class="f">VZ ${esc(k)}<input class="num" data-tl="vz.${k}" value="${esc(de(v))}"></label>`).join("")}</div>
    <div class="inline">${Object.entries(d.bdStufe).map(([k, v]) => `<label class="f">BD Stufe ${esc(k)}<input class="num" data-tl="bdStufe.${k}" value="${esc(de(v, 0))}"></label>`).join("")}</div>
    <h3 class="eyebrow" style="margin:0">Steuer und Sozialversicherung</h3>
    <p class="hint">Lohnsteuer und Beitragsgrenzen sind für 2026 hinterlegt. Wenn sich die Werte ändern, kannst du ein Jahr kopieren und anpassen.</p>
    ${steuerEditor()}
    <div class="btns">${S.tarif ? `<button type="button" class="danger small" id="tarifReset">Alle Tarifwerte auf Standard zurücksetzen</button>` : ""}</div>`;
}
function steuerEditor() {
  const P = Lohnsteuer.PARAM, SVP = Netto.SV;
  const years = Object.keys(P).sort();
  const lbl = { GFB: "Grundfreibetrag", Z2: "Ende Zone 2", Z3: "Ende Zone 3", Z4: "Ende Zone 4", A2: "Faktor A2", B2: "Faktor B2", A3: "Faktor A3", B3: "Faktor B3", C3: "Konstante C3", C4: "Abzug Zone 4", C5: "Abzug Zone 5", BBGRV: "BBG RV Jahr", BBGKV: "BBG KV Jahr", RVSATZ: "RV-Satz AN (Anteil)", AVSATZ: "AV-Satz AN (Anteil)", SOLZFREI: "Soli-Freigrenze", KFB: "Kinderfreibetrag je Kind", EFA: "Entlastungsbetrag Alleinerz.", ANP: "AN-Pauschbetrag", SAP: "Sonderausgaben-Pausch.", W1: "Grenze W1 (StKl V/VI)", W2: "Grenze W2", W3: "Grenze W3" };
  const svl = { BBGKV: "BBG KV Monat", BBGRV: "BBG RV Monat", KV: "KV-Satz AN %", AV: "AV-Satz AN %" };
  return years.map(y => `<details><summary class="muted" style="cursor:pointer">Lohnsteuer ${y}</summary><div class="inline" style="margin-top:8px">${Object.entries(P[y]).map(([k, v]) => `<label class="f">${lbl[k] || k}<input class="num" data-ls="${y}.${k}" value="${esc(String(v).replace(".", ","))}"></label>`).join("")}</div></details>`).join("")
    + Object.keys(SVP).sort().map(y => `<details><summary class="muted" style="cursor:pointer">Sozialversicherung ${y}</summary><div class="inline" style="margin-top:8px">${Object.entries(SVP[y]).map(([k, v]) => `<label class="f">${svl[k] || k}<input class="num" data-sv="${y}.${k}" value="${esc(String(v).replace(".", ","))}"></label>`).join("")}</div></details>`).join("")
    + `<div class="inline"><label class="f">Neues Jahr<input class="num" inputmode="numeric" id="ptYear" placeholder="${+years[years.length - 1] + 1}"></label><div class="btns"><button type="button" class="sec small" id="ptAdd">Steuer- und SV-Werte für dieses Jahr anlegen (Kopie)</button></div></div>`;
}
function saveTarif(d) { S.tarif = d; setTarif(d); save(); buildTarif(); render(); }
$("tarifBody").addEventListener("change", e => {
  const el = e.target;
  if (el.id === "tarifSel") { tarifIdx = +el.value; buildTarif(); return; }
  const d = curTarifData(); d.tarif.sort((a, b) => a.ab < b.ab ? -1 : 1);
  if (el.dataset.tp) {
    const t = d.tarif[tarifIdx], [a, b, c] = el.dataset.tp.split(".");
    if (a === "pct") { t.pct = t.pct || {}; t.pct[b] = el.value; }
    else { const v = num(el.value); if (a === "monat" || a === "ue") t[a][b][+c] = v; else { t.std[b] = t.std[b] || {}; t.std[b][c] = v; } }
    saveTarif(d); return;
  }
  if (el.dataset.tl) {
    const [a, b, c] = el.dataset.tl.split(".");
    if (a === "vz" || a === "bdStufe") d[a][b] = num(el.value) ?? 0;
    else { if (!d[a]) d[a] = JSON.parse(JSON.stringify(DEFAULT_TARIF[a])); d[a][+b][c] = c === "ab" ? el.value : num(el.value); }
    saveTarif(d); return;
  }
  if (el.dataset.ls) { const [y, k] = el.dataset.ls.split("."); Lohnsteuer.PARAM[y][k] = num(el.value) ?? 0; S.steuer = { ls: Lohnsteuer.PARAM, sv: Netto.SV }; save(); render(); return; }
  if (el.dataset.sv) { const [y, k] = el.dataset.sv.split("."); Netto.SV[y][k] = num(el.value) ?? 0; S.steuer = { ls: Lohnsteuer.PARAM, sv: Netto.SV }; save(); render(); }
});
$("tarifBody").addEventListener("click", e => {
  const id = e.target.id;
  if (id === "tarifAdd") {
    const v = $("tarifNew").value; if (!v) { $("tarifNew").focus(); return; }
    const d = curTarifData(); d.tarif.sort((a, b) => a.ab < b.ab ? -1 : 1);
    if (d.tarif.some(t => t.ab === v)) return;
    const copy = JSON.parse(JSON.stringify(d.tarif[tarifIdx])); copy.ab = v; d.tarif.push(copy); d.tarif.sort((a, b) => a.ab < b.ab ? -1 : 1);
    tarifIdx = d.tarif.findIndex(t => t.ab === v); saveTarif(d);
  }
  if (id === "tarifDel") { const d = curTarifData(); if (d.tarif.length < 2) return; d.tarif.sort((a, b) => a.ab < b.ab ? -1 : 1); d.tarif.splice(tarifIdx, 1); tarifIdx = Math.max(0, tarifIdx - 1); saveTarif(d); }
  if (id === "tarifReset") { S.tarif = null; setTarif(null); tarifIdx = null; save(); buildTarif(); render(); }
  if (e.target.dataset.addrow) { const d = curTarifData(), k = e.target.dataset.addrow; if (!d[k]) d[k] = JSON.parse(JSON.stringify(DEFAULT_TARIF[k])); const last = d[k][d[k].length - 1]; d[k].push(Object.assign({}, last, { ab: "" })); saveTarif(d); }
  if (id === "ptAdd") {
    const y = String(Math.round(num($("ptYear").value) || 0)); if (!/^\d{4}$/.test(y) || Lohnsteuer.PARAM[y]) return;
    const ly = Object.keys(Lohnsteuer.PARAM).sort().pop(), sy = Object.keys(Netto.SV).sort().pop();
    Lohnsteuer.PARAM[y] = Object.assign({}, Lohnsteuer.PARAM[ly]); Netto.SV[y] = Object.assign({}, Netto.SV[sy]);
    S.steuer = { ls: Lohnsteuer.PARAM, sv: Netto.SV }; save(); buildTarif(); render();
  }
});
if (S.steuer) { Object.assign(Lohnsteuer.PARAM, S.steuer.ls || {}); Object.assign(Netto.SV, S.steuer.sv || {}); }

// ---------- Einrichtungs-Dialog ----------
const WZ = [
  { t: "Willkommen", html: () => `<p>In ein paar Schritten richtest du den Abrechnungscheck für dich ein. Du brauchst dazu eine aktuelle <b>Gehaltsmitteilung</b>, dort stehen fast alle Angaben.</p><div class="help">Alles bleibt auf diesem Gerät. Wenn du etwas nicht weißt, lass den Vorschlag stehen. Du kannst alles später unter „Einstellungen“ ändern.</div>` },
  { t: "Tarif und Arbeitszeit", keys: ["grp", "stf", "woStd"], help: "Auf der Gehaltsmitteilung links unter „1. Tarif“: „Tar-Grp“ ist die Entgeltgruppe, „Stf“ die Stufe und „TZ-Zähl“ deine Wochenstunden." },
  { t: "Zulagen", keys: ["kinder", "schicht", "vl", "nefAb"], help: "Links in der Spalte „lfd. Monat“: „JLL Kinderzulage“, „JLL VL Zulage“. Die Schichtzulage steht unter „Vormonate“." },
  { t: "Steuer", keys: ["stkl", "zkf", "kist"], help: "In der Kopfzeile der Gehaltsmitteilung: „St Kl“ (Steuerklasse), „Konf“ (Konfession, leer = keine Kirchensteuer) und „Kinder-Freib.“." },
  { t: "Krankenversicherung", keys: ["kvArt", "kvz", "pvKinder", "pvKinderlos"], help: "Den Zusatzbeitrag nennt deine Krankenkasse auf ihrer Website (AOK Niedersachsen 2026: 2,98 %). Für die Pflegeversicherung zählen Kinder unter 25 Jahren." },
  { t: "Altersvorsorge und Abzüge", keys: ["versorgungswerk", "bveSatz", "zvSatz", "entgeltumwandlung", "vwlSparrate", "agZuschussFrei"], help: "Rechts auf der Gehaltsmitteilung: „Gesamtbeitrag BVE“ (Versorgungswerk), „AN-Beitrag ZV“, „UnterstützKasse“ (Entgeltumwandlung), „Vw-Leistung“ (VL-Sparrate). Links „NNN Zuschuss Betr.“ (steuerfreier Zuschuss)." },
  { t: "Fertig", html: () => `<p>Geschafft. So geht es weiter:</p><ol style="margin:0;padding-left:20px"><li>Unter <b>1 · Vivendi-Monatsauswertung</b> das PDF eines Monats laden.</li><li>Unter <b>2 · Gehaltsmitteilung</b> die Abrechnung zwei Monate später fotografieren.</li></ol><div class="help">Auf dem Handy kannst du die App über das Browser-Menü „Zum Startbildschirm hinzufügen“ wie eine normale App öffnen. Sie funktioniert dann auch offline.</div>` }
];
let wzStep = 0;
function wzRender() {
  const s = WZ[wzStep];
  $("wzBody").innerHTML = `<span class="steps">Schritt ${wzStep + 1} von ${WZ.length}</span><h2 id="wzTitle">${s.t}</h2>
    ${s.html ? s.html() : `<div class="grid2">${s.keys.map(k => fieldHtml(k, "wz-")).join("")}</div><div class="help">${s.help}</div>${s.keys.map(k => `<details><summary class="muted" style="cursor:pointer;font-size:.82rem">Hilfe zu „${SET_FIELDS[k].l}“</summary><p class="hint">${esc(SET_FIELDS[k].help)}</p></details>`).join("")}`}
    <div class="nav"><button type="button" class="sec" id="wzBack" ${wzStep === 0 ? "hidden" : ""}>Zurück</button><span></span><button type="button" id="wzNext">${wzStep === WZ.length - 1 ? "Los geht's" : "Weiter"}</button></div>`;
}
function openWizard() { wzStep = 0; wzRender(); $("wizard").showModal(); }
$("wzBody").addEventListener("change", e => { if (e.target.dataset.k) { readField(e.target); save(); if (e.target.dataset.k === "grp") wzRender(); } });
$("wzBody").addEventListener("click", e => {
  if (e.target.id === "wzBack") { wzStep = Math.max(0, wzStep - 1); wzRender(); }
  if (e.target.id === "wzNext") {
    $("wzBody").querySelectorAll("[data-k]").forEach(readField); save();
    if (wzStep === WZ.length - 1) { S.set.setupDone = true; save(); $("wizard").close(); buildSettings(); render(); if (!S.cur) $("sec-viv").open = true; return; }
    wzStep++; wzRender();
  }
});
$("openWizard").addEventListener("click", openWizard);
$("welcomeWizard").addEventListener("click", openWizard);

// ---------- Neuigkeiten und Anleitung ----------
const CHANGELOG = [
  { v: "1.5.0", items: [
    "Neue Versionen kommen jetzt zuverlässig an. Wenn eine bereitsteht, erscheint unten der Knopf „Jetzt aktualisieren“.",
    "Oben gibt es den Knopf „Anleitung“: kurze Erklärung, wie die App funktioniert.",
    "Nach jedem Update siehst du hier, was neu ist."] },
  { v: "1.4.0", items: [
    "NEF: Einsatzzuschlag je Einsatz wird geprüft. Die Anzahl der Einsätze trägst du unter „2 · Gehaltsmitteilung“ ein.",
    "NEF nur zum Sammeln: in den Einstellungen „NEF regulär ab“ eintragen, Monate davor zählen ohne Einsatzzuschlag.",
    "Bei NEF3 meldet die App, wenn die Bereitschaft kürzer als bis 20 Uhr gebucht ist."] },
  { v: "1.3.0", items: [
    "Knöpfe ganz oben: Vivendi-PDF laden, Abrechnung fotografieren (Kamera), Foto aus der Galerie.",
    "Fotos und PDFs werden automatisch dem richtigen Monat zugeordnet.",
    "Fehler behoben: Überstunden und Zeitguthaben wurden bei direkt geladenen PDFs falsch als Abweichung gezeigt."] },
  { v: "1.2.0", items: [
    "Fehler behoben: Freizeitausgleich nach BD wurde bei geladenen PDFs teils als fehlend gemeldet.",
    "Ergebnisliste ist eingeklappt: Posten, Betrag, Status. Antippen zeigt die Rechnung."] },
  { v: "1.1.0", items: [
    "Fotoerkennung deutlich besser, liest mehrmals und prüft die Werte gegen Summen.",
    "Erkannte Werte kannst du vor dem Übernehmen direkt korrigieren. Unsichere Werte sind rot markiert."] }
];
const vnum = v => v.split(".").map(Number).reduce((a, x) => a * 1000 + x, 0);
function showNews(since) {
  const list = CHANGELOG.filter(c => !since || vnum(c.v) > vnum(since));
  if (!list.length) return;
  $("newsBody").innerHTML = list.map(c => `<h3 class="eyebrow" style="margin:0">Version ${c.v}</h3><ul style="margin:0;padding-left:20px">${c.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`).join("");
  $("newsDlg").showModal();
}
$("closeNews").addEventListener("click", () => $("newsDlg").close());
$("openHelp").addEventListener("click", () => $("helpDlg").showModal());
$("closeHelp").addEventListener("click", () => $("helpDlg").close());
$("ver").addEventListener("click", () => showNews(null));
$("helpNews").addEventListener("click", () => { $("helpDlg").close(); showNews(null); });

// ---------- Start ----------
$("ver").textContent = "Version " + APP_VERSION + " · Neuigkeiten";
buildSettings(); buildTarif(); buildAbr(); render();
if (!S.set.setupDone && !Object.keys(S.months).length) setTimeout(openWizard, 300);
else if (S.seenVersion !== APP_VERSION) { const since = S.seenVersion || "1.3.0"; setTimeout(() => showNews(since), 400); }
S.seenVersion = APP_VERSION; save();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  const banner = w => {
    if (document.getElementById("updBanner")) return;
    const b = document.createElement("div"); b.id = "updBanner"; b.className = "msg good"; b.style.cssText = "position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:10px;align-items:center;justify-content:space-between";
    b.innerHTML = `<span>Neue Version verfügbar.</span><button type="button">Jetzt aktualisieren</button>`;
    b.querySelector("button").onclick = () => { w.postMessage("skipWaiting"); setTimeout(() => location.reload(), 1500); };
    document.body.appendChild(b);
  };
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
    // eine schon wartende neue Version sofort anbieten, dann im Hintergrund nach Updates sehen
    if (reg.waiting && navigator.serviceWorker.controller) banner(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing; if (!nw) return;
      nw.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) banner(nw); });
    });
    reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
