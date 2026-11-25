/**
 * format.js — number/currency formatting plus shared UI blocks (kpiTile, formulaRow,
 * cash steps, break-even, profit buckets). Reads results only — no P&L math here.
 * Labels/explanations come from copy.js (resolved at call time).
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
  if (m >= MARGIN_HEALTHY) return { label: "Healthy", color: "var(--good)" };
  if (m >= MARGIN_WATCH) return { label: "Watch", color: "var(--warning-dot)" };
  return { label: "Critical", color: "var(--critical)" };
}

/* ── Shared UI blocks ──────────────────────────────────────────────────── */

/** KPI tile (Dashboard and any summary grid). */
function kpiTile(eyebrow, value, sub, status){
  var statusHtml = status ? '<div class="status"><span class="status-dot" style="background:'+status.color+'"></span>'+status.label+'</div>' : "";
  return '<div class="kpi"><div class="eyebrow">'+eyebrow+'</div><div class="value tnum">'+value+'</div><div class="sub tnum">'+sub+'</div>'+statusHtml+'</div>';
}

/**
 * One formula row.
 * opts: { less: show as −₩ in ember, signed: −/+ ₩, paren: (₩), pct: percent,
 *         big: highlighted + larger, note: small text under the label, raw: preformatted value }
 */
function formulaRow(label, val, opts){
  opts = opts || {};
  var txt, color = "var(--ink)";
  if (opts.raw != null) txt = opts.raw;
  else if (opts.pct) txt = pct(val);
  else if (opts.less){ txt = signedWon(-Math.abs(val)); color = "var(--ember)"; }
  else if (opts.paren) txt = wonParen(val);
  else if (opts.signed){ txt = signedWon(val); if (val < 0) color = "var(--critical)"; }
  else txt = won(val);
  var note = opts.note ? '<span class="profit-bucket-note">'+opts.note+'</span>' : "";
  return '<div class="formula"'+(opts.big ? ' style="background:var(--accent-soft)"' : "")+'>'+
    '<dt>'+label+note+'</dt>'+
    '<dd class="tnum" style="font-size:'+(opts.big ? "16px" : "13px")+';color:'+color+'">'+txt+'</dd></div>';
}

/** Cash steps (Dashboard cash card + Monthly). Values come straight from computeAll().cashView. */
function cashStepsHtml(c){
  if (!c) return "";
  var lc = c.lossCarry || {};
  var rec = c.monthsToRecover;
  var recText = rec == null || rec <= 0
    ? "Not yet — needs positive cash left after monsoon"
    : (Math.ceil(rec * 10) / 10) + " months at this month’s pace";
  var carryNote = c.beforeOpening || (lc.beforeOpening) ? "Before opening ("+OPENING_DATE+") — not counted."
    : (c.openingMonth || lc.openingMonth) ? "Opening month ("+OPENING_DATE.slice(0, 7)+") — prior-loss recovery is ₩0."
    : ((lc.priorDeficit || 0) > 0
      ? "Carried loss "+won(lc.priorDeficit)+" from months after opening with real activity"+(c.isVacationMonth ? " waits (vacation month)." : " ÷ "+RECOVERY_MONTHS+" = "+won(c.recovery)+" this month.")+
        " Still to recover after this month: "+won(c.carryAfterThisMonth)+"."
      : "No carried loss from months after opening."+((c.carryAfterThisMonth || 0) > 0 ? " This month adds "+won(c.carryAfterThisMonth)+" to recover later." : ""));
  return '<div class="formula-list">'+
      formulaRow(LABEL.netProfit, c.netProfit, { signed: true })+
      formulaRow("+ "+labelTip("depreciation"), c.depreciation)+
      formulaRow("− "+labelTip("loanPrincipal"), c.loanPrincipal, { less: true })+
      formulaRow(labelTip("cashAfterLoans"), c.cashAfterLoans, { signed: true, big: true })+
      formulaRow("− "+labelTip("monsoon"), c.monsoonShare, { less: true })+
      formulaRow(LABEL.leftAfterMonsoon, c.leftAfterMonsoon, { signed: true, big: true })+
      formulaRow("− "+labelTip("recovery"), c.recovery, { less: true, note: carryNote })+
      formulaRow(labelTip("afterRecoveryPlan"), c.afterRecoveryPlan, { signed: true })+
      formulaRow("My own money (Setup funding)", c.ownMoney)+
      formulaRow("Months to get own money back", 0, { raw: recText })+
    '</div>';
}

function breakEvenHtml(be){
  if (!be) return "";
  if (be.monthGross == null){
    return '<div class="break-even-callout">'+
      '<p class="lede" style="margin:0">Break-even sales need a positive margin after VAT and variable overhead. Lower variable overhead or review costs.</p></div>';
  }
  var parts = [LABEL.cogs+' '+won(be.cogs), LABEL.labor.toLowerCase()+' '+won(be.labor), LABEL.overhead.toLowerCase()+' '+won(be.overhead)];
  if (be.depreciation) parts.push(LABEL.depreciation.toLowerCase()+' '+won(be.depreciation));
  if (be.interest) parts.push(LABEL.loanInterest.toLowerCase()+' '+won(be.interest));
  var status = "";
  if (be.gapGross > 0){
    status = 'You are <b>'+won(be.gapGross)+'</b> below that on POS sales so far.';
  } else if (be.surplusGross > 0 && be.currentGross > 0){
    status = 'You are <b>'+won(be.surplusGross)+'</b> above break-even on POS sales so far.';
  } else if (be.fixedCosts <= 0){
    status = 'No costs entered yet — target updates when those tabs have data.';
  }
  return '<div class="break-even-callout">'+
    '<div class="eyebrow">'+labelTip("breakEven")+' (net profit ≥ 0)</div>'+
    '<p class="break-even-target tnum"><b>'+won(be.monthGross)+'</b> POS sales this month</p>'+
    '<p class="lede" style="margin:8px 0 0">≈ <b class="tnum">'+won(be.perOpenDayGross)+'</b> POS per open day ('+be.openDays+' days). Covers '+parts.join(' + ')+'.</p>'+
    (status ? '<p class="note" style="margin:8px 0 0">'+status+'</p>' : '')+
  '</div>';
}

function profitAllocationHtml(a){
  if (!a) return "";
  var b = PROFIT_BUCKET;
  var r = a.vacationRates || vacationBucketRates();
  var vacNote = pct(r.vacationMonths / r.semesterAccrualMonths, 1)+" of overhead (≈ "+r.vacationMonths.toFixed(1)+" mo break ÷ "+r.semesterAccrualMonths.toFixed(1)+" mo semester)";
  var shortfall = a.shortfall > 0
    ? '<p class="note" style="color:var(--warning-dot)">Buckets total more than this month\'s net profit by '+won(a.shortfall)+'.</p>'
    : "";
  return '<section class="card profit-buckets">'+
    '<h2>Profit buckets (planning)</h2>'+
    '<p class="lede">Reserves set aside from <b>net profit</b>. Tax and maintenance are ₩0 in a loss month. '+LABEL.monsoon+' and '+LABEL.recovery.toLowerCase()+' are in the cash card.</p>'+
    '<div class="formula-list">'+
      formulaRow(LABEL.netProfit, a.netProfit, { signed: true, big: true })+
      formulaRow("1. Tax bucket", a.tax, { less: true, note: pct(b.taxRate, 0)+" of net profit" })+
      formulaRow("2. Vacation bucket", a.vacation, { less: true, note: vacNote })+
      formulaRow("3. Maintenance bucket", a.maintenance, { less: true, note: pct(b.maintRate, 0)+" of net profit" })+
      formulaRow("After buckets", a.afterBuckets, { signed: true, big: true })+
      formulaRow(labelTip("vatSetAside"), a.vatSetAside, { note: "info only — not subtracted" })+
    '</div>'+
    shortfall+
  '</section>';
}
