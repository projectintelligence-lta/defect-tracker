/* Defect Tracker — Defects list, board, filters and detail drawer */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain,
    UI = DT.ui,
    S = DT.state,
    F = DT.filters,
    E = DT.exporter,
    esc = U.esc;
  const V = (DT.views.defects = {});

  /* ---------- export menu (shared with Overview) ---------- */
  DT.views.exportMenu = (anchor, getRows) => {
    const ctx = () => ({ projectName: D.settings.projectName, batchLabel: S.batch.name, asOf: S.asOf, filtersText: F.describe(S.filters), batches: S.batches, user: S.user.name });
    const rows = () => sorted(getRows());
    UI.menu(anchor, [
      { header: 'Export ' + U.plural(getRows().length, 'defect') },
      { label: 'Excel workbook (.xlsx)', icon: 'sheet', onClick: () => (U.download(E.xlsx(rows(), ctx()), 'defects_' + U.stamp() + '.xlsx'), UI.toast('Excel file downloaded', 'success')) },
      { label: 'CSV (.csv)', icon: 'file', onClick: () => (U.download(E.csv(rows()), 'defects_' + U.stamp() + '.csv'), UI.toast('CSV file downloaded', 'success')) },
      { label: 'PDF report…', icon: 'printer', onClick: () => pdfDialog(rows(), ctx()) },
    ]);
  };
  function pdfDialog(rows, ctx) {
    const m = UI.modal({
      title: 'PDF report',
      width: 460,
      body: '<p class="confirm-text">A print-ready report opens in your browser’s print dialog. Choose <b>Save as PDF</b> as the destination.</p><label class="check"><input type="checkbox" id="pdfPhotos"><span>Add a page per defect with its photos <em>(' + rows.length + ' defects)</em></span></label>',
      footer: '<button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Create report</button>',
    });
    U.$('[data-ok]', m.el).addEventListener('click', async () => {
      const photos = U.$('#pdfPhotos', m.el).checked;
      m.close();
      await E.print(rows, ctx, { photos });
    });
  }

  /* ---------- sorting & paging ---------- */
  function sorted(list) {
    const keys = S.sort.map((s) => ({ c: E.colById[s.id], dir: s.dir })).filter((k) => k.c);
    return list.slice().sort((a, b) => {
      for (const k of keys) {
        const x = k.c.sort(a),
          y = k.c.sort(b);
        let r;
        if (k.c.num) r = (x || 0) - (y || 0);
        else if (k.c.nat) r = U.natCompare(x, y);
        else r = x < y ? -1 : x > y ? 1 : 0;
        if (r) return r * k.dir;
      }
      return U.natCompare(a.sn, b.sn);
    });
  }
  const current = () => sorted(F.apply(S.all, S.filters));

  /* ---------- page ---------- */
  V.render = (root) => {
    const rows = current();
    const noStage = Object.assign({}, S.filters, { stage: [] });
    const base = F.apply(S.all, noStage);
    const cnt = D.countBy(base, (r) => r.stage);
    const stageVal = S.filters.stage.length === 1 ? S.filters.stage[0] : 'all';
    const nFilters = F.count(S.filters);

    root.innerHTML =
      '<div class="page-head"><div><h1>Defects</h1><p class="lede" id="resCount"></p></div><div class="head-actions">' + DT.app.snapChip() + '</div></div>' +
      '<div class="toolbar"><label class="search">' + UI.icon('search', 16) + '<input id="q" type="search" placeholder="Search description, location, S/N, contact…" autocomplete="off" value="' + esc(S.filters.q) + '"><kbd>/</kbd></label>' +
      '<button class="btn" id="btnFilters">' + UI.icon('filter', 16) + '<span>Filters</span>' + (nFilters ? '<em class="badge">' + nFilters + '</em>' : '') + '</button>' +
      '<div id="segView"></div>' +
      '<button class="btn" id="btnCols">' + UI.icon('columns', 16) + '<span>Columns</span></button>' +
      '<button class="btn" id="btnExport">' + UI.icon('download', 16) + '<span>Export</span></button></div>' +
      '<div class="stage-row"><div id="segStage"></div><div class="chips" id="chips"></div></div>' +
      '<div id="results"></div>';

    UI.segmented(U.$('#segStage'), {
      value: stageVal,
      options: [{ id: 'all', label: 'All', count: base.length }].concat(D.STAGES.map((s) => ({ id: s.id, label: s.short, count: cnt.get(s.id) || 0 }))),
      onChange: (v) => {
        S.filters.stage = v === 'all' ? [] : [v];
        S.page = 1;
        V.render(root);
      },
    });
    UI.segmented(U.$('#segView'), {
      value: S.view,
      options: [{ id: 'table', label: 'Table', icon: 'table' }, { id: 'board', label: 'Board', icon: 'board' }],
      onChange: (v) => {
        S.view = v;
        paintResults();
        U.$('#btnCols').hidden = v === 'board';
      },
    });
    U.$('#btnCols').hidden = S.view === 'board';

    const q = U.$('#q');
    q.addEventListener(
      'input',
      U.debounce(() => {
        S.filters.q = q.value;
        S.page = 1;
        paintResults();
        paintChips();
      }, 160)
    );
    U.$('#btnFilters').addEventListener('click', () => filterSheet(root));
    U.$('#btnCols').addEventListener('click', columnsSheet);
    U.$('#btnExport').addEventListener('click', (e) => DT.views.exportMenu(e.currentTarget, current));
    U.$('#chips').addEventListener('click', (e) => {
      const c = e.target.closest('[data-k]');
      if (!c) return;
      clearChip(c.dataset.k, c.dataset.v);
      V.render(root);
    });
    paintChips();
    paintResults();
  };

  function clearChip(k, v) {
    const f = S.filters;
    if (k === 'q') f.q = '';
    else if (k === 'overdue') f.overdue = false;
    else if (k === 'photo') f.photo = '';
    else if (k === 'date') f.from = f.to = '';
    else f[k] = f[k].filter((x) => x !== v);
    S.page = 1;
  }
  function paintChips() {
    const chips = F.chips(S.filters).filter((c) => !(c.k === 'stage' && S.filters.stage.length === 1));
    U.$('#chips').innerHTML = chips.map((c) => '<button class="chip" data-k="' + c.k + '" data-v="' + esc(c.v || '') + '">' + esc(c.label) + UI.icon('close', 12) + '</button>').join('') + (chips.length > 1 ? '<button class="chip clear" data-k="__all">Clear all</button>' : '');
    const all = U.$('#chips [data-k="__all"]');
    if (all)
      all.addEventListener('click', (e) => {
        e.stopPropagation();
        S.filters = F.empty();
        S.page = 1;
        V.render(U.$('#view'));
      });
  }

  /* ---------- results (table or board) ---------- */
  function paintResults() {
    const rows = current();
    const box = U.$('#results');
    U.$('#resCount').textContent = rows.length === S.all.length ? U.plural(rows.length, 'defect') + ' in ' + S.batch.name : 'Showing ' + rows.length + ' of ' + S.all.length + ' defects';
    if (!rows.length) {
      box.innerHTML = UI.empty('search', 'No defects match', 'Try removing a filter or searching for something else.', '<button class="btn" id="clr">Clear filters</button>');
      U.$('#clr').addEventListener('click', () => {
        S.filters = F.empty();
        V.render(U.$('#view'));
      });
      return;
    }
    if (S.view === 'board') boardView(box, rows);
    else tableView(box, rows);
    UI.hydratePhotos(box);
  }

  function cell(c, r) {
    switch (c.id) {
      case 'sn':
        return '<b class="sn">' + esc(r.sn) + '</b>' + (r.snIssue === 'duplicate' ? '<span class="dup" title="Duplicate S/N in the file, renumbered">dup</span>' : '');
      case 'stage':
        return UI.stagePill(r.stage) + (r.overdue ? '<span class="od" title="Follow-up date has passed">Overdue ' + r.daysOverdue + ' d</span>' : '');
      case 'classification':
        return UI.classTag(r.classification);
      case 'age':
        return r.ageDays == null ? '<span class="muted">–</span>' : '<span class="' + (r.open && r.ageDays > 30 ? 'old' : '') + '">' + r.ageDays + ' d</span>';
      case 'photos':
        return r.nBefore + r.nAfter ? '<span class="ph">' + UI.icon('camera', 14) + r.nBefore + '<i>·</i>' + r.nAfter + '</span>' : '<span class="muted">–</span>';
      case 'description':
      case 'proposed':
      case 'action':
      case 'rectification':
      case 'signoff':
        return '<span class="clamp">' + esc(c.text(r)) + '</span>';
      default:
        return esc(c.text(r)) || '<span class="muted">–</span>';
    }
  }

  function tableView(box, rows) {
    const cols = S.cols.map((id) => E.colById[id]).filter(Boolean);
    const size = S.pageSize === 0 ? rows.length : S.pageSize;
    const pages = Math.max(1, Math.ceil(rows.length / size));
    S.page = Math.min(S.page, pages);
    const slice = rows.slice((S.page - 1) * size, S.page * size);
    const sortOf = (id) => S.sort.findIndex((s) => s.id === id);
    box.innerHTML =
      '<div class="table-card"><div class="table-scroll"><table class="grid-table"><thead><tr>' +
      cols.map((c) => {
        const i = sortOf(c.id);
        return '<th class="' + (i >= 0 ? 'sorted' : '') + (c.num ? ' num' : '') + '" data-col="' + c.id + '" aria-sort="' + (i < 0 ? 'none' : S.sort[i].dir > 0 ? 'ascending' : 'descending') + '"><button>' + esc(c.label) + '<span class="sort">' + (i >= 0 ? UI.icon(S.sort[i].dir > 0 ? 'up' : 'down', 13) + (S.sort.length > 1 ? '<sup>' + (i + 1) + '</sup>' : '') : '') + '</span></button></th>';
      }).join('') +
      '</tr></thead><tbody>' +
      slice.map((r, n) => '<tr data-key="' + r.key + '" tabindex="0" style="--n:' + Math.min(n, 14) + '">' + cols.map((c) => '<td class="c-' + c.id + (c.num ? ' num' : '') + '">' + cell(c, r) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>' +
      '<footer class="table-foot"><span>' + ((S.page - 1) * size + 1) + '–' + Math.min(rows.length, S.page * size) + ' of ' + rows.length + '</span>' +
      '<div class="pager"><label>Rows <select id="pgSize">' + [25, 50, 100, 0].map((n) => '<option value="' + n + '"' + (n === S.pageSize ? ' selected' : '') + '>' + (n || 'All') + '</option>').join('') + '</select></label>' +
      '<button class="icon-btn" id="pgPrev" aria-label="Previous page"' + (S.page <= 1 ? ' disabled' : '') + '>' + UI.icon('left') + '</button><span>' + S.page + ' / ' + pages + '</span><button class="icon-btn" id="pgNext" aria-label="Next page"' + (S.page >= pages ? ' disabled' : '') + '>' + UI.icon('right') + '</button></div></footer></div>';

    box.onclick = (e) => {
      const th = e.target.closest('th[data-col]');
      if (th) {
        const id = th.dataset.col;
        const i = sortOf(id);
        if (e.shiftKey) {
          if (i < 0) S.sort.push({ id, dir: 1 });
          else if (S.sort[i].dir === 1) S.sort[i].dir = -1;
          else S.sort.splice(i, 1);
        } else S.sort = [{ id, dir: i === 0 && S.sort[0].dir === 1 ? -1 : 1 }];
        if (!S.sort.length) S.sort = [{ id: 'sn', dir: 1 }];
        paintResults();
        return;
      }
      const tr = e.target.closest('tr[data-key]');
      if (tr) V.openDefect(tr.dataset.key);
    };
    box.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const tr = e.target.closest('tr[data-key]');
        if (tr) V.openDefect(tr.dataset.key);
      }
    };
    U.$('#pgSize').onchange = (e) => {
      S.pageSize = +e.target.value;
      S.page = 1;
      paintResults();
    };
    U.$('#pgPrev').onclick = () => {
      S.page--;
      paintResults();
    };
    U.$('#pgNext').onclick = () => {
      S.page++;
      paintResults();
    };
  }

  function boardView(box, rows) {
    box.onclick = (e) => {
      const c = e.target.closest('[data-key]');
      if (c) V.openDefect(c.dataset.key);
    };
    box.onkeydown = null;
    box.innerHTML =
      '<div class="board">' +
      D.STAGES.map((s) => {
        const items = rows.filter((r) => r.stage === s.id);
        return (
          '<section class="lane" style="--c:' + s.color + '"><header><i></i><b>' + esc(s.label) + '</b><em>' + items.length + '</em></header><div class="lane-body">' +
          (items
            .slice(0, 60)
            .map((r, n) => '<button class="bcard" data-key="' + r.key + '" style="--n:' + Math.min(n, 10) + '"><span class="bc-top"><b>' + esc(r.sn) + '</b>' + UI.classTag(r.classification) + '</span><span class="bc-desc">' + esc(U.truncate(r.description, 90)) + '</span><span class="bc-meta">' + esc([r.location, r.building].filter(Boolean).join(' · ')) + '</span><span class="bc-foot"><span>' + esc(r.actionPartyLabel) + '</span>' + (r.overdue ? '<span class="od">Overdue</span>' : r.ageDays != null ? '<span class="muted">' + r.ageDays + ' d</span>' : '') + (r.nBefore + r.nAfter ? '<span class="ph">' + UI.icon('camera', 13) + (r.nBefore + r.nAfter) + '</span>' : '') + '</span></button>')
            .join('') || '<p class="lane-empty">Nothing here</p>') +
          (items.length > 60 ? '<p class="lane-empty">+' + (items.length - 60) + ' more. Use filters to narrow down.</p>' : '') +
          '</div></section>'
        );
      }).join('') + '</div>';
  }

  /* ---------- filters sheet ---------- */
  function filterSheet(root) {
    const f = S.filters;
    const body = F.FACETS.map((fc) => {
      const opts = F.options(S.all, fc);
      return (
        '<details class="facet"' + (f[fc.id].length || fc.id === 'stage' || fc.id === 'cls' ? ' open' : '') + '><summary><span>' + esc(fc.label) + '</span>' + (f[fc.id].length ? '<em class="badge">' + f[fc.id].length + '</em>' : '') + UI.icon('down', 14) + '</summary><div class="facet-list">' +
        opts.map((o) => '<label class="check"><input type="checkbox" data-f="' + fc.id + '" value="' + esc(o.v) + '"' + (f[fc.id].includes(o.v) ? ' checked' : '') + '><span>' + esc(o.label) + '</span><em>' + o.n + '</em></label>').join('') + '</div></details>'
      );
    }).join('') +
      '<div class="facet-misc"><label class="field"><span>Photos</span><select id="fPhoto"><option value="">Any</option>' + Object.keys(F.PHOTO_OPTIONS).map((k) => '<option value="' + k + '"' + (f.photo === k ? ' selected' : '') + '>' + F.PHOTO_OPTIONS[k] + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Inspected from</span><input type="date" id="fFrom" value="' + f.from + '"></label><label class="field"><span>Inspected to</span><input type="date" id="fTo" value="' + f.to + '"></label>' +
      '<label class="check"><input type="checkbox" id="fOver"' + (f.overdue ? ' checked' : '') + '><span>Overdue follow-ups only</span></label></div>';
    const m = UI.modal({ title: 'Filters', width: 520, cls: 'sheet-tall', body, footer: '<button class="btn" id="fClear">Clear all</button><button class="btn primary" data-close>Show results</button>', onClose: () => V.render(root) });
    m.el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.f) {
        const arr = f[t.dataset.f];
        if (t.checked) arr.push(t.value);
        else arr.splice(arr.indexOf(t.value), 1);
      } else if (t.id === 'fPhoto') f.photo = t.value;
      else if (t.id === 'fFrom') f.from = t.value;
      else if (t.id === 'fTo') f.to = t.value;
      else if (t.id === 'fOver') f.overdue = t.checked;
      S.page = 1;
    });
    U.$('#fClear', m.el).addEventListener('click', () => {
      S.filters = F.empty();
      m.close();
    });
  }

  function columnsSheet() {
    const sel = new Set(S.cols);
    const m = UI.modal({
      title: 'Columns',
      width: 420,
      body: '<p class="confirm-text">Choose what the table shows. Every field is always kept on the defect record.</p><div class="facet-list cols">' + E.COLUMNS.map((c) => '<label class="check"><input type="checkbox" value="' + c.id + '"' + (sel.has(c.id) ? ' checked' : '') + '><span>' + esc(c.label) + '</span></label>').join('') + '</div>',
      footer: '<button class="btn" id="colReset">Reset</button><button class="btn primary" data-close>Done</button>',
      onClose: () => {
        S.cols = E.COLUMNS.filter((c) => sel.has(c.id)).map((c) => c.id);
        if (!S.cols.length) S.cols = ['sn', 'description'];
        DT.store.setKV('cols', S.cols);
        paintResults();
      },
    });
    m.el.addEventListener('change', (e) => (e.target.checked ? sel.add(e.target.value) : sel.delete(e.target.value)));
    U.$('#colReset', m.el).addEventListener('click', () => {
      sel.clear();
      E.COLUMNS.filter((c) => c.def).forEach((c) => sel.add(c.id));
      U.$$('input[type=checkbox]', m.el).forEach((i) => (i.checked = sel.has(i.value)));
    });
  }

  /* ---------- defect drawer ---------- */
  V.openDefect = (key) => {
    const list = current().some((r) => r.key === key) ? current() : S.all;
    let idx = list.findIndex((r) => r.key === key);
    if (idx < 0) return;
    const show = (first) => {
      const r = list[idx];
      const html = drawerHTML(r, idx, list.length);
      if (first) {
        const inner = UI.drawer.open(html, { onKey: onKey });
        bind(inner, r);
      } else {
        UI.drawer.setHTML(html);
        bind(UI.drawer.inner, r);
      }
    };
    const go = (d) => {
      idx = (idx + d + list.length) % list.length;
      show(false);
    };
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target.tagName || '').toUpperCase())) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), go(1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), go(-1));
    };
    function bind(inner, r) {
      U.$('[data-dclose]', inner).addEventListener('click', () => UI.drawer.close());
      U.$('[data-dprev]', inner).addEventListener('click', () => go(-1));
      U.$('[data-dnext]', inner).addEventListener('click', () => go(1));
      UI.hydratePhotos(inner);
      const items = r.photos.map((p, i) => ({ hash: p.hash, label: D.photoLabel(p.kind), sub: 'S/N ' + r.sn + ' · ' + r.location }));
      inner.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pi]');
        if (b) UI.lightbox(items, +b.dataset.pi);
      });
      loadHistory(inner, r);
      loadNotes(inner, r);
    }
    show(true);
  };

  function drawerHTML(r, idx, n) {
    const f = (l, v, wide) => (v ? '<div class="kv' + (wide ? ' wide' : '') + '"><dt>' + esc(l) + '</dt><dd>' + esc(v).replace(/\n/g, '<br>') + '</dd></div>' : '');
    const photoSec = (kind, title) => {
      const ps = r.photos.map((p, i) => ({ p, i })).filter((x) => (kind === 'before' ? x.p.kind === 'before' : x.p.kind === kind));
      if (!ps.length) return '';
      return '<h3>' + esc(title) + ' <em>' + ps.length + '</em></h3><div class="gallery">' + ps.map((x) => '<button data-pi="' + x.i + '" aria-label="Open photo"><img data-ph="' + x.p.hash + '" data-size="thumb" alt="' + esc(title) + ' photo"></button>').join('') + '</div>';
    };
    const step = (label, date, done) => '<li class="' + (done ? 'done' : '') + '"><i></i><b>' + esc(label) + '</b><span>' + (date ? esc(U.fmtDate(date)) : done ? 'Date not recorded' : 'Not yet') + '</span></li>';
    const rectd = r.stage === 'awaiting' || r.stage === 'rework' || r.stage === 'closed' || !!r.lastRect;
    return (
      '<header class="d-head"><div class="d-nav"><button class="icon-btn" data-dprev aria-label="Previous defect">' + UI.icon('left') + '</button><span>' + (idx + 1) + ' of ' + n + '</span><button class="icon-btn" data-dnext aria-label="Next defect">' + UI.icon('right') + '</button></div><button class="icon-btn" data-dclose aria-label="Close">' + UI.icon('close') + '</button></header>' +
      '<div class="d-body"><div class="d-title"><span class="d-sn">S/N ' + esc(r.sn) + '</span><h2>' + esc(r.description || '(No description)') + '</h2><div class="d-tags">' + UI.stagePill(r.stage) + UI.classTag(r.classification) + (r.overdue ? '<span class="tag" style="--c:#ff9f0a">Overdue ' + r.daysOverdue + ' d</span>' : '') + '</div></div>' +
      '<ol class="track">' + step('Inspected', r.firstInsp, !!r.firstInsp) + step('Rectified by LTA', r.lastRect, rectd) + step(r.stage === 'rework' ? 'Rework required' : 'Closed', r.closedOn, r.closed) + '</ol>' +
      (r.snIssue === 'duplicate' ? '<div class="note-box">The register used S/N <b>' + esc(r.snRaw) + '</b> more than once. This one was numbered <b>' + esc(r.sn) + '</b> so nothing is mixed up.</div>' : '') +
      (r.classSuspect ? '<div class="note-box warn">The Classification cell did not contain a standard classification, so this defect shows as Unclassified. Original text: “' + esc(U.truncate(r.classificationRaw, 200)) + '”</div>' : '') +
      '<dl class="kvs">' + f('Location', r.location) + f('Building', r.building) + f('Level / Room', r.level) + f('Inspection officer', r.officer) + f('Contact person (STEL)', r.contact) + f('Action party (LTA)', r.actionParty || 'Unassigned') +
      f('Dates of inspection', U.fmtDateList(r.inspDates) || r.inspRaw) + f('Dates of rectification', U.fmtDateList(r.rectDates) || r.rectRaw) + f('Follow-up timeline', r.followUp) + f('Remark', r.remark) + f('Age', r.ageDays == null ? '' : r.ageDays + ' days' + (r.open ? ' and counting' : ' to close')) + '</dl>' +
      '<dl class="kvs one">' + f('Proposed rectification', r.proposed, true) + f('Action', r.action, true) + f('Rectification by LTA', r.rectification, true) + f('Sign-off by STEL', r.signoff, true) + '</dl>' +
      photoSec('before', 'Before photos') + photoSec('after', 'After (rectification)') + photoSec('signoff', 'Sign-off') +
      (r.photoNotes && r.photoNotes.length ? '<div class="note-box">Text found on the photos: ' + esc(r.photoNotes.join(' · ')) + '</div>' : '') +
      '<h3>History <em>across uploads</em></h3><div id="dHist" class="hist"><div class="skeleton"></div></div>' +
      '<h3>Notes</h3><div id="dNotes"></div></div>'
    );
  }

  async function loadHistory(inner, r) {
    const box = U.$('#dHist', inner);
    const recs = await DT.store.getRecordHistory(r.key);
    const byId = new Map(S.batches.map((b) => [b.id, b]));
    const seq = recs.map((x) => ({ b: byId.get(x.batchId), rec: x })).filter((x) => x.b).sort((a, b) => a.b.uploadedAt - b.b.uploadedAt);
    const dv = seq.map((x) => Object.assign({ b: x.b }, { d: D.derive(x.rec, x.b.asOf) }));
    const present = new Set(dv.map((x) => x.b.id));
    const events = [];
    dv.forEach((x, i) => {
      if (i === 0) events.push({ b: x.b, title: 'First appeared', chips: [] });
      else {
        const ch = DT.diff.changesBetween(dv[i - 1].d, x.d);
        events.push({ b: x.b, title: ch.length ? 'Updated' : 'No change', chips: ch });
      }
    });
    const lastIdx = S.batches.findIndex((b) => b.id === dv[dv.length - 1].b.id);
    S.batches.slice(lastIdx + 1).forEach((b) => !present.has(b.id) && events.push({ b, title: 'Not in this upload', chips: [] }));
    box.innerHTML = events
      .slice()
      .reverse()
      .map((ev) => '<div class="hist-row"><i class="' + (ev.title === 'Updated' ? 'up' : ev.title === 'Not in this upload' ? 'gone' : '') + '"></i><div><b>' + esc(ev.title) + '</b><span>' + esc(ev.b.name) + ' · ' + esc(U.fmtDate(ev.b.asOf)) + '</span>' +
        (ev.chips.length ? '<ul>' + ev.chips.slice(0, 6).map((c) => '<li><em>' + esc(c.label) + '</em> ' + (c.field === 'photos' ? esc(c.from) + ' → ' + esc(c.to) : esc(U.truncate(c.from, 40) || '(empty)') + ' → <b>' + esc(U.truncate(c.to, 40) || '(empty)') + '</b>') + '</li>').join('') + (ev.chips.length > 6 ? '<li class="muted">+' + (ev.chips.length - 6) + ' more</li>' : '') + '</ul>' : '') + '</div></div>')
      .join('');
  }

  async function loadNotes(inner, r) {
    const box = U.$('#dNotes', inner);
    const paint = async () => {
      const notes = await DT.store.getNotes(r.key);
      box.innerHTML =
        (notes.length ? '<ul class="notes">' + notes.map((n) => '<li><div><b>' + esc(n.author) + '</b><span>' + esc(U.fmtDateTime(n.at)) + '</span>' + (DT.auth.can('delete') || n.authorId === S.user.id ? '<button class="icon-btn sm" data-del="' + n.id + '" aria-label="Delete note">' + UI.icon('trash', 14) + '</button>' : '') + '</div><p>' + esc(n.text).replace(/\n/g, '<br>') + '</p></li>').join('') + '</ul>' : '<p class="muted small">No notes yet.</p>') +
        (DT.auth.can('notes') ? '<div class="note-form"><textarea rows="2" placeholder="Add a note for the team…"></textarea><button class="btn primary sm">Add note</button></div>' : '');
    };
    await paint();
    box.addEventListener('click', async (e) => {
      const d = e.target.closest('[data-del]');
      if (d) {
        await DT.store.deleteNote(d.dataset.del);
        paint();
      } else if (e.target.closest('.note-form button')) {
        const ta = U.$('textarea', box);
        if (!ta.value.trim()) return;
        await DT.store.addNote({ id: U.uid(), key: r.key, text: ta.value.trim(), author: S.user.name, authorId: S.user.id, at: Date.now() });
        paint();
      }
    });
  }
})();
