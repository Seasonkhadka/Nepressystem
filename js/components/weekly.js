/**
 * components/weekly.js — Weekly Calculation tab: read-only, auto-totaled
 * from the Daily Calculation data.
 *
 * Depends on: dom-utils.js (el), format.js.
 */

function renderWeeklyTab(model){
  var rows = model.weekly.map(function(w){
    return '<tr><td>'+w.label+'</td><td>'+w.range+'</td>'+
      '<td class="tnum">'+w.weekdayCount+' / '+w.weekendCount+' / '+w.vacationCount+'</td>'+
      '<td class="tnum">'+won(w.sales)+'</td>'+
      '<td class="tnum">'+pct(w.cogsPct)+'</td>'+
      '<td class="tnum">'+won(w.cogsAmt)+'</td>'+
      '<td class="tnum">'+won(w.labor)+'</td>'+
      '<td class="tnum">'+pct(w.laborPct)+'</td>'+
      '<td class="tnum">'+won(w.overhead)+'</td>'+
      '<td class="tnum">'+pct(w.overheadPct)+'</td>'+
      '<td class="tnum">'+won(w.grossProfit)+'</td>'+
      '<td class="tnum" style="font-weight:700">'+signedWon(w.netProfit)+'</td>'+
      '<td class="tnum">'+(w.count ? signedPct(w.netMarginPct) : "—")+'</td></tr>';
  }).join("");

  var m = model.monthly;
  var sumOfWeeks = model.weekly.reduce(function(a,w){ return a+w.sales; }, 0);
  var tie = Math.round(sumOfWeeks) === Math.round(m.sales);

  var host = el("calc-weekly");
  if (!host) return;
  host.innerHTML =
    '<section class="card">'+
      '<h2>Weekly — '+model.weekly.length+' weeks</h2>'+
      '<p class="lede">Auto-totaled from the daily rows above. Weeks run Monday–Sunday, with a shorter week at the start or end of the month where the calendar doesn\'t divide evenly.</p>'+
      '<div class="table-wrap"><table><thead><tr><th>Week</th><th>Dates</th><th>Wkday/Wknd/Vac.</th><th>Sales</th><th>COGS %</th><th>COGS</th><th>Labor</th><th>Labor %</th><th>Overhead</th><th>Overhead %</th><th>Gross Profit</th><th>Net Profit</th><th>Net Margin</th></tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
      '<tfoot><tr><td colspan="3">Month total</td>'+
        '<td class="tnum">'+won(m.sales)+'</td>'+
        '<td class="tnum">'+pct(m.cogsPct)+'</td>'+
        '<td class="tnum">'+won(m.cogsAmt)+'</td>'+
        '<td class="tnum">'+won(m.labor)+'</td>'+
        '<td class="tnum">'+pct(m.laborPct)+'</td>'+
        '<td class="tnum">'+won(m.overhead)+'</td>'+
        '<td class="tnum">'+pct(m.overheadPct)+'</td>'+
        '<td class="tnum">'+won(m.grossProfit)+'</td>'+
        '<td class="tnum">'+won(m.netProfit)+'</td>'+
        '<td class="tnum">'+pct(m.netMarginPct)+'</td></tr></tfoot>'+
      '</table></div>'+
      '<div class="tie-out"><span class="check">'+(tie?"✓":"!")+'</span> Sum of weekly totals = '+won(sumOfWeeks)+' — ties out to the daily total.</div>'+
    '</section>';
}
