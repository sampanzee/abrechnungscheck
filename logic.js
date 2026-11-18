// Prüflogik Abrechnungscheck (TV DN, DIAKOVERE). Tarifwerte sind Standardwerte und lassen sich in der App überschreiben.
"use strict";

// ---------- Tarifwerte (TV DN), nach Stichtag ----------
let TARIF = [
  { ab: "2026-03-01",
    monat: { "A I": [5159.23,5389.98,5598.96,5961.21,6393.14,6570.78], "A II": [6748.39,7319.66,7821.26,8113.86,8399.45,8685.08], "A III": [8469.16,8970.72,9688.31], "A IV": [9973.88,10691.50] },
    std: { "A IV": {std:63.87,so:15.97,ft:22.35,x2412:15.97,nacht:17.56,bdz:9.03,bdStd:60.23},
           "A III": {std:57.88,so:14.47,ft:20.26,x2412:14.47,nacht:15.92,bdz:8.19,bdStd:54.58},
           "A II": {std:46.72,so:11.68,ft:16.35,x2412:11.68,nacht:12.85,bdz:6.61,bdStd:44.06},
           "A I": {std:33.45,so:8.36,ft:11.71,x2412:8.36,nacht:9.20,bdz:5.02,bdStd:null} },
    ue: { "A IV": [8.94,9.58], "A III": [7.59,8.04,8.68], "A II": [6.05,6.56,7.01,7.27], "A I": [4.62,4.83,5.02,5.34] },
    pct: { so: "25 %", nacht: "27,5 %" } },
  { ab: "2026-07-01",
    monat: { "A I": [5262.41,5497.78,5710.94,6080.43,6521.00,6702.20], "A II": [6883.36,7466.05,7977.69,8276.14,8567.44,8858.78], "A III": [8638.54,9150.13,9882.08], "A IV": [10173.36,10905.33] },
    std: { "A IV": {std:65.15,so:16.29,ft:22.80,x2412:16.29,nacht:17.92,bdz:9.03,bdStd:60.23},
           "A III": {std:59.03,so:14.76,ft:20.66,x2412:14.76,nacht:16.23,bdz:8.19,bdStd:54.58},
           "A II": {std:47.66,so:11.92,ft:16.68,x2412:11.92,nacht:13.11,bdz:6.61,bdStd:44.06},
           "A I": {std:34.12,so:8.53,ft:11.94,x2412:8.53,nacht:9.38,bdz:5.12,bdStd:null} },
    ue: { "A IV": [9.12,9.77], "A III": [7.74,8.20,8.85], "A II": [6.17,6.69,7.15,7.42], "A I": [4.72,4.93,5.12,5.45] },
    pct: { so: "25 %", nacht: "27,5 %" } },
  { ab: "2027-01-01",
    monat: { "A I": [5315.03,5552.76,5768.05,6141.23,6586.21,6769.22], "A II": [6952.19,7540.71,8057.47,8358.90,8653.11,8947.37], "A III": [8724.93,9241.63,9980.90], "A IV": [10275.09,11014.38] },
    std: { "A IV": {std:65.80,so:19.74,ft:23.03,x2412:16.45,nacht:18.10,bdz:9.03,bdStd:60.23},
           "A III": {std:59.62,so:17.89,ft:20.87,x2412:14.91,nacht:16.40,bdz:8.19,bdStd:54.58},
           "A II": {std:48.13,so:14.44,ft:16.85,x2412:12.03,nacht:13.24,bdz:6.61,bdStd:44.06},
           "A I": {std:34.46,so:10.34,ft:12.06,x2412:8.62,nacht:9.48,bdz:5.17,bdStd:null} },
    ue: { "A IV": [9.21,9.87], "A III": [7.82,8.28,8.94], "A II": [6.23,6.76,7.22,7.49], "A I": [4.76,4.98,5.17,5.50] },
    pct: { so: "30 %", nacht: "27,5 %" } },
  { ab: "2027-07-01",
    monat: { "A I": [5469.17,5713.79,5935.32,6319.33,6777.21,6965.53], "A II": [7153.80,7759.39,8291.14,8601.31,8904.05,9206.84], "A III": [8977.95,9509.64,10270.35], "A IV": [10573.07,11333.80] },
    std: { "A IV": {std:67.71,so:20.31,ft:23.70,x2412:16.93,nacht:20.31,bdz:9.03,bdStd:60.23},
           "A III": {std:61.35,so:18.41,ft:21.47,x2412:15.34,nacht:18.41,bdz:8.19,bdStd:54.58},
           "A II": {std:49.53,so:14.86,ft:17.34,x2412:12.38,nacht:14.86,bdz:6.61,bdStd:44.06},
           "A I": {std:35.46,so:10.64,ft:12.41,x2412:8.87,nacht:10.64,bdz:5.32,bdStd:null} },
    ue: { "A IV": [9.47,10.16], "A III": [8.04,8.52,9.20], "A II": [6.41,6.95,7.43,7.71], "A I": [4.90,5.12,5.32,5.66] },
    pct: { so: "30 %", nacht: "30 %" } }
];
// Beträge mit eigenem Stichtag (§ 17 Abs. 3, § 23)
let SCHICHT = [{ ab: "2026-03-01", "18": 145, "13": 75 }, { ab: "2027-01-01", "18": 180, "13": 110 }];
let KINDER = [{ ab: "2026-03-01", v: 133.96 }, { ab: "2027-01-01", v: 135.30 }, { ab: "2027-07-01", v: 138.95 }];
let BD_STUFE = { I: 70, II: 85, III: 100 };
const GRUPPEN = ["A I","A II","A III","A IV"];
const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const VOLLZEIT = 38.5;
const D = 86400000;
const REGELN = { auto: "Automatisch", normal: "Normaler Dienst", fza_pflichtig: "Dienst, später Ausgleichstag", fnb: "Freizeitausgleich nach BD", fza: "Ausgleichstag genommen", urlaub: "Urlaub", krank: "Krank", frei: "Frei / zählt nicht" };

const pad = n => String(n).padStart(2, "0");
const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;
function num(s) {
  if (s == null) return null; s = String(s).trim().replace(/\s/g, ""); if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const v = parseFloat(s); return isNaN(v) ? null : v;
}
const de = (v, d = 2) => v == null ? "–" : v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const eur = v => v == null ? "–" : de(v) + " €";
const iso = t => new Date(t).toISOString().slice(0, 10);
const dm = t => { const s = iso(t); return s.slice(8, 10) + "." + s.slice(5, 7) + "."; };
const WTN = ["So","Mo","Di","Mi","Do","Fr","Sa"];
const wdOf = t => WTN[new Date(t).getUTCDay()];
const monthKey = (y, m) => `${y}-${pad(m)}`;
function byDate(list, y, m) { const key = `${y}-${pad(m)}-01`; let t = null; for (const x of list) if (x.ab <= key) t = x; return t; }
const tarifFor = (y, m) => byDate(TARIF, y, m);
function addMonths(y, m, k) { const i = (y * 12 + (m - 1)) + k; return { y: Math.floor(i / 12), m: (i % 12) + 1 }; }

// ---------- Feiertage Niedersachsen ----------
function easter(y) {
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
  h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
  mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return Date.UTC(y, mo-1, da);
}
function feiertage(y) {
  const E = easter(y), s = new Map();
  [["01-01","Neujahr"],["05-01","Tag der Arbeit"],["10-03","Tag der Deutschen Einheit"],["10-31","Reformationstag"],["12-25","1. Weihnachtstag"],["12-26","2. Weihnachtstag"]].forEach(([x, n]) => s.set(`${y}-${x}`, n));
  [[-2,"Karfreitag"],[1,"Ostermontag"],[39,"Christi Himmelfahrt"],[50,"Pfingstmontag"]].forEach(([o, n]) => s.set(iso(E + o * D), n));
  return s;
}
function isFeiertag(t) { return feiertage(new Date(t).getUTCFullYear()).get(iso(t)) || null; }
// Für den Feiertagszuschlag zählen auch Oster- und Pfingstsonntag (§ 17 Abs. 5c)
function isZuschlagFeiertag(t) { if (isFeiertag(t)) return true; const E = easter(new Date(t).getUTCFullYear()); return t === E || t === E + 49 * D; }
const isWerktag = t => { const w = new Date(t).getUTCDay(); return w >= 1 && w <= 5 && !isFeiertag(t); };

// ---------- Vivendi-Text lesen ----------
// Textreihenfolge reparieren: Beim Lesen des PDFs im Browser landet die erste Zeile eines Tages (Zeit oder Kürzel)
// manchmal über der Datumszeile oder ein Kürzel darunter. Diese Zeilen werden wieder in die Datumszeile gezogen.
function fixVivOrder(text) {
  const L = text.split("\n");
  const isDate = l => /^\s*\d{2}\.\d{2}\.\d{4}\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/.test(l);
  const hasTime = l => /\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/.test(l);
  const CODE = /^(?:\d+\/\d+\*?|\/|[A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöü0-9]*\*?)$/;
  const isCodes = l => { const t = l.trim().split(/\s+/); return t.length >= 1 && t.length <= 3 && t[0] !== "" && t.every(x => CODE.test(x)) && !/^(Bereitschaftsdienst|Abrechnung|Kontensalden)$/i.test(l.trim()); };
  const split = l => { const m = l.match(/^(\s*\d{2}\.\d{2}\.\d{4}\s+\S+)((?:\s+(?:\d+\/\d+\*?|\/|[A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöü0-9]*\*?))*)(.*)$/); return m ? { d: m[1], codes: m[2].trim() ? m[2].trim().split(/\s+/) : [], rest: m[3] } : null; };
  const join = p => [p.d, ...p.codes].join(" ") + p.rest;
  for (let i = 0; i < L.length; i++) {
    if (!isDate(L[i])) continue;
    const p = split(L[i]); if (!p) continue;
    const prev = i > 0 ? L[i - 1] : null, next = i + 1 < L.length ? L[i + 1] : null;
    const hours = (p.rest.match(/-?\d+,\d{2}/) || ["0,00"])[0];
    // fehlendes Kürzel aus der Zeile davor oder danach
    if (p.codes.length < 3 && prev != null && !isDate(prev) && isCodes(prev) && !hasTime(prev)) { const t = prev.trim().split(/\s+/); p.codes.splice(1, 0, ...t.slice(0, 3 - p.codes.length)); L[i - 1] = ""; }
    if (p.codes.length < 3 && next != null && !isDate(next) && isCodes(next) && !hasTime(next)) { const t = next.trim().split(/\s+/); p.codes.push(...t.slice(0, 3 - p.codes.length)); L[i + 1] = ""; }
    // erste Zeitzeile steht über der Datumszeile: nur wenn der Tag Stunden hat, aber selbst keine Zeit
    const prev2 = i > 0 ? L[i - 1] : null;
    if (!hasTime(p.rest) && hours !== "0,00" && prev2 && !isDate(prev2) && hasTime(prev2)) {
      const m = prev2.trim().match(/^((?:(?:\d+\/\d+\*?|\/|[A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöü0-9]*\*?)\s+)*?)(\d{2}:\d{2}.*)$/);
      if (m) { const cs = m[1].trim() ? m[1].trim().split(/\s+/) : []; if (p.codes.length < 3) p.codes.push(...cs.slice(0, 3 - p.codes.length)); p.rest = " " + m[2] + p.rest; L[i - 1] = ""; }
    }
    L[i] = join(p);
  }
  return L.filter(l => l !== "").join("\n");
}
// Lohnarten-Übersicht (Seite 2). Im PDF stehen die Spalten AZK | Lohnarten | Vertragsdaten zeilenweise durcheinander:
// erst die Werte der anderen Spalten entfernen, dann jeder Lohnart den nächsten Betrag zuordnen.
function parseLohnarten(text) {
  const li = text.lastIndexOf("Lohnarten"); if (li < 0) return [];
  let sec = text.slice(li + 9); const ke = sec.search(/Kontensalden|Mitarbeiter\/|Abrechnung\\/); if (ke >= 0) sec = sec.slice(0, ke);
  const AMT = "-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}";
  sec = sec.replace(new RegExp("(Ist-Stunden|Soll-Stunden|Differenz|Vortrag|sonstige Buchungen|Übertrag|Resturlaub|Stelle|Tage\\/Woche|Stunden\\/Woche|Stunden\\/Tag|\\bS\\.)\\s*" + AMT, "g"), " ")
    .replace(/_Entlastungstage|\(Tag\)|Vertragsdaten/g, " ");
  const out = [], pend = [], isAmt = t => new RegExp("^" + AMT + "$").test(t);
  for (const line of sec.split("\n")) {
    const toks = line.trim().split(/\s+/).filter(Boolean); let cur = null;
    for (let i = 0; i < toks.length; i++) {
      const m = toks[i].match(/^(\d{10})\/(.*)$/) || (/^\d{10}$/.test(toks[i]) && toks[i + 1] && toks[i + 1].startsWith("/") ? [null, toks[i], toks[++i].slice(1)] : null);
      if (m) { cur = { nr: m[1], name: m[2] ? [m[2]] : [], menge: null }; out.push(cur); pend.push(cur); continue; }
      if (isAmt(toks[i])) { const p = pend.find(x => x.menge == null); if (p) { p.menge = num(toks[i]); pend.splice(pend.indexOf(p), 1); } cur = null; continue; }
      if (cur) cur.name.push(toks[i]);
    }
  }
  return out.filter(x => x.menge != null).map(x => ({ nr: x.nr, name: x.name.join(" ").trim(), menge: x.menge }));
}
function parseVivendi(text) {
  text = fixVivOrder(text.replace(/\r/g, ""));
  const out = { monat: null, jahr: null, wochenStd: null, tagStd: null, lohnarten: [], tage: [] };
  const mm = text.match(new RegExp("-\\s*(" + MONATE.join("|") + ")\\s+(\\d{4})"));
  if (mm) { out.monat = MONATE.indexOf(mm[1]) + 1; out.jahr = +mm[2]; }
  const w = text.match(/Stunden\/Woche\s+([\d.,]+)/); if (w) out.wochenStd = num(w[1]);
  const t = text.match(/Stunden\/Tag\s+([\d.,]+)/); if (t) out.tagStd = num(t[1]);
  const az = text.match(/Übertrag\s+(-?[\d.,]+)/); if (az) out.azk = num(az[1]);
  const ru = text.match(/Resturlaub\s+(-?[\d.,]+)/); if (ru) out.resturlaub = num(ru[1]);

  out.lohnarten = parseLohnarten(text);

  const reD = /(\d{2})\.(\d{2})\.(\d{4})\s+(Mo|Di|Mi|Do|Fr|Sa|So)\b/g; const pos = []; let d;
  while ((d = reD.exec(text))) pos.push({ i: d.index, end: reD.lastIndex, y: +d[3], m: +d[2], d: +d[1], wd: d[4] });
  let tail = text.length;
  if (pos.length) { const rest = text.slice(pos[pos.length - 1].end); const k = rest.search(/Lohnart:|Kontoart|Lohnarten/); if (k >= 0) tail = pos[pos.length - 1].end + k; }
  pos.forEach((p, idx) => {
    const block = text.slice(p.end, idx + 1 < pos.length ? pos[idx + 1].i : tail);
    const hEnd = block.search(/\d{2}:\d{2}|\d+,\d{2}/);
    const head = hEnd >= 0 ? block.slice(0, hEnd) : block;
    const tok = head.match(/\d+\/\d+\*?|\/|[A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöü0-9]*\*?/g) || [];
    const ist = tok.length >= 3 ? tok[2] : (tok[tok.length - 1] || "/");
    const reS = /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\s*\(\s*(\d+)\s*\)/g; const ms = []; let s;
    while ((s = reS.exec(block))) ms.push({ s: +s[1] * 60 + +s[2], e: +s[3] * 60 + +s[4], pause: +s[5], at: s.index, after: reS.lastIndex });
    const segs = ms.map((x, j) => {
      const label = block.slice(x.after, j + 1 < ms.length ? ms[j + 1].at : block.length).replace(/\s+/g, " ").trim();
      let typ = "arbeit", stufe = null;
      if (/Bereitschaft(?!s)/i.test(label)) { typ = "bereit"; const st = label.match(/Stufe\s+(III|II|I)\b/); stufe = st ? st[1] : "III"; }
      else if (/Freizeitausgleich\s+nach\b/i.test(label)) typ = "fnb";
      else if (/Freizeitausgleich/i.test(label)) typ = "fza";
      else if (/Urlaub/i.test(label)) typ = "urlaub";
      else if (/Krank|Arbeitsunf/i.test(label)) typ = "krank";
      else if (/Dienstbefreiung|Sonderurlaub/i.test(label)) typ = "frei";
      const vivExtra = typ === "bereit" && /\+\s*10\s*%\s*Punkte/i.test(label);
      return { s: x.s, e: x.e, pause: x.pause, label, typ, stufe, vivExtra };
    }).filter(x => x.s !== x.e);
    const vz = (block.match(/\bVZ\s*(?:\d+\s*[a-z]?|RB)\b/g) || []).map(x => x.replace(/\s+/g, " "));
    out.tage.push({ date: Date.UTC(p.y, p.m - 1, p.d), wd: p.wd, ist, segs, vz });
  });
  return out;
}
const bdTage = viv => viv.tage.filter(t => !/^(K|KAU)$/.test(t.ist) && t.segs.some(s => s.typ === "bereit")).length;

function ov(a1, a2, b1, b2) { return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1)); }
function timeline(segs) {
  let prevEnd = null;
  return segs.map(sg => {
    const off = prevEnd == null ? 0 : Math.floor(prevEnd / 1440) * 1440;
    let a = off + sg.s; if (prevEnd != null && a < prevEnd) a += 1440;
    let b = Math.floor(a / 1440) * 1440 + sg.e; if (b <= a) b += 1440;
    prevEnd = b; return { ...sg, a, b, h: (b - a) / 60 };
  });
}

function dayKind(tag, codes) {
  const rule = (codes[tag.ist] && codes[tag.ist].rule) || "auto";
  const has = t => tag.segs.some(s => s.typ === t);
  if (rule !== "auto") return rule;
  if (/^(K|KAU)$/.test(tag.ist)) return "krank";
  if (has("bereit")) return "bd";
  if (/^FFB/.test(tag.ist)) return "fnb";
  if (!tag.segs.length && /^FZA/.test(tag.ist)) return "fza";
  for (const t of ["fnb","fza","urlaub","krank","frei"]) if (has(t)) return t;
  if (has("arbeit")) return "dienst";
  return "leer";
}
// Dienstkürzel laut Dienstübersicht DKH/DKF (Stand 13.01.2025). soll = Bereitschaftsstunden je Dienst
const KNOWN_CODES = {"NEF3": {"desc": "NEF-Tagdienst mit anschließender Bereitschaft bis ca. 20 Uhr, kein Freizeitausgleich"}, "BD1*": {"desc": "OP-BD Mo–Do (FÄ/ÄiW), 12:00–07:45, FNB", "soll": 11.55}, "BD2*": {"desc": "OP-BD Fr/vor Feiertag (FÄ/ÄiW), 12:00–09:00", "soll": 12.8}, "BD3*": {"desc": "BD Sa (OP bzw. OÄ/FÄ), 08:30–08:30", "soll": 23}, "BD4*": {"desc": "BD So/Feiertag (OP bzw. OÄ/FÄ), 08:00–08:00, FNB", "soll": 23}, "BD5*": {"desc": "OÄ/FÄ-BD Mo–Do, 11:00–08:00, FNB", "soll": 12.8}, "BD6*": {"desc": "OÄ/FÄ-BD Fr/vor Feiertag, 11:00–09:00", "soll": 13.8}, "BD7*": {"desc": "OP Henrike (früher Kirchrode) Mo–Do, 08:00–08:00, FNB", "soll": 15.8}, "BD8*": {"desc": "OP Henrike (früher Kirchrode) Fr/vor Feiertag, 09:00–09:00", "soll": 15.8}, "BD9*": {"desc": "OP Henrike (früher Kirchrode) Sa, 08:30–08:30", "soll": 23}, "BD10*": {"desc": "OP Henrike (früher Kirchrode) So/Feiertag, 08:00–08:00, FNB", "soll": 23}, "BD11*": {"desc": "Intensiv-BD, 14:45–08:15 (Mo–Do mit FNB)", "soll": 9.8}, "F3": {"desc": "Intensiv-Frühdienst, 07:15–15:27", "soll": null}, "F1": {"desc": "Regeldienst, 07:30–15:42", "soll": null}, "F1H": {"desc": "Regeldienst DKH, 07:30–15:42", "soll": null}, "FNB": {"desc": "Freizeitausgleich nach Bereitschaftsdienst", "soll": null}, "FNB*": {"desc": "Freizeitausgleich nach Bereitschaftsdienst", "soll": null}, "FZA": {"desc": "Freizeitausgleich", "soll": null}, "UD": {"desc": "Urlaub", "soll": null}, "BD12*": {"desc": "DKF BD Mo–Do (FÄ/ÄiW), 15:15–08:00, FNB", "soll": 8.55}, "BD13*": {"desc": "DKF BD Fr/vor Feiertag (FÄ/ÄiW), 15:15–09:15", "soll": 9.8}, "BD14*": {"desc": "DKF BD Sa (FÄ/ÄiW), 08:45–08:45", "soll": 16.3}, "BD15*": {"desc": "DKF BD So/Feiertag (FÄ/ÄiW), 08:15–08:15", "soll": 16.3}, "BD16*": {"desc": "DKF OÄ-BD Mo–Do, 14:30–08:00, FNB", "soll": 9}, "BD17*": {"desc": "DKF OÄ-BD Fr/vor Feiertag, 14:30–08:45", "soll": 9.75}, "BD18*": {"desc": "DKF OÄ-BD Sa, 08:15–08:15", "soll": 16.3}, "BD19*": {"desc": "DKF OÄ-BD So/Feiertag, 07:45–07:45", "soll": 16.3}, "BDV5": {"desc": "DKF BD Visite IMC Wochenende, Teilzeit 5 Std FZA", "soll": null}, "BDVA": {"desc": "DKF BD Visite IMC Wochenende, Auszahlung", "soll": null}, "BDVi": {"desc": "DKF BD Visite IMC Wochenende", "soll": null}, "ESF": {"desc": "Ersatzruhetag für Arbeit an Sonn-/Feiertagen (keine Arbeitszeit)", "soll": null}, "FFB": {"desc": "Frei für Bereitschaft (Freizeitausgleich aus BD-Stunden)", "soll": null}, "FNK": {"desc": "FNB nach BD, der wegen Krankheit ausfiel", "soll": null}, "ZG": {"desc": "Zeitgutschrift", "soll": null}, "AZV": {"desc": "Freier Tag Arbeitszeitverlängerung (§ 11 Abs. 2)", "soll": null}, "DBD": {"desc": "Dienst-/Arbeitsbefreiung (§ 21)", "soll": null}, "DBA": {"desc": "Dienst-/Arbeitsbefreiung (§ 21)", "soll": null}, "F2": {"desc": "Später Frühdienst DKF", "soll": null}, "NEF3": {"desc": "NEF 3, Mo–Fr 07:20–15:42", "soll": null}};
const knownCode = c => KNOWN_CODES[c] || KNOWN_CODES[String(c).replace(/F$/, "")] || null;
const KIND_TXT = { bd: "Bereitschaftsdienst", dienst: "Dienst", fnb: "Freizeitausgleich nach BD", fza: "Freizeitausgleich", urlaub: "Urlaub", krank: "Krank", frei: "Frei", leer: "Frei", normal: "Normaler Dienst", fza_pflichtig: "Dienst, später Freizeitausgleich" };
const OHNE_ZUSCHLAG = ["frei","urlaub","krank","fnb","fza"];

// ctx: { rates: {so, ft, nacht}, c0, known, planSpaet }
function nachzaehlen(viv, set, codes, prevViv, nextViv, ctx) {
  ctx = ctx || { rates: { so: 25, ft: 35, nacht: 27.5 }, c0: 0, known: false, planSpaet: false };
  const res = { so: 0, ft: 0, nacht: 0, nachtAll: 0, x2412: 0, na1: 0, na2: 0, bdRoh: 0, fza: 0, dienste: [], urlaub: 0, krank: 0, fzaAnfall: 0, fzaGenommen: 0, msgs: [] };
  const map = new Map(viv.tage.map(t => [t.date, t]));
  const fnbUsed = new Set(), info = [];
  for (const tag of viv.tage) {
    const kind = dayKind(tag, codes); tag.kind = kind;
    const tl = timeline(tag.segs);
    const sumH = typ => r2(tl.filter(s => s.typ === typ).reduce((x, s) => x + s.h, 0));
    if (kind === "urlaub") res.urlaub++;
    if (kind === "krank" && tag.segs.length) res.krank++;
    tag.fnbH = kind === "fnb" ? (sumH("fnb") || sumH("arbeit") || set.tagStd || 0) : 0;
    // Ausgleichstage: Intensiv-Wochenenddienste werden später mit freien Tagen (ESF/FZA) ausgeglichen
    const wtag = new Date(tag.date).getUTCDay();
    const auto = (/^BD(9|11)\*?$/.test(tag.ist) && wtag === 6) || (tag.ist === "F3" && (wtag === 0 || wtag === 6 || isFeiertag(tag.date)));
    tag.ausgleich = kind === "fza_pflichtig" || ((codes[tag.ist] || {}).rule || "auto") === "auto" && auto;
    if (tag.ausgleich) { res.fzaAnfall += 1; res.ausgleichTage = (res.ausgleichTage || []).concat(tag.ist + " " + wdOf(tag.date) + " " + dm(tag.date)); }
    if (kind === "fza") { res.fzaGenommen += 1; res.freiTage = (res.freiTage || []).concat(tag.ist + " " + wdOf(tag.date) + " " + dm(tag.date)); }
    const bd = { bereit: 0, na1: 0, na2: 0, ftH: 0, stufe: null, vivExtra: false };
    for (const sg of tl) {
      if (["krank","urlaub","frei","fza"].includes(kind)) break;
      if (sg.typ === "bereit") {
        bd.bereit += sg.h; bd.stufe = bd.stufe || sg.stufe; bd.vivExtra = bd.vivExtra || sg.vivExtra;
        for (let k = -1; k <= 2; k++) {
          bd.na1 += ov(sg.a, sg.b, k * 1440 + 1320, k * 1440 + 1560) / 60;
          bd.na2 += ov(sg.a, sg.b, k * 1440 + 120, k * 1440 + 360) / 60;
          if (k >= 0 && isZuschlagFeiertag(tag.date + k * D)) bd.ftH += ov(sg.a, sg.b, k * 1440, (k + 1) * 1440) / 60;
        }
      } else if (sg.typ === "arbeit" && !OHNE_ZUSCHLAG.includes(kind)) {
        // Minutengenau: nur der höchste Zuschlag aus Sonntag/Feiertag/Nacht, 24./31.12. ab 6 Uhr zusätzlich
        for (let m = sg.a; m < sg.b; m++) {
          const day = tag.date + Math.floor(m / 1440) * D, tod = ((m % 1440) + 1440) % 1440;
          const dt = new Date(day), c = [];
          if (isZuschlagFeiertag(day)) c.push("ft");
          if (dt.getUTCDay() === 0) c.push("so");
          if (tod >= 1320 || tod < 360) { c.push("nacht"); res.nachtAll += 1 / 60; }
          if (c.length) { c.sort((x, y) => ctx.rates[y] - ctx.rates[x]); res[c[0]] += 1 / 60; }
          if (dt.getUTCMonth() === 11 && (dt.getUTCDate() === 24 || dt.getUTCDate() === 31) && tod >= 360) res.x2412 += 1 / 60;
        }
      }
    }
    const kc = knownCode(tag.ist);
    if (bd.bereit > 0 && kc && kc.soll && Math.abs(bd.bereit - kc.soll) > 0.05)
      res.msgs.push({ lvl: "info", t: `${tag.ist} am ${dm(tag.date)}: ${de(r2(bd.bereit))} Std Bereitschaft statt üblich ${de(kc.soll)} Std (z. B. Feiertagsfolge oder Dienstverschiebung).` });
    if (bd.bereit > 0) { res.bdRoh += bd.bereit; res.na1 += bd.na1; res.na2 += bd.na2; res.dienste.push({ date: tag.date, wd: tag.wd, ist: tag.ist, ...bd, overnight: tl.some(s => s.typ === "bereit" && s.b > 1440), abzug: 0, fza: "" }); }
  }
  // Bewertung je Dienst: Stufe + 10 Pkt. über 5 BD/Monat im Schnitt + 10 Pkt. verspäteter Dienstplan
  res.dienste.forEach((d, i) => {
    d.base = BD_STUFE[d.stufe] || 100;
    d.ruleExtra = ctx.known && ctx.c0 + i + 1 > 15;
    d.extra = d.vivExtra || d.ruleExtra;
    if (ctx.known && d.vivExtra !== d.ruleExtra) res.msgs.push({ lvl: "warn", t: `BD am ${dm(d.date)}: Vivendi ${d.vivExtra ? "rechnet" : "rechnet keine"} +10 Punkte, nach der eingestellten 5-BD-Regel ${d.ruleExtra ? "wären sie fällig" : "wären sie nicht fällig"}.` });
    const vzTag = (viv.tage.find(t => t.date === d.date) || {}).vz || [];
    d.kurzAuto = vzTag.some(c => /VZ\s*2/.test(c));
    d.kurz = d.kurzAuto || !!(ctx.kurz || {})[iso(d.date)];
    d.factor = d.base + (d.extra ? 10 : 0) + (ctx.planSpaet ? 10 : 0) + (d.kurz ? 10 : 0);
  });
  // Freizeitausgleich nach BD zuordnen
  for (const d of res.dienste) {
    const nd = d.date + D, next = map.get(nd), ft = isFeiertag(nd);
    if (!d.overnight && !(next && next.kind === "fnb")) { d.fza = "–"; continue; }
    if (next) {
      if (next.kind === "fnb") {
        d.abzug = next.fnbH; fnbUsed.add(nd); d.fza = "am " + dm(nd);
        if (!isWerktag(nd)) res.msgs.push({ lvl: "warn", t: `FZA am ${wdOf(nd)} ${dm(nd)} nach BD vom ${dm(d.date)}, obwohl der Folgetag ${ft ? "ein Feiertag (" + ft + ")" : "Wochenende"} ist.` });
      } else if (isWerktag(nd)) {
        d.fza = "fehlt";
        res.msgs.push({ lvl: "warn", t: `Kein Freizeitausgleich am ${wdOf(nd)} ${dm(nd)} nach dem BD vom ${dm(d.date)}` });
      } else d.fza = ft ? "Feiertag" : "Wochenende";
    } else if (!isWerktag(nd)) d.fza = ft ? "Feiertag" : "Wochenende";
    else {
      d.fza = "Folgemonat";
      const n = nextViv && nextViv.tage.find(t => t.date === nd);
      if (!nextViv) info.push({ lvl: "info", t: `BD am ${dm(d.date)}: Freizeitausgleich am ${dm(nd)} wird erst im Folgemonat abgezogen. Lade den Folgemonat, um das zu prüfen.` });
      else if (n && dayKind(n, codes) === "fnb") info.push({ lvl: "good", t: `BD am ${dm(d.date)}: Freizeitausgleich am ${dm(nd)} steht im Folgemonat.` });
      else res.msgs.push({ lvl: "warn", t: `BD am ${dm(d.date)}: Im gespeicherten Folgemonat fehlt der Freizeitausgleich am ${dm(nd)}` });
    }
  }
  for (const tag of viv.tage) {
    if (tag.kind !== "fnb" || fnbUsed.has(tag.date)) continue;
    const pd = tag.date - D;
    if (new Date(tag.date).getUTCDate() === 1) {
      tag.fnbPrev = true;
      const p = prevViv && prevViv.tage.find(t => t.date === pd);
      const pBD = p && p.segs.some(s => s.typ === "bereit");
      if (!prevViv) info.push({ lvl: "info", t: `Freizeitausgleich am ${dm(tag.date)} gehört vermutlich zum BD am ${dm(pd)} im Vormonat. Wird in diesem Monat abgezogen.` });
      else if (pBD) info.push({ lvl: "good", t: `Freizeitausgleich am ${dm(tag.date)} gehört zum BD am ${dm(pd)} im Vormonat und wird in diesem Monat abgezogen.` });
      else res.msgs.push({ lvl: "warn", t: `Freizeitausgleich nach BD am ${dm(tag.date)}, aber im Vormonat steht am ${dm(pd)} kein Bereitschaftsdienst.` });
    } else res.msgs.push({ lvl: "warn", t: `Freizeitausgleich nach BD am ${dm(tag.date)} ohne Bereitschaftsdienst am Vortag.` });
  }
  res.fza = r2(viv.tage.filter(t => t.kind === "fnb").reduce((x, t) => x + t.fnbH, 0));
  res.bdW = r2(res.dienste.reduce((x, d) => x + d.bereit * d.factor / 100, 0) - res.fza);
  res.ftbdW = r2(res.dienste.reduce((x, d) => x + d.ftH * d.factor / 100, 0));
  ["so","ft","nacht","nachtAll","x2412","na1","na2","bdRoh","fzaAnfall","fzaGenommen"].forEach(k => res[k] = r2(res[k]));
  res.bd = r2(res.bdRoh - res.fza);
  res.faktor = res.bd > 0 ? res.bdW / res.bd : 1;
  if (res.dienste.some(d => d.extra)) info.push({ lvl: "info", t: `${res.dienste.filter(d => d.extra).length} BD liegen über dem Schnitt von 5 pro Monat und zählen 10 Prozentpunkte mehr${res.dienste.some(d => d.vivExtra) ? " (so auch in Vivendi markiert)" : ""}.` });
  if (ctx.planSpaet && res.dienste.length) info.push({ lvl: "info", t: "Dienstplan zu spät: alle BD dieses Monats zählen 10 Prozentpunkte mehr." });
  if (!ctx.known && res.dienste.length && ctx.missing && !res.dienste.some(d => d.vivExtra)) info.push({ lvl: "info", t: `Regel „mehr als 5 BD im Schnitt“ nicht prüfbar, es fehlen gespeicherte Monate: ${ctx.missing}.` });
  res.msgs = res.msgs.concat(info);
  return res;
}

// ---------- Posten der Gehaltsabrechnung ----------
// kind: grund/kinder = Monatsbetrag (lfd. Monat), calc = Menge × Satz, open = Satz noch unbekannt
const bdRate = (t, g) => g === "A I" ? t.std[g].std : t.std[g].bdStd;
const POSTEN = [
  { key: "grund", label: "Entgelt", code: "JLL Entgelt", kind: "grund" },
  { key: "kinder", label: "Kinderzulage", code: "JLL Kinderzulage", kind: "kinder" },
  { key: "sz", label: "Schichtzulage", code: "JLL Schichtzulage", kind: "sz", viv: ["SZ2","SZ1","SZ"] },
  { key: "so", label: "Sonntag", code: "JNN Sonntag", kind: "calc", viv: ["So"], own: "so", unit: "Std", rate: (t, g) => t.std[g].so, rateTxt: t => "Sonntag " + t.pct.so },
  { key: "ft", label: "Feiertag", code: "Feiertag", kind: "calc", viv: ["FT1","FT","Fei"], own: "ft", unit: "Std", rate: (t, g) => t.std[g].ft, rateTxt: () => "Feiertag 35 %" },
  { key: "nacht", label: "Nachtarbeit (Vollarbeit)", code: "Nacht", kind: "calc", viv: ["Na","Nacht"], own: "nacht", unit: "Std", rate: (t, g) => t.std[g].nacht, rateTxt: t => "Nacht " + t.pct.nacht },
  { key: "x2412", label: "24./31. Dezember", code: "24./31.12.", kind: "calc", viv: [], own: "x2412", unit: "Std", rate: (t, g) => t.std[g].x2412, rateTxt: () => "25 % ab 6 Uhr" },
  { key: "na1", label: "Nacht im BD 22–2 Uhr", code: "JNN ZZ während BD", kind: "calc", viv: ["Na 1 BD"], own: "na1", unit: "Std", rate: (t, g) => t.std[g].bdz, rateTxt: () => "15 %" },
  { key: "na2", label: "Nacht im BD 2–6 Uhr", code: "JNN ZZ während BD", kind: "calc", viv: ["Na 2 BD"], own: "na2", unit: "Std", rate: (t, g) => t.std[g].bdz, rateTxt: () => "15 %" },
  { key: "bd", label: "Bereitschaftsdienst", code: "JLL Bereitschaftsd.", kind: "calc", viv: ["BD"], own: "bdW", unit: "Std",
    rate: (t, g) => bdRate(t, g), rateTxt: () => "Stundenentgelt, gewertete Std" },
  { key: "bdzz", label: "Bereitschaftsdienstzuschlag", code: "JLL ZZ Stufe D3", kind: "calc", viv: ["BD"], own: "bdW", unit: "Std", rate: (t, g) => t.std[g].bdz, rateTxt: () => "15 % je gewertete Std" },
  { key: "ftbd", label: "Feiertag im BD", code: "JLL FZZ Stufe II/III", kind: "calc", vivRe: /^FT BD/, own: "ftbdW", unit: "Std", rate: (t, g) => r2(bdRate(t, g) * 0.25), rateTxt: () => "25 % je gewertete Std" },
  { key: "vtz", label: "Vertretungszuschlag", code: "JLL Vertretungsz.", kind: "vtz" },
  { key: "uezz", label: "Überstunden-Zuschlag", code: "JLL Überstd-ZZ", kind: "calc", viv: ["ÜSZZ"], unit: "Std",
    rate: (t, g, s) => { const a = t.ue[g]; return a ? a[Math.min(s.stf, a.length) - 1] : null; }, rateTxt: (t, g, s) => `15 %, Tabelle 1b Stufe ${Math.min(s.stf, (t.ue[g] || []).length)}` },
  { key: "url", label: "Urlaubsaufschlag", code: "JLL Url.-Aufschlag", kind: "calc", viv: ["U"], own: "urlaub", unit: "Tage", rate: (t, g, s, v) => urlRateOf(v), rateTxt: (t, g, s, v) => urlRateTxt(v) },
  { key: "krank", label: "Krankheitsaufschlag", code: "JLL Krk.-Aufschlag", kind: "calc", viv: [], own: "krank", unit: "Tage", rate: (t, g, s, v) => urlRateOf(v), rateTxt: (t, g, s, v) => urlRateTxt(v) },
  { key: "zg", label: "Zeitguthaben", code: "JEE Zeitguthaben", kind: "calc", viv: ["Üst. Ausz.TZ"], unit: "Std",
    rate: (t, g, s, v) => zgRate(t, g, s, v), rateTxt: () => "(Entgelt + Kinderzulage + Schichtzulage × TZ) ÷ (4,348 × Std/Woche), aus 2 Abrechnungen abgeleitet" }
];
// Stundensatz für ausgezahltes Zeitguthaben (§ 22 Abs. 6). Aus den Abrechnungen Aug. und Okt. 2026 abgeleitet:
// Die Schichtzulage geht dort nochmals mit dem Teilzeitfaktor ein.
function zgRate(t, g, s, v) {
  const tz = (s.woStd || VOLLZEIT) / VOLLZEIT, e = t.monat[g] ? t.monat[g][s.stf - 1] : null; if (e == null) return null;
  const k = byDate(KINDER, v.jahr, v.monat), sz = byDate(SCHICHT, v.jahr, v.monat);
  const szB = sz && s.schicht !== "0" ? Math.max(50, sz[s.schicht] * tz) : 0;
  return r2((e * tz + (k ? k.v * s.kinder * tz : 0) + szB * tz) / (4.348 * (s.woStd || VOLLZEIT)));
}
// Vertretungs-Kürzel im Dienstplan. Ziffer = Fallgruppe, Buchstabe a = nur Mo–Fr 6–22 Uhr, b = Wochenende/Feiertag/Nacht.
// Bestätigt: 1b (Diensttausch WE/FT/Nacht), 2b (aus Frei, 120 €), 3a (50 €). Der Rest ist aus § 17 Abs. 1 abgeleitet.
// Beträge bestätigt durch DV Ausfallmanagement vom 06.03.2026, § 4 Abs. 5 (ohne Dokumentation der Anfrage gilt die kürzeste Frist)
let VZ_MAP = { "1a": 50, "1b": 60, "2a": 100, "2b": 120, "3a": 50, "3b": 60, "RB": 30 };
function vzAusserhalb(t) {
  if (isFeiertag(t.date)) return true;
  return timeline(t.segs).filter(s => s.typ === "arbeit" || s.typ === "bereit").some(s => {
    for (let m = s.a; m < s.b; m += 15) { const day = t.date + Math.floor(m / 1440) * D, tod = ((m % 1440) + 1440) % 1440, w = new Date(day).getUTCDay();
      if (w === 0 || w === 6 || isFeiertag(day) || tod < 360 || tod >= 1320) return true; }
    return false; });
}
const isVtz = n => /^VTZ\s*\d+/.test(n);
const KNOWN_LA = new Set(POSTEN.flatMap(p => p.viv || []));
const knownLa = n => KNOWN_LA.has(n) || isVtz(n) || /^FT BD/.test(n);

function pruefen(viv, own, set, abr) {
  const rows = [];
  if (!viv || !viv.jahr) return rows;
  const tA = tarifFor(viv.jahr, viv.monat);
  const am = addMonths(viv.jahr, viv.monat, 2); const tP = tarifFor(am.y, am.m);
  const g = set.grp, tz = (set.woStd || VOLLZEIT) / VOLLZEIT;
  const la = name => { const x = viv.lohnarten.filter(l => l.name === name); return x.length ? r2(x.reduce((s, l) => s + l.menge, 0)) : null; };
  const abrLeer = !Object.values(abr || {}).some(x => x && ((x.m || "").trim() || (x.b || "").trim()));
  const fixRow = (row, exp, formula) => { row.exp = exp; row.formula = formula; row.status = row.aB == null ? "open" : (Math.abs(row.aB - exp) <= 0.02 ? "ok" : "bad"); if (row.aB == null) row.notes.push("Betrag aus der Abrechnung fehlt noch."); };
  for (const p of POSTEN) {
    const a = abr[p.key] || {}; const aM = num(a.m), aB = num(a.b);
    const row = { p, aM, aB, status: "open", notes: [] };
    if (p.kind === "grund") {
      const arr = tP && tP.monat[g]; const v = arr ? arr[set.stf - 1] : null;
      if (v == null) row.notes.push("Kein Tabellenwert für diese Gruppe/Stufe hinterlegt.");
      else fixRow(row, r2(v * tz), `${eur(v)} × ${de(set.woStd || VOLLZEIT)}/${de(VOLLZEIT, 1)} Std (Tabelle ab ${tP.ab.split("-").reverse().join(".")})`);
      rows.push(row); continue;
    }
    if (p.kind === "kinder") {
      if (!set.kinder && aB == null) continue;
      const k = byDate(KINDER, am.y, am.m);
      if (!k) row.notes.push("Kein Betrag für diesen Monat hinterlegt.");
      else fixRow(row, r2(k.v * set.kinder * tz), `${eur(k.v)} × ${set.kinder} ${set.kinder === 1 ? "Kind" : "Kinder"}${tz < 1 ? ` × ${de(set.woStd)}/${de(VOLLZEIT, 1)}` : ""}`);
      rows.push(row); continue;
    }
    if (p.kind === "sz") {
      const q = (p.viv || []).map(la).find(x => x != null);
      if (set.schicht === "0" && aB == null) continue;
      if (q == null && aB == null) continue;
      const s = byDate(SCHICHT, viv.jahr, viv.monat);
      if (!s || set.schicht === "0") { row.notes.push(set.schicht === "0" ? "Laut Einstellungen keine Schichtzulage." : "Kein Betrag für diesen Monat hinterlegt."); row.status = aB ? "bad" : "open"; rows.push(row); continue; }
      const voll = s[set.schicht]; const exp = r2(Math.max(50, voll * tz));
      fixRow(row, exp, `${eur(voll)}${tz < 1 ? ` × ${de(set.woStd)}/${de(VOLLZEIT, 1)}` : ""}, mindestens 50 €`);
      rows.push(row); continue;
    }
    if (p.kind === "vtz") {
      const list = viv.lohnarten.filter(l => isVtz(l.name));
      if (!list.length && aB == null) continue;
      const q = r2(list.reduce((s, l) => s + l.menge, 0)); row.q = q;
      const exp = r2(list.reduce((s, l) => s + l.menge * +l.name.match(/\d+/)[0], 0));
      if (aM != null && Math.abs(aM - q) > 0.005) row.notes.push({ bad: true, t: `Abrechnung führt ${de(aM)} Fälle, laut Vivendi ${de(q)}.` });
      fixRow(row, exp, list.map(l => `${de(l.menge, 0)} × ${l.name.match(/\d+/)[0]} €`).join(" + ") || "keine Vertretung in Vivendi");
      if (aM != null && Math.abs(aM - q) > 0.005) row.status = "bad";
      const vzTage = viv.tage.filter(t => (t.vz || []).length);
      if (vzTage.length) row.notes.push(`Laut Dienstplan: ${vzTage.map(t => `${t.vz.join("/")} am ${wdOf(t.date)} ${dm(t.date)}`).join(", ")}`);
      vzTage.forEach(t => t.vz.forEach(c => { const k = c.replace(/^VZ\s*/, ""), soll = VZ_MAP[k], aus = vzAusserhalb(t);
        if (/a$/.test(k) && aus) row.notes.push({ bad: true, t: `${c} am ${dm(t.date)}: Der Dienst liegt ganz oder teilweise außerhalb von Mo–Fr 6–22 Uhr. Laut § 17 Abs. 1 stünde dann die höhere Stufe zu (${c.replace(/a$/, "b")}, ${VZ_MAP[k.replace(/a$/, "b")] || "?"} € statt ${soll} €).` });
        const paid = viv.lohnarten.filter(l => isVtz(l.name)).map(l => +l.name.match(/\d+/)[0]);
        if (soll && vzTage.length === 1 && t.vz.length === 1 && paid.length === 1 && paid[0] !== soll) row.notes.push({ bad: true, t: `${c} entspricht vermutlich ${soll} €, Vivendi zahlt ${paid[0]} €.` }); }));
      // Erwarteter Betrag nach Tarif: Stufe b, wenn der Dienst außerhalb von Mo–Fr 6–22 Uhr liegt
      const tarifList = vzTage.flatMap(t => t.vz.map(c => { let k = c.replace(/^VZ\s*/, ""); if (/a$/.test(k) && vzAusserhalb(t)) k = k.replace(/a$/, "b"); return VZ_MAP[k]; }));
      if (tarifList.length && tarifList.length === q && tarifList.every(x => x != null)) {
        const expT = tarifList.reduce((s, x) => s + x, 0);
        if (Math.abs(expT - exp) > 0.005) { row.exp = expT; row.formula = tarifList.map(x => `${x} €`).join(" + ") + " (nach § 17 Abs. 1)"; row.status = row.aB == null ? "open" : (Math.abs(row.aB - expT) <= 0.02 ? "ok" : "bad"); }
      }
      if (vzTage.reduce((x, t) => x + t.vz.length, 0) !== q) row.notes.push({ bad: true, t: `Im Dienstplan stehen ${vzTage.reduce((x, t) => x + t.vz.length, 0)} Vertretungen, Vivendi zahlt ${de(q, 0)}.` });
      row.notes.push("Höhe laut DV Ausfallmanagement: aus Frei <48 Std 100/120 €, 48–168 Std 50/60 €, Diensttausch 50/60 €, isolierte RB 30 € (jeweils Mo–Fr 6–22 Uhr / sonst). Ist der Zeitpunkt der Anfrage nicht dokumentiert, gilt die kürzeste Frist.");
      rows.push(row); continue;
    }
    let qViv = null; for (const n of p.viv || []) { const q = la(n); if (q != null) qViv = (qViv || 0) + q; }
    if (p.vivRe) viv.lohnarten.filter(l => p.vivRe.test(l.name)).forEach(l => qViv = r2((qViv || 0) + l.menge));
    if (p.key === "bd" && qViv == null && own.dienste.length) row.notes.push("Vivendi hat für diesen Monat noch keine BD-Stunden gebucht. Gerechnet wird mit der eigenen Zählung.");
    const qOwn = p.own ? own[p.own] : null;
    const q = qViv != null ? qViv : (qOwn ? qOwn : null);
    row.q = q;
    if (q == null && aB == null && aM == null) continue;
    if (p.own && qViv != null && qOwn != null && Math.abs(qViv - qOwn) > 0.01)
      row.notes.push({ bad: true, t: `Vivendi zählt ${de(qViv)} ${p.unit}, aus den Dienstzeilen nachgezählt ${de(qOwn)} ${p.unit}.` });
    const qtyBad = aM != null && q != null && Math.abs(aM - q) > 0.005;
    if (qtyBad) row.notes.push({ bad: true, t: `Abrechnung führt ${de(aM)} ${p.unit}, laut Vivendi ${de(q)} ${p.unit}.` });
    if (p.kind === "open") {
      row.status = qtyBad ? "bad" : "open";
      if (aM == null && aB == null && q > 0) row.notes.push(`${de(q)} ${p.unit} in Vivendi, in der Abrechnung noch nichts eingetragen.`);
      row.notes.push(p.why + (q != null && !qtyBad && aM != null ? `. Menge (${de(q)} ${p.unit}) stimmt.` : "."));
      rows.push(row); continue;
    }
    const rate = tA ? p.rate(tA, g, set, viv) : null;
    if (rate == null && ["url","krank"].includes(p.key)) { row.status = "open"; row.notes.push(urlRateTxt(viv)); rows.push(row); continue; }
    if (rate == null) { row.status = "open"; row.notes.push("Kein Tarifwert für diesen Monat oder diese Gruppe hinterlegt."); rows.push(row); continue; }
    const f = 1;
    const qq = q != null ? q : 0;
    row.exp = r2(qq * f * rate);
    row.formula = `${de(qq)} ${p.unit} × ${eur(rate)} (${p.rateTxt(tA, g, set, viv)})`;
    if (aB == null) {
      if (row.exp > 0) {
        if (abrLeer) { row.status = "open"; row.notes.push("Noch keine Abrechnung eingetragen."); }
        else { row.status = "bad"; row.notes.push({ bad: true, t: "Fehlt in der Abrechnung." }); }
      } else continue;
    } else row.status = Math.abs(aB - row.exp) <= 0.02 && !qtyBad ? "ok" : "bad";
    rows.push(row);
  }
  return rows;
}

// Standardwerte sichern und Tarif tauschen (Tarif-Editor)
const DEFAULT_TARIF = JSON.parse(JSON.stringify({ tarif: TARIF, schicht: SCHICHT, kinder: KINDER, bdStufe: BD_STUFE, vz: VZ_MAP }));
function setTarif(d) {
  d = d || DEFAULT_TARIF;
  TARIF = JSON.parse(JSON.stringify(d.tarif)).sort((a, b) => a.ab < b.ab ? -1 : 1);
  SCHICHT = JSON.parse(JSON.stringify(d.schicht)).sort((a, b) => a.ab < b.ab ? -1 : 1);
  KINDER = JSON.parse(JSON.stringify(d.kinder)).sort((a, b) => a.ab < b.ab ? -1 : 1);
  BD_STUFE = Object.assign({}, d.bdStufe); VZ_MAP = Object.assign({}, d.vz);
}
