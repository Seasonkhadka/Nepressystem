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
  var cv = model.cashView || { cashAfterLoans: m.netProfit, leftAfterMonsoon: m.netProfit, monsoonShare: 0, lossCarryCharge: 0 };
  var leftCash = cv.leftAfterMonsoon != null ? cv.leftAfterMonsoon : cv.cashAfterLoans;
  var cashStatus = marginStatus(safeDiv(leftCash, m.sales), hasSales);
  var monsoonSub = (cv.monsoonShare || 0) > 0
    ? "15% of cash after loans"
    : "₩0 while cash after loans ≤ 0";
  var leftSub = (cv.monsoonShare || 0) > 0
    ? "cash after loans − monsoon"
    : "same as cash after loans (no monsoon taken)";
  var lossSub = (cv.isVacationMonth || (cv.lossCarry && cv.lossCarry.skippedVacation))
    ? "vacation month — recovery ₩0"
    : (cv.lossCarryCharge ? "semester catch-up — not monsoon" : "no prior deficit");
  var kpis = [
    kpiTile("Total Sales", won(m.salesGross), (hasSales ? "Less VAT "+signedWon(-m.vat)+" → net "+won(m.sales) : MONTH_NAMES[STATE.month-1]+" "+STATE.year)),
    kpiTile("COGS", won(m.cogsAmt), (hasSales ? pct(m.cogsPct)+" of sales" : "from Raw Materials")),
    kpiTile("Gross Profit", won(m.grossProfit), pct(m.grossMarginPct)+" margin"),
    kpiTile("Labor Cost %", pct(m.laborPct), won(m.labor)+" from Labor tab"),
    kpiTile("Overhead %", pct(m.overheadPct), "fixed + not-fixed bills"),
    kpiTile("Depreciation", won(m.depreciation || 0), "setup ÷ 36 + utensils (not inventory)"),
    kpiTile("Net Profit", signedWon(m.netProfit), pct(m.netMarginPct)+" margin", netStatus),
    kpiTile("Cash after loans", signedWon(cv.cashAfterLoans), "net profit − loan payment"),
    kpiTile("Monsoon share 15%", won(cv.monsoonShare || 0), monsoonSub),
    kpiTile("Left after monsoon", signedWon(leftCash), leftSub, cashStatus),
    kpiTile("Prior-loss recovery", won(cv.lossCarryCharge || 0), lossSub)
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
      '<div class="block"><div class="label">Raw materials this month</div><div class="amt tnum">'+won(model.rawGrand.monthly)+'</div></div>'+
      '<div class="block"><div class="label">P&amp;L COGS</div><div class="amt tnum">'+won(model.monthly.cogsAmt)+'</div></div>'+
      '<div class="block"><div class="label">COGS % of sales</div><div class="amt tnum">'+(model.monthly.sales ? pct(model.monthly.cogsPct) : "—")+'</div></div>'+
    '</div>'+
    '<p class="note">'+(model.rawGrand.monthly
      ? "COGS is this month's Raw Materials (meat, kitchen, outside, drinks, vegetables, no-bill). Days with more sales take a larger share. Add daily sales on P&amp;L to see the %."
      : "Add purchases in Raw Materials — that total becomes P&amp;L COGS for the month.")+'</p>';

  var g = model.assetGrand || { invested:0, monthly:0 };
  var dep = model.depreciation || { monthly:0, setup:0, utensil:0, setupLifeMonths:36 };
  var capitalHtml = "";
  if (g.invested > 0){
    var capRows = (model.assetCats || []).map(function(c){
      var plNote = c.cat === "inventory" ? " — not in P&amp;L" : (c.cat === "setup" || c.cat === "utensil" ? " — in P&amp;L dep." : "");
      return '<tr><td><span class="cat-chip" style="background:'+c.color+'"></span>'+c.label+plNote+'</td>'+
        '<td class="tnum">'+won(c.invested)+'</td>'+
        '<td class="tnum">'+won(c.monthly)+'</td></tr>';
    }).join("");
    capitalHtml =
      '<section class="card">'+
        '<h2>Setup &amp; assets</h2>'+
        '<p class="lede">Long-term money already spent. <b>P&amp;L depreciation</b> uses setup/equipment ÷ '+(dep.setupLifeMonths||36)+
          ' months + utensils ÷ life. <b>Inventory is not depreciated</b> in P&amp;L (capital only).</p>'+
        '<div class="kpi-grid">'+
          kpiTile("Total invested", won(g.invested), "inventory, setup, utensils")+
          kpiTile("P&amp;L depreciation / mo", won(dep.monthly||0), "setup "+won(dep.setup||0)+" + utensils "+won(dep.utensil||0))+
          kpiTile("Memo spread (item lives)", won(g.monthly), "reference only — may differ from P&amp;L")+
        '</div>'+
        '<div class="table-wrap"><table class="asset-summary"><thead><tr><th>Category</th><th>Invested</th><th>Memo ₩ / month</th></tr></thead><tbody>'+capRows+'</tbody></table></div>'+
      '</section>';
  }

  el("tab-dashboard").innerHTML =
    '<section class="card"><h2>Month at a glance</h2><p class="lede">'+MONTH_NAMES[STATE.month-1]+" "+STATE.year+' — computed live from what you\'ve entered so far. Overhead is rent and fees, not staff pay. Wages go on the Labor tab.</p><div class="kpi-grid">'+kpis+'</div>'+cashRulesGuideHtml(cv)+'</section>'+
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
    '<section class="card"><h2>COGS from raw materials</h2><p class="lede">Purchases you log this month are the cost of goods sold. You no longer type a COGS % on each day.</p>'+crossCheckHtml+'</section>'+
    profitAllocationHtml(model.profitAllocation)+
    capitalHtml;
}
