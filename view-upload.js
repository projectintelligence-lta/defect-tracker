/* Defect Tracker — upload flow */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain,
    UI = DT.ui,
    S = DT.state,
    P = DT.parser,
    esc = U.esc;
  const V = (DT.views.upload = {});

  V.open = () => {
    if (!DT.auth.can('upload')) return UI.toast('Your role cannot upload files.', 'error');
    const st = { session: null, sheet: null, overrides: {}, result: null, prev: null, prevRecs: null, links: new Map(), removeDemo: true, tab: 'summary', file: null, busy: false };
    const m = UI.modal({ title: 'Upload defect register', width: 900, cls: 'sheet-upload', body: '', footer: '', onBeforeClose: () => !st.busy });
    const body = m.body,
      foot = m.foot;
    pick();

    /* ---------- step 1: choose a file ---------- */
    function pick(err) {
      foot.innerHTML = '<button class="btn" data-close>Cancel</button>';
      body.innerHTML =
        '<div class="drop" id="drop" tabindex="0" role="button" aria-label="Choose an Excel file"><div class="drop-ic">' + UI.icon('upload', 30) + '</div><h3>Drop your Excel file here</h3><p>or <u>browse</u> to choose one</p><span class="muted small">.xlsx, .xlsm or .csv</span><input type="file" id="file" accept=".xlsx,.xlsm,.xls,.csv" hidden></div>' +
        (err ? '<div class="note-box warn">' + esc(err) + '</div>' : '') +
        '<div class="upload-facts"><div>' + UI.icon('shield', 18) + '<span><b>Your file stays in your browser.</b> It is read on this device. The original Excel file is not stored; the defects and photos are saved here so the history can be kept.</span></div>' +
        '<div>' + UI.icon('camera', 18) + '<span><b>Photos follow their row.</b> Each picture is attached to the defect row it sits on, before or after depending on its column.</span></div>' +
        '<div>' + UI.icon('file', 18) + '<span><b>New to this?</b> <button class="link" id="tpl">Download the Excel template</button></span></div></div>';
      const drop = U.$('#drop', body),
        input = U.$('#file', body);
      drop.addEventListener('click', () => input.click());
      drop.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.click()));
      input.addEventListener('change', () => input.files[0] && read(input.files[0]));
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => (e.preventDefault(), drop.classList.add('over'))));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => (e.preventDefault(), drop.classList.remove('over'))));
      drop.addEventListener('drop', (e) => e.dataTransfer.files[0] && read(e.dataTransfer.files[0]));
      U.$('#tpl', body).addEventListener('click', () => U.download(P.makeTemplate(), 'Defect_Register_Template.xlsx'));
    }

    /* ---------- step 2: reading ---------- */
    function progressUI(file) {
      foot.innerHTML = '';
      body.innerHTML =
        '<div class="reading"><div class="ring"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="0 100"/></svg><b id="pct">0%</b></div><h3 id="phase">Opening file…</h3><p class="muted">' + esc(file.name) + ' · ' + U.fmtBytes(file.size) + '</p></div>';
      return (label, pct) => {
        const fg = U.$('.fg', body);
        if (!fg) return;
        fg.setAttribute('stroke-dasharray', Math.max(1, pct) + ' 100');
        U.$('#pct', body).textContent = Math.round(pct) + '%';
        U.$('#phase', body).textContent = label;
      };
    }
    function bestSheet(session) {
      let best = session.sheetNames[0],
        bs = -1;
      session.sheetNames.forEach((n) => {
        const ws = session.wb.Sheets[n];
        if (!ws || !ws['!ref']) return;
        const orig = ws['!ref'];
        const ref = XLSX.utils.decode_range(orig);
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.min(ref.e.r, 40), c: ref.e.c } });
        const mx = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
        ws['!ref'] = orig;
        const sc = P.detectColumns(mx).score;
        if (sc > bs) (bs = sc), (best = n);
      });
      return best;
    }
    async function read(file) {
      st.file = file;
      st.busy = true;
      const prog = progressUI(file);
      try {
        prog('Reading the workbook…', 6);
        await U.sleep(60);
        st.session = await P.open(file);
        prog('Finding the header row…', 14);
        st.sheet = bestSheet(st.session);
        st.overrides = Object.assign({}, D.settings.columnOverrides || {});
        await analyze(prog);
        st.busy = false;
        review();
      } catch (e) {
        st.busy = false;
        console.error(e);
        pick(e.message || 'That file could not be read.');
      }
    }
    async function analyze(prog) {
      prog = prog || progressUI(st.file);
      prog('Matching columns and reading rows…', 22);
      await U.yield();
      st.result = await st.session.analyze(st.sheet, st.overrides, (i, n) => prog('Extracting photos… ' + i + ' of ' + n, 30 + (n ? (60 * i) / n : 60)));
      prog('Checking your data…', 94);
      const batches = S.batches;
      st.prev = batches.length ? batches[batches.length - 1] : null;
      st.prevRecs = st.prev ? D.deriveAll(await DT.store.getRecords(st.prev.id), st.prev.asOf) : null;
      st.links = new Map();
      st.removeDemo = true;
      prog('Done', 100);
      await U.sleep(250);
    }

    /* ---------- step 3: review ---------- */
    const newDerived = () => D.deriveAll(st.result.records, U.isoToday());
    const compareOn = () => st.prevRecs && !(st.prev.demo && st.removeDemo);
    const getDiff = () => (compareOn() ? DT.diff.compute(st.prevRecs, newDerived(), st.links) : null);

    function review() {
      const r = st.result;
      const today = U.isoToday();
      body.innerHTML =
        '<div class="rv-head" id="rvHead"></div><div class="rv-tabs"><div id="rvTabs"></div></div><div class="rv-body" id="rvBody"></div>';
      const warn = r.warnings.filter((w) => w.level === 'warn').length;
      UI.segmented(U.$('#rvTabs', body), {
        value: st.tab,
        options: [
          { id: 'summary', label: 'Summary' },
          { id: 'columns', label: 'Columns' },
          { id: 'quality', label: 'Data quality', count: r.fatal ? undefined : r.warnings.length },
          { id: 'changes', label: 'Changes' },
        ],
        onChange: (v) => {
          st.tab = v;
          paintTab();
        },
      });
      const nm = 'Upload – ' + U.fmtDate(today);
      foot.innerHTML =
        '<div class="foot-fields"><label class="field inline"><span>Name this upload</span><input id="upName" value="' + esc(nm) + '" maxlength="60"></label><label class="field inline grow"><span>Note (optional)</span><input id="upNote" placeholder="e.g. Contractor update after site walk" maxlength="140"></label></div>' +
        '<div class="foot-btns"><button class="btn" id="upBack">Choose another file</button><button class="btn primary" id="upGo"' + (r.fatal ? ' disabled' : '') + '>Update dashboard</button></div>';
      U.$('#upBack', foot).addEventListener('click', () => pick());
      U.$('#upGo', foot).addEventListener('click', confirm);
      paintHead();
      paintTab();
    }

    function paintHead() {
      const r = st.result;
      const head = U.$('#rvHead', body);
      if (r.fatal) {
        head.innerHTML = '<div class="verdict bad">' + UI.icon('alert', 22) + '<div><b>This file can’t be loaded yet</b><span>' + esc(r.fatal) + '</span></div></div>';
        return;
      }
      const ok = r.rowsWithData === r.records.length;
      head.innerHTML =
        '<div class="verdict ' + (ok ? 'ok' : 'warn') + '">' + UI.icon(ok ? 'check' : 'alert', 22) + '<div><b>' + (ok ? 'Row count matches' : 'Row count needs a look') + '</b><span>' + r.rowsWithData + ' rows with data in Excel · ' + r.records.length + ' defects read' + (ok ? '' : ' · ' + (r.rowsWithData - r.records.length) + ' row(s) were not read, see Data quality') + '</span></div></div>';
    }

    function paintTab() {
      const box = U.$('#rvBody', body);
      box.classList.remove('swap');
      void box.offsetWidth;
      box.classList.add('swap');
      ({ summary: tabSummary, columns: tabColumns, quality: tabQuality, changes: tabChanges }[st.tab])(box);
    }

    function tabSummary(box) {
      const r = st.result;
      if (r.fatal) {
        box.innerHTML = '<p class="muted">Open the <b>Columns</b> tab to match the register columns to your file.</p>';
        return;
      }
      const d = newDerived();
      const sum = D.summarize(d);
      const noPhoto = d.filter((x) => !x.photos.length).length;
      const stat = (n, l, c) => '<div class="stat"><b' + (c ? ' style="color:' + c + '"' : '') + '>' + n + '</b><span>' + l + '</span></div>';
      box.innerHTML =
        '<div class="stats">' + stat(r.records.length, 'Defects read') + stat(r.photosAttached + (r.photosFound > r.photosAttached ? ' of ' + r.photosFound : ''), 'Photos attached') + stat(noPhoto, 'Defects without photos') + stat(r.warnings.filter((w) => w.level === 'warn').length, 'Items to check', r.warnings.some((w) => w.level === 'warn') ? '#ff9f0a' : '') + '</div>' +
        '<div class="rv-grid"><div class="card flat"><h4>Stages in this file</h4>' + D.STAGES.map((s) => '<div class="mini-row"><i style="background:' + s.color + '"></i><span>' + esc(s.label) + '</span><b>' + sum[s.id] + '</b></div>').join('') + '</div>' +
        '<div class="card flat"><h4>Source</h4><div class="mini-row"><span>File</span><b class="r">' + esc(st.file.name) + '</b></div><div class="mini-row"><span>Sheet</span>' + (st.session.sheetNames.length > 1 ? '<select id="sheetSel">' + st.session.sheetNames.map((n) => '<option' + (n === st.sheet ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>' : '<b>' + esc(st.sheet) + '</b>') + '</div><div class="mini-row"><span>Header row</span><b>' + (r.headerRow + 1) + '</b></div><div class="mini-row"><span>Columns matched</span><b>' + Object.keys(r.map).length + ' of ' + D.FIELDS.length + '</b></div></div></div>' +
        (st.prev && st.prev.demo ? '<label class="check callout"><input type="checkbox" id="rmDemo"' + (st.removeDemo ? ' checked' : '') + '><span><b>Replace the sample data with this upload</b><em>Recommended for your first real upload. Untick to keep the sample history.</em></span></label>' : '');
      const sel = U.$('#sheetSel', box);
      if (sel)
        sel.addEventListener('change', async () => {
          st.sheet = sel.value;
          st.overrides = {};
          st.busy = true;
          await analyze();
          st.busy = false;
          review();
        });
      const rd = U.$('#rmDemo', box);
      if (rd) rd.addEventListener('change', () => (st.removeDemo = rd.checked));
    }

    function tabColumns(box) {
      const r = st.result;
      const headers = r.headers;
      const opts = (sel) => '<option value="">Not in my file</option>' + headers.map((h, i) => (h ? '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + esc(U.truncate(h, 56)) + '  (col ' + XLSX.utils.encode_col(i) + ')</option>' : '')).join('');
      box.innerHTML =
        '<p class="muted small">Each register column below is matched to a column of your file by its heading. Change a match if it is wrong, then re-read.</p><div class="map">' +
        D.FIELDS.map((f) => {
          const cur = r.map[f.id],
            det = r.detected ? r.detected[f.id] : undefined;
          const changed = cur !== det;
          return '<div class="map-row' + (cur == null && f.req ? ' miss' : '') + '"><span class="map-f"><b>' + esc(f.label) + '</b>' + (f.req ? '<em>required</em>' : '') + '</span><select data-f="' + f.id + '">' + opts(cur) + '</select><span class="map-s ' + (cur == null ? 'none' : changed ? 'chg' : 'ok') + '">' + (cur == null ? 'Not matched' : changed ? 'Changed by you' : 'Matched') + '</span></div>';
        }).join('') + '</div>' +
        (r.columnsUnmapped && r.columnsUnmapped.length ? '<p class="muted small">Not used: ' + r.columnsUnmapped.map((c) => esc(U.truncate(c.h, 30))).join(', ') + '</p>' : '') +
        '<div class="map-actions"><label class="check"><input type="checkbox" id="remember" checked><span>Remember these matches for next time</span></label><button class="btn primary" id="reread">Re-read file</button></div>';
      box.addEventListener('change', (e) => {
        const f = e.target.dataset.f;
        if (f) st.overrides[f] = e.target.value === '' ? null : +e.target.value;
      });
      U.$('#reread', box).addEventListener('click', async () => {
        if (U.$('#remember', box).checked) {
          D.settings.columnOverrides = Object.assign({}, st.overrides);
          DT.app.saveSettings();
        }
        st.busy = true;
        progressUI(st.file);
        await analyze();
        st.busy = false;
        review();
      });
    }

    function tabQuality(box) {
      const w = st.result.warnings;
      if (!w.length) {
        box.innerHTML = UI.empty('shield', 'No issues found', 'Every row was read cleanly.');
        return;
      }
      const order = { warn: 0, info: 1 };
      const list = w.slice().sort((a, b) => order[a.level] - order[b.level]);
      box.innerHTML =
        '<div class="q-head"><span class="muted small">' + w.filter((x) => x.level === 'warn').length + ' to check · ' + w.filter((x) => x.level === 'info').length + ' for information</span><button class="link" id="qCsv">Download list</button></div><ul class="qlist">' +
        list.map((x) => '<li class="' + x.level + '"><i>' + UI.icon(x.level === 'warn' ? 'alert' : 'info', 16) + '</i><span>' + esc(x.text) + '</span></li>').join('') + '</ul>';
      U.$('#qCsv', box).addEventListener('click', () => U.download(new Blob(['\ufeffType,Message\r\n' + list.map((x) => U.csvEscape(x.level === 'warn' ? 'To check' : 'Info') + ',' + U.csvEscape(x.text)).join('\r\n')], { type: 'text/csv' }), 'data_quality_' + U.stamp() + '.csv'));
    }

    function tabChanges(box) {
      if (st.result.fatal) {
        box.innerHTML = '<p class="muted">Fix the columns first.</p>';
        return;
      }
      const df = getDiff();
      if (!df) {
        box.innerHTML = UI.empty('compare', st.prev ? 'Sample data will be replaced' : 'This is the first upload', st.prev ? 'Nothing to compare against once the sample data is removed.' : 'From the next upload on, you will see new, changed and closed defects here before you confirm.');
        return;
      }
      const sn = (r) => '<b class="sn">' + esc(r.sn) + '</b>';
      const line = (r) => sn(r) + '<span>' + esc(U.truncate(r.description, 80)) + '</span>';
      const sec = (title, n, html, open) => (n ? '<details class="chg"' + (open ? ' open' : '') + '><summary>' + esc(title) + '<em>' + n + '</em>' + UI.icon('down', 14) + '</summary>' + html + '</details>' : '');
      box.innerHTML =
        '<div class="stats">' + [['New', df.added.length, '#0071e3'], ['Updated', df.changed.length, ''], ['Closed since', df.closedNow.length, '#34c759'], ['Reopened', df.reopened.length, '#ff9f0a'], ['Missing from file', df.removed.length, df.removed.length ? '#ff3b30' : '']].map((x) => '<div class="stat"><b' + (x[2] ? ' style="color:' + x[2] + '"' : '') + '>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
        (df.allLow.length ? '<div class="confirm-box"><h4>Please confirm ' + df.allLow.length + ' match' + (df.allLow.length > 1 ? 'es' : '') + '</h4><p class="muted small">These defects were paired with an earlier one, but something did not line up.</p>' + df.allLow.map((p, i) => '<div class="pair"><div><span class="muted small">' + esc(p.reason) + '</span><div class="pair-cols"><div><em>Previous</em>' + line(p.o) + '</div><div><em>This file</em>' + line(p.n) + '</div></div></div><div class="pair-seg" data-i="' + i + '"></div></div>').join('') + '</div>' : '') +
        sec('New defects', df.added.length, '<ul class="dlist">' + df.added.map((r) => '<li>' + line(r) + '</li>').join('') + '</ul>', true) +
        sec('Updated defects', df.changed.length, '<ul class="dlist">' + df.changed.map((p) => '<li class="col">' + line(p.n) + '<ul class="diffs">' + p.changes.slice(0, 8).map((c) => '<li><em>' + esc(c.label) + '</em>' + (c.field === 'photos' ? esc(c.from) + ' → <b>' + esc(c.to) + '</b>' : '<s>' + esc(U.truncate(c.from, 50) || '(empty)') + '</s> → <b>' + esc(U.truncate(c.to, 50) || '(empty)') + '</b>') + '</li>').join('') + (p.changes.length > 8 ? '<li class="muted">+' + (p.changes.length - 8) + ' more</li>' : '') + '</ul></li>').join('') + '</ul>', df.added.length === 0) +
        sec('Missing from this file', df.removed.length, '<p class="muted small">These were in the previous upload but not in this one. They stay in the history; the dashboard will show only what is in this file.</p><ul class="dlist">' + df.removed.map((r) => '<li>' + line(r) + '</li>').join('') + '</ul>', true) +
        (df.added.length + df.changed.length + df.removed.length === 0 ? '<p class="muted">No changes since ' + esc(st.prev.name) + '. You can still save it as a new upload.</p>' : '');
      U.$$('.pair-seg', box).forEach((el) => {
        const p = df.allLow[+el.dataset.i];
        UI.segmented(el, {
          value: st.links.get(p.n.sn) === 'different' ? 'different' : 'same',
          options: [{ id: 'same', label: 'Same defect' }, { id: 'different', label: 'Different' }],
          onChange: (v) => {
            if (v === 'different') st.links.set(p.n.sn, 'different');
            else st.links.delete(p.n.sn);
            const y = U.$('#rvBody', body).scrollTop;
            tabChanges(box);
            U.$('#rvBody', body).scrollTop = y;
          },
        });
      });
    }

    /* ---------- step 4: save ---------- */
    async function confirm() {
      const btn = U.$('#upGo', foot);
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner sm"></span>Saving…';
      st.busy = true;
      try {
        const name = U.$('#upName', foot).value.trim() || 'Upload – ' + U.fmtDate(U.isoToday());
        const batch = await DT.app.commit(st.result, {
          name,
          fileName: st.file.name,
          note: U.$('#upNote', foot).value.trim(),
          user: { name: S.user.name, role: S.user.role },
          removeDemo: !!(st.prev && st.prev.demo && st.removeDemo),
          overrides: st.links,
        });
        await DT.app.reload(false);
        st.busy = false;
        done(batch);
      } catch (e) {
        console.error(e);
        st.busy = false;
        btn.disabled = false;
        btn.textContent = 'Update dashboard';
        UI.toast('Could not save: ' + e.message, 'error');
      }
    }
    function done(b) {
      foot.innerHTML = '<button class="btn" id="dUp">View uploads</button><button class="btn primary" id="dGo">View dashboard</button>';
      body.innerHTML =
        '<div class="success"><svg viewBox="0 0 80 80" width="84" height="84"><circle class="sc" cx="40" cy="40" r="34" pathLength="1"/><path class="sk" pathLength="1" d="M26 41l10 10 19-22"/></svg><h3>Dashboard updated</h3><p>' + esc(U.plural(b.stats.total, 'defect')) + ' · ' + b.counts.added + ' new · ' + b.counts.changed + ' updated · ' + b.counts.closedNow + ' closed since last time.</p></div>';
      U.$('#dGo', foot).addEventListener('click', () => (m.close(), DT.app.go('overview'), DT.app.render()));
      U.$('#dUp', foot).addEventListener('click', () => (m.close(), DT.app.go('uploads'), DT.app.render()));
      DT.app.render();
    }
  };
})();
