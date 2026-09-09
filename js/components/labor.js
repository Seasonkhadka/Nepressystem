/**
 * components/labor.js — staff pay: daily/hourly shifts plus monthly salaries.
 * Separate from overhead (rent, bills, fees).
 */

function laborShiftRowHtml(s){
  return '<tr data-shift-id="'+s.id+'">'+
    '<td><input class="cell-input" type="date" data-field="date" value="'+esc(s.date||"")+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Name" value="'+esc(s.name)+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="role" placeholder="Cook, hall…" value="'+esc(s.role)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="0.5" data-field="hours" placeholder="0" value="'+numAttr(s.hours)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="100" data-field="rate" placeholder="0" value="'+numAttr(s.rate)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="1000" data-field="amount" placeholder="0" value="'+numAttr(laborShiftTotal(s))+'"></td>'+
    '<td><button class="icon-btn" type="button" data-remove-shift="'+s.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function laborSalaryRowHtml(s){
  return '<tr data-salary-id="'+s.id+'">'+
    '<td><input class="cell-input text" type="text" data-field="name" placeholder="Name" value="'+esc(s.name)+'"></td>'+
    '<td><input class="cell-input text" type="text" data-field="role" placeholder="Chef, manager…" value="'+esc(s.role)+'"></td>'+
    '<td><input class="cell-input" type="number" min="0" step="10000" data-field="amount" placeholder="0" value="'+numAttr(s.amount)+'"></td>'+
    '<td><button class="icon-btn" type="button" data-remove-salary="'+s.id+'" title="Remove row" aria-label="Remove row">×</button></td>'+
  '</tr>';
}

function renderLaborTab(){
  var model = computeAll();
  var L = model.labor || { shiftMonth:0, salaryMonth:0, monthly:0, hasLedger:false };
  var shifts = asArray(STATE.laborShifts);
  var salaries = asArray(STATE.laborSalaries);

  el("tab-labor").innerHTML =
    '<section class="card">'+
      '<h2>Labor</h2>'+
      '<p class="lede">Staff pay lives here — not in overhead. <b>Shifts</b> are wages that change by day (hours × rate, or type the total). <b>Monthly salary</b> is a fixed wage for the month, split across open days. Both go onto the P&amp;L Labor column automatically.</p>'+
      '<p class="note">This month: shifts <b class="tnum" id="labor-shift-total">'+won(L.shiftMonth)+'</b>'+
        ' · salaries <b class="tnum" id="labor-salary-total">'+won(L.salaryMonth)+'</b>'+
        ' · P&amp;L labor <b class="tnum" id="labor-grand-total">'+won(L.monthly)+'</b></p>'+
      (L.hasLedger ? '' : '<p class="note" id="labor-empty-hint">Nothing on this page yet. If you used to type labor on each P&amp;L day, those numbers still show until you add a shift or salary here — then this page takes over.</p>')+
    '</section>'+
    '<section class="card">'+
      '<h2>Shifts &amp; daily wages</h2>'+
      '<p class="lede">Part-time, hourly, or a cash day wage. Put the date they worked. Hours × ₩/hour fills the total, or type the total yourself.</p>'+
      '<div class="table-wrap purchase-wrap"><table class="labor-table"><thead><tr>'+
        '<th>Date</th><th>Name</th><th>Role</th><th>Hours</th><th>₩ / hour</th><th>Pay</th><th></th>'+
      '</tr></thead><tbody>'+shifts.map(laborShiftRowHtml).join("")+'</tbody></table></div>'+
      '<button class="add-row-btn" type="button" data-add-shift>+ Add shift</button>'+
    '</section>'+
    '<section class="card">'+
      '<h2>Monthly salary</h2>'+
      '<p class="lede">Full-time or salaried staff. Enter the month’s wage once. It is split across open (non-vacation) days on the P&amp;L.</p>'+
      '<div class="table-wrap purchase-wrap"><table class="salary-table"><thead><tr>'+
        '<th>Name</th><th>Role</th><th>Pay / month</th><th></th>'+
      '</tr></thead><tbody>'+salaries.map(laborSalaryRowHtml).join("")+'</tbody></table></div>'+
      '<button class="add-row-btn" type="button" data-add-salary>+ Add salary</button>'+
    '</section>';
}

function refreshLaborComputedCells(model){
  var host = el("tab-labor");
  if (!host || !model) return;
  var L = model.labor || { shiftMonth:0, salaryMonth:0, monthly:0 };
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
  });
  var st = el("labor-shift-total");
  var sa = el("labor-salary-total");
  var gr = el("labor-grand-total");
  if (st) st.textContent = won(L.shiftMonth);
  if (sa) sa.textContent = won(L.salaryMonth);
  if (gr) gr.textContent = won(L.monthly);
  var hint = el("labor-empty-hint");
  if (hint) hint.hidden = !!L.hasLedger;
}
