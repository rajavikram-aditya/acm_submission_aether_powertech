// ═══════════════════════════════════════════════════
//  CLOCK
// ═══════════════════════════════════════════════════

function updateClock() {
  const n=new Date();
  document.getElementById('clock').textContent=
    `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}  IST`;
  // Market status
  const h=n.getHours(),m=n.getMinutes();
  const mins=h*60+m;
  const mktEl=document.getElementById('mkt-status');
  if(mktEl){
    if(mins>=555&&mins<570){mktEl.textContent='PRE-OPEN';mktEl.className='pre';}
    else if(mins>=570&&mins<930){mktEl.textContent='● LIVE';mktEl.className='live';}
    else{mktEl.textContent='CLOSED';mktEl.className='closed';}
  }
}
setInterval(updateClock,1000); updateClock();

// ═══════════════════════════════════════════════════
//  TICKER
// ═══════════════════════════════════════════════════

function buildTicker() {
  const all=[...STOCKS,...INDICES.slice(0,3)];
  const html=all.map(s=>{
    const c=s.chg>=0?'up':'dn';
    const sign=s.chg>=0?'+':'';
    const p=s.val!==undefined?s.val.toLocaleString('en-IN',{minimumFractionDigits:1}):s.price.toLocaleString('en-IN',{minimumFractionDigits:2});
    return `<div class="ticker-item"><span class="ticker-sym">${s.sym}</span><span class="ticker-price">${p}</span><span class="ticker-chg ${c}">${sign}${s.chg.toFixed(2)}%</span></div>`;
  }).join('');
  document.getElementById('ts1').innerHTML=html;
  document.getElementById('ts2').innerHTML=html;
}
buildTicker();

// ═══════════════════════════════════════════════════
//  SIGNAL STREAM
// ═══════════════════════════════════════════════════

function buildStream() {
  const header = `<div class="stream-header">
    <span>SYMBOL</span><span>LTP</span><span>CHG%</span>
    <span>SPARK</span><span></span><span>VOL</span><span></span>
  </div>`;
  document.getElementById('stream-body').innerHTML = header + prices.map((s,i)=>{
    const col = s.chg >= 0 ? 'var(--green)' : 'var(--red)';
    const pct = Math.min(Math.abs(s.chg)/5,1)*100;
    const vol = formatVol(s.vol || Math.random()*9+0.5);
    return `<div class="stream-row" id="sr-${i}" style="position:relative;">
      <div class="stream-sym" id="ssym-${i}">${s.sym}</div>
      <div class="stream-price" id="sp-${i}" style="color:${col}">${fmtPrice(s.price)}</div>
      <div class="stream-chg" id="sc-${i}" style="color:${col}">${s.chg>=0?'+':''}${s.chg.toFixed(2)}%</div>
      <div class="stream-spark"><canvas id="ss-${i}" width="40" height="20"></canvas></div>
      <div class="stream-bar"><div class="stream-bar-fill" id="sb-${i}" style="width:${pct}%;background:${col}"></div></div>
      <div class="stream-vol" id="sv-${i}">${vol}</div>
      <div class="stream-alert" id="sa-${i}"></div>
    </div>`;
  }).join('');

  // Attach double-click for price alerts
  prices.forEach((s, i) => {
    const row = document.getElementById(`sr-${i}`);
    if(!row) return;
    row.addEventListener('dblclick', e => {
      e.preventDefault();
      if(row.querySelector('.price-alert-input')) return; // already open
      const inp = document.createElement('input');
      inp.className = 'price-alert-input';
      inp.placeholder = 'Target ₹';
      inp.type = 'number';
      inp.step = '0.01';
      row.appendChild(inp);
      inp.focus();
      inp.addEventListener('keydown', ev => {
        if(ev.key === 'Enter') {
          const target = parseFloat(inp.value);
          if(!isNaN(target) && target > 0) {
            setPriceAlert(i, target);
          }
          inp.remove();
        }
        if(ev.key === 'Escape') inp.remove();
      });
      inp.addEventListener('blur', () => inp.remove());
    });
  });
}
buildStream();

// ── PRICE UPDATE COUNTER — only update display every N heartbeats ──
let streamTick = 0;

function updateStream() {
  streamTick++;
  // Only visually update prices every 6 pulses = ~1.2 seconds
  // But always update internal state for Z-score continuity
  const doDisplay = (streamTick % 6 === 0);

  prices.forEach((s, i) => {
    // Realistic NSE tick: 0.005% to 0.02% move, heavily mean-reverting
    const momentum = s.momentum || 0;
    const newMomentum = momentum * 0.85 + (Math.random() - 0.502) * 0.0004;
    s.momentum = newMomentum;
    const tickPct = newMomentum + (Math.random() - 0.5) * 0.00015;
    const delta = s.price * tickPct;
    const old = s.price;
    s.price = Math.max(s.price + delta, 1);

    // Day's % change drifts very slowly — realistic intraday range ±3%
    s.chg = Math.max(-8, Math.min(8, s.chg + (Math.random() - 0.502) * 0.004));

    // Volume accumulates
    s.vol = (s.vol || 1) + Math.random() * 0.08;

    // Always push to history buffer for Z-score
    priceHistory[i].push(s.price);
    if(priceHistory[i].length > ZSCORE_WINDOW) priceHistory[i].shift();

    if(!doDisplay) return;

    const el    = document.getElementById(`sp-${i}`);
    const row   = document.getElementById(`sr-${i}`);
    const bar   = document.getElementById(`sb-${i}`);
    const chgEl = document.getElementById(`sc-${i}`);
    const volEl = document.getElementById(`sv-${i}`);
    if(!el || !row || !bar) return;

    const up = s.price >= old;
    const col = s.chg >= 0 ? 'var(--green)' : 'var(--red)';
    const tickCol = up ? 'var(--green)' : 'var(--red)';

    el.textContent = fmtPrice(s.price);
    el.style.color = tickCol;
    // Fade price back to chg colour after 600ms
    setTimeout(() => { if(el) el.style.color = col; }, 600);

    if(chgEl) { chgEl.textContent = (s.chg>=0?'+':'')+s.chg.toFixed(2)+'%'; chgEl.style.color = col; }
    if(volEl) { volEl.textContent = formatVol(s.vol); }

    row.classList.remove('flash-up','flash-dn');
    void row.offsetWidth;
    row.classList.add(up ? 'flash-up' : 'flash-dn');

    const pct = Math.min(Math.abs(s.chg)/5,1)*100;
    bar.style.width = pct+'%'; bar.style.background = col;

    // Draw mini sparkline
    drawStreamSparkline(i);

    // Check price alerts
    checkPriceAlert(i, old, s.price);
  });
}

// ═══════════════════════════════════════════════════
//  CHART
// ═══════════════════════════════════════════════════

// ── CHART CROSSHAIR STATE ──
let chartMouse = null; // {x, y} in canvas coords, or null

const CHART_PAD = {t:14, r:60, b:26, l:56};

function getChartGeometry() {
  const canvas = document.getElementById('chart-main');
  const W = canvas.width, H = canvas.height;
  const pad = CHART_PAD;
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const data = chartData;
  const min = Math.min(...data) - 30;
  const max = Math.max(...data) + 30;
  const range = max - min;
  const toX = i => pad.l + (i / (data.length - 1)) * cw;
  const toY = v => pad.t + ch - ((v - min) / range) * ch;
  const fromX = x => Math.round((x - pad.l) / cw * (data.length - 1));
  return {W, H, pad, cw, ch, data, min, max, range, toX, toY, fromX};
}

function drawChart(mouse) {
  const canvas = document.getElementById('chart-main');
  const body = document.getElementById('panel-chart').querySelector('.panel-body');
  canvas.width = body.offsetWidth;
  canvas.height = body.offsetHeight;
  const ctx = canvas.getContext('2d');
  const {W, H, pad, cw, ch, data, min, max, range, toX, toY, fromX} = getChartGeometry();

  ctx.clearRect(0, 0, W, H);

  // Grid lines + labels
  for(let r = 0; r <= 4; r++) {
    const y = pad.t + (r / 4) * ch;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
    const val = max - (r / 4) * range;
    ctx.fillStyle = 'rgba(200,210,240,0.55)';
    ctx.font = '10px IBM Plex Mono'; ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(0), pad.l - 6, y + 4);
  }

  // Area fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(90,168,255,.13)');
  grad.addColorStop(1, 'rgba(90,168,255,0)');
  ctx.beginPath();
  data.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
  ctx.lineTo(toX(data.length - 1), pad.t + ch);
  ctx.lineTo(toX(0), pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Main line
  ctx.beginPath(); ctx.strokeStyle = '#5aa8ff'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  data.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
  ctx.stroke();

  // Ghost prediction — use pre-computed stable array (no flicker)
  if(ghostData.length > 0) {
    ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(155,143,255,.4)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(toX(data.length - 1), toY(data[data.length - 1]));
    ghostData.forEach((v, i) => { ctx.lineTo(toX(data.length + i), toY(v)); });
    ctx.stroke(); ctx.restore();
  }

  // X-axis time labels
  const timeMarkers = [0, 0.25, 0.5, 0.75, 1];
  ctx.fillStyle = 'rgba(200,210,240,0.38)';
  ctx.font = '9px IBM Plex Mono'; ctx.textAlign = 'center';
  timeMarkers.forEach(t => {
    const idx = Math.round(t * (data.length - 1));
    const x = pad.l + t * cw;
    const label = indexToTime(idx, data.length);
    ctx.fillText(label, x, pad.t + ch + 17);
    // small tick
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(x, pad.t + ch); ctx.lineTo(x, pad.t + ch + 4); ctx.stroke();
  });

  // SEBI event markers — amber vertical lines pinned to chart
  const sebiMarkerPositions = [0.88, 0.74, 0.56, 0.40];
  const sebiLabels = ['SEBI-001','SEBI-002','SEBI-003','SEBI-004'];
  sebiMarkerPositions.forEach((t, si) => {
    const smx = pad.l + t * cw;
    // dashed vertical line
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(255,184,48,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(smx, pad.t + 18); ctx.lineTo(smx, pad.t + ch); ctx.stroke();
    ctx.restore();
    // dot on the price line
    const dIdx = Math.round(t * (data.length - 1));
    const dy = toY(data[dIdx]);
    ctx.beginPath(); ctx.arc(smx, dy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb830'; ctx.fill();
    // pill label
    ctx.font = 'bold 8px IBM Plex Mono';
    const lw = ctx.measureText(sebiLabels[si]).width + 8;
    const lx = Math.min(smx - lw/2, W - pad.r - lw - 2);
    const ly2 = pad.t + 20;
    ctx.fillStyle = 'rgba(255,184,48,0.15)';
    ctx.strokeStyle = 'rgba(255,184,48,0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.roundRect(lx, ly2, lw, 13, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffb830'; ctx.textAlign = 'left';
    ctx.fillText(sebiLabels[si], lx + 4, ly2 + 9);
  });

  // Current price dashed line + label (only when no crosshair)
  const last = data[data.length - 1], ly = toY(last);
  if(!mouse) {
    ctx.beginPath(); ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(90,168,255,.22)'; ctx.lineWidth = .5;
    ctx.moveTo(pad.l, ly); ctx.lineTo(pad.l + cw, ly); ctx.stroke();
    ctx.setLineDash([]);
    // right-edge price badge
    const badgeH = 16, badgeY = ly - badgeH / 2;
    ctx.fillStyle = '#5aa8ff';
    ctx.beginPath();
    ctx.roundRect(pad.l + cw + 4, badgeY, 52, badgeH, 2);
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px IBM Plex Mono'; ctx.textAlign = 'left';
    ctx.fillText(fmtPrice(last), pad.l + cw + 8, ly + 4);
  }

  // ── CROSSHAIR ──
  if(mouse) {
    const chx = mouse.x, chy = mouse.y;
    const rawIdx = fromX(chx);
    const idx = Math.max(0, Math.min(data.length - 1, rawIdx));
    const price = data[idx];
    const cx = toX(idx);
    const cy = toY(price);

    // vertical line
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, pad.t + ch); ctx.stroke();

    // horizontal line at exact price
    ctx.beginPath(); ctx.moveTo(pad.l, cy); ctx.lineTo(pad.l + cw, cy); ctx.stroke();
    ctx.restore();

    // dot on the line
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#5aa8ff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // price badge on the right Y-axis
    const badgeH = 16, badgeY = cy - badgeH / 2;
    ctx.fillStyle = '#5aa8ff';
    ctx.beginPath();
    ctx.roundRect(pad.l + cw + 4, badgeY, 52, badgeH, 2);
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px IBM Plex Mono'; ctx.textAlign = 'left';
    ctx.fillText(fmtPrice(price), pad.l + cw + 8, cy + 4);

    // price badge on the left Y-axis (mirrored)
    ctx.fillStyle = 'rgba(90,168,255,0.9)';
    ctx.beginPath();
    ctx.roundRect(2, badgeY, pad.l - 8, badgeH, 2);
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px IBM Plex Mono'; ctx.textAlign = 'right';
    ctx.fillText(fmtPrice(price), pad.l - 10, cy + 4);

    // floating tooltip above the dot — OHLC
    const open  = idx > 0 ? data[idx - 1] : price;
    const high  = Math.max(price, open) + Math.abs(price - open) * 0.45 + 2;
    const low   = Math.min(price, open) - Math.abs(price - open) * 0.45 - 2;
    const chgVal = idx > 0 ? ((price - data[0]) / data[0] * 100) : 0;
    const chgText = (chgVal >= 0 ? '+' : '') + chgVal.toFixed(2) + '%';
    const tipW = 148, tipH = 72, tipPad = 9;
    let tipX = cx + 12;
    let tipY = cy - tipH - 8;
    if(tipX + tipW > W - pad.r) tipX = cx - tipW - 12;
    if(tipY < pad.t) tipY = cy + 8;

    // tooltip background
    ctx.fillStyle = 'rgba(19,21,27,0.96)';
    ctx.strokeStyle = 'rgba(90,168,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tipX, tipY, tipW, tipH, 4);
    ctx.fill(); ctx.stroke();

    // CLOSE — big
    ctx.fillStyle = '#f0f2f8';
    ctx.font = 'bold 12px IBM Plex Mono';
    ctx.textAlign = 'left';
    ctx.fillText(fmtPrice(price), tipX + tipPad, tipY + 16);

    // % change
    ctx.fillStyle = chgVal >= 0 ? '#3de0a8' : '#ff6b6b';
    ctx.font = '10px IBM Plex Mono';
    ctx.fillText(chgText, tipX + tipPad + 80, tipY + 16);

    // OHLC rows
    const ohlcRows = [
      ['O', fmtPrice(open),  'rgba(200,210,240,0.55)'],
      ['H', fmtPrice(high),  '#3de0a8'],
      ['L', fmtPrice(low),   '#ff6b6b'],
    ];
    ohlcRows.forEach(([label, val, col], ri) => {
      const ry = tipY + 29 + ri * 14;
      ctx.fillStyle = 'rgba(100,110,140,0.7)';
      ctx.font = '9px IBM Plex Mono';
      ctx.textAlign = 'left';
      ctx.fillText(label, tipX + tipPad, ry);
      ctx.fillStyle = col;
      ctx.font = '10px IBM Plex Mono';
      ctx.fillText(val, tipX + tipPad + 14, ry);
    });

    // time stamp
    const timeLabel = indexToTime(idx, data.length);
    ctx.fillStyle = 'rgba(200,210,240,0.4)';
    ctx.font = '9px IBM Plex Mono';
    ctx.textAlign = 'right';
    ctx.fillText(timeLabel, tipX + tipW - tipPad, tipY + 16);
  }
}

// Map data index to approximate NSE session time (9:15 → 15:30)
function indexToTime(idx, total) {
  const startMin = 9 * 60 + 15;
  const endMin   = 15 * 60 + 30;
  const mins = startMin + Math.round((idx / (total - 1)) * (endMin - startMin));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function updateChart() {
  const last = chartData[chartData.length - 1];
  chartData.push(Math.max(last + (Math.random() - .495) * 18, 20000));
  if(chartData.length > 260) chartData.shift();
  // Recompute ghost once per tick — prevents flicker on mousemove
  const slice = chartData.slice(-15), trend = (slice[slice.length-1]-slice[0])/15;
  ghostData = [];
  for(let g=1;g<=20;g++) ghostData.push(chartData[chartData.length-1]+trend*g+(Math.random()-.5)*7);
  drawChart(chartMouse);
}

// ── CHART MOUSE EVENTS ──
function initChartCrosshair() {
  const canvas = document.getElementById('chart-main');
  canvas.style.cursor = 'crosshair';

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const pad = CHART_PAD;
    // Only activate crosshair within the chart plot area
    if(x >= pad.l && x <= canvas.width - pad.r && y >= pad.t && y <= canvas.height - pad.b) {
      chartMouse = {x, y};
    } else {
      chartMouse = null;
    }
    drawChart(chartMouse);
  });

  canvas.addEventListener('mouseleave', () => {
    chartMouse = null;
    drawChart(null);
  });
}

// Call after initial draw
setTimeout(initChartCrosshair, 150);

// ═══════════════════════════════════════════════════
//  ORDER BOOK
// ═══════════════════════════════════════════════════

function buildOrderBook() {
  const base=chartData[chartData.length-1];
  let html='<div class="ob-header"><span>BID QTY</span><span style="text-align:center">PRICE</span><span style="text-align:right">ASK QTY</span></div>';
  const asks=[],bids=[];
  for(let i=5;i>=1;i--) asks.push({p:(base+i*.5).toFixed(1),q:Math.floor(Math.random()*900+50)});
  for(let i=0;i<5;i++) bids.push({p:(base-i*.5).toFixed(1),q:Math.floor(Math.random()*900+50)});
  const maxQ=Math.max(...asks.map(a=>a.q),...bids.map(b=>b.q));
  html+=asks.map(a=>`<div class="ob-row"><span class="ob-bid" style="color:var(--red);text-align:left">${a.q}</span><span class="ob-price">${a.p}</span><span></span><div class="ob-bar ob-ask-bar" style="width:${(a.q/maxQ*70).toFixed(0)}%"></div></div>`).join('');
  html+=`<div class="ob-spread">SPREAD  0.5</div>`;
  html+=bids.map(b=>`<div class="ob-row"><span></span><span class="ob-price">${b.p}</span><span class="ob-qty" style="color:var(--green)">${b.q}</span><div class="ob-bar ob-bid-bar" style="width:${(b.q/maxQ*70).toFixed(0)}%"></div></div>`).join('');
  document.getElementById('ob-wrap').innerHTML=html;
}
buildOrderBook();

// ═══════════════════════════════════════════════════
//  SPARKLINES
// ═══════════════════════════════════════════════════

function buildSparklines() {
  document.getElementById('spark-wrap').innerHTML=INDICES.map((idx,i)=>{
    const col=idx.chg>=0?'var(--green)':'var(--red)';
    const sign=idx.chg>=0?'+':'';
    const v=idx.val.toLocaleString('en-IN',{minimumFractionDigits:1});
    return `<div class="spark-row">
      <div class="spark-label">${idx.sym}</div>
      <canvas class="sparkline" id="spark-${i}" height="22"></canvas>
      <div class="spark-val">${v}</div>
      <div class="spark-chg" style="color:${col}">${sign}${idx.chg.toFixed(2)}%</div>
    </div>`;
  }).join('');
  INDICES.forEach((_,i)=>drawSparkline(i));
}

function drawSparkline(i) {
  const c=document.getElementById(`spark-${i}`);
  if(!c) return;
  c.width=c.offsetWidth||80;c.height=22;
  const ctx=c.getContext('2d'),data=sparkHistory[i];
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const W=c.width,H=c.height;
  ctx.clearRect(0,0,W,H);
  ctx.beginPath();ctx.strokeStyle=INDICES[i].chg>=0?'#3de0a8':'#ff6b6b';ctx.lineWidth=1.2;
  data.forEach((v,j)=>{
    const x=(j/(data.length-1))*W,y=H-((v-min)/range)*H;
    j===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();
}

function updateSparklines() {
  INDICES.forEach((idx,i)=>{
    sparkHistory[i].push(sparkHistory[i][sparkHistory[i].length-1]+(Math.random()-.495)*(idx.val*.0015));
    if(sparkHistory[i].length>80) sparkHistory[i].shift();
    idx.chg+=(Math.random()-.5)*.02;
    const el=document.getElementById(`spark-${i}`);
    if(!el) return;
    // update value
    const parent=el.parentElement;
    const valEl=parent.querySelector('.spark-val');
    if(valEl) valEl.textContent=sparkHistory[i][sparkHistory[i].length-1].toLocaleString('en-IN',{minimumFractionDigits:1,maximumFractionDigits:1});
    drawSparkline(i);
  });
}

// ═══════════════════════════════════════════════════
//  VOL METER
// ═══════════════════════════════════════════════════

function buildVolMeter() {
  document.getElementById('vol-meter').innerHTML=VOL_ITEMS.map(item=>{
    const raw=volVals[item.key];
    const pct=item.key==='pcr'?raw/2*100:Math.min(raw/50*100,100);
    const col=pct>60?'var(--red)':pct>35?'var(--amber)':'var(--green)';
    return `<div class="vol-row">
      <div class="vol-label">${item.label}</div>
      <div class="vol-track"><div class="vol-fill" id="vf-${item.key}" style="width:${pct.toFixed(0)}%;background:${col}"></div></div>
      <div class="vol-num" id="vn-${item.key}" style="color:${col}">${raw.toFixed(2)}</div>
    </div>`;
  }).join('');
}
buildVolMeter();

function updateVol() {
  VOL_ITEMS.forEach(item=>{
    const drift=(Math.random()-.495)*.15;
    if(item.key==='pcr') volVals[item.key]=Math.max(.5,Math.min(1.8,volVals[item.key]+drift*.05));
    else volVals[item.key]=Math.max(5,volVals[item.key]+drift);
    const raw=volVals[item.key];
    const pct=item.key==='pcr'?raw/2*100:Math.min(raw/50*100,100);
    const col=pct>60?'var(--red)':pct>35?'var(--amber)':'var(--green)';
    const f=document.getElementById(`vf-${item.key}`),n=document.getElementById(`vn-${item.key}`);
    if(f){f.style.width=pct.toFixed(0)+'%';f.style.background=col;}
    if(n){n.textContent=raw.toFixed(2);n.style.color=col;}
  });
}

// ═══════════════════════════════════════════════════
//  HEATMAP
// ═══════════════════════════════════════════════════

function buildHeatmap() {
  document.getElementById('heatmap-grid').innerHTML=sectorsData.map((s,i)=>{
    const v=s.val,int=Math.min(Math.abs(v)/4,1);
    const bg=v>=0?`rgba(61,224,168,${.1+int*.35})`:`rgba(255,107,107,${.1+int*.35})`;
    const col=v>=0?'var(--green)':'var(--red)';
    return `<div class="hm-cell" id="hm-${i}" style="background:${bg}">
      <div class="hm-sym">${s.name}</div>
      <div class="hm-val" style="color:${col}">${v>=0?'+':''}${v.toFixed(1)}%</div>
    </div>`;
  }).join('');
}
buildHeatmap();

function updateHeatmap() {
  sectorsData.forEach((s,i)=>{
    s.val+=(Math.random()-.5)*.12;
    const el=document.getElementById(`hm-${i}`);
    if(!el) return;
    const v=s.val,int=Math.min(Math.abs(v)/4,1);
    el.style.background=v>=0?`rgba(61,224,168,${.1+int*.35})`:`rgba(255,107,107,${.1+int*.35})`;
    const col=v>=0?'var(--green)':'var(--red)';
    el.querySelector('.hm-val').style.color=col;
    el.querySelector('.hm-val').textContent=(v>=0?'+':'')+v.toFixed(1)+'%';
  });
}

// ═══════════════════════════════════════════════════
//  SEBI
// ═══════════════════════════════════════════════════

function buildSebi() {
  document.getElementById('sebi-body').innerHTML=SEBI_DATA.map((c,i)=>{
    const tags=c.tags.map(t=>`<span class="sebi-tag" onclick="linkTag('${t}',event)">${t}</span>`).join('');
    return `<div class="sebi-item ${i===0?'new-circular':''}" onclick="openSebiDetail(${i})">
      <div class="sebi-impact impact-${c.impact}"></div>
      <div class="sebi-date">${c.date} · ${c.id}</div>
      <div class="sebi-title">${c.title}</div>
      <div class="sebi-tags">${tags}</div>
    </div>`;
  }).join('');
}
buildSebi();

function openSebiDetail(idx) {
  const c=SEBI_DATA[idx];
  document.getElementById('slideover-title').textContent=c.title;
  document.getElementById('slideover-meta').textContent=`${c.date} · ${c.id} · IMPACT: ${c.impact.toUpperCase()}`;
  document.getElementById('slideover-body').innerHTML=`
    <div class="so-label">Affected Instruments</div>
    <div class="so-chips">${c.linked.map(l=>`<span class="so-chip">${l}</span>`).join('')}</div>
    <div class="so-label">Keywords</div>
    <div class="so-chips">${c.tags.map(t=>`<span class="so-chip amber">${t}</span>`).join('')}</div>
    <div class="so-label">Full Text</div>
    <div class="so-text">${c.body}</div>
    <div class="so-label" style="margin-top:20px">AI Analysis</div>
    <div class="so-text" style="color:var(--accent2)">Model classifies this as a ${c.impact==='high'?'Tier-1 Structural Shift':c.impact==='med'?'Tier-2 Operational Change':'Tier-3 Compliance Update'}. Allow 2–5 sessions for full market pricing. Monitor correlated instruments closely.</div>`;
  document.getElementById('slideover').classList.add('open');
  document.getElementById('workspace').classList.add('dimmed');
  drawTether(c.tags, c.linked);
}

function closeSlideover(){
  document.getElementById('slideover').classList.remove('open');
  document.getElementById('workspace').classList.remove('dimmed');
  clearTether();
}

function linkTag(tag,e){
  e.stopPropagation();
  highlightedTags=highlightedTags.includes(tag)?highlightedTags.filter(t=>t!==tag):[...highlightedTags,tag];
  document.querySelectorAll('.sebi-tag').forEach(el=>el.classList.toggle('linked',highlightedTags.includes(el.textContent)));
}

// ═══════════════════════════════════════════════════
//  TETHER
// ═══════════════════════════════════════════════════

function drawTether(){
  const canvas=document.getElementById('tether-canvas');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight-62;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  const s=document.getElementById('panel-sebi').getBoundingClientRect();
  const t=document.getElementById('panel-stream').getBoundingClientRect();
  const x1=s.left+s.width/2,y1=s.top-40,x2=t.left+t.width/2,y2=t.top-40+t.height/2;
  const g=ctx.createLinearGradient(x1,y1,x2,y2);
  g.addColorStop(0,'rgba(255,184,48,.45)');g.addColorStop(1,'rgba(90,168,255,.1)');
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1-60,y1+80,x2+80,y2-60,x2,y2);
  ctx.strokeStyle=g;ctx.lineWidth=1;ctx.setLineDash([4,7]);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(x1,y1,3,0,Math.PI*2);ctx.fillStyle='rgba(255,184,48,.7)';ctx.fill();
  ctx.beginPath();ctx.arc(x2,y2,3,0,Math.PI*2);ctx.fillStyle='rgba(90,168,255,.5)';ctx.fill();
}
function clearTether(){const c=document.getElementById('tether-canvas');c.getContext('2d').clearRect(0,0,c.width,c.height);}
