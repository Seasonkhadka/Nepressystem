/**
 * state.js — the app's single source of truth: STATE, its defaults, and
 * persistence to localStorage.
 *
 * Ingredient shape (Meat / Groceries / Vegetables):
 *   { id, cat, name, unit, purchases: [{ id, date, place, packs, qty, unitPrice, amount }] }
 * packs = number of packets; qty = size of one pack (kg, L, …).
 * Total quantity = packs × qty when packs > 0, otherwise qty.
 * Line total auto-fills from total quantity × ₩/unit, or you type it yourself.
 * Lump / no-bill rows (no itemized receipt):
 *   { id, date, place, note, amount }  — you type the line total yourself.
 * Long-term assets (inventory, setup, utensils, gas):
 *   { id, cat, date, name, qty, unitPrice, amount, lifeMonths }
 * Labor shifts (variable, by day):
 *   { id, date, name, role, hours, rate, amount }
 * Monthly salaries (staff paid by the month, not by the hour):
 *   { id, name, role, amount }
 * Overhead bills (not-fixed — electricity, water; change each month):
 *   { id, date, name, amount }
 * Fixed overhead (rent, insurance — same every month until you change it):
 *   { id, name, amount }
 * dayArchive: { "YYYY-MM": { 1:{sales...}, ... } } so changing month does not wipe other months.
 *
 * Depends on: data.js (CAT_ORDER, defaultUnit, migrateCat, ASSET_ORDER, defaultAssetLife).
 */

var nextIngId = 1;
var nextPurchaseId = 1;
var nextLumpId = 1;
var nextAssetId = 1;
var nextLaborShiftId = 1;
var nextLaborSalaryId = 1;
var nextOverheadBillId = 1;
var nextOverheadFixedId = 1;

function today(){ return new Date(); }

function monthKey(year, month){
  return String(year) + "-" + pad2(month);
}

function isoForMonth(year, month){
  var y = year, m = month;
  if (!y || !m){
    if (typeof STATE !== "undefined" && STATE && STATE.year){
      y = STATE.year; m = STATE.month;
    } else {
      var now = today();
      y = now.getFullYear(); m = now.getMonth()+1;
    }
  }
  var now = today();
  if (now.getFullYear() === y && now.getMonth()+1 === m) return isoToday();
  return y + "-" + pad2(m) + "-01";
}

function stashDays(year, month, days){
  if (!STATE.dayArchive || typeof STATE.dayArchive !== "object") STATE.dayArchive = {};
  STATE.dayArchive[monthKey(year, month)] = days;
}

function daysFromArchive(year, month){
  var archive = STATE.dayArchive && typeof STATE.dayArchive === "object" ? STATE.dayArchive : {};
  return normalizeDays(archive[monthKey(year, month)], year, month);
}

function daysInMonth(year, month){ return new Date(year, month, 0).getDate(); }

function asArray(v){
  if (Array.isArray(v)) return v.filter(function(x){ return x != null; });
  if (!v || typeof v !== "object") return [];
  return Object.keys(v).sort(function(a,b){ return Number(a) - Number(b); }).map(function(k){ return v[k]; }).filter(function(x){ return x != null; });
}

function normalizeDays(days, year, month){
  var src = days && typeof days === "object" ? days : {};
  var n = daysInMonth(year, month);
  var out = {};
  for (var d=1; d<=n; d++){
    var rec = src[d] || src[String(d)];
    out[d] = rec && typeof rec === "object"
      ? {
          vacation: !!rec.vacation,
          sales: Number(rec.sales)||0,
          cogsPct: Number(rec.cogsPct)||0,
          labor: Number(rec.labor)||0
        }
      : { vacation:false, sales:0, cogsPct:0, labor:0 };
  }
  return out;
}

function blankPurchase(){
  return { id: nextPurchaseId++, date: isoToday(), place: "", packs: 0, qty: 0, unitPrice: 0, amount: 0 };
}

function niceNum(v){
  v = Number(v);
  if (!isFinite(v) || v === 0) return 0;
  return Math.round(v * 10000) / 10000;
}

function purchaseQty(p){
  var qty = Number(p && p.qty) || 0;
  var packs = Number(p && p.packs) || 0;
  return packs > 0 ? packs * qty : qty;
}

function applyPurchaseField(pur, field, raw){
  if (field === "date" || field === "place"){
    pur[field] = raw;
    return;
  }
  var n = parseFloat(raw) || 0;
  if (field === "packs"){
    pur.packs = n;
  } else if (field === "qty"){
    pur.qty = n;
  } else if (field === "unitPrice"){
    pur.unitPrice = n;
    var q = purchaseQty(pur);
    if (q > 0) pur.amount = niceNum(q * n);
    return;
  } else if (field === "amount"){
    pur.amount = n;
    var q = purchaseQty(pur);
    if (q > 0) pur.unitPrice = niceNum(n / q);
    return;
  } else {
    return;
  }
  var q = purchaseQty(pur);
  if ((Number(pur.unitPrice)||0) > 0){
    pur.amount = niceNum(q * Number(pur.unitPrice));
  } else if (q > 0 && (Number(pur.amount)||0) > 0){
    pur.unitPrice = niceNum(Number(pur.amount) / q);
  }
}

function blankIngredient(cat){
  return { id: nextIngId++, cat: cat, name: "", unit: defaultUnit(cat), purchases: [blankPurchase()] };
}

function blankLump(){
  return { id: nextLumpId++, date: isoToday(), place: "", note: "", amount: 0 };
}

function blankAsset(cat){
  return {
    id: nextAssetId++,
    cat: cat || "inventory",
    date: isoToday(),
    name: "",
    qty: 0,
    unitPrice: 0,
    amount: 0,
    lifeMonths: defaultAssetLife(cat)
  };
}

function assetHasData(a){
  if (!a) return false;
  if (String(a.name || "").trim()) return true;
  return (Number(a.qty)||0) > 0 || (Number(a.unitPrice)||0) > 0 || (Number(a.amount)||0) > 0;
}

function compactAssets(list){
  var kept = [];
  ASSET_ORDER.forEach(function(cat){
    var items = list.filter(function(a){ return a.cat === cat; });
    var filled = items.filter(assetHasData);
    if (filled.length) kept = kept.concat(filled);
    else kept.push(blankAsset(cat));
  });
  return kept;
}

function applyAssetField(a, field, raw){
  if (field === "date" || field === "name"){
    a[field] = raw;
    return;
  }
  var n = parseFloat(raw) || 0;
  if (field === "lifeMonths"){
    a.lifeMonths = n < 0 ? 0 : n;
    return;
  }
  if (field === "qty"){
    a.qty = n;
    if ((Number(a.unitPrice)||0) > 0){
      a.amount = niceNum(n * Number(a.unitPrice));
    } else if (n > 0 && (Number(a.amount)||0) > 0){
      a.unitPrice = niceNum(Number(a.amount) / n);
    }
    return;
  }
  if (field === "unitPrice"){
    a.unitPrice = n;
    var qty = Number(a.qty)||0;
    if (qty > 0) a.amount = niceNum(qty * n);
    return;
  }
  if (field === "amount"){
    a.amount = n;
    var qty = Number(a.qty)||0;
    if (qty > 0) a.unitPrice = niceNum(n / qty);
  }
}

function migrateAsset(a){
  if (!a || typeof a !== "object") return blankAsset("inventory");
  var cat = ASSET_ORDER.indexOf(a.cat) > -1 ? a.cat : "inventory";
  var qty = Number(a.qty) || 0;
  var unitPrice = Number(a.unitPrice);
  var amount = Number(a.amount);
  if (!isFinite(unitPrice) || unitPrice < 0) unitPrice = 0;
  if (!isFinite(amount) || amount < 0) amount = 0;
  if (!amount && qty && unitPrice) amount = qty * unitPrice;
  if (!unitPrice && qty && amount) unitPrice = amount / qty;
  var life = Number(a.lifeMonths);
  if (!isFinite(life) || life < 0) life = defaultAssetLife(cat);
  return {
    id: a.id || nextAssetId++,
    cat: cat,
    date: a.date || isoToday(),
    name: a.name || "",
    qty: qty,
    unitPrice: niceNum(unitPrice),
    amount: niceNum(amount),
    lifeMonths: life
  };
}

function blankLaborShift(){
  return { id: nextLaborShiftId++, date: isoForMonth(), name: "", role: "", hours: 0, rate: 0, amount: 0 };
}

function blankLaborSalary(){
  return { id: nextLaborSalaryId++, name: "", role: "", amount: 0 };
}

function laborShiftHasData(s){
  if (!s) return false;
  if (String(s.name || "").trim() || String(s.role || "").trim()) return true;
  return (Number(s.hours)||0) > 0 || (Number(s.rate)||0) > 0 || (Number(s.amount)||0) > 0;
}

function laborSalaryHasData(s){
  if (!s) return false;
  return String(s.name || "").trim() || String(s.role || "").trim() || (Number(s.amount)||0) > 0;
}

function applyLaborShiftField(s, field, raw){
  if (field === "date" || field === "name" || field === "role"){
    s[field] = raw;
    return;
  }
  var n = parseFloat(raw) || 0;
  if (field === "hours"){
    s.hours = n;
    if ((Number(s.rate)||0) > 0) s.amount = niceNum(n * Number(s.rate));
    else if (n > 0 && (Number(s.amount)||0) > 0) s.rate = niceNum(Number(s.amount) / n);
    return;
  }
  if (field === "rate"){
    s.rate = n;
    var hours = Number(s.hours)||0;
    if (hours > 0) s.amount = niceNum(hours * n);
    return;
  }
  if (field === "amount"){
    s.amount = n;
    var hours = Number(s.hours)||0;
    if (hours > 0) s.rate = niceNum(n / hours);
  }
}

function laborShiftTotal(s){
  return lineTotal({ amount: s.amount, qty: s.hours, unitPrice: s.rate });
}

function migrateLaborShift(s){
  if (!s || typeof s !== "object") return blankLaborShift();
  var hours = Number(s.hours) || 0;
  var rate = Number(s.rate);
  var amount = Number(s.amount);
  if (!isFinite(rate) || rate < 0) rate = 0;
  if (!isFinite(amount) || amount < 0) amount = 0;
  if (!amount && hours && rate) amount = hours * rate;
  if (!rate && hours && amount) rate = amount / hours;
  return {
    id: s.id || nextLaborShiftId++,
    date: s.date || isoToday(),
    name: s.name || "",
    role: s.role || "",
    hours: hours,
    rate: niceNum(rate),
    amount: niceNum(amount)
  };
}

function migrateLaborSalary(s){
  if (!s || typeof s !== "object") return blankLaborSalary();
  return {
    id: s.id || nextLaborSalaryId++,
    name: s.name || "",
    role: s.role || "",
    amount: Number(s.amount) || 0
  };
}

function compactLaborShifts(list){
  var filled = asArray(list).filter(laborShiftHasData);
  return filled.length ? filled : [blankLaborShift()];
}

function compactLaborSalaries(list){
  var filled = asArray(list).filter(laborSalaryHasData);
  return filled.length ? filled : [blankLaborSalary()];
}

function blankOverheadBill(){
  return { id: nextOverheadBillId++, date: isoForMonth(), name: "", amount: 0 };
}

function overheadBillHasData(b){
  if (!b) return false;
  return String(b.name || "").trim() || (Number(b.amount)||0) > 0;
}

function migrateOverheadBill(b){
  if (!b || typeof b !== "object") return blankOverheadBill();
  return {
    id: b.id || nextOverheadBillId++,
    date: b.date || isoForMonth(),
    name: b.name || "",
    amount: Number(b.amount) || 0
  };
}

function compactOverheadBills(list){
  var filled = asArray(list).filter(overheadBillHasData);
  return filled.length ? filled : [blankOverheadBill()];
}

function blankOverheadFixed(){
  return { id: nextOverheadFixedId++, name: "", amount: 0 };
}

function overheadFixedHasData(b){
  if (!b) return false;
  return String(b.name || "").trim() || (Number(b.amount)||0) > 0;
}

function migrateOverheadFixed(b){
  if (!b || typeof b !== "object") return blankOverheadFixed();
  return {
    id: b.id || nextOverheadFixedId++,
    name: b.name || "",
    amount: Number(b.amount) || 0
  };
}

function compactOverheadFixed(list){
  var filled = asArray(list).filter(overheadFixedHasData);
  return filled.length ? filled : [blankOverheadFixed()];
}

function migrateLump(p){
  if (!p || typeof p !== "object") return blankLump();
  return {
    id: p.id || nextLumpId++,
    date: p.date || isoToday(),
    place: p.place || "",
    note: p.note || "",
    amount: Number(p.amount) || 0
  };
}

function ingredientHasData(i){
  if (!i) return false;
  if (String(i.name || "").trim()) return true;
  return (i.purchases || []).some(function(p){
    return String(p.place || "").trim() || (Number(p.qty)||0) > 0 || (Number(p.packs)||0) > 0 || (Number(p.unitPrice)||0) > 0 || (Number(p.amount)||0) > 0;
  });
}

function compactIngredients(list){
  var kept = [];
  CAT_ORDER.forEach(function(cat){
    var items = list.filter(function(i){ return i.cat === cat; });
    var filled = items.filter(ingredientHasData);
    if (filled.length) kept = kept.concat(filled);
    else kept.push(blankIngredient(cat));
  });
  return kept;
}

function migratePurchase(p){
  if (!p || typeof p !== "object") return blankPurchase();
  var qty = Number(p.qty) || 0;
  var packs = Number(p.packs) || 0;
  var unitPrice = Number(p.unitPrice);
  var amount = Number(p.amount);
  if (!isFinite(unitPrice) || unitPrice < 0){
    var total = Number(p.total) || 0;
    unitPrice = qty > 0 ? total / qty : 0;
  }
  if (!isFinite(amount) || amount < 0) amount = 0;
  var q = packs > 0 ? packs * qty : qty;
  if (packs > 1 && qty > 0 && amount > 0 && Math.abs((Number(unitPrice)||0) * qty - amount) < 1){
    unitPrice = amount / q;
  }
  if (!amount && q && unitPrice) amount = q * unitPrice;
  if (!unitPrice && q && amount) unitPrice = amount / q;
  return {
    id: p.id || nextPurchaseId++,
    date: p.date || isoToday(),
    place: p.place || "",
    packs: packs,
    qty: qty,
    unitPrice: niceNum(unitPrice),
    amount: niceNum(amount)
  };
}

function migrateIngredient(i){
  if (!i) return blankIngredient("veg");
  var unit = i.unit || defaultUnit(i.cat);
  var purchases;
  if (Array.isArray(i.purchases) && i.purchases.length){
    purchases = i.purchases.map(migratePurchase);
  } else if (i.purchases && typeof i.purchases === "object"){
    purchases = asArray(i.purchases).map(migratePurchase);
    if (!purchases.length) purchases = [blankPurchase()];
  } else {
    var amount = Number(i.amount) || 0;
    purchases = amount > 0
      ? [{ id: nextPurchaseId++, date: isoToday(), place: "", packs: 0, qty: 1, unitPrice: amount, amount: amount }]
      : [blankPurchase()];
  }
  return { id: i.id || nextIngId++, cat: migrateCat(i.cat), name: i.name || "", unit: unit, purchases: purchases };
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
    lumps: [blankLump()],
    assets: ASSET_ORDER.map(function(c){ return blankAsset(c); }),
    laborShifts: [blankLaborShift()],
    laborSalaries: [blankLaborSalary()],
    overheadBills: [blankOverheadBill()],
    overheadFixedItems: [blankOverheadFixed()],
    dayArchive: {},
    days: blankDaysForMonth(year, month)
  };
}

function normalizeParsedState(parsed){
  if (!parsed || typeof parsed !== "object") return defaultState();
  var year = Number(parsed.year) || today().getFullYear();
  var month = Number(parsed.month) || (today().getMonth()+1);
  parsed.year = year;
  parsed.month = month;
  parsed.days = normalizeDays(parsed.days, year, month);
  var list = asArray(parsed.ingredients);
  var maxIng = 0, maxPur = 0;
  list.forEach(function(i){
    if (i && i.id > maxIng) maxIng = i.id;
  });
  nextIngId = maxIng + 1;
  parsed.ingredients = compactIngredients(list.map(migrateIngredient));
  parsed.ingredients.forEach(function(i){
    if (i && i.id > maxIng) maxIng = i.id;
    (i.purchases || []).forEach(function(p){ if (p && p.id > maxPur) maxPur = p.id; });
  });
  nextIngId = maxIng + 1;
  nextPurchaseId = maxPur + 1;
  var maxLump = 0;
  var lumps = asArray(parsed.lumps).map(migrateLump);
  lumps.forEach(function(p){ if (p && p.id > maxLump) maxLump = p.id; });
  nextLumpId = maxLump + 1;
  parsed.lumps = lumps.length ? lumps : [blankLump()];
  var maxAsset = 0;
  var assets = asArray(parsed.assets).map(migrateAsset);
  assets.forEach(function(a){ if (a && a.id > maxAsset) maxAsset = a.id; });
  nextAssetId = maxAsset + 1;
  parsed.assets = compactAssets(assets);
  parsed.assets.forEach(function(a){ if (a && a.id > maxAsset) maxAsset = a.id; });
  nextAssetId = maxAsset + 1;
  var maxShift = 0, maxSalary = 0;
  var shifts = asArray(parsed.laborShifts).map(migrateLaborShift);
  shifts.forEach(function(s){ if (s && s.id > maxShift) maxShift = s.id; });
  nextLaborShiftId = maxShift + 1;
  parsed.laborShifts = compactLaborShifts(shifts);
  parsed.laborShifts.forEach(function(s){ if (s && s.id > maxShift) maxShift = s.id; });
  nextLaborShiftId = maxShift + 1;
  var salaries = asArray(parsed.laborSalaries).map(migrateLaborSalary);
  salaries.forEach(function(s){ if (s && s.id > maxSalary) maxSalary = s.id; });
  nextLaborSalaryId = maxSalary + 1;
  parsed.laborSalaries = compactLaborSalaries(salaries);
  parsed.laborSalaries.forEach(function(s){ if (s && s.id > maxSalary) maxSalary = s.id; });
  nextLaborSalaryId = maxSalary + 1;
  var maxBill = 0;
  var bills = asArray(parsed.overheadBills).map(migrateOverheadBill);
  bills.forEach(function(b){ if (b && b.id > maxBill) maxBill = b.id; });
  nextOverheadBillId = maxBill + 1;
  parsed.overheadBills = compactOverheadBills(bills);
  parsed.overheadBills.forEach(function(b){ if (b && b.id > maxBill) maxBill = b.id; });
  nextOverheadBillId = maxBill + 1;
  var maxFix = 0;
  var fixedItems = asArray(parsed.overheadFixedItems).map(migrateOverheadFixed);
  if (!fixedItems.some(overheadFixedHasData) && (Number(parsed.overheadFixedMonthly)||0) > 0){
    var seeded = blankOverheadFixed();
    seeded.name = "Fixed overhead";
    seeded.amount = Number(parsed.overheadFixedMonthly);
    fixedItems = [seeded];
  }
  fixedItems.forEach(function(b){ if (b && b.id > maxFix) maxFix = b.id; });
  nextOverheadFixedId = maxFix + 1;
  parsed.overheadFixedItems = compactOverheadFixed(fixedItems);
  parsed.overheadFixedItems.forEach(function(b){ if (b && b.id > maxFix) maxFix = b.id; });
  nextOverheadFixedId = maxFix + 1;
  if (!parsed.meta) parsed.meta = { name:"", subtitle:"" };
  parsed.overheadFixedMonthly = Number(parsed.overheadFixedMonthly)||0;
  parsed.overheadVariableRate = Number(parsed.overheadVariableRate)||0;
  if (!parsed.dayArchive || typeof parsed.dayArchive !== "object") parsed.dayArchive = {};
  Object.keys(parsed.dayArchive).forEach(function(k){
    var parts = String(k).split("-");
    var y = Number(parts[0]), m = Number(parts[1]);
    if (y && m) parsed.dayArchive[k] = normalizeDays(parsed.dayArchive[k], y, m);
  });
  parsed.dayArchive[monthKey(year, month)] = parsed.days;
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
  if (asArray(s.ingredients).some(function(i){
    if (!i) return false;
    if (String(i.name || "").trim()) return true;
    return asArray(i.purchases).some(function(p){
      if (!p) return false;
      return String(p.place || "").trim() || (Number(p.qty)||0) > 0 || (Number(p.packs)||0) > 0 || (Number(p.unitPrice)||0) > 0 || (Number(p.amount)||0) > 0;
    });
  })) return true;
  if (asArray(s.lumps).some(function(p){
    if (!p) return false;
    return String(p.place || "").trim() || String(p.note || "").trim() || (Number(p.amount)||0) > 0;
  })) return true;
  if (asArray(s.assets).some(assetHasData)) return true;
  if (asArray(s.laborShifts).some(laborShiftHasData)) return true;
  if (asArray(s.laborSalaries).some(laborSalaryHasData)) return true;
  if (asArray(s.overheadBills).some(overheadBillHasData)) return true;
  if (asArray(s.overheadFixedItems).some(overheadFixedHasData)) return true;
  if (s.days){
    var keys = Object.keys(s.days);
    for (var i = 0; i < keys.length; i++){
      var d = s.days[keys[i]];
      if (!d) continue;
      if (d.vacation) return true;
      if ((Number(d.sales) || 0) > 0 || (Number(d.labor) || 0) > 0 || (Number(d.cogsPct) || 0) > 0) return true;
    }
  }
  if (s.dayArchive && typeof s.dayArchive === "object"){
    var monthKeys = Object.keys(s.dayArchive);
    for (var a = 0; a < monthKeys.length; a++){
      var monthDays = s.dayArchive[monthKeys[a]];
      if (!monthDays) continue;
      var dayKeys = Object.keys(monthDays);
      for (var b = 0; b < dayKeys.length; b++){
        var rec = monthDays[dayKeys[b]];
        if (!rec) continue;
        if (rec.vacation) return true;
        if ((Number(rec.sales) || 0) > 0 || (Number(rec.labor) || 0) > 0 || (Number(rec.cogsPct) || 0) > 0) return true;
      }
    }
  }
  return false;
}

function statesDiffer(a, b){
  try { return JSON.stringify(a) !== JSON.stringify(b); } catch(e){ return true; }
}

function saveState(){
  if (STATE && STATE.year && STATE.days) stashDays(STATE.year, STATE.month, STATE.days);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch(e){}
  if (typeof scheduleCloudSave === "function") scheduleCloudSave();
}

var STATE = loadState();
