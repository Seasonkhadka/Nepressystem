/**
 * state.js — the app's single source of truth: STATE, its defaults, and
 * persistence to localStorage.
 *
 * Ingredient shape:
 *   { id, cat, name, unit, purchases: [{ id, date, place, qty, unitPrice }] }
 * Each purchase is one receipt line. Monthly cost is the sum of purchases
 * dated in the selected month — buying spinach 3 times does not rescale
 * a single "amount", so unit price stays honest per market.
 *
 * Depends on: data.js (CAT_ORDER, defaultUnit).
 */

var nextIngId = 1;
var nextPurchaseId = 1;

function today(){ return new Date(); }

function daysInMonth(year, month){ return new Date(year, month, 0).getDate(); }

function blankPurchase(){
  return { id: nextPurchaseId++, date: isoToday(), place: "", qty: 0, unitPrice: 0 };
}

function blankIngredient(cat){
  return { id: nextIngId++, cat: cat, name: "", unit: defaultUnit(cat), purchases: [blankPurchase()] };
}

function migratePurchase(p){
  if (!p || typeof p !== "object") return blankPurchase();
  var qty = Number(p.qty) || 0;
  var unitPrice = Number(p.unitPrice);
  if (!isFinite(unitPrice) || unitPrice < 0){
    var total = Number(p.total) || 0;
    unitPrice = qty > 0 ? total / qty : 0;
  }
  return {
    id: p.id || nextPurchaseId++,
    date: p.date || isoToday(),
    place: p.place || "",
    qty: qty,
    unitPrice: unitPrice
  };
}

function migrateIngredient(i){
  if (!i) return blankIngredient("veg");
  var unit = i.unit || defaultUnit(i.cat);
  var purchases;
  if (Array.isArray(i.purchases) && i.purchases.length){
    purchases = i.purchases.map(migratePurchase);
  } else {
    var amount = Number(i.amount) || 0;
    purchases = amount > 0
      ? [{ id: nextPurchaseId++, date: isoToday(), place: "", qty: 1, unitPrice: amount }]
      : [blankPurchase()];
  }
  return { id: i.id, cat: i.cat, name: i.name || "", unit: unit, purchases: purchases };
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

function normalizeParsedState(parsed){
  if (!parsed || !parsed.days || typeof parsed.days !== "object") return defaultState();
  if (!Array.isArray(parsed.ingredients)) return defaultState();
  var maxIng = 0, maxPur = 0;
  parsed.ingredients.forEach(function(i){
    if (i && i.id > maxIng) maxIng = i.id;
  });
  nextIngId = maxIng + 1;
  parsed.ingredients = parsed.ingredients.map(migrateIngredient);
  parsed.ingredients.forEach(function(i){
    (i.purchases || []).forEach(function(p){ if (p && p.id > maxPur) maxPur = p.id; });
  });
  nextPurchaseId = maxPur + 1;
  if (!parsed.meta) parsed.meta = { name:"", subtitle:"" };
  return parsed;
}

function loadState(){
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeParsedState(JSON.parse(raw));
  } catch(e){ return defaultState(); }
}

function replaceState(parsed){
  STATE = normalizeParsedState(parsed);
}

function stateHasUserData(s){
  s = s || STATE;
  if (!s) return false;
  if (s.meta && String(s.meta.name || "").trim()) return true;
  if (s.meta && String(s.meta.subtitle || "").trim()) return true;
  if ((Number(s.overheadFixedMonthly) || 0) > 0) return true;
  if ((Number(s.overheadVariableRate) || 0) > 0) return true;
  if (s.ingredients && s.ingredients.some(function(i){
    if (String(i.name || "").trim()) return true;
    return (i.purchases || []).some(function(p){
      return String(p.place || "").trim() || (Number(p.qty)||0) > 0 || (Number(p.unitPrice)||0) > 0;
    });
  })) return true;
  if (s.days){
    var keys = Object.keys(s.days);
    for (var i = 0; i < keys.length; i++){
      var d = s.days[keys[i]];
      if (!d) continue;
      if (d.vacation) return true;
      if ((Number(d.sales) || 0) > 0 || (Number(d.labor) || 0) > 0 || (Number(d.cogsPct) || 0) > 0) return true;
    }
  }
  return false;
}

function statesDiffer(a, b){
  try { return JSON.stringify(a) !== JSON.stringify(b); } catch(e){ return true; }
}

function saveState(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch(e){}
  if (typeof scheduleCloudSave === "function") scheduleCloudSave();
}

var STATE = loadState();
