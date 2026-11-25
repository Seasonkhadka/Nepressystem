# Nepressystem — Restaurant P&amp;L Calculator

Static web app for a Korea-based restaurant: track daily POS sales, raw materials, labor, overhead, and setup capital, then see **true monthly profit** in ₩ (KRW).

**Live:** [https://seasonkhadka.github.io/Nepressystem/](https://seasonkhadka.github.io/Nepressystem/)

After deploy, hard-refresh with the cache query in `index.html` (e.g. `?v=65`) if the UI looks stale.

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

### Sales &amp; VAT
- Enter **POS sales (VAT included)** on daily rows.
- Net sales = gross × (1 − **9.1%** VAT).
- Margins and net profit use **net sales**.

### Day tags
Each day defaults from the calendar:
- **Weekday** / **Weekend**
- Override with **Vacation** or **Closed**

**Closed / vacation** days: no labor or overhead share on that day (costs spread over **open** days).

### University breaks (auto vacation)
On P&amp;L → Daily, set Korean uni break dates **per year** (winter Dec→Feb, summer Jun→Aug).  
Days in those ranges auto-tag as vacation when mode is on. Change month/year to edit another year’s dates.

### COGS
- Full **Raw Materials** total for the month (not a typed %).
- Allocated across days by sales share.

### Depreciation (in P&amp;L)
| Category | In P&amp;L? | How |
|----------|-------------|-----|
| **Setup / equipment** | Yes | Invested ÷ **36 months** |
| **Utensils** | Yes | ÷ item life months |
| **Inventory / opening stock** | **No** | Capital only |

Depreciation lowers **net profit** (true profit). Spread across open days like overhead.

### Cash after loans &amp; monsoon
1. **Net profit** (after COGS, labor, overhead, depreciation)  
2. − **Loan payment** → **Cash after loans**  
3. **Monsoon share 15%** — only if cash after loans is **positive** (otherwise ₩0)  
4. **Left after monsoon** = cash after loans − monsoon  

**Prior-loss recovery** (planning): if earlier months are under water overall, a share is shown in **semester / working** months (deficit ÷ ~3.5 working months). **Not charged in vacation months.** Separate from monsoon.

---

## Setup &amp; assets vs P&amp;L

- **Total invested** = money already spent (inventory + setup + utensils).  
- **Memo ₩/month** on the assets table = item life reference — may differ from P&amp;L.  
- **P&amp;L depreciation / mo** = setup ÷ 36 + utensils only (inventory excluded).

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
  data.js          # constants (VAT, profit buckets, vacation helpers)
  state.js         # STATE, archives, localStorage
  compute.js       # P&amp;L, depreciation, loss carry, break-even
  format.js        # won/pct, cash guide, profit buckets UI
  events.js        # input handlers
  cloud.js         # Firebase sync
  components/      # dashboard, daily, monthly, labor, assets, …
```

Bump `?v=` on script/CSS links in `index.html` whenever you deploy so browsers pick up changes.

---

## Notes

- Figures are for **planning**, not tax or accounting advice.  
- Restaurant numbers live in the browser / your cloud account — not in git.  
- Currency: **₩ KRW** throughout.
