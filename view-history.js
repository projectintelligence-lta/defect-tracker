/* Defect Tracker — Uploads: history of every upload, snapshots and comparison */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain,
    UI = DT.ui,
    S = DT.state,
    esc = U.esc;
  const V = (DT.views.uploads = {});

  V.render = (root) => {
    const list = S.batches.slice().reverse();
    root.innerHTML =
      '<div class="page-head"><div><h1>Uploads</h1><p class="lede">Every upload is kept. Open any snapshot, or compare two uploads to see what moved.</p></div><div class="head-actions">' +
      (S.batches.length > 1 ? '<button class="btn" id="btnCompare">' + UI.icon('compare', 16) + '<span>Compare uploads</span></button>' : '') + (DT.auth.can('upload') ? '<button class="btn primary" data-act="upload">' + UI.icon('upload', 16) + '<span>Upload Excel</span></button>' : '') + '</div></div>' +
      (list.length ? '<ol class="timeline">' + list.map((b, i) => card(b, i)).join('') + '</ol>' : UI.empty('history', 'No uploads yet', 'Your uploads will appear here.'));
    const cmp = U.$('#btnCompare', root);
    if (cmp) cmp.addEventListener('click', () => compareDialog());
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-b]');
      if (!b) return;
      const id = b.dataset.b,
        a = b.dataset.a;
      if (a === 'view') {
        await DT.app.selectBatch(id);
        DT.app.go('overview');
      } else if (a === 'cmp') {
        const i = S.batches.findIndex((x) => x.id === id);
        showDiff(S.batches[i - 1], S.batches[i]);
      } else if (a === 'del') {
        const bt = S.batches.find((x) => x.id === id);
        if (await UI.confirm({ title: 'Delete this upload?', message: '“' + bt.name + '” and its photos will be removed from the history. Other uploads are not affected.', confirmLabel: 'Delete', danger: true })) {
          await DT.app.deleteBatch(id);
          UI.toast('Upload deleted');
        }
      }
    });
  };

  function card(b, i) {
    const s = b.stats,
      c = b.counts || {};
    const idx = S.batches.findIndex((x) => x.id === b.id);
    const viewing = b.id === S.batchId;
    const pill = (n, l, cls) => (n ? '<span class="dchip ' + cls + '">' + n + ' ' + l + '</span>' : '');
    return (
      '<li class="tl-item' + (viewing ? ' cur' : '') + '" style="--n:' + Math.min(i, 8) + '"><i class="tl-dot"></i><div class="tl-card"><div class="tl-top"><div><h3>' + esc(b.name) + (i === 0 ? '<span class="tag" style="--c:#0071e3">Latest</span>' : '') + (b.demo ? '<span class="tag" style="--c:#8e8e93">Sample</span>' : '') + (viewing && i !== 0 ? '<span class="tag" style="--c:#34c759">Viewing</span>' : '') + '</h3>' +
      '<p>' + esc(U.fmtDateTime(b.uploadedAt)) + (b.uploadedBy ? ' · ' + esc(b.uploadedBy.name) : '') + ' · <span class="muted">' + esc(b.fileName) + '</span></p>' + (b.note ? '<p class="tl-note">“' + esc(b.note) + '”</p>' : '') + '</div>' +
      '<div class="tl-act"><button class="btn sm" data-b="' + b.id + '" data-a="view">' + (viewing ? 'Viewing' : 'View snapshot') + '</button>' + (idx > 0 ? '<button class="btn sm" data-b="' + b.id + '" data-a="cmp">What changed</button>' : '') + (DT.auth.can('delete') ? '<button class="icon-btn" data-b="' + b.id + '" data-a="del" aria-label="Delete upload">' + UI.icon('trash', 16) + '</button>' : '') + '</div></div>' +
      '<div class="tl-stats"><div><b>' + s.total + '</b><span>Defects</span></div><div><b>' + s.open + '</b><span>Open</span></div><div><b>' + s.closed + '</b><span>Closed</span></div><div><b class="' + (s.safetyOpen ? 'red' : '') + '">' + s.safetyOpen + '</b><span>Safety open</span></div><div><b>' + s.overdue + '</b><span>Overdue</span></div><div><b>' + ((b.photos && b.photos.attached) || 0) + '</b><span>Photos</span></div></div>' +
      (idx > 0 ? '<div class="tl-chips">' + pill(c.added, 'new', 'blue') + pill(c.changed, 'updated', '') + pill(c.closedNow, 'closed since', 'green') + pill(c.removed, 'missing', 'orange') + (!c.added && !c.changed && !c.removed ? '<span class="muted small">No changes from the previous upload</span>' : '') + '</div>' : '') + '</div></li>'
    );
  }

  function compareDialog() {
    const opts = (sel) => S.batches.slice().reverse().map((b) => '<option value="' + b.id + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.name) + ' · ' + esc(U.fmtDate(b.asOf)) + '</option>').join('');
    const m = UI.modal({
      title: 'Compare two uploads',
      width: 520,
      body: '<div class="cmp-pick"><label class="field"><span>Earlier</span><select id="cA">' + opts(S.batches[S.batches.length - 2].id) + '</select></label><label class="field"><span>Later</span><select id="cB">' + opts(S.batches[S.batches.length - 1].id) + '</select></label></div>',
      footer: '<button class="btn" data-close>Cancel</button><button class="btn primary" id="cGo">Compare</button>',
    });
    U.$('#cGo', m.el).addEventListener('click', () => {
      const a = S.batches.find((x) => x.id === U.$('#cA', m.el).value),
        b = S.batches.find((x) => x.id === U.$('#cB', m.el).value);
      if (a.id === b.id) return UI.toast('Choose two different uploads', 'error');
      m.close();
      const [x, y] = a.uploadedAt <= b.uploadedAt ? [a, b] : [b, a];
      setTimeout(() => showDiff(x, y), 300);
    });
  }

  async function showDiff(a, b) {
    const m = UI.modal({ title: 'What changed', width: 860, body: '<div class="loading-sheet"><div class="spinner"></div></div>' });
    const [ra, rb] = await Promise.all([DT.store.getRecords(a.id), DT.store.getRecords(b.id)]);
    const da = D.deriveAll(ra, a.asOf),
      db = D.deriveAll(rb, b.asOf);
    /* match by identity key first (this is what the upload flow already established) */
    const byKey = new Map(da.map((r) => [r.key, r]));
    const pairs = [],
      added = [];
    db.forEach((n) => {
      const o = byKey.get(n.key);
      if (o) {
        pairs.push({ o, n, changes: DT.diff.changesBetween(o, n) });
        byKey.delete(n.key);
      } else added.push(n);
    });
    const removed = Array.from(byKey.values());
    const changed = pairs.filter((p) => p.changes.length);
    const closed = pairs.filter((p) => !p.o.closed && p.n.closed);
    const line = (r) => '<b class="sn">' + esc(r.sn) + '</b><span>' + esc(U.truncate(r.description, 90)) + '</span>';
    const sec = (t, n, h, open) => (n ? '<details class="chg"' + (open ? ' open' : '') + '><summary>' + t + '<em>' + n + '</em>' + UI.icon('down', 14) + '</summary>' + h + '</details>' : '');
    m.body.innerHTML =
      '<p class="muted small">' + esc(a.name) + ' (' + esc(U.fmtDate(a.asOf)) + ') → <b>' + esc(b.name) + '</b> (' + esc(U.fmtDate(b.asOf)) + ')</p><div class="stats">' +
      [['New', added.length, '#0071e3'], ['Updated', changed.length, ''], ['Closed since', closed.length, '#34c759'], ['Missing', removed.length, removed.length ? '#ff3b30' : '']].map((x) => '<div class="stat"><b' + (x[2] ? ' style="color:' + x[2] + '"' : '') + '>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
      sec('New defects', added.length, '<ul class="dlist">' + added.map((r) => '<li>' + line(r) + '</li>').join('') + '</ul>', true) +
      sec('Updated defects', changed.length, '<ul class="dlist">' + changed.map((p) => '<li class="col">' + line(p.n) + '<ul class="diffs">' + p.changes.slice(0, 8).map((c) => '<li><em>' + esc(c.label) + '</em>' + (c.field === 'photos' ? esc(c.from) + ' → <b>' + esc(c.to) + '</b>' : '<s>' + esc(U.truncate(c.from, 50) || '(empty)') + '</s> → <b>' + esc(U.truncate(c.to, 50) || '(empty)') + '</b>') + '</li>').join('') + '</ul></li>').join('') + '</ul>', true) +
      sec('Missing from the later upload', removed.length, '<ul class="dlist">' + removed.map((r) => '<li>' + line(r) + '</li>').join('') + '</ul>', true) +
      (!added.length && !changed.length && !removed.length ? '<p class="muted">The two uploads are identical.</p>' : '');
  }
})();
