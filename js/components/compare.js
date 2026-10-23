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
  var blocks = [];
  groupIngredientsForCompare(model.ingredients).forEach(function(g){
    var rows = compareRowsForIngredient(g);
    if (!rows.length) return;
    blocks.push({ g: g, rows: rows });
  });

  if (!blocks.length){
    el("tab-compare").innerHTML =
      '<section class="card"><h2>Price compare</h2>'+
      '<p class="lede">Log purchases on Raw Materials (market, packs, size, total). Compared by ₩ per kg / L / g, all months.</p>'+
      '<p class="note empty">No comparable purchases yet.</p></section>';
    return;
  }

  blocks.sort(function(a, b){
    return a.g.name.localeCompare(b.g.name, undefined, { sensitivity: "base" });
  });

  var body = "";
  blocks.forEach(function(block){
    var g = block.g;
    var rows = block.rows;
    var unit = g.unit || "unit";
    var catLabels = ingredientCompareCategoryLabels(g.cats).join(" · ");
    var cheapest = rows[0].avg;
    var n = rows.length;
    rows.forEach(function(r, idx){
      var itemCells = "";
      if (idx === 0){
        var merge = g.rowCount > 1
          ? ' <span class="compare-merge" title="'+g.rowCount+' rows merged">×'+g.rowCount+'</span>'
          : "";
        itemCells =
          '<td rowspan="'+n+'" class="compare-item"><b>'+esc(g.name)+'</b>'+merge+'</td>'+
          '<td rowspan="'+n+'" class="compare-cat">'+esc(catLabels)+'</td>'+
          '<td rowspan="'+n+'" class="compare-unit tnum">'+esc(unit)+'</td>';
      }
      var delta = r.avg - cheapest;
      var vs = idx === 0
        ? '<span class="tag weekday">Best</span>'
        : '<span class="tnum compare-delta">+'+won(delta)+'</span>';
      var qtyLabel = (r.packs && r.weight)
        ? fmtQty(r.packs)+" pk · "+fmtQty(r.weight)+" "+unit
        : (r.weight ? fmtQty(r.weight)+" "+unit : fmtQty(r.packs || r.measure)+" pk");
      var avgCell = wonPerUnit(r.avg, unit)+
        (r.avgPack ? ' <span class="compare-pack">'+wonPerUnit(r.avgPack, "pack")+'</span>' : "");
      body += '<tr'+(idx===0?' class="best-place"':'')+'>'+
        itemCells+
        '<td>'+esc(r.place)+'</td>'+
        '<td class="tnum">'+r.count+'</td>'+
        '<td class="tnum compare-qty">'+esc(qtyLabel)+'</td>'+
        '<td class="tnum">'+avgCell+'</td>'+
        '<td class="tnum">'+wonPerUnit(r.lastPrice, unit)+'</td>'+
        '<td>'+vs+'</td>'+
      '</tr>';
    });
  });

  el("tab-compare").innerHTML =
    '<section class="card compare-compact">'+
      '<h2>Price compare</h2>'+
      '<p class="lede">One row per market. ₩ per unit uses pack size (800 g vs 3.3 kg). Same item name in Raw Materials is merged; all months included.</p>'+
      '<div class="table-wrap"><table class="compare-table compare-master">'+
        '<thead><tr>'+
          '<th>Item</th><th>Category</th><th>Unit</th><th>Market</th><th>Buys</th><th>Qty</th>'+
          '<th>Avg ₩/unit</th><th>Last ₩/unit</th><th>vs best</th>'+
        '</tr></thead>'+
        '<tbody>'+body+'</tbody>'+
      '</table></div>'+
    '</section>';
}
