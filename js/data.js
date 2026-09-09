/**
 * data.js — static reference data shared across the app.
 *
 * Category metadata, calendar name tables, and tag styling. Pure constants,
 * no dependencies. Must be the first script loaded — state.js reads
 * CAT_ORDER while building the default state.
 */

var STORAGE_KEY = "restaurant-pl-calculator-v1";

var CAT_META = {
  meat:    { label: "Meat", color: "var(--chart-2)", lede: "Each cut with quantity and ₩ per unit so you can compare markets." },
  grocery: { label: "Groceries", color: "var(--chart-1)", lede: "Rice, oil, sauce, packaging, and other store items with a unit price." },
  veg:     { label: "Vegetables", color: "var(--chart-3)", lede: "Each vegetable with quantity and ₩ per unit. A second buy does not overwrite the first price." },
  nobill:  { label: "No bill", color: "var(--chart-4)", lede: "No itemized receipt — you only know where you paid and the total. Type the line total yourself. No quantity or ₩ per unit needed." }
};
var CAT_ORDER = ["meat", "grocery", "veg"];

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
  return "kg";
}

function migrateCat(cat){
  if (cat === "meat") return "meat";
  if (cat === "veg") return "veg";
  if (cat === "grocery" || cat === "groceries") return "grocery";
  return "grocery";
}
