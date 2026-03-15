# AETHER — Function Reference

Complete documentation of every function across all JavaScript modules.

---

## data.js — Market Data & Constants

This file defines all static data and is loaded first. No functions — only constants.

| Constant | Type | Description |
|---|---|---|
| `STOCKS` | Array | 12 NSE stocks with starting price, % change, volume (Lakhs), momentum seed |
| `INDICES` | Array | NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX with value and day change |
| `SECTORS` | Array | 8 NSE sectors with intraday % move |
| `SEBI_DATA` | Array | 4 SEBI circulars with id, date, title, tags, impact level, linked instruments, and body text |
| `AI_SIGNALS_BASE` | Array | 4 base AI signal cards (bull/bear/neutral) with symbol, confidence %, and analysis text |
| `fmtPrice(p)` | Function | Formats a number using Indian locale with exactly 2 decimal places (e.g. `2,847.35`) |
| `formatVol(crores)` | Function | Formats volume: above 100 = Cr, above 1 = L, below 1 = K (e.g. `12.4L`, `2.8Cr`) |

### State Variables (also in data.js)
| Variable | Description |
|---|---|
| `prices` | Live copy of STOCKS — mutated every tick |
| `indicesData` | Live copy of INDICES |
| `sectorsData` | Live copy of SECTORS |
| `aiSignals` | Live AI signal list — signals prepended over time |
| `activeZ` | Z-index counter for panel elevation management |
| `chromaLevel` | Current background shift level: 0=none, 1=low, 2=med, 3=high |
| `whisperLog` | Array of anomaly log entries shown in The Whisper panel |
| `pulse` | Global heartbeat counter, increments every 200ms |
| `priceHistory` | 2D array — rolling 20-tick price buffer per stock for Z-score |
| `ZSCORE_WINDOW` | `20` — window size for rolling Z-score calculation |
| `chartData` | Array of ~200–260 NIFTY 50 price points for the main chart |
| `ghostData` | Pre-computed ghost prediction line data (stable between redraws) |
| `sparkHistory` | 2D array — 60-tick rolling history per index for sparklines |
| `volVals` | Object — current values for VIX, NIFTY IV, BANK IV, PCR |

---

## anomaly.js — Z-Score Engine & Whisper Feed

The core differentiator of the terminal.

---

### `zScore(arr)`
**Purpose:** Calculates the Z-score of the last value in a rolling array against the array's mean and standard deviation.

**Formula:** `Z = |x_last - mean| / std`

**Parameters:**
- `arr` — Array of numbers (price history buffer)

**Returns:** Number — the Z-score. Returns `0` if array has fewer than 4 elements or if standard deviation is 0.

**Example:** If RELIANCE has traded at [2840, 2841, 2839, 2840] and then spikes to 2911, the Z-score will be very high (>3.5), triggering a Critical anomaly.

---

### `severityFromZ(z)`
**Purpose:** Maps a Z-score to a severity level integer.

**Returns:**
- `3` — Critical (Z ≥ 3.5)
- `2` — Anomaly (Z ≥ 2.5)
- `1` — Elevated (Z ≥ 1.8)
- `0` — Nominal

---

### `checkAnomalies()`
**Purpose:** Runs the full anomaly detection pipeline. Called only by `triggerDemoAnomaly()` — NOT in the automatic heartbeat.

**What it does (in order):**
1. Calculates Z-score for every stock's price history buffer
2. Determines `maxSev` — the highest severity across all stocks
3. **Layer 1 (immediate):** Updates background via `setChromaLevel()`, fires the anomaly bar colour/animation
4. **Layer 2 (400ms delay):** Highlights affected stream rows with amber border and ⚠ symbol
5. **Layer 3 (900ms delay):** Updates the status bar text (NOMINAL → ELEVATED → ANOMALY DETECTED → CRITICAL ANOMALY)
6. **Layer 4 (1500ms delay):** Emits a Whisper entry, glows the Whisper panel, pulses the sound button
7. **Layer 5 (3000ms delay):** Injects an anomaly AI signal into the AI Signals panel

The staggered timing is intentional — it makes the terminal feel like a living system where different subsystems react at different speeds.

---

### `emitWhisper(anomalyObj)`
**Purpose:** Creates a new entry in The Whisper feed log.

**Parameters:** `anomalyObj` — `{ sym, z, sev, price, chg }`

**Behaviour:**
- Selects a severity-appropriate message from a pool of 2 per severity level
- Deduplicates: if the same symbol triggered a whisper within the last 3 seconds, skips
- Prepends to `whisperLog`, trims to 14 entries maximum
- Calls `renderWhisper()` to update the DOM

---

### `emitDecay()`
**Purpose:** Adds a "signal resolved" marker to the Whisper feed when an anomaly self-corrects. (Currently only called in edge cases — not in main flow.)

---

### `renderWhisper()`
**Purpose:** Rebuilds the Whisper feed DOM from `whisperLog`.

**Visual output per entry:**
- Symbol name (bold)
- Z-score value
- Timestamp (HH:MM:SS)
- Human-readable message
- Left border colour: amber (sev1), red (sev2+), red pulsing (sev3)

---

### `setChromaLevel(level)`
**Purpose:** Changes the terminal's background colour class to reflect anomaly severity.

**Parameters:** `level` — 0, 1, 2, or 3

**CSS classes applied:**
- `0` — no class (default `#0c0d11`)
- `1` — `chroma-low` (`#0d1118` — faint blue-grey)
- `2` — `chroma-med` (`#100e1a` — faint violet)
- `3` — `chroma-high` (`#160a0a` — faint red)

Transition is 2 seconds so the shift is gradual and atmospheric, not jarring.

---

## panels.js — Panel Renderers & Chart Engine

The largest module. Handles all visual panel content.

---

### Clock & Market Status

#### `updateClock()`
Updates `#clock` with the current IST time every second. Also checks the current time against NSE session hours to update `#mkt-status` badge: PRE-OPEN (09:00–09:15), LIVE (09:15–15:30), CLOSED otherwise.

---

### Ticker Bar

#### `buildTicker()`
Renders the scrolling top ticker with all 12 stocks and the first 3 indices. Creates two identical copies for seamless CSS animation loop.

---

### Signal Stream

#### `buildStream()`
Builds the full stream DOM — header row plus one row per stock with: symbol, LTP, % change, mini bar, volume, and alert icon slot. Called once on init.

#### `updateStream()`
Called every 200ms by the heartbeat. Updates internal price state every tick but only updates the DOM every 6th tick (≈1.2 seconds) for realism.

**Price simulation per tick:**
```js
newMomentum = momentum * 0.85 + random(-0.0002, +0.0002)
tickPct = newMomentum + random(-0.00015, +0.00015)
price = price * (1 + tickPct)
chg = clamp(chg + random(-0.004, +0.004), -8, +8)
vol += random(0, 0.08)  // volume accumulates
```

On display tick: updates LTP text, flashes the row green/red, updates % change and volume, pushes new price to `priceHistory` buffer.

---

### Chart

#### `getChartGeometry()`
Returns an object with all chart coordinate helpers: `W`, `H`, `pad`, `cw`, `ch`, `data`, `min`, `max`, `range`, `toX(i)`, `toY(v)`, `fromX(x)`. Called before every draw.

#### `drawChart(mouse)`
Main chart render function. Called by `updateChart()` and on every `mousemove` event.

**Renders (in order):**
1. Horizontal grid lines + Y-axis price labels
2. X-axis time labels (09:15, 10:30, 11:45, 13:00, 14:15, 15:30) with tick marks
3. Area fill (gradient from blue to transparent)
4. Main price line (solid blue, 1.6px)
5. Ghost prediction line (dotted violet)
6. SEBI event markers (amber dashed verticals with pill labels and dots on the line)
7. Current price dashed horizontal line + badge (when no crosshair)
8. Crosshair (when mouse is hovering): vertical + horizontal lines, dot on price, time badge on X-axis, price badge on Y-axis, full OHLC tooltip

**Parameters:** `mouse` — `{x, y}` in canvas pixel coordinates, or `null`

#### `indexToTime(idx, total)`
Maps a data array index to an approximate NSE session time string (HH:MM). Maps 0 → "09:15" and `total-1` → "15:30" linearly.

#### `updateChart()`
Appends a new price point to `chartData`, trims to 260 points, recomputes `ghostData`, calls `drawChart(chartMouse)`.

#### `initChartCrosshair()`
Attaches `mousemove` and `mouseleave` event listeners to the chart canvas. Updates `chartMouse` and triggers a full chart redraw on every mouse move within the plot area. Sets cursor to `crosshair`.

---

### Order Book

#### `buildOrderBook()`
Generates and renders a simulated 5-level bid/ask order book based on the current NIFTY price. Asks above, bids below, spread in the middle. Proportional depth bars behind each row. Called every 2 seconds.

---

### Sparklines

#### `buildSparklines()`
Renders the Indices panel — creates a canvas element per index, calls `drawSparkline(i)` for each.

#### `drawSparkline(i)`
Draws a single 22px-tall sparkline for index `i` onto its canvas. Green if the index is up on the day, red if down.

#### `updateSparklines()`
Adds a new point to each index's `sparkHistory`, trims to 80 points, updates the displayed value, redraws. Called every second.

---

### Volatility Meter

#### `buildVolMeter()`
Renders the 4-row volatility meter (India VIX, NIFTY IV, BANK IV, PCR) with colour-coded progress bars.

#### `updateVol()`
Drifts each volatility value slightly, updates bar widths and colours. Called every 600ms.

---

### Sector Heatmap

#### `buildHeatmap()`
Renders the 8-cell heatmap grid. Background colour intensity scales with the magnitude of the sector's move.

#### `updateHeatmap()`
Drifts each sector's value by a small random amount, updates cell backgrounds and text. Called every second.

---

### SEBI Gravity

#### `buildSebi()`
Renders all SEBI circular items in the SEBI panel. First item gets the `new-circular` animation (amber pulse on load).

#### `openSebiDetail(idx)`
Opens the Focus Mode slide-over for circular at index `idx`. Dims the workspace, populates slide-over with full circular text, affected instruments, keyword chips, and an AI analysis classification. Calls `drawTether()`.

#### `closeSlideover()`
Closes the slide-over, removes workspace dim, clears the tether canvas.

#### `linkTag(tag, event)`
Toggles highlight on SEBI tag chips. When a tag is linked, all matching tags across the panel highlight in blue.

---

### Tether

#### `drawTether()`
Draws a bezier curve from the SEBI panel to the Signal Stream panel using the Canvas 2D API. Uses a gradient stroke from amber (SEBI side) to blue (stream side). Dots mark each endpoint.

#### `clearTether()`
Clears the tether canvas.

---

## signals.js — AI Signals, Correlation, Alerts, Sound, Snapshot

---

### AI Signals

#### `buildSignals()`
Renders the AI Signals panel from the `aiSignals` array. Each card has a coloured left border (green=bull, red=bear, purple=neutral, amber=anomaly).

#### `maybeNewSignal()`
Called every ~15 seconds. Has a 40% chance of prepending a new AI signal from a pool of 4 templates. Trims to 6 signals maximum.

---

### Stream Sparklines

#### `drawStreamSparkline(i)`
Draws a tiny 30-tick sparkline for stock `i` in the rightmost column of the Signal Stream. Shows the very recent price direction at a glance.

---

### Sound

#### `toggleSound()`
Toggles `soundOn` boolean. Updates the sound button label and styling. When enabled, a short synthetic tone (two quick beeps using Web Audio API oscillators) plays on anomaly detection severity ≥ 2.

---

### Correlation Matrix

#### `computeCorrelation(idxA, idxB)`
Calculates the Pearson correlation coefficient between the spark histories of two indices.

**Formula:**
```
r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² · Σ(y - ȳ)²)
```
Returns a value from -1.0 (perfectly inverse) to +1.0 (perfectly correlated).

#### `buildCorrelation()`
Renders the 4×4 correlation matrix grid for NIFTY, SENSEX, BANK NIFTY, and VIX. Diagonal cells show "1.00" in blue. Off-diagonal cells are colour-coded: green for positive correlation, red for negative.

#### `updateCorrelation()`
Recomputes all correlation values and updates cell backgrounds and text. Called every 2 seconds.

---

### Price Alerts

#### `setPriceAlert(i, target)`
Sets a price alert for stock at index `i` targeting price `target`. Stores in `priceAlerts[i]` as `{ target, direction: 'above'|'below' }`. Direction is inferred from whether target is above or below the current price.

#### `updateAlertIcon(i)`
Updates the alert icon (⚡) in a stream row based on whether an alert is set for that stock.

#### `checkPriceAlert(i, oldPrice, newPrice)`
Called on every price update. If an alert is set and the price crosses the target, fires the alert: flashes the row amber, plays a sound if enabled, shows a brief notification, then clears the alert.

---

### Export

#### `exportSnapshot()`
Uses `html2canvas` to capture the full `document.body` as a PNG canvas, then triggers a download as `aether-snapshot-[timestamp].png`. Called on `S` keypress.

---

## workspace.js — Keyboard, Drag/Resize, Layout, Command Palette, Presets, Heartbeat

---

### Demo & Keyboard

#### `triggerDemoAnomaly()`
Forces a 2.5% price spike on RELIANCE (index 0) and TCS (index 1) by:
1. Pushing 5 progressively larger prices into their `priceHistory` buffers
2. Directly updating their `price` and `chg` values
3. Immediately updating DOM elements for those rows (no wait for next display tick)
4. Calling `checkAnomalies()` to fire the full cascade
5. Scheduling a full reset (chroma, bar, rows, whisper, badge) after 8 seconds

**Keyboard trigger:** `A`
**Click trigger:** `⚡ DEMO ANOMALY` button

#### Keyboard Handler (document.addEventListener)
| Key | Action |
|---|---|
| `A` | `triggerDemoAnomaly()` |
| `S` | `exportSnapshot()` |
| `Cmd/Ctrl + K` | `openCmd()` |
| `Esc` | Close any open overlay |
| `?` | `openShortcuts()` |
| `M` | `applyPreset('macro')` |
| `R` | `applyPreset('regulatory')` |
| `T` | `applyPreset('trading')` |

Keyboard handler skips all shortcuts if the focused element is an `<input>`.

---

### Panel Drag & Resize

#### `initPanel(id)`
Attaches drag (header `mousedown`) and resize (resize-handle `mousedown`) event listeners to a panel. Also attaches `mousedown` on the panel itself to call `bringToFront()`.

**Drag behaviour:** Tracks mouse offset from panel corner, updates `left` and `top` CSS, clamps to workspace bounds so the header is always retrievable.

**Resize behaviour:** Tracks initial dimensions and mouse position, updates `width` and `height` CSS, enforces minimum 160×80px. Triggers `drawChart(null)` and sparkline redraws on resize.

Both save layout to localStorage via `saveLayout()`.

#### `bringToFront(panel)`
Increments `activeZ` and sets it as the panel's `z-index`. Removes `active` class from all panels, adds it to the clicked panel.

---

### Layout Persistence

#### `saveLayout()`
Serialises all panel positions and dimensions to `localStorage` under key `aether2-layout`.

#### `loadLayout()`
Restores saved panel positions and dimensions from `localStorage` on page load.

---

### Command Palette

#### `openCmd()`
Opens the command palette overlay, clears the input, focuses it, and calls `renderCmd('')` to show all results.

#### `closeCmd()`
Hides the command palette overlay.

#### `renderCmd(query)`
Filters the `CMD` array by the query string (matches against title, subtitle, and group). Groups results by category. Renders clickable result rows with icon, title, subtitle, and group tag.

#### `runCmd(index)`
Executes the action function for command at `CMD[index]`, then calls `closeCmd()`.

**Command palette items:**
- Tickers: NIFTY 50, SENSEX, RELIANCE (bring panel to front)
- SEBI: F&O Margin, LODR Amendment, New Asset Class (open slide-over)
- Presets: Macro View, Regulatory Focus, Trading Desk
- Actions: Trigger Demo Anomaly

---

### Workspace Presets

#### `applyPreset(name)`
Applies a named layout preset by setting `left`, `top`, `width`, `height` on each panel. Triggers chart and sparkline redraws after 60ms. Updates preset button active state.

**Available presets:**
- `'macro'` — balanced overview
- `'regulatory'` — SEBI panel dominant
- `'trading'` — order book and stream dominant

---

### Heartbeat

The main `setInterval` runs every 200ms and controls all update timing:

```js
setInterval(() => {
  pulse++;
  updateStream();                    // every 200ms (display every 1.2s)
  if(pulse % 3 === 0)  updateVol(); // every 600ms
  if(pulse % 5 === 0)  { updateSparklines(); updateHeatmap(); } // every 1s
  if(pulse % 10 === 0) { updateChart(); buildOrderBook(); updateCorrelation(); } // every 2s
  if(pulse % 75 === 0) maybeNewSignal(); // every ~15s
}, 200);
```

Anomaly detection is **not** in this loop — it is manual only.

---

## panelmanager.js — Panel Visibility System

---

### `loadPanelState()`
Reads `aether-panel-state` from localStorage and applies saved `hidden` or `minimised` classes to panels on page load.

### `savePanelState()`
Writes current `panelState` object to localStorage.

### `closePanel(id, event)`
Hides a panel completely (`display: none`). Updates `panelState[id] = 'hidden'`. Refreshes the panel menu.

### `minimisePanel(id, event)`
Toggles minimised state. When minimised, the panel body and resize handle hide — only the header remains visible. The panel can still be dragged while minimised. Refreshes the panel menu.

### `showPanel(id)`
Removes both `hidden` and `minimised` classes. Restores the panel to full visibility.

### `showAllPanels()`
Calls `showPanel()` on every panel in `PANEL_META`.

### `togglePanelsMenu()`
Opens or closes the `#panels-menu` dropdown. Attaches an outside-click handler when open to close it automatically.

### `closePanelsMenuOutside(event)`
Closes the panels menu if the click target is outside both the menu and the trigger button.

### `refreshPanelsMenu()`
Rebuilds the panels menu rows from scratch. For each panel in `PANEL_META`, renders a row with the panel label, a MIN button, and a toggle switch. Correctly reflects current hidden/minimised state.

---

## SEBI_DATA Reference

| ID | Date | Impact | Tags |
|---|---|---|---|
| SEBI-2025-001 | 14 Jun 2025 | HIGH | F&O, Margin, Derivatives |
| SEBI-2025-002 | 12 Jun 2025 | MED | Disclosure, LODR, Compliance |
| SEBI-2025-003 | 10 Jun 2025 | LOW | Cybersecurity, Technology |
| SEBI-2025-004 | 08 Jun 2025 | HIGH | HNI, Investment, New Asset Class |

---

## Initialisation Sequence

When the page loads, scripts execute in this order:

1. `data.js` — constants and state variables defined
2. `anomaly.js` — anomaly functions defined, `anomalyTimers` initialised
3. `panels.js` — all panel build/update functions defined; `buildStream()`, `buildTicker()`, `buildOrderBook()`, `buildVolMeter()`, `buildHeatmap()`, `buildSebi()` called immediately; `updateClock()` interval started; `initChartCrosshair()` scheduled for 150ms
4. `signals.js` — `buildSignals()`, `buildCorrelation()` called immediately
5. `workspace.js` — `initPanel()` called for all 10 panels; `loadLayout()` restores saved positions; heartbeat interval and latency interval started
6. `panelmanager.js` — `loadPanelState()` restores saved visibility; `refreshPanelsMenu()` builds the menu
7. `setTimeout` at 120ms — `drawChart(null)`, `buildSparklines()`, `renderWhisper()`, `initChartCrosshair()`, `buildCorrelation()` called after all DOM is ready
