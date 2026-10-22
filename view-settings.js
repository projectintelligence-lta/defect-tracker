/* Defect Tracker — Settings */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain,
    UI = DT.ui,
    S = DT.state,
    esc = U.esc;
  const V = (DT.views.settings = {});

  V.render = async (root) => {
    const admin = DT.auth.can('settings');
    const dis = admin ? '' : ' disabled';
    const set = D.settings;
    const mapRows = (obj, targets, kind) =>
      Object.keys(obj).map((k) => '<div class="map-row2"><input data-kind="' + kind + '" data-k="' + esc(k) + '" class="k" value="' + esc(k) + '"' + dis + '><span>' + UI.icon('right', 14) + '</span><select data-kind="' + kind + '" data-k="' + esc(k) + '"' + dis + '>' + targets.map((t) => '<option' + (obj[k] === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>' + (admin ? '<button class="icon-btn sm" data-rm="' + kind + '" data-k="' + esc(k) + '" aria-label="Remove">' + UI.icon('close', 14) + '</button>' : '') + '</div>').join('');
    const usage = await DT.store.usage();
    root.innerHTML =
      '<div class="page-head"><div><h1>Settings</h1><p class="lede">' + (admin ? 'Rules that turn spreadsheet wording into clean, consistent categories.' : 'Only an Admin can change these. You can see how the data is interpreted.') + '</p></div></div>' +
      '<div class="settings">' +
      sec('Project', 'Shown in the header and on reports.', '<label class="field"><span>Project name</span><input id="sName" value="' + esc(set.projectName) + '" maxlength="40"' + dis + '></label>') +
      sec('Status wording', 'What people type in the Status column, and the status it counts as.', '<div class="map2" id="mStatus">' + mapRows(set.statusMap, ['Open', 'Closed'], 'status') + '</div>' + (admin ? '<button class="btn sm" id="addStatus">' + UI.icon('plus', 14) + 'Add wording</button>' : '')) +
      sec('Classification wording', 'Standardises the Classification column. Anything else shows as Unclassified and is flagged.', '<div class="map2" id="mClass">' + mapRows(set.classMap, D.CLASSES.map((c) => c.id).filter((x) => x !== 'Unclassified'), 'class') + '</div>' + (admin ? '<button class="btn sm" id="addClass">' + UI.icon('plus', 14) + 'Add wording</button>' : '')) +
      sec('Workflow stages', 'How the stage of each defect is worked out from your columns.', '<ol class="rules"><li><b>Closed</b> when Status says Closed, a Date Closed is filled, or' + ' <label class="inl"><input type="checkbox" id="sSign"' + (set.signoffClosesDefect ? ' checked' : '') + dis + '> the Sign-Off column is filled with an acceptance</label>.</li><li><b>Rework required</b> when the Sign-Off text contains one of these words:<input id="sReject" value="' + esc(set.rejectWords) + '"' + dis + '></li><li><b>Rectified, awaiting sign-off</b> when LTA rectification text, a rectification date or an after photo exists.</li><li><b>Pending LTA action</b> for everything else.</li></ol>') +
      sec('Ageing', 'Day limits for the “how long open defects have waited” chart (comma separated).', '<label class="field"><span>Bucket limits (days)</span><input id="sAge" value="' + esc(set.ageBuckets.join(', ')) + '"' + dis + '></label>') +
      sec('Photos', 'How pictures are attached.', '<p class="muted">A picture belongs to the row it sits on. Pictures in or after the <b>Defect Rectification</b> column are shown as <b>After</b>; in or after <b>Sign-Off</b> as <b>Sign-off</b>; everything else is <b>Before</b>. Images are resized to 1600 px for storage.</p>') +
      sec('Roles in this demo', 'A production deployment connects these to real accounts.', '<table class="mini-table"><thead><tr><th>Role</th><th>Can</th></tr></thead><tbody>' + Object.keys(DT.auth.ROLES).map((k) => '<tr><td><b>' + esc(DT.auth.ROLES[k].label) + '</b></td><td>' + esc(DT.auth.ROLES[k].blurb) + ' · ' + DT.auth.ROLES[k].can.join(', ') + '</td></tr>').join('') + '</tbody></table>') +
      sec('Data and privacy', 'Where your data lives right now.', '<p class="muted">This copy keeps uploads, photos and notes <b>inside this browser only</b>. Nothing is sent to a server. ' + (usage ? 'Using ' + U.fmtBytes(usage.used) + ' of ' + U.fmtBytes(usage.quota) + '.' : '') + '</p><div class="btn-row">' + (S.batches.some((b) => b.demo) && admin ? '<button class="btn" id="rmSample">Remove sample data</button>' : '') + (admin ? '<button class="btn danger" id="wipe">Delete all data</button>' : '') + '</div>') +
      sec('Keyboard shortcuts', '', '<div class="keys"><span><kbd>/</kbd> Search defects</span><span><kbd>U</kbd> Upload</span><span><kbd>Arrow keys</kbd> Previous / next defect</span><span><kbd>Esc</kbd> Close</span><span><kbd>Shift</kbd>+click Add a sort column</span></div>') +
      '</div>';

    const save = async (rerender) => {
      await DT.app.saveSettings();
      await DT.app.reload(true);
      document.title = set.projectName;
      U.$('#brandName').textContent = set.projectName;
      if (rerender) V.render(root);
      UI.toast('Saved', 'success');
    };
    if (!admin) return;
    U.$('#sName').addEventListener('change', (e) => ((set.projectName = e.target.value.trim() || 'Defect Tracker'), save()));
    U.$('#sSign').addEventListener('change', (e) => ((set.signoffClosesDefect = e.target.checked), save()));
    U.$('#sReject').addEventListener('change', (e) => ((set.rejectWords = e.target.value), save()));
    U.$('#sAge').addEventListener('change', (e) => {
      const n = e.target.value.split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0).sort((a, b) => a - b);
      if (n.length) set.ageBuckets = Array.from(new Set(n));
      save(true);
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      const kind = t.dataset.kind;
      if (!kind) return;
      const obj = kind === 'status' ? set.statusMap : set.classMap;
      const old = t.dataset.k;
      if (t.tagName === 'SELECT') obj[old] = t.value;
      else {
        const nk = D.norm(t.value);
        if (nk && nk !== old) {
          obj[nk] = obj[old];
          delete obj[old];
        }
      }
      save(true);
    });
    root.addEventListener('click', async (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        delete (rm.dataset.rm === 'status' ? set.statusMap : set.classMap)[rm.dataset.k];
        save(true);
      }
      if (e.target.closest('#addStatus')) (set.statusMap['new wording ' + Object.keys(set.statusMap).length] = 'Open'), save(true);
      if (e.target.closest('#addClass')) (set.classMap['new wording ' + Object.keys(set.classMap).length] = 'Minor'), save(true);
      if (e.target.closest('#rmSample')) {
        if (await UI.confirm({ title: 'Remove sample data?', message: 'The three sample uploads and their photos are deleted. Your own uploads stay.', confirmLabel: 'Remove', danger: true })) {
          for (const b of S.batches.filter((x) => x.demo)) await DT.store.deleteBatch(b.id);
          await DT.app.reload(false);
          DT.app.render();
        }
      }
      if (e.target.closest('#wipe')) {
        if (await UI.confirm({ title: 'Delete all data?', message: 'Every upload, photo and note stored in this browser is permanently removed. This cannot be undone.', confirmLabel: 'Delete everything', danger: true })) {
          await DT.store.wipe();
          await DT.store.setKV('seeded', true);
          await DT.app.reload(false);
          DT.app.render();
          UI.toast('All data deleted');
        }
      }
    });
  };
  function sec(t, sub, body) {
    return '<section class="card set-card"><header class="card-h"><h2>' + esc(t) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</header>' + body + '</section>';
  }
})();
