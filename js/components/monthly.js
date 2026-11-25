/**
 * components/monthly.js — Monthly Calculation tab: the consolidated month
 * that feeds the Main Dashboard, with tie-out checks against Daily/Weekly.
 *
 * Depends on: dom-utils.js (el), format.js, copy.js, data.js (MONTH_NAMES),
 * state.js (STATE).
 */

function renderMonthlyTab(model){
  var m = model.monthly;
  var t = model.tieOut;
  var host = el("calc-monthly");
  if (!host) return;
  host.innerHTML =
    '<section class="card">'+
      '<h2>Monthly — '+MONTH_NAMES[STATE.month-1]+" "+STATE.year+'</h2>'+
      '<p class="lede">The consolidated month. Every figure on the Dashboard comes from here.</p>'+
      '<div class="formula-list">'+
        formulaRow("Total sales (POS, incl. VAT)", m.salesGross)+
        formulaRow("− "+labelTip("vat"), m.vat, { less: true })+
        formulaRow(LABEL.netSales, m.sales)+
        formulaRow("− "+labelTip("cogs"), m.cogsAmt, { less: true, note: pct(m.cogsPct)+" of net sales" })+
        formulaRow(LABEL.grossProfit, m.grossProfit, { signed: true, note: pct(m.grossMarginPct)+" margin" })+
        formulaRow("− "+LABEL.labor, m.labor, { less: true, note: pct(m.laborPct) })+
        formulaRow("− "+LABEL.overhead, m.overhead, { less: true, note: pct(m.overheadPct) })+
        formulaRow("− "+labelTip("depreciation"), m.depreciation, { less: true, note: pct(m.depreciationPct) })+
        formulaRow(LABEL.netProfit, m.netProfit, { signed: true, big: true, note: pct(m.netMarginPct)+" margin" })+
      '</div>'+
      breakEvenHtml(model.breakEven)+
      '<h3 class="labor-subhead">Where the money goes (top to bottom)</h3>'+
      cashStepsHtml(model.cashView)+
      '<div class="tie-out"><span class="check">'+(t.daysOk?"✓":"!")+'</span> Matches sum of daily rows ('+won(t.sumOfDays)+').</div>'+
      '<div class="tie-out"><span class="check">'+(t.weeksOk?"✓":"!")+'</span> Matches sum of weekly rows ('+won(t.sumOfWeeks)+').</div>'+
    '</section>';
}
