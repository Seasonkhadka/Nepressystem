/**
 * components/buy-plan.js — read-only extract of Raw Materials by date.
 * Groups purchases into Mon–Sun weeks inside the selected month.
 * Weekly bought = typical per week for planning (from purchase dates).
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

function monthWeeks(year, month){
  var n = daysInMonth(year, month);
  var dayNums = [];
  for (var d = 1; d <= n; d++) dayNums.push(d);
  return buildWeeks(dayNums);
}

function buyPlanRows(){
  var year = STATE.year, month = STATE.month;
  var weeks = monthWeeks(year, month);
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
    // One big buy in a single week → spread across the month (not equal to monthly).
    // Regular buys in several weeks → average per shopping week.
    var weekDiv = activeWeeks > 1 ? activeWeeks : weeks.length;
    var weekPacks = weekDiv ? monthPacks / weekDiv : 0;
    var weekQty = weekDiv ? monthQty / weekDiv : 0;

    rows.push({
      name: name,
      unit: unit,
      weekPacks: weekPacks,
      weekQty: weekQty,
      monthPacks: monthPacks,
      monthQty: monthQty,
      monthAmt: monthAmt,
      activeWeeks: activeWeeks
    });
  });
  rows.sort(function(a, b){ return b.monthAmt - a.monthAmt; });
  return { rows: rows, weekCount: weeks.length };
}

function renderBuyPlanTab(){
  var host = el("tab-buy");
  if (!host) return;
  var plan = buyPlanRows();
  var rows = plan.rows;
  var total = 0;
  var body = rows.map(function(r){
    total += r.monthAmt;
    return "<tr>"+
      "<td>"+esc(r.name)+"</td>"+
      '<td class="tnum">'+esc(boughtLabel(r.weekPacks, r.weekQty, r.unit))+"</td>"+
      '<td class="tnum">'+esc(boughtLabel(r.monthPacks, r.monthQty, r.unit))+"</td>"+
      '<td class="tnum">'+won(r.monthAmt)+"</td>"+
    "</tr>";
  }).join("");
  if (!body){
    body = '<tr><td colspan="4" class="note empty">No dated purchases in '+MONTH_NAMES[STATE.month-1]+" "+STATE.year+". Add items on Raw Materials.</td></tr>";
  } else {
    body += '<tr class="subtotal"><td>Total</td><td></td><td></td><td class="tnum">'+won(total)+"</td></tr>";
  }

  host.innerHTML =
    '<section class="card">'+
      "<h2>Buy plan</h2>"+
      "<p class=\"lede\">From purchase dates in "+MONTH_NAMES[STATE.month-1]+" "+STATE.year+". "+
      "<b>Weekly bought</b> = typical amount per week — if you bought in several weeks, average of those trips; if you bought once, spread across "+plan.weekCount+" weeks in this month. "+
      "<b>Monthly bought</b> = full month total. Format: packs (kg/L).</p>"+
      '<div class="table-wrap"><table class="buy-table"><thead><tr>'+
        "<th>Item</th><th>Weekly bought</th><th>Monthly bought</th><th>Total price</th>"+
      "</tr></thead><tbody>"+body+"</tbody></table></div>"+
    "</section>";
}
