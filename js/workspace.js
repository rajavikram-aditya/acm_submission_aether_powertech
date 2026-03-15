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


