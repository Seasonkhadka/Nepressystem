/**
 * components/compare.js — compare ₩ per kg/L/g across markets.
 * Pack size is used so an 800 g bottle and a 3.3 kg bottle are comparable.
 */

function placeKey(place){
  var s = String(place || "").trim();
  return s || "Unnamed market";
}

function fmtQty(n){
  return String(Math.round((Number(n)||0) * 100) / 100);
}

function compareRowsForIngredient(i){
  var byPlace = {};
  (i.purchases || []).forEach(function(p){
    var packs = Number(p.packs)||0;
    var weight = purchaseQty(p);
    var tot = lineTotal(p);
    var measure = purchaseMeasure(p);
    if (measure <= 0 && tot <= 0) return;
    var key = placeKey(p.place);
    if (!byPlace[key]) byPlace[key] = { place: key, count: 0, packs: 0, weight: 0, measure: 0, spend: 0, lastPrice: 0, lastPackPrice: 0, lastDate: "" };
    var g = byPlace[key];
    g.count += 1;
    g.packs += packs;
    g.weight += weight;
    g.measure += measure;
    g.spend += tot;
    if (!g.lastDate || String(p.date) >= g.lastDate){
      g.lastDate = p.date || "";
      g.lastPrice = measure > 0 ? tot / measure : (Number(p.unitPrice)||0);
      g.lastPackPrice = packs > 0 ? tot / packs : 0;
    }
  });
  var rows = Object.keys(byPlace).map(function(k){
    var g = byPlace[k];
    g.avg = g.measure ? g.spend / g.measure : 0;
    g.avgPack = g.packs ? g.spend / g.packs : 0;
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
    var unit = i.unit || "unit";
    var cheapest = rows[0].avg;
    var body = rows.map(function(r, idx){
      var delta = r.avg - cheapest;
      var badge = idx === 0
        ? '<span class="tag weekday">Cheapest</span>'
        : '<span class="tnum" style="color:var(--ember)">+'+won(delta)+"/"+esc(unit)+'</span>';
      var qtyLabel = (r.packs && r.weight)
        ? fmtQty(r.packs)+" pack · "+fmtQty(r.weight)+" "+esc(unit)
        : (r.weight ? fmtQty(r.weight)+" "+esc(unit) : fmtQty(r.packs || r.measure)+" pack");
      var packNote = r.avgPack
        ? '<div class="ing-avg">'+wonPerUnit(r.avgPack, "pack")+'</div>'
        : "";
      return '<tr'+(idx===0?' class="best-place"':'')+'>'+
        '<td>'+esc(r.place)+'</td>'+
        '<td class="tnum">'+r.count+'</td>'+
        '<td class="tnum">'+qtyLabel+'</td>'+
        '<td class="tnum">'+wonPerUnit(r.avg, unit)+packNote+'</td>'+
        '<td class="tnum">'+wonPerUnit(r.lastPrice, unit)+'</td>'+
        '<td>'+badge+'</td>'+
      '</tr>';
    }).join("");
    blocks += '<section class="card">'+
      '<h2>'+esc(i.name)+' <span class="ing-unit-label">per '+esc(unit)+'</span></h2>'+
      '<p class="lede">Cheapest is the lowest ₩/'+esc(unit)+' — pack size is counted, so 800 g and 3.3 kg bottles can be compared.</p>'+
      '<div class="table-wrap"><table class="compare-table"><thead><tr>'+
        '<th>Market / place</th><th>Buys</th><th>Qty bought</th><th>Avg ₩/'+esc(unit)+'</th><th>Last ₩/'+esc(unit)+'</th><th></th>'+
      '</tr></thead><tbody>'+body+'</tbody></table></div>'+
    '</section>';
  });

  if (!any){
    blocks = '<section class="card"><h2>Supplier price comparison</h2>'+
      '<p class="lede">Add an item name, then log purchases with a market, packets, pack size, and line total on Raw Materials. No-bill totals are not compared here.</p>'+
      '<p class="note empty">No comparable purchases yet.</p></section>';
  } else {
    blocks = '<section class="card"><h2>Supplier price comparison</h2>'+
      '<p class="lede">Compared by ₩ per kg, L, or g — not ₩ per pack. A bigger Coupang bottle can cost more per pack and still be cheaper per kg.</p></section>' + blocks;
  }

  el("tab-compare").innerHTML = blocks;
}
