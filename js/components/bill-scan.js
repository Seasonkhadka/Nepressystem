/**
 * components/bill-scan.js — "Add a bill from a photo" on the Raw Materials tab.
 *
 * Flow: pick/take a photo → free OCR in the browser (Tesseract.js, Korean + English,
 * nothing is uploaded to a server of ours) → parseBillText() guesses date, store and
 * item lines → you check/fix every line → each line becomes a purchase on the matching
 * Raw Materials item (or a new item in the chosen category).
 *
 * Saved data shape is unchanged: lines become normal ingredient purchases.
 * Depends on: data.js (CAT_META, CAT_ORDER, defaultUnit), dom-utils.js (el, esc,
 * ingredientNameKey, asArray), state.js (STATE, blankIngredient, blankPurchase, isoForMonth),
 * format.js (won), raw-materials.js (renderRawMaterialsTab), main.js (refreshDerived).
 */

var TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
var BILL_OCR_LANGS = "kor+eng";

/** Review state survives Raw Materials re-renders. */
var BILL_SCAN = { busy: false, status: "", lines: null, date: "", place: "", billTotal: 0, rawText: "", nextLineId: 1 };

/* ── Parsing (pure; no DOM) ───────────────────────────────────────────── */

var BILL_SKIP_RE = /(합\s*계|총\s*액|총\s*금\s*액|소\s*계|부\s*가\s*세|과\s*세|면\s*세|공\s*급\s*가|결\s*제|카\s*드|현\s*금|거\s*스\s*름|받\s*을|받\s*은|승\s*인|사업자|대표|전\s*화|주\s*소|영\s*수\s*증|할\s*인|포인트|잔\s*액|일\s*시|가맹|단말|번호|매출|교환|환불|품\s*명|단\s*가|수\s*량|금\s*액|\btel\b|\bvat\b|\btotal\b|\bsubtotal\b|\bcash\b|\bcard\b|\bchange\b|\btax\b|\bdate\b|\bqty\b|\bprice\b|\bamount\b)/i;
var BILL_TOTAL_RE = /(합\s*계|총\s*액|총\s*금\s*액|결\s*제\s*금\s*액|받\s*을\s*금\s*액|\btotal\b)/i;
var BILL_LETTER_RE = /[A-Za-zㄱ-ㆎ가-힣]/;

var BILL_CAT_WORDS = {
  meat: ["고기", "돼지", "삼겹", "목살", "갈비", "앞다리", "뒷다리", "등심", "안심", "소고기", "쇠고기", "한우", "우육", "돈육", "닭", "계육", "오리", "양고기", "베이컨", "햄", "소시지",
         "beef", "pork", "chicken", "lamb", "mutton", "goat", "meat", "bacon", "sausage", "ham"],
  veg: ["양파", "마늘", "대파", "쪽파", "파", "배추", "무", "감자", "고구마", "당근", "고추", "청양", "피망", "파프리카", "상추", "깻잎", "버섯", "호박", "오이", "토마토", "생강", "양배추", "시금치", "콩나물", "숙주", "부추", "가지", "레몬", "라임", "고수", "채소", "야채",
        "onion", "garlic", "potato", "tomato", "carrot", "cabbage", "chili", "chilli", "pepper", "ginger", "coriander", "cilantro", "lettuce", "mushroom", "cucumber", "spinach", "lemon", "lime", "vegetable"],
  drinks: ["콜라", "사이다", "맥주", "소주", "막걸리", "와인", "주스", "음료", "생수", "탄산", "환타", "스프라이트", "펩시", "커피", "에이드",
           "cola", "coke", "pepsi", "sprite", "fanta", "beer", "soju", "wine", "juice", "water", "soda", "drink"],
  outside: ["봉투", "비닐", "냅킨", "휴지", "티슈", "용기", "포장", "랩", "호일", "장갑", "젓가락", "숟가락", "수저", "컵", "빨대", "세제", "행주", "수세미", "종이",
            "bag", "napkin", "tissue", "foil", "wrap", "glove", "container", "cup", "straw", "detergent", "chopstick", "spoon", "box"]
};

function billNum(tok){
  var t = String(tok).replace(/원$/, "");
  if (/^\d{1,3}([,.]\d{3})+$/.test(t)) return Number(t.replace(/[,.]/g, ""));
  return parseFloat(t.replace(/,/g, "")) || 0;
}

function billGuessCat(name){
  var n = String(name || "").toLowerCase();
  var order = ["meat", "drinks", "outside", "veg"];
  for (var i = 0; i < order.length; i++){
    var words = BILL_CAT_WORDS[order[i]];
    for (var j = 0; j < words.length; j++){
      var w = words[j];
      if (/^[a-z]+$/.test(w) ? new RegExp("\\b" + w).test(n) : n.indexOf(w) >= 0) return order[i];
    }
  }
  return "kitchen";
}

/** Turn the trailing numbers of a line into { qty, unitPrice, amount }. */
function billInterpretNumbers(nums){
  var a, b, c;
  if (nums.length >= 3){
    a = nums[nums.length - 3]; b = nums[nums.length - 2]; c = nums[nums.length - 1];
    if (c > 0 && Math.abs(a * b - c) <= Math.max(10, c * 0.02)){
      var q = Math.min(a, b), p = Math.max(a, b);
      return { qty: q, unitPrice: p, amount: c };
    }
    var q2 = b > 0 && b < 1000 ? b : 1;
    return { qty: q2, unitPrice: c / q2, amount: c };
  }
  if (nums.length === 2){
    a = nums[0]; b = nums[1];
    if (a > 0 && a < 1000 && b >= 100) return { qty: a, unitPrice: b / a, amount: b };
    if (a > 0 && b % a === 0 && b / a < 1000) return { qty: b / a, unitPrice: a, amount: b };
    return { qty: 1, unitPrice: b, amount: b };
  }
  a = nums[0] || 0;
  return { qty: 1, unitPrice: a, amount: a };
}

function billFindDate(text){
  var m = text.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
  var y, mo, d;
  if (m){ y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = text.match(/(?:^|[^\d])(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})(?![\d])/);
    if (m){ y = 2000 + (+m[1]); mo = +m[2]; d = +m[3]; }
  }
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return y + "-" + (mo < 10 ? "0" : "") + mo + "-" + (d < 10 ? "0" : "") + d;
}

/**
 * Read OCR text → { date, place, billTotal, lines:[{ name, qty, unitPrice, amount, cat }] }.
 * Heuristic: an item line ends in 1–3 numbers (₩/pack, qty, total in any of the usual orders).
 * A name on its own line followed by a numbers-only line (barcode receipts) is joined.
 */
function parseBillText(text){
  var raw = String(text || "").replace(/\r/g, "");
  var rows = raw.split("\n").map(function(l){ return l.replace(/[|_~`'"“”‘’]/g, " ").replace(/\s+/g, " ").trim(); })
    .filter(function(l){ return l.length; });
  var out = { date: billFindDate(raw), place: "", billTotal: 0, lines: [] };

  for (var i = 0; i < Math.min(rows.length, 5); i++){
    var r = rows[i];
    var letters = (r.match(new RegExp(BILL_LETTER_RE.source, "g")) || []).length;
    if (letters >= 2 && !BILL_SKIP_RE.test(r) && !/\d{3,}/.test(r)){ out.place = r.slice(0, 40); break; }
  }

  var pendingName = "";
  rows.forEach(function(line){
    var l = line.replace(/\b\d{8,14}\b/g, " ")          // barcodes
      .replace(/^\s*[*#]+\s*/, "")
      .replace(/^\s*\d{1,3}[.)]?\s+(?=\D)/, "")          // line number
      .replace(/\s+/g, " ").trim();
    if (!l){ return; }
    if (BILL_TOTAL_RE.test(l)){
      var tn = l.match(/\d{1,3}(?:[,.]\d{3})+|\d{3,}/g);
      if (tn && !out.billTotal) out.billTotal = billNum(tn[tn.length - 1]);
      pendingName = "";
      return;
    }
    if (BILL_SKIP_RE.test(l) || billFindDate(l) || /\b\d{1,2}:\d{2}\b/.test(l) || l === out.place){ pendingName = ""; return; }
    var m = l.match(/^(.*?)((?:\s+\d[\d,.]*\s*원?)+)\s*$/) || (/^\d[\d,.\s원]*$/.test(l) ? [l, "", " " + l] : null);
    if (!m){
      if (BILL_LETTER_RE.test(l)) pendingName = l; else pendingName = "";
      return;
    }
    var name = m[1].trim();
    if (!BILL_LETTER_RE.test(name)){
      if (!pendingName) return;
      name = pendingName;
    }
    pendingName = "";
    var nums = m[2].trim().split(/\s+/).map(billNum).filter(function(n){ return n > 0; });
    if (!nums.length) return;
    var v = billInterpretNumbers(nums);
    if (!(v.amount >= 10)) return;
    name = name.replace(/[\s\-:.,]+$/, "").trim();
    if (!name) return;
    out.lines.push({ name: name, qty: v.qty, unitPrice: Math.round(v.unitPrice), amount: Math.round(v.amount), cat: billGuessCat(name) });
  });
  return out;
}

/* ── Matching existing Raw Materials items ────────────────────────────── */

function billNameKey(n){ return ingredientNameKey(n).replace(/\s+/g, ""); }

/** Allowed typos: none for very short names (양파 ≠ 대파), 1 from 4 letters, 2 from 8. */
function billTypoLimit(len){ return len >= 8 ? 2 : (len >= 4 ? 1 : 0); }

/**
 * How close a bill name is to an existing item name (lower = closer, null = no match):
 *   0        exact (ignoring spaces / case)
 *   1.x      one name contains the other ("삼겹살" ↔ "국내산 삼겹살 500g"), shorter ≥ 2 letters
 *   2 + n    n small spelling mistakes (see billTypoLimit)
 */
function billNameScore(billKey, itemKey){
  if (!billKey || !itemKey) return null;
  if (billKey === itemKey) return 0;
  var shortK = billKey.length <= itemKey.length ? billKey : itemKey;
  var longK = shortK === billKey ? itemKey : billKey;
  if (shortK.length >= 2 && longK.indexOf(shortK) >= 0) return 1 + (longK.length - shortK.length) / 1000;
  var d = levenshteinDistance(billKey, itemKey);
  if (d <= billTypoLimit(Math.min(billKey.length, itemKey.length))) return 2 + d;
  // Typo inside a longer name: "sunfoweroil18l" ↔ "sunfloweroil"
  var lim = billTypoLimit(shortK.length);
  if (lim > 0){
    var bestD = Infinity;
    for (var w = shortK.length - lim; w <= shortK.length + lim; w++){
      for (var s = 0; s + w <= longK.length; s++){
        var dd = levenshteinDistance(shortK, longK.substr(s, w));
        if (dd < bestD) bestD = dd;
      }
    }
    if (bestD <= lim) return 3 + bestD + (longK.length - shortK.length) / 1000;
  }
  return null;
}

/** Closest existing ingredient (exact, then longer/shorter name, then small typo); prefers `cat`. */
function billMatchIngredient(name, cat){
  var key = billNameKey(name);
  if (!key) return null;
  var best = null, bestScore = Infinity;
  asArray(STATE.ingredients).forEach(function(i){
    var sc = billNameScore(key, billNameKey(i.name));
    if (sc == null) return;
    if (i.cat !== cat) sc += 0.5;                                  // same category wins a tie
    sc -= Math.min(asArray(i.purchases).length, 50) / 100000;       // then the most-used item
    if (sc < bestScore){ bestScore = sc; best = i; }
  });
  return best;
}

function billPrepareLines(parsed){
  return parsed.lines.map(function(l){
    var match = billMatchIngredient(l.name, l.cat);
    return { id: BILL_SCAN.nextLineId++, use: true, name: match ? match.name : l.name, cat: match ? match.cat : l.cat,
      qty: l.qty, unitPrice: l.unitPrice, amount: l.amount };
  });
}

/* ── Rendering ─────────────────────────────────────────────────────────── */

function billCatSelectHtml(cur){
  return '<select class="cell-input" data-bill-field="cat">'+
    CAT_ORDER.map(function(c){ return '<option value="'+c+'"'+(c === cur ? " selected" : "")+'>'+CAT_META[c].label+'</option>'; }).join("")+
  '</select>';
}

function billMatchText(l){
  if (!String(l.name || "").trim()) return "";
  var m = billMatchIngredient(l.name, l.cat);
  if (m && m.cat === l.cat) return "→ existing “" + m.name + "”";
  if (m) return "new item (similar “" + m.name + "” is in " + CAT_META[m.cat].label + ")";
  return "new item";
}

function billLineRowHtml(l){
  return '<tr data-bill-line="'+l.id+'">'+
    '<td><input type="checkbox" data-bill-field="use"'+(l.use ? " checked" : "")+' aria-label="Add this line"></td>'+
    '<td><input class="cell-input text" type="text" list="bill-name-list" data-bill-field="name" value="'+esc(l.name)+'"></td>'+
    '<td>'+billCatSelectHtml(l.cat)+'</td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="0.01" data-bill-field="qty" value="'+(l.qty || "")+'"></td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="1" data-bill-field="unitPrice" value="'+(l.unitPrice || "")+'"></td>'+
    '<td class="raw-num"><input class="cell-input" type="number" min="0" step="10" data-bill-field="amount" value="'+(l.amount || "")+'"></td>'+
    '<td class="bill-match" data-bill-match>'+esc(billMatchText(l))+'</td>'+
    '<td class="raw-actions"><button class="icon-btn" type="button" data-bill-remove="'+l.id+'" title="Remove line">×</button></td>'+
  '</tr>';
}

function billTotalsText(){
  var lines = asArray(BILL_SCAN.lines).filter(function(l){ return l.use; });
  var sum = lines.reduce(function(s, l){ return s + (Number(l.amount) || 0); }, 0);
  var t = lines.length + ' line'+(lines.length === 1 ? "" : "s")+' checked · <b class="tnum">'+won(sum)+'</b>';
  if (BILL_SCAN.billTotal > 0){
    var diff = BILL_SCAN.billTotal - sum;
    t += ' · bill total read as <b class="tnum">'+won(BILL_SCAN.billTotal)+'</b>'+
      (Math.abs(diff) < 1 ? ' ✓' : ' <span style="color:var(--warning-dot)">(difference '+won(Math.abs(diff))+' — check the lines)</span>');
  }
  return t;
}

function billScanHtml(){
  var s = BILL_SCAN;
  var head = '<div class="raw-cat-head"><h2>Add a bill from a photo</h2></div>'+
    '<p class="raw-hint">Take or choose a photo of an itemized receipt. It is read on this phone/computer with free text recognition (Korean + English) — '+
    'check every line before adding. Flat, bright, straight photos read best.</p>';
  var picker = '<div class="bill-pick">'+
      '<label class="add-row-btn bill-file-btn">'+(s.busy ? "Reading…" : "📷 Choose bill photo")+
        '<input type="file" accept="image/*" data-bill-file hidden'+(s.busy ? " disabled" : "")+'></label>'+
      (s.status ? '<span class="note" data-bill-status>'+s.status+'</span>' : '<span class="note" data-bill-status></span>')+
    '</div>';
  if (!s.lines) return '<section class="card bill-scan">'+head+picker+'</section>';

  var names = {};
  asArray(STATE.ingredients).forEach(function(i){ var n = String(i.name || "").trim(); if (n) names[n] = 1; });
  var datalist = '<datalist id="bill-name-list">'+Object.keys(names).sort().map(function(n){ return '<option value="'+esc(n)+'">'; }).join("")+'</datalist>';

  return '<section class="card bill-scan">'+head+picker+datalist+
    '<div class="bill-meta">'+
      '<label>Date <input class="cell-input" type="date" data-bill-meta="date" value="'+esc(s.date)+'"></label>'+
      '<label>Place <input class="cell-input text" type="text" data-bill-meta="place" value="'+esc(s.place)+'" placeholder="Store"></label>'+
    '</div>'+
    (s.lines.length ? "" : '<p class="note">No item lines found. Add them by hand below, or try a clearer photo.</p>')+
    '<div class="table-wrap"><table class="raw-table bill-table"><thead><tr>'+
      '<th></th><th>Item</th><th>Category</th><th>Packs</th><th>₩/pack</th><th>Total</th><th></th><th></th>'+
    '</tr></thead><tbody>'+s.lines.map(billLineRowHtml).join("")+'</tbody></table></div>'+
    '<button class="add-row-btn" type="button" data-bill-add-line>+ Add line</button>'+
    '<p class="note" data-bill-totals>'+billTotalsText()+'</p>'+
    '<div class="bill-actions">'+
      '<button class="btn-primary" type="button" data-bill-save>Add checked lines to Raw Materials</button>'+
      '<button class="btn-ghost" type="button" data-bill-cancel>Cancel</button>'+
    '</div>'+
    '<details class="bill-raw"><summary>Text the app read</summary><pre>'+esc(s.rawText)+'</pre></details>'+
  '</section>';
}

/** Called by renderRawMaterialsTab() after it fills the tab. */
function renderBillScan(){
  var host = el("bill-scan-host");
  if (host) host.innerHTML = billScanHtml();
}

/* ── OCR ──────────────────────────────────────────────────────────────── */

function billLoadTesseract(){
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (billLoadTesseract._p) return billLoadTesseract._p;
  billLoadTesseract._p = new Promise(function(resolve, reject){
    var sc = document.createElement("script");
    sc.src = TESSERACT_SRC;
    sc.onload = function(){ window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR library did not load")); };
    sc.onerror = function(){ billLoadTesseract._p = null; reject(new Error("Could not download the OCR library (are you online?)")); };
    document.head.appendChild(sc);
  });
  return billLoadTesseract._p;
}

/** Grayscale + upscale small photos: noticeably better OCR on receipts. */
function billPrepareImage(file){
  return new Promise(function(resolve){
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function(){
      try {
        var scale = Math.min(2.5, Math.max(1, 1600 / img.width));
        if (img.width * scale > 2600) scale = 2600 / img.width;
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        var ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, c.width, c.height);
        var d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
        for (var i = 0; i < px.length; i += 4){
          var g = 0.299 * px[i] + 0.587 * px[i+1] + 0.114 * px[i+2];
          g = Math.max(0, Math.min(255, (g - 128) * 1.4 + 128));
          px[i] = px[i+1] = px[i+2] = g;
        }
        ctx.putImageData(d, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c);
      } catch (e){ URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = function(){ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function billSetStatus(text){
  BILL_SCAN.status = text;
  var n = document.querySelector("[data-bill-status]");
  if (n) n.textContent = text;
}

function billReadFile(file){
  if (!file || BILL_SCAN.busy) return;
  BILL_SCAN.busy = true;
  billSetStatus("Loading reader (first time downloads Korean data, ~15 MB)…");
  renderBillScan();
  var worker = null;
  billLoadTesseract().then(function(T){
    return T.createWorker(BILL_OCR_LANGS, 1, {
      logger: function(m){
        if (m && m.status === "recognizing text") billSetStatus("Reading bill… " + Math.round((m.progress || 0) * 100) + "%");
        else if (m && m.status) billSetStatus("Preparing: " + m.status + "…");
      }
    });
  }).then(function(w){
    worker = w;
    return billPrepareImage(file);
  }).then(function(img){
    return worker.recognize(img);
  }).then(function(res){
    var text = (res && res.data && res.data.text) || "";
    var parsed = parseBillText(text);
    BILL_SCAN.rawText = text;
    BILL_SCAN.date = parsed.date || isoForMonth();
    BILL_SCAN.place = parsed.place;
    BILL_SCAN.billTotal = parsed.billTotal;
    BILL_SCAN.lines = billPrepareLines(parsed);
    BILL_SCAN.status = parsed.lines.length + " line"+(parsed.lines.length === 1 ? "" : "s")+" found — check them below." + (parsed.date ? "" : " Date not found; please set it.");
  }).catch(function(err){
    BILL_SCAN.status = "Could not read the bill: " + (err && err.message ? err.message : err);
  }).then(function(){
    BILL_SCAN.busy = false;
    if (worker) try { worker.terminate(); } catch (e) {}
    renderBillScan();
  });
}

/* ── Save ─────────────────────────────────────────────────────────────── */

function billIsBlankPurchase(p){
  return p && !(Number(p.amount) > 0) && !(Number(p.unitPrice) > 0) && !(Number(p.packs) > 0) && !(Number(p.qty) > 0);
}

/** Adds checked lines as purchases. Returns the number of lines added. */
function billSaveLines(){
  var s = BILL_SCAN;
  var date = s.date || isoForMonth();
  var added = 0;
  asArray(s.lines).forEach(function(l){
    var name = String(l.name || "").trim();
    var amount = Number(l.amount) || 0;
    if (!l.use || !name || !(amount > 0)) return;
    var cat = CAT_ORDER.indexOf(l.cat) >= 0 ? l.cat : "kitchen";
    var ing = billMatchIngredient(name, cat);
    if (!ing || ing.cat !== cat){
      ing = blankIngredient(cat);
      ing.name = name;
      STATE.ingredients.push(ing);
    }
    if (!ing.purchases) ing.purchases = [];
    var pur = null;
    for (var k = 0; k < ing.purchases.length; k++){
      if (billIsBlankPurchase(ing.purchases[k])){ pur = ing.purchases[k]; break; }
    }
    if (!pur){ pur = blankPurchase(); ing.purchases.push(pur); }
    var packs = Number(l.qty) || 0;
    pur.date = date;
    pur.place = s.place || "";
    pur.packs = packs > 0 ? packs : 1;
    pur.qty = 0;
    pur.unitPrice = Number(l.unitPrice) > 0 ? Number(l.unitPrice) : amount / pur.packs;
    pur.amount = amount;
    added += 1;
  });
  return added;
}

/* ── Events ───────────────────────────────────────────────────────────── */

function billLineById(id){
  return asArray(BILL_SCAN.lines).find(function(l){ return l.id === id; });
}

function initBillScanEvents(){
  var host = el("tab-raw");
  if (!host) return;
  host.addEventListener("change", function(e){
    var t = e.target;
    if (t.matches("[data-bill-file]")){
      var f = t.files && t.files[0];
      t.value = "";
      billReadFile(f);
    }
  });
  var onEdit = function(e){
    var t = e.target;
    if (t.matches("[data-bill-meta]")){
      BILL_SCAN[t.getAttribute("data-bill-meta")] = t.value;
      return;
    }
    if (!t.matches("[data-bill-field]")) return;
    var tr = t.closest("tr[data-bill-line]");
    var l = tr && billLineById(Number(tr.getAttribute("data-bill-line")));
    if (!l) return;
    var f = t.getAttribute("data-bill-field");
    if (f === "use") l.use = t.checked;
    else if (f === "name" || f === "cat") l[f] = t.value;
    else {
      l[f] = parseFloat(t.value) || 0;
      if (f === "qty" || f === "unitPrice"){
        if (l.qty > 0 && l.unitPrice > 0){
          l.amount = Math.round(l.qty * l.unitPrice);
          var amt = tr.querySelector('[data-bill-field="amount"]');
          if (amt) amt.value = l.amount;
        }
      }
    }
    var mt = tr.querySelector("[data-bill-match]");
    if (mt) mt.textContent = billMatchText(l);
    var tot = host.querySelector("[data-bill-totals]");
    if (tot) tot.innerHTML = billTotalsText();
  };
  host.addEventListener("input", onEdit);
  host.addEventListener("change", onEdit);
  host.addEventListener("click", function(e){
    var t = e.target;
    if (t.matches("[data-bill-remove]")){
      var id = Number(t.getAttribute("data-bill-remove"));
      BILL_SCAN.lines = asArray(BILL_SCAN.lines).filter(function(l){ return l.id !== id; });
      renderBillScan();
    } else if (t.matches("[data-bill-add-line]")){
      BILL_SCAN.lines.push({ id: BILL_SCAN.nextLineId++, use: true, name: "", cat: "kitchen", qty: 1, unitPrice: 0, amount: 0 });
      renderBillScan();
    } else if (t.matches("[data-bill-cancel]")){
      BILL_SCAN.lines = null; BILL_SCAN.status = ""; BILL_SCAN.rawText = "";
      renderBillScan();
    } else if (t.matches("[data-bill-save]")){
      var n = billSaveLines();
      var d = BILL_SCAN.date;
      var inView = purchaseInMonth({ date: d }, STATE.year, STATE.month);
      BILL_SCAN.lines = null; BILL_SCAN.rawText = "";
      BILL_SCAN.status = n ? ("Added " + n + " line" + (n === 1 ? "" : "s") + " (" + d + ")." + (inView ? "" : " That date is in another month — change the month above to see them.")) : "Nothing added (no checked lines with a total).";
      renderRawMaterialsTab();
      renderCompareTab();
      refreshDerived();
    }
  });
}
