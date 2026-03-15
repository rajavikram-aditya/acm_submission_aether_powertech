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
