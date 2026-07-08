# Chart Implementation Plan

## Phase 1: Fix Broken Charts

### 1.1 Add Missing Containers to admin.html

**Add after line 160** (after KPI grid closes):
```html
<!-- FINANCE + TREND CHARTS ROW -->
<div class="dash-grid">
  <div class="dash-card">
    <div class="dash-card-h">💰 แนวโน้มการเงิน 14 วัน</div>
    <div class="chart-period-filter" style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;">
      <button class="period-btn" onclick="changeFinancePeriod(7,this)">7 วัน</button>
      <button class="period-btn active" onclick="changeFinancePeriod(14,this)">14 วัน</button>
      <button class="period-btn" onclick="changeFinancePeriod(30,this)">30 วัน</button>
    </div>
    <div id="financeChart" style="width:100%;height:240px;"></div>
    <div id="financeLegend" style="display:flex;gap:16px;justify-content:center;margin-top:6px;flex-wrap:wrap;"></div>
  </div>
  <div class="dash-card">
    <div class="dash-card-h">📊 แนวโน้มการจอง 14 วัน</div>
    <div id="trendChart" style="width:100%;height:240px;"></div>
  </div>
</div>
```

**Add status donut chart to Reports view** (inside `#view-reports`, before `#monthlyReportSection`):
```html
<div class="dash-card" style="margin-bottom:16px;">
  <div class="dash-card-h">📊 สถานะการจองทั้งหมด</div>
  <div id="statusDonutChart" style="width:100%;height:280px;"></div>
</div>
```

### 1.2 Fix updateAllChartsTheme in admin.js (line 5652)

Change from:
```js
['dualTrendChart', 'wingRevenueChart', 'pipelineChart'].forEach(id => {
```
To:
```js
['dualTrendChart', 'wingRevenueChart', 'pipelineChart', 'financeChart', 'trendChart', 'statusDonutChart'].forEach(id => {
```
Also call `updateOptions` with chart-specific options (colors, labels) not just theme.

### 1.3 Update renderDashboardHome to draw finance + trend charts

In `renderDashboardHomeV2()` (line 4693), after drawing the 3 existing charts, add:
```js
if (isFullAccess) {
  renderFinanceOverview();
  drawReservationTrendChart();
}
```

---

## Phase 2: New Charts

### 2.1 Monthly Revenue Comparison (Grouped Bar — Reports)

```
Container: <div id="monthlyRevenueChart" style="width:100%;height:280px;"></div>
Function: drawMonthlyRevenueChart()
```

- Group bookings by month for current year
- Show two bars per month: "ชำระแล้ว" (paid) vs "รอชำระเงิน" (pending)
- Colors: green (#059669) for paid, amber (#d97706) for pending
- Tooltip: amount in THB + count

### 2.2 Booking Status Funnel (Horizontal Bar — Reports)

```
Container: <div id="statusFunnelChart" style="width:100%;height:200px;"></div>
Function: drawStatusFunnelChart()
```

- Show count at each status stage: All → Discipline Check → Participant Check → Payment → Paid/Completed
- Horizontal bars with decreasing widths (funnel style)
- Color gradient from blue to green
- Data labels show count and percentage

### 2.3 Visitor Type Distribution (Donut — Reports)

```
Container: <div id="visitorTypeChart" style="width:100%;height:260px;"></div>
Function: drawVisitorTypeChart()
```

- Classify visitors: main visitors, extra adults, children 5-8, children under 5
- Compute from `visitorCount` and `extraVisitors` fields
- Donut chart with distinct colors
- Center total: "XX คน"

### 2.4 Weekly Booking Heatmap (Home Dashboard)

```
Container: <div id="weeklyHeatmapChart" style="width:100%;height:200px;"></div>
Function: drawWeeklyHeatmapChart()
```

- X-axis: Mon → Sun (days of week)
- Y-axis: last 4 weeks
- Each cell = number of bookings that day
- Color intensity based on count (light → dark blue)
- Tooltip shows date + count

### 2.5 Wing Booking Count (Horizontal Bar — Home Dashboard)

```
Container: <div id="wingCountChart" style="width:100%;height:200px;"></div>
Function: drawWingCountChart()
```

- Count bookings per wing (not revenue)
- Horizontal bars, top 5 wings
- Color: single blue (#1e3a8a) with distributed shades
- Data labels show count

Add a 2-col grid section on the home dashboard after the existing `dash-grid`:
```html
<div class="dash-grid">
  <div class="dash-card">
    <div class="dash-card-h">🔥 สัปดาห์นี้ (Heatmap)</div>
    <div id="weeklyHeatmapChart" style="width:100%;height:200px;"></div>
  </div>
  <div class="dash-card">
    <div class="dash-card-h">🏢 จำนวนการจองแยกตามแดน</div>
    <div id="wingCountChart" style="width:100%;height:200px;"></div>
  </div>
</div>
```

---

## Phase 3: Responsiveness

### 3.1 Dynamic Chart Heights

Replace fixed height values with responsive formula:
```js
function getChartHeight(base, factor = 0.3) {
  const maxH = window.innerHeight * factor;
  return Math.max(180, Math.min(maxH, base));
}
```

### 3.2 Time Period Filter

```js
function changeFinancePeriod(days, btn) {
  // Update active button styling
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Recompute timeSeries with new day count
  const timeSeries = computeFinanceTimeSeries(allRows, days);
  const chartEl = document.getElementById('financeChart');
  if (chartEl && chartEl._apexChart) {
    chartEl._apexChart.destroy();
  }
  drawFinanceLineChart(chartEl, timeSeries);
}
```

### 3.3 Chart Export (Download PNG)

Add download button next to each chart header:
```html
<button onclick="exportChart('financeChart', 'แนวโน้มการเงิน')" class="btn btn-text btn-sm">📥</button>
```

```js
function exportChart(id, title) {
  const el = document.getElementById(id);
  if (el && el._apexChart) {
    el._apexChart.dataURI().then(({ imgURI }) => {
      const a = document.createElement('a');
      a.href = imgURI;
      a.download = `${title}-${new Date().toISOString().slice(0,10)}.png`;
      a.click();
    });
  }
}
```

### 3.4 Chart Skeleton Loader

Add CSS for chart shimmer:
```css
.chart-skeleton {
  background: linear-gradient(90deg, var(--bg) 25%, var(--bg2) 50%, var(--bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

Apply skeleton before chart renders:
```js
container.innerHTML = '<div class="chart-skeleton" style="height:240px;"></div>';
```

### 3.5 Chart Responsive Config

Add ApexCharts `responsive` config to all charts:
```js
responsive: [{
  breakpoint: 480,
  options: {
    chart: { height: 200 },
    legend: { position: 'bottom', fontSize: '10px' }
  }
}]
```

---

## Phase 4: CSS Additions

```css
/* Period filter buttons */
.period-btn {
  padding: 3px 10px; border: 1px solid var(--border);
  border-radius: 6px; background: var(--md-surface);
  color: var(--text2); font-size: 11px; cursor: pointer;
  font-family: 'Sarabun', sans-serif; transition: all 0.15s;
}
.period-btn:hover { border-color: var(--md-primary); color: var(--md-primary); }
.period-btn.active { background: var(--md-primary); color: #fff; border-color: var(--md-primary); }

/* Chart skeleton shimmer */
.chart-skeleton {
  background: linear-gradient(90deg, var(--bg) 25%, var(--bg2) 50%, var(--bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
  width: 100%;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

---

## Phase 5: Chart Cleanup on Navigation

In `switchView()`, destroy ApexCharts instances when leaving home view to prevent memory leaks:
```js
function destroyAllCharts() {
  ['financeChart', 'trendChart', 'dualTrendChart', 'wingRevenueChart', 
   'pipelineChart', 'statusDonutChart', 'monthlyRevenueChart', 
   'statusFunnelChart', 'visitorTypeChart', 'weeklyHeatmapChart', 
   'wingCountChart'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el._apexChart) {
      el._apexChart.destroy();
      el._apexChart = null;
    }
  });
}
```

Call `destroyAllCharts()` at the beginning of `renderDashboardHomeV2()` and `renderReportsView()`.
