/**
 * components/buy-plan.js — buy plan from Raw Materials dates + vs last month.
 */

function purchaseDayNum(p){
  if (!p || !p.date) return 0;
  var parts = String(p.date).split("-");
  return Number(parts[2]) || 0;
}

function weekIndexForDay(day, weeks){
  for (var w = 0; w < weeks.length; w++){
    if (weeks[w].indexOf(day) >= 0) return w;
  }
  return -1;
}

function buildWeeksForMonth(year, month){
  var n = daysInMonth(year, month);
  var dayNums = [];
  for (var d = 1; d <= n; d++) dayNums.push(d);
  var weeks = [];
  var first = dayNums[0];
  var d0 = dowOf(year, month, first);
  var untilSunday = (7 - d0) % 7;
  var idx = 0;
  var w1 = dayNums.slice(0, untilSunday + 1);
  if (w1.length){ weeks.push(w1); idx = w1.length; }
  while (idx < dayNums.length){
    weeks.push(dayNums.slice(idx, idx + 7));
    idx += 7;
  }
  return weeks;
}

function prevCalendarMonth(year, month){
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year: year, month: month - 1 };
}

function buyPlanItemKey(name, unit){
  return ingredientNameKey(name) + "\0" + (unit || "unit");
}

function buyPlanRowsForMonth(year, month){
  var weeks = buildWeeksForMonth(year, month);
  var rows = [];
  asArray(STATE.ingredients).forEach(function(i){
    var name = String(i.name || "").trim();
    if (!name) return;
    var unit = i.unit || defaultUnit(i.cat);
    var byWeek = weeks.map(function(){ return { packs: 0, qty: 0, amt: 0 }; });
    var monthPacks = 0, monthQty = 0, monthAmt = 0;
    asArray(i.purchases).forEach(function(p){
      if (!purchaseInMonth(p, year, month)) return;
      var day = purchaseDayNum(p);
      var wi = weekIndexForDay(day, weeks);
      if (wi < 0) return;
      var packs = Number(p.packs) || 0;
      var qty = purchaseQty(p);
      var amt = lineTotal(p);
      byWeek[wi].packs += packs;
      byWeek[wi].qty += qty;
      byWeek[wi].amt += amt;
      monthPacks += packs;
      monthQty += qty;
      monthAmt += amt;
    });
    if (monthPacks <= 0 && monthQty <= 0 && monthAmt <= 0) return;

    var activeWeeks = 0;
    byWeek.forEach(function(w){
      if (w.packs > 0 || w.qty > 0 || w.amt > 0) activeWeeks += 1;
    });
    var weekDiv = activeWeeks > 1 ? activeWeeks : weeks.length;
    rows.push({
      key: buyPlanItemKey(name, unit),
      name: name,
      unit: unit,
      weekPacks: weekDiv ? monthPacks / weekDiv : 0,
      weekQty: weekDiv ? monthQty / weekDiv : 0,
      monthPacks: monthPacks,
      monthQty: monthQty,
      monthAmt: monthAmt,
      activeWeeks: activeWeeks
    });
  });
  rows.sort(function(a, b){ return b.monthAmt - a.monthAmt; });
  return { rows: rows, weekCount: weeks.length, year: year, month: month };
}

function buyMeasureAmount(r){
  if (!r) return 0;
  return (Number(r.monthQty) || 0) > 0 ? Number(r.monthQty) : Number(r.monthPacks) || 0;
}

function buyPlanStatus(prevRow, curRow){
  if (!prevRow && curRow) return { code: "new", label: "New this month" };
  if (prevRow && !curRow) return { code: "pending", label: "Not bought yet" };
  if (!prevRow && !curRow) return { code: "pending", label: "—" };
  var target = buyMeasureAmount(prevRow);
  var got = buyMeasureAmount(curRow);
  if (got <= 0) return { code: "pending", label: "Not bought yet" };
  if (target <= 0) return { code: "ok", label: "Buying" };
  var ratio = got / target;
  if (ratio >= 0.9 && ratio <= 1.15) return { code: "ok", label: "On track" };
  if (ratio > 1.15) return { code: "over", label: "Over vs last month" };
  return { code: "under", label: "Under vs last month" };
}

function buyPlanAnalysis(){
  var year = STATE.year, month = STATE.month;
  var prev = prevCalendarMonth(year, month);
  var curPlan = buyPlanRowsForMonth(year, month);
  var prevPlan = buyPlanRowsForMonth(prev.year, prev.month);
  var byPrev = {}, byCur = {};
  prevPlan.rows.forEach(function(r){ byPrev[r.key] = r; });
  curPlan.rows.forEach(function(r){ byCur[r.key] = r; });
  var keys = {};
  prevPlan.rows.forEach(function(r){ keys[r.key] = true; });
  curPlan.rows.forEach(function(r){ keys[r.key] = true; });

  var rows = Object.keys(keys).map(function(k){
    var p = byPrev[k];
    var c = byCur[k];
    var name = (c && c.name) || (p && p.name);
    var unit = (c && c.unit) || (p && p.unit);
    var st = buyPlanStatus(p, c);
    return {
      name: name,
      unit: unit,
      prev: p,
      cur: c,
      status: st,
      sortAmt: (p && p.monthAmt) || (c && c.monthAmt) || 0
    };
  });
  rows.sort(function(a, b){ return b.sortAmt - a.sortAmt; });

  var fromPrev = prevPlan.rows.length;
  var matched = 0, onTrack = 0;
  rows.forEach(function(r){
    if (r.prev && r.cur) matched += 1;
    if (r.status.code === "ok") onTrack += 1;
  });

  return {
    rows: rows,
    curPlan: curPlan,
    prevPlan: prevPlan,
    prevLabel: MONTH_NAMES[prev.month - 1] + " " + prev.year,
    curLabel: MONTH_NAMES[month - 1] + " " + year,
    fromPrev: fromPrev,
    matched: matched,
    onTrack: onTrack
  };
}

function buyStatusTag(st){
  var cls = "buy-tag pending";
  if (st.code === "ok") cls = "buy-tag ok";
  else if (st.code === "under") cls = "buy-tag under";
  else if (st.code === "over") cls = "buy-tag over";
  else if (st.code === "new") cls = "buy-tag new";
  return '<span class="'+cls+'">'+esc(st.label)+"</span>";
}

function renderBuyPlanTab(){
  var host = el("tab-buy");
  if (!host) return;
  var analysis = buyPlanAnalysis();
  var plan = analysis.curPlan;
  var totalCur = 0, totalPrev = 0;

  var body = analysis.rows.map(function(r){
    var prev = r.prev;
    var cur = r.cur;
    if (cur) totalCur += cur.monthAmt;
    if (prev) totalPrev += prev.monthAmt;
    var planQty = prev
      ? boughtLabel(prev.monthPacks, prev.monthQty, r.unit)
      : "—";
    var prevQty = prev
      ? boughtLabel(prev.monthPacks, prev.monthQty, r.unit)
      : "—";
    var curQty = cur
      ? boughtLabel(cur.monthPacks, cur.monthQty, r.unit)
      : "—";
    var weekly = prev
      ? boughtLabel(prev.weekPacks, prev.weekQty, r.unit)
      : (cur ? boughtLabel(cur.weekPacks, cur.weekQty, r.unit) : "—");
    return "<tr>"+
      "<td>"+esc(r.name)+"</td>"+
      '<td class="tnum">'+esc(prevQty)+"</td>"+
      '<td class="tnum">'+esc(weekly)+"</td>"+
      '<td class="tnum">'+esc(planQty)+"</td>"+
      '<td class="tnum">'+esc(curQty)+"</td>"+
      "<td>"+buyStatusTag(r.status)+"</td>"+
      '<td class="tnum">'+(prev ? won(prev.monthAmt) : "—")+"</td>"+
      '<td class="tnum">'+(cur ? won(cur.monthAmt) : "—")+"</td>"+
    "</tr>";
  }).join("");

  if (!body){
    body = '<tr><td colspan="8" class="note empty">No purchases in '+
      esc(analysis.curLabel)+" or "+esc(analysis.prevLabel)+
      ". Add dated buys on Raw Materials.</td></tr>";
  } else {
    body += '<tr class="subtotal"><td>Total</td><td></td><td></td><td></td><td></td><td></td>'+
      '<td class="tnum">'+won(totalPrev)+"</td>"+
      '<td class="tnum">'+won(totalCur)+"</td></tr>";
  }

  var summary = analysis.fromPrev
    ? analysis.fromPrev+" items in "+esc(analysis.prevLabel)+
      " · "+analysis.matched+" bought again in "+esc(analysis.curLabel)+
      " · "+analysis.onTrack+" on track vs last month"
    : "No purchases in "+esc(analysis.prevLabel)+" — plan will fill in as you log "+esc(analysis.curLabel)+".";

  host.innerHTML =
    '<section class="card">'+
      "<h2>Buy plan</h2>"+
      "<p class=\"lede\">Self-check for <b>"+esc(analysis.curLabel)+"</b> using <b>"+
      esc(analysis.prevLabel)+"</b> as the baseline. "+
      "<b>Plan this month</b> repeats last month’s total per item. "+
      "<b>Weekly hint</b> is last month’s typical per shopping week.</p>"+
      '<p class="note buy-summary">'+summary+"</p>"+
      '<div class="table-wrap"><table class="buy-table buy-analysis-table"><thead><tr>'+
        "<th>Item</th>"+
        "<th>Last month</th>"+
        "<th>Weekly hint</th>"+
        "<th>Plan this month</th>"+
        "<th>Bought so far</th>"+
        "<th>Status</th>"+
        "<th>Spend last</th>"+
        "<th>Spend now</th>"+
      "</tr></thead><tbody>"+body+"</tbody></table></div>"+
    "</section>";
}
