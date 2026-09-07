/**
 * components/raw-materials.js — the Raw Materials tab: an editable ingredient
 * list grouped by category, each row saying "I spend X every N days/weeks/
 * months" instead of unit-cost math.
 *
 * Depends on: dom-utils.js (el), format.js, charts.js (horizBarChart),
 * data.js (CAT_META, CAT_ORDER, INTERVAL_UNIT_LABELS), compute.js (computeAll).
 */

function ingredientRowHtml(i){
  var intervalValue = i.intervalValue || 1;
  var intervalUnit = i.intervalUnit || "week";
  var unitOptions = ["day","week","month","once"].map(function(u){
    return '<option value="'+u+'"'+(u===intervalUnit?" selected":"")+'>'+INTERVAL_UNIT_LABELS[u]+'</option>';
  }).join("");

  var onceNote = "";
  if (intervalUnit === "once"){
    onceNote = '<div class="interval-note'+(i.isStale?" stale":"")+'">'+(i.isStale ? "From a different month — not counted now" : "Counts this month only")+'</div>';
  }

  return '<tr data-ing-id="'+i.id+'"'+(intervalUnit==="once" && i.isStale ? ' style="opacity:0.6"' : '')+'>'+
    '<td></td>'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="e.g. Spinach" value="'+(i.name||"").replace(/"/g,"&quot;")+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1000" data-field="amount" placeholder="0" value="'+(i.amount?i.amount:"")+'"></td>'+
    '<td>'+
      '<div class="interval-cell">'+
        '<span class="interval-prefix">Every</span>'+
        '<input class="cell-input interval-num" type="number" min="1" step="1" data-field="intervalValue" value="'+intervalValue+'">'+
        '<select class="cell-input interval-unit" data-field="intervalUnit">'+unitOptions+'</select>'+
      '</div>'+
      onceNote+
    '</td>'+
    '<td class="tnum calc" data-calc="daily">₩0</td>'+
    '<td class="tnum calc" data-calc="weekly">₩0</td>'+
    '<td class="tnum calc" data-calc="monthly">₩0</td>'+
    '<td><button class="icon-btn" type="button" data-remove-ing="'+i.id+'" title="Remove ingredient" aria-label="Remove ingredient">×</button></td>'+
  '</tr>';
}

function rawMaterialsChartHtml(model){
  return horizBarChart(model.catTotals.map(function(c){ return {label:c.label.replace("&amp;","&"), value:c.monthly, color:c.color}; }), {aria:"Monthly raw-material cost by category"});
}

function renderRawMaterialsTab(){
  var model = computeAll();
  var rows = "";
  model.catTotals.forEach(function(c){
    rows += '<tr class="cat-head"><td colspan="8"><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</td></tr>';
    c.items.forEach(function(i){ rows += ingredientRowHtml(i); });
    rows += '<tr class="add-row"><td colspan="8"><button class="add-row-btn" type="button" data-add-cat="'+c.cat+'">+ Add ingredient to '+c.label+'</button></td></tr>';
    rows += '<tr class="subtotal" data-cat-subtotal="'+c.cat+'"><td colspan="4">'+c.label+' subtotal</td><td class="tnum calc" data-calc="daily">'+won(c.daily)+'</td><td class="tnum calc" data-calc="weekly">'+won(c.weekly)+'</td><td class="tnum calc" data-calc="monthly">'+won(c.monthly)+'</td><td></td></tr>';
  });

  el("tab-raw").innerHTML =
    '<section class="card">'+
      '<h2>Raw materials — what you spend on ingredients</h2>'+
      '<p class="lede">No receipt yet? No problem — just type your best guess for how much you spent and how often you buy it. Bought something as a one-off you won\'t need again? Pick <b>One-time</b> — it counts for this month only and quietly stops counting on its own after that, no need to remember to delete the row.</p>'+
      '<div class="table-wrap"><table><thead><tr><th></th><th>Ingredient</th><th>Amount Spent</th><th>How Often You Buy It</th><th>Daily Cost</th><th>Weekly Cost</th><th>Monthly Cost</th><th></th></tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
      '<tfoot><tr><td colspan="4">Grand total</td><td class="tnum calc" data-calc-grand="daily">'+won(model.rawGrand.daily)+'</td><td class="tnum calc" data-calc-grand="weekly">'+won(model.rawGrand.weekly)+'</td><td class="tnum calc" data-calc-grand="monthly">'+won(model.rawGrand.monthly)+'</td><td></td></tr></tfoot>'+
      '</table></div>'+
    '</section>'+
    '<section class="card"><h2>Monthly cost share by category</h2><div id="raw-chart">'+rawMaterialsChartHtml(model)+'</div></section>';
}

function refreshRawComputedCells(model){
  model.ingredients.forEach(function(i){
    var tr = el("tab-raw").querySelector('tr[data-ing-id="'+i.id+'"]');
    if (!tr) return;
    tr.querySelector('[data-calc="daily"]').textContent = won(i.dailyCost);
    tr.querySelector('[data-calc="weekly"]').textContent = won(i.weeklyCost);
    tr.querySelector('[data-calc="monthly"]').textContent = won(i.monthlyCost);
  });
  model.catTotals.forEach(function(c){
    var tr = el("tab-raw").querySelector('tr[data-cat-subtotal="'+c.cat+'"]');
    if (!tr) return;
    tr.querySelector('[data-calc="daily"]').textContent = won(c.daily);
    tr.querySelector('[data-calc="weekly"]').textContent = won(c.weekly);
    tr.querySelector('[data-calc="monthly"]').textContent = won(c.monthly);
  });
  var g = el("tab-raw").querySelector('[data-calc-grand="daily"]'); if (g) g.textContent = won(model.rawGrand.daily);
  g = el("tab-raw").querySelector('[data-calc-grand="weekly"]'); if (g) g.textContent = won(model.rawGrand.weekly);
  g = el("tab-raw").querySelector('[data-calc-grand="monthly"]'); if (g) g.textContent = won(model.rawGrand.monthly);
  var chartHost = el("raw-chart");
  if (chartHost) chartHost.innerHTML = rawMaterialsChartHtml(model);
}
