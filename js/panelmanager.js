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
// ── BOOT SEQUENCE ──
const BOOT_STEPS = [
  { pct:  8, msg: 'CONNECTING TO NSE FEED...' },
  { pct: 20, msg: 'LOADING MARKET DATA...' },
  { pct: 35, msg: 'CALIBRATING SIGNAL STREAM...' },
  { pct: 50, msg: 'INITIALISING CHART ENGINE...' },
  { pct: 65, msg: 'LOADING SEBI REGULATORY FEED...' },
  { pct: 78, msg: 'WARMING UP ANOMALY ENGINE...' },
  { pct: 88, msg: 'BUILDING CORRELATION MATRIX...' },
  { pct: 96, msg: 'RESTORING WORKSPACE LAYOUT...' },
  { pct:100, msg: 'AETHER ONLINE.' },
];

function runBootSequence() {
  const bar    = document.getElementById('loader-bar');
  const status = document.getElementById('loader-status');
  const loader = document.getElementById('loader');
  let step = 0;

  function nextStep() {
    if(step >= BOOT_STEPS.length) {
      const slice = chartData.slice(-15);
      const trend = (slice[slice.length-1] - slice[0]) / 15;
      for(let g=1;g<=20;g++) ghostData.push(chartData[chartData.length-1]+trend*g+(Math.random()-.5)*7);
      drawChart(null);
      buildSparklines();
      renderWhisper();
      initChartCrosshair();
      buildCorrelation();
      setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => loader.style.display = 'none', 650);
      }, 500);
      return;
    }
    const s = BOOT_STEPS[step];
    bar.style.width    = s.pct + '%';
    status.textContent = s.msg;
    step++;
    const delay = step === BOOT_STEPS.length ? 400 : 180 + Math.random() * 160;
    setTimeout(nextStep, delay);
  }

  setTimeout(nextStep, 300);
}

runBootSequence();
