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

function monthsRecoverLabel(months){
  if (months == null || months <= 0) return "Not yet — cash after loans must be positive";
  return (Math.ceil(months * 10) / 10) + " months at this month\u2019s pace";
}

function realNumbersHtml(r){
  if (!r) return "";
  var neg = r.cashAfterLoans < 0;
  return '<section class="card real-numbers">'+
    '<h2>Your real numbers</h2>'+
    '<p class="lede">Nothing counted twice: food, wages, and rent/bills are already inside <b>real profit</b>. Loan payment is subtracted once for <b>cash left</b>. Equipment spread is shown for reference only — it is <b>not</b> in P&amp;L and <b>not</b> subtracted from cash.</p>'+
    '<div class="formula-list">'+
      '<div class="formula" style="background:var(--accent-soft)"><dt>Real profit (this month)</dt>'+
        '<span class="profit-bucket-note">Sales − COGS − labor − overhead (each once)</span>'+
        '<dd class="tnum" style="font-size:16px">'+signedWon(r.realProfit)+'</dd></div>'+
      '<div class="formula"><dt>How profit was built</dt>'+
        '<span class="profit-bucket-note">Sales '+won(r.sales)+' · COGS '+wonParen(-r.cogsAmt)+' · Labor '+wonParen(-r.labor)+' · Overhead '+wonParen(-r.overhead)+'</span>'+
        '<dd class="tnum">'+signedWon(r.realProfit)+'</dd></div>'+
      '<div class="formula real-info-only"><dt>Setup spread (non-cash, info only)</dt>'+
        '<span class="profit-bucket-note">Equipment &amp; contractor — not subtracted below</span>'+
        '<dd class="tnum">'+won(r.setupSpreadMonthly)+' / mo</dd></div>'+
      '<div class="formula"><dt>Loan payment (cash out)</dt>'+
        '<span class="profit-bucket-note">Both loans — interest already inside</span>'+
        '<dd class="tnum">'+wonParen(-r.loanPayment)+'</dd></div>'+
      '<div class="formula"'+(neg ? "" : ' style="background:var(--accent-soft)"')+'><dt>Cash left after loans</dt>'+
        '<span class="profit-bucket-note">Real profit − loan payment only</span>'+
        '<dd class="tnum" style="font-size:17px;color:'+(neg ? "var(--critical)" : "var(--ink)")+'">'+signedWon(r.cashAfterLoans)+'</dd></div>'+
      '<div class="formula"><dt>My own money in the business</dt>'+
        '<span class="profit-bucket-note">From Setup &amp; assets funding (total − loans)</span>'+
        '<dd class="tnum">'+won(r.ownMoney)+'</dd></div>'+
      '<div class="formula"><dt>Months to get my own money back</dt>'+
        '<span class="profit-bucket-note">Own money ÷ cash left this month</span>'+
        '<dd class="tnum" style="font-weight:700">'+monthsRecoverLabel(r.monthsToRecoverOwnMoney)+'</dd></div>'+
    '</div>'+
  '</section>';
}

function cashViewHtml(r){
  return realNumbersHtml(r);
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
    '<h2>Profit buckets (planning only)</h2>'+
    '<p class="lede">Optional reserves from real profit — <b>does not change cash left above</b>. Tax and maintenance are '+pct(b.taxRate, 0)+' and '+pct(b.maintRate, 0)+' of net profit (zero if the month is a loss). '+
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
