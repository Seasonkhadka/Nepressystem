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

    var card = t.closest(".ing-card");
    if (!card) return;
    var ing = findIngredient(Number(card.getAttribute("data-ing-id")));
    if (!ing) return;

    if (t.matches("[data-ing-field]")){
      var ifield = t.getAttribute("data-ing-field");
      if (ifield === "name") ing.name = t.value;
      else if (ifield === "unit") ing.unit = t.value;
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
    else pur[field] = parseFloat(t.value) || 0;
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
      var card = t.closest(".ing-card");
      if (!card) return;
      var ingRm = findIngredient(Number(card.getAttribute("data-ing-id")));
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
    if (!rec) return;
    var field = t.getAttribute("data-field");
    if (field === "vacation") rec.vacation = t.checked;
    else rec[field] = parseFloat(t.value) || 0;
    refreshDerived();
  };
  host.addEventListener("input", onDayChange);
  host.addEventListener("change", onDayChange);
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
