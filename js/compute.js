/**
 * compute.js — all derived numbers, computed fresh from STATE on every call.
 * computeAll() is the one function every renderer calls to get its data.
 *
 * Depends on: data.js (CAT_ORDER, CAT_META, TAG_META, MONTH_ABBR, DOW_NAMES),
 * state.js (STATE).
 */

function safeDiv(a, b){ return b ? a/b : 0; }

function computeProfitAllocation(netProfit, overheadMonth){
  var b = PROFIT_BUCKET;
  var profit = Number(netProfit) || 0;
  var oh = Math.max(0, Number(overheadMonth) || 0);
  var profitBase = Math.max(0, profit);
  var tax = profitBase * b.taxRate;
  var maintenance = profitBase * b.maintRate;
  var vacation = oh * (b.vacationMonths / b.semesterAccrualMonths);
  var reserved = tax + maintenance + vacation;
  var afterBuckets = profit - reserved;
  var afterPositive = Math.max(0, afterBuckets);
  return {
    netProfit: profit,
    overheadMonth: oh,
    tax: tax,
    maintenance: maintenance,
    vacation: vacation,
    reserved: reserved,
    afterBuckets: afterBuckets,
    share15: afterPositive * b.shareRate,
    leftAfterShare: afterPositive * (1 - b.shareRate),
    shortfall: afterBuckets < 0 ? -afterBuckets : 0
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
  var t = { sales:0, cogsAmt:0, labor:0, overhead:0, grossProfit:0, netProfit:0, count:days.length };
  days.forEach(function(d){
    t.sales += d.sales; t.cogsAmt += d.cogsAmt; t.labor += d.labor; t.overhead += d.overhead;
    t.grossProfit += d.grossProfit; t.netProfit += d.netProfit;
  });
  t.cogsPct = safeDiv(t.cogsAmt, t.sales);
  t.grossMarginPct = safeDiv(t.grossProfit, t.sales);
  t.laborPct = safeDiv(t.labor, t.sales);
  t.overheadPct = safeDiv(t.overhead, t.sales);
  t.netMarginPct = safeDiv(t.netProfit, t.sales);
  t.avgSales = t.count ? t.sales/t.count : 0;
  return t;
}

function lineTotal(p){
  var amt = Number(p.amount);
  if (isFinite(amt) && amt > 0) return amt;
  return purchasePriceCount(p) * (Number(p.unitPrice)||0);
}

function assetSpreadMonthly(a){
  if (a && a.included === false) return 0;
  var rowCat = (a && a.rowCat) || "equipment";
  if (!assetRowSpreads(rowCat)) return 0;
  var tot = lineTotal(a);
  var life = Number(a.lifeMonths) || 0;
  return life > 0 ? tot / life : 0;
}

function assetMonthly(a){
  return assetSpreadMonthly(a);
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
  var rawItems = asArray(STATE.assets);
  var enriched = rawItems.map(function(a){
    var rowCat = a.rowCat && ASSET_ROW_CAT[a.rowCat] ? a.rowCat : inferAssetRowCategory(a.name, a.cat);
    var included = a.included !== false;
    var amount = lineTotal(a);
    var spreads = assetRowSpreads(rowCat);
    var life = Number(a.lifeMonths) || 0;
    var monthly = included && spreads && life > 0 ? amount / life : 0;
    return {
      id: a.id, cat: a.cat === "gas" ? "setup" : a.cat, rowCat: rowCat,
      included: included, date: a.date, name: a.name || "", note: a.note || "",
      qty: Number(a.qty) || 0, unitPrice: Number(a.unitPrice) || 0, amount: amount,
      lifeMonths: life, spreads: spreads, monthly: monthly
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

  var loans = asArray(STATE.setupLoans).map(function(l){
    var sched = buildLoanSchedule(l.principal, l.annualRate, l.termMonths, 60);
    return {
      id: l.id, name: l.name || "Loan", principal: Number(l.principal) || 0,
      annualRate: Number(l.annualRate) || 0, termMonths: Number(l.termMonths) || 0,
      termNote: l.termNote || "assumed term",
      payment: sched.payment, totalInterest: sched.totalInterest,
      month1Interest: sched.month1.interest, month1Principal: sched.month1.principal,
      schedule: sched.rows
    };
  });
  var loanPaymentTotal = loans.reduce(function(s, l){ return s + l.payment; }, 0);
  var loanInterestM1 = loans.reduce(function(s, l){ return s + l.month1Interest; }, 0);
  var loanPrincipalTotal = loans.reduce(function(s, l){ return s + l.principal; }, 0);

  var funding = migrateSetupFunding(STATE.setupFunding);
  var record = Number(funding.totalInvestedRecord) || 0;
  var ownMoney = record - loanPrincipalTotal;
  var reconDiff = includedTotal - record;
  var loanShares = loans.map(function(l){
    return { name: l.name, principal: l.principal, pct: record > 0 ? l.principal / record : 0 };
  });

  var plan = migrateSetupPlan(STATE.setupPlan);
  var sales = Number(plan.monthlySales) || 0;
  var ingPct = Number(plan.ingPctOfSales) || 0;
  var ingredients = sales * (ingPct / 100);
  var fixedCosts = (Number(plan.rent) || 0) + (Number(plan.staff) || 0) + (Number(plan.utilities) || 0) + (Number(plan.otherFixed) || 0);
  var grossProfit = sales - ingredients;
  var operatingBeforeLoans = grossProfit - fixedCosts;
  var cashLeft = operatingBeforeLoans - loanPaymentTotal;
  var profitView = operatingBeforeLoans - spreadMonthly - loanInterestM1;
  var marginAfterIng = 1 - ingPct / 100;
  var cashBreakEven = marginAfterIng > 0 ? (fixedCosts + loanPaymentTotal) / marginAfterIng : 0;
  var acctBreakEven = marginAfterIng > 0 ? (fixedCosts + spreadMonthly + loanInterestM1) / marginAfterIng : 0;
  var monthsRecover = cashLeft > 0 && ownMoney > 0 ? ownMoney / cashLeft : null;

  return {
    items: enriched,
    assetCats: assetCats,
    assetGrand: { invested: includedTotal, monthly: spreadMonthly },
    byRowCat: ASSET_ROW_CAT_ORDER.map(function(k){ return byRowCat[k]; }),
    rowCatGrand: { total: includedTotal, monthly: spreadMonthly },
    loans: loans,
    loanTotals: { payment: loanPaymentTotal, interestM1: loanInterestM1, principal: loanPrincipalTotal },
    funding: {
      record: record,
      ownMoney: ownMoney,
      loanShares: loanShares,
      ownPct: record > 0 ? ownMoney / record : 0,
      reconDiff: reconDiff,
      reconOk: Math.round(reconDiff) === 0
    },
    plan: {
      inputs: plan,
      ingredients: ingredients,
      grossProfit: grossProfit,
      fixedCosts: fixedCosts,
      operatingBeforeLoans: operatingBeforeLoans,
      loanPayment: loanPaymentTotal,
      cashLeft: cashLeft,
      profitView: profitView,
      cashBreakEven: cashBreakEven,
      acctBreakEven: acctBreakEven,
      monthsRecover: monthsRecover
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

  var totalSales = 0, openDays = 0;
  dayNums.forEach(function(day){
    var rec = STATE.days[day] || { vacation:false, sales:0, labor:0 };
    totalSales += Number(rec.sales)||0;
    if (!rec.vacation) openDays += 1;
  });
  var openDaysTrue = openDays;
  if (!openDays) openDays = daysThisMonth;
  var materials = rawGrand.monthly;

  var laborByDay = {};
  dayNums.forEach(function(day){ laborByDay[day] = 0; });
  var shiftMonth = 0, salaryMonth = 0, laborHasLedger = false;
  var shiftPaid = 0, shiftUnpaid = 0, salaryPartPaid = 0, salaryPartUnpaid = 0;
  asArray(STATE.laborShifts).forEach(function(s){
    if (laborShiftHasData(s)) laborHasLedger = true;
    if (!purchaseInMonth(s, year, month)) return;
    var tot = laborShiftTotal(s);
    shiftMonth += tot;
    if (s.paid) shiftPaid += tot;
    else shiftUnpaid += tot;
    var day = Number(String(s.date).split("-")[2]) || 0;
    if (laborByDay[day] != null) laborByDay[day] += tot;
  });
  asArray(STATE.laborSalaries).forEach(function(s){
    if (laborSalaryHasData(s)) laborHasLedger = true;
    salaryMonth += Number(s.amount) || 0;
    asArray(s.parts).forEach(function(p){
      if (!purchaseInMonth(p, year, month)) return;
      var amt = Number(p.amount) || 0;
      if (p.paid) salaryPartPaid += amt;
      else salaryPartUnpaid += amt;
    });
  });
  var salaryOpenDays = openDaysTrue || daysThisMonth;
  var salaryPerOpen = salaryOpenDays ? salaryMonth / salaryOpenDays : 0;
  dayNums.forEach(function(day){
    var rec = STATE.days[day] || { vacation:false };
    if (!rec.vacation || !openDaysTrue) laborByDay[day] += salaryPerOpen;
  });

  var billMonth = 0, anyVarBill = false;
  asArray(STATE.overheadBills).forEach(function(b){
    if (overheadBillHasData(b)) anyVarBill = true;
    if (!purchaseInMonth(b, year, month)) return;
    billMonth += Number(b.amount) || 0;
  });
  var fixedMonth = 0, anyFixed = false;
  asArray(STATE.overheadFixedItems).forEach(function(b){
    if (overheadFixedHasData(b)) anyFixed = true;
    fixedMonth += Number(b.amount) || 0;
  });
  if (!anyFixed) fixedMonth = Number(STATE.overheadFixedMonthly)||0;
  var overheadPool = fixedMonth + billMonth;

  var daily = dayNums.map(function(day){
    var raw = STATE.days[day] || { vacation:false, sales:0, labor:0 };
    var isWeekendAuto = [0,6].indexOf(dowOf(year, month, day)) > -1;
    var tag = raw.vacation ? "vacation" : (isWeekendAuto ? "weekend" : "weekday");
    var sales = Number(raw.sales)||0;
    var labor = laborHasLedger ? (laborByDay[day] || 0) : (Number(raw.labor)||0);
    var cogsAmt = 0;
    if (materials > 0){
      if (totalSales > 0) cogsAmt = materials * (sales / totalSales);
      else if (!raw.vacation || openDays === daysThisMonth) cogsAmt = materials / openDays;
    }
    var cogsPct = safeDiv(cogsAmt, sales);
    var grossProfit = sales-cogsAmt;
    var overhead = (overheadPool / daysThisMonth) + sales*((Number(STATE.overheadVariableRate)||0)/100);
    var netProfit = grossProfit-labor-overhead;
    return {
      day: day, dow: DOW_NAMES[dowOf(year,month,day)], isWeekendAuto: isWeekendAuto, vacation: !!raw.vacation, tag: tag,
      sales: sales, cogsPct: cogsPct, cogsAmt: cogsAmt,
      grossProfit: grossProfit, grossMarginPct: safeDiv(grossProfit, sales),
      labor: labor, laborPct: safeDiv(labor, sales),
      overhead: overhead, overheadPct: safeDiv(overhead, sales),
      netProfit: netProfit, netMarginPct: safeDiv(netProfit, sales)
    };
  });

  var monthly = sumDays(daily);

  var weeks = buildWeeks(dayNums);
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

  var setupAssets = computeSetupAssets();
  var assetCats = setupAssets.assetCats;
  var assetGrand = setupAssets.assetGrand;

  var crosscheck = {
    baseline: rawGrand.monthly,
    actual: monthly.cogsAmt,
    variance: monthly.cogsAmt - rawGrand.monthly
  };
  crosscheck.variancePct = safeDiv(crosscheck.variance, crosscheck.baseline);

  var laborInfo = {
    hasLedger: laborHasLedger,
    shiftMonth: shiftMonth,
    salaryMonth: salaryMonth,
    monthly: laborHasLedger ? (shiftMonth + salaryMonth) : monthly.labor,
    openDays: openDaysTrue || daysThisMonth,
    salaryDaily: salaryPerOpen,
    shiftPaid: shiftPaid,
    shiftUnpaid: shiftUnpaid,
    salaryPartPaid: salaryPartPaid,
    salaryPartUnpaid: salaryPartUnpaid,
    paidTotal: shiftPaid + salaryPartPaid,
    unpaidTotal: shiftUnpaid + salaryPartUnpaid
  };
  var overheadInfo = {
    hasBills: anyVarBill || anyFixed,
    fixedMonth: fixedMonth,
    billMonth: billMonth,
    variableRate: Number(STATE.overheadVariableRate)||0,
    monthly: monthly.overhead
  };

  var profitAllocation = computeProfitAllocation(monthly.netProfit, monthly.overhead);

  return { daily:daily, monthly:monthly, weekly:weekly, tagGroups:tagGroups, ingredients:ingredients, catTotals:catTotals, rawGrand:rawGrand, assetCats:assetCats, assetGrand:assetGrand, setupAssets:setupAssets, labor:laborInfo, overhead:overheadInfo, crosscheck:crosscheck, profitAllocation:profitAllocation };
}
