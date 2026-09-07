/**
 * components/instructions.js — static "how this works" tab.
 * Depends on: dom-utils.js (el).
 */

function renderInstructions(){
  el("tab-instructions").innerHTML =
  '<section class="card">'+
    '<h2>How this workbook is put together</h2>'+
    '<p class="lede">Six tabs, one flow. You enter numbers in two places — Raw Materials and Daily Calculation — everything else (Weekly, Monthly, the Dashboard) calculates itself.</p>'+
    '<div class="flow">'+
      '<span class="step">Raw Materials</span><span class="arrow">→</span>'+
      '<span class="step">Daily Calculation</span><span class="arrow">→</span>'+
      '<span class="step">Weekly Calculation</span><span class="arrow">→</span>'+
      '<span class="step">Monthly Calculation</span><span class="arrow">→</span>'+
      '<span class="step">Main Dashboard</span>'+
    '</div>'+
    '<ol class="steps">'+
      '<li>Set the <b>month, year, and overhead</b> in the bar above the tabs once — the daily calendar and every overhead figure depend on it.</li>'+
      '<li><b>Raw Materials</b>: add each ingredient with roughly how much you spent and how often you buy it — every day, every week, every month, or any custom interval like <b>every 2 days</b> or <b>every 3 weeks</b>. Bought it as a one-off you won\'t need again? Choose <b>One-time</b> instead — it counts only for the month you added it, then automatically drops out on its own once the month changes. No receipt yet? Just estimate — you can correct it later. Rolls up to a daily/weekly/monthly baseline automatically.</li>'+
      '<li><b>Daily Calculation</b>: one row per day of the month, generated for you. Enter Sales, COGS %, and Labor for each day you trade.</li>'+
      '<li><b>Weekly</b> and <b>Monthly Calculation</b> sum the daily rows for you — nothing to re-enter, and each tab shows a tie-out check against the level below it.</li>'+
      '<li><b>Main Dashboard</b> reads straight from the monthly totals: sales, COGS, gross &amp; net profit, labor and overhead ratios, the traffic comparison, and the raw-material cross-check.</li>'+
    '</ol>'+
  '</section>'+

  '<section class="card">'+
    '<h2>Color key — how the weekday / weekend / vacation pattern is handled</h2>'+
    '<p class="lede">Weekday and Weekend are detected automatically from the calendar date. Vacation is the one tag you set yourself, with the checkbox on each row in Daily Calculation — for public holidays, planned closures, or anything else that isn\'t a normal trading day.</p>'+
    '<div class="key-grid">'+
      '<div class="key-item"><span class="swatch weekday"></span><div><h4>Weekday <span class="tag weekday" style="margin-left:4px">Mon–Fri</span></h4><p>No shading — the default for any date that\'s a Monday through Friday and isn\'t checked as Vacation.</p></div></div>'+
      '<div class="key-item"><span class="swatch weekend"></span><div><h4>Weekend <span class="tag weekend" style="margin-left:4px">Sat–Sun</span></h4><p>Shaded <b>light orange</b>, automatically, for every Saturday and Sunday in the month.</p></div></div>'+
      '<div class="key-item"><span class="swatch vacation"></span><div><h4>Vacation <span class="tag vacation" style="margin-left:4px">manual</span></h4><p>Shaded a <b>darker amber</b> — check the box on that day\'s row in Daily Calculation. It overrides Weekday or Weekend shading for that date, even if it also happens to fall on a Saturday.</p></div></div>'+
    '</div>'+
    '<p class="note">Rule of precedence: a date is <b>Vacation</b> first if you\'ve checked its box, otherwise <b>Weekend</b> if it\'s a Saturday or Sunday, otherwise <b>Weekday</b>. That single rule drives the shading on the Daily tab, the grouping on the Weekly tab, and the three-way comparison on the Dashboard.</p>'+
  '</section>'+

  '<section class="card">'+
    '<h2>Every formula on this dashboard</h2>'+
    '<dl class="formula-list">'+
      '<div class="formula"><dt>Total Sales</dt><dd>Sum of daily <code>Sales</code> for the period.</dd></div>'+
      '<div class="formula"><dt>COGS amount</dt><dd><code>Sales × COGS%</code>, summed across days.</dd></div>'+
      '<div class="formula"><dt>COGS %</dt><dd><code>COGS ÷ Sales</code>, recomputed from the summed ₩ amounts — never averaged day-to-day, so the ratio stays accurate when volume swings.</dd></div>'+
      '<div class="formula"><dt>Gross Profit / Margin</dt><dd><code>Sales − COGS</code> and <code>Gross Profit ÷ Sales</code>.</dd></div>'+
      '<div class="formula"><dt>Labor cost %</dt><dd><code>Labor ÷ Sales</code>. If your labor cost is fairly fixed per shift, this ratio will naturally fall on high-volume days and spike on slow ones.</dd></div>'+
      '<div class="formula"><dt>Overhead %</dt><dd><code>Overhead ÷ Sales</code>, where Overhead = your Fixed Overhead ÷ days in the month, <em>plus</em> your Variable Overhead % of that day\'s sales. Fixed overhead (rent, insurance, admin) doesn\'t pause on a closed or slow day — that\'s what can turn a quiet day into a loss.</dd></div>'+
      '<div class="formula"><dt>Net Profit / Margin</dt><dd><code>Gross Profit − Labor − Overhead</code> and <code>Net Profit ÷ Sales</code>.</dd></div>'+
      '<div class="formula"><dt>Traffic comparison</dt><dd>The month\'s days are grouped by tag (Weekday / Weekend / Vacation) and every ratio above is recomputed within each group.</dd></div>'+
      '<div class="formula"><dt>Raw-material cross-check</dt><dd>The Raw Materials monthly baseline (bottom-up, itemized) is compared against the actual COGS from Daily Calculation (top-down, from sales). See below.</dd></div>'+
    '</dl>'+
  '</section>'+

  '<section class="card">'+
    '<h2>Reading the raw-material cross-check</h2>'+
    '<p class="lede">These two numbers are not meant to match exactly — the gap is diagnostic, not an error.</p>'+
    '<p class="note callout"><b>Why they differ:</b> the Raw Materials list is your own estimate of regular spending — especially before you have receipts to work from. It excludes staff meals, garnish, spice top-ups, and prep waste, and it doesn\'t scale itself up for a busy weekend or down for a closure. Actual COGS (from Daily Calculation) does all of that automatically because it\'s driven by real sales and a real COGS% each day. Once you start collecting bills, come back and tighten up the Amount Spent figures — the cross-check gap should shrink as your estimates get more accurate.</p>'+
  '</section>'+

  '<section class="card">'+
    '<h2>Your data</h2>'+
    '<p class="note">Everything you type is saved on this device as you go. Click <b>Sign in with Google</b> in the header to keep the same numbers on every phone and laptop — only you can see your copy. Without signing in, nothing leaves this browser. Use <b>Clear all data</b> in the bar above the tabs to wipe it and start over.</p>'+
  '</section>';
}
