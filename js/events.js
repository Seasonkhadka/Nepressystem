/**
 * events.js — delegated input/click handlers for the two editable tabs, plus
 * tab switching. Delegation on the tab container means a full table rebuild
 * (add/remove ingredient row, month change) never needs listeners re-attached.
 *
 * Depends on: state.js (STATE, blankIngredient), raw-materials.js
 * (renderRawMaterialsTab). Calls refreshDerived (main.js) — a forward
 * reference resolved when the event actually fires, after every script has
 * loaded.
 */

function initRawEvents(){
  var host = el("tab-raw");
  var onFieldChange = function(e){
    var t = e.target;
    if (!t.matches('input[data-field], select[data-field]')) return;
    var tr = t.closest('tr[data-ing-id]');
    if (!tr) return;
    var id = Number(tr.getAttribute('data-ing-id'));
    var ing = STATE.ingredients.find(function(i){ return i.id === id; });
    if (!ing) return;
    var field = t.getAttribute('data-field');
    var needsRebuild = false;
    if (field === "name"){
      ing[field] = t.value;
    } else if (field === "intervalUnit"){
      ing[field] = t.value;
      if (t.value === "once"){
        // Stamp "now" as the one-time purchase's month, so it counts this
        // month and automatically drops to zero every month after.
        ing.purchaseMonth = STATE.month;
        ing.purchaseYear = STATE.year;
      }
      needsRebuild = true; // the row's layout differs for "one-time"
    } else if (field === "intervalValue"){
      ing[field] = Math.max(1, parseInt(t.value, 10) || 1);
    } else {
      ing[field] = parseFloat(t.value) || 0; // amount
    }
    if (needsRebuild) renderRawMaterialsTab();
    refreshDerived();
  };
  host.addEventListener("input", onFieldChange);
  host.addEventListener("change", onFieldChange);
  host.addEventListener("click", function(e){
    var t = e.target;
    if (t.matches('[data-remove-ing]')){
      var id = Number(t.getAttribute('data-remove-ing'));
      STATE.ingredients = STATE.ingredients.filter(function(i){ return i.id !== id; });
      renderRawMaterialsTab();
      refreshDerived();
    } else if (t.matches('[data-add-cat]')){
      var cat = t.getAttribute('data-add-cat');
      STATE.ingredients.push(blankIngredient(cat));
      renderRawMaterialsTab();
      refreshDerived();
    }
  });
}

function initDailyEvents(){
  var host = el("tab-daily");
  host.addEventListener("input", function(e){
    var t = e.target;
    if (!t.matches('input[data-field]')) return;
    var tr = t.closest('tr[data-day]');
    if (!tr) return;
    var day = Number(tr.getAttribute('data-day'));
    var rec = STATE.days[day];
    if (!rec) return;
    var field = t.getAttribute('data-field');
    if (field === "vacation") rec.vacation = t.checked;
    else rec[field] = parseFloat(t.value) || 0;
    refreshDerived();
  });
}

function initTabs(){
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".tabs button"));
  buttons.forEach(function(btn){
    btn.addEventListener("click", function(){
      buttons.forEach(function(b){ b.setAttribute("aria-selected", b===btn ? "true":"false"); });
      document.querySelectorAll(".panel").forEach(function(p){ p.classList.remove("active"); });
      el("tab-"+btn.dataset.tab).classList.add("active");
    });
  });
}
