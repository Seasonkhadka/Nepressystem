/**
 * components/buy-plan.js — read-only extract of Raw Materials by date.
 * One row per item: weekly bought, monthly bought, month total ₩.
 * Does not change how purchases are entered.
 */

function mondayWeekBounds(d){
  var start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var back = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - back);
  start.setHours(0, 0, 0, 0);
  var end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: start, end: end };
}

function purchaseDateObj(p){
  if (!p || !p.date) return null;
  var parts = String(p.date).split("-");
  if (parts.length < 3) return null;
  var dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(dt.getTime())) return null;
  return dt;
}

function purchaseInWeekRange(p, start, end){
  var dt = purchaseDateObj(p);
  if (!dt) return false;
  return dt >= start && dt <= end;
}

function buyPlanRows(){
  var year = STATE.year, month = STATE.month;
  var week = mondayWeekBounds(today());
  var rows = [];
  asArray(STATE.ingredients).forEach(function(i){
    var name = String(i.name || "").trim();
    if (!name) return;
    var unit = i.unit || defaultUnit(i.cat);
    var weekPacks = 0, weekQty = 0, monthPacks = 0, monthQty = 0, monthAmt = 0;
    asArray(i.purchases).forEach(function(p){
      if (!purchaseInMonth(p, year, month)) return;
      var packs = Number(p.packs) || 0;
      var qty = purchaseQty(p);
      monthPacks += packs;
      monthQty += qty;
      monthAmt += lineTotal(p);
      if (purchaseInWeekRange(p, week.start, week.end)){
        weekPacks += packs;
        weekQty += qty;
      }
    });
    if (monthPacks <= 0 && monthQty <= 0 && monthAmt <= 0) return;
    rows.push({
      name: name,
      unit: unit,
      weekPacks: weekPacks,
      weekQty: weekQty,
      monthPacks: monthPacks,
      monthQty: monthQty,
      monthAmt: monthAmt
    });
  });
  rows.sort(function(a, b){ return b.monthAmt - a.monthAmt; });
  return { rows: rows, week: week };
}

function renderBuyPlanTab(){
  var host = el("tab-buy");
  if (!host) return;
  var plan = buyPlanRows();
  var rows = plan.rows;
  var ws = plan.week.start;
  var we = plan.week.end;
  var weekLabel = ws.getDate()+"–"+we.getDate()+" "+MONTH_ABBR[ws.getMonth()]+" "+ws.getFullYear();
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
      "<p class=\"lede\">Extracted from Raw Materials by date. Week is Mon–Sun "+weekLabel+". Monthly is "+MONTH_NAMES[STATE.month-1]+" "+STATE.year+". Packets, with kg/L in brackets. Total price is this month only.</p>"+
      '<div class="table-wrap"><table class="buy-table"><thead><tr>'+
        "<th>Item</th><th>Weekly bought</th><th>Monthly bought</th><th>Total price</th>"+
      "</tr></thead><tbody>"+body+"</tbody></table></div>"+
    "</section>";
}
