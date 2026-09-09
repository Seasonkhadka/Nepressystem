/**
 * components/monthly.js — Monthly Calculation tab: the consolidated month
 * that feeds the Main Dashboard, with tie-out checks against Daily/Weekly.
 *
 * Depends on: dom-utils.js (el), format.js, data.js (MONTH_NAMES),
 * state.js (STATE).
 */

function renderMonthlyTab(model){
  var m = model.monthly;
  var sumOfDays = model.daily.reduce(function(a,d){ return a+d.sales; }, 0);
  var sumOfWeeks = model.weekly.reduce(function(a,w){ return a+w.sales; }, 0);
  var tie1 = Math.round(sumOfDays) === Math.round(m.sales);
  var tie2 = Math.round(sumOfWeeks) === Math.round(m.sales);

  function row(label, val, isPct, big){
    return '<div class="formula" style="'+(big?"background:var(--accent-soft)":"")+'"><dt>'+label+'</dt><dd class="tnum" style="font-size:'+(big?"16px":"13px")+';color:var(--ink)">'+(isPct?pct(val):won(val))+'</dd></div>';
  }

  var host = el("calc-monthly");
  if (!host) return;
  host.innerHTML =
    '<section class="card">'+
      '<h2>Monthly — '+MONTH_NAMES[STATE.month-1]+" "+STATE.year+'</h2>'+
      '<p class="lede">The single consolidated month, summed from the weeks above. COGS is this month\'s Raw Materials total. These figures power the Main Dashboard.</p>'+
      '<div class="formula-list">'+
        row("Total Sales", m.sales)+
        row("COGS amount", m.cogsAmt)+
        row("COGS %", m.cogsPct, true)+
        row("Gross Profit", m.grossProfit)+
        row("Gross Margin %", m.grossMarginPct, true)+
        row("Labor Cost", m.labor)+
        row("Labor Cost %", m.laborPct, true)+
        row("Overhead", m.overhead)+
        row("Overhead %", m.overheadPct, true)+
        row("Net Profit", m.netProfit, false, true)+
        row("Net Margin %", m.netMarginPct, true, true)+
      '</div>'+
      '<div class="tie-out"><span class="check">'+(tie1?"✓":"!")+'</span> Matches sum of daily rows ('+won(sumOfDays)+').</div>'+
      '<div class="tie-out"><span class="check">'+(tie2?"✓":"!")+'</span> Matches sum of weekly rows ('+won(sumOfWeeks)+').</div>'+
      '<p class="note">→ These 11 figures feed the Main Dashboard tiles and charts directly — nothing on that tab is entered separately.</p>'+
    '</section>';
}
