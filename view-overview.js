/* Defect Tracker — Overview dashboard */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain,
    UI = DT.ui,
    S = DT.state,
    esc = U.esc;
  const V = (DT.views.overview = {});

  /* jump to the defect list with some filters preset */
  DT.views.goDefects = (preset) => {
    S.filters = Object.assign(DT.filters.empty(), preset || {});
    S.page = 1;
    DT.app.go('defects');
  };

  const PALETTE = ['#0071e3', '#5ac8fa', '#af52de', '#ff9f0a', '#34c759', '#ff6482', '#8e8e93'];

  function delta(cur, prev, goodWhen) {
    if (prev == null) return '<span class="kpi-sub muted">First upload</span>';
    const d = cur - prev;
    if (d === 0) return '<span class="kpi-sub muted">No change since last upload</span>';
    const good = goodWhen === 'down' ? d < 0 : goodWhen === 'up' ? d > 0 : null;
    return '<span class="kpi-sub ' + (good === null ? '' : good ? 'good' : 'bad') + '">' + (d > 0 ? '+' : '−') + Math.abs(d) + ' since last upload</span>';
  }

  V.render = (root) => {
    const all = S.all,
      st = D.summarize(all),
      prev = S.prevStats;
    const hist = S.batches.slice(0, S.batches.findIndex((b) => b.id === S.batchId) + 1).slice(-10);
    const series = (k) => hist.map((b) => b.stats[k]);
    const pctClosed = st.total ? Math.round((st.closed / st.total) * 100) : 0;

    const tiles = [
      { id: 'total', label: 'Defects', val: st.total, key: 'total', color: '#6e6e73', sub: delta(st.total, prev && prev.total), go: {} },
      { id: 'open', label: 'Open', val: st.open, key: 'open', color: '#ff9f0a', sub: delta(st.open, prev && prev.open, 'down'), go: { stage: ['pending', 'awaiting', 'rework'] } },
      { id: 'safety', label: 'Safety Related, open', val: st.safetyOpen, key: 'safetyOpen', color: '#ff3b30', sub: delta(st.safetyOpen, prev && prev.safetyOpen, 'down'), go: { stage: ['pending', 'awaiting', 'rework'], cls: ['Safety Related'] }, hot: st.safetyOpen > 0 },
      { id: 'await', label: 'Awaiting STEL sign-off', val: st.awaiting, key: 'awaiting', color: '#0071e3', sub: delta(st.awaiting, prev && prev.awaiting), go: { stage: ['awaiting'] } },
      { id: 'overdue', label: 'Overdue follow-ups', val: st.overdue, key: 'overdue', color: '#ff3b30', sub: delta(st.overdue, prev && prev.overdue, 'down'), go: { overdue: true } },
      { id: 'closed', label: 'Closed', val: st.closed, key: 'closed', color: '#34c759', sub: '<span class="kpi-sub muted">' + pctClosed + '% of all defects</span>', go: { stage: ['closed'] } },
    ];

    const lastCounts = S.batch.counts || {};
    const prevBatch = S.batches[S.batches.findIndex((b) => b.id === S.batchId) - 1];

    root.innerHTML =
      '<div class="page-head"><div><h1>Overview</h1><p class="lede">' + esc(U.plural(st.total, 'defect')) + ' in <b>' + esc(S.batch.name) + '</b>, uploaded ' + esc(U.fmtDateTime(S.batch.uploadedAt)) + (S.batch.uploadedBy ? ' by ' + esc(S.batch.uploadedBy.name) : '') + '.</p></div>' +
      '<div class="head-actions">' + DT.app.snapChip() + '<button class="btn" id="ovExport">' + UI.icon('download', 16) + '<span>Export</span></button></div></div>' +
      '<section class="kpis">' +
      tiles.map((t, i) => '<button class="kpi' + (t.hot ? ' hot' : '') + '" data-i="' + i + '" style="--c:' + t.color + ';--d:' + i * 60 + 'ms"><span class="kpi-l">' + esc(t.label) + '</span><span class="kpi-v" data-to="' + t.val + '">0</span><span class="kpi-foot">' + t.sub + DT.charts.spark(series(t.key), t.color) + '</span></button>').join('') +
      '</section>' +
      '<section class="grid g3">' +
      '<article class="card span2"><header class="card-h"><h2>Backlog over time</h2><p>Open and closed defects after each upload</p></header><div id="cTrend"></div></article>' +
      '<article class="card"><header class="card-h"><h2>Where defects stand</h2><p>By workflow stage</p></header><div id="cStage"></div></article>' +
      '</section>' +
      '<section class="grid g3">' +
      '<article class="card"><header class="card-h"><h2>Classification</h2><p>All defects</p></header><div id="cClass"></div></article>' +
      '<article class="card"><header class="card-h"><h2>How long open defects have waited</h2><p>Days since first inspection</p></header><div id="cAge"></div></article>' +
      '<article class="card"><header class="card-h"><h2>Latest upload</h2><p>' + (prevBatch ? 'Compared with ' + esc(prevBatch.name) : 'First upload') + '</p></header>' + latestCard(lastCounts, prevBatch) + '</article>' +
      '</section>' +
      '<section class="grid g2">' +
      '<article class="card"><header class="card-h"><h2>By building</h2><p>Defect count, top 8</p></header><div id="cBuilding"></div></article>' +
      '<article class="card"><header class="card-h"><h2>By location</h2><p>Defect count, top 8</p></header><div id="cLocation"></div></article>' +
      '</section>' +
      '<section class="grid g2">' +
      '<article class="card"><header class="card-h"><h2>Workload by action party</h2><p>Coloured by stage</p></header><div id="cParty"></div></article>' +
      '<article class="card"><header class="card-h"><h2>Raised by</h2><p>Inspection officer / department</p></header><div id="cOfficer"></div></article>' +
      '</section>' +
      '<section class="grid g2">' +
      '<article class="card"><header class="card-h"><h2>Needs attention</h2><p>Overdue and Safety Related defects that are still open</p></header><div id="cAttn"></div></article>' +
      '<article class="card"><header class="card-h"><h2>Remark tags</h2><p>From the Remark column</p></header><div id="cRemark"></div></article>' +
      '</section>';

    /* KPI count-up and click-through */
    U.$$('.kpi-v', root).forEach((el) => U.countUp(el, +el.dataset.to));
    root.addEventListener('click', (e) => {
      const k = e.target.closest('.kpi');
      if (k) DT.views.goDefects(tiles[+k.dataset.i].go);
    });
    U.$('#ovExport').addEventListener('click', (e) => DT.views.exportMenu(e.currentTarget, () => all));

    /* trend */
    DT.charts.line(U.$('#cTrend'), {
      label: 'Backlog over time',
      labels: hist.map((b) => U.fmtDateShort(b.asOf)),
      series: [
        { name: 'Open', color: '#ff9f0a', values: hist.map((b) => b.stats.open), area: true },
        { name: 'Closed', color: '#34c759', values: hist.map((b) => b.stats.closed) },
        { name: 'Safety Related, open', color: '#ff3b30', values: hist.map((b) => b.stats.safetyOpen) },
      ],
    });

    DT.charts.donut(U.$('#cStage'), {
      label: 'Defects by stage',
      centerValue: st.open,
      centerLabel: 'open',
      items: D.STAGES.map((s) => ({ id: s.id, label: s.label, value: st[s.id], color: s.color })),
      onClick: (it) => DT.views.goDefects({ stage: [it.id] }),
    });

    DT.charts.hbar(U.$('#cClass'), {
      items: D.CLASSES.map((c) => ({ id: c.id, label: c.id, value: st.byClass[c.id] || 0, color: c.color })).filter((x) => x.value),
      onClick: (it) => DT.views.goDefects({ cls: [it.id] }),
      unit: 'defects',
    });

    const buckets = D.ageBucketLabels();
    const open = all.filter((r) => r.open);
    const ramp = ['#86c8ff', '#4aa3ff', '#0071e3', '#ff9f0a', '#ff3b30'];
    const ageItems = buckets.map((b, i) => ({ label: b.label, value: open.filter((r) => r.ageDays != null && r.ageDays >= b.min && r.ageDays <= b.max).length, color: ramp[Math.min(i, ramp.length - 1)] }));
    const nodate = open.filter((r) => r.ageDays == null).length;
    if (nodate) ageItems.push({ label: 'No date', value: nodate, color: '#aeaeb2' });
    DT.charts.vbar(U.$('#cAge'), { items: ageItems, unit: 'open defects' });

    const top = (fn, n) => Array.from(D.countBy(all, fn).entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
    DT.charts.hbar(U.$('#cBuilding'), {
      items: top((r) => r.building || '—', 8).map(([k, v]) => ({ label: k, value: v })),
      onClick: (it) => DT.views.goDefects({ building: [it.label] }),
      unit: 'defects',
    });
    DT.charts.hbar(U.$('#cLocation'), {
      items: top((r) => r.location || '—', 8).map(([k, v]) => ({ label: k, value: v, color: '#5ac8fa' })),
      onClick: (it) => DT.views.goDefects({ location: [it.label] }),
      unit: 'defects',
    });
    DT.charts.hbar(U.$('#cOfficer'), {
      items: top((r) => r.officer || '—', 8).map(([k, v]) => ({ label: k, value: v, color: '#af52de' })),
      onClick: (it) => DT.views.goDefects({ officer: [it.label] }),
      unit: 'defects',
    });

    const parties = Array.from(D.countBy(all, (r) => r.actionPartyLabel).keys());
    DT.charts.stacked(U.$('#cParty'), {
      rows: parties
        .map((p) => ({ label: p, segments: D.STAGES.map((s) => ({ id: s.id, label: s.label, color: s.color, value: all.filter((r) => r.actionPartyLabel === p && r.stage === s.id).length })) }))
        .sort((a, b) => b.segments.reduce((x, s) => x + s.value, 0) - a.segments.reduce((x, s) => x + s.value, 0))
        .slice(0, 8),
      onClick: (row, seg) => DT.views.goDefects({ party: [row.label], stage: [seg.id] }),
    });
    el('cParty').insertAdjacentHTML('beforeend', '<div class="legend inline">' + D.STAGES.map((s) => '<span class="legend-row static"><i style="background:' + s.color + '"></i>' + esc(s.short) + '</span>').join('') + '</div>');

    const tags = top((r) => r.remark || '—', 7);
    DT.charts.donut(U.$('#cRemark'), {
      label: 'Remark tags',
      centerLabel: 'tagged',
      items: tags.map(([k, v], i) => ({ id: k, label: k, value: v, color: PALETTE[i % PALETTE.length] })),
      onClick: (it) => DT.views.goDefects({ remark: [it.id] }),
    });

    /* needs attention */
    const attn = all
      .filter((r) => r.open && (r.overdue || r.classification === 'Safety Related'))
      .sort((a, b) => (b.overdue - a.overdue) || (b.daysOverdue - a.daysOverdue) || ((b.ageDays || 0) - (a.ageDays || 0)))
      .slice(0, 7);
    U.$('#cAttn').innerHTML = attn.length
      ? '<ul class="attn">' +
        attn.map((r) => '<li><button data-key="' + r.key + '"><span class="attn-sn">' + esc(r.sn) + '</span><span class="attn-main"><b>' + esc(U.truncate(r.description, 70)) + '</b><span>' + esc([r.location, r.building].filter(Boolean).join(' · ')) + ' · ' + esc(r.actionPartyLabel) + '</span></span><span class="attn-tags">' + (r.classification === 'Safety Related' ? UI.classTag('Safety Related') : '') + (r.overdue ? '<span class="tag" style="--c:#ff9f0a">Overdue ' + r.daysOverdue + ' d</span>' : '') + '</span></button></li>').join('') +
        '</ul>'
      : UI.empty('shield', 'Nothing urgent', 'No overdue or Safety Related defects are open.');
    U.$('#cAttn').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-key]');
      if (b) DT.views.defects.openDefect(b.dataset.key);
    });
    const goUploads = U.$('[data-go-uploads]', root);
    if (goUploads) goUploads.addEventListener('click', () => DT.app.go('uploads'));
  };

  const el = (id) => document.getElementById(id);

  function latestCard(c, prevBatch) {
    const item = (n, l, cls) => '<div class="lu"><b class="' + cls + '">' + n + '</b><span>' + l + '</span></div>';
    return (
      '<div class="lu-grid">' +
      item(c.added || 0, 'New defects', 'blue') + item(c.changed || 0, 'Updated', '') + item(c.closedNow || 0, 'Closed since', 'green') + item(c.removed || 0, 'Missing from file', c.removed ? 'orange' : '') +
      '</div>' + (prevBatch ? '<button class="link" data-go-uploads>See what changed ' + UI.icon('right', 14) + '</button>' : '<p class="muted small">Upload again later to see what changed between uploads.</p>')
    );
  }
})();
