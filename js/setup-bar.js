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
  el("input-name").value = STATE.meta.name || "";
  el("input-subtitle").value = STATE.meta.subtitle || "";
}

function hasAnyDailyData(){
  if (!STATE.days) return false;
  return Object.keys(STATE.days).some(function(k){
    var d = STATE.days[k];
    if (!d) return false;
    return (Number(d.sales)||0) > 0 || (Number(d.labor)||0) > 0 || (Number(d.cogsPct)||0) > 0;
  });
}

function applyMonthYearChange(){
  var newMonth = parseInt(el("input-month").value, 10);
  var newYear = parseInt(el("input-year").value, 10) || STATE.year;
  if (newMonth === STATE.month && newYear === STATE.year) return;
  stashDays(STATE.year, STATE.month, STATE.days);
  STATE.month = newMonth; STATE.year = newYear;
  STATE.days = daysFromArchive(STATE.year, STATE.month);
  renderCalculationsTab();
  renderRawMaterialsTab();
  renderLaborTab();
  refreshDerived();
}

function initSetupBar(){
  populateSetupBar();
  el("input-month").addEventListener("change", applyMonthYearChange);
  el("input-year").addEventListener("change", applyMonthYearChange);
  el("input-name").addEventListener("input", function(){ STATE.meta.name = el("input-name").value; saveState(); });
  el("input-subtitle").addEventListener("input", function(){ STATE.meta.subtitle = el("input-subtitle").value; saveState(); });
  el("btn-clear-all").addEventListener("click", function(){
    var msg = "This clears every ingredient, every daily entry, labor, overhead bills, setup and assets. This can't be undone.";
    if (typeof cloudUser !== "undefined" && cloudUser){
      msg += " It will also clear the copy saved to your Google account.";
    }
    var ok = window.confirm(msg + " Continue?");
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
    STATE = defaultState();
    populateSetupBar();
    renderRawMaterialsTab();
    renderLaborTab();
    renderAssetsTab();
    renderCalculationsTab();
    refreshDerived();
  });
}
