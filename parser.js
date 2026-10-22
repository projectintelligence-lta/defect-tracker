/* Defect Tracker — Excel reader.
 * Everything happens in the browser. One spreadsheet row becomes one record object;
 * photos are matched to a row by the cell the picture is anchored to, never by order. */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain;
  const P = (DT.parser = {});
  const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const MAXFULL = 1600,
    MAXTHUMB = 380;

  /* ===================== dates ===================== */
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function validISO(y, m, d) {
    if (y < 100) y += 2000;
    const t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d || y < 1990 || y > 2100) return null;
    return y + '-' + U.pad(m) + '-' + U.pad(d);
  }
  /* Returns {list:[ISO...] ascending, raw, bad}. Day/month/year order (e.g. 3/7/2025 = 3 July 2025). */
  P.parseDates = function (v) {
    if (v == null || v === '') return { list: [], raw: '', bad: false };
    if (v instanceof Date) {
      const iso = U.isoFromDate(v);
      return { list: [iso], raw: iso, bad: false };
    }
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) {
        const d = new Date(Math.round((v - 25569) * 864e5));
        const iso = d.getUTCFullYear() + '-' + U.pad(d.getUTCMonth() + 1) + '-' + U.pad(d.getUTCDate());
        return { list: [iso], raw: iso, bad: false };
      }
      return { list: [], raw: String(v), bad: true };
    }
    const s = String(v).replace(/\r\n?/g, '\n').trim();
    const list = [];
    const re = /(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4}|\d{2})\b|(\d{1,2})(?:st|nd|rd|th)?[\s\-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?[\s\-]*(\d{4}|\d{2})\b/gi;
    let m;
    while ((m = re.exec(s))) {
      let iso = null;
      if (m[1]) iso = validISO(+m[3], +m[2], +m[1]);
      else iso = validISO(+m[6], MONTHS[m[5].toLowerCase()], +m[4]);
      if (iso && !list.includes(iso)) list.push(iso);
    }
    list.sort();
    return { list, raw: s, bad: list.length === 0 };
  };

  function cellText(v) {
    if (v == null) return '';
    if (v instanceof Date) return U.isoFromDate(v);
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
    return String(v).replace(/\r\n?/g, '\n').trim();
  }
  P.cellText = cellText;

  /* ===================== columns ===================== */
  P.detectColumns = function (matrix, overrides) {
    let best = { row: -1, score: 0, map: {} };
    const limit = Math.min(matrix.length, 25);
    for (let r = 0; r < limit; r++) {
      const row = matrix[r] || [];
      const map = {};
      let score = 0;
      row.forEach((v, c) => {
        const h = D.norm(cellText(v));
        if (!h) return;
        for (const f of D.FIELDS) {
          if (map[f.id] != null) continue;
          if (f.match.some((re) => re.test(h))) {
            map[f.id] = c;
            score++;
            break;
          }
        }
      });
      if (score > best.score) best = { row: r, score, map };
    }
    const detected = Object.assign({}, best.map);
    const map = Object.assign({}, best.map);
    Object.keys(overrides || {}).forEach((k) => {
      if (overrides[k] === null || overrides[k] === '' || overrides[k] === undefined) delete map[k];
      else map[k] = +overrides[k];
    });
    const headerRow = best.row;
    const headers = headerRow >= 0 ? (matrix[headerRow] || []).map((v) => cellText(v).replace(/\s+/g, ' ')) : [];
    return { headerRow, map, detected, headers, score: best.score };
  };

  /* ===================== records ===================== */
  P.buildRecords = function (matrix, headerRow, map, merges) {
    const warnings = [];
    const recs = [];
    const g = (row, f) => (map[f] == null ? undefined : row[map[f]]);
    const dataFields = Object.keys(map).filter((f) => f !== 'photos');
    let rowsWithData = 0;
    const unreadRows = [];

    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const any = row.some((v) => cellText(v) !== '');
      if (any) rowsWithData++;
      const mapped = dataFields.some((f) => cellText(g(row, f)) !== '');
      if (!mapped) {
        if (any) unreadRows.push(r + 1);
        continue;
      }
      const T = (f) => cellText(g(row, f));
      const dates = (f) => {
        const pd = P.parseDates(g(row, f));
        return pd;
      };
      const insp = dates('inspDates'),
        rect = dates('rectDates'),
        clo = dates('closedDate');
      const fu = T('followUp');
      const fuDates = fu ? P.parseDates(fu).list : [];
      const rec = {
        rowNum: r + 1,
        snRaw: T('sn'),
        statusRaw: T('status'),
        officer: T('officer'),
        inspDates: insp.list,
        inspRaw: insp.raw,
        rectDates: rect.list,
        rectRaw: rect.raw,
        closedDate: clo.list.length ? clo.list[clo.list.length - 1] : null,
        closedRaw: clo.raw,
        location: T('location'),
        building: T('building'),
        level: T('level'),
        description: T('description'),
        proposed: T('proposed'),
        classificationRaw: T('classification'),
        action: T('action'),
        followUp: fu,
        dueDate: fuDates.length ? fuDates[fuDates.length - 1] : null,
        contact: T('contact'),
        actionParty: T('actionParty'),
        rectification: T('rectification'),
        signoff: T('signoff'),
        remark: T('remark'),
        photos: [],
        photoNotes: [],
      };
      rec.fp = D.fingerprint(rec);
      rec._bad = { insp: insp.bad, rect: rect.bad, closed: clo.bad };
      recs.push(rec);
    }

    /* S/N: duplicates become 56.1, 56.2 … ; blanks get R<row> */
    const counts = new Map();
    recs.forEach((r) => r.snRaw && counts.set(r.snRaw, (counts.get(r.snRaw) || 0) + 1));
    const seen = new Map();
    const used = new Set();
    recs.forEach((r) => {
      if (!r.snRaw) {
        r.sn = 'R' + r.rowNum;
        r.snIssue = 'blank';
        warnings.push({ level: 'warn', code: 'blank-sn', row: r.rowNum, text: 'Row ' + r.rowNum + ' has no S/N. It was kept and labelled ' + r.sn + '.' });
      } else if (counts.get(r.snRaw) > 1) {
        const n = (seen.get(r.snRaw) || 0) + 1;
        seen.set(r.snRaw, n);
        r.sn = r.snRaw + '.' + n;
        r.snIssue = 'duplicate';
      } else r.sn = r.snRaw;
      if (used.has(r.sn)) r.sn = r.sn + '-r' + r.rowNum;
      used.add(r.sn);
    });
    counts.forEach((n, sn) => {
      if (n > 1) {
        const rows = recs.filter((r) => r.snRaw === sn);
        warnings.push({
          level: 'info',
          code: 'dup-sn',
          sn,
          text: 'S/N ' + sn + ' appears ' + n + ' times. Renumbered ' + rows.map((r) => r.sn).join(', ') + ' (rows ' + rows.map((r) => r.rowNum).join(', ') + ').',
        });
      }
    });

    /* quality checks (per record) */
    const sup = { cls: [], clsMapped: 0, dates: [], statusUnknown: new Set(), mismatch: [], closedNoDate: 0 };
    recs.forEach((r) => {
      const c = D.normClass(r.classificationRaw);
      if (c.suspect) sup.cls.push(r);
      else if (c.mapped) sup.clsMapped++;
      ['insp', 'rect', 'closed'].forEach((k) => {
        const raw = { insp: r.inspRaw, rect: r.rectRaw, closed: r.closedRaw }[k];
        if (r._bad[k] && raw) sup.dates.push({ r, k, raw });
      });
      const st = D.norm(r.statusRaw);
      if (st && !D.settings.statusMap[st]) sup.statusUnknown.add(r.statusRaw);
      if (D.normStatus(r.statusRaw) === 'Open' && r.closedDate) sup.mismatch.push(r);
    });
    sup.cls.forEach((r) =>
      warnings.push({
        level: 'warn',
        code: 'class-text',
        sn: r.sn,
        row: r.rowNum,
        text: 'S/N ' + r.sn + ': the Classification cell is not Minor / Major / Safety Related / Improvement, so it is shown as Unclassified. The original text is kept on the record.',
      })
    );
    if (sup.clsMapped)
      warnings.push({ level: 'info', code: 'class-map', text: sup.clsMapped + ' classification value(s) were standardised (for example "Safety" → "Safety Related").' });
    sup.dates.forEach((d) =>
      warnings.push({
        level: 'warn',
        code: 'bad-date',
        sn: d.r.sn,
        row: d.r.rowNum,
        text: 'S/N ' + d.r.sn + ': could not read a date from "' + U.truncate(d.raw.replace(/\s+/g, ' '), 40) + '" (' + { insp: 'Inspection', rect: 'Rectification', closed: 'Date Closed' }[d.k] + '). The text is kept as written.',
      })
    );
    if (sup.statusUnknown.size)
      warnings.push({ level: 'info', code: 'status-unknown', text: 'Status value(s) not in your status list: ' + Array.from(sup.statusUnknown).join(', ') + '. Add them under Settings → Data cleaning if needed.' });
    sup.mismatch.forEach((r) =>
      warnings.push({ level: 'warn', code: 'status-mismatch', sn: r.sn, row: r.rowNum, text: 'S/N ' + r.sn + ': Status says Open but a Date Closed is filled in. It is treated as Closed.' })
    );
    if (unreadRows.length)
      warnings.push({
        level: 'warn',
        code: 'unread-rows',
        text: unreadRows.length + ' row(s) have content only in columns that are not mapped (rows ' + unreadRows.slice(0, 12).join(', ') + (unreadRows.length > 12 ? '…' : '') + ').',
      });
    /* merged cells inside the data area: values are NOT copied between rows */
    const mergedRows = [];
    (merges || []).forEach((m) => {
      if (m.e.r > headerRow && (m.e.r > m.s.r || m.e.c > m.s.c)) mergedRows.push(m);
    });
    if (mergedRows.length)
      warnings.push({
        level: 'warn',
        code: 'merged',
        text: mergedRows.length + ' merged cell range(s) found in the data area. Only the top-left cell of each range is read, and nothing is copied into neighbouring rows.',
      });

    return { records: recs, warnings, rowsWithData };
  };

  /* ===================== photos ===================== */
  const parseXml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const byNS = (el, name) => Array.from(el.getElementsByTagNameNS('*', name));
  function resolvePath(base, target) {
    if (target[0] === '/') return target.slice(1);
    const dir = base.split('/').slice(0, -1);
    target.split('/').forEach((p) => {
      if (p === '..') dir.pop();
      else if (p && p !== '.') dir.push(p);
    });
    return dir.join('/');
  }
  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' };

  async function sheetPaths(zip, sheetName) {
    const wb = parseXml(await zip.file('xl/workbook.xml').async('string'));
    const sh = byNS(wb, 'sheet').find((s) => s.getAttribute('name') === sheetName);
    if (!sh) return null;
    const rid = sh.getAttributeNS(NS_R, 'id') || sh.getAttribute('r:id');
    const rels = parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
    const rel = byNS(rels, 'Relationship').find((r) => r.getAttribute('Id') === rid);
    if (!rel) return null;
    return resolvePath('xl/workbook.xml', rel.getAttribute('Target'));
  }

  /* Returns {pics:[…], texts:[…], media:Map, warnings:[…]} */
  P.extractPictures = async function (zip, sheetName, onProgress) {
    const out = { pics: [], texts: [], media: new Map(), warnings: [] };
    if (!zip) return out;
    const sheetPath = await sheetPaths(zip, sheetName);
    if (!sheetPath || !zip.file(sheetPath)) return out;
    const sheetXml = parseXml(await zip.file(sheetPath).async('string'));
    const dr = byNS(sheetXml, 'drawing')[0];
    if (!dr) return out;
    const drid = dr.getAttributeNS(NS_R, 'id') || dr.getAttribute('r:id');
    const sheetRelPath = sheetPath.replace(/([^/]+)$/, '_rels/$1.rels');
    if (!zip.file(sheetRelPath)) return out;
    const srels = parseXml(await zip.file(sheetRelPath).async('string'));
    const drel = byNS(srels, 'Relationship').find((r) => r.getAttribute('Id') === drid);
    if (!drel) return out;
    const drawingPath = resolvePath(sheetPath, drel.getAttribute('Target'));
    if (!zip.file(drawingPath)) return out;
    const drawing = parseXml(await zip.file(drawingPath).async('string'));
    const drelPath = drawingPath.replace(/([^/]+)$/, '_rels/$1.rels');
    const imgTarget = {};
    if (zip.file(drelPath)) {
      byNS(parseXml(await zip.file(drelPath).async('string')), 'Relationship').forEach((r) => (imgTarget[r.getAttribute('Id')] = resolvePath(drawingPath, r.getAttribute('Target'))));
    }

    /* row heights (points → EMU) and column widths, to place pictures that straddle rows */
    const fmt = byNS(sheetXml, 'sheetFormatPr')[0];
    const defRowH = (fmt && parseFloat(fmt.getAttribute('defaultRowHeight'))) || 15;
    const rowH = {};
    byNS(sheetXml, 'row').forEach((r) => {
      const ht = parseFloat(r.getAttribute('ht'));
      if (ht) rowH[+r.getAttribute('r') - 1] = ht * 12700;
    });
    const H = (r) => (rowH[r] != null ? rowH[r] : defRowH * 12700);
    const defColW = (fmt && parseFloat(fmt.getAttribute('defaultColWidth'))) || 8.43;
    const colW = {};
    byNS(sheetXml, 'col').forEach((c) => {
      const w = parseFloat(c.getAttribute('width'));
      for (let i = +c.getAttribute('min'); i <= +c.getAttribute('max') && i < 200; i++) colW[i - 1] = w;
    });
    const W = (c) => Math.round(((colW[c] != null ? colW[c] : defColW) * 7 + 5) * 9525);

    const num = (el, n) => {
      const e = el && byNS(el, n)[0];
      return e ? +e.textContent || 0 : 0;
    };
    const anchors = Array.from(drawing.documentElement.children);
    const items = [];
    anchors.forEach((a) => {
      const ln = a.localName;
      if (!/Anchor$/.test(ln)) return;
      const from = a.getElementsByTagNameNS('*', 'from')[0];
      const to = a.getElementsByTagNameNS('*', 'to')[0];
      if (!from) return;
      const f = { col: num(from, 'col'), colOff: num(from, 'colOff'), row: num(from, 'row'), rowOff: num(from, 'rowOff') };
      const t = to ? { col: num(to, 'col'), colOff: num(to, 'colOff'), row: num(to, 'row'), rowOff: num(to, 'rowOff') } : null;
      /* choose the row / column holding most of the picture; remember if it overlaps a neighbour */
      const pick = (a0, o0, a1, o1, size) => {
        if (!t || a1 <= a0) return { idx: a0, split: false };
        let best = a0, bestO = -1, total = 0;
        for (let i = a0; i <= Math.min(a1, a0 + 60); i++) {
          const s0 = i === a0 ? o0 : 0;
          const e0 = i === a1 ? o1 : size(i);
          const ov = Math.max(0, e0 - s0);
          total += ov;
          if (ov > bestO) {
            bestO = ov;
            best = i;
          }
        }
        return { idx: best, split: total > 0 && bestO / total < 0.85 };
      };
      const rp = pick(f.row, f.rowOff, t ? t.row : f.row, t ? t.rowOff : 0, H);
      const cp = pick(f.col, f.colOff, t ? t.col : f.col, t ? t.colOff : 0, W);
      const row = rp.idx,
        col = cp.idx;
      const spans = rp.split || cp.split;
      const pics = byNS(a, 'pic');
      pics.forEach((pic) => {
        const blip = byNS(pic, 'blip')[0];
        if (!blip) return;
        const rid = blip.getAttributeNS(NS_R, 'embed') || blip.getAttribute('r:embed');
        const path = imgTarget[rid];
        if (!path) return;
        const xfrm = byNS(pic, 'xfrm')[0];
        const rot = xfrm ? ((((+xfrm.getAttribute('rot') || 0) / 60000) % 360) + 360) % 360 : 0;
        const src = byNS(pic, 'srcRect')[0];
        const crop = src ? { l: +src.getAttribute('l') || 0, t: +src.getAttribute('t') || 0, r: +src.getAttribute('r') || 0, b: +src.getAttribute('b') || 0 } : null;
        items.push({
          path,
          row,
          col,
          fromRow: f.row,
          rowOff: f.rowOff,
          colOff: f.colOff,
          rot: Math.round(rot / 90) * 90 % 360,
          flipH: xfrm && xfrm.getAttribute('flipH') === '1',
          flipV: xfrm && xfrm.getAttribute('flipV') === '1',
          crop,
          spans,
        });
      });
      if (!pics.length) {
        const txt = byNS(a, 'sp')
          .map((sp) => byNS(sp, 't').map((x) => x.textContent).join(' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join(' ');
        if (txt) out.texts.push({ row, col, text: txt });
      }
    });

    /* decode + resize each picture */
    const total = items.length;
    const seenHash = new Map();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (onProgress) onProgress(i, total);
      if (i % 2 === 0) await U.yield();
      const ext = it.path.split('.').pop().toLowerCase();
      const mime = MIME[ext];
      const f = zip.file(it.path);
      if (!f || !mime) {
        out.warnings.push({ level: 'warn', code: 'img-format', text: 'A picture in row ' + (it.row + 1) + ' is in a format browsers cannot show (.' + ext + '). It was skipped.' });
        continue;
      }
      const bytes = await f.async('uint8array');
      const tag = [it.rot, it.flipH ? 1 : 0, it.flipV ? 1 : 0, it.crop ? [it.crop.l, it.crop.t, it.crop.r, it.crop.b].join(',') : ''].join('|');
      const hash = U.hashBytes(bytes, tag);
      if (!out.media.has(hash) && !seenHash.has(hash)) {
        try {
          const m = await processImage(bytes, mime, it);
          out.media.set(hash, m);
        } catch (e) {
          out.warnings.push({ level: 'warn', code: 'img-decode', text: 'A picture in row ' + (it.row + 1) + ' could not be decoded and was skipped.' });
          continue;
        }
      }
      seenHash.set(hash, 1);
      out.pics.push({ hash, row: it.row, col: it.col, fromRow: it.fromRow, rowOff: it.rowOff, colOff: it.colOff, spans: it.spans });
    }
    if (onProgress) onProgress(total, total);
    return out;
  };

  async function decode(bytes, mime) {
    const blob = new Blob([bytes], { type: mime });
    if (window.createImageBitmap) {
      try {
        return await createImageBitmap(blob);
      } catch (e) {
        /* fall through */
      }
    }
    return await new Promise((res, rej) => {
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => (URL.revokeObjectURL(url), res(im));
      im.onerror = () => (URL.revokeObjectURL(url), rej(new Error('decode')));
      im.src = url;
    });
  }
  const toBlob = (cv, q) => new Promise((res) => cv.toBlob(res, 'image/jpeg', q));

  /* Apply the crop/rotation/flip that Excel applied, then make a full-size and a thumbnail copy */
  async function processImage(bytes, mime, it) {
    const img = await decode(bytes, mime);
    const iw = img.width || img.naturalWidth,
      ih = img.height || img.naturalHeight;
    const c = it.crop || { l: 0, t: 0, r: 0, b: 0 };
    const sx = (c.l / 100000) * iw,
      sy = (c.t / 100000) * ih;
    const sw = Math.max(1, iw - sx - (c.r / 100000) * iw),
      sh = Math.max(1, ih - sy - (c.b / 100000) * ih);
    const scale = Math.min(1, MAXFULL / Math.max(sw, sh));
    const dw = Math.max(1, Math.round(sw * scale)),
      dh = Math.max(1, Math.round(sh * scale));
    const swap = it.rot === 90 || it.rot === 270;
    const cv = document.createElement('canvas');
    cv.width = swap ? dh : dw;
    cv.height = swap ? dw : dh;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.translate(cv.width / 2, cv.height / 2);
    ctx.rotate((it.rot * Math.PI) / 180);
    ctx.scale(it.flipH ? -1 : 1, it.flipV ? -1 : 1);
    ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    if (img.close) img.close();
    const full = await toBlob(cv, 0.82);
    const ts = Math.min(1, MAXTHUMB / Math.max(cv.width, cv.height));
    const tc = document.createElement('canvas');
    tc.width = Math.max(1, Math.round(cv.width * ts));
    tc.height = Math.max(1, Math.round(cv.height * ts));
    tc.getContext('2d').drawImage(cv, 0, 0, tc.width, tc.height);
    const thumb = await toBlob(tc, 0.78);
    return { full, thumb, w: cv.width, h: cv.height };
  }
  P.processImage = processImage;

  /* Attach pictures to the records whose row they belong to. */
  P.attachPictures = function (records, pics, texts, map) {
    const warnings = [];
    const byRow = new Map(records.map((r) => [r.rowNum - 1, r]));
    records.forEach((r) => ((r.photos = []), (r.photoNotes = [])));
    const orphans = [];
    const straddle = [];
    const sorted = pics.slice().sort((a, b) => a.row - b.row || Math.round(a.rowOff / 600000) - Math.round(b.rowOff / 600000) || a.colOff - b.colOff);
    sorted.forEach((p) => {
      const rec = byRow.get(p.row);
      if (!rec) {
        orphans.push(p);
        return;
      }
      let kind = 'before';
      if (map.signoff != null && p.col >= map.signoff) kind = 'signoff';
      else if (map.rectification != null && p.col >= map.rectification) kind = 'after';
      rec.photos.push({ hash: p.hash, kind });
      if (p.spans) straddle.push(rec.sn);
    });
    (texts || []).forEach((t) => {
      const rec = byRow.get(t.row);
      if (rec) rec.photoNotes.push(t.text);
    });
    if (orphans.length)
      warnings.push({
        level: 'warn',
        code: 'orphan-photos',
        text: orphans.length + ' photo(s) sit on rows that have no defect data (spreadsheet rows ' + Array.from(new Set(orphans.map((o) => o.row + 1))).slice(0, 10).join(', ') + '). They were not attached to any defect.',
      });
    if (straddle.length)
      warnings.push({
        level: 'info',
        code: 'straddle',
        text: 'Photos that overlap two rows were assigned to the row that holds most of the picture: S/N ' + Array.from(new Set(straddle)).slice(0, 12).join(', ') + '. Worth a quick check.',
      });
    const attached = sorted.length - orphans.length;
    const used = new Set();
    records.forEach((r) => r.photos.forEach((p) => used.add(p.hash)));
    return { warnings, attached, orphans: orphans.length, usedHashes: used };
  };

  /* ===================== session (one uploaded file) ===================== */
  P.open = async function (file, onProgress) {
    const buf = await file.arrayBuffer();
    const isCsv = /\.csv$/i.test(file.name);
    let wb;
    try {
      wb = XLSX.read(buf, { type: 'array' });
    } catch (e) {
      throw new Error('This file could not be read as an Excel or CSV file.');
    }
    if (!wb.SheetNames.length) throw new Error('The workbook has no sheets.');
    let zip = null;
    let photoNote = null;
    if (!isCsv) {
      try {
        zip = await JSZip.loadAsync(buf);
      } catch (e) {
        photoNote = 'Photos can only be read from .xlsx files. This file was read without photos.';
      }
    } else photoNote = 'CSV files cannot contain photos.';
    const s = { file, name: file.name, size: file.size, wb, zip, sheetNames: wb.SheetNames.slice(), cache: {}, photoNote };

    s.analyze = async function (sheetName, overrides, progress) {
      const ws = wb.Sheets[sheetName];
      const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: ref.e });
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
      const det = P.detectColumns(matrix, overrides);
      const res = { sheetName, headerRow: det.headerRow, headers: det.headers, map: det.map, detected: det.detected, warnings: [], records: [], media: new Map() };
      if (det.headerRow < 0 || det.score < 3) {
        res.fatal = 'Could not find the header row. Check that the first rows contain the defect register column titles.';
        return res;
      }
      const missing = D.FIELDS.filter((f) => f.req && det.map[f.id] == null);
      res.missingRequired = missing.map((f) => f.id);
      if (missing.length) {
        res.fatal = 'Required column(s) not found: ' + missing.map((f) => f.label).join(', ') + '. Match them in the Columns tab.';
        return res;
      }
      const built = P.buildRecords(matrix, det.headerRow, det.map, ws['!merges']);
      res.records = built.records;
      res.warnings = built.warnings;
      res.rowsWithData = built.rowsWithData;
      res.columnsUnmapped = det.headers.map((h, i) => ({ h, i })).filter((x) => x.h && !Object.values(det.map).includes(x.i));

      /* photos */
      res.photosFound = 0;
      res.photosAttached = 0;
      if (s.photoNote) res.warnings.push({ level: 'info', code: 'no-photos', text: s.photoNote });
      else {
        if (!s.cache[sheetName]) s.cache[sheetName] = await P.extractPictures(zip, sheetName, progress);
        const ex = s.cache[sheetName];
        res.photosFound = ex.pics.length;
        const att = P.attachPictures(res.records, ex.pics, ex.texts, det.map);
        res.photosAttached = att.attached;
        res.warnings.push(...ex.warnings, ...att.warnings);
        att.usedHashes.forEach((h) => ex.media.has(h) && res.media.set(h, ex.media.get(h)));
        if (det.map.photos == null && ex.pics.length) res.warnings.push({ level: 'info', code: 'photo-col', text: 'No "Defect Photos" column header was found; photos were matched by the row they sit on.' });
      }
      res.records.forEach((r) => delete r._bad);
      return res;
    };
    return s;
  };

  /* Standard blank template for contractors */
  P.makeTemplate = function () {
    const heads = D.FIELDS.map((f) => f.label);
    const rows = [
      heads,
      ['1', 'Open', 'STEL Dept – Name', '12/10/2026', '', '', 'Location', 'Block A', 'L2 / Room 2-01', 'Describe the defect', 'Describe the proposed fix', 'Minor', '', 'Action required', '19/10/2026', 'STEL contact', 'Contractor', '', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = heads.map((h, i) => ({ wch: [4, 10, 24, 16, 16, 16, 16, 12, 22, 40, 36, 18, 30, 24, 18, 18, 18, 30, 18, 16][i] || 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defects');
    return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' });
  };
})();
