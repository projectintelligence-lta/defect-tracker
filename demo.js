/* Defect Tracker — built-in SAMPLE data.
 * Entirely fictional. It is generated in the browser and sent through the same reader as a real upload,
 * so management can explore every feature before uploading a real register. */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain,
    P = DT.parser;
  const M = (DT.demo = {});

  const LOC = ['Depot', 'North Station', 'Viaduct Section 2', 'Maintenance Bay', 'Control Centre'];
  const BLD = ['Block A', 'Block B', 'Workshop 1', 'Substation 3', 'Admin Block'];
  const LVL = ['L1 / Pump Room', 'L2 / Corridor', 'Roof / Plant Deck', 'B1 / Cable Room', 'L3 / Store 3-04', 'L1 / Loading Bay'];
  const OFFICERS = ['STEL Civil – A. Tan', 'STEL M&E – R. Lim', 'STEL Safety – J. Ong'];
  const CONTACTS = ['M. Lee', 'S. Kumar', 'W. Goh'];
  const PARTIES = ['Alpha Builders', 'Beta M&E', 'Gamma Civil'];
  const TAGS = ['DESIGN', 'WORKMANSHIP', 'MAINTENANCE'];

  /* [description, proposed rectification, classification, scene] */
  const T = [
    ['Handrail loose at stair landing', 'Re-fix handrail brackets and re-torque', 'Safety Related', 1],
    ['Hairline crack on external wall near column C4', 'Inject epoxy and repaint', 'Minor', 0],
    ['Drain grating missing at loading bay', 'Provide and install galvanised grating', 'Safety Related', 2],
    ['Cable tray unsupported over 2 m span', 'Add supports at 1 m intervals', 'Major', 3],
    ['Door closer not working at fire exit', 'Replace door closer and test', 'Safety Related', 4],
    ['Ceiling stain below roof outlet', 'Trace leak, repair waterproofing, replace tile', 'Major', 5],
    ['Cracked floor tile outside lift lobby', 'Replace tile', 'Minor', 6],
    ['Paint peeling on staircase soffit', 'Scrape and repaint', 'Minor', 0],
    ['No toe board along platform edge railing', 'Provide toe boards to stop tools dropping to the track', 'Safety Related', 1],
    ['Water ponding at roof drain', 'Rework screed falls towards the drain', 'Major', 2],
    ['Exposed cable ends in junction box', 'Terminate and cover cable ends', 'Safety Related', 3],
    ['Door gap exceeds tolerance at store room', 'Adjust hinges and re-hang door', 'Minor', 4],
    ['Missing ceiling tile in corridor', 'Install ceiling tile', 'Minor', 5],
    ['Uneven floor at entrance ramp', 'Regrade ramp and add anti-slip finish', 'Major', 6],
    ['Handrail height below requirement at mezzanine', 'Raise handrail to 1.1 m', 'Safety Related', 1],
    ['Sealant missing at window frame', 'Apply weatherproof sealant', 'Minor', 0],
    ['Additional access ladder suggested for equipment platform', 'Install fixed ladder with safety cage', 'Improvement', 1],
    ['Drain cover rattling under foot traffic', 'Fix cover with locking pins', 'Minor', 2],
    ['Labels missing on cable tray risers', 'Provide labels as per specification', 'Improvement', 3],
    ['Fire door sticks when closing', 'Plane door and adjust frame', 'Major', 4],
    ['Water stain on ceiling near AHU', 'Repair condensate pipe and repaint', 'Major', 5],
    ['Grout missing in washroom floor', 'Re-grout floor tiles', 'Minor', 6],
    ['Rust on external staircase stringer', 'Treat rust and repaint', 'Major', 0],
    ['Gap between handrail and wall', 'Fit end cap / wall return', 'Minor', 1],
    ['Stagnant water in sump', 'Clean sump and test pump', 'Major', 2],
    ['Power and data cables not segregated in tray', 'Segregate power and data cables', 'Major', 3],
    ['Door signage not installed', 'Install door signage', 'Improvement', 4],
    ['Ceiling access panel not flush', 'Re-align access panel', 'Minor', 5],
    ['Slippery floor finish at wash bay', 'Apply anti-slip coating', 'Safety Related', 6],
    ['Concrete spalling at slab edge', 'Chip, treat reinforcement and patch repair', 'Major', 0],
    ['Safety chain missing at roof access', 'Provide safety chain', 'Safety Related', 1],
    ['Debris in storm drain', 'Clear drain and re-inspect', 'Minor', 2],
    ['Light fitting hanging loose', 'Secure fitting to ceiling', 'Safety Related', 3],
    ['Door lock does not turn smoothly', 'Replace lock cylinder', 'Minor', 4],
  ];

  /* ---------- sample photo painter ---------- */
  const PALETTES = [
    ['#eef1f5', '#cdd5de'],
    ['#f1efe9', '#d6d2c6'],
    ['#e8eef3', '#c4d0db'],
    ['#eef0ee', '#cbd2cc'],
  ];
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
  }
  function paint(cv, scene, after, seed, stamp) {
    const w = cv.width,
      h = cv.height,
      ctx = cv.getContext('2d'),
      r = rng(seed);
    const pal = PALETTES[seed % PALETTES.length];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, pal[0]);
    g.addColorStop(1, pal[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8b95a1';
    ctx.fillStyle = '#9aa4b0';
    const bad = '#c0392b';
    if (scene === 0) {
      ctx.fillStyle = '#b8c0ca';
      ctx.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.6);
      if (!after) {
        ctx.strokeStyle = bad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        let x = w * 0.45,
          y = h * 0.15;
        ctx.moveTo(x, y);
        for (let i = 0; i < 9; i++) ctx.lineTo((x += (r() - 0.45) * 50), (y += h * 0.06));
        ctx.stroke();
      }
    } else if (scene === 1) {
      ctx.strokeStyle = '#6f7a86';
      for (let i = 0; i < 6; i++) {
        const x = w * (0.12 + i * 0.15);
        const lean = !after && i === 3 ? 38 : 0;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.7);
        ctx.lineTo(x + lean, h * 0.3);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.3);
      ctx.lineTo(w * 0.9, h * 0.3);
      ctx.stroke();
    } else if (scene === 2) {
      ctx.fillStyle = '#7d8793';
      ctx.fillRect(w * 0.2, h * 0.38, w * 0.6, h * 0.3);
      ctx.strokeStyle = '#d8dde3';
      ctx.lineWidth = 4;
      for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.2 + (i * w * 0.6) / 10, h * 0.38);
        ctx.lineTo(w * 0.2 + (i * w * 0.6) / 10, h * 0.68);
        ctx.stroke();
      }
      if (!after) {
        ctx.fillStyle = '#8a6d3b';
        for (let i = 0; i < 14; i++) ctx.fillRect(w * 0.25 + r() * w * 0.5, h * 0.42 + r() * h * 0.22, 10, 7);
      }
    } else if (scene === 3) {
      ctx.fillStyle = '#9aa4b0';
      ctx.fillRect(w * 0.08, h * 0.4, w * 0.84, h * 0.14);
      ctx.strokeStyle = after ? '#44525f' : bad;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.47);
      if (after) ctx.lineTo(w * 0.9, h * 0.47);
      else ctx.bezierCurveTo(w * 0.35, h * 0.47, w * 0.4, h * 0.82, w * 0.62, h * 0.7);
      ctx.stroke();
    } else if (scene === 4) {
      ctx.fillStyle = '#b3bcc6';
      ctx.fillRect(w * 0.3, h * 0.1, w * 0.4, h * 0.62);
      ctx.fillStyle = '#6f7a86';
      ctx.beginPath();
      ctx.arc(w * 0.64, h * 0.42, 9, 0, 7);
      ctx.fill();
      if (!after) {
        ctx.fillStyle = 'rgba(192,57,43,.35)';
        ctx.fillRect(w * 0.3, h * 0.1, 12, h * 0.62);
      }
    } else if (scene === 5) {
      ctx.strokeStyle = '#c3cad2';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) ctx.strokeRect(w * 0.08 + i * w * 0.14, h * 0.08 + j * h * 0.15, w * 0.14, h * 0.15);
      if (!after) {
        ctx.fillStyle = 'rgba(138,109,59,.35)';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.3, 60, 38, 0.3, 0, 7);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = '#c3cad2';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) ctx.strokeRect(w * 0.1 + i * w * 0.13, h * 0.5 + j * h * 0.14, w * 0.13, h * 0.14);
      if (!after) {
        ctx.strokeStyle = bad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w * 0.36, h * 0.52);
        ctx.lineTo(w * 0.5, h * 0.74);
        ctx.stroke();
      }
    }
    ctx.font = '600 ' + Math.round(h * 0.045) + 'px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillText('SAMPLE PHOTO', 16, h * 0.07);
    ctx.fillStyle = '#ff9f0a';
    ctx.textAlign = 'right';
    ctx.fillText(stamp, w - 16, h - 16);
    ctx.textAlign = 'left';
    if (after) {
      ctx.fillStyle = '#34c759';
      ctx.beginPath();
      ctx.arc(w - 44, 44, 24, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w - 54, 44);
      ctx.lineTo(w - 46, 52);
      ctx.lineTo(w - 33, 36);
      ctx.stroke();
    }
  }
  const blobOf = (cv, q) => new Promise((res) => cv.toBlob(res, 'image/jpeg', q));
  const photoCache = new Map();
  async function photo(scene, after, seed, iso) {
    const stamp = iso.split('-').reverse().join('/') + ' 10:' + U.pad(seed % 50 + 5);
    const hash = U.hashBytes(new Uint8Array([scene, after ? 1 : 0]), 'sample|' + seed + '|' + iso);
    if (photoCache.has(hash)) return { hash, media: photoCache.get(hash) };
    const cv = document.createElement('canvas');
    cv.width = 800;
    cv.height = 600;
    paint(cv, scene, after, seed, stamp);
    const tc = document.createElement('canvas');
    tc.width = 320;
    tc.height = 240;
    tc.getContext('2d').drawImage(cv, 0, 0, 320, 240);
    const media = { full: await blobOf(cv, 0.8), thumb: await blobOf(tc, 0.8), w: 800, h: 600 };
    photoCache.set(hash, media);
    return { hash, media };
  }

  /* ---------- the story behind the 3 sample uploads ---------- */
  function plan() {
    return T.map((t, i) => {
      const appear = i < 22 ? 0 : i < 29 ? 1 : 2;
      let rectAt = null,
        closeAt = null,
        rework = false;
      const k = i % 4;
      if (k === 0) (rectAt = appear + 1), (closeAt = appear + 2);
      else if (k === 1) rectAt = appear + 1;
      else if (k === 3) (rectAt = appear), (closeAt = appear + 1);
      if (i === 5) (rectAt = 1), (closeAt = null), (rework = true);
      if (i === 13) (rectAt = 1), (rework = true), (closeAt = null);
      if (rectAt > 2) rectAt = null;
      if (closeAt > 2) closeAt = null;
      return { i, t, appear, rectAt, closeAt, rework, removeAt: i === 3 ? 2 : null };
    });
  }

  M.build = async function (onProgress) {
    const today = U.isoToday();
    const offs = [63, 33, 4];
    const defects = plan();
    const out = [];
    let done = 0;
    const total = 3;
    for (let bi = 0; bi < 3; bi++) {
      const bdate = U.addDays(today, -offs[bi]);
      const rows = [D.FIELDS.map((f) => f.label)];
      const pics = [];
      const media = new Map();
      const ci = {};
      D.FIELDS.forEach((f, idx) => (ci[f.id] = idx));
      for (const d of defects) {
        if (d.appear > bi || (d.removeAt != null && bi >= d.removeAt)) continue;
        const i = d.i;
        const t = d.t;
        const insp1 = U.addDays(U.addDays(today, -offs[d.appear]), -(3 + (i % 6)));
        const insp = i % 7 === 0 ? [insp1, U.addDays(insp1, 7)] : [insp1];
        const rectd = d.rectAt != null && bi >= d.rectAt;
        const closed = d.closeAt != null && bi >= d.closeAt;
        const reworkNow = d.rework && rectd && bi >= d.rectAt && bi === 2;
        const rectDate = rectd ? U.addDays(U.addDays(today, -offs[d.rectAt]), -(2 + (i % 4))) : '';
        const closeDate = closed ? U.addDays(U.addDays(today, -offs[d.closeAt]), -1) : '';
        const r = rows.length;
        const row = new Array(D.FIELDS.length).fill(null);
        const dt = (iso) => iso.split('-').reverse().map((x) => String(+x)).join('/');
        row[ci.sn] = i === 10 ? '10' : String(i + 1);
        row[ci.status] = closed ? 'Closed' : i % 9 === 2 ? 'Open' : 'Opened';
        row[ci.officer] = OFFICERS[i % 3];
        row[ci.inspDates] = i === 12 ? 'Mid Aug' : insp.map(dt).join(' & ');
        row[ci.rectDates] = rectd ? dt(rectDate) : null;
        row[ci.closedDate] = closed ? dt(closeDate) : null;
        row[ci.location] = LOC[i % 5];
        row[ci.building] = BLD[(i * 2) % 5];
        row[ci.level] = LVL[i % 6];
        row[ci.description] = t[0];
        row[ci.proposed] = t[1];
        row[ci.classification] = i === 16 ? 'Provide toe guards on the platform railing to stop tools dropping' : i % 11 === 3 && t[2] === 'Safety Related' ? 'Safety' : t[2];
        row[ci.action] = closed ? 'Verified on site' : rectd ? 'Inspect rectification' : i % 3 === 0 ? 'Contractor to rectify' : i % 3 === 1 ? 'Contractor to confirm method' : 'Check drawings, then rectify';
        row[ci.followUp] = !closed && i % 2 === 0 ? 'Rectify by ' + dt(U.addDays(insp1, 14 + (i % 5) * 3)) : !closed ? 'Next site walk' : null;
        row[ci.contact] = CONTACTS[i % 3];
        row[ci.actionParty] = i % 8 === 5 ? null : PARTIES[i % 3];
        row[ci.rectification] = rectd ? 'Rectified by ' + PARTIES[i % 3] + '. Photos attached.' : null;
        row[ci.signoff] = closed ? 'Accepted by STEL ' + dt(closeDate) : reworkNow ? 'Not accepted – rectification incomplete' : null;
        row[ci.remark] = TAGS[i % 3];
        rows.push(row);
        const nb = (i % 3) + 1;
        for (let k = 0; k < nb; k++) {
          const p = await photo(t[3], false, i * 7 + k, insp1);
          media.set(p.hash, p.media);
          pics.push({ hash: p.hash, row: r, col: ci.photos, fromRow: r, rowOff: 0, colOff: k * 800000, spans: false });
        }
        if (rectd) {
          const na = (i % 2) + 1;
          for (let k = 0; k < na; k++) {
            const p = await photo(t[3], true, i * 7 + k + 3, rectDate);
            media.set(p.hash, p.media);
            pics.push({ hash: p.hash, row: r, col: ci.rectification, fromRow: r, rowOff: 0, colOff: k * 800000, spans: false });
          }
        }
      }
      const det = P.detectColumns(rows);
      const built = P.buildRecords(rows, det.headerRow, det.map, []);
      P.attachPictures(built.records, pics, [], det.map);
      out.push({
        records: built.records,
        media,
        warnings: built.warnings,
        rowsWithData: built.rowsWithData,
        label: 'Sample upload ' + (bi + 1),
        fileName: 'Sample_Defect_Register_' + bdate + '.xlsx',
        asOf: bdate,
        uploadedAt: new Date(bdate + 'T10:30:00').getTime(),
      });
      done++;
      if (onProgress) onProgress(done, total);
      await U.yield();
    }
    return out;
  };
})();
