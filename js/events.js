/**
 * events.js — delegated handlers for raw-materials purchases, P&amp;L daily
 * rows, and tab switching.
 */

function findIngredient(id){
  return STATE.ingredients.find(function(i){ return i.id === id; });
}

function findPurchase(ing, purId){
  if (!ing || !ing.purchases) return null;
  return ing.purchases.find(function(p){ return p.id === purId; });
}

function findLump(id){
  if (!STATE.lumps) return null;
  return STATE.lumps.find(function(p){ return p.id === id; });
}

function findAsset(id){
  if (!STATE.assets) return null;
  return STATE.assets.find(function(a){ return a.id === id; });
}

function findLaborShift(id){
  if (!STATE.laborShifts) return null;
  return STATE.laborShifts.find(function(s){ return s.id === id; });
}

function findLaborSalary(id){
  if (!STATE.laborSalaries) return null;
  return STATE.laborSalaries.find(function(s){ return s.id === id; });
}

function findOverheadBill(id){
  if (!STATE.overheadBills) return null;
  return STATE.overheadBills.find(function(b){ return b.id === id; });
}

function findOverheadFixed(id){
  if (!STATE.overheadFixedItems) return null;
  return STATE.overheadFixedItems.find(function(b){ return b.id === id; });
}

function initRawEvents(){
  var host = el("tab-raw");
  var onFieldChange = function(e){
    var t = e.target;
    var lumpTr = t.closest("tr[data-lump-id]");
    if (lumpTr){
      var lump = findLump(Number(lumpTr.getAttribute("data-lump-id")));
      if (!lump || !t.matches("[data-field]")) return;
      var lfield = t.getAttribute("data-field");
      if (lfield === "date" || lfield === "place" || lfield === "note") lump[lfield] = t.value;
      else lump[lfield] = parseFloat(t.value) || 0;
      refreshDerived();
      return;
    }

    var row = t.closest("tr[data-ing-id]");
    if (!row) return;
    var ing = findIngredient(Number(row.getAttribute("data-ing-id")));
    if (!ing) return;

    if (t.matches("[data-ing-field]")){
      var ifield = t.getAttribute("data-ing-field");
      if (ifield === "name") ing.name = t.value;
      else if (ifield === "unit") ing.unit = t.value;
      else if (ifield === "cat"){
        ing.cat = migrateCat(t.value);
        renderRawMaterialsTab();
        renderCompareTab();
      }
      refreshDerived();
      return;
    }

    if (!t.matches("[data-field]")) return;
    var tr = t.closest("tr[data-pur-id]");
    if (!tr) return;
    var pur = findPurchase(ing, Number(tr.getAttribute("data-pur-id")));
    if (!pur) return;
    var field = t.getAttribute("data-field");
    if (field === "date" || field === "place") pur[field] = t.value;
    else applyPurchaseField(pur, field, t.value);
    refreshDerived();
  };
  host.addEventListener("input", onFieldChange);
  host.addEventListener("change", onFieldChange);
  host.addEventListener("click", function(e){
    var t = e.target;
    if (t.matches("[data-remove-ing]")){
      var id = Number(t.getAttribute("data-remove-ing"));
      STATE.ingredients = STATE.ingredients.filter(function(i){ return i.id !== id; });
      renderRawMaterialsTab();
      renderCompareTab();
      refreshDerived();
    } else if (t.matches("[data-add-cat]")){
      STATE.ingredients.push(blankIngredient(t.getAttribute("data-add-cat")));
      renderRawMaterialsTab();
      refreshDerived();
    } else if (t.matches("[data-add-pur]")){
      var ingAdd = findIngredient(Number(t.getAttribute("data-add-pur")));
      if (!ingAdd) return;
      if (!ingAdd.purchases) ingAdd.purchases = [];
      ingAdd.purchases.push(blankPurchase());
      renderRawMaterialsTab();
      refreshDerived();
    } else if (t.matches("[data-remove-pur]")){
      var rowRm = t.closest("tr[data-ing-id]");
      if (!rowRm) return;
      var ingRm = findIngredient(Number(rowRm.getAttribute("data-ing-id")));
      if (!ingRm) return;
      var pid = Number(t.getAttribute("data-remove-pur"));
      ingRm.purchases = (ingRm.purchases || []).filter(function(p){ return p.id !== pid; });
      if (!ingRm.purchases.length) ingRm.purchases.push(blankPurchase());
      renderRawMaterialsTab();
      refreshDerived();
    } else if (t.matches("[data-add-lump]")){
      if (!STATE.lumps) STATE.lumps = [];
      STATE.lumps.push(blankLump());
      renderRawMaterialsTab();
      refreshDerived();
    } else if (t.matches("[data-remove-lump]")){
      var lid = Number(t.getAttribute("data-remove-lump"));
      STATE.lumps = (STATE.lumps || []).filter(function(p){ return p.id !== lid; });
      if (!STATE.lumps.length) STATE.lumps.push(blankLump());
      renderRawMaterialsTab();
      refreshDerived();
    }
  });
}

function initDailyEvents(){
  var host = el("tab-calc");
  if (!host) return;
  var onDayChange = function(e){
    var t = e.target;
    if (!t.matches("input[data-field]")) return;
    var tr = t.closest("tr[data-day]");
    if (!tr) return;
    var day = Number(tr.getAttribute("data-day"));
    var rec = STATE.days[day];
    if (!rec){
      rec = STATE.days[day] = { vacation:false, sales:0, cogsPct:0, labor:0 };
    }
    var field = t.getAttribute("data-field");
    if (field === "cogsPct" || field === "labor") return;
    if (field === "vacation") rec.vacation = t.checked;
    else rec[field] = parseFloat(t.value) || 0;
    refreshDerived();
  };
  host.addEventListener("input", onDayChange);
  host.addEventListener("change", onDayChange);
}

function initAssetEvents(){
  var host = el("tab-assets");
  if (!host) return;
  var onFieldChange = function(e){
    var t = e.target;
    var tr = t.closest("tr[data-asset-id]");
    if (!tr || !t.matches("[data-field]")) return;
    var rec = findAsset(Number(tr.getAttribute("data-asset-id")));
    if (!rec) return;
    applyAssetField(rec, t.getAttribute("data-field"), t.value);
    refreshDerived();
  };
  host.addEventListener("input", onFieldChange);
  host.addEventListener("change", onFieldChange);
  host.addEventListener("click", function(e){
    var t = e.target;
    if (t.matches("[data-add-asset]")){
      if (!STATE.assets) STATE.assets = [];
      STATE.assets.push(blankAsset(t.getAttribute("data-add-asset")));
      renderAssetsTab();
      refreshDerived();
    } else if (t.matches("[data-remove-asset]")){
      var id = Number(t.getAttribute("data-remove-asset"));
      var rec = findAsset(id);
      var cat = rec ? rec.cat : "inventory";
      STATE.assets = (STATE.assets || []).filter(function(a){ return a.id !== id; });
      var left = STATE.assets.filter(function(a){ return a.cat === cat; });
      if (!left.length) STATE.assets.push(blankAsset(cat));
      renderAssetsTab();
      refreshDerived();
    }
  });
}

function initLaborEvents(){
  var host = el("tab-labor");
  if (!host) return;
  var onFieldChange = function(e){
    var t = e.target;
    if (t.id === "input-overhead-var"){
      STATE.overheadVariableRate = parseFloat(t.value)||0;
      refreshDerived();
      return;
    }
    if (!t.matches("[data-field]")) return;
    var partTr = t.closest("tr[data-salary-part-id]");
    if (partTr){
      var salary = findLaborSalary(Number(partTr.getAttribute("data-salary-id")));
      var part = salary ? findSalaryPart(salary, Number(partTr.getAttribute("data-salary-part-id"))) : null;
      if (!part) return;
      var pfield = t.getAttribute("data-field");
      if (pfield === "date"){
        part.date = t.value;
        renderLaborTab();
        refreshDerived();
        return;
      }
      if (pfield === "paid") part.paid = t.value === "yes";
      else part.amount = parseFloat(t.value) || 0;
      refreshDerived();
      return;
    }
    var shiftTr = t.closest("tr[data-shift-id]");
    if (shiftTr){
      var shift = findLaborShift(Number(shiftTr.getAttribute("data-shift-id")));
      if (!shift) return;
      applyLaborShiftField(shift, t.getAttribute("data-field"), t.value);
      refreshDerived();
      return;
    }
    var salaryTr = t.closest("tr[data-salary-id]");
    if (salaryTr){
      var salary = findLaborSalary(Number(salaryTr.getAttribute("data-salary-id")));
      if (!salary) return;
      var field = t.getAttribute("data-field");
      if (field === "name" || field === "role") salary[field] = t.value;
      else salary.amount = parseFloat(t.value) || 0;
      refreshDerived();
      return;
    }
    var billTr = t.closest("tr[data-bill-id]");
    if (billTr){
      var bill = findOverheadBill(Number(billTr.getAttribute("data-bill-id")));
      if (!bill) return;
      var bfield = t.getAttribute("data-field");
      if (bfield === "date" || bfield === "name") bill[bfield] = t.value;
      else bill.amount = parseFloat(t.value) || 0;
      refreshDerived();
      return;
    }
    var fixedTr = t.closest("tr[data-fixed-id]");
    if (fixedTr){
      var rec = findOverheadFixed(Number(fixedTr.getAttribute("data-fixed-id")));
      if (!rec) return;
      var ffield = t.getAttribute("data-field");
      if (ffield === "name") rec.name = t.value;
      else rec.amount = parseFloat(t.value) || 0;
      refreshDerived();
    }
  };
  host.addEventListener("input", onFieldChange);
  host.addEventListener("change", onFieldChange);
  host.addEventListener("click", function(e){
    var t = e.target;
    if (t.matches("[data-add-shift]")){
      if (!STATE.laborShifts) STATE.laborShifts = [];
      STATE.laborShifts.push(blankLaborShift());
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-remove-shift]")){
      var sid = Number(t.getAttribute("data-remove-shift"));
      STATE.laborShifts = (STATE.laborShifts || []).filter(function(s){ return s.id !== sid; });
      if (!STATE.laborShifts.length) STATE.laborShifts.push(blankLaborShift());
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-add-salary]")){
      if (!STATE.laborSalaries) STATE.laborSalaries = [];
      STATE.laborSalaries.push(blankLaborSalary());
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-add-salary-part]")){
      var salId = Number(t.getAttribute("data-add-salary-part"));
      var sal = findLaborSalary(salId);
      if (sal){
        if (!sal.parts) sal.parts = [];
        sal.parts.push(blankSalaryPart());
      }
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-remove-salary-part]")){
      var partId = Number(t.getAttribute("data-remove-salary-part"));
      asArray(STATE.laborSalaries).forEach(function(s){
        if (!s.parts) return;
        s.parts = s.parts.filter(function(p){ return p.id !== partId; });
      });
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-remove-salary]")){
      var lid = Number(t.getAttribute("data-remove-salary"));
      STATE.laborSalaries = (STATE.laborSalaries || []).filter(function(s){ return s.id !== lid; });
      if (!STATE.laborSalaries.length) STATE.laborSalaries.push(blankLaborSalary());
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-add-bill]")){
      if (!STATE.overheadBills) STATE.overheadBills = [];
      STATE.overheadBills.push(blankOverheadBill());
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-remove-bill]")){
      var bid = Number(t.getAttribute("data-remove-bill"));
      STATE.overheadBills = (STATE.overheadBills || []).filter(function(b){ return b.id !== bid; });
      if (!STATE.overheadBills.length) STATE.overheadBills.push(blankOverheadBill());
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-add-fixed]")){
      if (!STATE.overheadFixedItems) STATE.overheadFixedItems = [];
      STATE.overheadFixedItems.push(blankOverheadFixed());
      renderLaborTab();
      refreshDerived();
    } else if (t.matches("[data-remove-fixed]")){
      var fid = Number(t.getAttribute("data-remove-fixed"));
      STATE.overheadFixedItems = (STATE.overheadFixedItems || []).filter(function(b){ return b.id !== fid; });
      if (!STATE.overheadFixedItems.length) STATE.overheadFixedItems.push(blankOverheadFixed());
      renderLaborTab();
      refreshDerived();
    }
  });
}

function showTab(name){
  var targetId = "tab-" + name;
  var panels = document.querySelectorAll(".panel");
  var shown = false;
  for (var i = 0; i < panels.length; i++){
    var on = panels[i].id === targetId;
    panels[i].hidden = !on;
    if (on) shown = true;
  }
  if (!shown){
    var dash = el("tab-dashboard");
    if (dash){ dash.hidden = false; name = "dashboard"; }
  }
  var buttons = document.querySelectorAll(".tabs [data-tab]");
  for (var j = 0; j < buttons.length; j++){
    var isOn = buttons[j].getAttribute("data-tab") === name;
    buttons[j].setAttribute("aria-selected", isOn ? "true" : "false");
  }
}

function initTabs(){
  var buttons = document.querySelectorAll(".tabs [data-tab]");
  for (var i = 0; i < buttons.length; i++){
    buttons[i].addEventListener("click", function(){
      showTab(this.getAttribute("data-tab"));
    });
  }
}
