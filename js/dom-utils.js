/**
 * dom-utils.js — tiny shared DOM helper used by every renderer.
 * No dependencies.
 */

function el(id){ return document.getElementById(id); }

function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pad2(n){ n = Number(n)||0; return (n < 10 ? "0" : "") + n; }

function isoToday(){
  var t = new Date();
  return t.getFullYear() + "-" + pad2(t.getMonth()+1) + "-" + pad2(t.getDate());
}

function purchaseInMonth(p, year, month){
  if (!p || !p.date) return false;
  var parts = String(p.date).split("-");
  return Number(parts[0]) === year && Number(parts[1]) === month;
}

function sortByName(list, key){
  return (Array.isArray(list) ? list.slice() : []).sort(function(a, b){
    return String(a[key] || "").localeCompare(String(b[key] || ""), undefined, { sensitivity: "base" });
  });
}

/** Normalized key so "Chicken" and "chicken" count as one history name. */
function ingredientNameKey(name){
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function levenshteinDistance(a, b){
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  var prev = [], cur = [], i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++){
    cur[0] = i;
    for (j = 1; j <= b.length; j++){
      var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    var swap = prev;
    prev = cur;
    cur = swap;
  }
  return prev[b.length];
}

/** True when names look like the same item (case, spacing, small typos). */
function ingredientNamesSimilar(a, b){
  var ka = ingredientNameKey(a);
  var kb = ingredientNameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  var maxLen = Math.max(ka.length, kb.length);
  if (maxLen < 3) return false;
  var d = levenshteinDistance(ka, kb);
  if (maxLen <= 5) return d <= 1;
  if (maxLen <= 10) return d <= 2;
  return d <= 3 && d / maxLen <= 0.22;
}

function findFuzzyNameGroupKey(name, unit, groups, keyFn){
  unit = unit || "unit";
  var keys = Object.keys(groups);
  for (var i = 0; i < keys.length; i++){
    var g = groups[keys[i]];
    if (g.unit !== unit) continue;
    if (ingredientNamesSimilar(g.name, name)) return keys[i];
  }
  return keyFn(name, unit);
}

function unitKind(u){
  u = String(u || "").toLowerCase();
  if (u === "kg" || u === "g") return "mass";
  if (u === "l" || u === "ml") return "vol";
  if (u === "ea" || u === "bunch" || u === "pack" || u === "box") return "count";
  return "other";
}

function unitsCompatible(a, b){
  var ka = unitKind(a), kb = unitKind(b);
  if (ka === "other" || kb === "other") return String(a || "") === String(b || "");
  return ka === kb;
}

function canonicalUnitForKind(kind){
  if (kind === "mass") return "kg";
  if (kind === "vol") return "L";
  return null;
}

function convertUnitQty(qty, fromUnit, toUnit){
  qty = Number(qty) || 0;
  if (!fromUnit || !toUnit || fromUnit === toUnit) return qty;
  if (fromUnit === "g" && toUnit === "kg") return qty / 1000;
  if (fromUnit === "kg" && toUnit === "g") return qty * 1000;
  if (fromUnit === "ml" && toUnit === "L") return qty / 1000;
  if (fromUnit === "L" && toUnit === "ml") return qty * 1000;
  return qty;
}

function buyPlanDisplayUnit(unit){
  var kind = unitKind(unit);
  return canonicalUnitForKind(kind) || unit || "kg";
}

function purchaseWeightForPlan(p, sourceUnit, displayUnit){
  var w = purchaseQty(p);
  return convertUnitQty(w, sourceUnit, displayUnit);
}

/** Merge buy-plan rows: same / similar name; kg+g and L+ml count as one item. */
function findBuyPlanGroupKey(name, unit, groups){
  unit = unit || "kg";
  var nk = ingredientNameKey(name);
  var keys = Object.keys(groups);
  for (var i = 0; i < keys.length; i++){
    var g = groups[keys[i]];
    if (ingredientNameKey(g.name) === nk && unitsCompatible(g.unit, unit)) return keys[i];
    if (ingredientNamesSimilar(g.name, name) && unitsCompatible(g.unit, unit)) return keys[i];
  }
  return nk;
}

/** Unique display names per raw-material category from all months. */
function collectIngredientNamesByCat(ingredients){
  var byCat = {};
  asArray(ingredients).forEach(function(i){
    var display = String(i.name || "").trim().replace(/\s+/g, " ");
    if (!display) return;
    var cat = i.cat;
    if (!byCat[cat]) byCat[cat] = {};
    var key = ingredientNameKey(display);
    var purchaseCount = asArray(i.purchases).length;
    var prev = byCat[cat][key];
    if (!prev || purchaseCount > prev.purchaseCount ||
        (purchaseCount === prev.purchaseCount && display.length > prev.display.length)){
      byCat[cat][key] = { display: display, purchaseCount: purchaseCount };
    }
  });
  var out = {};
  Object.keys(byCat).forEach(function(cat){
    out[cat] = Object.keys(byCat[cat]).map(function(k){ return byCat[cat][k].display; });
    out[cat].sort(function(a, b){
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  });
  return out;
}

function rawIngredientNameListId(cat){
  return "raw-name-list-" + cat;
}

/** Trim, collapse spaces, strip invisible chars for matching. */
function ingredientExactName(name){
  var s = String(name || "").trim().replace(/\s+/g, " ");
  try { s = s.normalize("NFC"); } catch (e) {}
  return s.replace(/[\u200b-\u200d\ufeff]/g, "");
}

/** Price Compare: merge similar names; kg+g / L+ml combine with qty normalized. */
function groupIngredientsForCompare(ingredients){
  var groups = {};
  asArray(ingredients).forEach(function(i){
    if (!i || i.cat === "nobill") return;
    var display = ingredientExactName(i.name);
    if (!display) return;
    var u = i.unit || defaultUnit(i.cat);
    var key = findBuyPlanGroupKey(display, u, groups);
    if (!groups[key]){
      groups[key] = {
        name: display,
        unit: buyPlanDisplayUnit(u),
        purchaseEntries: [],
        rowCount: 0,
        leaderPurchases: -1,
        cats: {}
      };
    }
    var g = groups[key];
    g.rowCount += 1;
    g.cats[i.cat] = true;
    var nPurch = asArray(i.purchases).length;
    if (nPurch > g.leaderPurchases){
      g.leaderPurchases = nPurch;
      g.name = display;
    }
    g.unit = buyPlanDisplayUnit(g.unit || u);
    asArray(i.purchases).forEach(function(p){
      g.purchaseEntries.push({ p: p, unit: u });
    });
  });
  return Object.keys(groups).map(function(k){
    var g = groups[k];
    g.purchases = g.purchaseEntries.map(function(e){ return e.p; });
    return g;
  }).sort(function(a, b){
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function ingredientCompareCategoryLabels(catsMap){
  return Object.keys(catsMap || {}).map(function(c){
    return (CAT_META[c] && CAT_META[c].label) || c;
  }).sort(function(a, b){
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

function sortByDate(list, key){
  key = key || "date";
  return (Array.isArray(list) ? list.slice() : []).sort(function(a, b){
    var da = String(a[key] || "");
    var db = String(b[key] || "");
    if (da && db) return da.localeCompare(db);
    if (da) return -1;
    if (db) return 1;
    return 0;
  });
}
