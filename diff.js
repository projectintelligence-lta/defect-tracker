/* Defect Tracker — compare two uploads */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain;
  const F = (DT.diff = {});

  /* Fields compared, with a display function. */
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  F.COMPARE = [
    { id: 'status', label: 'Status', get: (r) => r.status },
    { id: 'stage', label: 'Stage', get: (r) => (D.stageById[r.stage] || {}).label },
    { id: 'classification', label: 'Classification', get: (r) => r.classification },
    { id: 'officer', label: 'Inspection officer', get: (r) => r.officer },
    { id: 'inspDates', label: 'Inspection dates', get: (r) => U.fmtDateList(r.inspDates) || r.inspRaw },
    { id: 'rectDates', label: 'Rectification dates', get: (r) => U.fmtDateList(r.rectDates) || r.rectRaw },
    { id: 'closedDate', label: 'Date closed', get: (r) => U.fmtDate(r.closedDate) || r.closedRaw },
    { id: 'location', label: 'Location', get: (r) => r.location },
    { id: 'building', label: 'Building', get: (r) => r.building },
    { id: 'level', label: 'Level / Room', get: (r) => r.level },
    { id: 'description', label: 'Description', get: (r) => r.description },
    { id: 'proposed', label: 'Proposed rectification', get: (r) => r.proposed },
    { id: 'action', label: 'Action', get: (r) => r.action },
    { id: 'followUp', label: 'Follow-up timeline', get: (r) => r.followUp },
    { id: 'contact', label: 'Contact person', get: (r) => r.contact },
    { id: 'actionParty', label: 'Action party', get: (r) => r.actionParty },
    { id: 'rectification', label: 'Rectification by LTA', get: (r) => r.rectification },
    { id: 'signoff', label: 'Sign-off', get: (r) => r.signoff },
    { id: 'remark', label: 'Remark', get: (r) => r.remark },
    {
      id: 'photos',
      label: 'Photos',
      get: (r) => {
        const b = r.photos.filter((p) => p.kind === 'before').length;
        const a = r.photos.length - b;
        return b + ' before, ' + a + ' after';
      },
      key: (r) => r.photos.map((p) => p.kind + ':' + p.hash).sort().join(','),
    },
  ];

  F.changesBetween = (o, n) => {
    const out = [];
    F.COMPARE.forEach((c) => {
      const a = c.key ? c.key(o) : norm(c.get(o));
      const b = c.key ? c.key(n) : norm(c.get(n));
      if (a !== b) out.push({ field: c.id, label: c.label, from: c.get(o) || '', to: c.get(n) || '' });
    });
    return out;
  };

  /* old/new are DERIVED record arrays. Returns matching with confidence. */
  F.match = (oldRecs, newRecs) => {
    const oldBySn = new Map(oldRecs.map((r) => [r.sn, r]));
    const used = new Set();
    const pairs = [];
    const tokOld = new Map(oldRecs.map((r) => [r, U.tokens(r.fp)]));
    const tokNew = new Map(newRecs.map((r) => [r, U.tokens(r.fp)]));
    const pendingNew = [];
    newRecs.forEach((n) => {
      const o = oldBySn.get(n.sn);
      if (o && !used.has(o)) {
        const sim = U.jaccard(tokOld.get(o), tokNew.get(n));
        used.add(o);
        pairs.push({ o, n, low: sim < 0.45, sim, reason: sim < 0.45 ? 'Same S/N but the location and description look different' : '' });
      } else pendingNew.push(n);
    });
    const left = oldRecs.filter((o) => !used.has(o));
    const stillNew = [];
    pendingNew.forEach((n) => {
      let best = null,
        bs = 0;
      left.forEach((o) => {
        if (used.has(o)) return;
        const s = U.jaccard(tokOld.get(o), tokNew.get(n));
        if (s > bs) {
          bs = s;
          best = o;
        }
      });
      if (best && bs >= 0.8) {
        used.add(best);
        pairs.push({ o: best, n, low: true, sim: bs, reason: 'S/N changed from ' + best.sn + ' to ' + n.sn + ', but the location and description match' });
      } else stillNew.push(n);
    });
    const removed = oldRecs.filter((o) => !used.has(o));
    return { pairs, added: stillNew, removed };
  };

  /* overrides: Map newSn → 'different' to break a low-confidence pairing */
  F.compute = (oldRecs, newRecs, overrides) => {
    overrides = overrides || new Map();
    const m = F.match(oldRecs, newRecs);
    const pairs = [],
      added = m.added.slice(),
      removed = m.removed.slice();
    m.pairs.forEach((p) => {
      if (p.low && overrides.get(p.n.sn) === 'different') {
        added.push(p.n);
        removed.push(p.o);
      } else pairs.push(p);
    });
    const changed = [];
    let unchanged = 0;
    const closedNow = [];
    pairs.forEach((p) => {
      p.changes = F.changesBetween(p.o, p.n);
      if (p.changes.length) changed.push(p);
      else unchanged++;
      if (!p.o.closed && p.n.closed) closedNow.push(p);
    });
    const reopened = pairs.filter((p) => p.o.closed && !p.n.closed);
    return { pairs, added, removed, changed, unchanged, closedNow, reopened, allLow: m.pairs.filter((p) => p.low) };
  };
})();
