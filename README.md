# Nepressystem — Restaurant P&amp;L Calculator

Static web app for a Korea-based restaurant: track daily POS sales, raw materials, labor, overhead, and setup capital, then see **true monthly profit** in ₩ (KRW).

**Live:** [https://seasonkhadka.github.io/Nepressystem/](https://seasonkhadka.github.io/Nepressystem/)

After deploy, hard-refresh with the cache query in `index.html` (e.g. `?v=67`) if the UI looks stale.

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
| `MONSOON_RATE` | 15% | Monsoon reserve |
| `RECOVERY_MONTHS` | 3.5 | Prior-loss recovery divisor |

### Sales &amp; VAT
- Enter **POS sales (VAT included)** on daily rows.
- Net sales = POS − VAT (VAT = POS × 10/110).
- Margins and net profit use **net sales**.

### Day tags
Each day defaults from the calendar:
- **Weekday** / **Weekend**
- Override with **Vacation** or **Closed**

Fixed costs (salaries, fixed overhead, depreciation, loan interest) are spread over **open** days. If a month has **no** open day, they are spread over every day, so a month that is entirely vacation still carries its rent.

A **vacation month** = at least half its days are vacation.

### University breaks (auto vacation)
On P&amp;L → Daily, set Korean uni break dates **per year** (winter Dec→Feb, summer Jun→Aug).  
Days in those ranges auto-tag as vacation when mode is on. Change month/year to edit another year’s dates.

### Net profit
```
Net sales − COGS − Labor − Overhead − Depreciation − Loan interest = Net profit
```
- **COGS** = this month's Raw Materials purchases, allocated across days by sales share. (Opening stock is not in COGS — known gap, separate change.)
- **Depreciation** (non-cash), from the opening month:

| Category | Depreciation |
|----------|--------------|
| Setup / equipment / contractor | line total ÷ **36 months** |
| Utensils | line total ÷ row life (default 24) |
| Inventory / opening stock, deposit, cash float | none |

- **Loan interest** = interest part of each loan's payment for this month, from the loan's own schedule (month 1 = its **first payment month**, default 2026-09).

### Cash after loans, monsoon, recovery
1. **Cash after loans** = net profit **+ depreciation** (non-cash) **− loan principal**  
2. **Monsoon reserve** = 15% of cash after loans, only if positive (else ₩0)  
3. **Left after monsoon** = cash after loans − monsoon reserve  
4. **Prior-loss recovery** = carried loss ÷ 3.5 in **working months after opening**  
   - **₩0 in Sep 2026 (opening month)**, before opening, and in vacation months  
   - Empty months (no sales/costs) do **not** invent a carried loss  
5. **After recovery plan** = left after monsoon − prior-loss recovery  

**Carried loss** (cash basis): only months **from opening onward** that had real activity. Each month’s recovery share is paid from "left after monsoon"; any shortfall stays in the carry.

### Profit buckets (planning)
Tax 10% and maintenance 5% of positive net profit, plus a vacation bucket (overhead × break months ÷ semester months). **VAT is not subtracted again.** It is shown as "VAT to set aside (already excluded from profit)".

---

## Setup &amp; assets vs P&amp;L

- **Total invested** = money already spent (inventory + setup + utensils).  
- The **Depreciation / mo** on each asset row is exactly what the P&amp;L uses. There is no second "memo" figure.  
- Loans: equal installments. Each loan has a **first payment month**. Interest goes to the P&amp;L, and principal is subtracted only in the cash step.

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
