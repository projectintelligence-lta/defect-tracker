/* Defect Tracker — shared UI toolkit */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    D = DT.domain;
  const UI = (DT.ui = {});
  const esc = U.esc;

  /* ---------- icons ---------- */
  const IC = {
    upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    filter: '<path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 4v16"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M15 4v16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    sliders: '<path d="M4 6h9"/><path d="M17 6h3"/><circle cx="15" cy="6" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 18h11"/><path d="M19 18h1"/><circle cx="17" cy="18" r="2"/>',
    grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    compare: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
    trend: '<path d="m7 17 10-10"/><path d="M8 7h9v9"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    swap: '<path d="M7 7h13l-3-3"/><path d="M17 17H4l3 3"/>',
  };
  UI.icon = (n, s) => '<svg class="ic" width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';

  /* ---------- small markup helpers ---------- */
  UI.stagePill = (id) => {
    const s = D.stageById[id];
    return '<span class="pill" style="--c:' + s.color + '">' + esc(s.label) + '</span>';
  };
  UI.classTag = (c) => '<span class="tag" style="--c:' + (D.classById[c] || D.classById.Unclassified).color + '">' + esc(c) + '</span>';
  UI.avatar = (name) => '<span class="avatar">' + esc(U.initials(name)) + '</span>';
  UI.empty = (icon, title, text, action) =>
    '<div class="empty"><div class="empty-ic">' + UI.icon(icon, 28) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (action || '') + '</div>';

  /* lazy-load photos referenced as <img data-ph="hash" data-size="thumb"> */
  UI.hydratePhotos = (root) => {
    U.$$('img[data-ph]', root).forEach(async (im) => {
      const h = im.dataset.ph;
      delete im.dataset.ph;
      const url = await DT.store.photoURL(h, im.dataset.size || 'thumb');
      if (url) {
        im.src = url;
        im.onload = () => im.classList.add('loaded');
      }
    });
  };

  /* ---------- toasts ---------- */
  UI.toast = (msg, type) => {
    let host = U.$('#toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toasts';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.innerHTML = (type === 'error' ? UI.icon('alert', 16) : type === 'success' ? UI.icon('check', 16) : '') + '<span>' + esc(msg) + '</span>';
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 400);
    }, type === 'error' ? 5200 : 3000);
  };

  /* ---------- layer stack (Esc / arrow keys go to the top layer) ---------- */
  const stack = [];
  UI.top = () => stack[stack.length - 1];
  document.addEventListener('keydown', (e) => {
    const t = stack[stack.length - 1];
    if (!t) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      t.close();
    } else if (t.onKey) t.onKey(e);
  });
  const layers = () => U.$('#layers');
  function mount(el, layer) {
    layers().appendChild(el);
    stack.push(layer);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  }
  function unmount(el, layer, cb) {
    const i = stack.indexOf(layer);
    if (i >= 0) stack.splice(i, 1);
    el.classList.remove('in');
    setTimeout(() => {
      el.remove();
      if (cb) cb();
    }, U.reduceMotion() ? 0 : 280);
  }

  /* ---------- modal sheet ---------- */
  UI.modal = (o) => {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.innerHTML =
      '<div class="sheet ' + (o.cls || '') + '" role="dialog" aria-modal="true" style="' + (o.width ? 'max-width:' + o.width + 'px' : '') + '">' +
      (o.title ? '<header class="sheet-head"><h2>' + esc(o.title) + '</h2>' + (o.noClose ? '' : '<button class="icon-btn" data-close aria-label="Close">' + UI.icon('close') + '</button>') + '</header>' : '') +
      '<div class="sheet-body"></div>' + (o.footer !== undefined ? '<footer class="sheet-foot"></footer>' : '') + '</div>';
    const layer = { close: () => api.close() };
    const api = {
      el,
      sheet: U.$('.sheet', el),
      body: U.$('.sheet-body', el),
      foot: U.$('.sheet-foot', el),
      close() {
        if (api.closed) return;
        if (o.onBeforeClose && o.onBeforeClose() === false) return;
        api.closed = true;
        unmount(el, layer, o.onClose);
      },
    };
    if (typeof o.body === 'string') api.body.innerHTML = o.body;
    else if (o.body) api.body.appendChild(o.body);
    if (api.foot && typeof o.footer === 'string') api.foot.innerHTML = o.footer;
    el.addEventListener('mousedown', (e) => {
      if (e.target === el && !o.noBackdropClose) api.close();
    });
    el.addEventListener('click', (e) => e.target.closest('[data-close]') && api.close());
    mount(el, layer);
    const f = api.sheet;
    f.setAttribute('tabindex', '-1');
    setTimeout(() => f.focus({ preventScroll: true }), 30);
    return api;
  };

  UI.confirm = (o) =>
    new Promise((res) => {
      let answered = false;
      const m = UI.modal({
        title: o.title,
        width: 440,
        cls: 'sheet-sm',
        body: '<p class="confirm-text">' + esc(o.message) + '</p>',
        footer: '<button class="btn" data-close>' + esc(o.cancelLabel || 'Cancel') + '</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-ok>' + esc(o.confirmLabel || 'Confirm') + '</button>',
        onClose: () => !answered && res(false),
      });
      U.$('[data-ok]', m.el).addEventListener('click', () => {
        answered = true;
        res(true);
        m.close();
      });
    });

  /* ---------- drawer (right side panel) ---------- */
  let drawer = null;
  UI.drawer = {
    open(html, o) {
      o = o || {};
      if (drawer) UI.drawer.close(true);
      const el = document.createElement('div');
      el.className = 'drawer-wrap';
      el.innerHTML = '<aside class="drawer" role="dialog" aria-modal="true"><div class="drawer-inner"></div></aside>';
      const inner = U.$('.drawer-inner', el);
      inner.innerHTML = html;
      const layer = { close: () => UI.drawer.close(), onKey: o.onKey };
      drawer = { el, inner, layer, onClose: o.onClose };
      el.addEventListener('mousedown', (e) => e.target === el && UI.drawer.close());
      mount(el, layer);
      return inner;
    },
    setHTML(html) {
      if (drawer) {
        drawer.inner.innerHTML = html;
        drawer.inner.scrollTop = 0;
        drawer.inner.classList.remove('swap');
        void drawer.inner.offsetWidth;
        drawer.inner.classList.add('swap');
      }
    },
    close(immediate) {
      if (!drawer) return;
      const d = drawer;
      drawer = null;
      if (immediate) {
        const i = stack.indexOf(d.layer);
        if (i >= 0) stack.splice(i, 1);
        d.el.remove();
      } else unmount(d.el, d.layer, d.onClose);
    },
    get inner() {
      return drawer && drawer.inner;
    },
    isOpen: () => !!drawer,
  };

  /* ---------- lightbox ---------- */
  UI.lightbox = (items, index) => {
    let i = index || 0;
    const el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML =
      '<button class="lb-close icon-btn" data-close aria-label="Close">' + UI.icon('close', 22) + '</button>' +
      '<button class="lb-nav prev icon-btn" aria-label="Previous">' + UI.icon('left', 26) + '</button>' +
      '<div class="lb-stage"><img alt=""><div class="lb-spin"></div></div>' +
      '<button class="lb-nav next icon-btn" aria-label="Next">' + UI.icon('right', 26) + '</button>' +
      '<div class="lb-cap"></div>';
    const img = U.$('img', el),
      cap = U.$('.lb-cap', el);
    const layer = {
      close: () => unmount(el, layer),
      onKey: (e) => {
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      },
    };
    async function show() {
      const it = items[i];
      img.classList.remove('loaded', 'zoom');
      cap.innerHTML = '<b>' + esc(it.label) + '</b>' + (it.sub ? '<span>' + esc(it.sub) + '</span>' : '') + '<em>' + (i + 1) + ' of ' + items.length + '</em>';
      const url = await DT.store.photoURL(it.hash, 'full');
      if (items[i] !== it) return;
      img.onload = () => img.classList.add('loaded');
      img.src = url;
    }
    function go(d) {
      i = (i + d + items.length) % items.length;
      show();
    }
    el.addEventListener('click', (e) => {
      if (e.target.closest('.prev')) go(-1);
      else if (e.target.closest('.next')) go(1);
      else if (e.target === img) img.classList.toggle('zoom');
      else if (e.target.closest('[data-close]') || e.target.classList.contains('lb-stage') || e.target === el) layer.close();
    });
    if (items.length < 2) U.$$('.lb-nav', el).forEach((b) => (b.hidden = true));
    mount(el, layer);
    show();
  };

  /* ---------- popover menu ---------- */
  UI.menu = (anchor, items, o) => {
    o = o || {};
    document.querySelectorAll('.menu').forEach((m) => m.remove());
    const m = document.createElement('div');
    m.className = 'menu';
    m.setAttribute('role', 'menu');
    m.innerHTML = items
      .map((it, i) => (it.divider ? '<hr>' : it.header ? '<div class="menu-h">' + esc(it.header) + '</div>' : '<button role="menuitem" data-i="' + i + '" class="' + (it.danger ? 'danger' : '') + '">' + (it.icon ? UI.icon(it.icon, 16) : '') + '<span>' + esc(it.label) + '</span>' + (it.hint ? '<em>' + esc(it.hint) + '</em>' : '') + '</button>'))
      .join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const w = m.offsetWidth,
      h = m.offsetHeight;
    let left = o.align === 'left' ? r.left : r.right - w;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    requestAnimationFrame(() => m.classList.add('in'));
    const close = () => {
      m.classList.remove('in');
      setTimeout(() => m.remove(), 160);
      document.removeEventListener('mousedown', away, true);
      document.removeEventListener('keydown', esck, true);
    };
    const away = (e) => !m.contains(e.target) && !anchor.contains(e.target) && close();
    const esck = (e) => e.key === 'Escape' && (e.stopPropagation(), close());
    setTimeout(() => document.addEventListener('mousedown', away, true), 0);
    document.addEventListener('keydown', esck, true);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      const it = items[+b.dataset.i];
      close();
      it.onClick && it.onClick();
    });
    return { close };
  };

  /* ---------- segmented control with a sliding thumb ---------- */
  UI.segmented = (host, o) => {
    host.classList.add('seg');
    host.innerHTML = '<span class="seg-thumb"></span>' + o.options.map((op) => '<button type="button" data-v="' + esc(op.id) + '">' + (op.icon ? UI.icon(op.icon, 15) : '') + '<span>' + esc(op.label) + '</span>' + (op.count != null ? '<em>' + op.count + '</em>' : '') + '</button>').join('');
    const thumb = U.$('.seg-thumb', host);
    let value = o.value;
    function layout(animate) {
      const b = U.$('button[data-v="' + CSS.escape(String(value)) + '"]', host);
      U.$$('button', host).forEach((x) => x.classList.toggle('on', x === b));
      if (!b || !b.offsetWidth) return;
      if (!animate) thumb.style.transition = 'none';
      thumb.style.width = b.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + b.offsetLeft + 'px)';
      if (!animate) {
        void thumb.offsetWidth;
        thumb.style.transition = '';
      }
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b || b.dataset.v === String(value)) return;
      value = b.dataset.v;
      layout(true);
      o.onChange && o.onChange(value);
    });
    requestAnimationFrame(() => layout(false));
    if (window.ResizeObserver) new ResizeObserver(() => layout(false)).observe(host);
    return {
      set(v) {
        value = v;
        layout(true);
      },
      relayout: () => layout(false),
    };
  };
})();
