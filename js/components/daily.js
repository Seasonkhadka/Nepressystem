/**
 * components/daily.js — Daily Calculation tab: one editable row per day of
 * the selected month, auto-tagged Weekday/Weekend, with a manual Vacation
 * checkbox that overrides the auto tag.
 *
 * Depends on: dom-utils.js (el), format.js, data.js (MONTH_ABBR, DOW_NAMES,
 * TAG_META), state.js (STATE), compute.js (dowOf, computeAll).
 */

function dayRowHtml(day, isWeekendAuto){
  var raw = STATE.days[day] || { vacation:false, sales:0, cogsPct:0, labor:0 };
  var tag = raw.vacation ? "vacation" : (isWeekendAuto ? "weekend" : "weekday");
  var tagMeta = TAG_META[tag];
  return '<tr class="'+tag+'" data-day="'+day+'" data-weekend-auto="'+(isWeekendAuto?"1":"0")+'">'+
    '<td>'+MONTH_ABBR[STATE.month-1]+' '+day+'</td>'+
    '<td>'+DOW_NAMES[dowOf(STATE.year,STATE.month,day)]+'</td>'+
    '<td><label class="vac-toggle"><input type="checkbox" data-field="vacation" '+(raw.vacation?"checked":"")+'><span class="tag '+tag+'" data-tag-badge>'+tagMeta.label+'</span></label></td>'+
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
      '<p class="lede">Enter sales on each day. <b>COGS</b> comes from Raw Materials. <b>Labor</b> and <b>overhead bills</b> come from the Labor tab.</p>'+
      '<div class="legend">'+
        '<span class="item"><span class="dot" style="background:var(--surface);border:1px solid var(--hairline-strong)"></span>Weekday</span>'+
        '<span class="item"><span class="dot" style="background:var(--row-weekend)"></span>Weekend</span>'+
        '<span class="item"><span class="dot" style="background:var(--row-vacation)"></span>Vacation</span>'+
      '</div>'+
      '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Day</th><th>Tag</th><th>Sales</th><th>COGS</th><th>COGS %</th><th>Labor</th><th>Labor %</th><th>Overhead</th><th>Overhead %</th><th>Gross Profit</th><th>Net Profit</th><th>Net Margin</th></tr></thead>'+
      '<tbody id="daily-tbody">'+rows+'</tbody>'+
      '<tfoot><tr><td colspan="3">Month total</td>'+
        '<td class="tnum" data-foot="sales">₩0</td>'+
        '<td class="tnum" data-foot="cogsAmt">₩0</td>'+
        '<td class="tnum" data-foot="cogsPct">0.0%</td>'+
        '<td class="tnum" data-foot="labor">₩0</td>'+
        '<td class="tnum" data-foot="laborPct">0.0%</td>'+
        '<td class="tnum" data-foot="overhead">₩0</td>'+
        '<td class="tnum" data-foot="overheadPct">0.0%</td>'+
        '<td class="tnum" data-foot="grossProfit">₩0</td>'+
        '<td class="tnum" data-foot="netProfit">₩0</td>'+
        '<td class="tnum" data-foot="netMarginPct">0.0%</td></tr></tfoot>'+
      '</table></div>'+
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
    var badge = tr.querySelector('[data-tag-badge]');
    if (badge){ badge.className = "tag "+d.tag; badge.textContent = TAG_META[d.tag].label; }
  });
  var m = model.monthly;
  var foot = function(k, txt){
    var root = el("calc-daily");
    if (!root) return;
    var e = root.querySelector('[data-foot="'+k+'"]');
    if (e) e.textContent = txt;
  };
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
        '<div class="key-item"><div><div class="eyebrow">Labor</div><p class="lede" style="margin:0">Staff pay from the Labor tab — hourly shifts plus monthly salaries.</p></div></div>'+
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
