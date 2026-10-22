/* Defect Tracker — utilities */
(function () {
  'use strict';
  const DT = (window.DT = window.DT || {});
  const U = (DT.U = {});

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.MON = MON;

  U.$ = (s, r) => (r || document).querySelector(s);
  U.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  U.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  U.debounce = (fn, ms = 200) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.yield = () => new Promise((r) => setTimeout(r, 0));
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- dates (ISO strings YYYY-MM-DD, timezone-free) ---------- */
  U.pad = (n) => String(n).padStart(2, '0');
  U.isoFromDate = (d) => d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  U.isoToday = () => U.isoFromDate(new Date());
  U.toMs = (iso) => {
    const p = iso.split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  };
  U.daysBetween = (a, b) => Math.round((U.toMs(b) - U.toMs(a)) / 864e5);
  U.addDays = (iso, n) => {
    const d = new Date(U.toMs(iso) + n * 864e5);
    return d.getUTCFullYear() + '-' + U.pad(d.getUTCMonth() + 1) + '-' + U.pad(d.getUTCDate());
  };
  U.fmtDate = (iso) => {
    if (!iso) return '';
    const p = iso.split('-').map(Number);
    return p[2] + ' ' + MON[p[1] - 1] + ' ' + p[0];
  };
  U.fmtDateShort = (iso) => {
    if (!iso) return '';
    const p = iso.split('-').map(Number);
    return p[2] + ' ' + MON[p[1] - 1];
  };
  U.fmtDateList = (list) => (list && list.length ? list.map(U.fmtDate).join(' & ') : '');
  U.fmtDateTime = (ms) => {
    const d = new Date(ms);
    return U.fmtDate(U.isoFromDate(d)) + ', ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  };
  U.fmtBytes = (n) => {
    if (n == null) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  };
  U.plural = (n, w, pl) => n + ' ' + (n === 1 ? w : pl || w + 's');
  U.natCompare = (a, b) => String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), undefined, { numeric: true, sensitivity: 'base' });

  /* ---------- hashing (cyrb53) ---------- */
  U.hashBytes = (u8, extra) => {
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0; i < u8.length; i++) {
      const ch = u8[i];
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    const s = String(extra || '');
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + u8.length.toString(36);
  };

  /* ---------- files ---------- */
  U.download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  };
  U.stamp = () => {
    const d = new Date();
    return U.isoFromDate(d) + '_' + U.pad(d.getHours()) + U.pad(d.getMinutes());
  };

  /* ---------- number animation ---------- */
  U.countUp = (el, to, opts) => {
    opts = opts || {};
    const dur = opts.dur || 900;
    const fmt = opts.fmt || ((v) => Math.round(v).toLocaleString());
    if (U.reduceMotion() || !to) {
      el.textContent = fmt(to);
      return;
    }
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(to * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  };

  /* ---------- text helpers ---------- */
  U.truncate = (s, n) => {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  };
  U.initials = (name) =>
    String(name || '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  U.titleCase = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  U.tokens = (s) =>
    new Set(
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1)
    );
  U.jaccard = (a, b) => {
    if (!a.size && !b.size) return 1;
    let i = 0;
    a.forEach((x) => b.has(x) && i++);
    return i / (a.size + b.size - i || 1);
  };
  U.csvEscape = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
})();
