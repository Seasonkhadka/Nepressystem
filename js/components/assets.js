/**
 * components/assets.js — setup & assets with row categories, loans, summary, plan.
 */

function assetNumAttr(v){
  var n = Number(v) || 0;
  return n ? String(n) : "";
}

function assetRowCatSelectHtml(current){
  return ASSET_ROW_CAT_ORDER.map(function(k){
    return '<option value="'+k+'"'+(k === current ? " selected" : "")+'>'+ASSET_ROW_CAT[k].label+'</option>';
  }).join("");
}

function assetWarningsHtml(msgs){
  if (!msgs || !msgs.length) return "";
  return '<div class="asset-warn">'+msgs.map(function(m){ return esc(m); }).join(" · ")+'</div>';
}

function assetRowHtml(a){
  var life = Number(a.lifeMonths) || 0;
  var spreads = a.spreads;
  var lifeDisabled = spreads ? "" : ' disabled class="asset-life-off"';
  return '<tr data-asset-id="'+a.id+'"'+(a.included ? "" : ' class="asset-excluded"')+'>'+
    '<td class="asset-inc"><input type="checkbox" data-field="included"'+(a.included ? " checked" : "")+' title="Include in totals"></td>'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(a.date || "")+'"></td>'+
    '<td><select class="cell-input" data-field="rowCat">'+assetRowCatSelectHtml(a.rowCat)+'</select></td>'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Item" value="'+esc(a.name)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1" data-field="qty" placeholder="0" value="'+assetNumAttr(a.qty)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="unitPrice" placeholder="0" value="'+assetNumAttr(a.unitPrice)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="amount" placeholder="0" value="'+assetNumAttr(a.amount)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1" data-field="lifeMonths" placeholder="0" value="'+(spreads && life ? life : "")+'"'+lifeDisabled+'></td>'+
    '<td class="tnum calc" data-asset-monthly">'+(a.monthly ? won(a.monthly) : "—")+'</td>'+
    '<td><input class="cell-input text" type="text" data-field="note" placeholder="Flag / note" value="'+esc(a.note)+'"></td>'+
    '<td class="asset-warn-cell">'+assetWarningsHtml(a.warnings)+'</td>'+
    '<td><button class="icon-btn" type="button" data-remove-asset="'+a.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function assetSectionHtml(c){
  var rows = sortByDate(c.items || []).map(assetRowHtml).join("");
  return '<section class="card">'+
    '<h2><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+'</h2>'+
    '<p class="lede">'+c.lede+'</p>'+
    '<div class="table-wrap purchase-wrap"><table class="asset-table asset-table-wide"><thead><tr>'+
      '<th>Incl.</th><th>Date</th><th>Category</th><th>Item</th><th>Qty</th><th>₩ each</th><th>Line total</th><th>Life (mo)</th><th>₩ / mo</th><th>Note</th><th></th><th></th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-add-asset="'+c.cat+'">+ Add item</button>'+
    '<p class="note">Invested (included) <b class="tnum" data-asset-invested="'+c.cat+'">'+won(c.invested)+'</b>'+
      ' · Monthly spread <b class="tnum" data-asset-cat-monthly="'+c.cat+'">'+won(c.monthly)+'</b></p>'+
  '</section>';
}

function loanCardHtml(l){
  return '<div class="setup-loan-card" data-loan-id="'+l.id+'">'+
    '<div class="setup-loan-fields">'+
      '<label>Name<input class="cell-input text" type="text" data-loan-field="name" value="'+esc(l.name)+'"></label>'+
      '<label>Amount<input class="cell-input" type="number" min="0" step="1000" data-loan-field="principal" value="'+assetNumAttr(l.principal)+'"></label>'+
      '<label>Rate % / yr<input class="cell-input" type="number" min="0" step="0.1" data-loan-field="annualRate" value="'+assetNumAttr(l.annualRate)+'"></label>'+
      '<label>Term (mo) <span class="setup-term-note">'+esc(l.termNote)+'</span><input class="cell-input" type="number" min="1" step="1" data-loan-field="termMonths" value="'+assetNumAttr(l.termMonths)+'"></label>'+
    '</div>'+
    '<p class="note">Monthly payment <b class="tnum" data-loan-payment="'+l.id+'">'+won(l.payment)+'</b>'+
      ' · Total interest <b class="tnum" data-loan-interest="'+l.id+'">'+won(l.totalInterest)+'</b>'+
      ' · Month 1: interest <b class="tnum" data-loan-m1-int="'+l.id+'">'+won(l.month1Interest)+'</b>'+
      ', principal <b class="tnum" data-loan-m1-prin="'+l.id+'">'+won(l.month1Principal)+'</b></p>'+
  '</div>';
}

function loanScheduleTableHtml(loans){
  var head = '<thead><tr><th>Mo</th>';
  loans.forEach(function(l){ head += '<th colspan="4">'+esc(l.name)+'</th>'; });
  head += '</tr><tr><th></th>';
  loans.forEach(function(){ head += '<th>Open</th><th>Int.</th><th>Prin.</th><th>Close</th>'; });
  head += '</tr></thead>';
  var maxLen = 0;
  loans.forEach(function(l){ if (l.schedule.length > maxLen) maxLen = l.schedule.length; });
  var body = "";
  for (var i = 0; i < maxLen; i++){
    body += '<tr><td class="tnum">'+(i + 1)+'</td>';
    loans.forEach(function(l){
      var r = l.schedule[i];
      if (!r){
        body += '<td>—</td><td>—</td><td>—</td><td>—</td>';
      } else {
        body += '<td class="tnum">'+won(r.opening)+'</td><td class="tnum">'+won(r.interest)+'</td><td class="tnum">'+won(r.principal)+'</td><td class="tnum">'+won(r.closing)+'</td>';
      }
    });
    body += '</tr>';
  }
  return '<div class="table-wrap"><table class="loan-sched-table">'+head+'<tbody>'+body+'</tbody></table></div>';
}

function setupSummaryHtml(s){
  var catRows = (s.byRowCat || []).map(function(c){
    return '<tr><td>'+esc(c.label)+'</td><td class="tnum">'+won(c.total)+'</td><td class="tnum">'+won(c.monthly)+'</td></tr>';
  }).join("");
  var fund = s.funding || {};
  var shareRows = (fund.loanShares || []).map(function(l){
    return '<tr><td>'+esc(l.name)+'</td><td class="tnum">'+won(l.principal)+'</td><td class="tnum">'+pct(l.pct, 1)+'</td></tr>';
  }).join("");
  shareRows += '<tr><td>My own money</td><td class="tnum" id="setup-own-money">'+won(fund.ownMoney)+'</td><td class="tnum" id="setup-own-pct">'+pct(fund.ownPct, 1)+'</td></tr>';
  var reconClass = fund.reconOk ? "setup-ok" : "setup-bad";
  var reconText = fund.reconOk ? "OK — included rows match your records" : "Difference "+wonParen(fund.reconDiff);
  var lt = s.loanTotals || {};
  return '<section class="card" id="setup-summary">'+
    '<h2><span class="cat-chip" style="background:var(--chart-4)"></span>Summary</h2>'+
    '<h3 class="labor-subhead">By category</h3>'+
    '<div class="table-wrap"><table class="asset-summary"><thead><tr><th>Category</th><th>Total</th><th>Monthly cost</th></tr></thead><tbody>'+
      catRows+
      '<tr style="font-weight:700"><td>Grand total (included)</td><td class="tnum" id="setup-cat-total">'+won(s.rowCatGrand.total)+'</td><td class="tnum" id="setup-cat-monthly">'+won(s.rowCatGrand.monthly)+'</td></tr>'+
    '</tbody></table></div>'+
    '<h3 class="labor-subhead">Funding</h3>'+
    '<div class="setup-funding-row">'+
      '<label>Total invested (per my records)<input class="field-input" id="setup-total-record" type="number" min="0" step="1000" value="'+(fund.record || "")+'"></label>'+
      '<p class="setup-hint">'+(fund.recordManual ? "You typed this total — edit anytime." : "Auto = sum of included rows until you change this field.")+'</p>'+
    '</div>'+
    '<div class="table-wrap"><table class="asset-summary"><thead><tr><th>Source</th><th>Amount</th><th>Share</th></tr></thead><tbody>'+shareRows+'</tbody></table></div>'+
    '<p class="note '+reconClass+'" id="setup-recon">Check: included rows − records = <b class="tnum">'+wonParen(fund.reconDiff)+'</b> — '+reconText+'</p>'+
    '<h3 class="labor-subhead">Monthly costs (do not add together)</h3>'+
    '<p class="note">Setup &amp; equipment spread (non-cash): <b class="tnum" id="setup-spread-monthly">'+won(s.rowCatGrand.monthly)+'</b></p>'+
    '<p class="note">Loan payments (cash, principal + interest): <b class="tnum" id="setup-loan-payment">'+won(lt.payment)+'</b>'+
      ' · of which interest month 1: <b class="tnum" id="setup-loan-int-m1">'+won(lt.interestM1)+'</b></p>'+
    '<p class="setup-hint">Spread is accounting allocation; loan payment is cash out — do not sum them as one “monthly cost”.</p>'+
  '</section>';
}

function downloadAssetsCsv(){
  var model = computeAll();
  var s = model.setupAssets;
  var lines = ["section,date,category,item,qty,unit_price,line_total,life_months,monthly_spread,included,note,warnings"];
  (s.items || []).forEach(function(a){
    if (!assetHasData({ name: a.name, qty: a.qty, unitPrice: a.unitPrice, amount: a.amount })) return;
    var row = [
      a.cat,
      a.date || "",
      ASSET_ROW_CAT[a.rowCat] ? ASSET_ROW_CAT[a.rowCat].label : a.rowCat,
      '"' + String(a.name || "").replace(/"/g, '""') + '"',
      a.qty,
      a.unitPrice,
      a.amount,
      a.lifeMonths,
      a.monthly,
      a.included ? "yes" : "no",
      '"' + String(a.note || "").replace(/"/g, '""') + '"',
      '"' + (a.warnings || []).join("; ").replace(/"/g, '""') + '"'
    ];
    lines.push(row.join(","));
  });
  var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "setup-assets-" + STATE.year + "-" + pad2(STATE.month) + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderAssetsTab(){
  var model = computeAll();
  var s = model.setupAssets;
  var body = "";
  (s.assetCats || []).forEach(function(c){ body += assetSectionHtml(c); });

  var loansHtml = (s.loans || []).map(loanCardHtml).join("");

  el("tab-assets").innerHTML =
    '<section class="card">'+
      '<h2>Setup &amp; assets</h2>'+
      '<p class="lede">Category, line total, and ₩/month <b>auto-detect</b> from the item name (unless you change the category dropdown). Opening stock &amp; deposit have no monthly spread. Equipment &amp; contractor spread = line total ÷ life months (life filled in automatically if blank).</p>'+
      '<button class="add-row-btn" type="button" id="setup-download-csv">Download CSV</button>'+
    '</section>'+
    body+
    '<section class="card">'+
      '<h2><span class="cat-chip" style="background:var(--chart-2)"></span>Loans</h2>'+
      '<p class="lede">Equal monthly installments. Terms shown as assumed — change when you have final numbers.</p>'+
      loansHtml+
      '<p class="note">Combined payment <b class="tnum" id="setup-loans-combined">'+won(s.loanTotals.payment)+'</b>'+
        ' · Combined month-1 interest <b class="tnum" id="setup-loans-int-m1">'+won(s.loanTotals.interestM1)+'</b></p>'+
      '<details class="setup-sched-details"><summary>Month-by-month schedules (up to 60 months)</summary>'+
        loanScheduleTableHtml(s.loans || [])+
      '</details>'+
    '</section>'+
    setupSummaryHtml(s);
}

function refreshAssetComputedCells(model){
  var host = el("tab-assets");
  if (!host || !model || !model.setupAssets) return;
  var s = model.setupAssets;
  s.assetCats.forEach(function(c){
    (c.items || []).forEach(function(a){
      var tr = host.querySelector('tr[data-asset-id="'+a.id+'"]');
      if (!tr) return;
      var idleSet = function(sel, v){
        var node = tr.querySelector(sel);
        if (!node || document.activeElement === node) return;
        var str = v ? String(v) : "";
        if (node.value !== str) node.value = str;
      };
      idleSet('[data-field="unitPrice"]', niceNum(a.unitPrice));
      idleSet('[data-field="amount"]', niceNum(a.amount));
      var lifeIn = tr.querySelector('[data-field="lifeMonths"]');
      if (lifeIn && document.activeElement !== lifeIn){
        if (a.spreads){
          lifeIn.disabled = false;
          lifeIn.classList.remove("asset-life-off");
          var lifeVal = a.lifeMonths ? String(a.lifeMonths) : "";
          if (lifeIn.value !== lifeVal) lifeIn.value = lifeVal;
        } else {
          lifeIn.disabled = true;
          lifeIn.classList.add("asset-life-off");
          if (lifeIn.value !== "") lifeIn.value = "";
        }
      }
      var sel = tr.querySelector('[data-field="rowCat"]');
      if (sel && document.activeElement !== sel && sel.value !== a.rowCat) sel.value = a.rowCat;
      var mEl = tr.querySelector("[data-asset-monthly]");
      if (mEl) mEl.textContent = a.monthly ? won(a.monthly) : "—";
      var wCell = tr.querySelector(".asset-warn-cell");
      if (wCell) wCell.innerHTML = assetWarningsHtml(a.warnings);
      tr.classList.toggle("asset-excluded", !a.included);
    });
    var inv = host.querySelector('[data-asset-invested="'+c.cat+'"]');
    var mon = host.querySelector('[data-asset-cat-monthly="'+c.cat+'"]');
    if (inv) inv.textContent = won(c.invested);
    if (mon) mon.textContent = won(c.monthly);
  });

  (s.loans || []).forEach(function(l){
    var pay = host.querySelector('[data-loan-payment="'+l.id+'"]');
    var ti = host.querySelector('[data-loan-interest="'+l.id+'"]');
    var i1 = host.querySelector('[data-loan-m1-int="'+l.id+'"]');
    var p1 = host.querySelector('[data-loan-m1-prin="'+l.id+'"]');
    if (pay) pay.textContent = won(l.payment);
    if (ti) ti.textContent = won(l.totalInterest);
    if (i1) i1.textContent = won(l.month1Interest);
    if (p1) p1.textContent = won(l.month1Principal);
  });

  var set = function(id, text){ var n = el(id); if (n) n.textContent = text; };
  set("setup-loans-combined", won(s.loanTotals.payment));
  set("setup-loans-int-m1", won(s.loanTotals.interestM1));
  set("setup-cat-total", won(s.rowCatGrand.total));
  set("setup-cat-monthly", won(s.rowCatGrand.monthly));
  set("setup-spread-monthly", won(s.rowCatGrand.monthly));
  set("setup-loan-payment", won(s.loanTotals.payment));
  set("setup-loan-int-m1", won(s.loanTotals.interestM1));
  set("setup-own-money", won(s.funding.ownMoney));
  set("setup-own-pct", pct(s.funding.ownPct, 1));
  var recon = el("setup-recon");
  if (recon){
    recon.className = "note " + (s.funding.reconOk ? "setup-ok" : "setup-bad");
    recon.innerHTML = 'Check: included rows − records = <b class="tnum">'+wonParen(s.funding.reconDiff)+'</b> — '+
      (s.funding.reconOk ? "OK — included rows match your records" : "Difference "+wonParen(s.funding.reconDiff));
  }
  var rec = el("setup-total-record");
  if (rec && document.activeElement !== rec){
    var rv = s.funding.record || "";
    if (rec.value !== String(rv)) rec.value = rv ? String(rv) : "";
  }

}
