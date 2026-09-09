/**
 * components/raw-materials.js — professional purchase ledger: each
 * ingredient has a unit of measure and one row per receipt (date, market,
 * qty, ₩/unit). Monthly cost is the sum of this month's receipts.
 */

function unitSelectHtml(current){
  return UNIT_OPTIONS.map(function(u){
    return '<option value="'+u+'"'+(u===current?" selected":"")+'>'+u+'</option>';
  }).join("");
}

function purchaseRowHtml(p, unit){
  var qty = Number(p.qty)||0;
  var price = Number(p.unitPrice)||0;
  return '<tr data-pur-id="'+p.id+'">'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(p.date||"")+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="place" placeholder="Market / supplier" value="'+esc(p.place)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="0.01" data-field="qty" placeholder="0" value="'+(qty||"")+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="10" data-field="unitPrice" placeholder="0" value="'+(price||"")+'"></td>'+
    '<td class="tnum calc" data-calc="line">'+won(qty*price)+'</td>'+
    '<td><button class="icon-btn" type="button" data-remove-pur="'+p.id+'" title="Remove purchase" aria-label="Remove purchase">×</button></td>'+
  '</tr>';
}

function ingredientCardHtml(i){
  var rows = (i.purchases||[]).map(function(p){ return purchaseRowHtml(p, i.unit); }).join("");
  return '<article class="ing-card" data-ing-id="'+i.id+'">'+
    '<div class="ing-head">'+
      '<input class="cell-input text ing-name" type="text" data-ing-field="name" placeholder="Ingredient name" value="'+esc(i.name)+'">'+
      '<label class="ing-unit">Unit <select class="cell-input" data-ing-field="unit">'+unitSelectHtml(i.unit)+'</select></label>'+
      '<div class="ing-kpis">'+
        '<div><span class="ing-kpi-label">This month</span><span class="tnum" data-ing-month>'+won(i.monthlyCost)+'</span></div>'+
        '<div><span class="ing-kpi-label">Avg unit price</span><span class="tnum" data-ing-avg>'+(i.avgUnitMonth?wonPerUnit(i.avgUnitMonth, i.unit):"—")+'</span></div>'+
      '</div>'+
      '<button class="icon-btn" type="button" data-remove-ing="'+i.id+'" title="Remove ingredient" aria-label="Remove ingredient">×</button>'+
    '</div>'+
    '<div class="table-wrap purchase-wrap"><table class="purchase-table"><thead><tr>'+
      '<th>Date</th><th>Market / place</th><th>Qty</th><th>₩ per unit</th><th>Line total</th><th></th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-add-pur="'+i.id+'">+ Add purchase (another market or date)</button>'+
  '</article>';
}

function rawMaterialsChartHtml(model){
  return horizBarChart(model.catTotals.map(function(c){ return {label:c.label.replace("&amp;","&"), value:c.monthly, color:c.color}; }), {aria:"Monthly raw-material cost by category"});
}

function renderRawMaterialsTab(){
  var model = computeAll();
  var body = "";
  model.catTotals.forEach(function(c){
    body += '<section class="card">'+
      '<h2><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h2>'+
      '<p class="lede">'+c.items.length+' item'+(c.items.length===1?"":"s")+'.</p>';
    c.items.forEach(function(i){ body += ingredientCardHtml(i); });
    body += '<button class="add-row-btn" type="button" data-add-cat="'+c.cat+'">+ Add ingredient to '+c.label+'</button>'+
      '<p class="note">Subtotal this month: <b class="tnum" data-cat-subtotal="'+c.cat+'">'+won(c.monthly)+'</b></p>'+
    '</section>';
  });

  el("tab-raw").innerHTML =
    '<section class="card">'+
      '<h2>Raw materials ledger</h2>'+
      '<p class="lede">Professional purchase log. Enter <b>quantity</b> and <b>₩ per unit</b> for every receipt. Monthly cost is the sum of buys dated in '+MONTH_NAMES[STATE.month-1]+' '+STATE.year+' — not an estimate spread across “every N days”.</p>'+
      '<p class="note">Grand total this month: <b class="tnum" id="raw-grand">'+won(model.rawGrand.monthly)+'</b></p>'+
    '</section>'+
    body+
    '<section class="card"><h2>Monthly cost share by category</h2><div id="raw-chart">'+rawMaterialsChartHtml(model)+'</div></section>';
}

function refreshRawComputedCells(model){
  var host = el("tab-raw");
  if (!host) return;
  model.ingredients.forEach(function(i){
    var card = host.querySelector('.ing-card[data-ing-id="'+i.id+'"]');
    if (!card) return;
    var monthEl = card.querySelector("[data-ing-month]");
    var avgEl = card.querySelector("[data-ing-avg]");
    if (monthEl) monthEl.textContent = won(i.monthlyCost);
    if (avgEl) avgEl.textContent = i.avgUnitMonth ? wonPerUnit(i.avgUnitMonth, i.unit) : "—";
    (i.purchases||[]).forEach(function(p){
      var tr = card.querySelector('tr[data-pur-id="'+p.id+'"]');
      if (!tr) return;
      var line = tr.querySelector('[data-calc="line"]');
      if (line) line.textContent = won(lineTotal(p));
    });
  });
  model.catTotals.forEach(function(c){
    var sub = host.querySelector('[data-cat-subtotal="'+c.cat+'"]');
    if (sub) sub.textContent = won(c.monthly);
  });
  var g = el("raw-grand");
  if (g) g.textContent = won(model.rawGrand.monthly);
  var chartHost = el("raw-chart");
  if (chartHost) chartHost.innerHTML = rawMaterialsChartHtml(model);
}
