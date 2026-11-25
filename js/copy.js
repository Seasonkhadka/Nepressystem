/**
 * copy.js — the ONE place for labels and explanation text.
 * One name per concept; numbers come from data.js constants, never typed here.
 *
 * Long explanations are shown once:
 *   - depreciationExplainHtml()  → Setup & Assets tab
 *   - cashGuideHtml()            → Dashboard cash card ("How to read the minus")
 * Everywhere else: short label + infoTip(key).
 *
 * Depends on: data.js (constants), format.js (pct).
 */

var LABEL = {
  vat: "VAT",
  netSales: "Net sales",
  cogs: "COGS",
  grossProfit: "Gross profit",
  labor: "Labor",
  overhead: "Overhead",
  depreciation: "Depreciation",
  loanInterest: "Loan interest",
  loanPrincipal: "Loan principal",
  netProfit: "Net profit",
  cashAfterLoans: "Cash after loans",
  monsoon: "Monsoon reserve",
  leftAfterMonsoon: "Left after monsoon",
  recovery: "Prior-loss recovery",
  afterRecoveryPlan: "After recovery plan",
  vatSetAside: "VAT to set aside (already excluded from profit)",
  breakEven: "Break-even"
};

function monthsText(n){ return (Math.round(n * 10) / 10) + " month" + (n === 1 ? "" : "s"); }

/** Short tooltip text (ⓘ). Functions so they always read the live constants. */
var TIP = {
  vat: function(){ return "POS sales include VAT. VAT = " + pct(VAT_RATE, 2) + " of POS sales (10/110). Net sales = POS − VAT."; },
  cogs: function(){ return "This month's Raw Materials purchases, spread over days by sales."; },
  depreciation: function(){ return "Non-cash cost: setup ÷ " + SETUP_LIFE_MONTHS + " months + utensils ÷ their life, from the opening month. Inventory is not depreciated. Details on Setup & Assets."; },
  loanInterest: function(){ return "Interest part of this month's loan payments (each loan's schedule from its start month). A P&L expense."; },
  loanPrincipal: function(){ return "Principal part of this month's loan payments. Cash out, not an expense."; },
  cashAfterLoans: function(){ return "Net profit + depreciation (non-cash) − loan principal."; },
  monsoon: function(){ return pct(MONSOON_RATE, 0) + " of cash after loans when it is positive; ₩0 otherwise."; },
  recovery: function(){ return "Carried cash loss from months after opening (" + OPENING_DATE.slice(0, 7) + ") ÷ " + monthsText(RECOVERY_MONTHS) + ". ₩0 in the opening month, before opening, and in vacation months. Empty months with no sales/costs do not create a loss."; },
  afterRecoveryPlan: function(){ return "Left after monsoon − prior-loss recovery."; },
  vatSetAside: function(){ return "Already removed from net sales — shown so you keep the cash aside, not subtracted again."; },
  breakEven: function(){ return "POS sales needed so net profit ≥ 0 after COGS, labor, overhead, depreciation and loan interest."; }
};

function infoTip(key){
  var t = TIP[key] ? TIP[key]() : "";
  if (!t) return "";
  return ' <span class="info-tip" tabindex="0" role="img" aria-label="'+esc(t)+'" title="'+esc(t)+'">ⓘ</span>';
}

/** Label + tooltip. */
function labelTip(key){ return (LABEL[key] || key) + infoTip(key); }

/** Full depreciation explanation — Setup & Assets tab only. */
function depreciationExplainHtml(){
  return '<p class="lede"><b>'+LABEL.depreciation+'</b> (in P&amp;L, non-cash), counted from the opening month ('+esc(OPENING_DATE)+'):</p>'+
    '<ul class="cash-guide-list">'+
      '<li><b>Setup / equipment / contractor</b> = line total ÷ <b>'+SETUP_LIFE_MONTHS+' months</b> (fixed).</li>'+
      '<li><b>Utensils</b> = line total ÷ the row\'s life (default '+UTENSIL_DEFAULT_LIFE+' months).</li>'+
      '<li><b>Inventory / opening stock, deposit, cash float</b> = not depreciated (capital only).</li>'+
    '</ul>'+
    '<p class="note">The ₩ / month in each row is exactly what the P&amp;L uses. Category, line total and life auto-fill from the item name unless you change the dropdown.</p>';
}

/** "How to read the minus" — Dashboard cash card only. */
function cashGuideHtml(c){
  c = c || {};
  var vac = c.isVacationMonth;
  var mode = c.beforeOpening
    ? "Before opening ("+esc(OPENING_DATE)+") — nothing is carried."
    : (c.openingMonth || (c.lossCarry && c.lossCarry.openingMonth)
      ? "Opening month ("+esc(OPENING_DATE.slice(0, 7))+") — <b>prior-loss recovery is ₩0</b> (no prior month yet)."
      : (vac ? "Vacation month — " + LABEL.recovery.toLowerCase() + " is <b>₩0</b>; old losses wait for working months."
             : "Working month after opening — carried loss from months with real sales/costs is recovered ÷ " + monthsText(RECOVERY_MONTHS) + "."));
  return '<div class="cash-guide">'+
    '<div class="eyebrow">How to read the minus (−)</div>'+
    '<p class="lede" style="margin:6px 0 0"><b>This month:</b> '+mode+'</p>'+
    '<ul class="cash-guide-list">'+
      '<li><b>Opening</b> = '+esc(OPENING_DATE)+'. Months before that are ignored. The opening month itself never shows prior-loss recovery.</li>'+
      '<li><b>'+LABEL.cashAfterLoans+'</b> = net profit + depreciation (non-cash) − loan principal. Loan interest is already inside net profit.</li>'+
      '<li><b>'+LABEL.monsoon+'</b> = '+pct(MONSOON_RATE, 0)+' of cash after loans, only when it is positive. A minus month takes ₩0 — it never adds a minus.</li>'+
      '<li><b>'+LABEL.leftAfterMonsoon+'</b> = cash after loans − monsoon reserve. A minus here becomes a carried loss.</li>'+
      '<li><b>'+LABEL.recovery+'</b> = carried loss ÷ '+monthsText(RECOVERY_MONTHS)+' in working months after opening (₩0 in opening month / vacation). Empty months do not invent a loss.</li>'+
      '<li><b>'+LABEL.afterRecoveryPlan+'</b> = left after monsoon − prior-loss recovery.</li>'+
    '</ul></div>';
}
