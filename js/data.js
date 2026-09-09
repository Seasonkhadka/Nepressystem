/**
 * data.js — static reference data shared across the app.
 *
 * Category metadata, calendar name tables, and tag styling. Pure constants,
 * no dependencies. Must be the first script loaded — state.js reads
 * CAT_ORDER while building the default state.
 */

var STORAGE_KEY = "restaurant-pl-calculator-v1";

var CAT_META = {
  rice: { label: "Rice &amp; Grains", color: "var(--chart-1)" },
  meat: { label: "Meat &amp; Protein", color: "var(--chart-2)" },
  veg:  { label: "Vegetables", color: "var(--chart-3)" },
  cond: { label: "Condiments &amp; Seasonings", color: "var(--chart-4)" },
  pack: { label: "Packaging &amp; Disposables", color: "var(--chart-5)" }
};
var CAT_ORDER = ["rice", "meat", "veg", "cond", "pack"];

var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var DOW_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

var TAG_META = {
  weekday:  { label: "Weekday",  color: "var(--chart-1)" },
  weekend:  { label: "Weekend",  color: "var(--chart-2)" },
  vacation: { label: "Vacation", color: "var(--chart-3)" }
};

var UNIT_OPTIONS = ["kg", "g", "L", "ml", "ea", "bunch", "pack", "box"];

function defaultUnit(cat){
  if (cat === "cond") return "L";
  if (cat === "pack") return "ea";
  return "kg";
}
