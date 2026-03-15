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
  setChromaLevel(maxSev);
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
    if(maxSev === 0)      { status.textContent='● NOMINAL';           status.className='sb-item'; }
    else if(maxSev === 1) { status.textContent='◉ ELEVATED';          status.className='sb-item active'; }
    else if(maxSev === 2) { status.textContent='◉ ANOMALY DETECTED';  status.className='sb-item critical'; }
    else                  { status.textContent='⬟ CRITICAL ANOMALY';  status.className='sb-item critical'; }
  }, 900);

  // ── LAYER 4: Whisper panel fires ~1.5s later ──
  setTimeout(() => {
    if(anomalies.length > 0) {
      anomalies.sort((a,b) => b.z - a.z);
      const top = anomalies[0];
      if(top.sev >= 1) emitWhisper(top);
    }

    const wp = document.getElementById('panel-whisper');
    wp.classList.toggle('anomaly-glow', maxSev >= 2);

    const wb = document.getElementById('whisper-badge');
    if(maxSev >= 2) {
      wb.textContent = '⚠ SIGNAL';
      wb.className = 'panel-badge badge-warn';
    } else {
      wb.textContent = 'ANOMALY ENGINE';
      wb.className = 'panel-badge badge-ai';
    }

    // Sound + pulse button — only if sound is enabled
    if(soundOn && maxSev >= 2) {
      playAlertSound(maxSev);
      const snd = document.getElementById('sound-toggle');
      if(snd) {
        snd.classList.add('pulse');
        setTimeout(() => snd.classList.remove('pulse'), 2000);
      }
    }
  }, 1500);

  // ── LAYER 5: AI Signals reacts last ~3s later ──
  setTimeout(() => {
    if(anomalies.length > 0 && anomalies[0].sev >= 2) {
      const top = anomalies[0];
      aiSignals.unshift({
        sym:  top.sym,
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
  const feed = document.getElementById('whisper-feed');
  if(!feed) return;
  const latest = feed.querySelector('.whisper-item');
  if(latest) latest.classList.add('decayed');

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
  const msg  = pool[Math.floor(Math.random() * pool.length)];
  const now  = new Date();
  const ts   = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  // Deduplicate — don't push same sym within 3s
  const last = whisperLog[0];
  if(last && last.sym === a.sym && (Date.now() - last.time) < 3000) return;

  // For sev2+, inject the ambient "Something unusual is happening" header once every 5s
  if(a.sev >= 2 && (!last || last.sym !== '__ambient__' || (Date.now() - last.time) > 5000)) {
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
    <div class="whisper-item sev${w.sev}${w.decayed ? ' decayed' : ''}">
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
  if(level === 1)      document.body.classList.add('chroma-low');
  else if(level === 2) document.body.classList.add('chroma-med');
  else if(level === 3) document.body.classList.add('chroma-high');
}