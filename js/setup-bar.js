/**
 * setup-bar.js — the always-visible strip above the tabs: business name,
 * month/year picker, and overhead settings.
 *
 * Depends on: dom-utils.js (el), data.js (MONTH_NAMES), state.js (STATE,
 * defaultState, blankDaysForMonth, saveState). Calls renderDailyTab (daily.js),
 * renderRawMaterialsTab (raw-materials.js), and refreshDerived (main.js) —
 * all forward references resolved at event time, once every script has
 * loaded, so file order relative to this one doesn't matter.
 */

function populateSetupBar(){
  var monthSel = el("input-month");
  monthSel.innerHTML = MONTH_NAMES.map(function(name,i){ return '<option value="'+(i+1)+'"'+(i+1===STATE.month?" selected":"")+'>'+name+'</option>'; }).join("");
  el("input-year").value = STATE.year;
  el("input-overhead-fixed").value = STATE.overheadFixedMonthly || "";
  el("input-overhead-var").value = STATE.overheadVariableRate || "";
  el("input-name").value = STATE.meta.name || "";
  el("input-subtitle").value = STATE.meta.subtitle || "";
}

function hasAnyDailyData(){
  return Object.keys(STATE.days).some(function(k){
    var d = STATE.days[k];
    return (Number(d.sales)||0) > 0 || (Number(d.labor)||0) > 0 || (Number(d.cogsPct)||0) > 0;
  });
}

function applyMonthYearChange(){
  var newMonth = parseInt(el("input-month").value, 10);
  var newYear = parseInt(el("input-year").value, 10) || STATE.year;
  if (newMonth === STATE.month && newYear === STATE.year) return;
  if (hasAnyDailyData()){
    var ok = window.confirm("Changing the month will clear the daily entries you've made for "+MONTH_NAMES[STATE.month-1]+" "+STATE.year+". Continue?");
    if (!ok){ populateSetupBar(); return; }
  }
  STATE.month = newMonth; STATE.year = newYear;
  STATE.days = blankDaysForMonth(STATE.year, STATE.month);
  renderDailyTab();
  renderRawMaterialsTab(); // one-time ingredients may now be in/out of scope
  refreshDerived();
}

function initSetupBar(){
  populateSetupBar();
  el("input-month").addEventListener("change", applyMonthYearChange);
  el("input-year").addEventListener("change", applyMonthYearChange);
  el("input-overhead-fixed").addEventListener("input", function(){
    STATE.overheadFixedMonthly = parseFloat(el("input-overhead-fixed").value)||0;
    refreshDerived();
  });
  el("input-overhead-var").addEventListener("input", function(){
    STATE.overheadVariableRate = parseFloat(el("input-overhead-var").value)||0;
    refreshDerived();
  });
  el("input-name").addEventListener("input", function(){ STATE.meta.name = el("input-name").value; saveState(); });
  el("input-subtitle").addEventListener("input", function(){ STATE.meta.subtitle = el("input-subtitle").value; saveState(); });
  el("btn-clear-all").addEventListener("click", function(){
    var ok = window.confirm("This clears every ingredient, every daily entry, and your overhead settings. This can't be undone. Continue?");
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
    STATE = defaultState();
    populateSetupBar();
    renderRawMaterialsTab();
    renderDailyTab();
    refreshDerived();
  });
}
