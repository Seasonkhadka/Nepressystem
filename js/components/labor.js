/**
 * components/labor.js — staff pay plus monthly overhead bills.
 * Shifts and bills are dated; changing the month shows that month only — other months stay saved.
 */

function paidSelectHtml(paid){
  return '<select class="cell-input labor-paid" data-field="paid">'+
    '<option value="yes"'+(paid ? " selected" : "")+'>Paid</option>'+
    '<option value="no"'+(!paid ? " selected" : "")+'>Unpaid</option>'+
  '</select>';
}

function laborShiftRowHtml(s){
  return '<tr data-shift-id="'+s.id+'"'+(s.paid ? "" : ' class="labor-unpaid"')+'>'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(s.date||"")+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Name" value="'+esc(s.name)+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="role" placeholder="Cook, hall…" value="'+esc(s.role)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="0.5" data-field="hours" placeholder="0" value="'+numAttr(s.hours)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="rate" placeholder="0" value="'+numAttr(s.rate)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1000" data-field="amount" placeholder="0" value="'+numAttr(laborShiftTotal(s))+'"></td>'+
    '<td>'+paidSelectHtml(!!s.paid)+'</td>'+
    '<td><button class="icon-btn" type="button" data-remove-shift="'+s.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function laborSalaryRowHtml(s, openDays){
  var amt = Number(s.amount) || 0;
  var daily = openDays && amt ? amt / openDays : 0;
  return '<tr data-salary-id="'+s.id+'">'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Name" value="'+esc(s.name)+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="role" placeholder="Chef, manager…" value="'+esc(s.role)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="10000" data-field="amount" placeholder="0" value="'+numAttr(s.amount)+'"></td>'+
    '<td class="tnum calc" data-salary-daily>'+(daily ? won(daily) : "—")+'</td>'+
    '<td class="raw-actions"><button class="icon-btn" type="button" data-add-salary-part="'+s.id+'" title="Add payment part">+</button>'+
      '<button class="icon-btn" type="button" data-remove-salary="'+s.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function salaryPartRowHtml(s, p){
  var label = String(s.name || "").trim() || "Staff";
  return '<tr data-salary-id="'+s.id+'" data-salary-part-id="'+p.id+'"'+(p.paid ? "" : ' class="labor-unpaid"')+'>'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(p.date||"")+'"></td>'+
    '<td class="labor-part-staff">'+esc(label)+'</td>'+
    '<td><input class="cell-input" type="number" min="0" step="10000" data-field="amount" placeholder="0" value="'+numAttr(p.amount)+'"></td>'+
    '<td>'+paidSelectHtml(!!p.paid)+'</td>'+
    '<td><button class="icon-btn" type="button" data-remove-salary-part="'+p.id+'" title="Remove part" aria-label="Remove part">×</button></td>'+
  '</tr>';
}

function salaryPartsThisMonth(year, month){
  var rows = [];
  asArray(STATE.laborSalaries).forEach(function(s){
    asArray(s.parts).forEach(function(p){
      if (purchaseInMonth(p, year, month)) rows.push({ salary: s, part: p });
    });
  });
  return rows.sort(function(a, b){
    var da = String(a.part.date || "");
    var db = String(b.part.date || "");
    if (da && db) return da.localeCompare(db);
    if (da) return -1;
    if (db) return 1;
    return 0;
  });
}

function renderLaborTab(){
  var model = computeAll();
  var L = model.labor || { shiftMonth:0, salaryMonth:0, monthly:0, hasLedger:false, openDays:0, paidTotal:0, unpaidTotal:0 };
  var O = model.overhead || { billMonth:0, fixedMonth:0, monthly:0, variableRate:0, hasBills:false };
  var shifts = sortByDate(asArray(STATE.laborShifts).filter(function(s){
    return purchaseInMonth(s, STATE.year, STATE.month);
  }));
  var otherShiftCount = asArray(STATE.laborShifts).filter(function(s){
    return laborShiftHasData(s) && !purchaseInMonth(s, STATE.year, STATE.month);
  }).length;
  var salaries = asArray(STATE.laborSalaries);
  var openDays = L.openDays || daysInMonth(STATE.year, STATE.month);
  var salaryParts = salaryPartsThisMonth(STATE.year, STATE.month);
  var otherPartCount = 0;
  asArray(STATE.laborSalaries).forEach(function(s){
    asArray(s.parts).forEach(function(p){
      if (salaryPartHasData(p) && !purchaseInMonth(p, STATE.year, STATE.month)) otherPartCount += 1;
    });
  });
  var bills = sortByDate(asArray(STATE.overheadBills).filter(function(b){
    return purchaseInMonth(b, STATE.year, STATE.month);
  }));
  var otherBillCount = asArray(STATE.overheadBills).filter(function(b){
    return overheadBillHasData(b) && !purchaseInMonth(b, STATE.year, STATE.month);
  }).length;
  var fixedItems = asArray(STATE.overheadFixedItems);
  var monthLabel = MONTH_NAMES[STATE.month-1]+" "+STATE.year;

  el("tab-labor").innerHTML =
    '<section class="card">'+
      '<h2>Labor &amp; overhead</h2>'+
      '<p class="lede">Staff pay is labor. Overhead is split into <b>fixed</b> (rent — same every month) and <b>not fixed</b> (electricity, water — changes each month). This page shows <b>'+monthLabel+'</b> for dated rows. Switch the month above to see another month; those rows stay saved.</p>'+
      '<p class="note">This month: shifts <b class="tnum" id="labor-shift-total">'+won(L.shiftMonth)+'</b>'+
        ' · salaries <b class="tnum" id="labor-salary-total">'+won(L.salaryMonth)+'</b>'+
        ' · P&amp;L labor <b class="tnum" id="labor-grand-total">'+won(L.monthly)+'</b>'+
        ' · paid <b class="tnum" id="labor-paid-total">'+won(L.paidTotal)+'</b>'+
        ' · unpaid <b class="tnum" id="labor-unpaid-total">'+won(L.unpaidTotal)+'</b>'+
        ' · fixed overhead <b class="tnum" id="overhead-fixed-total">'+won(O.fixedMonth)+'</b>'+
        ' · not-fixed bills <b class="tnum" id="overhead-bill-total">'+won(O.billMonth)+'</b></p>'+
      (L.hasLedger ? '' : '<p class="note" id="labor-empty-hint">Nothing on this page yet. If you used to type labor on each P&amp;L day, those numbers still show until you add a shift or salary here — then this page takes over.</p>')+
    '</section>'+
    '<section class="card">'+
      '<h2>Shifts &amp; daily wages</h2>'+
      '<p class="lede">Part-time, hourly, or a cash day wage. Put the date they worked. Mark <b>Paid</b> or <b>Unpaid</b> when you settle — P&amp;L still counts all shifts this month.</p>'+
      (otherShiftCount ? '<p class="note">'+otherShiftCount+' shift'+(otherShiftCount===1?"":"s")+' saved in other months — change the month above to see them.</p>' : '')+
      '<div class="table-wrap purchase-wrap"><table class="labor-table"><thead><tr>'+
        '<th>Date</th><th>Name</th><th>Role</th><th>Hours</th><th>₩ / hour</th><th>Pay</th><th>Status</th><th></th>'+
      '</tr></thead><tbody>'+(shifts.length ? shifts.map(laborShiftRowHtml).join("") : "")+'</tbody></table></div>'+
      '<button class="add-row-btn" type="button" data-add-shift>+ Add shift</button>'+
    '</section>'+
    '<section class="card">'+
      '<h2>Monthly salary</h2>'+
      '<p class="lede">Full-time or salaried staff. Enter the month’s wage once — it spreads across open days on the P&amp;L. Use <b>payment parts</b> below to split when you actually pay (e.g. mid-month + end-month) and mark each part paid or unpaid.</p>'+
      '<div class="table-wrap purchase-wrap"><table class="salary-table"><thead><tr>'+
        '<th>Name</th><th>Role</th><th>Pay / month</th><th>₩ / open day</th><th></th>'+
      '</tr></thead><tbody>'+salaries.map(function(s){ return laborSalaryRowHtml(s, openDays); }).join("")+'</tbody></table></div>'+
      '<button class="add-row-btn" type="button" data-add-salary>+ Add salary</button>'+
      '<h3 class="labor-subhead">Salary payment parts — '+monthLabel+'</h3>'+
      '<p class="lede">Divide each person’s wage into dated payments. Parts can add up to the monthly wage or less if you still owe the rest.</p>'+
      (otherPartCount ? '<p class="note">'+otherPartCount+' payment part'+(otherPartCount===1?"":"s")+' saved in other months.</p>' : '')+
      '<div class="table-wrap purchase-wrap"><table class="salary-parts-table"><thead><tr>'+
        '<th>Date</th><th>Staff</th><th>Amount</th><th>Status</th><th></th>'+
      '</tr></thead><tbody>'+(salaryParts.length ? salaryParts.map(function(r){ return salaryPartRowHtml(r.salary, r.part); }).join("") : "")+'</tbody></table></div>'+
    '</section>'+
    '<section class="card">'+
      '<h2>Fixed overhead</h2>'+
      '<p class="lede">Rent, insurance, internet — costs that stay the same until you change them. They apply every month. Not wages, not food.</p>'+
      '<div class="table-wrap purchase-wrap"><table class="salary-table"><thead><tr>'+
        '<th>Bill</th><th>Amount / month</th><th></th>'+
      '</tr></thead><tbody>'+fixedItems.map(overheadFixedRowHtml).join("")+'</tbody></table></div>'+
      '<button class="add-row-btn" type="button" data-add-fixed>+ Add fixed cost</button>'+
    '</section>'+
    '<section class="card">'+
      '<h2>Not-fixed overhead</h2>'+
      '<p class="lede">Electricity, water, gas, and other bills that change. Date each bill so it stays with that month. Card fees and delivery apps go in the % of sales below.</p>'+
      (otherBillCount ? '<p class="note">'+otherBillCount+' not-fixed bill'+(otherBillCount===1?"":"s")+' saved in other months — change the month above to see them.</p>' : '')+
      '<div class="table-wrap purchase-wrap"><table class="overhead-table"><thead><tr>'+
        '<th>Date</th><th>Bill</th><th>Amount</th><th></th>'+
      '</tr></thead><tbody>'+(bills.length ? bills.map(overheadBillRowHtml).join("") : "")+'</tbody></table></div>'+
      '<button class="add-row-btn" type="button" data-add-bill>+ Add bill</button>'+
      '<div class="overhead-var-row">'+
        '<label for="input-overhead-var">Not-fixed % of sales</label>'+
        '<input class="field-input" id="input-overhead-var" type="number" min="0" step="0.5" placeholder="0.0" value="'+(STATE.overheadVariableRate || "")+'">'+
        '<p class="setup-hint">Card fees, delivery apps — on top of this month’s bills.</p>'+
      '</div>'+
      '<p class="note">P&amp;L overhead this month (fixed + not fixed): <b class="tnum" id="overhead-grand-total">'+won(O.monthly)+'</b></p>'+
    '</section>';
}

function refreshLaborComputedCells(model){
  var host = el("tab-labor");
  if (!host || !model) return;
  var L = model.labor || { shiftMonth:0, salaryMonth:0, monthly:0, openDays:0, paidTotal:0, unpaidTotal:0 };
  var O = model.overhead || { billMonth:0, fixedMonth:0, monthly:0 };
  var openDays = L.openDays || daysInMonth(STATE.year, STATE.month);
  asArray(STATE.laborShifts).forEach(function(s){
    var tr = host.querySelector('tr[data-shift-id="'+s.id+'"]');
    if (!tr) return;
    var idleSet = function(sel, v){
      var node = tr.querySelector(sel);
      if (!node || document.activeElement === node) return;
      var str = v ? String(v) : "";
      if (node.value !== str) node.value = str;
    };
    idleSet('[data-field="rate"]', niceNum(s.rate));
    idleSet('[data-field="amount"]', niceNum(laborShiftTotal(s)));
    tr.classList.toggle("labor-unpaid", !s.paid);
  });
  asArray(STATE.laborSalaries).forEach(function(s){
    var tr = host.querySelector('tr[data-salary-id="'+s.id+'"]:not([data-salary-part-id])');
    if (tr){
      var dailyEl = tr.querySelector("[data-salary-daily]");
      var amt = Number(s.amount) || 0;
      if (dailyEl) dailyEl.textContent = openDays && amt ? won(amt / openDays) : "—";
    }
    asArray(s.parts).forEach(function(p){
      var ptr = host.querySelector('tr[data-salary-part-id="'+p.id+'"]');
      if (!ptr) return;
      ptr.classList.toggle("labor-unpaid", !p.paid);
      var staffEl = ptr.querySelector(".labor-part-staff");
      if (staffEl){
        var label = String(s.name || "").trim() || "Staff";
        if (staffEl.textContent !== label) staffEl.textContent = label;
      }
    });
  });
  var st = el("labor-shift-total");
  var sa = el("labor-salary-total");
  var gr = el("labor-grand-total");
  var pt = el("labor-paid-total");
  var ut = el("labor-unpaid-total");
  var bt = el("overhead-bill-total");
  var ft = el("overhead-fixed-total");
  var og = el("overhead-grand-total");
  if (st) st.textContent = won(L.shiftMonth);
  if (sa) sa.textContent = won(L.salaryMonth);
  if (gr) gr.textContent = won(L.monthly);
  if (pt) pt.textContent = won(L.paidTotal);
  if (ut) ut.textContent = won(L.unpaidTotal);
  if (bt) bt.textContent = won(O.billMonth);
  if (ft) ft.textContent = won(O.fixedMonth);
  if (og) og.textContent = won(O.monthly);
  var hint = el("labor-empty-hint");
  if (hint) hint.hidden = !!L.hasLedger;
}

function overheadBillRowHtml(b){
  return '<tr data-bill-id="'+b.id+'">'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(b.date||"")+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Electricity, water, gas…" value="'+esc(b.name)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1000" data-field="amount" placeholder="0" value="'+numAttr(b.amount)+'"></td>'+
    '<td><button class="icon-btn" type="button" data-remove-bill="'+b.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function overheadFixedRowHtml(b){
  return '<tr data-fixed-id="'+b.id+'">'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Rent, insurance, internet…" value="'+esc(b.name)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="10000" data-field="amount" placeholder="0" value="'+numAttr(b.amount)+'"></td>'+
    '<td><button class="icon-btn" type="button" data-remove-fixed="'+b.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}
