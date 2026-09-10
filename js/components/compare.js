/**
 * components/compare.js — compare ₩ per unit across markets/places.
 */

function placeKey(place){
  var s = String(place || "").trim();
  return s || "Unnamed market";
}

function compareRowsForIngredient(i){
  var byPlace = {};
  (i.purchases || []).forEach(function(p){
    var qty = purchaseQty(p);
    var tot = lineTotal(p);
    if (qty <= 0 && tot <= 0) return;
    var key = placeKey(p.place);
    if (!byPlace[key]) byPlace[key] = { place: key, count: 0, qty: 0, spend: 0, lastPrice: 0, lastDate: "" };
    var g = byPlace[key];
    g.count += 1;
    g.qty += qty;
    g.spend += tot;
    if (!g.lastDate || String(p.date) >= g.lastDate){
      g.lastDate = p.date || "";
      g.lastPrice = qty > 0 ? tot / qty : (Number(p.unitPrice)||0);
    }
  });
  var rows = Object.keys(byPlace).map(function(k){
    var g = byPlace[k];
    g.avg = g.qty ? g.spend / g.qty : 0;
    return g;
  }).sort(function(a,b){ return a.avg - b.avg; });
  return rows;
}

function renderCompareTab(){
  var model = computeAll();
  var blocks = "";
  var any = false;
  model.ingredients.forEach(function(i){
    if (!String(i.name||"").trim()) return;
    var rows = compareRowsForIngredient(i);
    if (!rows.length) return;
    any = true;
    var cheapest = rows[0].avg;
    var body = rows.map(function(r, idx){
      var delta = r.avg - cheapest;
      var badge = idx === 0
        ? '<span class="tag weekday">Cheapest</span>'
        : '<span class="tnum" style="color:var(--ember)">+'+won(delta)+"/"+esc(i.unit)+'</span>';
      return '<tr'+(idx===0?' class="best-place"':'')+'>'+
        '<td>'+esc(r.place)+'</td>'+
        '<td class="tnum">'+r.count+'</td>'+
        '<td class="tnum">'+(Math.round(r.qty*100)/100)+' '+esc(i.unit)+'</td>'+
        '<td class="tnum">'+wonPerUnit(r.avg, i.unit)+'</td>'+
        '<td class="tnum">'+wonPerUnit(r.lastPrice, i.unit)+'</td>'+
        '<td>'+badge+'</td>'+
      '</tr>';
    }).join("");
    blocks += '<section class="card">'+
      '<h2>'+esc(i.name)+' <span class="ing-unit-label">per '+esc(i.unit)+'</span></h2>'+
      '<p class="lede">Weighted average ₩/'+esc(i.unit)+' by market. Cheapest source is highlighted.</p>'+
      '<div class="table-wrap"><table class="compare-table"><thead><tr>'+
        '<th>Market / place</th><th>Buys</th><th>Qty bought</th><th>Avg ₩/unit</th><th>Last ₩/unit</th><th></th>'+
      '</tr></thead><tbody>'+body+'</tbody></table></div>'+
    '</section>';
  });

  if (!any){
    blocks = '<section class="card"><h2>Supplier price comparison</h2>'+
      '<p class="lede">Add an item name, then log purchases with a market, quantity, and ₩ per unit on Meat, Groceries, or Vegetables. No-bill totals are not compared here.</p>'+
      '<p class="note empty">No comparable purchases yet.</p></section>';
  } else {
    blocks = '<section class="card"><h2>Supplier price comparison</h2>'+
      '<p class="lede">Compare the same ingredient across markets. Average ₩/unit is quantity-weighted, so a 5 kg buy counts more than a 1 kg buy. Last ₩/unit is the most recent receipt at that market.</p></section>' + blocks;
  }

  el("tab-compare").innerHTML = blocks;
}
