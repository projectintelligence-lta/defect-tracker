/* Defect Tracker — app core */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain,
    UI = DT.ui,
    esc = U.esc;
  DT.views = DT.views || {};

  const S = (DT.state = {
    user: null,
    batches: [],
    batch: null,
    batchId: null,
    all: [],
    asOf: U.isoToday(),
    prevStats: null,
    filters: DT.filters.empty(),
    sort: [{ id: 'sn', dir: 1 }],
    view: 'table',
    page: 1,
    pageSize: 25,
    cols: null,
    route: 'overview',
  });
  const App = (DT.app = {});

  /* ---------- settings ---------- */
  App.loadSettings = async () => {
    const saved = (await DT.store.getKV('settings')) || {};
    D.settings = Object.assign(U.clone(D.DEFAULTS), saved);
    D.settings.statusMap = Object.assign({}, D.DEFAULTS.statusMap, saved.statusMap || {});
    D.settings.classMap = Object.assign({}, D.DEFAULTS.classMap, saved.classMap || {});
    S.cols = (await DT.store.getKV('cols')) || DT.exporter.COLUMNS.filter((c) => c.def).map((c) => c.id);
  };
  App.saveSettings = () => DT.store.setKV('settings', D.settings);

  /* ---------- data ---------- */
  App.reload = async (keep) => {
    S.batches = await DT.store.getBatches();
    if (!S.batches.length) {
      S.batch = null;
      S.batchId = null;
      S.all = [];
      S.prevStats = null;
      return;
    }
    const latest = S.batches[S.batches.length - 1];
    if (!keep || !S.batches.find((b) => b.id === S.batchId)) S.batchId = latest.id;
    const idx = S.batches.findIndex((b) => b.id === S.batchId);
    S.batch = S.batches[idx];
    S.prevStats = idx > 0 ? S.batches[idx - 1].stats : null;
    S.asOf = S.batch.id === latest.id ? U.isoToday() : S.batch.asOf;
    const raw = await DT.store.getRecords(S.batch.id);
    S.all = D.deriveAll(raw, S.asOf);
  };
  App.isLatest = () => S.batch && S.batches.length && S.batch.id === S.batches[S.batches.length - 1].id;
  App.selectBatch = async (id) => {
    S.batchId = id;
    S.page = 1;
    await App.reload(true);
    App.render();
  };

  /* Save a parsed upload as a new history entry. Matches defects to the previous upload so each keeps one identity. */
  App.commit = async (result, meta) => {
    const asOf = meta.asOf || U.isoToday();
    const records = result.records;
    const derived = D.deriveAll(records, asOf);
    const batches = await DT.store.getBatches();
    const prev = batches.length ? batches[batches.length - 1] : null;
    let df = null;
    if (prev && !(prev.demo && meta.removeDemo)) {
      const prevRecs = D.deriveAll(await DT.store.getRecords(prev.id), prev.asOf);
      df = DT.diff.compute(prevRecs, derived, meta.overrides);
      const idx = new Map(derived.map((r, i) => [r, i]));
      df.pairs.forEach((p) => {
        records[idx.get(p.n)].key = p.o.key;
      });
    }
    records.forEach((r) => !r.key && (r.key = U.uid()));
    const warnCount = (result.warnings || []).reduce((a, w) => ((a[w.level] = (a[w.level] || 0) + 1), a), {});
    const batch = {
      id: U.uid(),
      name: meta.name,
      fileName: meta.fileName,
      uploadedAt: meta.uploadedAt || Date.now(),
      asOf,
      uploadedBy: meta.user,
      note: meta.note || '',
      demo: !!meta.demo,
      sheetName: result.sheetName,
      parentId: prev ? prev.id : null,
      rowsWithData: result.rowsWithData,
      photos: { found: result.photosFound || 0, attached: result.photosAttached || 0 },
      warnings: warnCount,
      stats: D.summarize(derived),
      counts: df
        ? { added: df.added.length, changed: df.changed.length, closedNow: df.closedNow.length, removed: df.removed.length }
        : { added: derived.length, changed: 0, closedNow: 0, removed: 0 },
    };
    await DT.store.saveBatch(batch, records, result.media);
    if (meta.removeDemo) for (const b of batches.filter((x) => x.demo)) await DT.store.deleteBatch(b.id);
    return batch;
  };

  App.seedDemo = async (onProgress) => {
    const specs = await DT.demo.build(onProgress);
    for (const sp of specs) {
      await App.commit(
        { records: sp.records, media: sp.media, warnings: sp.warnings, rowsWithData: sp.rowsWithData, sheetName: 'Defects', photosFound: sp.records.reduce((a, r) => a + r.photos.length, 0), photosAttached: sp.records.reduce((a, r) => a + r.photos.length, 0) },
        { name: sp.label, fileName: sp.fileName, uploadedAt: sp.uploadedAt, asOf: sp.asOf, user: { name: 'Sample data', role: 'system' }, demo: true }
      );
    }
    await DT.store.setKV('seeded', true);
  };

  App.deleteBatch = async (id) => {
    await DT.store.deleteBatch(id);
    await App.reload(false);
    App.render();
  };

  /* ---------- routing ---------- */
  const ROUTES = ['overview', 'defects', 'uploads', 'settings'];
  App.route = () => {
    const h = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return ROUTES.includes(h) ? h : 'overview';
  };
  App.go = (r) => {
    if (location.hash === '#/' + r) App.render();
    else location.hash = '#/' + r;
  };

  function layoutTabs(animate) {
    const tabs = U.$('#tabs');
    if (!tabs) return;
    const a = U.$('a[data-r="' + S.route + '"]', tabs);
    U.$$('a', tabs).forEach((x) => x.classList.toggle('on', x === a));
    const ind = U.$('.tab-ind', tabs);
    if (!a) return;
    if (!animate) ind.style.transition = 'none';
    ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    if (!animate) {
      void ind.offsetWidth;
      ind.style.transition = '';
    }
  }

  App.render = () => {
    S.route = App.route();
    layoutTabs(true);
    renderBanner();
    const root = U.$('#view');
    root.className = 'page';
    void root.offsetWidth;
    root.classList.add('view-enter');
    if (!S.batch && (S.route === 'overview' || S.route === 'defects')) {
      root.innerHTML = UI.empty('file', 'No data yet', 'Upload a defect register to build the dashboard, or load the sample data to look around.',
        '<div class="empty-actions">' + (DT.auth.can('upload') ? '<button class="btn primary" data-act="upload">Upload Excel</button>' : '') + '<button class="btn" data-act="sample">Load sample data</button></div>');
      return;
    }
    DT.views[S.route].render(root);
    window.scrollTo(0, 0);
  };

  function renderBanner() {
    const el = U.$('#banner');
    if (!el) return;
    let html = '';
    if (S.batch && !App.isLatest())
      html = '<div class="banner snap"><span>' + UI.icon('history', 16) + 'Viewing the snapshot from <b>' + esc(U.fmtDate(S.batch.asOf)) + '</b> (' + esc(S.batch.name) + '). Overdue and ageing are measured at that date.</span><button class="btn sm" data-act="latest">Back to latest</button></div>';
    else if (S.batch && S.batch.demo)
      html = '<div class="banner demo"><span>' + UI.icon('info', 16) + 'You are looking at <b>sample data</b>. Upload your own register to replace it.</span>' + (DT.auth.can('upload') ? '<button class="btn sm primary" data-act="upload">Upload Excel</button>' : '') + '</div>';
    el.innerHTML = html;
    el.classList.toggle('on', !!html);
  }

  App.snapChip = () => {
    if (!S.batch) return '';
    return '<button class="chip-btn" data-snap aria-haspopup="menu">' + UI.icon('history', 15) + '<span>' + esc(S.batch.name) + '</span><em>' + esc(U.fmtDate(S.batch.asOf)) + '</em>' + UI.icon('down', 14) + '</button>';
  };

  /* ---------- shell ---------- */
  function buildShell() {
    const app = U.$('#app');
    app.innerHTML =
      '<header class="nav"><div class="nav-in">' +
      '<a class="brand" href="#/overview"><span class="logo"><svg viewBox="0 0 48 48" width="26" height="26"><rect x="2" y="2" width="44" height="44" rx="12" fill="var(--accent)"/><path d="M14 25l7 7 13-15" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span id="brandName"></span></a>' +
      '<nav class="tabs" id="tabs" aria-label="Main"><span class="tab-ind"></span>' +
      '<a href="#/overview" data-r="overview">Overview</a><a href="#/defects" data-r="defects">Defects</a><a href="#/uploads" data-r="uploads">Uploads</a><a href="#/settings" data-r="settings">Settings</a></nav>' +
      '<div class="nav-r"><button class="btn primary" id="btnUpload">' + UI.icon('upload', 16) + '<span>Upload</span></button><button class="avatar-btn" id="btnUser" aria-label="Account" aria-haspopup="menu"></button></div>' +
      '</div></header><div id="banner" class="banner-wrap"></div><main id="view" class="page" tabindex="-1"></main>';
    U.$('#brandName').textContent = D.settings.projectName;
    document.title = D.settings.projectName;
    paintUser();
    U.$('#btnUpload').hidden = !DT.auth.can('upload');
    U.$('#btnUpload').addEventListener('click', () => DT.views.upload.open());
    U.$('#btnUser').addEventListener('click', (e) => userMenu(e.currentTarget));
    window.addEventListener('resize', U.debounce(() => layoutTabs(false), 100));
  }
  function paintUser() {
    U.$('#btnUser').innerHTML = '<span class="avatar">' + esc(U.initials(S.user.name)) + '</span>';
  }
  function userMenu(anchor) {
    const items = [{ header: S.user.name + ' · ' + DT.auth.ROLES[S.user.role].label }, { header: 'Switch demo user' }];
    DT.auth.users.filter((u) => u.id !== S.user.id).forEach((u) => items.push({ label: u.name, hint: DT.auth.ROLES[u.role].label, icon: 'user', onClick: () => switchUser(u) }));
    items.push({ divider: true }, { label: 'Sign out', icon: 'logout', onClick: signOut });
    UI.menu(anchor, items);
  }
  async function switchUser(u) {
    await DT.auth.signIn(u.email, 'demo');
    S.user = u;
    paintUser();
    U.$('#btnUpload').hidden = !DT.auth.can('upload');
    App.render();
    UI.toast('Signed in as ' + u.name + ' (' + DT.auth.ROLES[u.role].label + ')');
  }
  function signOut() {
    DT.auth.signOut();
    location.reload();
  }

  /* ---------- global events ---------- */
  function globalEvents() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (a) {
        const act = a.dataset.act;
        if (act === 'upload') DT.views.upload.open();
        else if (act === 'sample') loadSample();
        else if (act === 'latest') App.selectBatch(S.batches[S.batches.length - 1].id);
      }
      const sn = e.target.closest('[data-snap]');
      if (sn) {
        const items = [{ header: 'Choose a snapshot' }].concat(
          S.batches
            .slice()
            .reverse()
            .map((b, i) => ({ label: b.name, hint: U.fmtDate(b.asOf) + (i === 0 ? ' · latest' : ''), icon: b.id === S.batchId ? 'check' : 'history', onClick: () => App.selectBatch(b.id) }))
        );
        UI.menu(sn, items, { align: 'left' });
      }
    });
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey || UI.top()) return;
      if (e.key === '/') {
        const s = U.$('#q');
        if (s) {
          e.preventDefault();
          s.focus();
        }
      } else if (e.key === 'u' && DT.auth.can('upload')) DT.views.upload.open();
    });
    window.addEventListener('hashchange', () => App.render());
  }
  async function loadSample() {
    const m = UI.modal({ title: 'Loading sample data', width: 420, body: '<div class="loading-sheet"><div class="spinner"></div><p>Preparing a fictional register with photos…</p></div>', noClose: true, noBackdropClose: true });
    await App.seedDemo();
    await App.reload(false);
    m.close();
    App.render();
  }
  App.loadSample = loadSample;

  /* ---------- start ---------- */
  App.start = async () => {
    const boot = U.$('#boot');
    try {
      await DT.store.init();
      await App.loadSettings();
    } catch (e) {
      boot.innerHTML = '<div class="boot-err"><h2>Browser storage is unavailable</h2><p>' + esc(e.message) + ' Open the page in a normal (non-private) browser window and try again.</p></div>';
      return;
    }
    const open = async (user) => {
      S.user = user;
      U.$('#login').hidden = true;
      U.$('#app').hidden = false;
      buildShell();
      if (!(await DT.store.getKV('seeded')) && !(await DT.store.getBatches()).length) {
        U.$('#view').innerHTML = '<div class="loading-sheet big"><div class="spinner"></div><p id="seedMsg">Preparing sample data…</p></div>';
        await App.seedDemo((d, t) => {
          const m = U.$('#seedMsg');
          if (m) m.textContent = 'Preparing sample data… ' + d + ' of ' + t;
        });
      }
      await App.reload(false);
      globalEvents();
      App.render();
      requestAnimationFrame(() => layoutTabs(false));
    };
    boot.classList.add('gone');
    setTimeout(() => boot.remove(), 500);
    const u = DT.auth.current();
    if (u) open(u);
    else DT.auth.renderLogin(U.$('#login'), open);
  };
  document.addEventListener('DOMContentLoaded', App.start);
})();
