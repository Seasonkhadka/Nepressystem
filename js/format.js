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

function monthlyCashAfterLoansHtml(c){
  if (!c) return "";
  var lc = c.lossCarry || {};
  var after = c.cashAfterCarry != null ? c.cashAfterCarry : c.cashAfterLoans;
  var neg = after < 0;
  var rec = c.monthsToRecover;
  var recText = rec == null || rec <= 0
    ? "Not yet — need positive cash after monsoon share each month"
    : (Math.ceil(rec * 10) / 10) + " months at this month\u2019s cash after monsoon share";
  var carryNote = "";
  if (lc.skippedVacation){
    carryNote = "This month is mostly vacation — prior losses are <b>not</b> charged here.";
  } else if ((lc.priorDeficit || 0) > 0){
    carryNote = "Prior months are "+won(lc.priorDeficit)+" under water overall ("+(lc.lossMonths||0)+" loss month(s)). Spread over ≈ "+
      (Number(lc.divisor)||PROFIT_BUCKET.semesterAccrualMonths).toFixed(1)+" working months → this month’s share "+won(c.lossCarryCharge||0)+".";
  } else {
    carryNote = "No prior-month deficit to carry forward.";
  }
  var monsoon = c.monsoonShare != null ? c.monsoonShare : 0;
  var left = c.leftAfterMonsoon != null ? c.leftAfterMonsoon : after;
  return '<h3 class="labor-subhead">Cash after loans</h3>'+
    '<p class="lede">Net profit already counted COGS, labor, and overhead. Loan payment (Setup &amp; assets) comes out next. Prior-month losses are spread into working months only (not vacation months). Then <b>'+pct(PROFIT_BUCKET.shareRate, 0)+' monsoon share</b> is set aside from what is left.</p>'+
    '<div class="formula-list">'+
      '<div class="formula"><dt>Net profit (same as above)</dt><dd class="tnum">'+signedWon(c.netProfit)+'</dd></div>'+
      '<div class="formula"><dt>Loan payment (cash out)</dt><dd class="tnum">'+wonParen(-c.loanPayment)+'</dd></div>'+
      '<div class="formula"><dt>Cash after loans</dt><dd class="tnum">'+signedWon(c.cashAfterLoans)+'</dd></div>'+
      '<div class="formula"><dt>Prior loss carry (÷ working months)</dt><dd class="tnum">'+wonParen(-(c.lossCarryCharge||0))+'</dd></div>'+
      '<div class="formula"><dt>Cash after loss carry</dt><dd class="tnum">'+signedWon(after)+'</dd></div>'+
      '<div class="formula" style="background:var(--accent-soft)"><dt>Monsoon share ('+pct(PROFIT_BUCKET.shareRate, 0)+')</dt><dd class="tnum" style="font-size:16px">'+signedWon(monsoon)+'</dd></div>'+
      '<div class="formula"'+(neg ? "" : ' style="background:var(--accent-soft)"')+'><dt>Left after monsoon share</dt><dd class="tnum" style="font-size:16px;color:'+(neg ? "var(--critical)" : "var(--ink)")+'">'+signedWon(left)+'</dd></div>'+
      '<div class="formula"><dt>My own money (Setup funding)</dt><dd class="tnum">'+won(c.ownMoney)+'</dd></div>'+
      '<div class="formula"><dt>Months to get own money back</dt><dd class="tnum">'+recText+'</dd></div>'+
    '</div>'+
    '<p class="note">'+carryNote+'</p>';
}

function breakEvenHtml(be){
  if (!be) return "";
  if (be.monthGross == null){
    return '<div class="break-even-callout">'+
      '<p class="lede" style="margin:0">Break-even sales need a positive margin after VAT and variable overhead. Lower variable overhead or review costs.</p></div>';
  }
  var od = be.openDays;
  var lines =
    'Covers this month\'s <b>COGS</b> ('+won(be.cogs)+' from Raw Materials) + <b>labor</b> '+won(be.labor)+' + <b>overhead</b> '+won(be.overhead)+', after '+pct(SALES_VAT_RATE, 1)+' VAT';
  if (be.marginOnGross < 1) lines += ' and variable overhead on sales';
  lines += '.';
  var status = "";
  if (be.gapGross > 0){
    status = 'You are <b>'+won(be.gapGross)+'</b> below that on POS sales so far.';
  } else if (be.surplusGross > 0 && be.currentGross > 0){
    status = 'You are <b>'+won(be.surplusGross)+'</b> above break-even on POS sales so far.';
  } else if (be.fixedCosts <= 0){
    status = 'No material, labor, or overhead entered yet — target updates when those tabs have data.';
  }
  return '<div class="break-even-callout">'+
    '<div class="eyebrow">Break-even (net profit ≥ 0)</div>'+
    '<p class="break-even-target tnum"><b>'+won(be.monthGross)+'</b> POS sales this month</p>'+
    '<p class="lede" style="margin:8px 0 0">≈ <b class="tnum">'+won(be.perOpenDayGross)+'</b> POS per open day ('+od+' days). '+lines+'</p>'+
    (status ? '<p class="note" style="margin:8px 0 0">'+status+'</p>' : '')+
  '</div>';
}

function profitAllocationHtml(a){
  if (!a) return "";
  var b = PROFIT_BUCKET;
  var r = a.vacationRates || vacationBucketRates();
  var vacNote = r.label === "uni"
    ? pct(r.vacationMonths / r.semesterAccrualMonths, 1)+" of overhead (≈ "+r.vacationMonths.toFixed(1)+" mo break ÷ "+r.semesterAccrualMonths.toFixed(1)+" mo semester)"
    : b.vacationMonths + " mo vacation overhead ÷ " + b.semesterAccrualMonths + " mo semester accrual";
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
    '<p class="lede">Split <b>net profit</b> into reserves. VAT is '+pct(SALES_VAT_RATE, 1)+' of POS sales (same amount removed from revenue above). Tax and maintenance are '+pct(b.taxRate, 0)+' and '+pct(b.maintRate, 0)+' of net profit (zero if the month is a loss). '+
      'Vacation accrual is '+won(a.vacation)+' this month: overhead × ('+vacNote+') so '+b.vacationMonths+' closed months are funded while you work '+b.semesterAccrualMonths+' months. '+
      '<b>Monsoon share</b> ('+pct(b.shareRate, 0)+') is taken from <b>cash after loans &amp; loss carry</b> — see Cash after loans above.</p>'+
    '<div class="formula-list">'+
      row("Net profit (start)", a.netProfit, "", true)+
      row("1. VAT reserve", -a.vat, pct(SALES_VAT_RATE, 1)+" of POS sales")+
      row("2. Tax bucket", -a.tax, pct(b.taxRate, 0)+" of net profit")+
      row("3. Vacation bucket", -a.vacation, vacNote)+
      row("4. Maintenance bucket", -a.maintenance, pct(b.maintRate, 0)+" of net profit")+
      row("After buckets", a.afterBuckets, "before cash / monsoon steps", true)+
      row("Monsoon share ("+pct(b.shareRate, 0)+")", a.monsoonShare != null ? a.monsoonShare : a.share15, "of cash after loans &amp; loss carry", true)+
      row("Left after monsoon share", a.leftAfterShare, "keep or reinvest", false)+
    '</div>'+
    shortfall+
    '<p class="note">Monsoon share uses cash after loan payment and prior-loss carry (0% if that cash is negative). Reserves (VAT, tax, vacation, maintenance) are funded from net profit first in this planning view.</p>'+
  '</section>';
}
