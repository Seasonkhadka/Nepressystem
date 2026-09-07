/**
 * charts.js — hand-drawn SVG chart builders. Each function returns an SVG
 * string ready to drop into innerHTML. All are zero-safe (a blank/empty
 * dataset draws a flat chart instead of NaN/Infinity).
 *
 * Depends on: format.js (won, wonShort, pct), data.js (MONTH_ABBR),
 * state.js (STATE — trendChart labels points with the selected month).
 */

function niceCeilWon(v, step){ return v > 0 ? Math.ceil(v/step)*step : step; }
function niceCeilPct(v, step){ return v > 0 ? Math.ceil(v/step)*step : step; }

function axisWonChart(items, opts){
  opts = opts || {};
  var W=560, H=280, padL=64, padR=16, padT=26, padB=44;
  var plotW=W-padL-padR, plotH=H-padT-padB;
  var maxRaw = Math.max.apply(null, items.map(function(i){ return i.value; }).concat([0]));
  var step = opts.step || 500000;
  var niceMax = niceCeilWon(maxRaw*1.12, step);
  var gap=36;
  var barW=(plotW-(items.length-1)*gap)/items.length;
  var svg = "";
  var ticks=4;
  for (var s=0; s<=ticks; s++){
    var val = niceMax*s/ticks;
    var y = padT+plotH-(val/niceMax)*plotH;
    svg += '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="var(--hairline)" stroke-width="1"/>';
    svg += '<text x="'+(padL-10)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+wonShort(val)+'</text>';
  }
  items.forEach(function(it, idx){
    var x = padL+idx*(barW+gap);
    var barH = Math.max(0, (it.value/niceMax)*plotH);
    var y = padT+plotH-barH;
    svg += '<rect x="'+x+'" y="'+y+'" width="'+barW+'" height="'+barH+'" rx="4" fill="'+it.color+'"><title>'+it.label+': '+won(it.value)+'</title></rect>';
    svg += '<text x="'+(x+barW/2)+'" y="'+(y-9)+'" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">'+won(it.value)+'</text>';
    svg += '<text x="'+(x+barW/2)+'" y="'+(H-padB+22)+'" text-anchor="middle" font-size="12.5" fill="var(--ink-soft)">'+it.label+'</text>';
  });
  svg += '<line x1="'+padL+'" y1="'+(padT+plotH)+'" x2="'+(W-padR)+'" y2="'+(padT+plotH)+'" stroke="var(--hairline-strong)" stroke-width="1.5"/>';
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(opts.aria||"bar chart")+'" style="width:100%;height:auto;overflow:visible">'+svg+'</svg>';
}

function groupedPctChart(groups, series, opts){
  opts = opts || {};
  var W=620, H=300, padL=56, padR=16, padT=44, padB=48;
  var plotW=W-padL-padR, plotH=H-padT-padB;
  var allVals=[0]; groups.forEach(function(g){ g.values.forEach(function(v){ allVals.push(v); }); });
  var maxV = Math.max.apply(null, allVals);
  var minV = Math.min.apply(null, allVals.concat([0]));
  var step = opts.step || 0.05;
  var niceMax = niceCeilPct(maxV*1.15, step);
  var niceMin = minV < 0 ? -niceCeilPct(-minV*1.15, step) : 0;
  if (niceMax-niceMin <= 0) niceMax = step;
  var range = niceMax-niceMin;
  var zeroY = padT+plotH - ((0-niceMin)/range)*plotH;
  var svg="";
  var ticks=4;
  for (var s=0; s<=ticks; s++){
    var val = niceMin + range*s/ticks;
    var y = padT+plotH-((val-niceMin)/range)*plotH;
    svg += '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="var(--hairline)" stroke-width="1"/>';
    svg += '<text x="'+(padL-10)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+pct(val,0)+'</text>';
  }
  var groupW = plotW/groups.length;
  var barGap=6;
  var barW=(groupW-16-(series.length-1)*barGap)/series.length;
  groups.forEach(function(g, gi){
    var gx = padL+gi*groupW+8;
    g.values.forEach(function(v, si){
      var x = gx+si*(barW+barGap);
      var vy = padT+plotH-((v-niceMin)/range)*plotH;
      var top = Math.min(vy, zeroY), h = Math.abs(vy-zeroY);
      svg += '<rect x="'+x+'" y="'+top+'" width="'+barW+'" height="'+Math.max(h,1)+'" rx="3" fill="'+series[si].color+'"><title>'+series[si].label+' — '+g.label+': '+pct(v)+'</title></rect>';
    });
    svg += '<text x="'+(gx+(groupW-16)/2)+'" y="'+(H-padB+22)+'" text-anchor="middle" font-size="12.5" fill="var(--ink-soft)">'+g.label+'</text>';
  });
  svg += '<line x1="'+padL+'" y1="'+zeroY+'" x2="'+(W-padR)+'" y2="'+zeroY+'" stroke="var(--hairline-strong)" stroke-width="1.5"/>';
  var lx = padL;
  series.forEach(function(s){
    svg += '<rect x="'+lx+'" y="12" width="10" height="10" rx="2" fill="'+s.color+'"/>';
    svg += '<text x="'+(lx+14)+'" y="21" font-size="11.5" fill="var(--ink-soft)">'+s.label+'</text>';
    lx += 14+s.label.length*6.4+18;
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(opts.aria||"grouped percentage chart")+'" style="width:100%;height:auto;overflow:visible">'+svg+'</svg>';
}

function horizBarChart(items, opts){
  opts = opts || {};
  var W=560, rowH=34, padT=10, padB=30, padL=8, padR=70;
  var H = padT+padB+items.length*rowH;
  var plotW = W-padL-padR-140;
  var maxV = Math.max.apply(null, items.map(function(i){ return i.value; }).concat([0]))*1.08;
  if (maxV <= 0) maxV = 1;
  var svg="";
  items.forEach(function(it, idx){
    var y = padT+idx*rowH;
    var w = (it.value/maxV)*plotW;
    svg += '<text x="'+padL+'" y="'+(y+rowH/2+4)+'" font-size="12.5" fill="var(--ink)">'+it.label+'</text>';
    svg += '<rect x="146" y="'+(y+6)+'" width="'+plotW+'" height="'+(rowH-14)+'" rx="4" fill="var(--hairline)" opacity="0.5"/>';
    svg += '<rect x="146" y="'+(y+6)+'" width="'+Math.max(w,2)+'" height="'+(rowH-14)+'" rx="4" fill="'+it.color+'"><title>'+it.label+': '+won(it.value)+'</title></rect>';
    svg += '<text x="'+(146+plotW+10)+'" y="'+(y+rowH/2+4)+'" font-size="12.5" font-weight="700" fill="var(--ink)">'+wonShort(it.value)+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(opts.aria||"horizontal bar chart")+'" style="width:100%;height:auto;overflow:visible">'+svg+'</svg>';
}

function trendChart(days){
  var W=980, H=260, padL=56, padR=16, padT=20, padB=30;
  var plotW=W-padL-padR, plotH=H-padT-padB;
  var maxV = Math.max.apply(null, days.map(function(d){ return d.sales; }).concat([0]))*1.1;
  if (maxV <= 0) maxV = 1000000;
  var n = days.length;
  var xFor = function(i){ return n>1 ? padL + (i/(n-1))*plotW : padL+plotW/2; };
  var yFor = function(v){ return padT + plotH - (v/maxV)*plotH; };
  var svg="";
  days.forEach(function(d, i){
    if (d.tag === "weekday") return;
    var half = n>1 ? plotW/(n-1)/2 : plotW/2;
    var x0 = xFor(i)-half, x1 = xFor(i)+half;
    var fill = d.tag === "weekend" ? "var(--row-weekend)" : "var(--row-vacation)";
    svg += '<rect x="'+x0+'" y="'+padT+'" width="'+(x1-x0)+'" height="'+plotH+'" fill="'+fill+'" opacity="0.6"/>';
  });
  for (var s=0; s<=4; s++){
    var val = maxV*s/4, y = yFor(val);
    svg += '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="var(--hairline)" stroke-width="1"/>';
    svg += '<text x="'+(padL-10)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+wonShort(val)+'</text>';
  }
  var linePts = days.map(function(d,i){ return xFor(i)+","+yFor(d.sales); }).join(" ");
  var areaPts = "M"+xFor(0)+","+(padT+plotH)+" L"+linePts.split(" ").join(" L")+" L"+xFor(n-1)+","+(padT+plotH)+" Z";
  svg += '<path d="'+areaPts+'" fill="var(--chart-1)" opacity="0.14"/>';
  svg += '<polyline points="'+linePts+'" fill="none" stroke="var(--chart-1)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  days.forEach(function(d,i){
    var color = d.tag === "weekday" ? "var(--chart-1)" : (d.tag === "weekend" ? "var(--chart-2)" : "var(--chart-3)");
    svg += '<circle cx="'+xFor(i)+'" cy="'+yFor(d.sales)+'" r="4" fill="'+color+'" stroke="var(--surface)" stroke-width="1.5"><title>'+MONTH_ABBR[STATE.month-1]+' '+d.day+' ('+d.tag+'): '+won(d.sales)+'</title></circle>';
    if (d.day % 5 === 0 || d.day === 1){
      svg += '<text x="'+xFor(i)+'" y="'+(H-padB+18)+'" text-anchor="middle" font-size="10.5" fill="var(--muted)">'+d.day+'</text>';
    }
  });
  svg += '<line x1="'+padL+'" y1="'+(padT+plotH)+'" x2="'+(W-padR)+'" y2="'+(padT+plotH)+'" stroke="var(--hairline-strong)" stroke-width="1.5"/>';
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Daily sales trend" style="width:100%;height:auto;overflow:visible">'+svg+'</svg>';
}
