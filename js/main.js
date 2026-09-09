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
  refreshAssetComputedCells(model);
  refreshDailyComputedCells(model);
  renderWeeklyTab(model);
  renderMonthlyTab(model);
  renderDashboard(model);
  renderCompareTab();
}

function rerenderAllFromState(){
  populateSetupBar();
  renderRawMaterialsTab();
  renderAssetsTab();
  renderCalculationsTab();
  refreshDerived();
}

initTabs();
try {
  initSetupBar();
  renderRawMaterialsTab();
  renderAssetsTab();
  renderCalculationsTab();
  refreshDerived();
} catch (err){
  console.error(err);
  try {
    initSetupBar();
    renderRawMaterialsTab();
    renderAssetsTab();
    renderCalculationsTab();
    refreshDerived();
  } catch (e2){
    console.error(e2);
  }
}
initRawEvents();
initAssetEvents();
initDailyEvents();
initCloud();
