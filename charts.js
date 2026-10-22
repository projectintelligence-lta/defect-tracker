/* Defect Tracker — lightweight charts (no libraries). Each function renders into `el`. */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U;
  const C = (DT.charts = {});
  const esc = U.esc;

  /* shared tooltip */
  let tip;
  function tipEl() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tip';
      document.body.appendChild(tip);
    }
    return tip;
  }
  C.showTip = (html, x, y) => {
    const t = tipEl();
    t.innerHTML = html;
    t.classList.add('on');
    const w = t.offsetWidth,
      h = t.offsetHeight;
    t.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px';
    t.style.top = Math.max(8, y - h - 14) + 'px';
  };
  C.hideTip = () => tip && tip.classList.remove('on');
  const hover = (node, html) => {
    node.addEventListener('mousemove', (e) => C.showTip(typeof html === 'function' ? html() : html, e.clientX, e.clientY));
    node.addEventListener('mouseleave', C.hideTip);
  };
  const after = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  /* ---------- donut with legend ---------- */
  C.donut = (el, o) => {
    const items = o.items.filter((i) => i.value > 0);
    const total = items.reduce((a, i) => a + i.value, 0);
    const R = 62,
      CIRC = 2 * Math.PI * R,
      GAP = items.length > 1 ? 3 : 0;
    el.innerHTML = '';
    el.classList.add('donut-wrap');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 160 160');
    svg.setAttribute('class', 'donut');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', o.label || 'Chart');
    const track = document.createElementNS(svgNS, 'circle');
    track.setAttribute('cx', 80);
    track.setAttribute('cy', 80);
    track.setAttribute('r', R);
    track.setAttribute('class', 'donut-track');
    svg.appendChild(track);
    let off = 0;
    const segs = [];
    items.forEach((it) => {
      const len = Math.max(0, (it.value / total) * CIRC - GAP);
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', 80);
      c.setAttribute('cy', 80);
      c.setAttribute('r', R);
      c.setAttribute('class', 'donut-seg');
      c.setAttribute('stroke', it.color);
      c.setAttribute('stroke-dasharray', '0 ' + CIRC);
      c.setAttribute('stroke-dashoffset', -off);
      c.setAttribute('transform', 'rotate(-90 80 80)');
      c.style.cursor = o.onClick ? 'pointer' : 'default';
      hover(c, () => '<b>' + esc(it.label) + '</b><br>' + it.value + ' · ' + Math.round((it.value / total) * 100) + '%');
      if (o.onClick) c.addEventListener('click', () => o.onClick(it));
      svg.appendChild(c);
      segs.push([c, len]);
      off += (it.value / total) * CIRC;
    });
    const mid = document.createElement('div');
    mid.className = 'donut-mid';
    mid.innerHTML = '<div class="donut-num">' + (o.centerValue != null ? o.centerValue : total) + '</div><div class="donut-cap">' + esc(o.centerLabel || 'Total') + '</div>';
    const box = document.createElement('div');
    box.className = 'donut-box';
    box.appendChild(svg);
    box.appendChild(mid);
    const legend = document.createElement('div');
    legend.className = 'legend';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'legend-row';
      b.innerHTML = '<i style="background:' + it.color + '"></i><span>' + esc(it.label) + '</span><b>' + it.value + '</b>';
      if (o.onClick) b.addEventListener('click', () => o.onClick(it));
      else b.disabled = true;
      legend.appendChild(b);
    });
    if (!items.length) legend.innerHTML = '<div class="muted">No data</div>';
    el.appendChild(box);
    el.appendChild(legend);
    const reduce = U.reduceMotion();
    after(() =>
      segs.forEach(([c, len], i) => {
        c.style.transition = reduce ? 'none' : 'stroke-dasharray 900ms cubic-bezier(.22,.8,.24,1) ' + i * 90 + 'ms';
        c.setAttribute('stroke-dasharray', len + ' ' + (CIRC - len));
      })
    );
  };

  /* ---------- horizontal bars ---------- */
  C.hbar = (el, o) => {
    const items = o.items;
    const max = o.max || Math.max(1, ...items.map((i) => i.value));
    el.innerHTML = '';
    el.classList.add('hbars');
    if (!items.length) {
      el.innerHTML = '<div class="muted">No data</div>';
      return;
    }
    items.forEach((it, idx) => {
      const row = document.createElement(o.onClick ? 'button' : 'div');
      if (o.onClick) row.type = 'button';
      row.className = 'hbar-row';
      row.innerHTML = '<span class="hbar-label" title="' + esc(it.label) + '">' + esc(it.label) + '</span><span class="hbar-track"><span class="hbar-fill" style="background:' + (it.color || o.color || 'var(--accent)') + '"></span></span><b class="hbar-val">' + it.value + '</b>';
      const fill = row.querySelector('.hbar-fill');
      if (o.onClick) row.addEventListener('click', () => o.onClick(it));
      hover(row, () => '<b>' + esc(it.label) + '</b><br>' + it.value + (o.unit ? ' ' + o.unit : ''));
      el.appendChild(row);
      after(() => {
        fill.style.transition = U.reduceMotion() ? 'none' : 'width 800ms cubic-bezier(.22,.8,.24,1) ' + idx * 50 + 'ms';
        fill.style.width = (it.value / max) * 100 + '%';
      });
    });
  };

  /* ---------- stacked horizontal bars (each row = several coloured segments) ---------- */
  C.stacked = (el, o) => {
    const rows = o.rows;
    const max = Math.max(1, ...rows.map((r) => r.segments.reduce((a, s) => a + s.value, 0)));
    el.innerHTML = '';
    el.classList.add('hbars');
    if (!rows.length) {
      el.innerHTML = '<div class="muted">No data</div>';
      return;
    }
    rows.forEach((r, idx) => {
      const tot = r.segments.reduce((a, s) => a + s.value, 0);
      const row = document.createElement('div');
      row.className = 'hbar-row';
      row.innerHTML = '<span class="hbar-label" title="' + esc(r.label) + '">' + esc(r.label) + '</span><span class="hbar-track stack"></span><b class="hbar-val">' + tot + '</b>';
      const tr = row.querySelector('.stack');
      const fills = [];
      r.segments.forEach((s) => {
        if (!s.value) return;
        const f = document.createElement(o.onClick ? 'button' : 'span');
        if (o.onClick) f.type = 'button';
        f.className = 'stack-seg';
        f.style.background = s.color;
        f.style.width = '0%';
        hover(f, () => '<b>' + esc(r.label) + '</b><br>' + esc(s.label) + ': ' + s.value);
        if (o.onClick) f.addEventListener('click', () => o.onClick(r, s));
        tr.appendChild(f);
        fills.push([f, (s.value / max) * 100]);
      });
      el.appendChild(row);
      after(() =>
        fills.forEach(([f, w]) => {
          f.style.transition = U.reduceMotion() ? 'none' : 'width 800ms cubic-bezier(.22,.8,.24,1) ' + idx * 50 + 'ms';
          f.style.width = w + '%';
        })
      );
    });
  };

  /* ---------- vertical bars ---------- */
  C.vbar = (el, o) => {
    const items = o.items;
    const max = Math.max(1, ...items.map((i) => i.value));
    el.innerHTML = '';
    el.classList.add('vbars');
    items.forEach((it, idx) => {
      const col = document.createElement(o.onClick ? 'button' : 'div');
      if (o.onClick) col.type = 'button';
      col.className = 'vbar-col';
      col.innerHTML = '<b class="vbar-val">' + it.value + '</b><span class="vbar-bar"><span class="vbar-fill" style="background:' + (it.color || o.color || 'var(--accent)') + '"></span></span><span class="vbar-label">' + esc(it.label) + '</span>';
      const f = col.querySelector('.vbar-fill');
      if (o.onClick) col.addEventListener('click', () => o.onClick(it));
      hover(col, () => '<b>' + esc(it.label) + '</b><br>' + it.value + (o.unit ? ' ' + o.unit : ''));
      el.appendChild(col);
      after(() => {
        f.style.transition = U.reduceMotion() ? 'none' : 'height 800ms cubic-bezier(.22,.8,.24,1) ' + idx * 70 + 'ms';
        f.style.height = (it.value / max) * 100 + '%';
      });
    });
  };

  /* ---------- line chart ---------- */
  C.line = (el, o) => {
    const labels = o.labels,
      series = o.series;
    el.innerHTML = '';
    if (labels.length < 2) {
      el.innerHTML = '<div class="empty-inline"><b>Trends start with your second upload.</b><span>Each upload adds a point to this chart.</span></div>';
      return;
    }
    const W = 640,
      H = 230,
      L = 34,
      Rg = 14,
      T = 14,
      B = 28;
    const max = Math.max(1, ...series.flatMap((s) => s.values));
    const niceMax = Math.ceil(max / 5) * 5 || 5;
    const x = (i) => L + (i * (W - L - Rg)) / (labels.length - 1);
    const y = (v) => T + (1 - v / niceMax) * (H - T - B);
    const ns = 'http://www.w3.org/2000/svg';
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = (niceMax / 4) * i;
      g += '<line class="grid" x1="' + L + '" x2="' + (W - Rg) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + '</text>';
    }
    const every = Math.ceil(labels.length / 7);
    labels.forEach((l, i) => {
      if (i % every === 0 || i === labels.length - 1) g += '<text class="axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>';
    });
    let paths = '';
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [x(i), y(v)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      if (s.area) paths += '<path class="area" d="' + d + ' L' + x(labels.length - 1) + ' ' + (H - B) + ' L' + L + ' ' + (H - B) + ' Z" fill="' + s.color + '"/>';
      paths += '<path class="ln" pathLength="1" d="' + d + '" stroke="' + s.color + '" style="--d:' + si * 160 + 'ms"/>';
      pts.forEach((p, i) => (paths += '<circle class="dot" cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="#fff" stroke="' + s.color + '" style="--d:' + (500 + i * 70) + 'ms"/>'));
    });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="linechart" role="img" aria-label="' + esc(o.label || 'Trend') + '">' + g + paths + '<line class="cross" y1="' + T + '" y2="' + (H - B) + '" x1="0" x2="0"/><rect class="hit" x="' + L + '" y="0" width="' + (W - L - Rg) + '" height="' + H + '" fill="transparent"/></svg>';
    const svg = el.querySelector('svg');
    const cross = svg.querySelector('.cross');
    const hit = svg.querySelector('.hit');
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      let i = Math.round(((px - L) / (W - L - Rg)) * (labels.length - 1));
      i = Math.max(0, Math.min(labels.length - 1, i));
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      cross.style.opacity = 1;
      C.showTip('<b>' + esc(labels[i]) + '</b>' + series.map((s) => '<br><i class="tipdot" style="background:' + s.color + '"></i>' + esc(s.name) + ': ' + s.values[i]).join(''), e.clientX, e.clientY);
    });
    hit.addEventListener('mouseleave', () => {
      cross.style.opacity = 0;
      C.hideTip();
    });
    el.insertAdjacentHTML('beforeend', '<div class="legend inline">' + series.map((s) => '<span class="legend-row static"><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>');
    after(() => svg.classList.add('go'));
  };

  /* ---------- sparkline ---------- */
  C.spark = (values, color) => {
    if (!values || values.length < 2) return '';
    const W = 84,
      H = 26,
      max = Math.max(...values),
      min = Math.min(...values),
      rng = max - min || 1;
    const pts = values.map((v, i) => [(i * (W - 4)) / (values.length - 1) + 2, H - 3 - ((v - min) / rng) * (H - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><path class="ln" pathLength="1" d="' + d + '" stroke="' + color + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6" fill="' + color + '"/></svg>';
  };
})();
