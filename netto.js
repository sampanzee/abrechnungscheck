// Netto-Schätzung je Abrechnung: laufender Monat + aufgerollte Zulagen der Vormonate. Werte 2026, Beträge in Euro.
(function (root) {
  "use strict";
  const L = root.Lohnsteuer;
  const SV = { 2026: { BBGKV: 5812.50, BBGRV: 8450, KV: 7.3, AV: 1.3 } };
  const c = v => Math.round(v * 100 + 1e-7) / 100;
  function pvAN(p) { if (p.pvKinderlos) return 2.4; return 1.8 - Math.min(4, Math.max(0, (p.pvKinder || 0) - 1)) * 0.25; }
  function lstOpts(p, jahr) { return { jahr, stkl: p.stkl, zkf: p.zkf, kvz: p.kvz, pvKinder: p.pvKinder, pvKinderlos: p.pvKinderlos, rv: true, av: true, kist: p.kist, pkv: p.pkv, pkvBeitrag: p.pkvBeitrag, pkvZuschuss: p.pkvZuschuss }; }
  // Sozialversicherung (Arbeitnehmeranteil) auf ein SV-Brutto, optional nur der Teil oberhalb von "schon"
  function sv(p, jahr, brutto, schon) {
    const S = SV[jahr] || SV[2026]; schon = schon || 0;
    const kvB = Math.max(0, Math.min(brutto + schon, S.BBGKV) - Math.min(schon, S.BBGKV));
    const rvB = Math.max(0, Math.min(brutto + schon, S.BBGRV) - Math.min(schon, S.BBGRV));
    const r = { kv: 0, zb: 0, pv: 0, av: c(rvB * S.AV / 100), rv: 0, bve: 0, bveZuschuss: 0 };
    if (!p.pkv) { r.kv = c(kvB * S.KV / 100); r.zb = c(kvB * p.kvz / 200); r.pv = c(kvB * pvAN(p) / 100); }
    if (p.versorgungswerk) { r.bve = c(rvB * p.bveSatz / 100); r.bveZuschuss = c(r.bve / 2); }
    else r.rv = c(rvB * 9.3 / 100);
    r.summe = c(r.kv + r.zb + r.pv + r.av + r.rv + r.bve - r.bveZuschuss);
    return r;
  }
  // nnlL/nnlV: steuerfreie, aber sozialversicherungspflichtige ZV-Umlage („NNL SV-PflichtZV“), lfd. Monat / Vormonate
  // a: { jahr, entgelt, kinder, vl, arbeitsJahr, entgeltArbeitsmonat, kinderArbeitsmonat, vlArbeitsmonat, zulagenStpfl, zulagenFrei, zeitguthaben }
  function abrechnung(p, a) {
    const zvAN = v => c(v * (p.zvSatz || 0) / 100);
    // laufender Monat
    const bruttoL = c(a.entgelt + a.kinder + a.vl);
    const zvL = zvAN(a.entgelt);
    const stpflL = c(bruttoL - (p.entgeltumwandlung || 0) - zvL);
    const tL = L.monat(lstOpts(p, a.jahr), stpflL, 0);
    const svL = sv(p, a.jahr, c(stpflL + (a.nnlL || 0)), 0);
    const pkvNetto = p.pkv ? c((p.pkvZuschuss || 0) - (p.pkvBeitrag || 0)) : 0;
    const auszL = c(bruttoL - tL.lst - tL.soli - tL.kist - svL.summe - zvL - (p.entgeltumwandlung || 0) - (p.vwlSparrate || 0) + (p.agZuschussFrei || 0) + pkvNetto);
    // Vormonate: aufgerollt im Arbeitsmonat
    const stpflArb = c(a.entgeltArbeitsmonat + a.kinderArbeitsmonat + a.vlArbeitsmonat - (p.entgeltumwandlung || 0) - zvAN(a.entgeltArbeitsmonat));
    const zvV = zvAN(a.zulagenStpfl - (a.zulagenNichtZV || 0) + a.zeitguthaben);
    const nz = c(a.zulagenStpfl - zvV);
    const o = lstOpts(p, a.arbeitsJahr);
    const t0 = L.monat(o, stpflArb, 0), t1 = L.monat(o, stpflArb + nz, 0);
    let lstV = c(t1.lst - t0.lst), soliV = c(t1.soli - t0.soli), kistV = c(t1.kist - t0.kist);
    if (a.zeitguthaben > 0) { const s = L.monat(o, stpflArb + nz, a.zeitguthaben, (stpflArb + nz) * 12); lstV = c(lstV + s.lstSonst); soliV = c(soliV + s.soliSonst); kistV = c(kistV + s.kistSonst); }
    const svV = sv(p, a.arbeitsJahr, c(nz + a.zeitguthaben + (a.nnlV || 0)), stpflArb);
    const bruttoV = c(a.zulagenStpfl + a.zulagenFrei + a.zeitguthaben);
    const auszV = c(bruttoV - lstV - soliV - kistV - svV.summe - zvV);
    return { lfd: { brutto: bruttoL, lst: tL.lst, soli: tL.soli, kist: tL.kist, sv: svL, zv: zvL, ausz: auszL },
             vor: { brutto: bruttoV, lst: lstV, soli: soliV, kist: kistV, sv: svV, zv: zvV, ausz: auszV },
             ueberweisung: c(auszL + auszV) };
  }
  root.Netto = { abrechnung, sv, SV };
})(typeof window !== "undefined" ? window : globalThis);
