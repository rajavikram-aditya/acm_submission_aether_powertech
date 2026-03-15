// ═══════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════

const STOCKS = [
  {sym:'RELIANCE', price:2847.35, chg:1.24,  vol:12.4, momentum:0},
  {sym:'TCS',      price:3921.80, chg:-0.38, vol:4.1,  momentum:0},
  {sym:'INFY',     price:1582.45, chg:0.82,  vol:8.7,  momentum:0},
  {sym:'HDFC',     price:1724.60, chg:-1.15, vol:6.2,  momentum:0},
  {sym:'ICICIBNK', price:1089.25, chg:2.11,  vol:18.9, momentum:0},
  {sym:'WIPRO',    price:498.70,  chg:0.55,  vol:5.3,  momentum:0},
  {sym:'AXISBANK', price:1147.90, chg:-0.72, vol:9.1,  momentum:0},
  {sym:'SBIN',     price:812.35,  chg:1.88,  vol:22.4, momentum:0},
  {sym:'BAJFIN',   price:7234.50, chg:-2.31, vol:2.8,  momentum:0},
  {sym:'LT',       price:3548.20, chg:0.44,  vol:3.5,  momentum:0},
  {sym:'HCLTECH',  price:1398.60, chg:1.02,  vol:7.6,  momentum:0},
  {sym:'KOTAKMAH', price:1875.40, chg:-0.19, vol:4.4,  momentum:0},
];

const INDICES = [
  {sym:'NIFTY 50',  val:24186.5, chg:0.72},
  {sym:'SENSEX',    val:79553.2, chg:0.68},
  {sym:'NIFTY BNK', val:52341.8, chg:1.12},
  {sym:'INDIA VIX', val:14.32,   chg:-3.21},
];

const SECTORS = [
  {name:'IT',    val:2.1},{name:'BANK',   val:1.4},
  {name:'AUTO',  val:-0.8},{name:'PHARMA', val:0.6},
  {name:'FMCG',  val:-0.3},{name:'METAL',  val:3.1},
  {name:'ENERGY',val:1.8},{name:'REALTY',  val:-1.9},
];

const SEBI_DATA = [
  {id:'SEBI-2025-001',date:'14 JUN 2025',title:'Enhanced Margin Requirements in F&O Segment',tags:['F&O','Margin','Derivatives'],impact:'high',linked:['NIFTY FUT','BANKNIFTY FUT'],body:'SEBI has issued revised guidelines for peak margin collection in futures and options segments. All trading members must collect upfront margins effective from the next settlement cycle. Intraday position monitoring at 15-minute intervals is now mandatory.'},
  {id:'SEBI-2025-002',date:'12 JUN 2025',title:'LODR Amendments — Material Event Disclosure Timeline',tags:['Disclosure','LODR','Compliance'],impact:'med',linked:['ALL LISTED'],body:'Listed entities must disclose material events within 30 minutes of occurrence during market hours, reduced from 24 hours. Board outcomes and management changes fall under the revised threshold.'},
  {id:'SEBI-2025-003',date:'10 JUN 2025',title:'Cybersecurity Framework for Market Infrastructure',tags:['Cybersecurity','Technology'],impact:'low',linked:['NSE','BSE','CDSL'],body:'All MIIs are required to implement cybersecurity frameworks covering governance, risk, incident response, and recovery within 180 days.'},
  {id:'SEBI-2025-004',date:'08 JUN 2025',title:'New Asset Class — HNI Products with ₹10L Minimum Ticket',tags:['HNI','Investment','New Asset Class'],impact:'high',linked:['MUTUAL FUND','PMS','AIF'],body:'SEBI introduces a regulated asset class bridging mutual funds and PMS, minimum ₹10 lakhs. Products may use derivatives, long-short strategies, and up to 20% single-security concentration.'},
];

const AI_SIGNALS_BASE = [
  {sym:'RELIANCE', type:'bull', conf:'87%', text:'Breakout above 200-DMA confirmed. Volume 2.3x avg. Target ₹2940.'},
  {sym:'BAJFIN',   type:'bear', conf:'74%', text:'NBFC credit concern — NPA spike risk in Q1 data. Watch ₹7100.'},
  {sym:'SBIN',     type:'bull', conf:'91%', text:'PSU bank momentum. RBI rate pause supports NIM expansion.'},
  {sym:'IT INDEX', type:'neut', conf:'61%', text:'Dollar weakness vs INR offset by deal pipeline. Neutral.'},
];

// ═══════════════════════════════════════════════════
//  FORMATTERS
// ═══════════════════════════════════════════════════

// Format price with Indian locale, always 2 decimal places
function fmtPrice(p) {
  return p.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// Format volume in crores/lakhs like real NSE terminals
function formatVol(crores) {
  if(crores >= 100) return (crores/100).toFixed(1)+'Cr';
  if(crores >= 1)   return crores.toFixed(1)+'L';
  return (crores*100).toFixed(0)+'K';
}

// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════

let prices = STOCKS.map(s=>({...s}));  // deep copy with momentum & vol
let indicesData = INDICES.map(i=>({...i}));
let sectorsData = SECTORS.map(s=>({...s}));
let aiSignals = [...AI_SIGNALS_BASE];
let activeZ = 10;
let chromaLevel = 0; // 0=none 1=low 2=med 3=high
let whisperLog = [];
let pulse = 0;
let highlightedTags = [];

// Rolling price buffers for Z-score (20 ticks per stock)
const priceHistory = prices.map(()=>[]);
const ZSCORE_WINDOW = 20;

// Chart data
const chartData = [];
let chartBase = 24186;
for(let i=0;i<200;i++){chartBase+=(Math.random()-.48)*12;chartData.push(chartBase);}

// Ghost prediction line — pre-computed so it doesn't flicker on mousemove
let ghostData = [];

const sparkHistory = INDICES.map(idx=>{
  const arr=[];let v=idx.val;
  for(let i=0;i<60;i++){v+=(Math.random()-.5)*(idx.val*.002);arr.push(v);}
  return arr;
});
const volVals = {vix:14.3,niv:18.2,biv:22.1,pcr:0.87};
const VOL_ITEMS=[{label:'INDIA VIX',key:'vix'},{label:'NIFTY IV',key:'niv'},{label:'BANK IV',key:'biv'},{label:'PCR',key:'pcr'}];

// ═══════════════════════════════════════════════════
//  ANOMALY ENGINE — Z-Score + Staggered Cascade
// ═══════════════════════════════════════════════════

function zScore(arr) {
  if(arr.length < 4) return 0;
  const n = arr.length;
  const mean = arr.reduce((a,b)=>a+b,0)/n;
  const std = Math.sqrt(arr.reduce((a,b)=>a+(b-mean)**2,0)/n);
  if(std === 0) return 0;
  return Math.abs(arr[n-1]-mean)/std;
}

function severityFromZ(z) {
  if(z >= 3.5) return 3;
  if(z >= 2.5) return 2;
  if(z >= 1.8) return 1;
  return 0;
}

// Track last anomaly time per stock to manage decay
const anomalyTimers = {};

function checkAnomalies() {
  let maxSev = 0;
  const anomalies = [];

  prices.forEach((s, i) => {
    const hist = priceHistory[i];
    if(hist.length < 5) return;
    const z = zScore(hist);
    const sev = severityFromZ(z);
    if(sev > 0) {
      anomalies.push({sym:s.sym, z, sev, price:s.price, chg:s.chg, idx:i});
      if(sev > maxSev) maxSev = sev;
    }
  });

  // ── LAYER 1: Chart reacts first — anomaly bar + chroma (immediate) ──
  setChromaLevel(maxSev);  // always sync — handles natural decay back to 0
  const bar = document.getElementById('anomaly-bar');
  bar.className = maxSev > 0 ? `sev${maxSev}` : '';

  // ── LAYER 2: Stream row highlights ~400ms later ──
  setTimeout(() => {
    prices.forEach((s, i) => {
      const row = document.getElementById(`sr-${i}`);
      if(!row) return;
      const hist = priceHistory[i];
      if(hist.length < 5) return;
      const z = zScore(hist);
      const sev = severityFromZ(z);
      row.classList.toggle('anomaly', sev >= 2);
      const alert = row.querySelector('.stream-alert');
      if(alert) alert.textContent = sev >= 2 ? '⚠' : '';
    });
  }, 400);

  // ── LAYER 3: Status bar updates ~900ms later ──
  setTimeout(() => {
    const status = document.getElementById('anomaly-status');
    if(maxSev === 0){ status.textContent='● NOMINAL'; status.className='sb-item'; }
    else if(maxSev === 1){ status.textContent='◉ ELEVATED'; status.className='sb-item active'; }
    else if(maxSev === 2){ status.textContent='◉ ANOMALY DETECTED'; status.className='sb-item critical'; }
    else { status.textContent='⬟ CRITICAL ANOMALY'; status.className='sb-item critical'; }
  }, 900);

  // ── LAYER 4: Whisper panel fires ~1.5s later ──
  setTimeout(() => {
    if(anomalies.length > 0) {
      anomalies.sort((a,b)=>b.z-a.z);
      const top = anomalies[0];
      if(top.sev >= 1) emitWhisper(top);
    }
    const wp = document.getElementById('panel-whisper');
    wp.classList.toggle('anomaly-glow', maxSev >= 2);
    const wb = document.getElementById('whisper-badge');
    if(maxSev >= 2){ wb.textContent='⚠ SIGNAL'; wb.className='panel-badge badge-warn'; }
    else { wb.textContent='ANOMALY ENGINE'; wb.className='panel-badge badge-ai'; }
    // Sound toggle pulse on sev2+
    if(soundOn && maxSev >= 2) {
      const snd = document.getElementById('sound-toggle');
      if(snd) { snd.classList.add('pulse'); setTimeout(() => snd.classList.remove('pulse'), 2000); }
    }
  }, 1500);

  // ── LAYER 5: AI Signals reacts last ~3s later ──
  setTimeout(() => {
    if(anomalies.length > 0 && anomalies[0].sev >= 2) {
      const top = anomalies[0];
      aiSignals.unshift({
        sym: top.sym,
        type: 'anomaly-sig',
        conf: `${Math.floor(top.z * 22 + 40)}%`,
        text: `⚠ Z=${top.z.toFixed(2)} — Statistical outlier detected. Cross-referencing order flow and SEBI feed.`
      });
      if(aiSignals.length > 6) aiSignals.pop();
      buildSignals();
    }
  }, 3000);
}

function emitDecay() {
  // Mark the most recent whisper item as decayed — signal resolved
  const feed = document.getElementById('whisper-feed');
  if(!feed) return;
  const latest = feed.querySelector('.whisper-item');
  if(latest) latest.classList.add('decayed');

  // Push a decay note
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const decayEl = document.createElement('div');
  decayEl.className = 'whisper-item decayed';
  decayEl.innerHTML = `
    <div class="w-header">
      <span class="w-sym" style="color:var(--text3)">SIGNAL DECAYED</span>
      <span class="w-time">${ts}</span>
    </div>
    <div class="w-msg" style="color:var(--text3);font-style:italic;">Deviation normalised — no catalyst confirmed. Pattern within noise bounds.</div>`;
  feed.insertBefore(decayEl, feed.firstChild);
}

function emitWhisper(a) {
  const isExact = a.sev >= 2; // Use the exact phrase from the problem statement for sev2+
  const msgs = {
    1: [
      `${a.sym} showing elevated deviation from mean. Z=${a.z.toFixed(2)}. Monitor closely.`,
      `Unusual price movement in ${a.sym}. Z-score above threshold. Watch for follow-through.`,
    ],
    2: [
      `Something unusual is happening — ${a.sym} at Z=${a.z.toFixed(2)}. Possible institutional flow or news catalyst.`,
      `Something unusual is happening — ${a.sym} breaking statistical bounds. Pattern inconsistent with recent behaviour.`,
    ],
    3: [
      `Something unusual is happening — CRITICAL: ${a.sym} at Z=${a.z.toFixed(2)}. Anomalous spike. Check for halt or news event.`,
      `Something unusual is happening — EXTREME MOVE: ${a.sym} far outside normal distribution. Alert all desks immediately.`,
    ],
  };
  const pool = msgs[a.sev];
  const msg = pool[Math.floor(Math.random()*pool.length)];
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  // Deduplicate — don't push same sym within 3s
  const last = whisperLog[0];
  if(last && last.sym === a.sym && (Date.now()-last.time) < 3000) return;

  // For sev2+, inject the ambient "Something unusual is happening" header first
  if(isExact && (!last || last.sym !== '__ambient__' || (Date.now()-last.time) > 5000)) {
    whisperLog.unshift({sym:'__ambient__', z:0, sev:a.sev, msg:'', ts, time:Date.now(), ambient:true});
  }

  whisperLog.unshift({sym:a.sym, z:a.z, sev:a.sev, msg, ts, time:Date.now()});
  if(whisperLog.length > 14) whisperLog.pop();
  renderWhisper();
}

function renderWhisper() {
  const feed = document.getElementById('whisper-feed');
  if(!feed) return;
  feed.innerHTML = whisperLog.map(w => {
    if(w.ambient) {
      return `<div class="whisper-ambient">"Something unusual is happening."</div>`;
    }
    return `
    <div class="whisper-item sev${w.sev}${w.decayed?' decayed':''}">
      <div class="w-header">
        <span class="w-sym">${w.sym}</span>
        <span class="w-score sev${w.sev}">Z=${w.z.toFixed(2)}</span>
        <span class="w-time">${w.ts}</span>
      </div>
      <div class="w-msg">${w.msg}</div>
    </div>`;
  }).join('') ||
  '<div style="padding:12px;font-size:10px;color:var(--text3);">Monitoring all instruments — no anomalies detected.</div>';
}

// ═══════════════════════════════════════════════════
//  CHROMA SHIFT
// ═══════════════════════════════════════════════════

function setChromaLevel(level) {
  if(level === chromaLevel) return;
  chromaLevel = level;
  document.body.classList.remove('chroma-low','chroma-med','chroma-high');
  if(level === 1) document.body.classList.add('chroma-low');
  else if(level === 2) document.body.classList.add('chroma-med');
  else if(level === 3) document.body.classList.add('chroma-high');
}

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

// ═══════════════════════════════════════════════════
//  AI SIGNALS
// ═══════════════════════════════════════════════════

function buildSignals(){
  document.getElementById('signal-wrap').innerHTML=aiSignals.slice(0,5).map(s=>
    `<div class="signal-item ${s.type}">
      <span class="signal-sym">${s.sym}</span><span class="signal-conf">${s.conf} CONF</span>
      <div class="signal-text">${s.text}</div>
    </div>`).join('');
}
buildSignals();

let sigTimer=0;
function maybeNewSignal(){
  sigTimer++;
  if(sigTimer%25!==0) return;
  const pool=[
    {sym:'HDFC',     type:'bull',conf:'79%',text:'Institutional buying detected. Block deal flow from FII desk.'},
    {sym:'WIPRO',    type:'bear',conf:'66%',text:'IT sector rotation risk. Margin compression in Q2.'},
    {sym:'METAL IDX',type:'bull',conf:'83%',text:'China stimulus spillover. Steel and aluminum bid.'},
    {sym:'AXISBANK', type:'bull',conf:'77%',text:'Credit growth outpacing sector peers. Watch for rerating.'},
  ];
  aiSignals.unshift(pool[Math.floor(Math.random()*pool.length)]);
  if(aiSignals.length>6) aiSignals.pop();
  buildSignals();
}

// ═══════════════════════════════════════════════════
//  MINI STREAM SPARKLINES
// ═══════════════════════════════════════════════════

function drawStreamSparkline(i) {
  const c = document.getElementById(`ss-${i}`);
  if(!c) return;
  const hist = priceHistory[i];
  if(hist.length < 2) return;
  const data = hist.slice(-30);
  const W = 40, H = 20;
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  ctx.strokeStyle = prices[i].chg >= 0 ? '#3de0a8' : '#ff6b6b';
  ctx.lineWidth = 1;
  data.forEach((v, j) => {
    const x = (j / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// ═══════════════════════════════════════════════════
//  SOUND TOGGLE (Visual Only)
// ═══════════════════════════════════════════════════

let soundOn = false;

function toggleSound() {
  soundOn = !soundOn;
  const el = document.getElementById('sound-toggle');
  if(!el) return;
  if(soundOn) {
    el.textContent = '🔊 SOUND ON';
    el.classList.add('on');
  } else {
    el.textContent = '🔇 SOUND OFF';
    el.classList.remove('on');
  }
}

// ═══════════════════════════════════════════════════
//  CORRELATION MATRIX
// ═══════════════════════════════════════════════════

const CORR_STOCKS = [
  {sym:'RELIANCE', idx:0},
  {sym:'TCS',      idx:1},
  {sym:'SBIN',     idx:7},
  {sym:'BAJFIN',   idx:8},
];

function computeCorrelation(idxA, idxB) {
  const a = priceHistory[idxA], b = priceHistory[idxB];
  const n = Math.min(a.length, b.length);
  if(n < 3) return 0;
  const sa = a.slice(-n), sb = b.slice(-n);
  const meanA = sa.reduce((s,v)=>s+v,0)/n;
  const meanB = sb.reduce((s,v)=>s+v,0)/n;
  let cov = 0, varA = 0, varB = 0;
  for(let i = 0; i < n; i++) {
    const da = sa[i] - meanA, db = sb[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : cov / denom;
}

function buildCorrelation() {
  const grid = document.getElementById('corr-grid');
  if(!grid) return;
  let html = '<div class="corr-header"></div>'; // top-left corner
  // Column headers
  CORR_STOCKS.forEach(s => {
    html += `<div class="corr-header">${s.sym.slice(0,4)}</div>`;
  });
  // Rows
  CORR_STOCKS.forEach((row, ri) => {
    html += `<div class="corr-header">${row.sym.slice(0,4)}</div>`;
    CORR_STOCKS.forEach((col, ci) => {
      const id = `corr-${ri}-${ci}`;
      const isDiag = ri === ci;
      html += `<div class="corr-cell ${isDiag?'corr-diag':''}" id="${id}">` +
        (isDiag ? '1.00' : '0.00') + '</div>';
    });
  });
  grid.innerHTML = html;
}

function updateCorrelation() {
  CORR_STOCKS.forEach((row, ri) => {
    CORR_STOCKS.forEach((col, ci) => {
      if(ri === ci) return; // diagonal stays 1.00
      const el = document.getElementById(`corr-${ri}-${ci}`);
      if(!el) return;
      const r = computeCorrelation(row.idx, col.idx);
      el.textContent = r.toFixed(2);
      const mag = Math.min(Math.abs(r), 1);
      if(r >= 0) {
        el.style.background = `rgba(61,224,168,${0.05 + mag * 0.35})`;
        el.style.color = `rgba(61,224,168,${0.5 + mag * 0.5})`;
      } else {
        el.style.background = `rgba(255,107,107,${0.05 + mag * 0.35})`;
        el.style.color = `rgba(255,107,107,${0.5 + mag * 0.5})`;
      }
    });
  });
}

// ═══════════════════════════════════════════════════
//  PRICE ALERT SYSTEM
// ═══════════════════════════════════════════════════

const priceAlerts = {}; // idx -> {target, direction: 'above'|'below'}

function setPriceAlert(i, target) {
  const current = prices[i].price;
  const direction = target > current ? 'above' : 'below';
  priceAlerts[i] = {target, direction};
  updateAlertIcon(i);
}

function updateAlertIcon(i) {
  const symEl = document.getElementById(`ssym-${i}`);
  if(!symEl) return;
  // Remove existing icon
  const existing = symEl.querySelector('.price-alert-icon');
  if(existing) existing.remove();
  if(!priceAlerts[i]) return;
  const icon = document.createElement('span');
  icon.className = 'price-alert-icon';
  icon.textContent = priceAlerts[i].direction === 'above' ? ' ▲' : ' ▼';
  icon.title = `Alert: ${priceAlerts[i].direction} ₹${priceAlerts[i].target.toFixed(2)} (right-click to clear)`;
  icon.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    delete priceAlerts[i];
    icon.remove();
  });
  symEl.appendChild(icon);
}

function checkPriceAlert(i, oldPrice, newPrice) {
  const alert = priceAlerts[i];
  if(!alert) return;
  let triggered = false;
  if(alert.direction === 'above' && oldPrice < alert.target && newPrice >= alert.target) triggered = true;
  if(alert.direction === 'below' && oldPrice > alert.target && newPrice <= alert.target) triggered = true;
  if(triggered) {
    const row = document.getElementById(`sr-${i}`);
    if(row) {
      row.classList.remove('alert-flash');
      void row.offsetWidth;
      row.classList.add('alert-flash');
    }
    // Emit whisper
    const sym = prices[i].sym;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    whisperLog.unshift({
      sym: sym, z: 0, sev: 1,
      msg: `Price alert triggered — ${sym} crossed ₹${alert.target.toFixed(2)}`,
      ts, time: Date.now()
    });
    if(whisperLog.length > 14) whisperLog.pop();
    renderWhisper();
    // Clear the alert
    delete priceAlerts[i];
    updateAlertIcon(i);
  }
}

// ═══════════════════════════════════════════════════
//  EXPORT SNAPSHOT
// ═══════════════════════════════════════════════════

function exportSnapshot() {
  if(typeof html2canvas === 'undefined') {
    console.warn('html2canvas not loaded');
    return;
  }
  const ws = document.getElementById('workspace');
  html2canvas(ws, {
    backgroundColor: '#0c0d11',
    scale: 2,
    useCORS: true,
    logging: false
  }).then(canvas => {
    const link = document.createElement('a');
    const now = new Date();
    const ts = now.getFullYear() + '' +
      String(now.getMonth()+1).padStart(2,'0') +
      String(now.getDate()).padStart(2,'0') + '-' +
      String(now.getHours()).padStart(2,'0') +
      String(now.getMinutes()).padStart(2,'0') +
      String(now.getSeconds()).padStart(2,'0');
    link.download = `aether-snapshot-${ts}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => console.error('Snapshot failed:', err));
}

// ═══════════════════════════════════════════════════
//  DEMO ANOMALY — press A or click button
// ═══════════════════════════════════════════════════

function triggerDemoAnomaly() {
  const targets = [0, 1]; // RELIANCE, TCS
  targets.forEach(idx => {
    const spike = prices[idx].price * 0.025; // 2.5% spike
    for(let i = 0; i < 5; i++) {
      priceHistory[idx].push(prices[idx].price + spike * (i + 1));
    }
    if(priceHistory[idx].length > ZSCORE_WINDOW)
      priceHistory[idx].splice(0, priceHistory[idx].length - ZSCORE_WINDOW);
    prices[idx].price += spike;
    prices[idx].chg  += 2.5;

    // Force immediate visual update on the stream row
    const el    = document.getElementById(`sp-${idx}`);
    const chgEl = document.getElementById(`sc-${idx}`);
    const row   = document.getElementById(`sr-${idx}`);
    if(el) { el.textContent = fmtPrice(prices[idx].price); el.style.color = 'var(--green)'; }
    if(chgEl) { chgEl.textContent = '+' + prices[idx].chg.toFixed(2) + '%'; chgEl.style.color = 'var(--green)'; }
    if(row) {
      row.classList.remove('flash-up','flash-dn');
      void row.offsetWidth;
      row.classList.add('flash-up');
    }
  });

  checkAnomalies();

  // Auto-reset ALL anomaly visuals after 8s
  setTimeout(() => {
    setChromaLevel(0);
    document.getElementById('anomaly-bar').className = '';
    const status = document.getElementById('anomaly-status');
    status.textContent = '● NOMINAL'; status.className = 'sb-item';
    // clear stream row highlights
    prices.forEach((_, i) => {
      const row = document.getElementById(`sr-${i}`);
      if(row) row.classList.remove('anomaly');
      const alert = document.getElementById(`sa-${i}`);
      if(alert) alert.textContent = '';
    });
    // reset whisper panel glow + badge
    const wp = document.getElementById('panel-whisper');
    if(wp) wp.classList.remove('anomaly-glow');
    const wb = document.getElementById('whisper-badge');
    if(wb) { wb.textContent = 'ANOMALY ENGINE'; wb.className = 'panel-badge badge-ai'; }
  }, 8000);
}

document.addEventListener('keydown',e=>{
  // Don't handle shortcuts when typing in an input
  if(e.target.tagName === 'INPUT') return;
  if(e.key==='a'||e.key==='A') triggerDemoAnomaly();
  if(e.key==='s'||e.key==='S'){if(!document.getElementById('cmd-overlay').classList.contains('open')&&!document.getElementById('shortcut-overlay').classList.contains('open')) exportSnapshot();}
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openCmd();}
  if(e.key==='Escape'){closeCmd();closeSlideover();closeShortcuts();}
  if(e.key==='?'||e.key==='/'){if(!document.getElementById('cmd-overlay').classList.contains('open')) openShortcuts();}
  if(e.key==='m'||e.key==='M'){if(!document.getElementById('cmd-overlay').classList.contains('open')) applyPreset('macro');}
  if(e.key==='r'||e.key==='R'){if(!document.getElementById('cmd-overlay').classList.contains('open')) applyPreset('regulatory');}
  if(e.key==='t'||e.key==='T'){if(!document.getElementById('cmd-overlay').classList.contains('open')) applyPreset('trading');}
});
function openShortcuts(){document.getElementById('shortcut-overlay').classList.add('open');}
function closeShortcuts(){document.getElementById('shortcut-overlay').classList.remove('open');}

// ═══════════════════════════════════════════════════
//  DRAGGABLE + RESIZABLE
// ═══════════════════════════════════════════════════

function initPanel(id){
  const panel=document.getElementById(id);
  const header=panel.querySelector('.panel-header');
  const resizer=panel.querySelector('.resize-handle');
  panel.addEventListener('mousedown',()=>bringToFront(panel));
  let dragging=false,ox=0,oy=0;
  header.addEventListener('mousedown',e=>{
    dragging=true;
    const r=panel.getBoundingClientRect();
    ox=e.clientX-r.left;oy=e.clientY-r.top;
    bringToFront(panel);e.preventDefault();
  });
  let resizing=false,rw=0,rh=0,rx=0,ry=0;
  resizer.addEventListener('mousedown',e=>{
    resizing=true;rw=panel.offsetWidth;rh=panel.offsetHeight;rx=e.clientX;ry=e.clientY;
    bringToFront(panel);e.preventDefault();e.stopPropagation();
  });
  document.addEventListener('mousemove',e=>{
    if(dragging){
      const ws=document.getElementById('workspace').getBoundingClientRect();
      panel.style.left=Math.max(0,Math.min(e.clientX-ox-ws.left,ws.width-40))+'px';
      panel.style.top=Math.max(0,Math.min(e.clientY-oy-ws.top,ws.height-28))+'px';
      saveLayout();
    }
    if(resizing){
      panel.style.width=Math.max(160,rw+(e.clientX-rx))+'px';
      panel.style.height=Math.max(80,rh+(e.clientY-ry))+'px';
      drawChart(null);INDICES.forEach((_,i)=>drawSparkline(i));saveLayout();
    }
  });
  document.addEventListener('mouseup',()=>{dragging=false;resizing=false;});
}

function bringToFront(panel){
  activeZ++;panel.style.zIndex=activeZ;
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  panel.classList.add('active');
}

['panel-chart','panel-stream','panel-sebi','panel-ob','panel-spark','panel-vol','panel-heat','panel-whisper','panel-ai','panel-corr'].forEach(initPanel);

// ═══════════════════════════════════════════════════
//  LAYOUT PERSISTENCE
// ═══════════════════════════════════════════════════

function saveLayout(){
  const layout={};
  document.querySelectorAll('.panel').forEach(p=>{layout[p.id]={left:p.style.left,top:p.style.top,width:p.style.width,height:p.style.height};});
  try{localStorage.setItem('aether2-layout',JSON.stringify(layout));}catch(e){}
}
function loadLayout(){
  try{
    const raw=localStorage.getItem('aether2-layout');
    if(!raw) return;
    const l=JSON.parse(raw);
    Object.entries(l).forEach(([id,pos])=>{const el=document.getElementById(id);if(el){el.style.left=pos.left;el.style.top=pos.top;el.style.width=pos.width;el.style.height=pos.height;}});
  }catch(e){}
}
loadLayout();

// ═══════════════════════════════════════════════════
//  COMMAND PALETTE
// ═══════════════════════════════════════════════════

const CMD=[
  {g:'TICKERS',icon:'◈',t:'NIFTY 50',s:'NSE Index · 24,186',fn:()=>bringToFront(document.getElementById('panel-chart'))},
  {g:'TICKERS',icon:'◈',t:'SENSEX',s:'BSE Index · 79,553',fn:()=>bringToFront(document.getElementById('panel-spark'))},
  {g:'TICKERS',icon:'◈',t:'RELIANCE',s:'NSE · ₹2,847',fn:()=>bringToFront(document.getElementById('panel-stream'))},
  {g:'SEBI',icon:'⊕',t:'F&O Margin Circular',s:'High Impact · Jun 14',fn:()=>openSebiDetail(0)},
  {g:'SEBI',icon:'⊕',t:'LODR Amendment',s:'Med Impact · Jun 12',fn:()=>openSebiDetail(1)},
  {g:'SEBI',icon:'⊕',t:'New Asset Class',s:'High Impact · Jun 8',fn:()=>openSebiDetail(3)},
  {g:'PRESETS',icon:'⊞',t:'Macro View',s:'Full overview',fn:()=>applyPreset('macro')},
  {g:'PRESETS',icon:'⊞',t:'Regulatory Focus',s:'SEBI-heavy',fn:()=>applyPreset('regulatory')},
  {g:'PRESETS',icon:'⊞',t:'Trading Desk',s:'Order book focus',fn:()=>applyPreset('trading')},
  {g:'ACTIONS',icon:'⚡',t:'Trigger Demo Anomaly',s:'Force Z-score spike for demo',fn:()=>triggerDemoAnomaly()},
  {g:'ACTIONS',icon:'📷',t:'Export Snapshot',s:'Download PNG of workspace (S)',fn:()=>exportSnapshot()},
];

function openCmd(){document.getElementById('cmd-overlay').classList.add('open');document.getElementById('cmd-input').value='';document.getElementById('cmd-input').focus();renderCmd('');}
function closeCmd(){document.getElementById('cmd-overlay').classList.remove('open');}
function renderCmd(q){
  const lq=q.toLowerCase();
  const filtered=CMD.filter(c=>!q||c.t.toLowerCase().includes(lq)||c.s.toLowerCase().includes(lq)||c.g.toLowerCase().includes(lq));
  const grps={};filtered.forEach(c=>(grps[c.g]=grps[c.g]||[]).push(c));
  document.getElementById('cmd-results').innerHTML=Object.entries(grps).map(([g,items])=>
    `<div class="cmd-group-label">${g}</div>`+
    items.map(item=>`<div class="cmd-result" onclick="runCmd(${CMD.indexOf(item)})">
      <div class="cmd-result-icon">${item.icon}</div>
      <div class="cmd-result-main"><div class="cmd-result-title">${item.t}</div><div class="cmd-result-sub">${item.s}</div></div>
      <div class="cmd-result-tag">${item.g}</div>
    </div>`).join('')
  ).join('')||'<div style="padding:16px;font-size:11px;color:var(--text3);text-align:center;">No results</div>';
}
function runCmd(i){CMD[i].fn();closeCmd();}
document.getElementById('cmd-input').addEventListener('input',e=>renderCmd(e.target.value));
document.getElementById('cmd-box').addEventListener('click',e=>e.stopPropagation());

// ═══════════════════════════════════════════════════
//  PRESETS
// ═══════════════════════════════════════════════════

const PRESETS={
  macro:{
    'panel-chart': {left:'8px',top:'8px',width:'430px',height:'240px'},
    'panel-stream':{left:'446px',top:'8px',width:'340px',height:'370px'},
    'panel-sebi':  {left:'794px',top:'8px',width:'280px',height:'470px'},
    'panel-ob':    {left:'8px',top:'256px',width:'210px',height:'260px'},
    'panel-spark': {left:'226px',top:'256px',width:'212px',height:'135px'},
    'panel-vol':   {left:'226px',top:'399px',width:'212px',height:'117px'},
    'panel-heat':  {left:'446px',top:'386px',width:'310px',height:'148px'},
    'panel-whisper':{left:'8px',top:'524px',width:'430px',height:'130px'},
    'panel-ai':    {left:'764px',top:'486px',width:'310px',height:'168px'},
    'panel-corr':  {left:'446px',top:'542px',width:'310px',height:'112px'},
  },
  regulatory:{
    'panel-sebi':  {left:'8px',top:'8px',width:'490px',height:'560px'},
    'panel-whisper':{left:'8px',top:'576px',width:'490px',height:'78px'},
    'panel-chart': {left:'506px',top:'8px',width:'360px',height:'200px'},
    'panel-stream':{left:'506px',top:'216px',width:'360px',height:'350px'},
    'panel-ob':    {left:'874px',top:'8px',width:'200px',height:'280px'},
    'panel-spark': {left:'874px',top:'296px',width:'200px',height:'140px'},
    'panel-vol':   {left:'874px',top:'444px',width:'200px',height:'110px'},
    'panel-heat':  {left:'506px',top:'574px',width:'360px',height:'80px'},
    'panel-ai':    {left:'874px',top:'562px',width:'200px',height:'92px'},
    'panel-corr':  {left:'506px',top:'660px',width:'360px',height:'100px'},
  },
  trading:{
    'panel-ob':    {left:'8px',top:'8px',width:'260px',height:'400px'},
    'panel-chart': {left:'276px',top:'8px',width:'500px',height:'300px'},
    'panel-stream':{left:'784px',top:'8px',width:'290px',height:'560px'},
    'panel-spark': {left:'276px',top:'316px',width:'200px',height:'150px'},
    'panel-vol':   {left:'484px',top:'316px',width:'290px',height:'150px'},
    'panel-heat':  {left:'8px',top:'416px',width:'260px',height:'148px'},
    'panel-whisper':{left:'8px',top:'572px',width:'560px',height:'82px'},
    'panel-sebi':  {left:'276px',top:'474px',width:'500px',height:'80px'},
    'panel-ai':    {left:'784px',top:'576px',width:'290px',height:'78px'},
    'panel-corr':  {left:'8px',top:'572px',width:'260px',height:'82px'},
  }
};

function applyPreset(name){
  document.querySelectorAll('.preset-btn').forEach(b=>b.classList.toggle('active',b.textContent.toLowerCase().includes(name.slice(0,4))));
  const p=PRESETS[name];if(!p) return;
  Object.entries(p).forEach(([id,pos])=>{const el=document.getElementById(id);if(el) Object.assign(el.style,pos);});
  setTimeout(()=>{drawChart(null);INDICES.forEach((_,i)=>drawSparkline(i));},60);
  saveLayout();
}

// ═══════════════════════════════════════════════════
//  LATENCY
// ═══════════════════════════════════════════════════

setInterval(()=>{
  const lat=Math.floor(Math.random()*18+8);
  const el=document.getElementById('latency-val');
  if(el){el.textContent=lat+'ms';el.style.color=lat>20?'var(--amber)':'var(--green)';}
},1500);

// ═══════════════════════════════════════════════════
//  HEARTBEAT — 200ms
// ═══════════════════════════════════════════════════

setInterval(()=>{
  pulse++;
  updateStream();                          // internal tick every 200ms, display every 1.2s (6 pulses)
  if(pulse%3===0)   updateVol();           // vol every 600ms
  if(pulse%5===0)   {updateSparklines();updateHeatmap();}  // sparklines every 1s
  if(pulse%10===0)  {updateChart();buildOrderBook();updateCorrelation();}      // chart every 2s
  if(pulse%75===0)  maybeNewSignal();      // AI signal ~every 15s
  // NOTE: anomaly detection is MANUAL ONLY — press A to trigger
},200);


// ═══════════════════════════════════════════════════
//  PANEL VISIBILITY MANAGER
// ═══════════════════════════════════════════════════

const PANEL_META = {
  'panel-chart':   {label:'NIFTY Chart'},
  'panel-stream':  {label:'Signal Stream'},
  'panel-sebi':    {label:'SEBI Gravity'},
  'panel-ob':      {label:'Order Book'},
  'panel-spark':   {label:'Indices'},
  'panel-vol':     {label:'Volatility'},
  'panel-heat':    {label:'Sector Heatmap'},
  'panel-whisper': {label:'The Whisper'},
  'panel-ai':      {label:'AI Signals'},
  'panel-corr':    {label:'Correlation'},
};

// State: hidden/minimised per panel (persisted in localStorage)
let panelState = {};

function loadPanelState() {
  try {
    const raw = localStorage.getItem('aether-panel-state');
    if(raw) panelState = JSON.parse(raw);
  } catch(e) {}
  // Apply saved states
  Object.entries(panelState).forEach(([id, state]) => {
    const el = document.getElementById(id);
    if(!el) return;
    if(state === 'hidden')    { el.classList.add('hidden'); }
    if(state === 'minimised') { el.classList.add('minimised'); }
  });
}

function savePanelState() {
  try { localStorage.setItem('aether-panel-state', JSON.stringify(panelState)); } catch(e) {}
}

function closePanel(id, e) {
  if(e) { e.stopPropagation(); e.preventDefault(); }
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('minimised');
  el.classList.add('hidden');
  panelState[id] = 'hidden';
  savePanelState();
  refreshPanelsMenu();
}

function minimisePanel(id, e) {
  if(e) { e.stopPropagation(); e.preventDefault(); }
  const el = document.getElementById(id);
  if(!el) return;
  const isMin = el.classList.contains('minimised');
  if(isMin) {
    el.classList.remove('minimised');
    panelState[id] = 'visible';
  } else {
    el.classList.add('minimised');
    panelState[id] = 'minimised';
  }
  savePanelState();
  refreshPanelsMenu();
}

function showPanel(id) {
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('hidden', 'minimised');
  panelState[id] = 'visible';
  savePanelState();
  refreshPanelsMenu();
}

function showAllPanels() {
  Object.keys(PANEL_META).forEach(id => showPanel(id));
}

// ── PANELS MENU ──
let panelsMenuOpen = false;

function togglePanelsMenu() {
  panelsMenuOpen = !panelsMenuOpen;
  const menu = document.getElementById('panels-menu');
  if(panelsMenuOpen) {
    refreshPanelsMenu();
    menu.classList.add('open');
    // close on outside click
    setTimeout(() => document.addEventListener('click', closePanelsMenuOutside), 10);
  } else {
    menu.classList.remove('open');
    document.removeEventListener('click', closePanelsMenuOutside);
  }
}

function closePanelsMenuOutside(e) {
  const menu = document.getElementById('panels-menu');
  const btn   = document.getElementById('panels-menu-btn');
  if(!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('open');
    panelsMenuOpen = false;
    document.removeEventListener('click', closePanelsMenuOutside);
  }
}

function refreshPanelsMenu() {
  const menu = document.getElementById('panels-menu');
  // keep header, rebuild rows
  const header = menu.querySelector('#panels-menu-header');
  // remove old rows
  menu.querySelectorAll('.pm-row').forEach(r => r.remove());

  Object.entries(PANEL_META).forEach(([id, meta]) => {
    const el     = document.getElementById(id);
    const isHidden = el ? el.classList.contains('hidden') : false;
    const isMin    = el ? el.classList.contains('minimised') : false;

    const row = document.createElement('div');
    row.className = 'pm-row';

    row.innerHTML = `
      <span class="pm-label" style="color:${isHidden ? 'var(--text3)' : 'var(--text2)'}">${meta.label}</span>
      <div class="pm-controls">
        <button class="pm-min-btn ${isMin ? 'active' : ''}"
          onclick="minimisePanel('${id}');refreshPanelsMenu();"
          title="${isMin ? 'Restore' : 'Minimise'}">${isMin ? 'RESTORE' : 'MIN'}</button>
        <button class="pm-toggle ${!isHidden ? 'on' : ''}"
          onclick="isHidden ? showPanel('${id}') : closePanel('${id}');refreshPanelsMenu();"
          title="${isHidden ? 'Show' : 'Hide'}"></button>
      </div>`;

    // Fix onclick closures properly
    const minBtn    = row.querySelector('.pm-min-btn');
    const toggle    = row.querySelector('.pm-toggle');
    minBtn.onclick  = (e) => { e.stopPropagation(); minimisePanel(id); refreshPanelsMenu(); };
    toggle.onclick  = (e) => { e.stopPropagation(); isHidden ? showPanel(id) : closePanel(id); refreshPanelsMenu(); };

    menu.appendChild(row);
  });
}

// Load saved state on init
loadPanelState();
// Build menu initially (hidden but ready)
refreshPanelsMenu();

setTimeout(()=>{
  // Initialise ghost prediction data before first draw
  const slice=chartData.slice(-15),trend=(slice[slice.length-1]-slice[0])/15;
  for(let g=1;g<=20;g++) ghostData.push(chartData[chartData.length-1]+trend*g+(Math.random()-.5)*7);
  drawChart(null);buildSparklines();renderWhisper();initChartCrosshair();buildCorrelation();
},120);
