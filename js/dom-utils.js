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
