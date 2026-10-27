/**
 * Waveform renderer - Canvas-based signal visualization
 */

const WaveformRenderer = (() => {

  const SIGNAL_HEIGHT = 44;
  const SIGNAL_PADDING = 10;
  const PIXELS_PER_NS = 6;
  const LABEL_WIDTH = 130;

  const COLORS = {
    bg: '#1e1e2e',
    bgAlt: '#181825',
    grid: '#313244',
    gridMajor: '#45475a',
    text: '#cdd6f4',
    textDim: '#6c7086',
    input: '#a6e3a1',
    output: '#fab387',
    internal: '#89b4fa',
    unknown: '#f38ba8',
    timeline: '#cba6f7'
  };

  function render(container, signals, timeline, duration) {
    container.innerHTML = '';

    if (!timeline || timeline.length === 0) {
      container.innerHTML = '<div class="waveform-placeholder"><p>Nema podataka za prikaz</p></div>';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'waveform-canvas-wrapper';
    wrapper.style.cssText = 'display:flex; height:' + (signals.length * SIGNAL_HEIGHT + 40) + 'px; min-height: 100%;';

    // Labels column
    const labels = document.createElement('div');
    labels.className = 'waveform-labels';
    labels.style.cssText = `width:${LABEL_WIDTH}px; flex-shrink:0; padding-top: 30px;`;

    signals.forEach(sig => {
      const lbl = document.createElement('div');
      lbl.className = 'waveform-signal-label ' + (sig.direction === 'in' ? 'input' : sig.direction === 'out' ? 'output' : '');
      lbl.textContent = sig.name;
      lbl.title = `${sig.name} [${sig.direction}] ${sig.type}`;
      labels.appendChild(lbl);
    });

    // Canvas area
    const canvasArea = document.createElement('div');
    canvasArea.className = 'waveform-canvas-area';
    canvasArea.style.flex = '1';

    const canvas = document.createElement('canvas');
    const totalWidth = duration * PIXELS_PER_NS + 20;
    const totalHeight = signals.length * SIGNAL_HEIGHT + 30;
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    canvas.style.display = 'block';

    canvasArea.appendChild(canvas);
    wrapper.appendChild(labels);
    wrapper.appendChild(canvasArea);
    container.appendChild(wrapper);

    drawWaveform(canvas, signals, timeline, duration);

    // Cursor on click
    let cursorLine = null;
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const time = Math.round(x / PIXELS_PER_NS);

      drawWaveform(canvas, signals, timeline, duration);
      drawCursor(canvas, x, signals, timeline, time);
      showCursorInfo(container, signals, timeline, time);
    });
  }

  function drawWaveform(canvas, signals, timeline, duration) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // Timeline ruler
    drawTimeline(ctx, w, duration);

    // Grid
    drawGrid(ctx, w, h, duration);

    // Signals
    signals.forEach((sig, idx) => {
      const y = 30 + idx * SIGNAL_HEIGHT;
      drawSignal(ctx, sig, timeline, y, duration);
    });
  }

  function drawTimeline(ctx, w, duration) {
    ctx.fillStyle = COLORS.bgAlt;
    ctx.fillRect(0, 0, w, 30);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(w, 30);
    ctx.stroke();

    ctx.fillStyle = COLORS.timeline;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const step = 10;   // oznaka na ravnalu na svakih 10 ns
    for (let t = 0; t <= duration; t += step) {
      const x = t * PIXELS_PER_NS;
      ctx.strokeStyle = COLORS.gridMajor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, 30);
      ctx.stroke();
      ctx.fillText(t + 'ns', x, 14);
    }
  }

  // Okomite crte: pune na svakih GRID_MAJOR_NS, isprekidane na GRID_MINOR_NS
  const GRID_MAJOR_NS = 10;
  const GRID_MINOR_NS = 5;

  function drawGrid(ctx, w, h, duration) {
    // pomoćne (isprekidane) crte
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);
    for (let t = GRID_MINOR_NS; t <= duration; t += GRID_MINOR_NS) {
      if (t % GRID_MAJOR_NS === 0) continue;
      const x = t * PIXELS_PER_NS + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.setLineDash([]);

    // glavne (pune) crte na svakih 10 ns
    ctx.strokeStyle = COLORS.gridMajor;
    ctx.lineWidth = 1;
    for (let t = GRID_MAJOR_NS; t <= duration; t += GRID_MAJOR_NS) {
      const x = Math.round(t * PIXELS_PER_NS) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h); ctx.stroke();
    }
  }

  function drawSignal(ctx, sig, timeline, yTop, duration) {
    const high = yTop + SIGNAL_PADDING;
    const low = yTop + SIGNAL_HEIGHT - SIGNAL_PADDING;
    const mid = yTop + SIGNAL_HEIGHT / 2;

    const color = sig.direction === 'in' ? COLORS.input :
                  sig.direction === 'out' ? COLORS.output : COLORS.internal;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = color + '22';
    ctx.setLineDash([]);

    ctx.beginPath();
    let prevX = 0;
    let prevVal = null;

    timeline.forEach((snap, i) => {
      const x = snap.time * PIXELS_PER_NS;
      const val = snap[sig.name];

      if (val === undefined) return;

      const yVal = getY(val, high, low, mid);

      if (prevVal === null) {
        ctx.moveTo(x, yVal);
      } else if (val !== prevVal) {
        // Transition
        const prevY = getY(prevVal, high, low, mid);
        ctx.lineTo(x, prevY);
        ctx.lineTo(x, yVal);
      } else {
        ctx.lineTo(x, yVal);
      }

      prevVal = val;
      prevX = x;
    });

    // Extend to end
    if (prevVal !== null) {
      ctx.lineTo(duration * PIXELS_PER_NS, getY(prevVal, high, low, mid));
    }

    ctx.stroke();

    // Fill area under HIGH signals
    if (sig.type === 'std_logic' || sig.width === 1) {
      ctx.beginPath();
      let fillPrevVal = null;
      let fillStartX = 0;

      timeline.forEach((snap, i) => {
        const x = snap.time * PIXELS_PER_NS;
        const val = snap[sig.name];
        if (val === undefined) return;

        if (fillPrevVal !== null && fillPrevVal !== val) {
          if (fillPrevVal === '1') {
            ctx.fillStyle = color + '18';
            ctx.fillRect(fillStartX, high, x - fillStartX, low - high);
          }
          fillStartX = x;
        } else if (fillPrevVal === null) {
          fillStartX = x;
        }
        fillPrevVal = val;
      });
      if (fillPrevVal === '1') {
        ctx.fillStyle = color + '18';
        ctx.fillRect(fillStartX, high, duration * PIXELS_PER_NS - fillStartX, low - high);
      }
    }

    // Draw value labels for buses
    if (sig.width > 1 || sig.type === 'std_logic_vector') {
      ctx.fillStyle = color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';

      let prevBusVal = null;
      let prevBusX = 0;

      timeline.forEach((snap) => {
        const x = snap.time * PIXELS_PER_NS;
        const val = snap[sig.name];
        if (val === undefined) return;
        const valStr = Array.isArray(val) ? val.join('') : val;

        if (prevBusVal !== null && prevBusVal !== valStr) {
          const segWidth = x - prevBusX;
          if (segWidth > 30) {
            ctx.fillText(prevBusVal, prevBusX + segWidth / 2, mid + 3);
          }
          prevBusX = x;
        } else if (prevBusVal === null) {
          prevBusX = x;
        }
        prevBusVal = valStr;
      });
      if (prevBusVal !== null) {
        const segWidth = duration * PIXELS_PER_NS - prevBusX;
        if (segWidth > 30) {
          ctx.fillText(prevBusVal, prevBusX + segWidth / 2, mid + 3);
        }
      }
    }

    // Separator line
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, yTop + SIGNAL_HEIGHT - 1);
    ctx.lineTo(duration * PIXELS_PER_NS + 20, yTop + SIGNAL_HEIGHT - 1);
    ctx.stroke();
  }

  function getY(val, high, low, mid) {
    if (val === '1') return high;
    if (val === '0') return low;
    return mid; // X, Z
  }

  function drawCursor(canvas, x, signals, timeline, time) {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#f38ba8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Time label
    ctx.fillStyle = '#f38ba8';
    ctx.font = '10px monospace';
    ctx.textAlign = x > canvas.width / 2 ? 'right' : 'left';
    ctx.fillText(time + 'ns', x + (x > canvas.width / 2 ? -4 : 4), 12);
  }

  function showCursorInfo(container, signals, timeline, time) {
    const snap = timeline.find(s => s.time >= time) || timeline[timeline.length - 1];
    if (!snap) return;

    let existing = container.querySelector('.cursor-tooltip');
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'cursor-tooltip';
      existing.style.cssText = `
        position: absolute; top: 36px; right: 8px;
        background: #181825; border: 1px solid #313244;
        border-radius: 6px; padding: 8px 12px; font-size: 11px;
        font-family: monospace; color: #cdd6f4; z-index: 10;
        pointer-events: none; min-width: 120px;
      `;
      container.style.position = 'relative';
      container.appendChild(existing);
    }

    let html = `<div style="color:#cba6f7; margin-bottom:6px;">t = ${time} ns</div>`;
    signals.forEach(sig => {
      const val = snap[sig.name];
      if (val === undefined) return;
      const color = val === '1' ? '#a6e3a1' : val === '0' ? '#6c7086' : '#f38ba8';
      const valStr = Array.isArray(val) ? val.join('') : val;
      html += `<div style="display:flex; justify-content:space-between; gap:12px;">
        <span style="color:#89b4fa">${sig.name}</span>
        <span style="color:${color}">'${valStr}'</span>
      </div>`;
    });

    existing.innerHTML = html;
  }

  function buildSignalsTable(container, signals, timeline) {
    if (!timeline || timeline.length === 0) {
      container.innerHTML = '<p class="empty-hint">Nema podataka</p>';
      return;
    }

    const lastSnap = timeline[timeline.length - 1];

    let html = `<table class="signals-table">
      <thead>
        <tr>
          <th>Signal</th>
          <th>Smjer</th>
          <th>Tip</th>
          <th>Početna</th>
          <th>Konačna</th>
          <th>Promjena</th>
        </tr>
      </thead>
      <tbody>`;

    signals.forEach(sig => {
      const firstSnap = timeline[0];
      const initVal = firstSnap[sig.name];
      const finalVal = lastSnap[sig.name];
      const initStr = Array.isArray(initVal) ? initVal.join('') : (initVal || 'X');
      const finalStr = Array.isArray(finalVal) ? finalVal.join('') : (finalVal || 'X');

      // Count transitions
      let transitions = 0;
      for (let i = 1; i < timeline.length; i++) {
        const curr = timeline[i][sig.name];
        const prev = timeline[i-1][sig.name];
        if (curr !== prev) transitions++;
      }

      const dirClass = sig.direction === 'in' ? 'dir-in' : 'dir-out';
      const dirLabel = sig.direction === 'in' ? '↓ in' : sig.direction === 'out' ? '↑ out' : '⟷ int';

      html += `<tr>
        <td><strong>${sig.name}</strong></td>
        <td><span class="${dirClass}">${dirLabel}</span></td>
        <td style="color:#6c7086; font-size:0.78rem">${sig.type}</td>
        <td class="val-${initStr === 'X' ? 'x' : initStr}">'${initStr}'</td>
        <td class="val-${finalStr === 'X' ? 'x' : finalStr}">'${finalStr}'</td>
        <td style="color:#6c7086">${transitions}×</td>
      </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  return { render, buildSignalsTable };
})();
