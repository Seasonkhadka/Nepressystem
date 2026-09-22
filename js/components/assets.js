/**
 * components/assets.js — long-term inventory, setup cost, utensils, and
 * gas/equipment. Separate from monthly raw-material buys.
 */

function assetRowHtml(a){
  var life = Number(a.lifeMonths)||0;
  var monthly = assetMonthly(a);
  return '<tr data-asset-id="'+a.id+'">'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(a.date||"")+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Item" value="'+esc(a.name)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1" data-field="qty" placeholder="0" value="'+numAttr(a.qty)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="unitPrice" placeholder="0" value="'+numAttr(a.unitPrice)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="amount" placeholder="0" value="'+numAttr(lineTotal(a))+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1" data-field="lifeMonths" placeholder="0" value="'+(life||"")+'"></td>'+
    '<td class="tnum calc" data-asset-monthly>'+(life ? won(monthly) : "—")+'</td>'+
    '<td><button class="icon-btn" type="button" data-remove-asset="'+a.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function assetSectionHtml(c){
  var rows = sortByDate(c.items || []).map(assetRowHtml).join("");
  return '<section class="card">'+
    '<h2><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h2>'+
    '<p class="lede">'+c.lede+'</p>'+
    '<div class="table-wrap purchase-wrap"><table class="asset-table"><thead><tr>'+
      '<th>Date</th><th>Item</th><th>Qty</th><th>₩ each</th><th>Line total</th><th>Life (months)</th><th>₩ / month</th><th></th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-add-asset="'+c.cat+'">+ Add '+c.label.toLowerCase()+' item</button>'+
    '<p class="note">Invested <b class="tnum" data-asset-invested="'+c.cat+'">'+won(c.invested)+'</b>'+
      ' · suggested monthly <b class="tnum" data-asset-cat-monthly="'+c.cat+'">'+won(c.monthly)+'</b></p>'+
  '</section>';
}

function renderAssetsTab(){
  var model = computeAll();
  var body = "";
  (model.assetCats || []).forEach(function(c){ body += assetSectionHtml(c); });
  var g = model.assetGrand || { invested:0, monthly:0 };
  var chart = horizBarChart((model.assetCats || []).map(function(c){
    return { label: c.label, value: c.invested, color: c.color };
  }), { aria: "Long-term investment by category" });

  el("tab-assets").innerHTML =
    '<section class="card">'+
      '<h2>Setup &amp; assets</h2>'+
      '<p class="lede">Inventory on the shelf, opening setup, utensils, and gas equipment. These last longer than a month. They do <b>not</b> mix with daily meat and vegetable buys. Life in months spreads the cost into a suggested ₩/month — copy that into Fixed Overhead if you want it on the P&amp;L.</p>'+
      '<p class="note">Total invested: <b class="tnum" id="asset-grand-invested">'+won(g.invested)+'</b>'+
        ' · suggested ₩/month: <b class="tnum" id="asset-grand-monthly">'+won(g.monthly)+'</b></p>'+
    '</section>'+
    body+
    '<section class="card"><h2>Investment by category</h2><div id="asset-chart">'+chart+'</div></section>';
}

function refreshAssetComputedCells(model){
  var host = el("tab-assets");
  if (!host || !model || !model.assetCats) return;
  model.assetCats.forEach(function(c){
    (c.items || []).forEach(function(a){
      var tr = host.querySelector('tr[data-asset-id="'+a.id+'"]');
      if (!tr) return;
      var idleSet = function(sel, v){
        var node = tr.querySelector(sel);
        if (!node || document.activeElement === node) return;
        var s = v ? String(v) : "";
        if (node.value !== s) node.value = s;
      };
      idleSet('[data-field="unitPrice"]', niceNum(a.unitPrice));
      idleSet('[data-field="amount"]', niceNum(a.amount));
      var mEl = tr.querySelector("[data-asset-monthly]");
      if (mEl) mEl.textContent = a.lifeMonths ? won(a.monthly) : "—";
    });
    var inv = host.querySelector('[data-asset-invested="'+c.cat+'"]');
    var mon = host.querySelector('[data-asset-cat-monthly="'+c.cat+'"]');
    if (inv) inv.textContent = won(c.invested);
    if (mon) mon.textContent = won(c.monthly);
  });
  var gi = el("asset-grand-invested");
  var gm = el("asset-grand-monthly");
  if (gi) gi.textContent = won(model.assetGrand.invested);
  if (gm) gm.textContent = won(model.assetGrand.monthly);
  var chartHost = el("asset-chart");
  if (chartHost){
    chartHost.innerHTML = horizBarChart((model.assetCats || []).map(function(c){
      return { label: c.label, value: c.invested, color: c.color };
    }), { aria: "Long-term investment by category" });
  }
}
