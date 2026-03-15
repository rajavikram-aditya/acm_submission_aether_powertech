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

let audioCtx = null;
let soundOn = false;

function getAudioCtx() {
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playAlertSound(severity) {
  if(!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const beepCount = severity >= 3 ? 3 : severity >= 2 ? 2 : 1;
    const freq      = severity >= 3 ? 880 : severity >= 2 ? 660 : 440;
    const vol       = severity >= 3 ? 0.18 : 0.10;
    for(let b = 0; b < beepCount; b++) {
      const startTime = ctx.currentTime + b * 0.18;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, startTime + 0.12);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.13);
      osc.start(startTime);
      osc.stop(startTime + 0.14);
    }
  } catch(e) { console.warn('Aether audio error:', e.message); }
}

function playAlertTick() {
  if(!soundOn) return;
  try {
    const ctx = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch(e) {}
}

function toggleSound() {
  soundOn = !soundOn;
  const el = document.getElementById('sound-toggle');
  if(!el) return;
  if(soundOn) {
    el.textContent = '🔊 SOUND ON';
    el.classList.add('on');
    playAlertSound(1);
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
