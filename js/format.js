/**
 * format.js — number/currency formatting and margin-health labeling.
 * No dependencies.
 */

function won(v){
  if (!isFinite(v)) return "₩0";
  return "₩" + Math.round(v).toLocaleString("en-US");
}

function wonParen(v){
  if (!isFinite(v) || v === 0) return "₩0";
  if (v < 0) return "(" + won(Math.abs(v)) + ")";
  return won(v);
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

function wonPerUnit(v, unit){
  return won(v) + "/" + (unit || "unit");
}

function fmtQty(n){
  return String(Math.round((Number(n)||0) * 100) / 100);
}

function boughtLabel(packs, weight, unit){
  return fmtQty(packs)+" pack ("+fmtQty(weight)+" "+(unit||"kg")+")";
}

function avgUnitText(i){
  if (!i || !i.avgUnitMonth) return "—";
  if (i.usesWeight) return wonPerUnit(i.avgUnitMonth, i.unit || "unit");
  if (i.usesPacks) return wonPerUnit(i.avgUnitMonth, "pack");
  return wonPerUnit(i.avgUnitMonth, i.unit || "unit");
}

function signedWon(v){ return (v < 0 ? "−" : "") + won(Math.abs(v)); }
function signedPct(v, d){ return (v < 0 ? "−" : "+") + pct(Math.abs(v), d); }

function marginStatus(m, hasSales){
  if (!hasSales) return { label: "No data yet", color: "var(--muted)" };
  if (m >= 0.12) return { label: "Healthy", color: "var(--good)" };
  if (m >= 0.05) return { label: "Watch", color: "var(--warning-dot)" };
  return { label: "Critical", color: "var(--critical)" };
}

function profitAllocationHtml(a){
  if (!a) return "";
  var b = PROFIT_BUCKET;
  var vacNote = b.vacationMonths + " mo vacation overhead ÷ " + b.semesterAccrualMonths + " mo semester accrual";
  function row(label, val, note, highlight){
    var noteHtml = note ? '<span class="profit-bucket-note">'+note+'</span>' : "";
    return '<div class="formula"'+(highlight ? ' style="background:var(--accent-soft)"' : "")+'>'+
      '<dt>'+label+noteHtml+'</dt>'+
      '<dd class="tnum" style="font-size:13px;color:var(--ink)">'+signedWon(val)+'</dd></div>';
  }
  var shortfall = a.shortfall > 0
    ? '<p class="note" style="color:var(--warning-dot)">Buckets total more than this month\'s net profit by '+won(a.shortfall)+'. Reduce the share or raise profit before paying out.</p>'
    : "";
  return '<section class="card profit-buckets">'+
    '<h2>Profit buckets (planning)</h2>'+
    '<p class="lede">Split <b>net profit</b> into reserves. Tax and maintenance are '+pct(b.taxRate, 0)+' and '+pct(b.maintRate, 0)+' of net profit (zero if the month is a loss). '+
      'Vacation accrual is '+won(a.vacation)+' this month: overhead × ('+vacNote+') so '+b.vacationMonths+' closed months are funded while you work '+b.semesterAccrualMonths+' months.</p>'+
    '<div class="formula-list">'+
      row("Net profit (start)", a.netProfit, "", true)+
      row("1. Tax bucket", -a.tax, pct(b.taxRate, 0)+" of net profit")+
      row("2. Vacation bucket", -a.vacation, "overhead × "+b.vacationMonths+"/"+b.semesterAccrualMonths)+
      row("3. Maintenance bucket", -a.maintenance, pct(b.maintRate, 0)+" of net profit")+
      row("After buckets", a.afterBuckets, "what is left in the business", true)+
      row("15% share", a.share15, pct(b.shareRate, 0)+" of after buckets", true)+
      row("Left after 15% share", a.leftAfterShare, "keep or reinvest", false)+
    '</div>'+
    shortfall+
    '<p class="note">The 15% is taken <b>after</b> tax, vacation, and maintenance buckets — reserves are funded first.</p>'+
  '</section>';
}
