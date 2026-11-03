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

/** Fixed overhead applied every month until you change an amount or name. */
var DEFAULT_OVERHEAD_FIXED = [
  { name: "Rent", amount: 500000 },
  { name: "Gas", amount: 500000 },
  { name: "Electricity (1st floor)", amount: 300000 },
  { name: "Electricity (2nd floor)", amount: 1000000 }
];

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
  vacation: { label: "Vacation", color: "var(--chart-3)" },
  closed:   { label: "Closed",   color: "var(--chart-4)" }
};

/** Default uni break shape: winter Dec → Feb (next year), summer Jun → Aug. */
var UNI_VACATION = {
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
    useSummer: s.useSummer !== false,
    closesOnBreaks: s.closesOnBreaks !== false
  };
}

function defaultVacationSchedule(){
  return migrateVacationSchedule({ mode: "uni-kr", summerStartDay: 20, closesOnBreaks: true });
}

function clampDay(month, day){
  var d = Math.max(1, Math.min(31, Math.round(Number(day) || 1)));
  var max = new Date(2024, month, 0).getDate();
  return Math.min(d, max);
}

function defaultVacationDatesForYear(year, sch){
  sch = migrateVacationSchedule(sch);
  return {
    winterStartM: 12,
    winterStartD: 19,
    winterEndM: 2,
    winterEndD: 28,
    summerStartM: 6,
    summerStartD: sch.summerStartDay === 22 ? 22 : 20,
    summerEndM: 8,
    summerEndD: 31
  };
}

function migrateVacationDatesEntry(raw, year, sch){
  var d = defaultVacationDatesForYear(year, sch);
  if (!raw || typeof raw !== "object") return d;
  return {
    winterStartM: 12,
    winterStartD: clampDay(12, raw.winterStartD != null ? raw.winterStartD : d.winterStartD),
    winterEndM: 2,
    winterEndD: clampDay(2, raw.winterEndD != null ? raw.winterEndD : d.winterEndD),
    summerStartM: 6,
    summerStartD: clampDay(6, raw.summerStartD != null ? raw.summerStartD : d.summerStartD),
    summerEndM: 8,
    summerEndD: clampDay(8, raw.summerEndD != null ? raw.summerEndD : d.summerEndD)
  };
}

/** Winter Dec Y – Feb Y+1 uses stored dates under key Y. Jan/Feb use key Y−1. */
function vacationWinterYearKey(calendarYear, month){
  if (month === 1 || month === 2) return calendarYear - 1;
  return calendarYear;
}

function getVacationYearDates(yearKey, sch, map){
  map = map || (typeof STATE !== "undefined" && STATE ? STATE.vacationYearDates : null);
  var raw = map && map[String(yearKey)];
  return migrateVacationDatesEntry(raw, yearKey, sch);
}

function calendarDate(year, month, day){
  return new Date(year, month - 1, day).getTime();
}

function isWinterPeriod(calendarYear, month, day, dates){
  var yKey = vacationWinterYearKey(calendarYear, month);
  var start = calendarDate(yKey, dates.winterStartM, dates.winterStartD);
  var endY = dates.winterEndM < dates.winterStartM ? yKey + 1 : yKey;
  var end = calendarDate(endY, dates.winterEndM, dates.winterEndD);
  var cur = calendarDate(calendarYear, month, day);
  return cur >= start && cur <= end;
}

function isSummerPeriod(calendarYear, month, day, dates){
  if (month < dates.summerStartM || month > dates.summerEndM) return false;
  if (month === dates.summerStartM && day < dates.summerStartD) return false;
  if (month === dates.summerEndM && day > dates.summerEndD) return false;
  return true;
}

function isUniVacationDay(year, month, day, sch){
  sch = migrateVacationSchedule(sch);
  if (sch.mode !== "uni-kr") return false;
  if (sch.closesOnBreaks === false) return false;
  var map = typeof STATE !== "undefined" && STATE ? STATE.vacationYearDates : null;
  if (sch.useWinter){
    var wKey = vacationWinterYearKey(year, month);
    var wDates = getVacationYearDates(wKey, sch, map);
    if (isWinterPeriod(year, month, day, wDates)) return true;
  }
  if (sch.useSummer){
    var sDates = getVacationYearDates(year, sch, map);
    if (isSummerPeriod(year, month, day, sDates)) return true;
  }
  return false;
}

function dayVacationFlag(rec, year, month, day, sch){
  rec = rec || {};
  sch = migrateVacationSchedule(sch || (typeof STATE !== "undefined" && STATE ? STATE.vacationSchedule : null));
  if (rec.uniVacOpen && isUniVacationDay(year, month, day, sch)) return false;
  if (isUniVacationDay(year, month, day, sch)) return true;
  return !!rec.vacation;
}

/** Closed for P&amp;L (uni break, manual vacation, or manual closed day). */
function dayPlClosed(rec, year, month, day, sch){
  rec = rec || {};
  if (dayVacationFlag(rec, year, month, day, sch)) return true;
  return !!rec.closed;
}

function dayTagDropdownValue(rec, year, month, day, sch){
  rec = rec || {};
  sch = migrateVacationSchedule(sch);
  var inUni = isUniVacationDay(year, month, day, sch);
  if (rec.closed) return "closed";
  if (inUni && rec.uniVacOpen) return "auto";
  if (dayVacationFlag(rec, year, month, day, sch)) return "vacation";
  return "auto";
}

function applyDayTagSelect(rec, day, val, year, month, sch){
  rec = rec || {};
  sch = migrateVacationSchedule(sch);
  var inUni = isUniVacationDay(year, month, day, sch);
  rec.closed = false;
  rec.vacation = false;
  delete rec.uniVacOpen;
  if (val === "closed"){
    rec.closed = true;
  } else if (val === "vacation"){
    if (!inUni) rec.vacation = true;
  } else if (inUni){
    rec.uniVacOpen = true;
  }
  return rec;
}

function daysBetweenMonthDay(m1, d1, m2, d2){
  var y0 = 2021;
  var start = new Date(y0, m1 - 1, d1);
  var end = new Date(y0, m2 - 1, d2);
  if (end < start) end.setFullYear(y0 + 1);
  return Math.round((end - start) / 86400000) + 1;
}

function uniVacationProfitRates(sch, viewYear, map){
  sch = migrateVacationSchedule(sch);
  viewYear = Number(viewYear) || new Date().getFullYear();
  var wDates = getVacationYearDates(viewYear, sch, map);
  var sDates = getVacationYearDates(viewYear, sch, map);
  var summerDays = daysBetweenMonthDay(6, sDates.summerStartD, 8, sDates.summerEndD);
  var winterDays = daysBetweenMonthDay(12, wDates.winterStartD, 2, wDates.winterEndD);
  var springEndDay = Math.max(1, sDates.summerStartD - 1);
  var springAccrualDays = daysBetweenMonthDay(3, 1, 6, springEndDay);
  var fallEndDay = Math.max(1, wDates.winterStartD - 1);
  var fallAccrualDays = daysBetweenMonthDay(9, 1, 12, fallEndDay);
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

function uniVacationSummaryForView(viewYear, viewMonth, sch, map){
  var wKey = vacationWinterYearKey(viewYear, viewMonth);
  var w = getVacationYearDates(wKey, sch, map);
  var s = getVacationYearDates(viewYear, sch, map);
  return {
    winterKey: wKey,
    summerKey: viewYear,
    winter: "Dec "+w.winterStartD+" – Feb "+w.winterEndD+" ("+wKey+"–"+(wKey+1)+")",
    summer: "Jun "+s.summerStartD+" – Aug "+s.summerEndD+" ("+viewYear+")",
    w: w,
    s: s
  };
}

function saveVacationYearDates(yearKey, patch, sch){
  if (typeof STATE === "undefined" || !STATE) return;
  if (!STATE.vacationYearDates) STATE.vacationYearDates = {};
  var cur = getVacationYearDates(yearKey, sch, STATE.vacationYearDates);
  var next = migrateVacationDatesEntry(Object.assign({}, cur, patch), yearKey, sch);
  STATE.vacationYearDates[String(yearKey)] = {
    winterStartD: next.winterStartD,
    winterEndD: next.winterEndD,
    summerStartD: next.summerStartD,
    summerEndD: next.summerEndD
  };
}

function vacationBucketRates(sch){
  sch = migrateVacationSchedule(sch || (typeof STATE !== "undefined" && STATE ? STATE.vacationSchedule : null));
  if (sch.mode === "uni-kr"){
    var vy = typeof STATE !== "undefined" && STATE ? STATE.year : new Date().getFullYear();
    var vm = typeof STATE !== "undefined" && STATE ? STATE.vacationYearDates : null;
    var u = uniVacationProfitRates(sch, vy, vm);
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
