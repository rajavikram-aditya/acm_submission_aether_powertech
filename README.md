# AETHER — Market Operations Terminal

> *"Every other team built a dashboard. We built something that notices things before the analyst does."*

A high-performance, browser-based financial market terminal built for the ACM PowerTech Hackathon. Aether is designed as a **living instrument** — a workspace where information moves constantly, panels react independently, and the system whispers when something unusual is happening in the market.

---

## 🚀 Quick Start

No installation required. No build step. No dependencies to install.

```bash
git clone https://github.com/your-team/aether
cd aether
# Open index.html in any modern browser
# Chrome or Edge recommended for best Canvas performance
```

> **Important:** Open via a local server for best results (e.g. `python -m http.server 8000`) since some browsers restrict ES module loading from `file://`.

---

## 📁 Project Structure

```
aether/
├── index.html              # Main entry point — clean HTML shell
├── css/
│   └── main.css            # All styles — design tokens, panels, animations
├── js/
│   ├── data.js             # Market data, SEBI circulars, AI signals
│   ├── anomaly.js          # Z-score engine, Whisper feed, Chroma shift
│   ├── panels.js           # All panel renderers — chart, stream, order book, etc.
│   ├── signals.js          # AI signals, correlation matrix, price alerts, sound
│   ├── workspace.js        # Drag/resize, keyboard shortcuts, command palette, presets
│   └── panelmanager.js     # Panel show/hide/minimise, visibility menu
├── docs/
│   └── FUNCTIONS.md        # Full function reference (this document)
└── README.md
```

---

## ✨ Features

### 1. Living Instrument Architecture
- **200ms Global Heartbeat** — all data and animations sync to a single pulse loop
- **Realistic NSE Price Simulation** — momentum-based drift, mean reversion, Indian locale formatting (₹, Lakhs, Crores)
- **Staggered Panel Updates** — each panel reacts at a different interval, creating the feel of independent instruments responding to the same data

### 2. The Whisper — Anomaly Detection Engine
- **Rolling Z-Score** — 20-period statistical deviation calculated continuously on every stock's price buffer
- **3-Tier Severity** — Elevated (Z>1.8), Anomaly (Z>2.5), Critical (Z>3.5)
- **Manual Trigger** — Press `A` to force a demo anomaly spike for presentations
- **Staggered Cascade** — anomaly triggers 5 visual layers with different delays for dramatic effect
- **Auto-Reset** — all visual states clean up automatically after 8 seconds

### 3. Chromatic Shift
- Terminal background colour shifts with anomaly severity: charcoal → blue-grey → violet → red
- 2-second CSS transition so it creeps rather than snaps
- Anomaly bar (2px line below topbar) pulses with severity-matched animation speed

### 4. NIFTY 50 Chart
- **Canvas-rendered** at 60fps — no DOM re-renders
- **Full OHLC Crosshair** — hover for Open/High/Low/Close tooltip with NSE session time (09:15→15:30)
- **Predictive Ghost Line** — dotted violet trend extrapolation
- **SEBI Event Markers** — amber dashed lines pinned to chart positions showing when each circular hit the market
- **Time Axis** — labelled from 09:15 to 15:30 with subtle grid lines
- **Price Badges** — live price badge on right Y-axis, crosshair badge on hover

### 5. Signal Stream
- 12 NSE blue-chip stocks with realistic intraday price simulation
- **Momentum carry** — each stock has internal momentum that decays 85% per tick
- **Volume display** — formatted as K/L/Cr (thousands/lakhs/crores)
- **Price alert system** — right-click or double-click a row to set a price alert, ⚡ icon fires when triggered
- **Mini sparkline** — per-row 30-tick mini chart showing recent price direction
- **Anomaly highlight** — affected rows get amber left border and ⚠ icon during anomaly

### 6. SEBI Gravity Panel
- 4 real-style SEBI circulars with impact indicators (red/amber/grey)
- **Focus Mode** — click any circular to open a slide-over that dims the workspace while keeping tickers visible
- **Tether Line** — a bezier curve connects the SEBI panel to the Signal Stream when Focus Mode is open
- **Keyword Tags** — clicking tags highlights related instruments

### 7. Order Book
- Live bid/ask depth for NIFTY with 5 levels each side
- Proportional depth bars visualise queue imbalance
- Spread displayed between the two sides
- Refreshes every 2 seconds

### 8. Sector Heatmap
- 8 NSE sectors (IT, BANK, AUTO, PHARMA, FMCG, METAL, ENERGY, REALTY)
- Colour intensity scales with magnitude of move
- Updates every 1 second

### 9. Volatility Meter
- India VIX, NIFTY IV, BANK IV, Put-Call Ratio
- Colour-coded bars: green < 35%, amber < 60%, red above
- Realistic drift simulation

### 10. Indices Sparklines
- NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX
- 60-tick rolling sparkline per index, updates every 1 second

### 11. AI Signals Panel
- Bull/Bear/Neutral signal cards with confidence percentage
- New signals inject automatically every ~15 seconds
- Anomaly signals inject with amber border during demo trigger

### 12. Correlation Matrix
- Pearson correlation between 4 key indices (NIFTY, SENSEX, BANK, VIX)
- Colour-coded cells: green = positive correlation, red = negative
- Updates every 2 seconds

### 13. Elastic Workspace
- **Draggable panels** — grab any panel header to reposition
- **Resizable panels** — drag the bottom-right corner handle
- **Z-index intelligence** — clicking a panel brings it to front with elevation shadow
- **Bounds enforcement** — panels cannot be dragged off-screen
- **Layout persistence** — `localStorage` saves your exact arrangement across browser refreshes

### 14. Panel Visibility Manager
- **⊞ PANELS** button in top bar opens the visibility menu
- Toggle switch per panel (blue = visible, grey = hidden)
- MIN button collapses a panel to its header bar only (title still visible, draggable)
- Amber/red dots appear on panel header hover — click to minimise or close
- SHOW ALL button restores all panels
- State persists in `localStorage`

### 15. Command Palette
- `Cmd+K` (or `Ctrl+K`) opens the palette
- Search tickers, SEBI circulars, or workspace presets
- Fuzzy match across title, subtitle, and group
- Keyboard-navigable

### 16. Workspace Presets
- **Macro View** (`M`) — balanced overview of all panels
- **Regulatory Focus** (`R`) — SEBI panel dominates, circulars front and centre
- **Trading Desk** (`T`) — order book and stream fill the screen

### 17. Market Status Indicator
- Reads the actual current time and shows: `PRE-OPEN` (09:00–09:15), `LIVE` (09:15–15:30), or `CLOSED`
- Green/amber/grey badge in the top bar

### 18. Sound Toggle
- `🔇 SOUND OFF` / `🔊 SOUND ON` in status bar
- Web Audio API generates a short synthetic tone on anomaly detection
- No external audio files needed

### 19. Export Snapshot
- Press `S` to capture a PNG screenshot of the full terminal
- Powered by html2canvas
- Automatically downloads as `aether-snapshot.png`

### 20. Keyboard Shortcuts
- Press `?` to open the shortcuts overlay
- `A` — trigger demo anomaly
- `S` — export snapshot
- `M` / `R` / `T` — switch workspace presets
- `Cmd+K` — command palette
- `Esc` — close any open overlay

---

## 🎨 Design System

### Colour Palette
| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0c0d11` | Base background |
| `--bg2` | `#13151b` | Panel backgrounds |
| `--bg3` | `#191c24` | Slide-overs, overlays |
| `--text` | `#f0f2f8` | Primary text |
| `--text2` | `#a8adc0` | Secondary text |
| `--text3` | `#606680` | Labels, hints |
| `--green` | `#3de0a8` | Positive / bullish |
| `--red` | `#ff6b6b` | Negative / bearish |
| `--amber` | `#ffb830` | Warning / SEBI / anomaly |
| `--accent` | `#5aa8ff` | Interactive, chart line |
| `--accent2` | `#9b8fff` | AI / ghost prediction |

### Typography
- **Display / Data**: IBM Plex Mono (400, 500, 600)
- **Prose / Labels**: IBM Plex Sans (400, 500, 600)

---

## 🧠 Technical Architecture

### Anomaly Engine (anomaly.js)
The core differentiator. Uses a **rolling 20-period Z-score** formula:

```
Z = |x_last - mean(window)| / std(window)
```

Severity thresholds: Z ≥ 1.8 (elevated), Z ≥ 2.5 (anomaly), Z ≥ 3.5 (critical).

The demo trigger forces a 2.5% price spike across two stocks, pushing their Z-scores above 3.5 instantly.

### Heartbeat Loop (workspace.js)
```
200ms  — price tick (internal state, display every 1.2s)
600ms  — volatility meter update
1000ms — sparklines + heatmap
2000ms — chart redraw + order book + correlation
~15s   — new AI signal injection
```
Anomaly detection is **manual only** — not in the heartbeat loop.

### Chart Rendering (panels.js)
Pure Canvas 2D API. The canvas is resized on every draw call to match the panel's current DOM dimensions, so it always fills cleanly after resize. The crosshair redraws the entire canvas on every `mousemove` event — this is fast because canvas operations are GPU-accelerated and the data set is small (~200–260 points).

### Price Simulation (data.js + panels.js)
Each stock has a `momentum` property. On every tick:
```
newMomentum = momentum * 0.85 + random(-0.0002, +0.0002)
tickPct = newMomentum + random(-0.00015, +0.00015)
price = price * (1 + tickPct)
```
This produces realistic mean-reverting drift rather than pure random walk.

---

## 📋 Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 100+ | ✅ Fully supported |
| Edge 100+ | ✅ Fully supported |
| Firefox 100+ | ✅ Supported |
| Safari 15+ | ✅ Supported |

Requires: Canvas 2D API, CSS Custom Properties, `roundRect()` (Chrome 99+), Web Audio API, localStorage.

---

## 👥 Team

Built for the ACM PowerTech Hackathon.

---

## 📄 License

MIT License — free to use, modify, and distribute.
