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

/**
 * The money path (Dashboard "Month at a glance" + Monthly), top to bottom:
 * net profit → cash after loans → − prior-loss recovery → − monsoon → − profit buckets → final money left.
 * Values come straight from computeAll().cashView.
 */
function cashStepsHtml(c){
  if (!c) return "";
  var lc = c.lossCarry || {};
  var b = PROFIT_BUCKET;
  var a = c.buckets || {};
  var r = a.vacationRates || vacationBucketRates();
  var rec = c.monthsToRecover;
  var recText = rec == null || rec <= 0
    ? "Not yet — needs positive final money left"
    : (Math.ceil(rec * 10) / 10) + " months at this month’s pace";
  var carryNote = c.beforeOpening || lc.beforeOpening ? "Before opening ("+OPENING_DATE+") — not counted."
    : (c.openingMonth || lc.openingMonth) ? "Opening month — ₩0."
    : ((lc.priorDeficit || 0) > 0
      ? "Carried loss "+won(lc.priorDeficit)+(c.isVacationMonth ? " waits (vacation month)." : (lc.fullRecovery ? " — net profit this month, so all of it." : " ÷ "+RECOVERY_MONTHS+" (no net profit this month)."))+
        " Still to recover after: "+won(c.carryAfterThisMonth)+"."
      : "No carried loss."+((c.carryAfterThisMonth || 0) > 0 ? " This month adds "+won(c.carryAfterThisMonth)+" to recover later." : ""));
  var profitNote = (c.netProfit > 0 ? "" : " (₩0 — no net profit)");
  var vacNote = pct(r.vacationMonths / r.semesterAccrualMonths, 1)+" of overhead";
  return '<div class="formula-list">'+
      formulaRow(LABEL.netProfit, c.netProfit, { signed: true, big: true })+
      formulaRow("+ "+labelTip("depreciation"), c.depreciation, { note: "not real cash out" })+
      formulaRow("− "+labelTip("loanPrincipal"), c.loanPrincipal, { less: true })+
      formulaRow("= "+labelTip("cashAfterLoans"), c.cashAfterLoans, { signed: true, big: true })+
      formulaRow("− "+labelTip("recovery"), c.recovery, { less: true, note: carryNote })+
      formulaRow("= "+LABEL.afterRecovery, c.afterRecovery, { signed: true, big: true })+
      formulaRow("− "+labelTip("monsoon"), c.monsoonShare, { less: true, note: pct(MONSOON_RATE, 0)+" of the line above"+(c.afterRecovery > 0 ? "" : " (₩0 — nothing left)") })+
      formulaRow("= "+LABEL.afterMonsoon, c.afterMonsoon, { signed: true, big: true })+
      formulaRow("− Tax bucket", a.tax, { less: true, note: pct(b.taxRate, 0)+" of net profit"+profitNote })+
      formulaRow("− Vacation bucket", a.vacation, { less: true, note: vacNote })+
      formulaRow("− Maintenance bucket", a.maintenance, { less: true, note: pct(b.maintRate, 0)+" of net profit"+profitNote })+
      formulaRow("= "+labelTip("finalLeft"), c.finalLeft, { signed: true, big: true })+
      formulaRow(labelTip("vatSetAside"), a.vatSetAside, { note: "info only — not subtracted" })+
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
