/**
 * components/dashboard.js — Main Dashboard tab: KPI tiles, traffic-comparison
 * charts, and the raw-material cross-check.
 *
 * Depends on: dom-utils.js (el), format.js, charts.js, data.js (MONTH_NAMES),
 * state.js (STATE).
 */

function kpiTile(eyebrow, value, sub, status){
  var statusHtml = status ? '<div class="status"><span class="status-dot" style="background:'+status.color+'"></span>'+status.label+'</div>' : "";
  return '<div class="kpi"><div class="eyebrow">'+eyebrow+'</div><div class="value tnum">'+value+'</div><div class="sub tnum">'+sub+'</div>'+statusHtml+'</div>';
}

function renderDashboard(model){
  var m = model.monthly;
  var hasSales = m.sales > 0;
  var netStatus = marginStatus(m.netMarginPct, hasSales);
  var kpis = [
    kpiTile("Total Sales", won(m.sales), MONTH_NAMES[STATE.month-1]+" "+STATE.year),
    kpiTile("COGS", won(m.cogsAmt), pct(m.cogsPct)+" of sales"),
    kpiTile("Gross Profit", won(m.grossProfit), pct(m.grossMarginPct)+" margin"),
    kpiTile("Labor Cost %", pct(m.laborPct), won(m.labor)+" total"),
    kpiTile("Overhead %", pct(m.overheadPct), won(m.overhead)+" total"),
    kpiTile("Net Profit", signedWon(m.netProfit), pct(m.netMarginPct)+" margin", netStatus)
  ].join("");

  var salesChart = axisWonChart(model.tagGroups.map(function(t){ return {label:t.label, value:t.avgSales, color:t.color}; }), {aria:"Average daily sales by traffic type", step:500000});

  var pctGroups = [
    { label:"COGS %", values: model.tagGroups.map(function(t){ return t.cogsPct; }) },
    { label:"Labor %", values: model.tagGroups.map(function(t){ return t.laborPct; }) },
    { label:"Overhead %", values: model.tagGroups.map(function(t){ return t.overheadPct; }) },
    { label:"Net Margin %", values: model.tagGroups.map(function(t){ return t.netMarginPct; }) }
  ];
  var series = model.tagGroups.map(function(t){ return {label:t.label, color:t.color}; });
  var pctChart = groupedPctChart(pctGroups, series, {aria:"Cost ratios and net margin by traffic type", step:0.1});

  var trend = trendChart(model.daily);

  var trafficRows = model.tagGroups.map(function(t){
    return '<tr><td><span class="tag" style="background:'+t.color+';color:#fff">'+t.label+'</span></td>'+
      '<td class="tnum">'+t.count+'</td>'+
      '<td class="tnum">'+won(t.avgSales)+'</td>'+
      '<td class="tnum">'+won(t.sales)+'</td>'+
      '<td class="tnum">'+pct(t.cogsPct)+'</td>'+
      '<td class="tnum">'+pct(t.laborPct)+'</td>'+
      '<td class="tnum">'+pct(t.overheadPct)+'</td>'+
      '<td class="tnum" style="font-weight:700;color:'+(t.count && t.netMarginPct<0?"var(--critical)":"var(--good)")+'">'+(t.count ? signedPct(t.netMarginPct) : "—")+'</td></tr>';
  }).join("");

  var crossCheckHtml =
    '<div class="crosscheck">'+
      '<div class="block"><div class="label">Raw-material baseline (monthly)</div><div class="amt tnum">'+won(model.crosscheck.baseline)+'</div></div>'+
      '<div class="block"><div class="label">Actual COGS from Daily Calc.</div><div class="amt tnum">'+won(model.crosscheck.actual)+'</div></div>'+
      '<div class="block"><div class="label">Variance</div><div class="amt tnum" style="color:var(--ember)">'+signedWon(model.crosscheck.variance)+' ('+(model.crosscheck.baseline ? signedPct(model.crosscheck.variancePct) : "—")+')</div></div>'+
    '</div>'+
    '<p class="note">'+(model.crosscheck.baseline ? ("Actual COGS runs "+pct(Math.abs(model.crosscheck.variancePct))+" "+(model.crosscheck.variance>=0?"above":"below")+" the itemized baseline.") : "Add ingredients in Raw Materials and daily sales in Daily Calculation to see this compare.")+' See Instructions for the full explanation.</p>';

  el("tab-dashboard").innerHTML =
    '<section class="card"><h2>Month at a glance</h2><p class="lede">'+MONTH_NAMES[STATE.month-1]+" "+STATE.year+' — computed live from what you\'ve entered so far.</p><div class="kpi-grid">'+kpis+'</div></section>'+
    '<section class="card grid-2">'+
      '<div><h2 style="font-size:16px">Average daily sales by traffic type</h2>'+salesChart+'</div>'+
      '<div><h2 style="font-size:16px">Cost ratios &amp; net margin by traffic type</h2>'+pctChart+'</div>'+
    '</section>'+
    '<section class="card">'+
      '<h2>Weekday vs. weekend vs. vacation — traffic comparison</h2>'+
      '<div class="table-wrap"><table><thead><tr><th>Type</th><th>Days</th><th>Avg. Daily Sales</th><th>Total Sales</th><th>COGS %</th><th>Labor %</th><th>Overhead %</th><th>Net Margin</th></tr></thead><tbody>'+trafficRows+'</tbody></table></div>'+
    '</section>'+
    '<section class="card">'+
      '<h2>Daily sales trend</h2>'+
      '<div class="legend">'+
        '<span class="item"><span class="dot" style="background:var(--chart-1)"></span>Weekday</span>'+
        '<span class="item"><span class="dot" style="background:var(--chart-2)"></span>Weekend</span>'+
        '<span class="item"><span class="dot" style="background:var(--chart-3)"></span>Vacation</span>'+
      '</div>'+
      trend+
    '</section>'+
    '<section class="card"><h2>Raw-material cross-check</h2><p class="lede">Bottom-up ingredient baseline vs. top-down actual COGS.</p>'+crossCheckHtml+'</section>';
}
