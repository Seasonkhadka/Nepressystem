/**
 * compute.js — all derived numbers, computed fresh from STATE on every call.
 * computeAll() is the one function every renderer calls to get its data.
 *
 * Depends on: data.js (all business constants), state.js (STATE).
 * This is the ONLY file that does P&L / cash math; components just read results.
 */

function safeDiv(a, b){ return b ? a/b : 0; }

/** Min POS gross sales this month so net profit ≥ 0 (COGS = full Raw Materials month). */
function computeBreakEvenSales(pl){
  var varRate = (Number(STATE.overheadVariableRate) || 0) / 100;
  var margin = 1 - VAT_RATE - varRate;
  var parts = {
    cogs: Math.max(0, pl.materials),
    labor: Math.max(0, pl.labor.monthly),
    overhead: Math.max(0, pl.overheadPool),
    depreciation: Math.max(0, pl.depreciation.monthly)
  };
  var fixed = parts.cogs + parts.labor + parts.overhead + parts.depreciation;
  var od = Math.max(1, pl.spreadDays);
  var cur = Number(pl.monthly.salesGross) || 0;
  var out = { fixedCosts: fixed, openDays: od, marginOnGross: margin, currentGross: cur,
    cogs: parts.cogs, labor: parts.labor, overhead: parts.overhead, depreciation: parts.depreciation };
  if (margin <= 0.001){ out.monthGross = null; return out; }
  out.monthGross = fixed / margin;
  out.perOpenDayGross = out.monthGross / od;
  out.gapGross = Math.max(0, out.monthGross - cur);
  out.surplusGross = Math.max(0, cur - out.monthGross);
  return out;
}

function salesVatFromGross(gross){
  return (Number(gross) || 0) * VAT_RATE;
}
function netSalesFromGross(gross){
  var g = Number(gross) || 0;
  return g - salesVatFromGross(g);
}

/**
 * Profit buckets (planning). Net profit is already after VAT, so VAT is info only
 * ("set aside, already excluded"), never subtracted again.
 */
/** vacationMonth: the break itself — nothing is saved into the vacation bucket (it is being used). */
function computeProfitAllocation(netProfit, overheadMonth, salesGross, vacationMonth){
  var b = PROFIT_BUCKET;
  var rates = vacationBucketRates();
  var profit = Number(netProfit) || 0;
  var oh = Math.max(0, Number(overheadMonth) || 0);
  var profitBase = Math.max(0, profit);
  var tax = profitBase * b.taxRate;
  var maintenance = profitBase * b.maintRate;
  var vacation = vacationMonth ? 0 : oh * (rates.vacationMonths / rates.semesterAccrualMonths);
  var reserved = tax + maintenance + vacation;
  var afterBuckets = profit - reserved;
  return {
    netProfit: profit,
    salesGross: Number(salesGross) || 0,
    overheadMonth: oh,
    vatSetAside: salesVatFromGross(salesGross),
    tax: tax,
    maintenance: maintenance,
    vacation: vacation,
    vacationRates: rates,
    vacationMonth: !!vacationMonth,
    reserved: reserved,
    afterBuckets: afterBuckets,
    shortfall: afterBuckets < 0 ? -afterBuckets : 0
  };
}

/* ── Month helpers ─────────────────────────────────────────────────────── */

function monthSerial(year, month){ return Number(year) * 12 + Number(month); }

function openingYearMonth(){
  var p = OPENING_DATE.split("-");
  return { year: Number(p[0]), month: Number(p[1]) };
}

/** 0 for the opening month, 1 for the next, … negative before opening. */
function monthIndexFromOpening(year, month){
  var o = openingYearMonth();
  return monthSerial(year, month) - monthSerial(o.year, o.month);
}

function isBeforeOpening(year, month){ return monthIndexFromOpening(year, month) < 0; }

function daysForMonthCompute(year, month){
  if (STATE && STATE.year === year && STATE.month === month) return STATE.days || {};
  return daysFromArchive(year, month);
}

/**
 * Fixed overhead for a month.
 * - Month on screen: live items (or template / legacy monthly total).
 * - Other months: archived amounts only — never invent default rent for empty past months
 *   (that was creating fake prior-loss recovery before real trading).
 */
function fixedOverheadAmountForMonth(year, month){
  if (STATE && STATE.year === year && STATE.month === month){
    var cur = 0, anyCur = false;
    asArray(STATE.overheadFixedItems).forEach(function(b){
      if (overheadFixedHasData(b)) anyCur = true;
      cur += Number(b && b.amount) || 0;
    });
    return anyCur ? cur : (Number(STATE.overheadFixedMonthly) || 0);
  }
  var arch = STATE && STATE.overheadFixedArchive;
  var key = monthKey(year, month);
  if (arch && Object.prototype.hasOwnProperty.call(arch, key)){
    var sum = 0;
    asArray(arch[key]).forEach(function(b){
      if (overheadFixedHasData(b)) sum += Number(b.amount) || 0;
    });
    return sum;
  }
  return 0;
}

/** True if the month has real trading / cost activity (not just an empty month-picker visit). */
function monthHasOperatingData(year, month){
  if (isBeforeOpening(year, month)) return false;
  var days = daysForMonthCompute(year, month);
  var n = daysInMonth(year, month);
  for (var d = 1; d <= n; d++){
    if ((Number(days[d] && days[d].sales) || 0) > 0) return true;
  }
  if (materialsCostForMonth(year, month) > 0) return true;
  var shifts = false;
  asArray(STATE && STATE.laborShifts).forEach(function(s){
    if (purchaseInMonth(s, year, month) && laborShiftHasData(s)) shifts = true;
  });
  if (shifts) return true;
  if (overheadBillsForMonth(year, month) > 0) return true;
  var arch = STATE && STATE.overheadFixedArchive;
  var key = monthKey(year, month);
  if (arch && Object.prototype.hasOwnProperty.call(arch, key)){
    if (asArray(arch[key]).some(overheadFixedHasData)) return true;
  }
  if (STATE && STATE.year === year && STATE.month === month){
    if (asArray(STATE.overheadFixedItems).some(overheadFixedHasData)) return true;
  }
  return false;
}

/** Vacation month = at least VACATION_MONTH_THRESHOLD of its days are break days. */
function isVacationMonth(year, month, sch){
  sch = migrateVacationSchedule(sch || (STATE && STATE.vacationSchedule));
  var n = daysInMonth(year, month);
  if (!n) return false;
  var vac = 0;
  var days = daysForMonthCompute(year, month);
  for (var d = 1; d <= n; d++){
    if (dayVacationFlag(days[d] || {}, year, month, d, sch)) vac += 1;
  }
  return vac >= Math.ceil(n * VACATION_MONTH_THRESHOLD);
}

function materialsCostForMonth(year, month){
  var total = 0;
  asArray(STATE.ingredients).forEach(function(i){
    asArray(i.purchases).forEach(function(p){
      if (purchaseInMonth(p, year, month)) total += lineTotal(p);
    });
  });
  asArray(STATE.lumps).forEach(function(p){
    if (purchaseInMonth(p, year, month)) total += Number(p.amount) || 0;
  });
  return total;
}

/** Labor ledger totals for a month (shifts dated in the month + every monthly salary). */
function laborLedgerForMonth(year, month){
  var r = { hasLedger: false, shift: 0, salary: 0, shiftPaid: 0, shiftUnpaid: 0, salaryPartPaid: 0, salaryPartUnpaid: 0 };
  asArray(STATE.laborShifts).forEach(function(s){
    if (laborShiftHasData(s)) r.hasLedger = true;
    if (!purchaseInMonth(s, year, month)) return;
    var tot = laborShiftTotal(s);
    r.shift += tot;
    if (s.paid) r.shiftPaid += tot; else r.shiftUnpaid += tot;
  });
  asArray(STATE.laborSalaries).forEach(function(s){
    if (laborSalaryHasData(s)) r.hasLedger = true;
    r.salary += Number(s.amount) || 0;
    asArray(s.parts).forEach(function(p){
      if (!purchaseInMonth(p, year, month)) return;
      var amt = Number(p.amount) || 0;
      if (p.paid) r.salaryPartPaid += amt; else r.salaryPartUnpaid += amt;
    });
  });
  return r;
}

function overheadBillsForMonth(year, month){
  var bill = 0;
  asArray(STATE.overheadBills).forEach(function(b){
    if (purchaseInMonth(b, year, month)) bill += Number(b.amount) || 0;
  });
  return bill;
}

/**
 * THE month P&L. Used for the month on screen (computeAll) and for every past
 * month (prior-loss recovery), so both always agree.
 *
 * Fixed costs (labor ledger, fixed overhead, depreciation) are spread
 * over open days; if the shop has no open day that month, over every day.
 */
function computeMonthPL(year, month){
  var sch = STATE.vacationSchedule;
  var days = daysForMonthCompute(year, month);
  var n = daysInMonth(year, month);
  var dayNums = [];
  for (var d = 1; d <= n; d++) dayNums.push(d);

  var totalSalesGross = 0, openDays = 0;
  dayNums.forEach(function(day){
    var rec = days[day] || {};
    totalSalesGross += Number(rec.sales) || 0;
    if (!dayPlClosed(rec, year, month, day, sch)) openDays += 1;
  });
  var noOpenDay = openDays === 0;
  var spreadDays = openDays || n;

  var materials = materialsCostForMonth(year, month);
  var lab = laborLedgerForMonth(year, month);
  var fixedMonth = fixedOverheadAmountForMonth(year, month);
  var billMonth = overheadBillsForMonth(year, month);
  var overheadPool = fixedMonth + billMonth;
  var varRate = (Number(STATE.overheadVariableRate) || 0) / 100;
  var dep = computePlDepreciation(year, month);
  var loan = loanMonthFor(year, month);

  var perDay = function(total){ return spreadDays ? total / spreadDays : 0; };
  var salaryPerDay = perDay(lab.salary), shiftPerDay = perDay(lab.shift);
  var overheadPerDay = perDay(overheadPool);
  var depPerDay = perDay(dep.monthly);

  var daily = dayNums.map(function(day){
    var raw = days[day] || {};
    var isWeekendAuto = [0,6].indexOf(dowOf(year, month, day)) > -1;
    var onBreak = dayVacationFlag(raw, year, month, day, sch);
    var plClosed = dayPlClosed(raw, year, month, day, sch);
    var carries = !plClosed || noOpenDay;
    var tag = onBreak ? "vacation" : (raw.closed ? "closed" : (isWeekendAuto ? "weekend" : "weekday"));
    var salesGross = Number(raw.sales) || 0;
    var vat = salesVatFromGross(salesGross);
    var sales = salesGross - vat;
    var labor = lab.hasLedger ? (carries ? salaryPerDay + shiftPerDay : 0) : (Number(raw.labor) || 0);
    var cogsAmt = 0;
    if (materials > 0){
      if (totalSalesGross > 0) cogsAmt = materials * (salesGross / totalSalesGross);
      else if (carries) cogsAmt = materials / spreadDays;
    }
    var grossProfit = sales - cogsAmt;
    var overhead = carries ? (overheadPerDay + salesGross * varRate) : 0;
    var depreciation = carries ? depPerDay : 0;
    var netProfit = grossProfit - labor - overhead - depreciation;
    return {
      day: day, dow: DOW_NAMES[dowOf(year, month, day)], isWeekendAuto: isWeekendAuto, vacation: plClosed, tag: tag,
      salesGross: salesGross, vat: vat, sales: sales, cogsPct: safeDiv(cogsAmt, sales), cogsAmt: cogsAmt,
      grossProfit: grossProfit, grossMarginPct: safeDiv(grossProfit, sales),
      labor: labor, laborPct: safeDiv(labor, sales),
      overhead: overhead, overheadPct: safeDiv(overhead, sales),
      depreciation: depreciation, depreciationPct: safeDiv(depreciation, sales),
      netProfit: netProfit, netMarginPct: safeDiv(netProfit, sales)
    };
  });
  var monthly = sumDays(daily);

  return {
    year: year, month: month, key: monthKey(year, month),
    dayNums: dayNums, daily: daily, monthly: monthly,
    openDays: openDays, spreadDays: spreadDays,
    materials: materials,
    labor: {
      hasLedger: lab.hasLedger,
      shiftMonth: lab.shift,
      salaryMonth: lab.salary,
      monthly: lab.hasLedger ? (lab.shift + lab.salary) : monthly.labor,
      openDays: spreadDays,
      salaryDaily: salaryPerDay,
      shiftDaily: shiftPerDay,
      shiftPaid: lab.shiftPaid, shiftUnpaid: lab.shiftUnpaid,
      salaryPartPaid: lab.salaryPartPaid, salaryPartUnpaid: lab.salaryPartUnpaid,
      paidTotal: lab.shiftPaid + lab.salaryPartPaid,
      unpaidTotal: lab.shiftUnpaid + lab.salaryPartUnpaid
    },
    fixedMonth: fixedMonth, billMonth: billMonth, overheadPool: overheadPool,
    depreciation: dep,
    loan: loan,
    vacationMonth: isVacationMonth(year, month, sch)
  };
}

/**
 * Cash after loans = net profit + depreciation (non-cash) − loan payment.
 * Loan payment = the WHOLE monthly installment (interest + principal); loans are not in net profit.
 * The rest of the money path (recovery → monsoon → buckets) is in computeAll().cashView.
 */
function monthCashSteps(pl){
  return { cashAfterLoans: pl.monthly.netProfit + pl.monthly.depreciation - pl.loan.payment };
}

/** Month keys (YYYY-MM) with any data, from OPENING_DATE up to the view month. */
function listMonthKeysThrough(viewYear, viewMonth, includeCurrent){
  var set = {};
  function addMap(map){
    if (!map || typeof map !== "object") return;
    Object.keys(map).forEach(function(k){ if (/^\d{4}-\d{2}$/.test(k)) set[k] = 1; });
  }
  function addDated(list){
    asArray(list).forEach(function(x){
      if (!x || !x.date) return;
      var parts = String(x.date).split("-");
      if (parts.length >= 2) set[parts[0] + "-" + pad2(Number(parts[1]))] = 1;
    });
  }
  addMap(STATE && STATE.dayArchive);
  addMap(STATE && STATE.overheadFixedArchive);
  asArray(STATE && STATE.ingredients).forEach(function(i){ addDated(i.purchases); });
  addDated(STATE && STATE.lumps);
  addDated(STATE && STATE.laborShifts);
  addDated(STATE && STATE.overheadBills);
  if (STATE && STATE.year && STATE.month) set[monthKey(STATE.year, STATE.month)] = 1;
  var o = openingYearMonth();
  var first = monthSerial(o.year, o.month);
  var cutoff = monthSerial(viewYear, viewMonth);
  return Object.keys(set).filter(function(k){
    var p = k.split("-");
    var idx = monthSerial(p[0], p[1]);
    if (idx < first) return false;
    return includeCurrent ? idx <= cutoff : idx < cutoff;
  }).sort();
}

/**
 * Recovery for a month (working months only, ₩0 in vacation months):
 *   net profit > 0 → the WHOLE carried loss is subtracted this month
 *   net profit ≤ 0 → carry ÷ RECOVERY_MONTHS
 */
function recoveryChargeFor(carry, vacationMonth, netProfit){
  if (vacationMonth || !(carry > 0)) return 0;
  return netProfit > 0 ? carry : carry / RECOVERY_MONTHS;
}

/** Carry after a month: the recovery is paid from cash after loans; any shortfall (or a minus month) is added back. */
function nextCarry(carry, charge, cashAfterLoans){
  var after = cashAfterLoans - charge;
  var c = carry - charge;
  if (after < 0) c += -after;
  return Math.max(0, c);
}

/**
 * Prior-loss recovery (cash basis).
 * - Opening month (Sep 2026) and before: charge is always ₩0 (nothing “prior” yet).
 * - Only months from OPENING_DATE with real operating data feed the carry
 *   (empty month-picker visits do not invent rent/salary losses).
 */
function computeLossCarryForward(viewYear, viewMonth){
  var vacNow = isVacationMonth(viewYear, viewMonth);
  var openIdx = monthIndexFromOpening(viewYear, viewMonth);
  if (openIdx < 0){
    return { priorDeficit: 0, lossMonths: 0, charge: 0, skippedVacation: vacNow, divisor: RECOVERY_MONTHS, openingMonth: false, beforeOpening: true };
  }
  if (openIdx === 0){
    return { priorDeficit: 0, lossMonths: 0, charge: 0, skippedVacation: vacNow, divisor: RECOVERY_MONTHS, openingMonth: true, beforeOpening: false };
  }
  var keys = listMonthKeysThrough(viewYear, viewMonth, false).filter(function(k){
    var p = k.split("-");
    return monthHasOperatingData(Number(p[0]), Number(p[1]));
  });
  var carry = 0, lossMonths = 0;
  var nowProfit = computeMonthPL(viewYear, viewMonth).monthly.netProfit;
  keys.forEach(function(k){
    var p = k.split("-");
    var pl = computeMonthPL(Number(p[0]), Number(p[1]));
    var cash = monthCashSteps(pl);
    var charge = recoveryChargeFor(carry, pl.vacationMonth, pl.monthly.netProfit);
    if (cash.cashAfterLoans < 0) lossMonths += 1;
    carry = nextCarry(carry, charge, cash.cashAfterLoans);
  });
  return {
    priorDeficit: carry,
    lossMonths: lossMonths,
    charge: recoveryChargeFor(carry, vacNow, nowProfit),
    fullRecovery: nowProfit > 0,
    skippedVacation: vacNow,
    divisor: RECOVERY_MONTHS,
    openingMonth: false,
    beforeOpening: false
  };
}

function dowOf(year, month, day){ return new Date(year, month-1, day).getDay(); }

function buildWeeks(dayNums){
  var weeks = [];
  var first = dayNums[0];
  var d0 = dowOf(STATE.year, STATE.month, first); // 0=Sun..6=Sat, Monday-start week
  var untilSunday = (7 - d0) % 7;
  var idx = 0;
  var w1 = dayNums.slice(0, untilSunday+1);
  if (w1.length) { weeks.push(w1); idx = w1.length; }
  while (idx < dayNums.length){
    weeks.push(dayNums.slice(idx, idx+7));
    idx += 7;
  }
  return weeks;
}

function sumDays(days){
  var t = { salesGross:0, vat:0, sales:0, cogsAmt:0, labor:0, overhead:0, depreciation:0, grossProfit:0, netProfit:0, count:days.length };
  days.forEach(function(d){
    t.salesGross += d.salesGross; t.vat += d.vat; t.sales += d.sales;
    t.cogsAmt += d.cogsAmt; t.labor += d.labor; t.overhead += d.overhead;
    t.depreciation += Number(d.depreciation) || 0;
    t.grossProfit += d.grossProfit; t.netProfit += d.netProfit;
  });
  t.cogsPct = safeDiv(t.cogsAmt, t.sales);
  t.grossMarginPct = safeDiv(t.grossProfit, t.sales);
  t.laborPct = safeDiv(t.labor, t.sales);
  t.overheadPct = safeDiv(t.overhead, t.sales);
  t.depreciationPct = safeDiv(t.depreciation, t.sales);
  t.netMarginPct = safeDiv(t.netProfit, t.sales);
  t.avgSales = t.count ? t.sales/t.count : 0;
  return t;
}

function lineTotal(p){
  var amt = Number(p.amount);
  if (isFinite(amt) && amt > 0) return amt;
  return purchasePriceCount(p) * (Number(p.unitPrice)||0);
}

/**
 * Depreciation rule for one asset row (the only one in the app):
 *   setup / equipment / contractor → line total ÷ SETUP_LIFE_MONTHS
 *   utensils → line total ÷ row life (UTENSIL_DEFAULT_LIFE if blank)
 *   inventory, opening stock, deposit, cash float → none
 */
function assetDepreciation(a){
  var none = { kind: "none", life: 0, monthly: 0, amount: 0 };
  if (!a || a.included === false) return none;
  var amt = lineTotal(a);
  if (amt <= 0) return none;
  var cat = a.cat === "gas" ? "setup" : a.cat;
  var rowCat = a.rowCat || (cat === "inventory" ? "opening" : "equipment");
  if (cat === "inventory" || !assetRowSpreads(rowCat)) return none;
  if (cat === "utensil"){
    var life = Number(a.lifeMonths) || UTENSIL_DEFAULT_LIFE;
    return { kind: "utensil", life: life, monthly: amt / life, amount: amt };
  }
  return { kind: "setup", life: SETUP_LIFE_MONTHS, monthly: amt / SETUP_LIFE_MONTHS, amount: amt };
}

/**
 * Depreciation for a calendar month, counted from OPENING_DATE (month 1 = opening month).
 * ₩0 before opening and after an item's life ends.
 */
function computePlDepreciation(year, month){
  if (year == null){ year = STATE.year; month = STATE.month; }
  var idx = monthIndexFromOpening(year, month);
  var r = { monthly: 0, setup: 0, utensil: 0, setupInvested: 0, utensilInvested: 0, setupLifeMonths: SETUP_LIFE_MONTHS, monthNumber: idx + 1 };
  asArray(STATE && STATE.assets).forEach(function(a){
    var d = assetDepreciation(a);
    if (d.kind === "none") return;
    var active = idx >= 0 && idx < d.life;
    if (d.kind === "utensil"){
      r.utensilInvested += d.amount;
      if (active) r.utensil += d.monthly;
    } else {
      r.setupInvested += d.amount;
      if (active) r.setup += d.monthly;
    }
  });
  r.monthly = r.setup + r.utensil;
  return r;
}

/** Loan month number for a calendar month (1 = startMonth); ≤ 0 before the loan starts. */
function loanMonthNumber(l, year, month){
  var s = normalizeLoanStartMonth(l && l.startMonth).split("-");
  return monthSerial(year, month) - monthSerial(s[0], s[1]) + 1;
}

/** Interest + principal due in a calendar month, from each loan's own schedule. */
function loanMonthFor(year, month){
  var out = { interest: 0, principal: 0, payment: 0, loans: [] };
  asArray(STATE && STATE.setupLoans).forEach(function(l){
    var term = Number(l.termMonths) || 0;
    var n = loanMonthNumber(l, year, month);
    var row = null;
    if (n >= 1 && n <= term){
      var sched = buildLoanSchedule(l.principal, l.annualRate, term, n);
      row = sched.rows[n - 1] || null;
    }
    var interest = row ? row.interest : 0;
    var principal = row ? row.principal : 0;
    out.interest += interest;
    out.principal += principal;
    out.payment += interest + principal;
    out.loans.push({ id: l.id, name: l.name || "Loan", monthNumber: n, interest: interest, principal: principal });
  });
  return out;
}

function loanMonthlyPayment(principal, annualRatePct, termMonths){
  var P = Number(principal) || 0;
  var n = Number(termMonths) || 0;
  if (P <= 0 || n <= 0) return 0;
  var r = (Number(annualRatePct) || 0) / 100 / 12;
  if (r <= 0) return P / n;
  return P * r / (1 - Math.pow(1 + r, -n));
}

function buildLoanSchedule(principal, annualRatePct, termMonths, maxRows){
  maxRows = maxRows || 60;
  var P = Number(principal) || 0;
  var n = Math.min(Number(termMonths) || 0, maxRows);
  var r = (Number(annualRatePct) || 0) / 100 / 12;
  var payment = loanMonthlyPayment(P, annualRatePct, termMonths);
  var rows = [];
  var balance = P;
  var totalInterest = 0;
  var month1 = { interest: 0, principal: 0 };
  for (var m = 1; m <= n; m++){
    var interest = r > 0 ? balance * r : 0;
    var principalPaid = payment - interest;
    if (principalPaid > balance) principalPaid = balance;
    var closing = balance - principalPaid;
    if (m === 1) month1 = { interest: interest, principal: principalPaid };
    totalInterest += interest;
    rows.push({ month: m, opening: balance, interest: interest, principal: principalPaid, closing: closing, payment: payment });
    balance = closing;
  }
  return { payment: payment, totalInterest: totalInterest, month1: month1, rows: rows };
}

function assetRowWarnings(a, allRows){
  var msgs = [];
  var name = String(a.name || "").trim();
  var amt = lineTotal(a);
  var qty = Number(a.qty) || 0;
  var up = Number(a.unitPrice) || 0;
  if (name && amt <= 0) msgs.push("Item name but total is 0");
  if ((!qty || !up) && amt > 0) msgs.push("Check what this is — total without qty/price");
  if (assetRowSpreads(a.rowCat) && Number(a.lifeMonths) === 1) msgs.push("Life is 1 month on a spread category");
  if (a.included !== false && a.date && amt > 0){
    var dup = false;
    allRows.forEach(function(b){
      if (b.id === a.id || b.included === false) return;
      if (b.date === a.date && lineTotal(b) === amt) dup = true;
    });
    if (dup) msgs.push("Possible duplicate (same date & amount)");
  }
  return msgs;
}

function computeSetupAssets(){
  asArray(STATE.assets).forEach(function(a){
    if (assetHasData(a)) autoTuneAsset(a);
  });
  var rawItems = asArray(STATE.assets);
  var enriched = rawItems.map(function(a){
    var rowCat = a.rowCat && ASSET_ROW_CAT[a.rowCat] ? a.rowCat : inferAssetRowCategory(a.name, a.cat);
    var included = a.included !== false;
    var amount = lineTotal(a);
    var dep = assetDepreciation(Object.assign({}, a, { rowCat: rowCat }));
    var spreads = dep.kind !== "none";
    var life = dep.life;
    var monthly = dep.monthly;
    return {
      id: a.id, cat: a.cat === "gas" ? "setup" : a.cat, rowCat: rowCat,
      included: included, date: a.date, name: a.name || "", note: a.note || "",
      qty: Number(a.qty) || 0, unitPrice: Number(a.unitPrice) || 0, amount: amount,
      lifeMonths: life, lifeEditable: dep.kind === "utensil", depKind: dep.kind, spreads: spreads, monthly: monthly
    };
  });
  enriched.forEach(function(a){
    a.warnings = assetRowWarnings(a, enriched);
  });

  var byRowCat = {};
  ASSET_ROW_CAT_ORDER.forEach(function(k){
    byRowCat[k] = { key: k, label: ASSET_ROW_CAT[k].label, total: 0, monthly: 0 };
  });
  var includedTotal = 0;
  var spreadMonthly = 0;
  enriched.forEach(function(a){
    if (!a.included) return;
    includedTotal += a.amount;
    if (byRowCat[a.rowCat]) {
      byRowCat[a.rowCat].total += a.amount;
      byRowCat[a.rowCat].monthly += a.monthly;
    }
    spreadMonthly += a.monthly;
  });

  var assetCats = ASSET_SECTION_ORDER.map(function(cat){
    var items = enriched.filter(function(a){ return a.cat === cat; });
    var invested = 0, monthly = 0;
    items.forEach(function(a){
      if (!a.included) return;
      invested += a.amount;
      monthly += a.monthly;
    });
    return {
      cat: cat, label: ASSET_META[cat].label, color: ASSET_META[cat].color, lede: ASSET_META[cat].lede,
      items: items, invested: invested, monthly: monthly
    };
  });

  var loanNow = loanMonthFor(STATE.year, STATE.month);
  var loans = asArray(STATE.setupLoans).map(function(l, i){
    var sched = buildLoanSchedule(l.principal, l.annualRate, l.termMonths, 60);
    var now = loanNow.loans[i] || { monthNumber: 0, interest: 0, principal: 0 };
    return {
      id: l.id, name: l.name || "Loan", principal: Number(l.principal) || 0,
      annualRate: Number(l.annualRate) || 0, termMonths: Number(l.termMonths) || 0,
      startMonth: normalizeLoanStartMonth(l.startMonth),
      termNote: l.termNote || "assumed term",
      payment: sched.payment, totalInterest: sched.totalInterest,
      monthNumber: now.monthNumber, interestNow: now.interest, principalNow: now.principal,
      schedule: sched.rows
    };
  });
  var loanPaymentTotal = loans.reduce(function(s, l){ return s + l.payment; }, 0);
  var loanBorrowedTotal = loans.reduce(function(s, l){ return s + l.principal; }, 0);

  var funding = migrateSetupFunding(STATE.setupFunding);
  var record = Number(funding.totalInvestedRecord) || 0;
  if (!funding.recordManual && includedTotal > 0) record = includedTotal;
  var ownMoney = record - loanBorrowedTotal;
  var reconDiff = includedTotal - record;
  var loanShares = loans.map(function(l){
    return { name: l.name, principal: l.principal, pct: record > 0 ? l.principal / record : 0 };
  });

  return {
    items: enriched,
    assetCats: assetCats,
    assetGrand: { invested: includedTotal, monthly: spreadMonthly },
    byRowCat: ASSET_ROW_CAT_ORDER.map(function(k){ return byRowCat[k]; }),
    rowCatGrand: { total: includedTotal, monthly: spreadMonthly },
    loans: loans,
    loanTotals: { payment: loanPaymentTotal, borrowed: loanBorrowedTotal, interestNow: loanNow.interest, principalNow: loanNow.principal },
    depreciationNow: computePlDepreciation(STATE.year, STATE.month).monthly,
    funding: {
      record: record,
      ownMoney: ownMoney,
      loanShares: loanShares,
      ownPct: record > 0 ? ownMoney / record : 0,
      reconDiff: reconDiff,
      reconOk: Math.round(reconDiff) === 0,
      recordManual: funding.recordManual
    }
  };
}

function computeAll(){
  var year = STATE.year, month = STATE.month;
  var nDays = daysInMonth(year, month);
  var dayNums = [];
  for (var d=1; d<=nDays; d++) dayNums.push(d);
  var daysThisMonth = dayNums.length;
  var list = asArray(STATE.ingredients);
  var ingredients = list.map(function(i){
    var purchases = asArray(i.purchases);
    var monthlyCost = 0, qtyMonth = 0, allCost = 0, allQty = 0;
    var usesPacks = false, usesWeight = false;
    purchases.forEach(function(p){
      var tot = lineTotal(p);
      var q = purchaseMeasure(p);
      allCost += tot;
      allQty += q;
      if ((Number(p.packs)||0) > 0) usesPacks = true;
      if (purchaseQty(p) > 0) usesWeight = true;
      if (purchaseInMonth(p, year, month)){
        monthlyCost += tot;
        qtyMonth += q;
      }
    });
    var dailyCost = daysThisMonth ? monthlyCost / daysThisMonth : 0;
    return {
      id: i.id, cat: i.cat, name: i.name || "", unit: i.unit || defaultUnit(i.cat),
      purchases: purchases, usesPacks: usesPacks, usesWeight: usesWeight,
      qtyMonth: qtyMonth, monthlyCost: monthlyCost,
      avgUnitMonth: qtyMonth ? monthlyCost / qtyMonth : 0,
      avgUnitAll: allQty ? allCost / allQty : 0,
      dailyCost: dailyCost, weeklyCost: dailyCost * 7
    };
  });

  var catTotals = CAT_ORDER.map(function(cat){
    var items = ingredients.filter(function(i){ return i.cat === cat; });
    var d=0, w=0, m=0;
    items.forEach(function(i){ d += i.dailyCost; w += i.weeklyCost; m += i.monthlyCost; });
    return { cat: cat, label: CAT_META[cat].label, color: CAT_META[cat].color, lede: CAT_META[cat].lede, items: items, daily: d, weekly: w, monthly: m };
  });

  var lumps = asArray(STATE.lumps);
  var lumpMonthly = 0;
  lumps.forEach(function(p){
    if (purchaseInMonth(p, year, month)) lumpMonthly += Number(p.amount)||0;
  });
  var lumpDaily = daysThisMonth ? lumpMonthly / daysThisMonth : 0;
  catTotals.push({
    cat: "nobill",
    label: CAT_META.nobill.label,
    color: CAT_META.nobill.color,
    lede: CAT_META.nobill.lede,
    items: [],
    lumps: lumps,
    daily: lumpDaily,
    weekly: lumpDaily * 7,
    monthly: lumpMonthly
  });

  var rawGrand = catTotals.reduce(function(a,c){ a.daily += c.daily; a.weekly += c.weekly; a.monthly += c.monthly; return a; }, {daily:0, weekly:0, monthly:0});

  var pl = computeMonthPL(year, month);
  var daily = pl.daily;
  var monthly = pl.monthly;

  var weeks = buildWeeks(pl.dayNums);
  var weekly = weeks.map(function(wdays, i){
    var days = daily.filter(function(d){ return wdays.indexOf(d.day) > -1; });
    var t = sumDays(days);
    t.label = "Week " + (i+1);
    t.range = wdays.length ? (MONTH_ABBR[month-1] + " " + wdays[0] + " – " + wdays[wdays.length-1]) : "";
    t.weekdayCount = days.filter(function(d){ return d.tag === "weekday"; }).length;
    t.weekendCount = days.filter(function(d){ return d.tag === "weekend"; }).length;
    t.vacationCount = days.filter(function(d){ return d.tag === "vacation"; }).length;
    return t;
  });

  var tagGroups = ["weekday","weekend","vacation"].map(function(tag){
    var days = daily.filter(function(d){ return d.tag === tag; });
    var t = sumDays(days);
    t.tag = tag; t.label = TAG_META[tag].label; t.color = TAG_META[tag].color;
    return t;
  });

  /** Tie-out: days and weeks must add up to the month (checked on Weekly / Monthly). */
  var sumOfDays = daily.reduce(function(a, d){ return a + d.sales; }, 0);
  var sumOfWeeks = weekly.reduce(function(a, w){ return a + w.sales; }, 0);
  var tieOut = {
    sumOfDays: sumOfDays,
    sumOfWeeks: sumOfWeeks,
    daysOk: Math.round(sumOfDays) === Math.round(monthly.sales),
    weeksOk: Math.round(sumOfWeeks) === Math.round(monthly.sales)
  };

  var setupAssets = computeSetupAssets();
  var assetCats = setupAssets.assetCats;
  var assetGrand = setupAssets.assetGrand;

  var crosscheck = {
    baseline: rawGrand.monthly,
    actual: monthly.cogsAmt,
    variance: monthly.cogsAmt - rawGrand.monthly
  };
  crosscheck.variancePct = safeDiv(crosscheck.variance, crosscheck.baseline);

  var laborInfo = pl.labor;
  var anyVarBill = asArray(STATE.overheadBills).some(overheadBillHasData);
  var anyFixed = asArray(STATE.overheadFixedItems).some(overheadFixedHasData);
  var overheadInfo = {
    hasBills: anyVarBill || anyFixed,
    fixedMonth: pl.fixedMonth,
    billMonth: pl.billMonth,
    variableRate: Number(STATE.overheadVariableRate)||0,
    monthly: monthly.overhead
  };

  var ownMoney = setupAssets.funding ? setupAssets.funding.ownMoney : 0;
  var lossCarry = computeLossCarryForward(year, month);
  var cash = monthCashSteps(pl);
  var profitAllocation = computeProfitAllocation(monthly.netProfit, monthly.overhead, monthly.salesGross, pl.vacationMonth);
  // Money path: cash after loans → − prior-loss recovery → − monsoon (on what is left) → − profit buckets → final.
  var afterRecovery = cash.cashAfterLoans - lossCarry.charge;
  var monsoon = Math.max(0, afterRecovery) * MONSOON_RATE;
  var afterMonsoon = afterRecovery - monsoon;
  var finalLeft = afterMonsoon - profitAllocation.reserved;
  var monthsRecover = finalLeft > 0 && ownMoney > 0 ? ownMoney / finalLeft : null;
  var cashView = {
    netProfit: monthly.netProfit,
    depreciation: monthly.depreciation,
    loanInterest: pl.loan.interest,
    loanPrincipal: pl.loan.principal,
    loanPayment: pl.loan.payment,
    loanMonth: pl.loan,
    cashAfterLoans: cash.cashAfterLoans,
    lossCarry: lossCarry,
    recovery: lossCarry.charge,
    afterRecovery: afterRecovery,
    monsoonShare: monsoon,
    afterMonsoon: afterMonsoon,
    buckets: profitAllocation,
    finalLeft: finalLeft,
    carryAfterThisMonth: nextCarry(lossCarry.priorDeficit, lossCarry.charge, cash.cashAfterLoans),
    isVacationMonth: !!lossCarry.skippedVacation,
    beforeOpening: isBeforeOpening(year, month),
    openingMonth: monthIndexFromOpening(year, month) === 0,
    ownMoney: ownMoney,
    monthsToRecover: monthsRecover
  };
  var breakEven = computeBreakEvenSales(pl);

  return {
    daily:daily, monthly:monthly, weekly:weekly, tagGroups:tagGroups, tieOut:tieOut,
    ingredients:ingredients, catTotals:catTotals, rawGrand:rawGrand,
    assetCats:assetCats, assetGrand:assetGrand, setupAssets:setupAssets,
    labor:laborInfo, overhead:overheadInfo, depreciation: pl.depreciation, loanMonth: pl.loan,
    crosscheck:crosscheck, profitAllocation:profitAllocation, cashView:cashView, breakEven:breakEven
  };
}
