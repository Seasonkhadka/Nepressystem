/**
 * data.js — static reference data shared across the app.
 *
 * Category metadata, calendar name tables, and tag styling. Pure constants,
 * no dependencies. Must be the first script loaded — state.js reads
 * CAT_ORDER while building the default state.
 */

var STORAGE_KEY = "restaurant-pl-calculator-v1";

/** Share of VAT-inclusive (POS) sales treated as VAT — net revenue = gross × (1 − rate). */
var SALES_VAT_RATE = 0.091;

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

/** Korean university breaks (typical): winter Dec 19 – Feb 28, summer Jun – Aug 31. */
var UNI_VACATION = {
  winterStart: { month: 12, day: 19 },
  winterEnd: { month: 2, day: 28 },
  summerEnd: { month: 8, day: 31 },
  fallAccrualStart: { month: 9, day: 1 },
  fallAccrualEnd: { month: 12, day: 18 },
  springAccrualStart: { month: 3, day: 1 }
};

function migrateVacationSchedule(s){
  if (!s || typeof s !== "object") return defaultVacationSchedule();
  var start = Number(s.summerStartDay);
  return {
    mode: s.mode === "uni-kr" ? "uni-kr" : "manual",
    summerStartDay: start === 22 ? 22 : 20,
    useWinter: s.useWinter !== false,
    useSummer: s.useSummer !== false
  };
}

function defaultVacationSchedule(){
  return migrateVacationSchedule({ mode: "uni-kr", summerStartDay: 20 });
}

/** Same calendar pattern every year (2nd sem break spans Dec → Feb). */
function isWinterUniVacation(year, month, day){
  if (month === 12 && day >= UNI_VACATION.winterStart.day) return true;
  if (month === 1) return true;
  if (month === 2 && day <= UNI_VACATION.winterEnd.day) return true;
  return false;
}

function isSummerUniVacation(month, day, summerStartDay){
  summerStartDay = summerStartDay === 22 ? 22 : 20;
  if (month === 7 || month === 8) return true;
  if (month === 6 && day >= summerStartDay) return true;
  return false;
}

function isUniVacationDay(year, month, day, sch){
  sch = migrateVacationSchedule(sch);
  if (sch.mode !== "uni-kr") return false;
  if (sch.useWinter && isWinterUniVacation(year, month, day)) return true;
  if (sch.useSummer && isSummerUniVacation(month, day, sch.summerStartDay)) return true;
  return false;
}

function dayVacationFlag(rec, year, month, day, sch){
  rec = rec || {};
  sch = migrateVacationSchedule(sch || (typeof STATE !== "undefined" && STATE ? STATE.vacationSchedule : null));
  if (rec.uniVacOpen && isUniVacationDay(year, month, day, sch)) return false;
  if (isUniVacationDay(year, month, day, sch)) return true;
  return !!rec.vacation;
}

function daysBetweenMonthDay(m1, d1, m2, d2){
  var y0 = 2021;
  var start = new Date(y0, m1 - 1, d1);
  var end = new Date(y0, m2 - 1, d2);
  if (end < start) end.setFullYear(y0 + 1);
  return Math.round((end - start) / 86400000) + 1;
}

function uniVacationProfitRates(sch){
  sch = migrateVacationSchedule(sch);
  var sd = sch.summerStartDay;
  var summerDays = daysBetweenMonthDay(6, sd, 8, 31);
  var winterDays = daysBetweenMonthDay(12, 19, 2, 28);
  var springEndDay = sd - 1;
  var springAccrualDays = daysBetweenMonthDay(3, 1, 6, springEndDay);
  var fallAccrualDays = daysBetweenMonthDay(9, 1, 12, 18);
  var monthLen = 365.25 / 12;
  var vacParts = 0, vacDays = 0, accParts = 0, accDays = 0;
  if (sch.useSummer !== false){
    vacParts += 1; vacDays += summerDays;
    accParts += 1; accDays += springAccrualDays;
  }
  if (sch.useWinter !== false){
    vacParts += 1; vacDays += winterDays;
    accParts += 1; accDays += fallAccrualDays;
  }
  if (!vacParts){
    return {
      summerDays: summerDays,
      winterDays: winterDays,
      vacationMonths: PROFIT_BUCKET.vacationMonths,
      semesterAccrualMonths: PROFIT_BUCKET.semesterAccrualMonths
    };
  }
  return {
    summerDays: summerDays,
    winterDays: winterDays,
    vacationMonths: (vacDays / vacParts) / monthLen,
    semesterAccrualMonths: (accDays / accParts) / monthLen
  };
}

function uniVacationSummary(sch){
  sch = migrateVacationSchedule(sch);
  var sd = sch.summerStartDay;
  return {
    winter: "Dec 19 – Feb 28",
    summer: "Jun "+sd+" – Aug 31",
    everyYear: true
  };
}

function vacationBucketRates(sch){
  sch = migrateVacationSchedule(sch || (typeof STATE !== "undefined" && STATE ? STATE.vacationSchedule : null));
  if (sch.mode === "uni-kr"){
    var u = uniVacationProfitRates(sch);
    return {
      vacationMonths: u.vacationMonths,
      semesterAccrualMonths: u.semesterAccrualMonths,
      label: "uni"
    };
  }
  return {
    vacationMonths: PROFIT_BUCKET.vacationMonths,
    semesterAccrualMonths: PROFIT_BUCKET.semesterAccrualMonths,
    label: "manual"
  };
}

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
