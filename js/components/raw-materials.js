/**
 * components/raw-materials.js — Meat, Groceries, Vegetables as itemized
 * ledgers (qty × ₩/unit), then a No bill table where you type the line total.
 */

function unitSelectHtml(current){
  return UNIT_OPTIONS.map(function(u){
    return '<option value="'+u+'"'+(u===current?" selected":"")+'>'+u+'</option>';
  }).join("");
}

function numAttr(v){
  v = Number(v)||0;
  return v ? String(v) : "";
}

function purchaseRowHtml(p){
  return '<tr data-pur-id="'+p.id+'">'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(p.date||"")+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="place" placeholder="Market / supplier" value="'+esc(p.place)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1" data-field="packs" placeholder="0" value="'+numAttr(p.packs)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="0.01" data-field="qty" placeholder="0" value="'+numAttr(p.qty)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="10" data-field="unitPrice" placeholder="0" value="'+numAttr(p.unitPrice)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="amount" placeholder="0" value="'+numAttr(lineTotal(p))+'"></td>'+
    '<td><button class="icon-btn" type="button" data-remove-pur="'+p.id+'" title="Remove purchase" aria-label="Remove purchase">×</button></td>'+
  '</tr>';
}

function lumpRowHtml(p){
  var amt = Number(p.amount)||0;
  return '<tr data-lump-id="'+p.id+'">'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(p.date||"")+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="place" placeholder="Where you paid" value="'+esc(p.place)+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="note" placeholder="What it was (optional)" value="'+esc(p.note)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="amount" placeholder="0" value="'+(amt||"")+'"></td>'+
    '<td><button class="icon-btn" type="button" data-remove-lump="'+p.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function ingredientCardHtml(i){
  var rows = (i.purchases||[]).map(purchaseRowHtml).join("");
  return '<article class="ing-card" data-ing-id="'+i.id+'">'+
    '<div class="ing-head">'+
      '<input class="cell-input text ing-name" type="text" data-ing-field="name" placeholder="Item name" value="'+esc(i.name)+'">'+
      '<label class="ing-unit">Unit <select class="cell-input" data-ing-field="unit">'+unitSelectHtml(i.unit)+'</select></label>'+
      '<div class="ing-kpis">'+
        '<div><span class="ing-kpi-label">Daily</span><span class="tnum" data-ing-daily>'+won(i.dailyCost)+'</span></div>'+
        '<div><span class="ing-kpi-label">Weekly</span><span class="tnum" data-ing-weekly>'+won(i.weeklyCost)+'</span></div>'+
        '<div><span class="ing-kpi-label">This month</span><span class="tnum" data-ing-month>'+won(i.monthlyCost)+'</span></div>'+
        '<div><span class="ing-kpi-label">Avg unit price</span><span class="tnum" data-ing-avg>'+(i.avgUnitMonth?wonPerUnit(i.avgUnitMonth, i.unit):"—")+'</span></div>'+
      '</div>'+
      '<button class="icon-btn" type="button" data-remove-ing="'+i.id+'" title="Remove item" aria-label="Remove item">×</button>'+
    '</div>'+
    '<div class="table-wrap purchase-wrap"><table class="purchase-table"><thead><tr>'+
      '<th>Date</th><th>Market / place</th><th>Packets</th><th>Qty</th><th>₩ per unit</th><th>Line total</th><th></th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-add-pur="'+i.id+'">+ Add purchase (another market or date)</button>'+
  '</article>';
}

function categorySectionHtml(c){
  var body = "";
  c.items.forEach(function(i){ body += ingredientCardHtml(i); });
  return '<section class="card">'+
    '<h2><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h2>'+
    '<p class="lede">'+c.lede+'</p>'+
    body+
    '<button class="add-row-btn" type="button" data-add-cat="'+c.cat+'">+ Add item to '+c.label+'</button>'+
    '<p class="note">Subtotal — daily <b class="tnum" data-cat-daily="'+c.cat+'">'+won(c.daily)+'</b> · weekly <b class="tnum" data-cat-weekly="'+c.cat+'">'+won(c.weekly)+'</b> · this month <b class="tnum" data-cat-subtotal="'+c.cat+'">'+won(c.monthly)+'</b></p>'+
  '</section>';
}

function lumpSectionHtml(c){
  var rows = (c.lumps || []).map(lumpRowHtml).join("");
  return '<section class="card">'+
    '<h2><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h2>'+
    '<p class="lede">'+c.lede+'</p>'+
    '<div class="table-wrap purchase-wrap"><table class="lump-table"><thead><tr>'+
      '<th>Date</th><th>Where</th><th>What (optional)</th><th>Line total</th><th></th>'+
    '</tr></thead><tbody id="lump-tbody">'+rows+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-add-lump>+ Add another total</button>'+
    '<p class="note">Subtotal — daily <b class="tnum" data-cat-daily="nobill">'+won(c.daily)+'</b> · weekly <b class="tnum" data-cat-weekly="nobill">'+won(c.weekly)+'</b> · this month <b class="tnum" data-cat-subtotal="nobill">'+won(c.monthly)+'</b></p>'+
  '</section>';
}

function rawMaterialsChartHtml(model){
  return horizBarChart(model.catTotals.map(function(c){ return {label:c.label.replace("&amp;","&"), value:c.monthly, color:c.color}; }), {aria:"Monthly raw-material cost by category"});
}

function renderRawMaterialsTab(){
  var model = computeAll();
  var body = "";
  model.catTotals.forEach(function(c){
    if (c.cat === "nobill") body += lumpSectionHtml(c);
    else body += categorySectionHtml(c);
  });

  el("tab-raw").innerHTML =
    '<section class="card">'+
      '<h2>Raw materials</h2>'+
      '<p class="lede">Meat, groceries, and vegetables for '+MONTH_NAMES[STATE.month-1]+' '+STATE.year+'. <b>Packets</b> is how many packs you bought; <b>Qty</b> is the weight or volume. Line total auto-fills from qty × ₩ per unit — or type the total yourself.</p>'+
      '<p class="note">Grand total — daily <b class="tnum" id="raw-grand-daily">'+won(model.rawGrand.daily)+'</b> · weekly <b class="tnum" id="raw-grand-weekly">'+won(model.rawGrand.weekly)+'</b> · this month <b class="tnum" id="raw-grand">'+won(model.rawGrand.monthly)+'</b></p>'+
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
    var dailyEl = card.querySelector("[data-ing-daily]");
    var weeklyEl = card.querySelector("[data-ing-weekly]");
    var monthEl = card.querySelector("[data-ing-month]");
    var avgEl = card.querySelector("[data-ing-avg]");
    if (dailyEl) dailyEl.textContent = won(i.dailyCost);
    if (weeklyEl) weeklyEl.textContent = won(i.weeklyCost);
    if (monthEl) monthEl.textContent = won(i.monthlyCost);
    if (avgEl) avgEl.textContent = i.avgUnitMonth ? wonPerUnit(i.avgUnitMonth, i.unit) : "—";
    (i.purchases||[]).forEach(function(p){
      var tr = card.querySelector('tr[data-pur-id="'+p.id+'"]');
      if (!tr) return;
      var idleSet = function(sel, v){
        var node = tr.querySelector(sel);
        if (!node || document.activeElement === node) return;
        var s = v ? String(v) : "";
        if (node.value !== s) node.value = s;
      };
      idleSet('[data-field="unitPrice"]', niceNum(p.unitPrice));
      idleSet('[data-field="amount"]', niceNum(lineTotal(p)));
    });
  });
  model.catTotals.forEach(function(c){
    var sub = host.querySelector('[data-cat-subtotal="'+c.cat+'"]');
    var dEl = host.querySelector('[data-cat-daily="'+c.cat+'"]');
    var wEl = host.querySelector('[data-cat-weekly="'+c.cat+'"]');
    if (sub) sub.textContent = won(c.monthly);
    if (dEl) dEl.textContent = won(c.daily);
    if (wEl) wEl.textContent = won(c.weekly);
  });
  var gd = el("raw-grand-daily");
  var gw = el("raw-grand-weekly");
  var g = el("raw-grand");
  if (gd) gd.textContent = won(model.rawGrand.daily);
  if (gw) gw.textContent = won(model.rawGrand.weekly);
  if (g) g.textContent = won(model.rawGrand.monthly);
  var chartHost = el("raw-chart");
  if (chartHost) chartHost.innerHTML = rawMaterialsChartHtml(model);
}
