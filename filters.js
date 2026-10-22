/* Defect Tracker — filtering model */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain;
  const F = (DT.filters = {});

  F.empty = () => ({ q: '', stage: [], cls: [], building: [], location: [], party: [], officer: [], contact: [], remark: [], photo: '', overdue: false, from: '', to: '' });

  F.FACETS = [
    { id: 'stage', label: 'Stage', get: (r) => r.stage, name: (v) => D.stageById[v].label, order: D.STAGES.map((s) => s.id) },
    { id: 'cls', label: 'Classification', get: (r) => r.classification, name: (v) => v, order: D.CLASSES.map((c) => c.id) },
    { id: 'building', label: 'Building', get: (r) => r.building || '—', name: (v) => v },
    { id: 'location', label: 'Location', get: (r) => r.location || '—', name: (v) => v },
    { id: 'party', label: 'Action party', get: (r) => r.actionPartyLabel, name: (v) => v },
    { id: 'officer', label: 'Inspection officer', get: (r) => r.officer || '—', name: (v) => v },
    { id: 'contact', label: 'Contact person', get: (r) => r.contact || '—', name: (v) => v },
    { id: 'remark', label: 'Remark', get: (r) => r.remark || '—', name: (v) => v },
  ];

  const hay = (r) =>
    (r._hay ||
      (r._hay = [r.sn, r.description, r.location, r.building, r.level, r.officer, r.action, r.proposed, r.contact, r.actionParty, r.rectification, r.signoff, r.remark, r.followUp, r.classificationRaw, r.status]
        .join(' \n ')
        .toLowerCase()));

  F.apply = (list, f) => {
    const q = f.q.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    return list.filter((r) => {
      for (const fc of F.FACETS) {
        const sel = f[fc.id];
        if (sel.length && !sel.includes(fc.get(r))) return false;
      }
      if (f.overdue && !r.overdue) return false;
      if (f.photo) {
        if (f.photo === 'none' && r.photos.length) return false;
        if (f.photo === 'before' && !r.nBefore) return false;
        if (f.photo === 'after' && !r.nAfter) return false;
        if (f.photo === 'noafter' && r.nAfter) return false;
      }
      if (f.from || f.to) {
        const ds = r.inspDates || [];
        if (!ds.some((d) => (!f.from || d >= f.from) && (!f.to || d <= f.to))) return false;
      }
      if (terms.length) {
        const h = hay(r);
        for (const t of terms) if (!h.includes(t)) return false;
      }
      return true;
    });
  };

  F.count = (f) => F.FACETS.reduce((n, fc) => n + f[fc.id].length, 0) + (f.overdue ? 1 : 0) + (f.photo ? 1 : 0) + (f.from || f.to ? 1 : 0) + (f.q.trim() ? 1 : 0);

  const PHOTO = { none: 'No photos', before: 'Has before photos', after: 'Has after photos', noafter: 'No after photos yet' };
  F.chips = (f) => {
    const out = [];
    if (f.q.trim()) out.push({ k: 'q', label: 'Search: ' + f.q.trim() });
    F.FACETS.forEach((fc) => f[fc.id].forEach((v) => out.push({ k: fc.id, v, label: fc.label + ': ' + fc.name(v) })));
    if (f.overdue) out.push({ k: 'overdue', label: 'Overdue' });
    if (f.photo) out.push({ k: 'photo', label: PHOTO[f.photo] });
    if (f.from || f.to) out.push({ k: 'date', label: 'Inspected ' + (f.from ? U.fmtDate(f.from) : '…') + ' – ' + (f.to ? U.fmtDate(f.to) : '…') });
    return out;
  };
  F.describe = (f) => F.chips(f).map((c) => c.label).join('; ');
  F.PHOTO_OPTIONS = PHOTO;

  /* option lists with counts, from the full snapshot */
  F.options = (list, fc) => {
    const m = D.countBy(list, fc.get);
    let keys = Array.from(m.keys());
    if (fc.order) keys.sort((a, b) => fc.order.indexOf(a) - fc.order.indexOf(b));
    else keys.sort((a, b) => U.natCompare(a, b));
    return keys.map((k) => ({ v: k, label: fc.name(k), n: m.get(k) }));
  };
})();
