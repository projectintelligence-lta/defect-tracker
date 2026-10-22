/* Defect Tracker — column definitions and exports (CSV, Excel, PDF via print) */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain;
  const E = (DT.exporter = {});
  const esc = U.esc;

  const stageIdx = (r) => D.STAGES.findIndex((s) => s.id === r.stage);
  const clsIdx = (r) => D.CLASSES.findIndex((c) => c.id === r.classification);

  /* Table / export columns. `text` = plain text for export & search; `sort` = comparable value. */
  E.COLUMNS = [
    { id: 'sn', label: 'S/N', def: true, text: (r) => r.sn, sort: (r) => r.sn, nat: true },
    { id: 'stage', label: 'Stage', def: true, text: (r) => D.stageById[r.stage].label, sort: stageIdx },
    { id: 'classification', label: 'Classification', def: true, text: (r) => r.classification, sort: clsIdx },
    { id: 'location', label: 'Location', def: true, text: (r) => r.location, sort: (r) => D.norm(r.location) },
    { id: 'building', label: 'Building', def: true, text: (r) => r.building, sort: (r) => D.norm(r.building), nat: true },
    { id: 'level', label: 'Level / Room', def: true, text: (r) => r.level, sort: (r) => D.norm(r.level), nat: true },
    { id: 'description', label: 'Description', def: true, text: (r) => r.description, sort: (r) => D.norm(r.description) },
    { id: 'actionParty', label: 'Action party', def: true, text: (r) => r.actionParty, sort: (r) => D.norm(r.actionParty) },
    { id: 'lastInsp', label: 'Last inspection', def: true, text: (r) => U.fmtDate(r.lastInsp) || r.inspRaw, sort: (r) => r.lastInsp || '' },
    { id: 'age', label: 'Age', def: true, text: (r) => (r.ageDays == null ? '' : r.ageDays + ' d'), sort: (r) => (r.ageDays == null ? -1 : r.ageDays), num: true },
    { id: 'due', label: 'Follow-up due', def: false, text: (r) => U.fmtDate(r.dueDate), sort: (r) => r.dueDate || '9999' },
    { id: 'photos', label: 'Photos', def: true, text: (r) => r.nBefore + ' before / ' + r.nAfter + ' after', sort: (r) => r.nBefore + r.nAfter, num: true },
    { id: 'status', label: 'Status (as entered)', def: false, text: (r) => r.status, sort: (r) => r.status },
    { id: 'officer', label: 'Inspection officer', def: false, text: (r) => r.officer, sort: (r) => D.norm(r.officer) },
    { id: 'inspDates', label: 'Dates of inspection', def: false, text: (r) => U.fmtDateList(r.inspDates) || r.inspRaw, sort: (r) => r.firstInsp || '' },
    { id: 'rectDates', label: 'Dates of rectification', def: false, text: (r) => U.fmtDateList(r.rectDates) || r.rectRaw, sort: (r) => r.lastRect || '' },
    { id: 'closedDate', label: 'Date closed', def: false, text: (r) => U.fmtDate(r.closedOn) || r.closedRaw, sort: (r) => r.closedOn || '' },
    { id: 'proposed', label: 'Proposed rectification', def: false, text: (r) => r.proposed, sort: (r) => D.norm(r.proposed) },
    { id: 'action', label: 'Action', def: false, text: (r) => r.action, sort: (r) => D.norm(r.action) },
    { id: 'followUp', label: 'Follow-up timeline', def: false, text: (r) => r.followUp, sort: (r) => D.norm(r.followUp) },
    { id: 'contact', label: 'Contact person', def: false, text: (r) => r.contact, sort: (r) => D.norm(r.contact) },
    { id: 'rectification', label: 'Rectification by LTA', def: false, text: (r) => r.rectification, sort: (r) => D.norm(r.rectification) },
    { id: 'signoff', label: 'Sign-off by STEL', def: false, text: (r) => r.signoff, sort: (r) => D.norm(r.signoff) },
    { id: 'remark', label: 'Remark', def: false, text: (r) => r.remark, sort: (r) => D.norm(r.remark) },
  ];
  E.colById = Object.fromEntries(E.COLUMNS.map((c) => [c.id, c]));

  /* Export layout = the 20 register columns in their original order, then the derived ones */
  const ORIGINAL = [
    ['S/N', (r) => r.sn],
    ['Status', (r) => r.status],
    ['Inspection Officer / Comment by (Dept & Name)', (r) => r.officer],
    ['Dates of Inspection(s)', (r) => U.fmtDateList(r.inspDates) || r.inspRaw],
    ['Dates of Rectification(s) by LTA', (r) => U.fmtDateList(r.rectDates) || r.rectRaw],
    ["Defect's Date Closed", (r) => U.fmtDate(r.closedOn) || r.closedRaw],
    ['Location', (r) => r.location],
    ['Building No', (r) => r.building],
    ['Level / Rm Name / Rm No.', (r) => r.level],
    ['Defect Description', (r) => r.description],
    ['Proposed Rectification / Improvements', (r) => r.proposed],
    ['Defect Classification', (r) => r.classification],
    ['Defect Photos (before / after count)', (r) => r.nBefore + ' / ' + r.nAfter],
    ['Action', (r) => r.action],
    ['Timeline to Follow-up (by LTA)', (r) => r.followUp],
    ['Contact Person (STEL)', (r) => r.contact],
    ['Action Party (LTA)', (r) => r.actionParty],
    ['Defect Rectification (by LTA)', (r) => r.rectification],
    ['Sign-Off by STEL', (r) => r.signoff],
    ['Remark', (r) => r.remark],
    ['Stage', (r) => D.stageById[r.stage].label],
    ['Age (days)', (r) => (r.ageDays == null ? '' : r.ageDays)],
    ['Overdue', (r) => (r.overdue ? 'Yes (' + r.daysOverdue + ' d)' : '')],
  ];
  const matrix = (rows) => [ORIGINAL.map((c) => c[0])].concat(rows.map((r) => ORIGINAL.map((c) => c[1](r))));

  E.csv = (rows) => {
    const body = matrix(rows).map((r) => r.map(U.csvEscape).join(',')).join('\r\n');
    return new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' });
  };

  E.xlsx = (rows, ctx) => {
    const wb = XLSX.utils.book_new();
    const m = matrix(rows);
    const ws = XLSX.utils.aoa_to_sheet(m);
    ws['!cols'] = m[0].map((h, i) => ({ wch: [5, 10, 24, 18, 18, 14, 16, 12, 20, 44, 40, 16, 12, 26, 20, 16, 16, 34, 18, 14, 26, 10, 12][i] || 14 }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: m.length - 1, c: m[0].length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, 'Defects');

    const s = D.summarize(rows);
    const sum = [
      [ctx.projectName + ' – defect summary'],
      ['Snapshot', ctx.batchLabel + ' (' + U.fmtDate(ctx.asOf) + ')'],
      ['Filters', ctx.filtersText || 'None'],
      [],
      ['Measure', 'Count'],
      ['Total defects', s.total],
      ['Open', s.open],
      ['Pending LTA action', s.pending],
      ['Rectified, awaiting sign-off', s.awaiting],
      ['Rework required', s.rework],
      ['Closed', s.closed],
      ['Safety Related, still open', s.safetyOpen],
      ['Overdue', s.overdue],
      [],
      ['Classification', 'Count'],
    ].concat(D.CLASSES.map((c) => [c.id, s.byClass[c.id] || 0]));
    const w2 = XLSX.utils.aoa_to_sheet(sum);
    w2['!cols'] = [{ wch: 34 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, w2, 'Summary');

    if (ctx.batches && ctx.batches.length) {
      const up = [['Upload', 'File', 'Uploaded', 'By', 'Defects', 'Open', 'Closed', 'Safety Related open', 'Overdue']].concat(
        ctx.batches.map((b) => [b.name, b.fileName, U.fmtDateTime(b.uploadedAt), b.uploadedBy ? b.uploadedBy.name : '', b.stats.total, b.stats.open, b.stats.closed, b.stats.safetyOpen, b.stats.overdue])
      );
      const w3 = XLSX.utils.aoa_to_sheet(up);
      w3['!cols'] = [{ wch: 28 }, { wch: 34 }, { wch: 20 }, { wch: 18 }, { wch: 9 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 9 }];
      XLSX.utils.book_append_sheet(wb, w3, 'Upload history');
    }
    return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' });
  };

  /* ---------- printable report (Save as PDF from the print dialog) ---------- */
  E.print = async (rows, ctx, opts) => {
    opts = opts || {};
    const s = D.summarize(rows);
    const root = U.$('#printRoot');
    const kpi = (n, l) => '<div class="pr-kpi"><b>' + n + '</b><span>' + esc(l) + '</span></div>';
    const bar = (label, n, color) =>
      '<tr><td>' + esc(label) + '</td><td class="pr-bar"><i style="width:' + (s.total ? (n / s.total) * 100 : 0) + '%;background:' + color + '"></i></td><td class="r">' + n + '</td></tr>';
    let html =
      '<section class="pr-page"><header class="pr-head"><div><h1>' + esc(ctx.projectName) + '</h1><p>Defect report</p></div><div class="pr-meta">' +
      esc(ctx.batchLabel) + '<br>As of ' + U.fmtDate(ctx.asOf) + '<br>Printed ' + U.fmtDate(U.isoToday()) + (ctx.user ? ' by ' + esc(ctx.user) : '') + '</div></header>' +
      (ctx.filtersText ? '<p class="pr-filter">Filtered view: ' + esc(ctx.filtersText) + '</p>' : '') +
      '<div class="pr-kpis">' + kpi(s.total, 'Defects') + kpi(s.open, 'Open') + kpi(s.safetyOpen, 'Safety Related, open') + kpi(s.awaiting, 'Awaiting sign-off') + kpi(s.overdue, 'Overdue') + kpi(s.closed, 'Closed') + '</div>' +
      '<div class="pr-cols"><div><h2>By stage</h2><table class="pr-mini">' + D.STAGES.map((st) => bar(st.label, s[st.id], st.color)).join('') + '</table></div>' +
      '<div><h2>By classification</h2><table class="pr-mini">' + D.CLASSES.map((c) => bar(c.id, s.byClass[c.id] || 0, c.color)).join('') + '</table></div></div>' +
      '<h2>Defect list (' + rows.length + ')</h2><table class="pr-table"><thead><tr><th>S/N</th><th>Stage</th><th>Class</th><th>Location · Building · Level</th><th>Description</th><th>Action party</th><th>Age</th></tr></thead><tbody>' +
      rows.map((r) =>
        '<tr><td>' + esc(r.sn) + '</td><td>' + esc(D.stageById[r.stage].short) + (r.overdue ? '<br><em>overdue</em>' : '') + '</td><td>' + esc(r.classification) + '</td><td>' + esc([r.location, r.building, r.level].filter(Boolean).join(' · ')) + '</td><td>' + esc(r.description) + '</td><td>' + esc(r.actionPartyLabel) + '</td><td>' + (r.ageDays == null ? '' : r.ageDays + ' d') + '</td></tr>'
      ).join('') + '</tbody></table></section>';

    if (opts.photos) {
      html += rows.map((r) => {
        const fig = (kind) => r.photos.filter((p) => (kind === 'before' ? p.kind === 'before' : p.kind !== 'before')).slice(0, 6).map((p) => '<figure><img data-hash="' + p.hash + '" alt=""></figure>').join('');
        const f = (l, v) => (v ? '<dt>' + esc(l) + '</dt><dd>' + esc(v).replace(/\n/g, '<br>') + '</dd>' : '');
        return '<section class="pr-page pr-detail"><h2>S/N ' + esc(r.sn) + ' · ' + esc(D.stageById[r.stage].label) + ' · ' + esc(r.classification) + '</h2><dl>' +
          f('Location', [r.location, r.building, r.level].filter(Boolean).join(' · ')) + f('Description', r.description) + f('Proposed rectification', r.proposed) + f('Action', r.action) +
          f('Inspection', U.fmtDateList(r.inspDates) || r.inspRaw) + f('Rectification', (U.fmtDateList(r.rectDates) || r.rectRaw) + (r.rectification ? ' – ' + r.rectification : '')) + f('Sign-off', r.signoff) + f('Action party', r.actionParty) + f('Remark', r.remark) +
          '</dl>' + (r.nBefore ? '<h3>Before</h3><div class="pr-photos">' + fig('before') + '</div>' : '') + (r.nAfter ? '<h3>After</h3><div class="pr-photos">' + fig('after') + '</div>' : '') + '</section>';
      }).join('');
    }
    root.innerHTML = html;
    if (opts.photos) {
      const imgs = U.$$('img[data-hash]', root);
      await Promise.all(imgs.map(async (im) => {
        im.src = await DT.store.photoURL(im.dataset.hash, 'thumb');
        try { await im.decode(); } catch (e) { /* ignore */ }
      }));
    }
    document.body.classList.add('printing');
    const done = () => {
      document.body.classList.remove('printing');
      root.innerHTML = '';
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    await U.sleep(60);
    window.print();
    setTimeout(() => document.body.classList.contains('printing') && done(), 1500);
  };
})();
