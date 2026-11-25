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

function cashRulesGuideHtml(c){
  c = c || {};
  var lc = c.lossCarry || {};
  var vac = c.isVacationMonth || lc.skippedVacation;
  var modeLabel = vac ? "Vacation / break month" : "Semester / working month";
  var modeDetail = vac
    ? "Most days are break. <b>Prior-loss recovery share = ₩0</b> this month (old losses wait for working months)."
    : "Shop is mostly open. If earlier months are still under water, a <b>prior-loss recovery share</b> is shown (total hole ÷ ≈ "+
      (Number(lc.divisor)||PROFIT_BUCKET.semesterAccrualMonths).toFixed(1)+" working months).";
  return '<div class="cash-guide">'+
    '<div class="eyebrow">How to read the minus (−)</div>'+
    '<p class="lede" style="margin:6px 0 0"><b>This month:</b> '+modeLabel+'. '+modeDetail+'</p>'+
    '<ul class="cash-guide-list">'+
      '<li><b>Cash after loans</b> = this month’s net profit − loan payment. A minus here means the loan (or costs) beat this month’s profit — not monsoon.</li>'+
      '<li><b>Monsoon share (15%)</b> = only from <b>positive</b> cash after loans. If cash after loans is − or ₩0, monsoon is <b>₩0</b> and does not add a minus.</li>'+
      '<li><b>Left after monsoon</b> = cash after loans − monsoon. When monsoon is ₩0, this matches cash after loans.</li>'+
      '<li><b>Prior-loss recovery share</b> = planning catch-up for old losing months. Shown only in <b>semester / working</b> months — <b>not during vacation</b>.</li>'+
      '<li><b>After recovery plan</b> = left after monsoon − recovery share (planning gap). Separate from monsoon.</li>'+
    '</ul></div>';
}

function monthlyCashAfterLoansHtml(c){
  if (!c) return "";
  var lc = c.lossCarry || {};
  var monsoon = c.monsoonShare != null ? c.monsoonShare : 0;
  var left = c.leftAfterMonsoon != null ? c.leftAfterMonsoon : c.cashAfterLoans;
  var plan = c.afterRecoveryPlan != null ? c.afterRecoveryPlan : (c.cashAfterCarry != null ? c.cashAfterCarry : left);
  var leftNeg = left < 0;
  var rec = c.monthsToRecover;
  var recText = rec == null || rec <= 0
    ? "Not yet — need positive cash after monsoon each month"
    : (Math.ceil(rec * 10) / 10) + " months at this month\u2019s cash after monsoon";
  var carryNote = "";
  if (lc.skippedVacation){
    carryNote = "Vacation / break month — prior-loss recovery share is <b>₩0</b>.";
  } else if ((lc.priorDeficit || 0) > 0){
    carryNote = "Semester month: prior deficit "+won(lc.priorDeficit)+" ("+(lc.lossMonths||0)+" loss month(s)) → recovery share this month "+won(c.lossCarryCharge||0)+".";
  } else {
    carryNote = "No prior-month deficit to recover.";
  }
  return '<h3 class="labor-subhead">Cash after loans &amp; monsoon</h3>'+
    cashRulesGuideHtml(c)+
    '<div class="formula-list" style="margin-top:12px">'+
      '<div class="formula"><dt>Net profit (same as above)</dt><dd class="tnum">'+signedWon(c.netProfit)+'</dd></div>'+
      '<div class="formula"><dt>Loan payment (cash out)</dt><dd class="tnum">'+wonParen(-c.loanPayment)+'</dd></div>'+
      '<div class="formula"><dt>Cash after loans</dt><dd class="tnum">'+signedWon(c.cashAfterLoans)+'</dd></div>'+
      '<div class="formula" style="background:var(--accent-soft)"><dt>Monsoon share (15%)</dt><dd class="tnum" style="font-size:16px">'+won(monsoon)+'</dd></div>'+
      '<div class="formula"'+(leftNeg ? "" : ' style="background:var(--accent-soft)"')+'><dt>Left after monsoon</dt><dd class="tnum" style="font-size:16px;color:'+(leftNeg ? "var(--critical)" : "var(--ink)")+'">'+signedWon(left)+'</dd></div>'+
      '<div class="formula"><dt>Prior-loss recovery share (semester only)</dt><dd class="tnum">'+wonParen(-(c.lossCarryCharge||0))+'</dd></div>'+
      '<div class="formula"><dt>After recovery plan (planning)</dt><dd class="tnum">'+signedWon(plan)+'</dd></div>'+
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
      '<b>Monsoon share</b> ('+pct(b.shareRate, 0)+') comes from <b>cash after loans</b> only (see Cash after loans &amp; monsoon above).</p>'+
    '<div class="formula-list">'+
      row("Net profit (start)", a.netProfit, "", true)+
      row("1. VAT reserve", -a.vat, pct(SALES_VAT_RATE, 1)+" of POS sales")+
      row("2. Tax bucket", -a.tax, pct(b.taxRate, 0)+" of net profit")+
      row("3. Vacation bucket", -a.vacation, vacNote)+
      row("4. Maintenance bucket", -a.maintenance, pct(b.maintRate, 0)+" of net profit")+
      row("After buckets", a.afterBuckets, "before cash / monsoon steps", true)+
      row("Monsoon share ("+pct(b.shareRate, 0)+")", a.monsoonShare != null ? a.monsoonShare : a.share15, "15% of cash after loans", true)+
      row("Left after monsoon", a.leftAfterShare, "cash after loans − monsoon", false)+
    '</div>'+
    shortfall+
    '<p class="note">Monsoon is ₩0 when cash after loans is negative. Prior-loss recovery is separate and only applies in semester months — not vacation.</p>'+
  '</section>';
}
