/**
 * components/buy-plan.js — avg monthly need from history; still to buy this month.
 * Updates live when Raw Materials change (refreshBuyPlanCells).
 */

function buyPlanItemKey(name, unit){
  return ingredientNameKey(name) + "\0" + (unit || "unit");
}

function addBuyMonthTotals(bucket, p){
  var packs = Number(p.packs) || 0;
  var qty = purchaseQty(p);
  var amt = lineTotal(p);
  bucket.packs += packs;
  bucket.qty += qty;
  bucket.amt += amt;
}

function computeBuyPlanSimple(){
  var year = STATE.year, month = STATE.month;
  var curMk = monthKey(year, month);
  var curLabel = MONTH_NAMES[month - 1] + " " + year;
  var groups = {};

  asArray(STATE.ingredients).forEach(function(i){
    var name = ingredientExactName(i.name);
    if (!name) return;
    var unit = i.unit || defaultUnit(i.cat);
    var key = buyPlanItemKey(name, unit);
    if (!groups[key]){
      groups[key] = { name: name, unit: unit, byMonth: {} };
    }
    asArray(i.purchases).forEach(function(p){
      if (!p || !p.date) return;
      var parts = String(p.date).split("-");
      var y = Number(parts[0]), m = Number(parts[1]);
      if (!y || !m) return;
      var mk = monthKey(y, m);
      if (!groups[key].byMonth[mk]){
        groups[key].byMonth[mk] = { packs: 0, qty: 0, amt: 0 };
      }
      addBuyMonthTotals(groups[key].byMonth[mk], p);
    });
  });

  var rows = [];
  Object.keys(groups).forEach(function(key){
    var g = groups[key];
    var monthKeys = Object.keys(g.byMonth);
    if (!monthKeys.length) return;

    var histKeys = monthKeys.filter(function(mk){ return mk !== curMk; });
    if (!histKeys.length) histKeys = monthKeys.slice();

    var sumP = 0, sumQ = 0, sumA = 0;
    histKeys.forEach(function(mk){
      var t = g.byMonth[mk];
      sumP += t.packs;
      sumQ += t.qty;
      sumA += t.amt;
    });
    var n = histKeys.length;
    var avgPacks = sumP / n;
    var avgQty = sumQ / n;
    var avgAmt = sumA / n;

    var cur = g.byMonth[curMk] || { packs: 0, qty: 0, amt: 0 };
    var needP = Math.max(0, avgPacks - cur.packs);
    var needQ = Math.max(0, avgQty - cur.qty);
    if (needP <= 0.001 && needQ <= 0.001) return;

    rows.push({
      name: g.name,
      unit: g.unit,
      monthCount: n,
      avgPacks: avgPacks,
      avgQty: avgQty,
      avgAmt: avgAmt,
      curPacks: cur.packs,
      curQty: cur.qty,
      needPacks: needP,
      needQty: needQ
    });
  });

  rows.sort(function(a, b){ return b.avgAmt - a.avgAmt; });
  return { rows: rows, curLabel: curLabel, monthCount: rows.length ? rows[0].monthCount : 0 };
}

function buyPlanTableBody(plan){
  if (!plan.rows.length){
    return '<tr><td colspan="4" class="note empty">Nothing left to buy this month — or log more dated purchases on Raw Materials to build an average.</td></tr>';
  }
  var body = plan.rows.map(function(r){
    return "<tr>"+
      "<td>"+esc(r.name)+"</td>"+
      '<td class="tnum">'+esc(boughtLabel(r.avgPacks, r.avgQty, r.unit))+
        ' <span class="buy-avg-note">('+r.monthCount+" mo avg)</span></td>"+
      '<td class="tnum">'+esc(boughtLabel(r.curPacks, r.curQty, r.unit))+"</td>"+
      '<td class="tnum buy-need">'+esc(boughtLabel(r.needPacks, r.needQty, r.unit))+"</td>"+
    "</tr>";
  }).join("");
  return body;
}

function renderBuyPlanTab(){
  var host = el("tab-buy");
  if (!host) return;
  var plan = computeBuyPlanSimple();
  host.innerHTML =
    '<section class="card buy-plan-simple">'+
      "<h2>Buy plan</h2>"+
      '<p class="lede buy-plan-lede">For <b>'+esc(plan.curLabel)+'</b>. <b>Avg monthly</b> = mean of past months with buys (this month excluded). <b>Still need</b> = average minus what you already bought this month. Updates when Raw Materials change.</p>'+
      '<div class="table-wrap"><table class="buy-table buy-simple-table">'+
        "<thead><tr>"+
          "<th>Item</th><th>Avg monthly</th><th>Bought this month</th><th>Still need</th>"+
        "</tr></thead>"+
        '<tbody id="buy-plan-tbody">'+buyPlanTableBody(plan)+"</tbody>"+
      "</table></div>"+
    "</section>";
}

function refreshBuyPlanCells(){
  var host = el("tab-buy");
  if (!host) return;
  var tbody = el("buy-plan-tbody");
  if (!tbody){
    renderBuyPlanTab();
    return;
  }
  var plan = computeBuyPlanSimple();
  var lede = host.querySelector(".buy-plan-lede");
  if (lede){
    lede.innerHTML = 'For <b>'+esc(plan.curLabel)+'</b>. <b>Avg monthly</b> = mean of past months with buys (this month excluded). <b>Still need</b> = average minus what you already bought this month. Updates when Raw Materials change.';
  }
  tbody.innerHTML = buyPlanTableBody(plan);
}
