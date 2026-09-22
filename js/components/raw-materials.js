/**
 * components/raw-materials.js — compact ledgers: Meat, Groceries
 * (Kitchen / Outside / Drinks), Vegetables, then No bill.
 */

function unitSelectHtml(current){
  return UNIT_OPTIONS.map(function(u){
    return '<option value="'+u+'"'+(u===current?" selected":"")+'>'+u+'</option>';
  }).join("");
}

function groceryMoveHtml(i){
  if (GROCERY_CATS.indexOf(i.cat) < 0) return "";
  return '<select class="cell-input raw-move" data-ing-field="cat" title="Move within groceries">'+
    GROCERY_CATS.map(function(c){
      return '<option value="'+c+'"'+(c===i.cat?" selected":"")+'>'+CAT_META[c].label+'</option>';
    }).join("")+
  '</select>';
}

function numAttr(v){
  var n = Number(v)||0;
  return n ? String(n) : "";
}

function purchaseOtherHint(p){
  if (!p.date || purchaseInMonth(p, STATE.year, STATE.month)) return "";
  var parts = String(p.date).split("-");
  var m = Number(parts[1]);
  return 'Dated '+(MONTH_NAMES[m-1]||"")+' '+parts[0]+' — switch the month above to include this in This month.';
}

function purchaseCellsHtml(p){
  return '<td class="raw-date"><input class="cell-input" type="date" data-field="date" value="'+esc(p.date||"")+'"></td>'+
    '<td class="raw-place"><input class="cell-input text" type="text" data-field="place" placeholder="Market" value="'+esc(p.place)+'"></td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="1" data-field="packs" placeholder="0" value="'+numAttr(p.packs)+'"></td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="0.01" data-field="qty" placeholder="0" value="'+numAttr(p.qty)+'"></td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="1" data-field="unitPrice" placeholder="0" value="'+numAttr(p.unitPrice)+'"></td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="100" data-field="amount" placeholder="0" value="'+numAttr(lineTotal(p))+'"></td>';
}

function ingredientRowsHtml(i){
  var purs = (i.purchases && i.purchases.length) ? i.purchases : [blankPurchase()];
  var n = purs.length;
  return purs.map(function(p, idx){
    var other = p.date && !purchaseInMonth(p, STATE.year, STATE.month);
    var hint = purchaseOtherHint(p);
    var nameCells = "";
    if (idx === 0){
      nameCells =
        '<td rowspan="'+n+'" class="raw-item">'+
          '<input class="cell-input text ing-name" type="text" data-ing-field="name" placeholder="Item" value="'+esc(i.name)+'">'+
          groceryMoveHtml(i)+
          '<span class="ing-avg" data-ing-avg>'+avgUnitText(i)+'</span>'+
        '</td>'+
        '<td rowspan="'+n+'"><select class="cell-input" data-ing-field="unit">'+unitSelectHtml(i.unit)+'</select></td>';
    }
    var btns = "";
    if (idx === 0){
      btns += '<button class="icon-btn" type="button" data-add-pur="'+i.id+'" title="Another buy">+</button>';
      btns += '<button class="icon-btn" type="button" data-remove-ing="'+i.id+'" title="Remove item">×</button>';
    } else {
      btns += '<button class="icon-btn" type="button" data-remove-pur="'+p.id+'" title="Remove buy">×</button>';
    }
    return '<tr data-ing-id="'+i.id+'" data-pur-id="'+p.id+'"'+(other?' class="purchase-other-month"':'')+(hint?' title="'+esc(hint)+'"':'')+'>'+
      nameCells+
      purchaseCellsHtml(p)+
      '<td class="raw-actions">'+btns+'</td>'+
    '</tr>';
  }).join("");
}

function lumpRowHtml(p){
  var amt = Number(p.amount)||0;
  return '<tr data-lump-id="'+p.id+'">'+
    '<td class="raw-date"><input class="cell-input" type="date" data-field="date" value="'+esc(p.date||"")+'"></td>'+
    '<td class="raw-place"><input class="cell-input text" type="text" data-field="place" placeholder="Where you paid" value="'+esc(p.place)+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="note" placeholder="What it was" value="'+esc(p.note)+'"></td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="100" data-field="amount" placeholder="0" value="'+(amt||"")+'"></td>'+
    '<td class="raw-actions"><button class="icon-btn" type="button" data-remove-lump="'+p.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function rawTableHead(){
  return '<thead><tr>'+
    '<th>Item</th><th>Unit</th><th>Date</th><th>Place</th><th>Packs</th><th>Size</th><th>₩/pack</th><th>Total</th><th></th>'+
  '</tr></thead>';
}

function categoryTableHtml(c){
  var rows = "";
  sortByName(c.items || [], "name").forEach(function(i){ rows += ingredientRowsHtml(i); });
  return '<div class="table-wrap"><table class="raw-table">'+rawTableHead()+'<tbody>'+rows+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-add-cat="'+c.cat+'">+ Add item</button>';
}

function categorySectionHtml(c){
  if (!c) return "";
  return '<section class="card">'+
    '<div class="raw-cat-head">'+
      '<h2><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h2>'+
      '<p class="raw-cat-total">This month <b class="tnum" data-cat-subtotal="'+c.cat+'">'+won(c.monthly)+'</b></p>'+
    '</div>'+
    categoryTableHtml(c)+
  '</section>';
}

function groceryGroupHtml(cats){
  var month = 0;
  var subs = "";
  cats.forEach(function(c){
    if (!c) return;
    month += c.monthly;
    subs += '<div class="raw-sub">'+
      '<div class="raw-sub-head">'+
        '<h3><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h3>'+
        '<p class="raw-cat-total"><b class="tnum" data-cat-subtotal="'+c.cat+'">'+won(c.monthly)+'</b></p>'+
      '</div>'+
      categoryTableHtml(c)+
    '</div>';
  });
  return '<section class="card">'+
    '<div class="raw-cat-head">'+
      '<h2>Groceries</h2>'+
      '<p class="raw-cat-total">This month <b class="tnum" data-grocery-total>'+won(month)+'</b></p>'+
    '</div>'+
    subs+
  '</section>';
}

function lumpSectionHtml(c){
  var rows = sortByDate(c.lumps || []).map(lumpRowHtml).join("");
  return '<section class="card">'+
    '<div class="raw-cat-head">'+
      '<h2><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h2>'+
      '<p class="raw-cat-total">This month <b class="tnum" data-cat-subtotal="nobill">'+won(c.monthly)+'</b></p>'+
    '</div>'+
    '<div class="table-wrap"><table class="raw-table lump-table"><thead><tr>'+
      '<th>Date</th><th>Where</th><th>What</th><th>Total</th><th></th>'+
    '</tr></thead><tbody id="lump-tbody">'+rows+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-add-lump>+ Add total</button>'+
  '</section>';
}

function rawMaterialsChartHtml(model){
  return horizBarChart(model.catTotals.map(function(c){ return {label:c.label.replace("&amp;","&"), value:c.monthly, color:c.color}; }), {aria:"Monthly raw-material cost by category"});
}

function catById(model, cat){
  var found = null;
  model.catTotals.forEach(function(c){ if (c.cat === cat) found = c; });
  return found;
}

function renderRawMaterialsTab(){
  var model = computeAll();
  var groceryCats = GROCERY_CATS.map(function(id){ return catById(model, id); });

  el("tab-raw").innerHTML =
    '<section class="card">'+
      '<div class="raw-cat-head"><h2>Raw materials</h2></div>'+
      '<div class="raw-summary">'+
        '<div class="raw-sum"><span class="raw-sum-label">This month</span><span class="raw-sum-val tnum" id="raw-grand">'+won(model.rawGrand.monthly)+'</span></div>'+
        '<div class="raw-sum"><span class="raw-sum-label">Daily</span><span class="raw-sum-val tnum" id="raw-grand-daily">'+won(model.rawGrand.daily)+'</span></div>'+
        '<div class="raw-sum"><span class="raw-sum-label">Weekly</span><span class="raw-sum-val tnum" id="raw-grand-weekly">'+won(model.rawGrand.weekly)+'</span></div>'+
      '</div>'+
      '<p class="raw-hint">Packs × ₩/pack = total. Size is what’s in one pack. Totals follow the month selected above.</p>'+
    '</section>'+
    categorySectionHtml(catById(model, "meat"))+
    groceryGroupHtml(groceryCats)+
    categorySectionHtml(catById(model, "veg"))+
    lumpSectionHtml(catById(model, "nobill"))+
    '<section class="card"><h2>This month by category</h2><div class="raw-chart" id="raw-chart">'+rawMaterialsChartHtml(model)+'</div></section>';
}

function refreshRawComputedCells(model){
  var host = el("tab-raw");
  if (!host) return;
  model.ingredients.forEach(function(i){
    var first = host.querySelector('tr[data-ing-id="'+i.id+'"]');
    if (first){
      var avgEl = first.querySelector("[data-ing-avg]");
      if (avgEl) avgEl.textContent = avgUnitText(i);
    }
    (i.purchases||[]).forEach(function(p){
      var tr = host.querySelector('tr[data-pur-id="'+p.id+'"]');
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
  var groceryMonth = 0;
  model.catTotals.forEach(function(c){
    var sub = host.querySelector('[data-cat-subtotal="'+c.cat+'"]');
    if (sub) sub.textContent = won(c.monthly);
    if (GROCERY_CATS.indexOf(c.cat) >= 0) groceryMonth += c.monthly;
  });
  var gTot = host.querySelector("[data-grocery-total]");
  if (gTot) gTot.textContent = won(groceryMonth);
  var gd = el("raw-grand-daily");
  var gw = el("raw-grand-weekly");
  var g = el("raw-grand");
  if (gd) gd.textContent = won(model.rawGrand.daily);
  if (gw) gw.textContent = won(model.rawGrand.weekly);
  if (g) g.textContent = won(model.rawGrand.monthly);
  var chartHost = el("raw-chart");
  if (chartHost) chartHost.innerHTML = rawMaterialsChartHtml(model);
}
