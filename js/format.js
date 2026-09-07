/**
 * format.js — number/currency formatting and margin-health labeling.
 * No dependencies.
 */

function won(v){
  if (!isFinite(v)) return "₩0";
  return "₩" + Math.round(v).toLocaleString("en-US");
}

function wonShort(v){
  if (!isFinite(v)) return "0";
  var av = Math.abs(v);
  if (av >= 1000000) return (v/1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + "M";
  if (av >= 1000) return Math.round(v/1000) + "K";
  return String(Math.round(v));
}

function pct(v, d){
  d = (d === undefined) ? 1 : d;
  if (!isFinite(v)) v = 0;
  return (v*100).toFixed(d) + "%";
}

function signedWon(v){ return (v < 0 ? "−" : "") + won(Math.abs(v)); }
function signedPct(v, d){ return (v < 0 ? "−" : "+") + pct(Math.abs(v), d); }

function marginStatus(m, hasSales){
  if (!hasSales) return { label: "No data yet", color: "var(--muted)" };
  if (m >= 0.12) return { label: "Healthy", color: "var(--good)" };
  if (m >= 0.05) return { label: "Watch", color: "var(--warning-dot)" };
  return { label: "Critical", color: "var(--critical)" };
}
