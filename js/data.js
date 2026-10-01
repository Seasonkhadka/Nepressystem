/**
 * data.js — static reference data shared across the app.
 *
 * Category metadata, calendar name tables, and tag styling. Pure constants,
 * no dependencies. Must be the first script loaded — state.js reads
 * CAT_ORDER while building the default state.
 */

var STORAGE_KEY = "restaurant-pl-calculator-v1";

/** Net-profit set-asides (planning — not tax advice). */
var PROFIT_BUCKET = {
  taxRate: 0.10,
  maintRate: 0.05,
  shareRate: 0.15,
  vacationMonths: 2.5,
  semesterAccrualMonths: 3.5
};

var CAT_META = {
  meat:    { label: "Meat", color: "var(--chart-2)", lede: "" },
  kitchen: { label: "Kitchen", color: "var(--chart-1)", lede: "Oil, sauce, rice, noodles — cooking stock." },
  outside: { label: "Outside", color: "var(--chart-5)", lede: "Packaging, bags, napkins, guest supplies." },
  drinks:  { label: "Drinks", color: "var(--chart-6)", lede: "Soda, juice, beer, bottled drinks." },
  veg:     { label: "Vegetables", color: "var(--chart-3)", lede: "" },
  nobill:  { label: "No bill", color: "var(--chart-4)", lede: "No itemized receipt — type the total." }
};
var CAT_ORDER = ["meat", "kitchen", "outside", "drinks", "veg"];
var GROCERY_CATS = ["kitchen", "outside", "drinks"];

var ASSET_META = {
  inventory: { label: "Inventory", color: "var(--chart-1)", lede: "Opening stock and consumables on hand — not the monthly meat and vegetable ledger." },
  setup:     { label: "Setup cost", color: "var(--chart-4)", lede: "Equipment, contractor work, deposit, and cash float. Pick a category per row so totals stay honest." },
  utensil:   { label: "Utensils", color: "var(--chart-3)", lede: "Pots, pans, plates, knives, and long-life tools." },
  gas:       { label: "Gas & equipment", color: "var(--chart-2)", lede: "(Legacy — rows move to Setup cost on load.)" }
};
var ASSET_ORDER = ["inventory", "setup", "utensil", "gas"];
var ASSET_SECTION_ORDER = ["inventory", "setup", "utensil"];

var ASSET_ROW_CAT = {
  opening:    { label: "Opening stock & consumables", spread: false },
  equipment:  { label: "Equipment & fit-out", spread: true },
  contractor: { label: "Contractor fit-out", spread: true },
  deposit:    { label: "Refundable deposit", spread: false },
  cashfloat:  { label: "Cash float (not a cost)", spread: false }
};
var ASSET_ROW_CAT_ORDER = ["opening", "equipment", "contractor", "deposit", "cashfloat"];

var SETUP_LOAN_DEFAULTS = [
  { name: "Loan A", principal: 15421430, annualRate: 3, termMonths: 36, termNote: "assumed term" },
  { name: "Loan B", principal: 20000000, annualRate: 15, termMonths: 36, termNote: "assumed term" }
];
var SETUP_FUNDING_DEFAULT = { totalInvestedRecord: 53718450 };
var SETUP_PLAN_DEFAULT = {
  monthlySales: 15000000,
  ingPctOfSales: 35,
  rent: 2000000,
  staff: 4500000,
  utilities: 400000,
  otherFixed: 300000
};

function defaultAssetLife(cat){
  if (cat === "gas") return 60;
  if (cat === "utensil") return 24;
  if (cat === "setup") return 36;
  return 0;
}

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
  if (cat === "drinks") return "L";
  if (cat === "outside") return "ea";
  return "kg";
}

function migrateCat(cat){
  if (cat === "meat") return "meat";
  if (cat === "veg") return "veg";
  if (cat === "kitchen") return "kitchen";
  if (cat === "outside") return "outside";
  if (cat === "drinks" || cat === "drink") return "drinks";
  if (cat === "grocery" || cat === "groceries") return "kitchen";
  return "kitchen";
}
