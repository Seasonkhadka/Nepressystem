/**
 * compute.js — all derived numbers, computed fresh from STATE on every call.
 * computeAll() is the one function every renderer calls to get its data.
 *
 * Depends on: data.js (CAT_ORDER, CAT_META, TAG_META, MONTH_ABBR, DOW_NAMES),
 * state.js (STATE).
 */

function safeDiv(a, b){ return b ? a/b : 0; }

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

// "Every N days/weeks/months" -> a daily cost, then scaled back up to
// weekly/monthly using the days actually in the selected month. "once" is
// spread across the single month it applies to, same as "every 1 month".
function ingredientCosts(amount, intervalValue, intervalUnit, daysThisMonth){
  var value = Math.max(1, Number(intervalValue)||1);
  var periodDays;
  if (intervalUnit === "day") periodDays = value;
  else if (intervalUnit === "month") periodDays = value * daysThisMonth;
  else if (intervalUnit === "once") periodDays = daysThisMonth;
  else periodDays = value * 7; // "week" (also the fallback for unrecognized units)

  var dailyCost = safeDiv(amount, periodDays);
  return { dailyCost: dailyCost, weeklyCost: dailyCost*7, monthlyCost: dailyCost*daysThisMonth };
}

// A "once" ingredient only counts in the calendar month it was flagged as
// one-time (stamped when the user picks that option) — any other month it's
// worth zero, so nobody has to remember to delete it later.
function isStaleOneTime(ingredient, year, month){
  return ingredient.intervalUnit === "once" && !(ingredient.purchaseYear === year && ingredient.purchaseMonth === month);
}

function computeAll(){
  var year = STATE.year, month = STATE.month;
  var dayNums = Object.keys(STATE.days).map(Number).sort(function(a,b){ return a-b; });

  var daily = dayNums.map(function(day){
    var raw = STATE.days[day];
    var isWeekendAuto = [0,6].indexOf(dowOf(year, month, day)) > -1;
    var tag = raw.vacation ? "vacation" : (isWeekendAuto ? "weekend" : "weekday");
    var sales = Number(raw.sales)||0;
    var cogsPct = (Number(raw.cogsPct)||0)/100;
    var labor = Number(raw.labor)||0;
    var cogsAmt = sales*cogsPct;
    var grossProfit = sales-cogsAmt;
    var overhead = (Number(STATE.overheadFixedMonthly)||0)/dayNums.length + sales*((Number(STATE.overheadVariableRate)||0)/100);
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

  var daysThisMonth = dayNums.length;
  var ingredients = STATE.ingredients.map(function(i){
    var amount = Number(i.amount)||0;
    var intervalValue = Math.max(1, Number(i.intervalValue)||1);
    var intervalUnit = i.intervalUnit || "week";
    var stale = isStaleOneTime(i, year, month);
    var costs = stale ? { dailyCost:0, weeklyCost:0, monthlyCost:0 } : ingredientCosts(amount, intervalValue, intervalUnit, daysThisMonth);
    return {
      id: i.id, cat: i.cat, name: i.name, amount: amount, intervalValue: intervalValue, intervalUnit: intervalUnit,
      purchaseMonth: i.purchaseMonth, purchaseYear: i.purchaseYear, isStale: stale,
      dailyCost: costs.dailyCost, weeklyCost: costs.weeklyCost, monthlyCost: costs.monthlyCost
    };
  });

  var catTotals = CAT_ORDER.map(function(cat){
    var items = ingredients.filter(function(i){ return i.cat === cat; });
    var d=0, w=0, m=0;
    items.forEach(function(i){ d += i.dailyCost; w += i.weeklyCost; m += i.monthlyCost; });
    return { cat: cat, label: CAT_META[cat].label, color: CAT_META[cat].color, items: items, daily: d, weekly: w, monthly: m };
  });
  var rawGrand = catTotals.reduce(function(a,c){ a.daily += c.daily; a.weekly += c.weekly; a.monthly += c.monthly; return a; }, {daily:0, weekly:0, monthly:0});

  var crosscheck = {
    baseline: rawGrand.monthly,
    actual: monthly.cogsAmt,
    variance: monthly.cogsAmt - rawGrand.monthly
  };
  crosscheck.variancePct = safeDiv(crosscheck.variance, crosscheck.baseline);

  return { daily:daily, monthly:monthly, weekly:weekly, tagGroups:tagGroups, ingredients:ingredients, catTotals:catTotals, rawGrand:rawGrand, crosscheck:crosscheck };
}
