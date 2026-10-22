/* Defect Tracker — domain model & business rules */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U;
  const D = (DT.domain = {});

  /* The 20 columns of the defect register. `match` = header patterns (lower-case, whitespace collapsed). */
  D.FIELDS = [
    { id: 'sn', label: 'S/N', req: true, match: [/^s\/?n\b/, /^serial/, /^no\.?$/, /^item no/] },
    { id: 'status', label: 'Status', match: [/^status/] },
    { id: 'officer', label: 'Inspection Officer / Comment by (Dept & Name)', match: [/inspection officer/, /comment by/] },
    { id: 'inspDates', label: 'Dates of Inspection(s)', type: 'dates', match: [/dates? of inspection/] },
    { id: 'rectDates', label: 'Dates of Rectification(s) by LTA', type: 'dates', match: [/dates? of rectification/] },
    { id: 'closedDate', label: "Defect's Date Closed", type: 'dates', match: [/date closed/, /closed date/, /date of closure/] },
    { id: 'location', label: 'Location', match: [/^location/] },
    { id: 'building', label: 'Building No', match: [/^building/] },
    { id: 'level', label: 'Level / Rm Name / Rm No.', match: [/^level/, /rm name/, /^room/] },
    { id: 'description', label: 'Defect Description', req: true, match: [/defect description/, /^description/] },
    { id: 'proposed', label: 'Proposed Rectification / Improvements', match: [/proposed rectification/, /^proposed/] },
    { id: 'classification', label: 'Defect Classification', match: [/classification/] },
    { id: 'photos', label: 'Defect Photos with dates (Before by STEL)', kind: 'photo', match: [/defect photos?/, /^photos?\b/] },
    { id: 'action', label: 'Action', match: [/^remarks$/, /^action$/] },
    { id: 'followUp', label: 'Timeline to Follow-up (by LTA)', match: [/timeline/, /follow-?\s?up/] },
    { id: 'contact', label: 'Contact Person (STEL)', match: [/contact person/, /^contact/] },
    { id: 'actionParty', label: 'Action Party (LTA)', match: [/action party/] },
    { id: 'rectification', label: 'Defect Rectification (by LTA)', match: [/^defect rectification/, /^rectification/] },
    { id: 'signoff', label: 'Sign-Off by STEL', match: [/sign-?\s?off/] },
    { id: 'remark', label: 'Remark', match: [/^remark$/] },
  ];
  D.fieldById = Object.fromEntries(D.FIELDS.map((f) => [f.id, f]));

  D.STAGES = [
    { id: 'pending', label: 'Pending LTA action', short: 'Pending', color: '#ff9f0a' },
    { id: 'awaiting', label: 'Rectified, awaiting sign-off', short: 'Awaiting sign-off', color: '#0071e3' },
    { id: 'rework', label: 'Rework required', short: 'Rework', color: '#ff3b30' },
    { id: 'closed', label: 'Closed', short: 'Closed', color: '#34c759' },
  ];
  D.stageById = Object.fromEntries(D.STAGES.map((s) => [s.id, s]));

  D.CLASSES = [
    { id: 'Safety Related', color: '#ff3b30' },
    { id: 'Major', color: '#ff9f0a' },
    { id: 'Minor', color: '#5ac8fa' },
    { id: 'Improvement', color: '#af52de' },
    { id: 'Unclassified', color: '#aeaeb2' },
  ];
  D.classById = Object.fromEntries(D.CLASSES.map((c) => [c.id, c]));

  D.DEFAULTS = {
    projectName: 'Defect Tracker',
    statusMap: { opened: 'Open', open: 'Open', 'in progress': 'Open', pending: 'Open', closed: 'Closed', close: 'Closed', completed: 'Closed' },
    classMap: {
      minor: 'Minor',
      major: 'Major',
      safety: 'Safety Related',
      'safety related': 'Safety Related',
      'safety-related': 'Safety Related',
      'major / safety related': 'Safety Related',
      improvement: 'Improvement',
      improvements: 'Improvement',
    },
    rejectWords: 'reject, not accepted, not ok, unsatisfactory, fail, redo, re-do, rework, not rectified',
    signoffClosesDefect: true,
    ageBuckets: [7, 14, 30, 60],
    columnOverrides: {},
  };
  D.settings = U.clone(D.DEFAULTS);

  D.norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  const nonEmpty = (s) => String(s == null ? '' : s).trim() !== '';

  D.normStatus = (raw) => {
    const k = D.norm(raw);
    if (!k) return '';
    return D.settings.statusMap[k] || U.titleCase(k);
  };

  /* returns {value, suspect, mapped} */
  D.normClass = (raw) => {
    const k = D.norm(raw);
    if (!k) return { value: 'Unclassified', suspect: false, blank: true };
    const m = D.settings.classMap[k];
    if (m) return { value: m, suspect: false, mapped: k !== D.norm(m) };
    if (k.length <= 40) {
      if (k.includes('safety')) return { value: 'Safety Related', suspect: false, mapped: true };
      if (k.includes('major')) return { value: 'Major', suspect: false, mapped: true };
      if (k.includes('minor')) return { value: 'Minor', suspect: false, mapped: true };
      if (k.includes('improve')) return { value: 'Improvement', suspect: false, mapped: true };
    }
    return { value: 'Unclassified', suspect: true };
  };

  D.rejectRegex = () => {
    const words = String(D.settings.rejectWords || '')
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return words.length ? new RegExp('(' + words.join('|') + ')', 'i') : null;
  };

  /* Derive working fields from a stored record. `asOf` = ISO date the snapshot is judged at. */
  D.derive = (rec, asOf, rej) => {
    rej = rej === undefined ? D.rejectRegex() : rej;
    const cls = D.normClass(rec.classificationRaw);
    const status = D.normStatus(rec.statusRaw);
    const signed = nonEmpty(rec.signoff);
    const rejected = !!(signed && rej && rej.test(rec.signoff));
    const rectified = nonEmpty(rec.rectification) || (rec.rectDates && rec.rectDates.length > 0) || rec.photos.some((p) => p.kind === 'after');
    let stage;
    if (status === 'Closed' || rec.closedDate) stage = 'closed';
    else if (rejected) stage = 'rework';
    else if (signed && D.settings.signoffClosesDefect) stage = 'closed';
    else if (rectified) stage = 'awaiting';
    else stage = 'pending';
    const closed = stage === 'closed';
    const firstInsp = rec.inspDates && rec.inspDates.length ? rec.inspDates[0] : null;
    const lastInsp = rec.inspDates && rec.inspDates.length ? rec.inspDates[rec.inspDates.length - 1] : null;
    const lastRect = rec.rectDates && rec.rectDates.length ? rec.rectDates[rec.rectDates.length - 1] : null;
    const closedOn = closed ? rec.closedDate || lastRect || null : null;
    let ageDays = null;
    if (firstInsp) {
      const end = closed ? closedOn || asOf : asOf;
      ageDays = Math.max(0, U.daysBetween(firstInsp, end));
    }
    const overdue = !closed && !!rec.dueDate && rec.dueDate < asOf;
    const daysOverdue = overdue ? U.daysBetween(rec.dueDate, asOf) : 0;
    const out = Object.assign({}, rec, {
      status: status || (closed ? 'Closed' : 'Open'),
      classification: cls.value,
      classSuspect: cls.suspect,
      stage,
      closed,
      open: !closed,
      firstInsp,
      lastInsp,
      lastRect,
      closedOn,
      ageDays,
      overdue,
      daysOverdue,
      nBefore: rec.photos.filter((p) => p.kind === 'before').length,
      nAfter: rec.photos.filter((p) => p.kind !== 'before').length,
    });
    out.actionPartyLabel = rec.actionParty || 'Unassigned';
    return out;
  };
  D.deriveAll = (recs, asOf) => {
    const rej = D.rejectRegex();
    return recs.map((r) => D.derive(r, asOf, rej));
  };

  /* Aggregate counts for KPIs / history */
  D.summarize = (list) => {
    const s = { total: list.length, pending: 0, awaiting: 0, rework: 0, closed: 0, open: 0, safetyOpen: 0, overdue: 0, byClass: {} };
    list.forEach((r) => {
      s[r.stage]++;
      if (r.open) s.open++;
      if (r.open && r.classification === 'Safety Related') s.safetyOpen++;
      if (r.overdue) s.overdue++;
      s.byClass[r.classification] = (s.byClass[r.classification] || 0) + 1;
    });
    return s;
  };

  D.ageBucketLabels = () => {
    const b = D.settings.ageBuckets;
    const out = [];
    let prev = -1;
    b.forEach((n) => {
      out.push({ label: (prev + 1) + '–' + n + ' d', min: prev + 1, max: n });
      prev = n;
    });
    out.push({ label: b[b.length - 1] + '+ d', min: b[b.length - 1] + 1, max: Infinity });
    return out;
  };

  D.countBy = (list, fn) => {
    const m = new Map();
    list.forEach((r) => {
      const k = fn(r);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  };

  /* fingerprint for matching a defect across uploads */
  D.fingerprint = (r) => [r.location, r.building, r.level, r.description].map((x) => D.norm(x)).join(' | ');

  D.photoLabel = (kind) => ({ before: 'Before', after: 'After (rectification)', signoff: 'Sign-off' }[kind] || kind);
})();
