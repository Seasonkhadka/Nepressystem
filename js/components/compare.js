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
    var packs = purchasePriceCount(p);
    var weight = purchaseQty(p);
    var tot = lineTotal(p);
    if (packs <= 0 && weight <= 0 && tot <= 0) return;
    var key = placeKey(p.place);
    if (!byPlace[key]) byPlace[key] = { place: key, count: 0, qty: 0, weight: 0, spend: 0, lastPrice: 0, lastDate: "" };
    var g = byPlace[key];
    g.count += 1;
    g.qty += packs;
    g.weight += weight;
    g.spend += tot;
    if (!g.lastDate || String(p.date) >= g.lastDate){
      g.lastDate = p.date || "";
      g.lastPrice = packs > 0 ? tot / packs : (Number(p.unitPrice)||0);
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
    var packMode = i.usesPacks;
    var unit = packMode ? "pack" : (i.unit || "unit");
    var cheapest = rows[0].avg;
    var body = rows.map(function(r, idx){
      var delta = r.avg - cheapest;
      var badge = idx === 0
        ? '<span class="tag weekday">Cheapest</span>'
        : '<span class="tnum" style="color:var(--ember)">+'+won(delta)+"/"+esc(unit)+'</span>';
      var qtyLabel = packMode
        ? (Math.round(r.qty*100)/100)+" pack"+(r.weight ? " · "+(Math.round(r.weight*100)/100)+" "+esc(i.unit) : "")
        : (Math.round(r.qty*100)/100)+" "+esc(i.unit);
      return '<tr'+(idx===0?' class="best-place"':'')+'>'+
        '<td>'+esc(r.place)+'</td>'+
        '<td class="tnum">'+r.count+'</td>'+
        '<td class="tnum">'+qtyLabel+'</td>'+
        '<td class="tnum">'+wonPerUnit(r.avg, unit)+'</td>'+
        '<td class="tnum">'+wonPerUnit(r.lastPrice, unit)+'</td>'+
        '<td>'+badge+'</td>'+
      '</tr>';
    }).join("");
    blocks += '<section class="card">'+
      '<h2>'+esc(i.name)+' <span class="ing-unit-label">per '+esc(unit)+'</span></h2>'+
      '<p class="lede">Weighted average ₩/'+esc(unit)+' by market. Cheapest source is highlighted.</p>'+
      '<div class="table-wrap"><table class="compare-table"><thead><tr>'+
        '<th>Market / place</th><th>Buys</th><th>Qty bought</th><th>Avg ₩/unit</th><th>Last ₩/unit</th><th></th>'+
      '</tr></thead><tbody>'+body+'</tbody></table></div>'+
    '</section>';
  });

  if (!any){
    blocks = '<section class="card"><h2>Supplier price comparison</h2>'+
      '<p class="lede">Add an item name, then log purchases with a market, packets, and ₩/pack on Raw Materials. No-bill totals are not compared here.</p>'+
      '<p class="note empty">No comparable purchases yet.</p></section>';
  } else {
    blocks = '<section class="card"><h2>Supplier price comparison</h2>'+
      '<p class="lede">Compare the same ingredient across markets. Average ₩/pack is packet-weighted. Qty / pack is only the size of one pack. Last ₩/pack is the most recent receipt at that market.</p></section>' + blocks;
  }

  el("tab-compare").innerHTML = blocks;
}
