# Nepressystem — Restaurant P&amp;L Calculator

Static web app for a Korea-based restaurant: track daily POS sales, raw materials, labor, overhead, and setup capital, then see **true monthly profit** in ₩ (KRW).

**Live:** [https://seasonkhadka.github.io/Nepressystem/](https://seasonkhadka.github.io/Nepressystem/)

After deploy, hard-refresh with the cache query in `index.html` (e.g. `?v=76`) if the UI looks stale.

---

## What it does

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Month KPIs, traffic charts, depreciation, cash / monsoon, setup capital |
| **Raw Materials** | Purchases → monthly **COGS** |
| **Labor** | Part-time shifts (by month) + salaries + fixed / variable overhead |
| **Setup & Assets** | Inventory, setup, utensils, loans, funding |
| **Price Compare / Buy plan** | Supplier / purchase planning |
| **P&amp;L** | Daily · Weekly · Monthly views |

Data saves in **localStorage**. Optional **Google sign-in** syncs the same numbers across devices (Firebase).

---

## P&amp;L rules (important)

All numbers below live in **`js/data.js`** (single source). All math lives in **`js/compute.js`**. All labels and explanations live in **`js/copy.js`**.

| Constant | Value | Meaning |
|----------|-------|---------|
| `OPENING_DATE` | 2026-09-01 | Months before this are ignored (loss carry, depreciation, month lists) |
| `VAT_RATE` | 10/110 (≈ 9.09%) | VAT share of POS sales |
| `SETUP_LIFE_MONTHS` | 36 | Setup / equipment depreciation life |
| `UTENSIL_DEFAULT_LIFE` | 24 | Utensil life when a row has none |
| `MONSOON_RATE` | 10% | Monsoon reserve |
| `RECOVERY_MONTHS` | 3.5 | Prior-loss recovery divisor (only in months without net profit) |

### Sales &amp; VAT
- Enter **POS sales (VAT included)** on daily rows.
- Net sales = POS − VAT (VAT = POS × 10/110).
- Margins and net profit use **net sales**.

### Day tags
Each day defaults from the calendar:
- **Weekday** / **Weekend**
- Override with **Vacation** or **Closed**

Fixed costs (salaries, fixed overhead, depreciation) are spread over **open** days. If a month has **no** open day, they are spread over every day, so a month that is entirely vacation still carries its rent.

A **vacation month** = at least half its days are vacation.

### University breaks (auto vacation)
On P&amp;L → Daily, set Korean uni break dates **per year** (winter Dec→Feb, summer Jun→Aug).  
Days in those ranges auto-tag as vacation when mode is on. Change month/year to edit another year’s dates.

### Net profit
```
Net sales − COGS − Labor − Overhead − Depreciation = Net profit
```
- **COGS** = this month's Raw Materials purchases, allocated across days by sales share. (Opening stock is not in COGS — known gap, separate change.)
- **Depreciation** (non-cash), from the opening month:

| Category | Depreciation |
|----------|--------------|
| Setup / equipment / contractor | line total ÷ **36 months** |
| Utensils | line total ÷ row life (default 24) |
| Inventory / opening stock, deposit, cash float | none |

- **Loans are not in net profit.** The whole monthly installment (interest + principal) is taken out right after net profit as **Loan payment**. Do not also type loans into fixed overhead.

### Where the money goes (top to bottom)
Shown under **Month at a glance** on the Dashboard and on P&L → Monthly.

```
  Net profit
+ Depreciation (not real cash out)
− Loan payment (interest + principal, the whole installment)
= Cash after loans
− Prior-loss recovery
= After prior-loss recovery
− Monsoon reserve (10% of the line above, ₩0 if not positive)
= After monsoon
− Tax bucket (10% of net profit) − Vacation bucket − Maintenance bucket (5% of net profit)
= Final money left
```

- **Prior-loss recovery** (working months after opening only):
  - month has **net profit** → the **whole** carried loss is subtracted this month
  - no net profit → carried loss ÷ 3.5
  - **₩0 in Sep 2026 (opening month)**, before opening, and in vacation months
  - Empty months (no sales/costs) do **not** invent a carried loss
- **Carried loss** (cash basis): a minus in cash after loans, or recovery that cash after loans could not cover, carries to the next month.
- Net profit is **before** prior-loss recovery, monsoon and buckets; they never change net profit.
- **VAT is not subtracted again.** It is shown as "VAT to set aside (already excluded from profit)". Vacation bucket = overhead × break months ÷ semester months.

---

## Setup &amp; assets vs P&amp;L

- **Total invested** = money already spent (inventory + setup + utensils).  
- The **Depreciation / mo** on each asset row is exactly what the P&amp;L uses. There is no second "memo" figure.  
- Loans: equal installments. Each loan has a **first payment month**. The whole installment (interest + principal) is subtracted as "Loan payment" after net profit.

---

## Run locally

No build step. Open or serve the folder:

```bash
# example
npx serve .
# or open index.html in a browser
```

For cloud sync, configure `js/firebase-config.js` and Firebase Auth + Realtime Database rules (`database.rules.json`).

---

## Project layout

```
index.html
css/style.css
js/
  data.js          # ALL business constants (VAT, lives, monsoon, recovery, opening date)
  state.js         # STATE, archives, localStorage, migrations
  compute.js       # ALL math: computeMonthPL (one month P&L), cash steps, loss carry, break-even
  format.js        # won/pct + shared UI blocks (kpiTile, formulaRow, cash steps, break-even, buckets)
  copy.js          # ALL labels, ⓘ tooltips, and the two long explanations
  events.js        # input handlers
  cloud.js         # Firebase sync
  components/      # dashboard, daily, weekly, monthly, labor, assets, …
```

Bump `?v=` on script/CSS links in `index.html` whenever you deploy so browsers pick up changes.

---

## Notes

- Figures are for **planning**, not tax or accounting advice.  
- Restaurant numbers live in the browser / your cloud account — not in git.  
- Currency: **₩ KRW** throughout.
