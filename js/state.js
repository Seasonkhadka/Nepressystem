/**
 * state.js — the app's single source of truth: STATE, its defaults, and
 * persistence to localStorage.
 *
 * Depends on: data.js (CAT_ORDER). Loads STATE immediately at the bottom of
 * this file, so data.js must be loaded first.
 *
 * Ingredient shape: { id, cat, name, amount, intervalValue, intervalUnit }
 *   — "I spend `amount` ₩ every `intervalValue` `intervalUnit`(s)."
 *   e.g. amount:15000, intervalValue:2, intervalUnit:"day" -> every 2 days.
 */

var nextIngId = 1;

function today(){ return new Date(); }

function daysInMonth(year, month){ return new Date(year, month, 0).getDate(); }

function blankIngredient(cat){
  return { id: nextIngId++, cat: cat, name: "", amount: 0, intervalValue: 1, intervalUnit: "week" };
}

// Carries older saved shapes forward to {amount, intervalValue, intervalUnit}
// so nothing already entered is lost when the data model changes.
function migrateIngredient(i){
  if (i.intervalValue !== undefined && i.intervalUnit !== undefined) return i;

  // Previous shape: amount + a fixed frequency (daily/weekly/monthly).
  if (i.amount !== undefined && i.frequency !== undefined){
    var freqMap = { daily: {value:1, unit:"day"}, weekly: {value:1, unit:"week"}, monthly: {value:1, unit:"month"} };
    var mapped = freqMap[i.frequency] || {value:1, unit:"week"};
    return { id: i.id, cat: i.cat, name: i.name || "", amount: Number(i.amount)||0, intervalValue: mapped.value, intervalUnit: mapped.unit };
  }

  // Oldest shape: unit cost x daily quantity.
  var amount = (Number(i.unitCost)||0) * (Number(i.qty)||0);
  return { id: i.id, cat: i.cat, name: i.name || "", amount: amount, intervalValue: 1, intervalUnit: "day" };
}

function blankDaysForMonth(year, month){
  var n = daysInMonth(year, month);
  var days = {};
  for (var d=1; d<=n; d++){
    days[d] = { vacation:false, sales:0, cogsPct:0, labor:0 };
  }
  return days;
}

function defaultState(){
  var t = today();
  var year = t.getFullYear(), month = t.getMonth()+1;
  return {
    meta: { name:"", subtitle:"" },
    year: year, month: month,
    overheadFixedMonthly: 0,
    overheadVariableRate: 0,
    ingredients: CAT_ORDER.map(function(c){ return blankIngredient(c); }),
    days: blankDaysForMonth(year, month)
  };
}

function loadState(){
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.days || !parsed.ingredients) return defaultState();
    var maxId = 0;
    parsed.ingredients.forEach(function(i){ if (i.id > maxId) maxId = i.id; });
    nextIngId = maxId + 1;
    parsed.ingredients = parsed.ingredients.map(migrateIngredient);
    return parsed;
  } catch(e){ return defaultState(); }
}

function saveState(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch(e){}
}

var STATE = loadState();
