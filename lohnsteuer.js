// Lohnsteuer 2026 nach dem Programmablaufplan des BMF (Stand 12.11.2025), vereinfacht auf das Nötige:
// laufender Monatslohn, sonstige Bezüge, Solidaritätszuschlag, Kirchensteuer-Bemessung. Beträge in Euro.
(function (root) {
  "use strict";
  const PARAM = {
    2026: { GFB: 12348, Z2: 17799, Z3: 69878, Z4: 277825, A2: 914.51, B2: 1400, A3: 173.10, B3: 2397, C3: 1034.87, C4: 11135.63, C5: 19470.38,
            BBGRV: 101400, BBGKV: 69750, RVSATZ: 0.093, AVSATZ: 0.013, SOLZFREI: 20350, KFB: 9756, EFA: 4260, ANP: 1230, SAP: 36,
            W1: 14071, W2: 34939, W3: 222260 }
  };
  const floor = Math.floor, cent = v => floor(v * 100 + 1e-7) / 100;
  function tarif(P, x) {
    x = floor(x);
    if (x <= P.GFB) return 0;
    if (x <= P.Z2) { const y = (x - P.GFB) / 10000; return floor((P.A2 * y + P.B2) * y); }
    if (x <= P.Z3) { const z = (x - P.Z2) / 10000; return floor((P.A3 * z + P.B3) * z + P.C3); }
    if (x <= P.Z4) return floor(x * 0.42 - P.C4);
    return floor(x * 0.45 - P.C5);
  }
  function up56(P, zx) { const st1 = tarif(P, zx * 1.25), st2 = tarif(P, zx * 0.75); return Math.max((st1 - st2) * 2, floor(zx * 0.14)); }
  function mst56(P, zzx) {
    if (zzx > P.W2) { let st = up56(P, P.W2); if (zzx > P.W3) { st = floor(st + (P.W3 - P.W2) * 0.42); return floor(st + (zzx - P.W3) * 0.45); } return floor(st + (zzx - P.W2) * 0.42); }
    let st = up56(P, zzx);
    if (zzx > P.W1) { const vergl = st, hoch = floor(up56(P, P.W1) + (zzx - P.W1) * 0.42); st = Math.min(hoch, vergl); }
    return st;
  }
  // Jahreslohnsteuer für zu versteuerndes Jahreseinkommen ohne/mit Kinderfreibeträgen
  function jahr(P, o, zre4, kfb) {
    const stkl = o.stkl;
    const anp = stkl < 6 ? Math.min(P.ANP, zre4) : 0, sap = stkl < 6 ? P.SAP : 0, efa = stkl === 2 ? P.EFA : 0;
    let kf = 0; if (kfb && o.zkf > 0) kf = stkl === 4 ? o.zkf * P.KFB / 2 : stkl <= 3 ? o.zkf * P.KFB : 0;
    const kztab = stkl === 3 ? 2 : 1;
    // Vorsorgepauschale: Rente (gesetzlich oder Versorgungswerk), Kranken-/Pflegeversicherung, mindestens Höchstbetragsrechnung
    const vpR = o.rv ? Math.min(zre4, P.BBGRV) * P.RVSATZ : 0;
    let vpKV = 0;
    if (o.pkv) vpKV = Math.max(0, (o.pkvBeitrag || 0) * 12 - (o.pkvZuschuss || 0) * 12);
    else if (stkl !== 6) vpKV = Math.min(zre4, P.BBGKV) * (o.kvz / 2 / 100 + 0.07 + pvSatz(o));
    const vpAV = o.av ? Math.min(zre4, P.BBGRV) * P.AVSATZ : 0;
    let vsp = vpR + vpKV; const vspN = vpR + Math.min(vpAV + vpKV, 1900); if (vspN > vsp) vsp = vspN;
    vsp = Math.ceil(vsp);
    const zve = Math.max(0, zre4 - anp - sap - efa - kf - vsp);
    if (stkl >= 5) return mst56(P, floor(zve));
    return tarif(P, floor(zve / kztab)) * kztab;
  }
  function pvSatz(o) {
    if (o.pvKinderlos) return 0.018 + 0.006;
    const abschlag = Math.min(4, Math.max(0, (o.pvKinder || 0) - 1)) * 0.0025;
    return 0.018 - abschlag;
  }
  function soli(P, o, jbmg) {
    const frei = P.SOLZFREI * (o.stkl === 3 ? 2 : 1);
    if (jbmg <= frei) return 0;
    return cent(Math.min(jbmg * 0.055, (jbmg - frei) * 0.119));
  }
  // Monatsberechnung. lfd = steuerpflichtiger laufender Monatslohn, sonst = sonstiger Bezug in diesem Monat,
  // jahrBisher = steuerpflichtiger Arbeitslohn des Jahres ohne diesen sonstigen Bezug (für die Jahresrechnung des sonstigen Bezugs)
  function monat(o, lfd, sonst, jahrBisher) {
    const P = PARAM[o.jahr] || PARAM[2026];
    const zre4 = cent(lfd * 12);
    const lstJ = jahr(P, o, zre4, false), bmgJ = jahr(P, o, zre4, true);
    const lst = cent(lstJ / 12), bmg = cent(bmgJ / 12);
    const res = { lst, soli: cent(soli(P, o, bmgJ) / 12), kist: o.kist ? cent(bmg * o.kist / 100) : 0, lstSonst: 0, soliSonst: 0, kistSonst: 0 };
    if (sonst > 0) {
      const basis = jahrBisher != null ? jahrBisher : zre4;
      const a = jahr(P, o, basis, false), b = jahr(P, o, basis + sonst, false);
      const ka = jahr(P, o, basis, true), kb = jahr(P, o, basis + sonst, true);
      res.lstSonst = Math.max(0, b - a);
      res.soliSonst = Math.max(0, cent(soli(P, o, kb) - soli(P, o, ka)));
      res.kistSonst = o.kist ? cent((kb - ka) * o.kist / 100) : 0;
    }
    return res;
  }
  root.Lohnsteuer = { monat, jahr: (o, zre4, kfb) => jahr(PARAM[o.jahr] || PARAM[2026], o, zre4, kfb), PARAM };
})(typeof window !== "undefined" ? window : globalThis);
