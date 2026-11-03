/**
 * components/daily.js — Daily Calculation tab: one editable row per day of
 * the selected month, auto-tagged Weekday/Weekend, with a manual Vacation
 * checkbox that overrides the auto tag.
 *
 * Depends on: dom-utils.js (el), format.js, data.js (MONTH_ABBR, DOW_NAMES,
 * TAG_META), state.js (STATE), compute.js (dowOf, computeAll).
 */

/** Auto Korean uni breaks: edit dates per year here; daily rows follow unless overridden. */
function vacationScheduleHtml(){
  var sch = migrateVacationSchedule(STATE.vacationSchedule);
  var uni = sch.mode === "uni-kr";
  var map = STATE.vacationYearDates || {};
  var vy = STATE.year, vm = STATE.month;
  var sum = uniVacationSummaryForView(vy, vm, sch, map);
  var rates = uni ? uniVacationProfitRates(sch, vy, vm, map) : null;
  var accrual = rates
    ? rates.vacationMonths.toFixed(1)+"÷"+rates.semesterAccrualMonths.toFixed(1)+" mo"
    : "";
  var w = sum.w, s = sum.s;
  return '<div class="vac-bar">'+
    '<div class="vac-bar-top">'+
      '<span class="eyebrow" style="margin:0">Auto vacation (university breaks)</span>'+
      '<select class="field-input vac-mode" id="input-vac-mode" title="Break schedule">'+
        '<option value="uni-kr"'+(uni?" selected":"")+'>Korean uni · dates per year</option>'+
        '<option value="manual"'+(uni?"":" selected")+'>Off · manual tags only</option>'+
      '</select>'+
    '</div>'+
    '<div class="vac-bar-sem"'+(uni?"":" hidden")+' id="vac-sem-panel">'+
      '<div class="vac-date-grid">'+
        '<div class="vac-date-block">'+
          '<span class="eyebrow">Winter · year '+sum.winterKey+'</span>'+
          '<span>Dec</span>'+
          '<input class="field-input vac-day" type="number" min="1" max="31" step="1" data-vac-year="'+sum.winterKey+'" data-vac-field="winterStartD" value="'+w.winterStartD+'" aria-label="Winter break start day in December">'+
          '<span>– Feb</span>'+
          '<input class="field-input vac-day" type="number" min="1" max="29" step="1" data-vac-year="'+sum.winterKey+'" data-vac-field="winterEndD" value="'+w.winterEndD+'" aria-label="Winter break end day in February">'+
          '<span class="vac-yr-note">'+(sum.winterKey+1)+'</span>'+
        '</div>'+
        '<div class="vac-date-block">'+
          '<span class="eyebrow">Summer · year '+sum.summerKey+'</span>'+
          '<span>Jun</span>'+
          '<input class="field-input vac-day" type="number" min="1" max="30" step="1" data-vac-year="'+sum.summerKey+'" data-vac-field="summerStartD" value="'+s.summerStartD+'" aria-label="Summer break start day in June">'+
          '<span>– Aug</span>'+
          '<input class="field-input vac-day" type="number" min="1" max="31" step="1" data-vac-year="'+sum.summerKey+'" data-vac-field="summerEndD" value="'+s.summerEndD+'" aria-label="Summer break end day in August">'+
        '</div>'+
      '</div>'+
      '<span class="vac-bar-meta">Change <b>Month / Year</b> at the top to edit another year’s dates. Rows turn vacation automatically; pick <b>Weekday</b> or <b>Weekend</b> on a break day to open. Accrual this month: '+accrual+'.</span>'+
    '</div>'+
  '</div>';
}

function dayTagCellHtml(raw, day, isWeekendAuto){
  var y = STATE.year, m = STATE.month;
  var val = dayTagDropdownValue(raw, y, m, day, STATE.vacationSchedule);
  var normVal = isWeekendAuto ? "weekend" : "weekday";
  var normLabel = isWeekendAuto ? "Weekend" : "Weekday";
  var calSel = val === "weekday" || val === "weekend";
  return '<select class="cell-input day-tag-select" data-field="dayTag" aria-label="Day tag">'+
    '<option value="'+normVal+'"'+(calSel?" selected":"")+'>'+normLabel+'</option>'+
    '<option value="vacation"'+(val==="vacation"?" selected":"")+'>Vacation</option>'+
    '<option value="closed"'+(val==="closed"?" selected":"")+'>Closed</option>'+
  '</select>';
}

function dayRowHtml(day, isWeekendAuto){
  var raw = STATE.days[day] || { vacation:false, closed:false, sales:0, cogsPct:0, labor:0 };
  var onBreak = dayVacationFlag(raw, STATE.year, STATE.month, day, STATE.vacationSchedule);
  var closed = !!raw.closed;
  var tag = onBreak ? "vacation" : (closed ? "closed" : (isWeekendAuto ? "weekend" : "weekday"));
  return '<tr class="'+tag+'" data-day="'+day+'" data-weekend-auto="'+(isWeekendAuto?"1":"0")+'">'+
    '<td>'+MONTH_ABBR[STATE.month-1]+' '+day+'</td>'+
    '<td>'+DOW_NAMES[dowOf(STATE.year,STATE.month,day)]+'</td>'+
    '<td>'+dayTagCellHtml(raw, day, isWeekendAuto)+'</td>'+
    '<td><input class="cell-input" type="number" min="0" step="1000" data-field="sales" placeholder="0" value="'+(raw.sales?raw.sales:"")+'"></td>'+
    '<td class="tnum calc" data-calc="cogsAmt">₩0</td>'+
    '<td class="tnum calc" data-calc="cogsPct">0.0%</td>'+
    '<td class="tnum calc" data-calc="labor">₩0</td>'+
    '<td class="tnum calc" data-calc="laborPct">0.0%</td>'+
    '<td class="tnum calc" data-calc="overhead">₩0</td>'+
    '<td class="tnum calc" data-calc="overheadPct">0.0%</td>'+
    '<td class="tnum calc" data-calc="grossProfit">₩0</td>'+
    '<td class="tnum calc" data-calc="netProfit">₩0</td>'+
    '<td class="tnum calc" data-calc="netMarginPct">0.0%</td>'+
  '</tr>';
}

function renderDailyTab(){
  var n = daysInMonth(STATE.year, STATE.month);
  var dayNums = [];
  for (var d=1; d<=n; d++) dayNums.push(d);
  var rows = dayNums.map(function(day){
    var isWeekendAuto = [0,6].indexOf(dowOf(STATE.year,STATE.month,day)) > -1;
    return dayRowHtml(day, isWeekendAuto);
  }).join("");

  var host = el("calc-daily");
  if (!host) return;
  host.innerHTML =
    '<section class="card">'+
      '<h2>Daily — '+MONTH_NAMES[STATE.month-1]+" "+STATE.year+' ('+dayNums.length+' days)</h2>'+
      '<p class="lede">Enter <b>POS sales</b> (VAT included) on each day. P&amp;L uses net sales after '+pct(SALES_VAT_RATE, 1)+' VAT. <b>COGS</b> comes from Raw Materials. <b>Labor</b> and <b>overhead bills</b> come from the Labor tab.</p>'+
      vacationScheduleHtml()+
      '<div class="legend">'+
        '<span class="item"><span class="dot" style="background:var(--surface);border:1px solid var(--hairline-strong)"></span>Weekday</span>'+
        '<span class="item"><span class="dot" style="background:var(--row-weekend)"></span>Weekend</span>'+
        '<span class="item"><span class="dot" style="background:var(--row-vacation)"></span>Vacation</span>'+
        '<span class="item"><span class="dot" style="background:var(--row-closed)"></span>Closed</span>'+
      '</div>'+
      '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Day</th><th>Tag</th><th>Sales (POS)</th><th>COGS</th><th>COGS %</th><th>Labor</th><th>Labor %</th><th>Overhead</th><th>Overhead %</th><th>Gross Profit</th><th>Net Profit</th><th>Net Margin</th></tr></thead>'+
      '<tbody id="daily-tbody">'+rows+'</tbody>'+
      '<tfoot><tr><td colspan="3">Month total (POS)</td>'+
        '<td class="tnum" data-foot="salesGross">₩0</td>'+
        '<td class="tnum" data-foot="cogsAmt">₩0</td>'+
        '<td class="tnum" data-foot="cogsPct">0.0%</td>'+
        '<td class="tnum" data-foot="labor">₩0</td>'+
        '<td class="tnum" data-foot="laborPct">0.0%</td>'+
        '<td class="tnum" data-foot="overhead">₩0</td>'+
        '<td class="tnum" data-foot="overheadPct">0.0%</td>'+
        '<td class="tnum" data-foot="grossProfit">₩0</td>'+
        '<td class="tnum" data-foot="netProfit">₩0</td>'+
        '<td class="tnum" data-foot="netMarginPct">0.0%</td></tr>'+
      '<tr class="vat-foot"><td colspan="3">Net after VAT ('+pct(SALES_VAT_RATE, 1)+')</td>'+
        '<td class="tnum" data-foot="sales">₩0</td>'+
        '<td colspan="9"></td></tr></tfoot>'+
      '</table></div>'+
      '<div id="daily-break-even"></div>'+
      '<p class="note">Each row lists <b>Weekday</b> or <b>Weekend</b> (from the date), plus <b>Vacation</b> and <b>Closed</b>. Uni breaks auto-select Vacation unless you pick Weekday/Weekend (panel above).</p>'+
    '</section>';
  refreshDailyComputedCells(computeAll());
}

function refreshDailyComputedCells(model){
  var root = el("calc-daily");
  if (!root) return;
  model.daily.forEach(function(d){
    var tr = root.querySelector('tr[data-day="'+d.day+'"]');
    if (!tr) return;
    tr.className = d.tag;
    tr.querySelector('[data-calc="cogsAmt"]').textContent = won(d.cogsAmt);
    tr.querySelector('[data-calc="cogsPct"]').textContent = d.sales ? pct(d.cogsPct) : "—";
    tr.querySelector('[data-calc="labor"]').textContent = won(d.labor);
    tr.querySelector('[data-calc="laborPct"]').textContent = pct(d.laborPct);
    tr.querySelector('[data-calc="overhead"]').textContent = won(d.overhead);
    tr.querySelector('[data-calc="overheadPct"]').textContent = pct(d.overheadPct);
    tr.querySelector('[data-calc="grossProfit"]').textContent = won(d.grossProfit);
    var np = tr.querySelector('[data-calc="netProfit"]');
    np.textContent = signedWon(d.netProfit);
    np.style.color = d.netProfit<0 ? "var(--critical)" : "inherit";
    np.style.fontWeight = "700";
    tr.querySelector('[data-calc="netMarginPct"]').textContent = signedPct(d.netMarginPct);
    var raw = STATE.days[d.day] || {};
    var sel = tr.querySelector('[data-field="dayTag"]');
    if (sel && document.activeElement !== sel){
      var v = dayTagDropdownValue(raw, STATE.year, STATE.month, d.day, STATE.vacationSchedule);
      if (sel.value !== v) sel.value = v;
    }
  });
  var m = model.monthly;
  var foot = function(k, txt){
    var root = el("calc-daily");
    if (!root) return;
    var e = root.querySelector('[data-foot="'+k+'"]');
    if (e) e.textContent = txt;
  };
  foot("salesGross", won(m.salesGross));
  foot("sales", won(m.sales));
  foot("cogsPct", pct(m.cogsPct));
  foot("cogsAmt", won(m.cogsAmt));
  foot("labor", won(m.labor));
  foot("laborPct", pct(m.laborPct));
  foot("overhead", won(m.overhead));
  foot("overheadPct", pct(m.overheadPct));
  foot("grossProfit", won(m.grossProfit));
  foot("netProfit", won(m.netProfit));
  foot("netMarginPct", pct(m.netMarginPct));
  var beHost = root.querySelector("#daily-break-even");
  if (beHost) beHost.innerHTML = breakEvenHtml(model.breakEven);
}

function renderCalculationsTab(){
  var host = el("tab-calc");
  if (!host) return;
  host.innerHTML =
    '<section class="card">'+
      '<h2>Profit &amp; loss</h2>'+
      '<p class="lede">Daily, weekly, and monthly views for '+MONTH_NAMES[STATE.month-1]+' '+STATE.year+' on one page. Enter sales on the daily rows. COGS, labor, and overhead fill in from Raw Materials and the Labor tab.</p>'+
      '<div class="key-grid">'+
        '<div class="key-item"><div><div class="eyebrow">COGS</div><p class="lede" style="margin:0">Food you bought this month (Raw Materials). Not rent, not wages.</p></div></div>'+
        '<div class="key-item"><div><div class="eyebrow">Labor</div><p class="lede" style="margin:0">Staff pay from the Labor tab — part-time totals spread by month plus salaried staff.</p></div></div>'+
        '<div class="key-item"><div><div class="eyebrow">Overhead</div><p class="lede" style="margin:0">Fixed (rent) plus not-fixed bills (electricity, water) on the Labor tab. Wages and food are not overhead.</p></div></div>'+
      '</div>'+
      '<nav class="calc-jump" aria-label="Jump to P&amp;L section">'+
        '<a href="#calc-daily">Daily</a>'+
        '<a href="#calc-weekly">Weekly</a>'+
        '<a href="#calc-monthly">Monthly</a>'+
      '</nav>'+
    '</section>'+
    '<div id="calc-daily"></div>'+
    '<div id="calc-weekly"></div>'+
    '<div id="calc-monthly"></div>';
  renderDailyTab();
}
