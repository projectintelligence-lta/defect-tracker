/* Defect Tracker — authentication.
 * DEMO ONLY: accounts below are not verified and anyone can use them.
 * For production, replace `DT.auth.signIn / current / signOut` with your identity provider
 * (SSO / Supabase Auth / Azure AD …). The rest of the app only uses the functions below. */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U,
    UI = DT.ui;
  const esc = U.esc;
  const A = (DT.auth = {});

  A.ROLES = {
    admin: { label: 'Admin', can: ['upload', 'notes', 'delete', 'settings', 'export'], blurb: 'Manages data, settings and users' },
    stel: { label: 'STEL', can: ['upload', 'notes', 'export'], blurb: 'Raises defects, reviews and signs off' },
    contractor: { label: 'Contractor (LTA)', can: ['upload', 'notes', 'export'], blurb: 'Uploads the register and updates actions' },
    viewer: { label: 'Viewer', can: ['export'], blurb: 'Read-only dashboard for management' },
  };
  A.users = [
    { id: 'admin', name: 'Priya Nair', email: 'admin@demo.local', role: 'admin', title: 'Project admin' },
    { id: 'stel', name: 'Daniel Koh', email: 'stel@demo.local', role: 'stel', title: 'STEL inspection officer' },
    { id: 'lta', name: 'Contractor Team', email: 'contractor@demo.local', role: 'contractor', title: 'LTA contractor' },
    { id: 'viewer', name: 'Management Viewer', email: 'viewer@demo.local', role: 'viewer', title: 'Management' },
  ];

  A.current = () => {
    try {
      const id = localStorage.getItem('dt.user');
      return A.users.find((u) => u.id === id) || null;
    } catch (e) {
      return null;
    }
  };
  A.signIn = async (email, password) => {
    const u = A.users.find((x) => x.email.toLowerCase() === String(email || '').trim().toLowerCase());
    if (!u) throw new Error('Use one of the demo accounts below.');
    if (!password) throw new Error('Enter any password to continue (demo).');
    try {
      localStorage.setItem('dt.user', u.id);
    } catch (e) { /* storage blocked: still allow session in memory */ }
    return u;
  };
  A.signOut = () => {
    try {
      localStorage.removeItem('dt.user');
    } catch (e) { /* ignore */ }
  };
  A.can = (action) => {
    const u = DT.state.user;
    return !!(u && A.ROLES[u.role].can.includes(action));
  };

  /* ---------- sign-in screen ---------- */
  A.renderLogin = (root, onDone) => {
    root.hidden = false;
    root.innerHTML =
      '<div class="login-card">' +
      '<div class="login-logo" style="--i:0"><svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="12" fill="var(--accent)"/><path class="draw" pathLength="1" d="M14 25l7 7 13-15" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<h1 style="--i:1">Defect Tracker</h1>' +
      '<p class="login-sub" style="--i:2">Every inspection defect, from first photo to sign-off.</p>' +
      '<form class="login-form" style="--i:3" novalidate>' +
      '<label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" placeholder="name@company.com" required></label>' +
      '<label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" placeholder="Password" required></label>' +
      '<div class="login-err" role="alert"></div>' +
      '<button class="btn primary lg" type="submit">Sign in</button></form>' +
      '<div class="login-demo" style="--i:4"><p>Demo sign-in. Choose a role to look around.</p><div class="role-grid">' +
      A.users.map((u) => '<button type="button" class="role-tile" data-id="' + u.id + '"><span class="avatar">' + esc(U.initials(u.name)) + '</span><b>' + esc(A.ROLES[u.role].label) + '</b><span>' + esc(A.ROLES[u.role].blurb) + '</span></button>').join('') +
      '</div></div>' +
      '<p class="login-foot" style="--i:5">Demo accounts are not secured. A production deployment replaces this screen with your organisation’s sign-in.</p></div>';
    const form = U.$('form', root),
      err = U.$('.login-err', root);
    const enter = (u) => {
      root.classList.add('leaving');
      setTimeout(() => {
        root.hidden = true;
        root.classList.remove('leaving');
        onDone(u);
      }, 380);
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      try {
        enter(await A.signIn(form.email.value, form.password.value));
      } catch (ex) {
        err.textContent = ex.message;
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
      }
    });
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('.role-tile');
      if (!t) return;
      const u = A.users.find((x) => x.id === t.dataset.id);
      enter(await A.signIn(u.email, 'demo'));
    });
  };
})();
