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
