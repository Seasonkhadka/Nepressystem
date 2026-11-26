/**
 * main.js — the app's entry point. Loaded last, after every other script has
 * defined its functions, so it's the only file allowed to actually call them.
 *
 * refreshDerived() is the one function that keeps every tab in sync: run it
 * after any state change and Raw Materials, Daily, Weekly, Monthly, and the
 * Dashboard all recompute from the current STATE.
 */

function refreshDerived(){
  saveState();
  var model = computeAll();
  refreshRawComputedCells(model);
  refreshLaborComputedCells(model);
  refreshAssetComputedCells(model);
  refreshDailyComputedCells(model);
  renderWeeklyTab(model);
  renderMonthlyTab(model);
  renderDashboard(model);
  renderCompareTab();
  refreshBuyPlanCells();
}

function rerenderAllFromState(){
  populateSetupBar();
  renderRawMaterialsTab();
  renderLaborTab();
  renderAssetsTab();
  renderCalculationsTab();
  refreshDerived();
}

initTabs();
try {
  initSetupBar();
  renderRawMaterialsTab();
  renderLaborTab();
  renderAssetsTab();
  renderCalculationsTab();
  refreshDerived();
} catch (err){
  console.error(err);
  try {
    initSetupBar();
    renderRawMaterialsTab();
    renderLaborTab();
    renderAssetsTab();
    renderCalculationsTab();
    refreshDerived();
  } catch (e2){
    console.error(e2);
    var dash = el("tab-dashboard");
    if (dash){
      dash.hidden = false;
      dash.innerHTML = '<section class="card"><h2>Couldn’t finish loading</h2>'+
        '<p class="lede">Your saved numbers are still on this device (and in Google if you signed in). Try a hard refresh. Do <b>not</b> press Clear all data.</p>'+
        '<p class="note">'+(e2 && e2.message ? String(e2.message) : "Unknown error")+'</p></section>';
    }
  }
}
initRawEvents();
initBillScanEvents();
initLaborEvents();
initAssetEvents();
initDailyEvents();
initCloud();
