/* ==========================================================================
   ADMIN PANEL SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  let data = DataStore.get();

  /* ============================ THEME (shared with public site) ============================ */
  const html = document.documentElement;
  html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
  function bindThemeToggle(btnId) {
    document.getElementById(btnId).addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  /* ============================ HELPERS ============================ */
  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  /* Data stores image paths relative to the SITE ROOT (e.g. "assets/images/x.svg")
     because that's what index.html needs. This admin app lives one folder down
     (/admin/), so any root-relative path (not a URL, not a data: URI, not
     already "../") needs "../" prefixed just to *display* it here. The stored
     value itself is never changed. */
  function resolveAssetPath(src) {
    if (!src) return src;
    if (/^([a-z]+:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('../') || src.startsWith('/')) return src;
    return '../' + src;
  }

  /* ============================ AUTH / LOGIN ============================ */
  const loginScreen = document.getElementById('loginScreen');
  const adminApp = document.getElementById('adminApp');
  const loginForm = document.getElementById('loginForm');

  document.getElementById('passToggle').addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    document.getElementById('passToggle').innerHTML = `<i class="fa-solid fa-eye${isPass ? '-slash' : ''}"></i>`;
  });

  // Delegated so it also covers password-visibility toggles rendered later
  // by Security panel / recovery form templates, not just the login screen.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.pass-toggle[data-toggle-for]');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.toggleFor);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = `<i class="fa-solid fa-eye${isPass ? '-slash' : ''}"></i>`;
    btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
  });

  /* ---- Forgot password (via recovery key) ---- */
  const recoveryOverlay = document.getElementById('recoveryOverlay');
  document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
    await AuthStore.init();
    if (!AuthStore.hasRecoveryKey()) {
      Toast.error('No recovery key set', 'Log in and generate one from Security → Account Recovery Key first.');
      return;
    }
    document.getElementById('recoveryForm').reset();
    recoveryOverlay.classList.add('open');
  });
  document.getElementById('recoveryClose').addEventListener('click', () => recoveryOverlay.classList.remove('open'));
  recoveryOverlay.addEventListener('click', (e) => { if (e.target === recoveryOverlay) recoveryOverlay.classList.remove('open'); });

  document.getElementById('recoveryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('recovery-key').value.trim();
    const p1 = document.getElementById('recovery-newpass').value;
    const p2 = document.getElementById('recovery-confirm').value;
    if (p1 !== p2) { Toast.error('Passwords do not match', 'Please re-enter matching passwords.'); return; }
    if (p1.length < 8) { Toast.error('Password too short', 'Use at least 8 characters.'); return; }
    const ok = await AuthStore.resetPasswordWithRecoveryKey(key, p1);
    if (!ok) { Toast.error('Invalid recovery key', 'Double-check the key and try again.'); return; }
    recoveryOverlay.classList.remove('open');
    Toast.success('Password reset', 'Your recovery key has been used and is no longer valid — log in with your new password.');
  });

  /* ---- Simple math CAPTCHA, shown after repeated failed attempts ----
     A lightweight extra step against basic automated form-filling — not
     meant to stop a determined attacker (nothing client-side really can),
     just to add friction once the failure count suggests it isn't a
     one-off typo. */
  let captchaAnswer = null;
  function newCaptchaChallenge() {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    captchaAnswer = a + b;
    document.getElementById('loginCaptchaLabel').textContent = `Verification — what is ${a} + ${b}?`;
    document.getElementById('login-captcha').value = '';
  }
  function syncCaptchaVisibility() {
    const status = AuthStore.getLockoutStatus();
    const field = document.getElementById('loginCaptchaField');
    const needsCaptcha = !status.locked && status.attemptsLeft <= 3 && status.attemptsLeft > 0;
    field.hidden = !needsCaptcha;
    if (needsCaptcha) newCaptchaChallenge();
  }
  syncCaptchaVisibility();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;
    const userField = document.getElementById('loginUserField');
    const passField = document.getElementById('loginPassField');

    const userOk = username.length > 0;
    const passOk = password.length > 0;
    userField.classList.toggle('invalid', !userOk);
    passField.classList.toggle('invalid', !passOk);
    if (!userOk || !passOk) return;

    const lockStatus = AuthStore.getLockoutStatus();
    if (lockStatus.locked) {
      const mins = Math.ceil(lockStatus.remainingMs / 60000);
      Toast.error('Too many failed attempts', `Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`);
      return;
    }

    const captchaField = document.getElementById('loginCaptchaField');
    if (!captchaField.hidden) {
      const answer = Number(document.getElementById('login-captcha').value.trim());
      if (answer !== captchaAnswer) {
        captchaField.classList.add('invalid');
        Toast.error('Verification failed', 'That answer is incorrect — try the new question.');
        const status = AuthStore.recordFailedAttempt();
        if (status.locked) {
          const mins = Math.ceil(status.remainingMs / 60000);
          Toast.error('Too many failed attempts', `Login locked for about ${mins} minute${mins === 1 ? '' : 's'}.`);
        }
        syncCaptchaVisibility();
        return;
      }
      captchaField.classList.remove('invalid');
    }

    const btn = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Signing in...';

    const valid = await AuthStore.verify(username, password);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In';

    if (!valid) {
      const status = AuthStore.recordFailedAttempt();
      syncCaptchaVisibility();
      if (status.locked) {
        const mins = Math.ceil(status.remainingMs / 60000);
        Toast.error('Too many failed attempts', `Login locked for about ${mins} minute${mins === 1 ? '' : 's'}.`);
      } else {
        Toast.error('Login failed', `Incorrect username or password. ${status.attemptsLeft} attempt${status.attemptsLeft === 1 ? '' : 's'} left before a temporary lockout.`);
      }
      passField.classList.add('invalid');
      return;
    }
    AuthStore.resetLockout();
    AuthStore.startSession(remember);
    SecurityLog.record();
    Toast.success('Welcome back', 'Logged in successfully.');
    enterApp();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    AuthStore.logout();
    location.reload();
  });

  function enterApp() {
    loginScreen.hidden = true;
    adminApp.hidden = false;
    bindThemeToggle('adminThemeToggle');
    initSidebar();
    navigateTo('dashboard');
    // Extend session on user activity
    ['click', 'keydown', 'mousemove'].forEach(evt =>
      document.addEventListener(evt, throttle(() => AuthStore.extendSession(), 30000))
    );
    setInterval(() => {
      if (!AuthStore.isLoggedIn()) {
        Toast.info('Session expired', 'Please log in again.');
        setTimeout(() => location.reload(), 1200);
      }
    }, 15000);
  }
  function throttle(fn, wait) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last > wait) { last = now; fn(...args); }
    };
  }

  (async function boot() {
    await AuthStore.init();
    if (AuthStore.isLoggedIn()) enterApp();
    else {
      loginScreen.hidden = false;
      adminApp.hidden = true;
      const lockStatus = AuthStore.getLockoutStatus();
      if (lockStatus.locked) {
        const mins = Math.ceil(lockStatus.remainingMs / 60000);
        Toast.error('Login temporarily locked', `Too many failed attempts. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`);
      }
    }
  })();

  /* ============================ SIDEBAR / ROUTER ============================ */
  function initSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminOverlay');
    document.getElementById('adminMenuBtn').addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.classList.add('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
    document.getElementById('adminNav').addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-nav-link');
      if (!btn) return;
      navigateTo(btn.dataset.view);
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  const viewTitles = {
    dashboard: 'Dashboard', profile: 'Profile Management', hero: 'Hero Section', about: 'About Section',
    skills: 'Skills', projects: 'Projects', experience: 'Experience', education: 'Education',
    certificates: 'Certificates', gallery: 'Gallery', services: 'Services', clients: 'Clients', testimonials: 'Testimonials',
    pendingTestimonials: 'Testimonial Requests',
    comments: 'Comments',
    blog: 'Blog', faqs: 'FAQ',
    contact: 'Contact Information', social: 'Social Media', integrations: 'Integrations', messages: 'Messages',
    newsletter: 'Newsletter Subscribers',
    theme: 'Theme Settings', website: 'Website Settings', data: 'Data Management', analytics: 'Analytics', security: 'Security'
  };

  const viewRenderers = {
    dashboard: renderDashboard, profile: renderProfile, hero: renderHero, about: renderAbout,
    skills: () => renderCrud('skills', skillsConfig), projects: () => renderCrud('projects', projectsConfig),
    experience: () => renderCrud('experience', experienceConfig), education: () => renderCrud('education', educationConfig),
    certificates: () => renderCrud('certificates', certificatesConfig), gallery: () => renderCrud('gallery', galleryConfig),
    services: () => renderCrud('services', servicesConfig), testimonials: () => renderCrud('testimonials', testimonialsConfig),
    clients: () => renderCrud('clients', clientsConfig),
    pendingTestimonials: renderPendingTestimonials,
    comments: renderComments,
    blog: () => renderCrud('blog', blogConfig), faqs: () => renderCrud('faqs', faqsConfig),
    contact: renderContact, social: renderSocial, integrations: renderIntegrations, messages: renderMessages,
    newsletter: renderNewsletter,
    theme: renderTheme, website: renderWebsite, data: renderDataManagement, analytics: renderAnalytics, security: renderSecurity
  };

  function navigateTo(view) {
    document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
    document.getElementById('adminViewTitle').textContent = viewTitles[view] || 'Dashboard';
    data = DataStore.get();
    const content = document.getElementById('adminContent');
    content.innerHTML = '';
    (viewRenderers[view] || renderDashboard)(content);
    updateMsgBadge();
  }

  function updateMsgBadge() {
    const unread = data.messages.filter(m => !m.read).length;
    const badge = document.getElementById('msgBadge');
    badge.hidden = unread === 0;
    badge.textContent = unread;

    const pending = (data.pendingTestimonials || []).length;
    const pendingBadge = document.getElementById('pendingBadge');
    if (pendingBadge) {
      pendingBadge.hidden = pending === 0;
      pendingBadge.textContent = pending;
    }

    const pendingComments = (data.pendingComments || []).length;
    const commentsBadge = document.getElementById('commentsBadge');
    if (commentsBadge) {
      commentsBadge.hidden = pendingComments === 0;
      commentsBadge.textContent = pendingComments;
    }
  }

  /* ============================ DASHBOARD ============================ */
  function renderDashboard(root) {
    const stats = [
      { label: 'Total Projects', value: data.projects.length, icon: 'fa-diagram-project' },
      { label: 'Total Skills', value: data.skills.length, icon: 'fa-code' },
      { label: 'Total Certificates', value: data.certificates.length, icon: 'fa-certificate' },
      { label: 'Total Messages', value: data.messages.length, icon: 'fa-envelope' },
      { label: 'Total Visitors', value: data.analytics.visitors, icon: 'fa-users' },
      { label: 'Total Blog Posts', value: data.blog.length, icon: 'fa-pen-nib' }
    ];
    const daysSince = BackupTracker.daysSinceLastExport();
    const needsBackupReminder = daysSince === null || daysSince >= 14;
    // Second entry, not the first — the first is this current session
    // (already recorded by SecurityLog.record() on login), so "last login"
    // means the one before it.
    const lastLoginEntry = SecurityLog.list()[1];
    root.innerHTML = `
      ${lastLoginEntry ? `
        <p style="color:var(--text-dim);font-size:var(--fs-xs);font-family:var(--font-mono);margin-bottom:var(--sp-4)">
          <i class="fa-solid fa-clock-rotate-left"></i> Last login: ${fmtDate(lastLoginEntry.date)} · ${escapeHtml(lastLoginEntry.browser)}
        </p>
      ` : ''}
      ${needsBackupReminder ? `
        <div class="admin-reminder-banner">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${daysSince === null ? "You haven't exported a backup yet." : `It's been ${daysSince} days since your last backup.`} Everything here lives only in this browser.</span>
          <button class="btn btn-primary btn-sm" id="dashboardBackupBtn"><i class="fa-solid fa-file-export"></i> Export Now</button>
        </div>
      ` : ''}
      <div class="stat-cards-grid">
        ${stats.map(s => `
          <div class="stat-card card">
            <div class="stat-icon"><i class="fa-solid ${s.icon}"></i></div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-label">${s.label}</div>
          </div>
        `).join('')}
      </div>
      <div class="admin-card card">
        <h3><i class="fa-solid fa-envelope-open-text"></i> Recent Messages</h3>
        ${data.messages.slice(0, 5).map(m => `
          <div class="message-item card ${m.read ? '' : 'unread'}">
            <div>
              <div class="message-meta">${!m.read ? '<span class="unread-dot"></span>' : ''}${escapeHtml(m.name)} · ${escapeHtml(m.email)} · ${fmtDate(m.date)}</div>
              <div class="message-subject">${escapeHtml(m.subject)}</div>
              <div class="message-body">${escapeHtml(m.message.slice(0, 100))}${m.message.length > 100 ? '…' : ''}</div>
            </div>
          </div>
        `).join('') || '<div class="admin-empty"><i class="fa-solid fa-inbox"></i>No messages yet.</div>'}
      </div>
      <div class="admin-card card">
        <h3><i class="fa-solid fa-chart-line"></i> Quick Overview</h3>
        <div class="bar-row"><span class="bar-label">Page Views</span><div class="bar-track"><div class="bar-fill" style="width:100%"></div></div><span class="bar-value">${data.analytics.pageViews}</span></div>
        <div class="bar-row"><span class="bar-label">Testimonials</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(data.testimonials.length * 20, 100)}%"></div></div><span class="bar-value">${data.testimonials.length}</span></div>
        <div class="bar-row"><span class="bar-label">Services</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(data.services.length * 20, 100)}%"></div></div><span class="bar-value">${data.services.length}</span></div>
        <div class="bar-row"><span class="bar-label">Gallery Items</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(data.gallery.length * 20, 100)}%"></div></div><span class="bar-value">${data.gallery.length}</span></div>
      </div>
    `;
    document.getElementById('dashboardBackupBtn')?.addEventListener('click', () => navigateTo('data'));
  }

  /* ============================ SIMPLE SETTINGS FORM HELPER ============================ */
  function bindSimpleForm(root, formId, onSave) {
    const form = document.getElementById(formId);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      onSave(new FormData(form));
      Toast.success('Saved', 'Your changes have been saved.');
      data = DataStore.get();
    });
  }

  /* ============================ PROFILE ============================ */
  function renderProfile(root) {
    const p = data.profile;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Profile</h2><p>Your public identity shown across the site.</p></div>${resetButtonHtml('Profile')}</div>
      <form id="profileForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field"><label>Full Name</label><input name="name" value="${escapeHtml(p.name)}" required /></div>
          <div class="field"><label>Title</label><input name="title" value="${escapeHtml(p.title)}" required /></div>
          <div class="field full"><label>Bio</label><textarea name="bio" required>${escapeHtml(p.bio)}</textarea></div>
          <div class="field"><label>GitHub Username (powers the GitHub activity widget)</label><input name="githubUsername" value="${escapeHtml(p.githubUsername || '')}" placeholder="e.g. shagarchandro" /></div>
          <div class="field full">
            <label>Profile Photo</label>
            <div class="image-upload">
              <img class="image-upload-preview" id="profilePhotoPreview" src="${resolveAssetPath(p.photo)}" alt="Profile preview" />
              <input type="file" accept="image/*" id="profilePhotoInput" />
            </div>
            <input type="hidden" name="photo" id="profilePhotoValue" value="${escapeHtml(p.photo)}" />
          </div>
          <div class="field full">
            <label>Resume (PDF)</label>
            <input type="file" accept="application/pdf" id="resumeInput" />
            <input type="hidden" name="resumeUrl" id="resumeValue" value="${escapeHtml(p.resumeUrl)}" />
          </div>
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Profile</button>
      </form>
    `;
    document.getElementById('profilePhotoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await fileToBase64(file);
      document.getElementById('profilePhotoPreview').src = b64;
      document.getElementById('profilePhotoValue').value = b64;
    });
    document.getElementById('resumeInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await fileToBase64(file);
      document.getElementById('resumeValue').value = b64;
      Toast.info('Resume ready', 'New resume will be applied when you save.');
    });
    bindSimpleForm(root, 'profileForm', (fd) => {
      const updated = { ...data.profile, name: fd.get('name'), title: fd.get('title'), bio: fd.get('bio'), githubUsername: fd.get('githubUsername').trim(), photo: fd.get('photo'), resumeUrl: fd.get('resumeUrl') };
      DataStore.update('profile', updated);
    });
    bindResetButton('profile', 'Profile', renderProfile);
  }

  /* ============================ HERO ============================ */
  function renderHero(root) {
    const h = data.hero;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Hero Section</h2><p>The first thing visitors see.</p></div>${resetButtonHtml('Hero Section')}</div>
      <form id="heroForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field full"><label>Title</label><input name="title" value="${escapeHtml(h.title)}" required /></div>
          <div class="field full"><label>Subtitle</label><input name="subtitle" value="${escapeHtml(h.subtitle)}" required /></div>
          <div class="field full"><label>Typed Roles (comma separated)</label><input name="typedRoles" value="${escapeHtml((h.typedRoles || []).join(', '))}" placeholder="Frontend Developer, React Developer" /></div>
          <div class="field full"><label>Description</label><textarea name="description" required>${escapeHtml(h.description)}</textarea></div>
          <div class="field full"><label>"Now" Status (shown as a small badge under the hero — leave blank to hide)</label><input name="nowStatus" value="${escapeHtml(h.nowStatus || '')}" placeholder="e.g. Building a new SaaS dashboard" /></div>
        </div>
        <h3 style="margin-top:var(--sp-5)">Social Links</h3>
        <div id="heroSocialList"></div>
        <button type="button" class="btn btn-outline btn-sm" id="addSocialBtn"><i class="fa-solid fa-plus"></i> Add Social Link</button>
        <div style="margin-top:var(--sp-5)"><button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Hero Section</button></div>
      </form>
    `;
    const listEl = document.getElementById('heroSocialList');
    let socials = structuredClone(h.socialLinks || []);
    function drawSocials() {
      listEl.innerHTML = socials.map((s, i) => `
        <div class="admin-form-grid" style="align-items:end;margin-bottom:var(--sp-3)" data-i="${i}">
          <div class="field"><label>Platform</label><input data-k="platform" value="${escapeHtml(s.platform)}" /></div>
          <div class="field"><label>URL</label><input data-k="url" value="${escapeHtml(s.url)}" /></div>
          <div class="field"><label>Icon class (Font Awesome)</label><input data-k="icon" value="${escapeHtml(s.icon)}" /></div>
          <button type="button" class="btn btn-ghost btn-sm remove-social" style="height:fit-content"><i class="fa-solid fa-trash"></i></button>
        </div>
      `).join('');
      listEl.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
        const row = inp.closest('[data-i]');
        socials[Number(row.dataset.i)][inp.dataset.k] = inp.value;
      }));
      listEl.querySelectorAll('.remove-social').forEach(btn => btn.addEventListener('click', () => {
        const row = btn.closest('[data-i]');
        socials.splice(Number(row.dataset.i), 1);
        drawSocials();
      }));
    }
    drawSocials();
    document.getElementById('addSocialBtn').addEventListener('click', () => {
      socials.push({ platform: '', url: '', icon: 'fa-solid fa-link' });
      drawSocials();
    });
    bindSimpleForm(root, 'heroForm', (fd) => {
      const updated = {
        ...data.hero,
        title: fd.get('title'), subtitle: fd.get('subtitle'), description: fd.get('description'),
        nowStatus: fd.get('nowStatus').trim(),
        typedRoles: fd.get('typedRoles').split(',').map(s => s.trim()).filter(Boolean),
        socialLinks: socials
      };
      DataStore.update('hero', updated);
    });
    bindResetButton('hero', 'Hero Section', renderHero);
  }

  /* ============================ ABOUT ============================ */
  function renderAbout(root) {
    const a = data.about;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>About Section</h2><p>Your story, experience and education summary.</p></div>${resetButtonHtml('About Section')}</div>
      <form id="aboutForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field full"><label>About Text</label><textarea name="text" required>${escapeHtml(a.text)}</textarea></div>
          <div class="field"><label>Experience Summary</label><input name="experienceSummary" value="${escapeHtml(a.experienceSummary)}" /></div>
          <div class="field"><label>Education Summary</label><input name="educationSummary" value="${escapeHtml(a.educationSummary)}" /></div>
        </div>
        <h3 style="margin-top:var(--sp-5)">Stats</h3>
        <div id="statsList"></div>
        <button type="button" class="btn btn-outline btn-sm" id="addStatBtn"><i class="fa-solid fa-plus"></i> Add Stat</button>
        <div style="margin-top:var(--sp-5)"><button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save About Section</button></div>
      </form>
    `;
    let stats = structuredClone(a.stats || []);
    const listEl = document.getElementById('statsList');
    function drawStats() {
      listEl.innerHTML = stats.map((s, i) => `
        <div class="admin-form-grid" style="align-items:end;margin-bottom:var(--sp-3)" data-i="${i}">
          <div class="field"><label>Label</label><input data-k="label" value="${escapeHtml(s.label)}" /></div>
          <div class="field"><label>Value</label><input data-k="value" type="number" value="${s.value}" /></div>
          <button type="button" class="btn btn-ghost btn-sm remove-stat" style="height:fit-content"><i class="fa-solid fa-trash"></i></button>
        </div>
      `).join('');
      listEl.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
        const row = inp.closest('[data-i]');
        const key = inp.dataset.k;
        stats[Number(row.dataset.i)][key] = key === 'value' ? Number(inp.value) : inp.value;
      }));
      listEl.querySelectorAll('.remove-stat').forEach(btn => btn.addEventListener('click', () => {
        stats.splice(Number(btn.closest('[data-i]').dataset.i), 1);
        drawStats();
      }));
    }
    drawStats();
    document.getElementById('addStatBtn').addEventListener('click', () => { stats.push({ label: '', value: 0 }); drawStats(); });
    bindSimpleForm(root, 'aboutForm', (fd) => {
      const updated = { ...data.about, text: fd.get('text'), experienceSummary: fd.get('experienceSummary'), educationSummary: fd.get('educationSummary'), stats };
      DataStore.update('about', updated);
    });
    bindResetButton('about', 'About Section', renderAbout);
  }

  /* ============================ CONTACT ============================ */
  function renderContact(root) {
    const c = data.contact;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Contact Information</h2><p>Shown in the Contact section and footer.</p></div>${resetButtonHtml('Contact Info')}</div>
      <form id="contactForm" class="admin-card card" novalidate>
        <div class="admin-form-grid">
          <div class="field" id="contactPhoneField"><label>Phone</label><input name="phone" value="${escapeHtml(c.phone)}" required /><span class="field-error">Enter a valid phone number (digits, spaces, +, -, () allowed).</span></div>
          <div class="field" id="contactEmailField"><label>Email</label><input name="email" type="email" value="${escapeHtml(c.email)}" required /><span class="field-error">Enter a valid email address.</span></div>
          <div class="field full"><label>Address</label><input name="address" value="${escapeHtml(c.address)}" required /></div>
          <div class="field full"><label>Google Map link (used to embed map)</label><input name="mapEmbed" value="${escapeHtml(c.mapEmbed)}" /></div>
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Contact Info</button>
      </form>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-circle-check" style="color:var(--success)"></i> Availability Status</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">Shown as a badge next to "Let's Work Together" — a quick signal for whether you're currently open to new work.</p>
        <form id="availabilityForm" class="admin-form-grid" style="margin-top:var(--sp-4)">
          <div class="field full">
            <label class="remember-row" style="margin:0">
              <input type="checkbox" name="availabilityEnabled" ${c.availabilityEnabled ? 'checked' : ''} />
              <span>Show the availability badge</span>
            </label>
          </div>
          <div class="field">
            <label>Status</label>
            <select name="availabilityStatus">
              <option value="available" ${c.availabilityStatus === 'available' ? 'selected' : ''}>Available (green)</option>
              <option value="limited" ${c.availabilityStatus === 'limited' ? 'selected' : ''}>Limited availability (amber)</option>
              <option value="unavailable" ${c.availabilityStatus === 'unavailable' ? 'selected' : ''}>Not available (red)</option>
            </select>
          </div>
          <div class="field"><label>Badge Text</label><input name="availabilityText" value="${escapeHtml(c.availabilityText || '')}" placeholder="Available for freelance work" /></div>
          <div class="field full"><label>Response Time (shown under the contact form)</label><input name="responseTime" value="${escapeHtml(c.responseTime || '')}" placeholder="Typically replies within 24 hours" /></div>
          <div class="field full"><button class="btn btn-outline" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Availability</button></div>
        </form>
      </div>
    `;
    const form = document.getElementById('contactForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const phone = fd.get('phone').trim();
      const email = fd.get('email').trim();
      const phoneOk = Validators.phone(phone);
      const emailOk = Validators.email(email);
      document.getElementById('contactPhoneField').classList.toggle('invalid', !phoneOk);
      document.getElementById('contactEmailField').classList.toggle('invalid', !emailOk);
      if (!phoneOk || !emailOk) {
        Toast.error('Check the highlighted fields', 'Phone and email need to be in a valid format — this keeps the tel: and mailto: links on the live site working.');
        return;
      }
      DataStore.update('contact', { ...data.contact, phone, email, address: fd.get('address'), mapEmbed: fd.get('mapEmbed') });
      data = DataStore.get();
      Toast.success('Saved', 'Your changes have been saved.');
    });

    document.getElementById('availabilityForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      DataStore.update('contact', {
        ...data.contact,
        availabilityEnabled: fd.get('availabilityEnabled') === 'on',
        availabilityStatus: fd.get('availabilityStatus'),
        availabilityText: fd.get('availabilityText').trim(),
        responseTime: fd.get('responseTime').trim()
      });
      data = DataStore.get();
      Toast.success('Saved', 'Availability settings saved.');
    });

    bindResetButton('contact', 'Contact Info', renderContact);
  }

  /* ============================ SOCIAL ============================ */
  const SOCIAL_ICON_MAP = {
    facebook: 'fa-brands fa-facebook', github: 'fa-brands fa-github', linkedin: 'fa-brands fa-linkedin',
    youtube: 'fa-brands fa-youtube', instagram: 'fa-brands fa-instagram', twitter: 'fa-brands fa-x-twitter'
  };
  function renderSocial(root) {
    const s = data.social;
    const platforms = Object.keys(SOCIAL_ICON_MAP);
    const filledCount = platforms.filter(p => s[p] && s[p].trim()).length;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Social Media</h2><p>Profile links included in your site's SEO data and your downloadable contact card.</p></div>${resetButtonHtml('Social Media')}</div>
      <div class="admin-card card" style="border-color:var(--accent)">
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin:0 0 var(--sp-4)">
          <i class="fa-solid fa-circle-info" style="color:var(--accent)"></i>
          These links feed the <strong>Person structured data</strong> in your page's &lt;head&gt; (how Google shows your profile in search results) and the <strong>GitHub link on the "Save Contact" vCard</strong>.
          For the social icon buttons visible in the Hero section and footer, edit <strong>Hero Section → Social Links</strong> — or just click below to copy these straight over.
          Currently <strong>${filledCount} of ${platforms.length}</strong> links here are filled in.
        </p>
        <button type="button" class="btn btn-outline btn-sm" id="syncToHeroBtn"><i class="fa-solid fa-arrow-right-arrow-left"></i> Copy Filled Links to Hero Social Links</button>
      </div>
      <form id="socialForm" class="admin-card card">
        <div class="admin-form-grid">
          ${platforms.map(p => `<div class="field"><label><i class="${SOCIAL_ICON_MAP[p]}" style="width:16px;color:var(--text-muted)"></i> ${p === 'twitter' ? 'Twitter / X' : p.charAt(0).toUpperCase() + p.slice(1)}</label><input name="${p}" type="url" value="${escapeHtml(s[p] || '')}" placeholder="https://" /></div>`).join('')}
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Social Links</button>
      </form>
    `;
    bindSimpleForm(root, 'socialForm', (fd) => {
      const updated = {};
      platforms.forEach(p => updated[p] = fd.get(p).trim());
      DataStore.update('social', updated);
    });
    document.getElementById('syncToHeroBtn').addEventListener('click', () => {
      const form = document.getElementById('socialForm');
      const fd = new FormData(form);
      const filled = platforms.filter(p => fd.get(p) && fd.get(p).trim());
      if (!filled.length) {
        Toast.error('Nothing to copy', 'Fill in at least one link above first.');
        return;
      }
      const existing = structuredClone(data.hero.socialLinks || []);
      let added = 0, updatedCount = 0;
      filled.forEach(p => {
        const url = fd.get(p).trim();
        const label = p === 'twitter' ? 'Twitter' : p.charAt(0).toUpperCase() + p.slice(1);
        const match = existing.find(e => e.platform.toLowerCase() === p || e.platform.toLowerCase() === label.toLowerCase());
        if (match) { match.url = url; match.icon = SOCIAL_ICON_MAP[p]; updatedCount++; }
        else { existing.push({ platform: label, url, icon: SOCIAL_ICON_MAP[p] }); added++; }
      });
      DataStore.update('hero', { ...data.hero, socialLinks: existing });
      data = DataStore.get();
      Toast.success('Copied', `Hero Social Links updated — ${added} added, ${updatedCount} updated. Open Hero Section to review.`);
    });
    bindResetButton('social', 'Social Media', renderSocial);
  }

  /* ============================ INTEGRATIONS (EmailJS + Google Sheets) ============================ */
  function integrationStatusBadge(enabled, configured) {
    let color, label;
    if (!enabled) { color = 'var(--text-dim)'; label = 'Disabled'; }
    else if (!configured) { color = 'var(--warning)'; label = 'Enabled — Incomplete'; }
    else { color = 'var(--success)'; label = 'Enabled & Configured'; }
    return `<span style="display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:var(--fs-xs);font-weight:600;color:${color};border:1px solid ${color};padding:2px 10px;border-radius:var(--radius-full);margin-left:var(--sp-3)"><span style="width:6px;height:6px;border-radius:50%;background:${color}"></span>${label}</span>`;
  }

  function renderIntegrations(root) {
    const cfg = data.integrations || { emailjs: {}, googleSheets: {}, whatsapp: {} };
    const ej = cfg.emailjs || {};
    const gs = cfg.googleSheets || {};
    const wa = cfg.whatsapp || {};

    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Integrations</h2><p>Send contact-form submissions to email and/or a Google Sheet, on top of the local Messages inbox.</p></div>${resetButtonHtml('Integrations')}</div>

      <form id="emailjsForm" class="admin-card card">
        <h3><i class="fa-solid fa-envelope"></i> EmailJS — send an email on submit ${integrationStatusBadge(ej.enabled, !!(ej.serviceId && ej.templateId && ej.publicKey))}</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-bottom:var(--sp-4)">
          Create a free account at <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">emailjs.com</a>,
          add an Email Service and a Template, then paste the three IDs below. The template can use
          <code>{{from_name}}</code>, <code>{{reply_to}}</code>, <code>{{subject}}</code> and <code>{{message}}</code> variables.
        </p>
        <label class="remember-row" style="margin-bottom:var(--sp-4)">
          <input type="checkbox" name="enabled" ${ej.enabled ? 'checked' : ''} />
          <span>Enable EmailJS delivery</span>
        </label>
        <div class="admin-form-grid">
          <div class="field"><label>Service ID</label><input name="serviceId" value="${escapeHtml(ej.serviceId || '')}" placeholder="service_xxxxxxx" /></div>
          <div class="field"><label>Template ID</label><input name="templateId" value="${escapeHtml(ej.templateId || '')}" placeholder="template_xxxxxxx" /></div>
          <div class="field full"><label>Public Key</label><input name="publicKey" value="${escapeHtml(ej.publicKey || '')}" placeholder="e.g. AbCdEfGhIjKlMnOp" /></div>
        </div>
        <div class="data-action-row">
          <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save EmailJS Settings</button>
          <button class="btn btn-outline" type="button" id="testEmailBtn"><i class="fa-solid fa-paper-plane"></i> Send Test Email</button>
        </div>
      </form>

      <form id="sheetsForm" class="admin-card card">
        <h3><i class="fa-solid fa-table"></i> Google Sheets — log every submission to a sheet ${integrationStatusBadge(gs.enabled, !!(gs.webAppUrl && gs.webAppUrl.trim()))}</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-bottom:var(--sp-4)">
          Browsers can't write to a Google Sheet directly — you need a small <strong>Google Apps Script Web App</strong>
          in front of it. In your Sheet, open <em>Extensions → Apps Script</em>, paste the script below, deploy it as a
          <em>Web App</em> (Execute as: Me, Who has access: Anyone), then paste the resulting <code>/exec</code> URL here.
          Full steps are in the README.
        </p>
        <pre style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--sp-4);font-size:var(--fs-xs);overflow-x:auto;margin-bottom:var(--sp-4);font-family:var(--font-mono);white-space:pre">function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([data.date, data.name, data.email, data.subject, data.message]);
  return ContentService.createTextOutput(JSON.stringify({result:"success"}))
    .setMimeType(ContentService.MimeType.JSON);
}</pre>
        <label class="remember-row" style="margin-bottom:var(--sp-4)">
          <input type="checkbox" name="enabled" ${gs.enabled ? 'checked' : ''} />
          <span>Enable Google Sheets logging</span>
        </label>
        <div class="field full"><label>Apps Script Web App URL</label><input name="webAppUrl" value="${escapeHtml(gs.webAppUrl || '')}" placeholder="https://script.google.com/macros/s/XXXXXXXX/exec" /></div>
        <div class="data-action-row">
          <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Google Sheets Settings</button>
          <button class="btn btn-outline" type="button" id="testSheetBtn"><i class="fa-solid fa-table"></i> Send Test Row</button>
        </div>
        <p style="color:var(--text-dim);font-size:var(--fs-xs);margin-top:var(--sp-3)"><i class="fa-solid fa-circle-info"></i> Because of how Apps Script Web Apps respond to browsers, this site can't confirm the row was written — check your sheet after testing.</p>
      </form>

      <form id="whatsappForm" class="admin-card card">
        <h3><i class="fa-brands fa-whatsapp" style="color:#25d366"></i> WhatsApp — floating chat button ${integrationStatusBadge(wa.enabled, !!(wa.number && wa.number.trim()))}</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-bottom:var(--sp-4)">Adds a floating WhatsApp button to every page that opens a chat with a pre-filled message.</p>
        <label class="remember-row" style="margin-bottom:var(--sp-4)">
          <input type="checkbox" name="enabled" ${wa.enabled ? 'checked' : ''} />
          <span>Show WhatsApp button</span>
        </label>
        <div class="admin-form-grid">
          <div class="field" id="waNumberField">
            <label>WhatsApp Number (with country code, digits only)</label>
            <input name="number" id="waNumberInput" value="${escapeHtml(wa.number || '')}" placeholder="8801305144356" />
            <span class="field-error">Digits only, with country code, no spaces or symbols (e.g. 8801305144356).</span>
          </div>
          <div class="field"><label>Pre-filled Message</label><input name="message" value="${escapeHtml(wa.message || '')}" /></div>
        </div>
        <div class="data-action-row">
          <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save WhatsApp Settings</button>
          <button class="btn btn-outline" type="button" id="useContactPhoneBtn"><i class="fa-solid fa-copy"></i> Use Phone from Contact Info</button>
        </div>
      </form>
    `;

    document.getElementById('emailjsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      DataStore.update('integrations', {
        ...data.integrations,
        emailjs: {
          enabled: fd.get('enabled') === 'on',
          serviceId: fd.get('serviceId').trim(),
          templateId: fd.get('templateId').trim(),
          publicKey: fd.get('publicKey').trim()
        }
      });
      data = DataStore.get();
      Toast.success('Saved', 'EmailJS settings saved.');
      renderIntegrations(root);
    });

    document.getElementById('sheetsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const enabled = fd.get('enabled') === 'on';
      const webAppUrl = fd.get('webAppUrl').trim();
      if (enabled && webAppUrl && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(webAppUrl)) {
        Toast.error('That doesn\'t look like an Apps Script URL', 'It should start with https://script.google.com/macros/s/ and end with /exec — double-check the deployment URL.');
        return;
      }
      DataStore.update('integrations', {
        ...data.integrations,
        googleSheets: { enabled, webAppUrl }
      });
      data = DataStore.get();
      Toast.success('Saved', 'Google Sheets settings saved.');
      renderIntegrations(root);
    });

    document.getElementById('whatsappForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const enabled = fd.get('enabled') === 'on';
      // Strip everything but digits — WhatsApp's click-to-chat URL needs a
      // plain digit string, and this is more forgiving than rejecting a
      // number just because it was pasted with a "+", spaces, or dashes.
      const number = fd.get('number').replace(/\D/g, '');
      const numberField = document.getElementById('waNumberField');
      if (enabled && !number) {
        numberField.classList.add('invalid');
        Toast.error('WhatsApp number required', 'Enter a number (with country code) before enabling the button.');
        return;
      }
      numberField.classList.remove('invalid');
      DataStore.update('integrations', {
        ...data.integrations,
        whatsapp: { enabled, number, message: fd.get('message').trim() }
      });
      data = DataStore.get();
      Toast.success('Saved', 'WhatsApp settings saved.');
      renderIntegrations(root);
    });

    document.getElementById('useContactPhoneBtn').addEventListener('click', () => {
      const digits = (data.contact.phone || '').replace(/\D/g, '');
      if (!digits) {
        Toast.error('No phone on file', 'Add a phone number in Contact Info first.');
        return;
      }
      document.getElementById('waNumberInput').value = digits;
      document.getElementById('waNumberField').classList.remove('invalid');
      Toast.success('Copied', 'Phone number filled in — review the country code, then save.');
    });

    document.getElementById('testEmailBtn').addEventListener('click', async () => {
      const form = document.getElementById('emailjsForm');
      const serviceId = form.querySelector('[name="serviceId"]').value.trim();
      const templateId = form.querySelector('[name="templateId"]').value.trim();
      const publicKey = form.querySelector('[name="publicKey"]').value.trim();
      if (!serviceId || !templateId || !publicKey) {
        Toast.error('Missing fields', 'Fill in Service ID, Template ID and Public Key first.');
        return;
      }
      if (typeof emailjs === 'undefined') {
        Toast.error('EmailJS unavailable', 'The EmailJS script did not load — check your internet connection.');
        return;
      }
      const btn = document.getElementById('testEmailBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Sending...';
      try {
        await emailjs.send(serviceId, templateId, {
          from_name: 'Admin Test',
          reply_to: data.contact.email,
          subject: 'Test email from Admin Panel',
          message: 'This is a test message sent from the Integrations panel to confirm your EmailJS setup works.'
        }, { publicKey });
        Toast.success('Test email sent', 'Check the inbox tied to your EmailJS template.');
      } catch (err) {
        Toast.error('Send failed', (err && err.text) || 'Check your Service ID, Template ID and Public Key.');
      }
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Test Email';
    });

    document.getElementById('testSheetBtn').addEventListener('click', async () => {
      const form = document.getElementById('sheetsForm');
      const webAppUrl = form.querySelector('[name="webAppUrl"]').value.trim();
      if (!webAppUrl) {
        Toast.error('Missing URL', 'Paste your Apps Script Web App URL first.');
        return;
      }
      const btn = document.getElementById('testSheetBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Sending...';
      try {
        await fetch(webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ date: new Date().toISOString(), name: 'Admin Test', email: 'test@example.com', subject: 'Test row', message: 'Sent from the Integrations panel test button.' })
        });
        Toast.success('Test row sent', "Request sent — open your Google Sheet to confirm a new row appeared.");
      } catch (err) {
        Toast.error('Request failed', 'Could not reach that URL — double check it was deployed correctly.');
      }
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-table"></i> Send Test Row';
    });

    bindResetButton('integrations', 'Integrations', renderIntegrations);
  }

  /* ============================ THEME SETTINGS ============================ */
  function renderTheme(root) {
    const s = data.siteSettings;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Theme Settings</h2><p>Controls the accent colors and font used site-wide.</p></div>${resetButtonHtml('Theme')}</div>
      <form id="themeForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field">
            <label>Primary Color</label>
            <div class="color-field"><input type="color" name="primaryColorPicker" value="${s.primaryColor}" /><input type="text" name="primaryColor" value="${s.primaryColor}" /></div>
          </div>
          <div class="field">
            <label>Secondary Color</label>
            <div class="color-field"><input type="color" name="secondaryColorPicker" value="${s.secondaryColor}" /><input type="text" name="secondaryColor" value="${s.secondaryColor}" /></div>
          </div>
          <div class="field">
            <label>Background Color</label>
            <div class="color-field"><input type="color" name="backgroundColorPicker" value="${s.backgroundColor}" /><input type="text" name="backgroundColor" value="${s.backgroundColor}" /></div>
          </div>
          <div class="field">
            <label>Font Family</label>
            <select name="fontFamily">
              <option value="'Space Grotesk', sans-serif" ${s.fontFamily.includes('Space Grotesk') ? 'selected' : ''}>Space Grotesk</option>
              <option value="'Inter', sans-serif" ${s.fontFamily.includes('Inter') ? 'selected' : ''}>Inter</option>
              <option value="'JetBrains Mono', monospace" ${s.fontFamily.includes('JetBrains') ? 'selected' : ''}>JetBrains Mono</option>
            </select>
          </div>
        </div>
        <p style="color:var(--text-muted);font-size:var(--fs-xs);margin:var(--sp-3) 0 var(--sp-5)"><i class="fa-solid fa-circle-info"></i> Color changes apply live on the public site the next time it loads.</p>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Theme</button>
      </form>
    `;
    root.querySelectorAll('input[type="color"]').forEach(picker => {
      picker.addEventListener('input', () => {
        const textInput = root.querySelector(`input[name="${picker.name.replace('Picker', '')}"]`);
        textInput.value = picker.value;
      });
    });
    bindSimpleForm(root, 'themeForm', (fd) => {
      DataStore.update('siteSettings', { ...data.siteSettings, primaryColor: fd.get('primaryColor'), secondaryColor: fd.get('secondaryColor'), backgroundColor: fd.get('backgroundColor'), fontFamily: fd.get('fontFamily') });
    });
    bindResetButton('siteSettings', 'Theme', renderTheme, ['primaryColor', 'secondaryColor', 'backgroundColor', 'fontFamily']);
  }

  /* ============================ WEBSITE SETTINGS ============================ */
  function renderWebsite(root) {
    const s = data.siteSettings;
    const sv = s.sectionVisibility || {};
    const SECTION_LABELS = {
      about: 'About', skills: 'Skills', clients: 'Worked With (Clients)', projects: 'Projects',
      blog: 'Blog', services: 'Services', experience: 'Experience & Education', certificates: 'Certificates',
      gallery: 'Gallery', testimonials: 'Testimonials', faqs: 'FAQ', contact: 'Contact'
    };
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Website Settings</h2><p>Logo, favicon, site title and footer text.</p></div>${resetButtonHtml('Website Settings')}</div>
      <form id="websiteForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field"><label>Site Title</label><input name="siteTitle" value="${escapeHtml(s.siteTitle)}" required /></div>
          <div class="field"><label>Logo Text</label><input name="logoText" value="${escapeHtml(s.logoText)}" required /></div>
          <div class="field full">
            <label>Favicon</label>
            <div class="image-upload">
              <img class="image-upload-preview" id="faviconPreview" src="${resolveAssetPath(s.favicon)}" alt="Favicon preview" />
              <input type="file" accept="image/*" id="faviconInput" />
            </div>
            <input type="hidden" name="favicon" id="faviconValue" value="${escapeHtml(s.favicon)}" />
          </div>
          <div class="field full"><label>Footer Text</label><input name="footerText" value="${escapeHtml(s.footerText)}" required /></div>
          <div class="field full">
            <label class="remember-row" style="margin:0">
              <input type="checkbox" name="cookieConsentEnabled" ${s.cookieConsentEnabled ? 'checked' : ''} />
              <span>Show the local-storage/privacy notice banner to first-time visitors</span>
            </label>
          </div>
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Website Settings</button>
      </form>

      <div class="admin-card card" style="border-color:var(--warning)">
        <h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--warning)"></i> Maintenance Mode</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">When on, everyone except you (logged in, this browser) sees a simple holding page instead of the site — the admin panel stays reachable either way.</p>
        <form id="maintenanceForm" class="admin-form-grid" style="margin-top:var(--sp-4)">
          <div class="field full">
            <label class="remember-row" style="margin:0">
              <input type="checkbox" name="maintenanceMode" ${s.maintenanceMode ? 'checked' : ''} />
              <span>Show the maintenance page to visitors</span>
            </label>
          </div>
          <div class="field full">
            <label>Message shown to visitors</label>
            <textarea name="maintenanceMessage" rows="2">${escapeHtml(s.maintenanceMessage)}</textarea>
          </div>
          <div class="field full"><button class="btn btn-outline" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Maintenance Settings</button></div>
        </form>
      </div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-eye"></i> Section Visibility</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">Hide a section from the live site without deleting its content — useful while a section isn't ready yet (e.g. no clients or testimonials to show).</p>
        <form id="visibilityForm" style="margin-top:var(--sp-4);display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--sp-3)">
          ${Object.entries(SECTION_LABELS).map(([key, label]) => `
            <label class="remember-row" style="margin:0">
              <input type="checkbox" name="${key}" ${sv[key] !== false ? 'checked' : ''} />
              <span>${escapeHtml(label)}</span>
            </label>
          `).join('')}
          <div style="grid-column:1/-1"><button class="btn btn-outline" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Section Visibility</button></div>
        </form>
      </div>
    `;
    document.getElementById('faviconInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await fileToBase64(file);
      document.getElementById('faviconPreview').src = b64;
      document.getElementById('faviconValue').value = b64;
    });
    bindSimpleForm(root, 'websiteForm', (fd) => {
      DataStore.update('siteSettings', { ...data.siteSettings, siteTitle: fd.get('siteTitle'), logoText: fd.get('logoText'), favicon: fd.get('favicon'), footerText: fd.get('footerText'), cookieConsentEnabled: fd.get('cookieConsentEnabled') === 'on' });
    });
    bindSimpleForm(root, 'maintenanceForm', (fd) => {
      DataStore.update('siteSettings', { ...data.siteSettings, maintenanceMode: fd.get('maintenanceMode') === 'on', maintenanceMessage: fd.get('maintenanceMessage') });
    });
    bindSimpleForm(root, 'visibilityForm', (fd) => {
      const sectionVisibility = {};
      Object.keys(SECTION_LABELS).forEach(key => { sectionVisibility[key] = fd.get(key) === 'on'; });
      DataStore.update('siteSettings', { ...data.siteSettings, sectionVisibility });
    });
    bindResetButton('siteSettings', 'Website Settings', renderWebsite, ['siteTitle', 'logoText', 'favicon', 'footerText', 'cookieConsentEnabled']);
  }

  /* ============================ TESTIMONIAL REQUESTS (visitor submissions) ============================ */
  function renderPendingTestimonials(root) {
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Testimonial Requests</h2><p>Submitted from the "Share Your Experience" form on the public site. Approve to publish, or reject to discard.</p></div></div>
      <div id="pendingList"></div>
    `;
    const listEl = document.getElementById('pendingList');
    function draw() {
      const items = data.pendingTestimonials || [];
      listEl.innerHTML = items.map(t => `
        <div class="message-item card" data-id="${t.id}">
          <div style="flex:1">
            <div class="message-meta">${escapeHtml(t.name)} · ${escapeHtml(t.role)} · ${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)} · ${fmtDate(t.submittedAt)}</div>
            <div class="message-body">${escapeHtml(t.text)}</div>
          </div>
          <div class="admin-row-actions">
            <button class="approve-item" title="Approve & publish"><i class="fa-solid fa-check"></i></button>
            <button class="danger reject-item" title="Reject"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
      `).join('') || `<div class="admin-empty card"><i class="fa-solid fa-user-clock"></i>No pending testimonial requests.</div>`;

      listEl.querySelectorAll('.approve-item').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        const item = (data.pendingTestimonials || []).find(t => t.id === id);
        if (!item) return;
        DataStore.addItem('testimonials', { name: item.name, role: item.role, text: item.text, rating: item.rating, photo: item.photo });
        DataStore.deleteItem('pendingTestimonials', id);
        data = DataStore.get();
        Toast.success('Approved', 'Testimonial published to the site.');
        draw();
        updateMsgBadge();
      }));
      listEl.querySelectorAll('.reject-item').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        confirmAction('Reject and discard this testimonial request?', () => {
          DataStore.deleteItem('pendingTestimonials', id);
          data = DataStore.get();
          Toast.success('Rejected', 'Request discarded.');
          draw();
          updateMsgBadge();
        });
      }));
    }
    draw();
  }

  /* ============================ BLOG COMMENTS ============================ */
  function renderComments(root) {
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Comments</h2><p>Submitted from individual blog posts. New comments wait for approval before they appear publicly.</p></div></div>
      <h3 style="margin-bottom:var(--sp-3)">Pending Approval</h3>
      <div id="pendingCommentsList"></div>
      <h3 style="margin:var(--sp-6) 0 var(--sp-3)">Published Comments</h3>
      <div id="publishedCommentsList"></div>
    `;

    function postTitle(postId) {
      const post = (data.blog || []).find(p => p.id === postId || p.slug === postId);
      return post ? post.title : '(post deleted)';
    }

    function draw() {
      const pending = data.pendingComments || [];
      document.getElementById('pendingCommentsList').innerHTML = pending.map(c => `
        <div class="message-item card" data-id="${c.id}">
          <div style="flex:1">
            <div class="message-meta">${escapeHtml(c.name)} · on "${escapeHtml(postTitle(c.postId))}" · ${fmtDate(c.submittedAt)}</div>
            <div class="message-body">${escapeHtml(c.text)}</div>
          </div>
          <div class="admin-row-actions">
            <button class="approve-comment" title="Approve & publish"><i class="fa-solid fa-check"></i></button>
            <button class="danger reject-comment" title="Reject"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
      `).join('') || `<div class="admin-empty card"><i class="fa-solid fa-comment-slash"></i>No comments waiting for approval.</div>`;

      const published = data.comments || [];
      document.getElementById('publishedCommentsList').innerHTML = published.map(c => `
        <div class="message-item card" data-id="${c.id}">
          <div style="flex:1">
            <div class="message-meta">${escapeHtml(c.name)} · on "${escapeHtml(postTitle(c.postId))}" · ${fmtDate(c.submittedAt)}</div>
            <div class="message-body">${escapeHtml(c.text)}</div>
          </div>
          <div class="admin-row-actions">
            <button class="danger delete-comment" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('') || `<div class="admin-empty card"><i class="fa-solid fa-comments"></i>No published comments yet.</div>`;

      document.querySelectorAll('.approve-comment').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        const item = (data.pendingComments || []).find(c => c.id === id);
        if (!item) return;
        DataStore.addItem('comments', { postId: item.postId, name: item.name, text: item.text, submittedAt: item.submittedAt });
        DataStore.deleteItem('pendingComments', id);
        data = DataStore.get();
        Toast.success('Approved', 'Comment published to the post.');
        draw();
        updateMsgBadge();
      }));
      document.querySelectorAll('.reject-comment').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        confirmAction('Reject and discard this comment?', () => {
          DataStore.deleteItem('pendingComments', id);
          data = DataStore.get();
          Toast.success('Rejected', 'Comment discarded.');
          draw();
          updateMsgBadge();
        });
      }));
      document.querySelectorAll('.delete-comment').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        confirmAction('Delete this comment from the live site?', () => {
          DataStore.deleteItem('comments', id);
          data = DataStore.get();
          Toast.success('Deleted', 'Comment removed.');
          draw();
        });
      }));
    }
    draw();
  }
  function renderNewsletter(root) {
    const subs = data.newsletterSubscribers || [];
    root.innerHTML = `
      <div class="admin-panel-head">
        <div><h2>Newsletter Subscribers</h2><p>${subs.length} subscriber(s) from the footer signup form.</p></div>
        <button class="btn btn-outline" id="exportSubsBtn"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
      </div>
      <div class="admin-table-wrap card" id="subsTableWrap"></div>
    `;
    function draw() {
      const wrap = document.getElementById('subsTableWrap');
      const list = data.newsletterSubscribers || [];
      if (!list.length) {
        wrap.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-paper-plane"></i>No subscribers yet.</div>`;
        return;
      }
      wrap.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Email</th><th>Subscribed</th><th style="text-align:right">Actions</th></tr></thead>
          <tbody>
            ${list.map(s => `
              <tr data-id="${s.id}">
                <td>${escapeHtml(s.email)}</td>
                <td>${fmtDate(s.date)}</td>
                <td><div class="admin-row-actions"><button class="danger delete-sub" title="Remove"><i class="fa-solid fa-trash"></i></button></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      wrap.querySelectorAll('.delete-sub').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        confirmAction('Remove this subscriber?', () => {
          DataStore.deleteItem('newsletterSubscribers', id);
          data = DataStore.get();
          Toast.success('Removed', 'Subscriber deleted.');
          draw();
        });
      }));
    }
    draw();

    document.getElementById('exportSubsBtn').addEventListener('click', () => {
      const list = data.newsletterSubscribers || [];
      if (!list.length) { Toast.error('Nothing to export', 'There are no subscribers yet.'); return; }
      const csv = ['email,date', ...list.map(s => `${s.email},${s.date}`)].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'newsletter-subscribers.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Toast.success('Exported', 'CSV file downloaded.');
    });
  }

  /* ============================ MESSAGES ============================ */
  function renderMessages(root) {
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Contact Messages</h2><p>${data.messages.length} total, ${data.messages.filter(m => !m.read).length} unread.</p></div></div>
      <div id="messagesList"></div>
    `;
    const listEl = document.getElementById('messagesList');
    function draw() {
      listEl.innerHTML = data.messages.map(m => `
        <div class="message-item card ${m.read ? '' : 'unread'}" data-id="${m.id}">
          <div style="flex:1">
            <div class="message-meta">${!m.read ? '<span class="unread-dot"></span>' : ''}${escapeHtml(m.name)} · ${escapeHtml(m.email)} · ${fmtDate(m.date)}</div>
            <div class="message-subject">${escapeHtml(m.subject)}</div>
            <div class="message-body">${escapeHtml(m.message)}</div>
          </div>
          <div class="admin-row-actions">
            ${!m.read ? `<button class="mark-read" title="Mark as read"><i class="fa-solid fa-envelope-open"></i></button>` : ''}
            <button class="danger delete-msg" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('') || `<div class="admin-empty card"><i class="fa-solid fa-inbox"></i>No messages yet.</div>`;

      listEl.querySelectorAll('.mark-read').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        const msg = data.messages.find(m => m.id === id);
        msg.read = true;
        DataStore.update('messages', data.messages);
        data = DataStore.get();
        draw();
        updateMsgBadge();
      }));
      listEl.querySelectorAll('.delete-msg').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-id]').dataset.id;
        confirmAction('Delete this message? This cannot be undone.', () => {
          DataStore.deleteItem('messages', id);
          data = DataStore.get();
          draw();
          updateMsgBadge();
          Toast.success('Deleted', 'Message removed.');
        });
      }));
    }
    draw();
  }

  /* ============================ ANALYTICS ============================ */
  function renderAnalytics(root) {
    const an = data.analytics;
    const max = Math.max(...an.popularPages.map(p => p.views), 1);
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Analytics</h2><p>Basic visitor tracking stored locally in this browser.</p></div></div>
      <div class="stat-cards-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card card"><div class="stat-icon"><i class="fa-solid fa-users"></i></div><div class="stat-value">${an.visitors}</div><div class="stat-label">Visitor Counter</div></div>
        <div class="stat-card card"><div class="stat-icon"><i class="fa-solid fa-eye"></i></div><div class="stat-value">${an.pageViews}</div><div class="stat-label">Page Views</div></div>
        <div class="stat-card card"><div class="stat-icon"><i class="fa-solid fa-ranking-star"></i></div><div class="stat-value">${an.popularPages.length}</div><div class="stat-label">Tracked Pages</div></div>
      </div>
      <div class="admin-card card">
        <h3><i class="fa-solid fa-chart-simple"></i> Popular Pages</h3>
        ${an.popularPages.map(p => `
          <div class="bar-row">
            <span class="bar-label">${escapeHtml(p.page)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${(p.views / max) * 100}%"></div></div>
            <span class="bar-value">${p.views}</span>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-outline btn-sm" id="resetAnalyticsBtn"><i class="fa-solid fa-rotate-left"></i> Reset Analytics</button>
    `;
    document.getElementById('resetAnalyticsBtn').addEventListener('click', () => {
      confirmAction('Reset all analytics data?', () => {
        DataStore.update('analytics', { visitors: 0, pageViews: 0, popularPages: an.popularPages.map(p => ({ page: p.page, views: 0 })) });
        data = DataStore.get();
        renderAnalytics(root);
        Toast.success('Reset', 'Analytics data cleared.');
      });
    });
  }

  /* ============================ DATA MANAGEMENT (Export / Import / Reset) ============================ */
  function renderStorageUsageCard() {
    const card = document.getElementById('storageUsageCard');
    if (!card) return;
    const usage = StorageUsage.breakdown();
    const isWarning = usage.percent >= 70;
    card.innerHTML = `
      <h3><i class="fa-solid fa-database"></i> Storage Usage</h3>
      <p style="color:var(--text-muted);font-size:var(--fs-sm)">Everything is stored in this browser's local storage, which has a limited quota (mostly used up by images uploaded through the admin panel).</p>
      <div class="storage-meter-track"><div class="storage-meter-fill ${isWarning ? 'warning' : ''}" style="width:${usage.percent}%"></div></div>
      <p style="font-family:var(--font-mono);font-size:var(--fs-xs);color:var(--text-dim);margin-bottom:var(--sp-3)">
        ${StorageUsage.formatBytes(usage.total)} used of an estimated ${StorageUsage.formatBytes(usage.quota)} typical quota (${usage.percent.toFixed(1)}%)
      </p>
      ${isWarning ? `<p style="color:var(--warning);font-size:var(--fs-xs);margin-bottom:var(--sp-3)"><i class="fa-solid fa-triangle-exclamation"></i> Getting close to the limit — consider removing unused gallery/project images, or exporting a backup and trimming older content.</p>` : ''}
      <details>
        <summary style="cursor:pointer;color:var(--accent);font-family:var(--font-mono);font-size:var(--fs-xs)">Show breakdown by item</summary>
        <ul class="storage-breakdown-list" style="margin-top:var(--sp-3)">
          ${usage.items.slice(0, 10).map(i => `<li><span>${escapeHtml(i.key)}</span><span>${StorageUsage.formatBytes(i.bytes)}</span></li>`).join('')}
        </ul>
      </details>
    `;
  }

  function renderDataManagement(root) {
    const counts = ['projects', 'skills', 'experience', 'education', 'certificates', 'gallery', 'services', 'clients', 'testimonials', 'pendingTestimonials', 'blog', 'comments', 'pendingComments', 'faqs', 'messages', 'newsletterSubscribers'];
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Data Management</h2><p>Back up, restore, or reset everything stored in this browser.</p></div></div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-chart-simple"></i> Current Data Summary</h3>
        <div class="data-summary-grid">
          ${counts.map(k => `<div><strong>${data[k].length}</strong>${k}</div>`).join('')}
        </div>
      </div>

      <div class="admin-card card" id="storageUsageCard"></div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-download"></i> Export Backup</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">Downloads everything — profile, projects, skills, blog, messages, settings — as a single JSON file you can keep as a backup or move to another browser.</p>
        <p style="color:var(--text-dim);font-size:var(--fs-xs);font-family:var(--font-mono);margin-bottom:var(--sp-3)">
          ${BackupTracker.daysSinceLastExport() === null ? 'No backup exported yet.' : `Last backup: ${BackupTracker.daysSinceLastExport()} day(s) ago.`}
        </p>
        <div class="data-action-row">
          <button class="btn btn-primary" id="exportBtn"><i class="fa-solid fa-file-export"></i> Export JSON Backup</button>
        </div>
      </div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-upload"></i> Import Backup</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">Restores content from a previously exported JSON file. This replaces everything currently stored in this browser.</p>
        <div class="data-action-row">
          <input type="file" accept="application/json" id="importFile" />
          <button class="btn btn-outline" id="importBtn"><i class="fa-solid fa-file-import"></i> Import & Replace</button>
        </div>
      </div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-rss"></i> Blog RSS Feed</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">The site ships with a static <code>rss.xml</code> that lists your blog posts. It doesn't update itself — after adding, editing, or removing a post, generate a fresh copy here and re-upload it to your host (replacing the existing <code>rss.xml</code> file).</p>
        <div class="data-action-row">
          <button class="btn btn-outline" id="generateRssBtn"><i class="fa-solid fa-rss"></i> Generate rss.xml</button>
        </div>
      </div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-sitemap"></i> Sitemap</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">Same idea as the RSS feed — <code>sitemap.xml</code> is a static list of URLs for search engines. Regenerate it here (includes every blog post) and re-upload it after content changes.</p>
        <div class="data-action-row">
          <button class="btn btn-outline" id="generateSitemapBtn"><i class="fa-solid fa-sitemap"></i> Generate sitemap.xml</button>
        </div>
      </div>

      <div class="admin-card card" style="border-color:var(--accent)">
        <h3><i class="fa-solid fa-cloud-arrow-up" style="color:var(--accent)"></i> Publish to Live Site</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">Everything above is saved only in <em>this browser</em> — other visitors, and you on another device, still see the content baked into the site's code. To make your changes visible to everyone, generate updated <code>js/data-store.js</code>, <code>rss.xml</code> and <code>sitemap.xml</code> here, replace those three files in your GitHub repo with the downloaded ones, and push. Your private data — inbox messages, newsletter subscribers, and visit counts — is intentionally left out of <code>data-store.js</code>, so it never ends up in a public commit.</p>
        <div class="data-action-row">
          <button class="btn btn-primary" id="publishBtn"><i class="fa-solid fa-cloud-arrow-up"></i> Generate Updated Site Files</button>
        </div>
      </div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i> Reset to Defaults</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm)">Wipes everything in this browser and restores the original sample content. This cannot be undone — export a backup first if you want to keep your changes.</p>
        <div class="data-action-row">
          <button class="btn btn-outline" id="resetDataBtn" style="border-color:var(--danger);color:var(--danger)"><i class="fa-solid fa-rotate-left"></i> Reset All Data</button>
        </div>
      </div>
    `;

    renderStorageUsageCard();

    function buildRssXml() {
      const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const base = 'https://shagarchandro.github.io/shagarchandro-Portfolio';
      const items = (data.blog || []).map(p => `
  <item>
    <title>${esc(p.title)}</title>
    <link>${base}/blog.html?post=${encodeURIComponent(p.slug || p.id)}</link>
    <guid>${base}/blog.html?post=${encodeURIComponent(p.slug || p.id)}</guid>
    <description>${esc(p.excerpt)}</description>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
  </item>`).join('');
      return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(data.siteSettings.siteTitle)} — Blog</title>
  <link>${base}/index.html</link>
  <description>Notes on frontend development, design and building this site.</description>
  <language>en-us</language>${items}
</channel>
</rss>
`;
    }

    function buildSitemapXml() {
      const base = 'https://shagarchandro.github.io/shagarchandro-Portfolio';
      const staticUrls = [
        { loc: `${base}/index.html`, freq: 'weekly', priority: '1.0' },
        { loc: `${base}/blog.html`, freq: 'weekly', priority: '0.7' },
        { loc: `${base}/resume.html`, freq: 'monthly', priority: '0.5' },
        { loc: `${base}/privacy.html`, freq: 'yearly', priority: '0.3' }
      ];
      const blogUrls = (data.blog || []).map(p => ({
        loc: `${base}/blog.html?post=${encodeURIComponent(p.slug || p.id)}`,
        freq: 'monthly',
        priority: '0.6'
      }));
      const all = [...staticUrls, ...blogUrls];
      const body = all.map(u => `
  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('');
      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}
</urlset>
`;
    }

    function downloadTextFile(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    document.getElementById('generateRssBtn').addEventListener('click', () => {
      downloadTextFile('rss.xml', buildRssXml(), 'application/rss+xml');
      Toast.success('Generated', 'rss.xml downloaded — upload it to replace the one on your host.');
    });

    document.getElementById('generateSitemapBtn').addEventListener('click', () => {
      downloadTextFile('sitemap.xml', buildSitemapXml(), 'application/xml');
      Toast.success('Generated', 'sitemap.xml downloaded — upload it to replace the one on your host.');
    });


    document.getElementById('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `portfolio-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      BackupTracker.recordExport();
      Toast.success('Exported', 'Backup file downloaded.');
      renderDataManagement(document.getElementById('adminContent'));
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      const fileInput = document.getElementById('importFile');
      const file = fileInput.files[0];
      if (!file) { Toast.error('No file selected', 'Choose a JSON backup file first.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          // Basic shape check so a random JSON file doesn't silently corrupt the store.
          const requiredKeys = ['profile', 'hero', 'projects', 'skills'];
          const looksValid = requiredKeys.every(k => k in parsed);
          if (!looksValid) throw new Error('Missing expected sections');
          confirmAction('Import this backup and replace all current data?', () => {
            DataStore.set(parsed);
            data = DataStore.get();
            Toast.success('Imported', 'Data restored from backup.');
            renderDataManagement(document.getElementById('adminContent'));
            updateMsgBadge();
          });
        } catch (err) {
          Toast.error('Invalid file', "That doesn't look like a valid portfolio backup file.");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('publishBtn').addEventListener('click', async () => {
      const btn = document.getElementById('publishBtn');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
      try {
        const res = await fetch('../js/data-store.js', { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch failed');
        const sourceText = await res.text();

        const markerStart = '/* === DEFAULT_DATA:START === */';
        const markerEnd = '/* === DEFAULT_DATA:END === */';
        const startIdx = sourceText.indexOf(markerStart);
        const endIdx = sourceText.indexOf(markerEnd);
        if (startIdx === -1 || endIdx === -1) throw new Error('markers missing');

        // Publish everything except private, per-browser runtime data —
        // inbox messages, newsletter subscriber emails, and visit counters
        // stay out of the file so they never end up in a public git commit.
        const publishData = structuredClone(data);
        publishData.messages = [];
        publishData.newsletterSubscribers = [];
        publishData.analytics = {
          visitors: 0,
          pageViews: 0,
          popularPages: (data.analytics?.popularPages || []).map(p => ({ page: p.page, views: 0 }))
        };
        publishData.pendingTestimonials = [];
        publishData.pendingComments = [];

        const newBlock = `${markerStart}\nconst DEFAULT_DATA = ${JSON.stringify(publishData, null, 2)};\n${markerEnd}`;
        const newSource = sourceText.slice(0, startIdx) + newBlock + sourceText.slice(endIdx + markerEnd.length);

        const blob = new Blob([newSource], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data-store.js';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        // Bundle the RSS feed and sitemap in with the same publish action —
        // both go stale the moment a blog post is added/edited/removed, and
        // it's easy to forget to regenerate them separately.
        downloadTextFile('rss.xml', buildRssXml(), 'application/rss+xml');
        downloadTextFile('sitemap.xml', buildSitemapXml(), 'application/xml');

        Toast.success('Generated', '3 files downloaded (data-store.js, rss.xml, sitemap.xml) — replace all three in your GitHub repo, commit, and push. Once GitHub Pages redeploys, everyone sees your changes.');
      } catch (err) {
        Toast.error('Couldn\'t generate file', 'Reload the admin panel and try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    document.getElementById('resetDataBtn').addEventListener('click', () => {
      confirmAction('Reset ALL data to the original defaults? This cannot be undone.', () => {
        data = DataStore.reset();
        Toast.success('Reset complete', 'All data restored to defaults.');
        renderDataManagement(document.getElementById('adminContent'));
        updateMsgBadge();
      });
    });
  }

  /* ============================ SECURITY ============================ */
  function renderSecurity(root) {
    const auth = AuthStore.get();
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Security</h2><p>Change your password and session behavior.</p></div></div>
      <form id="passForm" class="admin-card card">
        <h3>Change Password</h3>
        <div class="admin-form-grid">
          <div class="field full">
            <label>Current Password</label>
            <div class="password-wrap">
              <input type="password" name="currentPass" id="currentPassInput" autocomplete="current-password" required />
              <button type="button" class="pass-toggle" data-toggle-for="currentPassInput" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
            </div>
          </div>
          <div class="field">
            <label>New Password</label>
            <div class="password-wrap">
              <input type="password" name="newPass" id="newPassInput" minlength="8" autocomplete="new-password" required />
              <button type="button" class="pass-toggle" data-toggle-for="newPassInput" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
            </div>
            <div class="pass-strength" id="passStrengthMeter">
              <div class="pass-strength-track"><div class="pass-strength-fill" id="passStrengthFill"></div></div>
              <span class="pass-strength-label" id="passStrengthLabel"></span>
            </div>
          </div>
          <div class="field">
            <label>Confirm New Password</label>
            <div class="password-wrap">
              <input type="password" name="confirmPass" id="confirmPassInput" autocomplete="new-password" required />
              <button type="button" class="pass-toggle" data-toggle-for="confirmPassInput" aria-label="Show password"><i class="fa-solid fa-eye"></i></button>
            </div>
          </div>
        </div>
        <p style="color:var(--text-dim);font-size:var(--fs-xs);margin-bottom:var(--sp-4)"><i class="fa-solid fa-circle-info"></i> Use at least 8 characters, mixing uppercase, lowercase, numbers and symbols for a stronger password.</p>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-key"></i> Update Password</button>
      </form>
      <form id="sessionForm" class="admin-card card">
        <h3>Session Timeout</h3>
        <div class="field" style="max-width:260px"><label>Auto logout after (minutes)</label><input type="number" name="timeout" min="5" max="240" value="${auth.sessionTimeoutMinutes}" /></div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-clock"></i> Save Session Settings</button>
      </form>
      <button class="btn btn-outline" id="securityLogoutBtn"><i class="fa-solid fa-right-from-bracket"></i> Logout Now</button>

      <form id="usernameForm" class="admin-card card">
        <h3>Change Username</h3>
        <div class="admin-form-grid">
          <div class="field"><label>New Username</label><input type="text" name="newUsername" value="${escapeHtml(auth.username)}" required /></div>
          <div class="field"><label>Current Password (to confirm)</label><input type="password" name="confirmPass" autocomplete="current-password" required /></div>
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-user-pen"></i> Update Username</button>
      </form>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-key"></i> Account Recovery Key</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-bottom:var(--sp-4)">
          There's no email or backend here, so a forgotten password normally means permanent lockout. A recovery
          key fixes that: generate one, save it somewhere safe (a password manager, not this browser), and use it
          on the login screen's "Forgot password?" link if you're ever locked out. Generating a new key
          invalidates any previous one.
        </p>
        <p style="font-family:var(--font-mono);font-size:var(--fs-xs);color:${AuthStore.hasRecoveryKey() ? 'var(--success)' : 'var(--text-dim)'};margin-bottom:var(--sp-4)">
          <i class="fa-solid ${AuthStore.hasRecoveryKey() ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
          ${AuthStore.hasRecoveryKey() ? 'A recovery key is currently set.' : 'No recovery key set yet.'}
        </p>
        <div id="recoveryKeyDisplay"></div>
        <button class="btn btn-outline" id="generateRecoveryBtn"><i class="fa-solid fa-key"></i> ${AuthStore.hasRecoveryKey() ? 'Regenerate' : 'Generate'} Recovery Key</button>
      </div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-clock-rotate-left"></i> Recent Login Activity</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-bottom:var(--sp-4)">
          A local record of logins in this browser, so a login you don't recognize stands out. Since this whole
          panel runs without a server, treat it as a convenience log rather than real intrusion protection —
          anyone with access to this browser could clear it.
        </p>
        <div id="loginActivityList"></div>
      </div>

      <div class="admin-card card">
        <h3><i class="fa-solid fa-list-check"></i> Recent Content Activity</h3>
        <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-bottom:var(--sp-4)">
          Every add, edit and delete across Projects, Blog, Skills and the rest of the content sections — a quick
          "what did I just change" trail before you hit Publish.
        </p>
        <div id="contentActivityList"></div>
        <div class="data-action-row" style="margin-top:var(--sp-4)">
          <button class="btn btn-outline btn-sm" id="clearActivityLogBtn"><i class="fa-solid fa-trash"></i> Clear Log</button>
        </div>
      </div>
    `;
    const activity = SecurityLog.list();
    document.getElementById('loginActivityList').innerHTML = activity.length
      ? `<ul class="analytics-list">${activity.map(a => `<li><span>${escapeHtml(a.browser)} · ${escapeHtml(a.platform)}</span><span style="font-family:var(--font-mono);color:var(--text-dim)">${fmtDate(a.date)}</span></li>`).join('')}</ul>`
      : `<div class="admin-empty"><i class="fa-solid fa-clock-rotate-left"></i>No login activity recorded yet.</div>`;

    function renderContentActivity() {
      const log = ActivityLog.list();
      const actionIcon = { added: 'fa-plus', updated: 'fa-pen', deleted: 'fa-trash' };
      const actionVerb = { added: 'Added', updated: 'Updated', deleted: 'Deleted' };
      document.getElementById('contentActivityList').innerHTML = log.length
        ? `<ul class="analytics-list">${log.map(e => `<li><span><i class="fa-solid ${actionIcon[e.action] || 'fa-pen'}" style="width:16px;color:${e.action === 'deleted' ? 'var(--danger)' : e.action === 'added' ? 'var(--success)' : 'var(--text-muted)'}"></i> ${actionVerb[e.action] || e.action} ${escapeHtml(e.section)}: ${escapeHtml(e.name)}</span><span style="font-family:var(--font-mono);color:var(--text-dim)">${fmtDate(e.date)}</span></li>`).join('')}</ul>`
        : `<div class="admin-empty"><i class="fa-solid fa-list-check"></i>No content changes recorded yet.</div>`;
    }
    renderContentActivity();
    document.getElementById('clearActivityLogBtn').addEventListener('click', () => {
      confirmAction('Clear the content activity log? This only clears the log, not your actual content.', () => {
        ActivityLog.clear();
        renderContentActivity();
        Toast.success('Cleared', 'Content activity log cleared.');
      });
    });

    function passwordStrength(pwd) {
      let score = 0;
      if (pwd.length >= 8) score++;
      if (pwd.length >= 12) score++;
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
      if (/\d/.test(pwd)) score++;
      if (/[^A-Za-z0-9]/.test(pwd)) score++;
      // score: 0-5 -> level 0-4 (Weak..Very Strong)
      const levels = [
        { label: 'Too short', pct: 10, color: 'var(--danger)' },
        { label: 'Weak', pct: 30, color: 'var(--danger)' },
        { label: 'Fair', pct: 55, color: 'var(--warning)' },
        { label: 'Good', pct: 75, color: 'var(--accent-2)' },
        { label: 'Strong', pct: 100, color: 'var(--success)' }
      ];
      const idx = pwd.length === 0 ? -1 : Math.min(score, 4);
      return idx === -1 ? null : levels[idx];
    }

    const newPassInput = document.getElementById('newPassInput');
    newPassInput.addEventListener('input', () => {
      const s = passwordStrength(newPassInput.value);
      const fill = document.getElementById('passStrengthFill');
      const label = document.getElementById('passStrengthLabel');
      if (!s) { fill.style.width = '0%'; label.textContent = ''; return; }
      fill.style.width = s.pct + '%';
      fill.style.background = s.color;
      label.textContent = s.label;
      label.style.color = s.color;
    });

    document.getElementById('passForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const current = fd.get('currentPass');
      const p1 = fd.get('newPass'), p2 = fd.get('confirmPass');

      const auth = AuthStore.get();
      const currentOk = await AuthStore.verify(auth.username, current);
      if (!currentOk) { Toast.error('Incorrect password', 'Your current password was not entered correctly.'); return; }

      if (p1 !== p2) { Toast.error('Passwords do not match', 'Please re-enter matching passwords.'); return; }

      const strength = passwordStrength(p1);
      if (!strength || strength.label === 'Too short' || strength.label === 'Weak') {
        Toast.error('Password too weak', 'Use at least 8 characters with a mix of letters, numbers and symbols.');
        return;
      }

      await AuthStore.changePassword(p1);
      Toast.success('Password updated', 'Use your new password next time you log in.');
      e.target.reset();
      document.getElementById('passStrengthFill').style.width = '0%';
      document.getElementById('passStrengthLabel').textContent = '';
    });
    document.getElementById('sessionForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const minutes = Number(new FormData(e.target).get('timeout'));
      const a = AuthStore.get();
      a.sessionTimeoutMinutes = minutes;
      AuthStore.save(a);
      Toast.success('Saved', `Session will now expire after ${minutes} minutes of inactivity.`);
    });
    document.getElementById('securityLogoutBtn').addEventListener('click', () => {
      AuthStore.logout();
      location.reload();
    });

    document.getElementById('usernameForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const newUsername = fd.get('newUsername').trim();
      const confirmPass = fd.get('confirmPass');
      if (!newUsername) { Toast.error('Username required', 'Please enter a username.'); return; }
      const currentAuth = AuthStore.get();
      const ok = await AuthStore.verify(currentAuth.username, confirmPass);
      if (!ok) { Toast.error('Incorrect password', 'Please confirm with your current password.'); return; }
      await AuthStore.changeUsername(newUsername);
      Toast.success('Username updated', `You'll log in as "${newUsername}" next time.`);
      e.target.querySelector('input[name="confirmPass"]').value = '';
    });

    document.getElementById('generateRecoveryBtn').addEventListener('click', () => {
      confirmAction('Generate a new recovery key? Any previous key will stop working.', async () => {
        const key = await AuthStore.generateRecoveryKey();
        document.getElementById('recoveryKeyDisplay').innerHTML = `
          <div class="recovery-key-box">${key}</div>
          <p style="color:var(--danger);font-size:var(--fs-xs);margin-bottom:var(--sp-4)"><i class="fa-solid fa-triangle-exclamation"></i> Save this now — it will not be shown again. Anyone with this key can reset your password.</p>
        `;
        Toast.success('Recovery key generated', 'Copy it somewhere safe right now.');
      });
    });
  }

  /* ============================ CONFIRM DIALOG ============================ */
  function confirmAction(message, onConfirm) {
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmMessage').textContent = message;
    overlay.classList.add('open');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    function cleanup() { overlay.classList.remove('open'); okBtn.removeEventListener('click', onOk); cancelBtn.removeEventListener('click', onCancel); }
    function onOk() { cleanup(); onConfirm(); }
    function onCancel() { cleanup(); }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  }

  /* ============================ RESET-TO-DEFAULT (per settings panel) ============================ */
  /** Markup for a small danger-styled "Reset to Default" button, meant to sit
      in a panel's .admin-panel-head next to the title. */
  function resetButtonHtml(label) {
    return `<button class="btn btn-outline btn-sm" id="resetSectionBtn" style="border-color:var(--danger);color:var(--danger);flex-shrink:0"><i class="fa-solid fa-rotate-left"></i> Reset ${escapeHtml(label)}</button>`;
  }

  /**
   * Wires the button created by resetButtonHtml(). Pass `fields` (an array
   * of field names) to reset only part of a shared section like
   * siteSettings; omit it to reset the whole section.
   */
  function bindResetButton(sectionKey, label, rerender, fields) {
    const btn = document.getElementById('resetSectionBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      confirmAction(`Reset ${label} to its original default values? Your current changes here will be lost — this doesn't affect any other section.`, () => {
        if (fields) DataStore.resetFields(sectionKey, fields);
        else DataStore.resetSection(sectionKey);
        data = DataStore.get();
        Toast.success('Reset', `${label} restored to defaults.`);
        rerender(document.getElementById('adminContent'));
      });
    });
  }

  /* ============================ GENERIC CRUD ENGINE ============================ */
  const skillsConfig = {
    label: 'Skill', labelPlural: 'Skills', reorderable: true,
    fields: [
      { key: 'name', label: 'Skill Name', type: 'text', required: true },
      { key: 'percentage', label: 'Percentage (0-100)', type: 'number', min: 0, max: 100, required: true },
      { key: 'icon', label: 'Icon class (Font Awesome, e.g. fa-brands fa-react)', type: 'text', required: true },
      { key: 'category', label: 'Category (optional — shown as a filter chip)', type: 'text', placeholder: 'e.g. Frontend, Backend, Tools' }
    ],
    columns: [
      { key: 'icon', label: '', render: v => `<i class="${escapeHtml(v)}" style="color:var(--accent)"></i>` },
      { key: 'name', label: 'Name' },
      { key: 'percentage', label: 'Level', render: v => `${v}%` },
      { key: 'category', label: 'Category' }
    ]
  };

  const projectsConfig = {
    label: 'Project', labelPlural: 'Projects', reorderable: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'image', label: 'Project Image', type: 'image' },
      { key: 'liveLink', label: 'Live Link', type: 'url' },
      { key: 'githubLink', label: 'GitHub Link', type: 'url' },
      { key: 'challenge', label: 'Challenge (shown in the project case-study modal)', type: 'textarea' },
      { key: 'solution', label: 'Solution (shown in the project case-study modal)', type: 'textarea' },
      { key: 'techStack', label: 'Tech Stack (comma separated)', type: 'text', placeholder: 'HTML, CSS, JavaScript' }
    ],
    columns: [
      { key: 'image', label: '', type: 'image' },
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' }
    ]
  };

  const experienceConfig = {
    label: 'Experience', labelPlural: 'Experience', reorderable: true,
    fields: [
      { key: 'role', label: 'Role', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text', required: true },
      { key: 'duration', label: 'Duration', type: 'text', required: true, placeholder: '2024 — Present' },
      { key: 'description', label: 'Description', type: 'textarea', required: true }
    ],
    columns: [{ key: 'role', label: 'Role' }, { key: 'company', label: 'Company' }, { key: 'duration', label: 'Duration' }]
  };

  const educationConfig = {
    label: 'Education', labelPlural: 'Education', reorderable: true,
    fields: [
      { key: 'degree', label: 'Degree', type: 'text', required: true },
      { key: 'institute', label: 'Institute', type: 'text', required: true },
      { key: 'duration', label: 'Duration', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true }
    ],
    columns: [{ key: 'degree', label: 'Degree' }, { key: 'institute', label: 'Institute' }, { key: 'duration', label: 'Duration' }]
  };

  const certificatesConfig = {
    label: 'Certificate', labelPlural: 'Certificates', reorderable: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'issuer', label: 'Issuer', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'text', required: true },
      { key: 'image', label: 'Certificate Image', type: 'image' },
      { key: 'link', label: 'Verification Link', type: 'url' }
    ],
    columns: [{ key: 'image', label: '', type: 'image' }, { key: 'title', label: 'Title' }, { key: 'issuer', label: 'Issuer' }, { key: 'date', label: 'Date' }]
  };

  const galleryConfig = {
    label: 'Image', labelPlural: 'Gallery', reorderable: true,
    fields: [
      { key: 'image', label: 'Image', type: 'image', required: true },
      { key: 'caption', label: 'Caption', type: 'text', required: true },
      { key: 'category', label: 'Category (optional — shown as a filter chip)', type: 'text', placeholder: 'e.g. Events, Life, Workspace' }
    ],
    columns: [{ key: 'image', label: '', type: 'image' }, { key: 'caption', label: 'Caption' }, { key: 'category', label: 'Category' }]
  };

  const servicesConfig = {
    label: 'Service', labelPlural: 'Services', reorderable: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'icon', label: 'Icon class (Font Awesome)', type: 'text', required: true }
    ],
    columns: [
      { key: 'icon', label: '', render: v => `<i class="${escapeHtml(v)}" style="color:var(--accent)"></i>` },
      { key: 'title', label: 'Title' }
    ]
  };

  const clientsConfig = {
    label: 'Client', labelPlural: 'Clients', reorderable: true,
    fields: [
      { key: 'name', label: 'Client / Company Name', type: 'text', required: true },
      { key: 'logo', label: 'Logo', type: 'image', required: true },
      { key: 'url', label: 'Website URL (optional — makes the logo clickable)', type: 'url' }
    ],
    columns: [
      { key: 'logo', label: '', type: 'image' },
      { key: 'name', label: 'Name' }
    ]
  };

  const testimonialsConfig = {
    label: 'Testimonial', labelPlural: 'Testimonials', reorderable: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role / Company', type: 'text', required: true },
      { key: 'photo', label: 'Photo', type: 'image' },
      { key: 'text', label: 'Testimonial Text', type: 'textarea', required: true },
      { key: 'rating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5, required: true }
    ],
    columns: [{ key: 'photo', label: '', type: 'image' }, { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'rating', label: 'Rating', render: v => '★'.repeat(v) }]
  };

  const blogConfig = {
    label: 'Post', labelPlural: 'Blog Posts', reorderable: false,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug (used in the URL, e.g. my-first-post)', type: 'text', required: true, placeholder: 'my-first-post' },
      { key: 'date', label: 'Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
      { key: 'tags', label: 'Tags (comma separated)', type: 'text', placeholder: 'JavaScript, CSS' },
      { key: 'cover', label: 'Cover Image', type: 'image' },
      { key: 'excerpt', label: 'Excerpt (short summary shown on the card)', type: 'textarea', required: true },
      { key: 'content', label: 'Full Content (blank lines start a new paragraph)', type: 'textarea', required: true }
    ],
    columns: [
      { key: 'cover', label: '', type: 'image' },
      { key: 'title', label: 'Title' },
      { key: 'date', label: 'Date' },
      { key: 'slug', label: 'Slug', render: v => `<span style="font-family:var(--font-mono);color:var(--text-dim)">/${escapeHtml(v)}</span>` }
    ]
  };

  const faqsConfig = {
    label: 'Question', labelPlural: 'FAQ', reorderable: true,
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true }
    ],
    columns: [{ key: 'question', label: 'Question' }]
  };

  function renderCrud(sectionKey, config) {
    const root = document.getElementById('adminContent');
    const isGallery = sectionKey === 'gallery';
    root.innerHTML = `
      <div class="admin-panel-head">
        <div><h2>${config.labelPlural}</h2><p>${data[sectionKey].length} item(s)${config.reorderable ? ' · drag the ⠿ handle to reorder' : ''}</p></div>
        <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap">
          ${isGallery ? `
            <button class="btn btn-outline" id="bulkUploadBtn"><i class="fa-solid fa-images"></i> Add Your Own Photos</button>
            <input type="file" accept="image/*" multiple id="bulkUploadInput" hidden />
          ` : ''}
          <button class="btn btn-primary" id="addItemBtn"><i class="fa-solid fa-plus"></i> Add ${config.label}</button>
        </div>
      </div>
      <div class="admin-toolbar">
        <div class="admin-search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="crudSearchInput" placeholder="Search ${config.labelPlural.toLowerCase()}..." />
        </div>
        <div class="admin-bulk-bar" id="bulkBar" hidden>
          <span id="bulkCount"></span>
          <button class="btn btn-outline btn-sm" id="bulkDeleteBtn" style="border-color:var(--danger);color:var(--danger)"><i class="fa-solid fa-trash"></i> Delete Selected</button>
          <button class="btn btn-ghost btn-sm" id="bulkClearBtn">Clear</button>
        </div>
      </div>
      <div class="admin-table-wrap card" id="crudTableWrap"></div>
    `;

    let query = '';
    let selected = new Set();

    function matchesQuery(item) {
      if (!query) return true;
      const haystack = config.columns.map(c => item[c.key]).concat(Object.values(item)).join(' ').toLowerCase();
      return haystack.includes(query.toLowerCase());
    }

    function updateBulkBar() {
      const bar = document.getElementById('bulkBar');
      const count = document.getElementById('bulkCount');
      bar.hidden = selected.size === 0;
      count.textContent = `${selected.size} selected`;
    }

    function draw() {
      const allItems = data[sectionKey];
      const items = allItems.filter(matchesQuery);
      const wrap = document.getElementById('crudTableWrap');
      const filtering = query.length > 0;

      if (!allItems.length) {
        wrap.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-folder-open"></i>No ${config.labelPlural.toLowerCase()} yet. Click "Add ${config.label}" to create one.</div>`;
        return;
      }
      if (!items.length) {
        wrap.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-magnifying-glass"></i>No ${config.labelPlural.toLowerCase()} match "${escapeHtml(query)}".</div>`;
        return;
      }

      const canReorder = config.reorderable && !filtering;
      wrap.innerHTML = `
        <table class="admin-table">
          <thead><tr>
            <th style="width:32px"><input type="checkbox" id="selectAllBox" aria-label="Select all" /></th>
            ${canReorder ? '<th style="width:36px"></th>' : ''}
            ${config.columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}
            <th style="text-align:right">Actions</th>
          </tr></thead>
          <tbody>
            ${items.map(item => `
              <tr data-id="${item.id}" ${canReorder ? 'draggable="true"' : ''}>
                <td><input type="checkbox" class="row-select" data-id="${item.id}" ${selected.has(item.id) ? 'checked' : ''} aria-label="Select row" /></td>
                ${canReorder ? '<td class="drag-handle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></td>' : ''}
                ${config.columns.map(c => {
                  const val = item[c.key];
                  if (c.type === 'image') return `<td><img class="admin-thumb" src="${resolveAssetPath(val) || ''}" alt="" /></td>`;
                  if (c.render) return `<td>${c.render(val)}</td>`;
                  return `<td>${escapeHtml(String(val ?? ''))}</td>`;
                }).join('')}
                <td>
                  <div class="admin-row-actions">
                    <button class="duplicate-item" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
                    <button class="edit-item" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="danger delete-item" title="Delete"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      wrap.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        openCrudModal(sectionKey, config, allItems.find(i => i.id === id), draw);
      }));
      wrap.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        confirmAction(`Delete this ${config.label.toLowerCase()}? This cannot be undone.`, () => {
          DataStore.deleteItem(sectionKey, id);
          data = DataStore.get();
          selected.delete(id);
          Toast.success('Deleted', `${config.label} removed.`);
          draw();
          updateBulkBar();
          updateMsgBadge();
        });
      }));
      wrap.querySelectorAll('.duplicate-item').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        const original = allItems.find(i => i.id === id);
        if (!original) return;
        const clone = { ...original };
        delete clone.id;
        // Give an obvious "(Copy)" marker on whichever field the table shows first as a title-like column.
        const titleKey = (config.columns.find(c => !c.type && !c.render) || {}).key;
        if (titleKey && typeof clone[titleKey] === 'string') clone[titleKey] = `${clone[titleKey]} (Copy)`;
        DataStore.addItem(sectionKey, clone);
        data = DataStore.get();
        Toast.success('Duplicated', `${config.label} duplicated — edit the copy to make changes.`);
        draw();
      }));

      wrap.querySelectorAll('.row-select').forEach(box => box.addEventListener('change', () => {
        const id = box.dataset.id;
        if (box.checked) selected.add(id); else selected.delete(id);
        updateBulkBar();
        const allBox = document.getElementById('selectAllBox');
        if (allBox) allBox.checked = items.every(i => selected.has(i.id));
      }));
      const selectAllBox = document.getElementById('selectAllBox');
      if (selectAllBox) {
        selectAllBox.checked = items.length > 0 && items.every(i => selected.has(i.id));
        selectAllBox.addEventListener('change', () => {
          if (selectAllBox.checked) items.forEach(i => selected.add(i.id));
          else items.forEach(i => selected.delete(i.id));
          draw();
          updateBulkBar();
        });
      }

      if (canReorder) bindRowDragReorder(wrap, sectionKey, draw);
      updateBulkBar();
    }

    draw();
    document.getElementById('addItemBtn').addEventListener('click', () => openCrudModal(sectionKey, config, null, draw));

    if (isGallery) {
      const bulkInput = document.getElementById('bulkUploadInput');
      document.getElementById('bulkUploadBtn').addEventListener('click', () => bulkInput.click());
      bulkInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const btn = document.getElementById('bulkUploadBtn');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        let added = 0;
        try {
          for (let i = 0; i < files.length; i++) {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${i + 1} of ${files.length}...`;
            const file = files[i];
            const b64 = await fileToBase64(file);
            // A friendly default caption from the filename ("my-trip-2026.jpg"
            // → "My Trip 2026") — quicker than typing one for every photo,
            // and still editable afterwards from the table.
            const caption = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Photo';
            DataStore.addItem('gallery', { image: b64, caption, category: '' });
            added++;
          }
          Toast.success('Added', `${added} photo${added === 1 ? '' : 's'} added to the gallery.`);
        } catch (err) {
          // Everything here lives in localStorage (no server), which most
          // browsers cap around 5-10MB total — large or many photos as
          // base64 can realistically hit that. Whatever uploaded before
          // the limit hit is kept; the rest just didn't make it in.
          Toast.error(
            'Ran out of local storage space',
            added > 0
              ? `Added ${added} of ${files.length} before running out of room. Use Admin → Data Management to check usage, or try smaller images / fewer at once.`
              : "Couldn't add any — try smaller images, fewer at once, or check storage usage in Data Management."
          );
        } finally {
          data = DataStore.get();
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          bulkInput.value = '';
          draw();
        }
      });
    }

    document.getElementById('crudSearchInput').addEventListener('input', (e) => {
      query = e.target.value.trim();
      draw();
    });

    document.getElementById('bulkClearBtn').addEventListener('click', () => {
      selected.clear();
      draw();
    });
    document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
      const count = selected.size;
      confirmAction(`Delete ${count} selected ${count === 1 ? config.label.toLowerCase() : config.labelPlural.toLowerCase()}? This cannot be undone.`, () => {
        selected.forEach(id => DataStore.deleteItem(sectionKey, id));
        data = DataStore.get();
        Toast.success('Deleted', `${count} item(s) removed.`);
        selected.clear();
        draw();
        updateMsgBadge();
      });
    });
  }

  /* Native HTML5 drag-and-drop row reordering for CRUD tables. On drop, the
     new visual order of <tr> ids is read back and saved as the section's
     new array order — the public site then renders in that same order. */
  function bindRowDragReorder(wrap, sectionKey, onReordered) {
    const tbody = wrap.querySelector('tbody');
    let draggedRow = null;

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('dragstart', (e) => {
        // Don't start a row-drag when the user is interacting with a checkbox/button in the row.
        if (e.target.closest('input, button')) { e.preventDefault(); return; }
        draggedRow = row;
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        draggedRow = null;
        const newOrderIds = [...tbody.querySelectorAll('tr')].map(r => r.dataset.id);
        const items = data[sectionKey];
        const reordered = newOrderIds.map(id => items.find(i => i.id === id)).filter(Boolean);
        if (reordered.length === items.length) {
          DataStore.update(sectionKey, reordered);
          data = DataStore.get();
        }
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedRow || draggedRow === row) return;
        const rect = row.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        row.parentNode.insertBefore(draggedRow, before ? row : row.nextSibling);
      });
    });
  }

  function openCrudModal(sectionKey, config, existingItem, onDone) {
    const overlay = document.getElementById('modalOverlay');
    const form = document.getElementById('modalForm');
    document.getElementById('modalTitle').textContent = existingItem ? `Edit ${config.label}` : `Add ${config.label}`;

    form.innerHTML = config.fields.map(f => {
      const val = existingItem ? existingItem[f.key] : '';
      if (f.type === 'textarea') {
        return `<div class="field full"><label>${escapeHtml(f.label)}</label><textarea data-key="${f.key}" ${f.required ? 'required' : ''}>${escapeHtml(val || '')}</textarea></div>`;
      }
      if (f.type === 'image') {
        return `
          <div class="field full">
            <label>${escapeHtml(f.label)}</label>
            <div class="image-upload">
              <img class="image-upload-preview" data-preview="${f.key}" src="${resolveAssetPath(val) || ''}" alt="" />
              <input type="file" accept="image/*" data-file="${f.key}" />
            </div>
            <input type="hidden" data-key="${f.key}" value="${escapeHtml(val || '')}" />
          </div>`;
      }
      if (f.type === 'number') {
        return `<div class="field"><label>${escapeHtml(f.label)}</label><input type="number" data-key="${f.key}" value="${val ?? ''}" min="${f.min ?? ''}" max="${f.max ?? ''}" ${f.required ? 'required' : ''} /></div>`;
      }
      return `<div class="field"><label>${escapeHtml(f.label)}</label><input type="${f.type === 'url' ? 'url' : 'text'}" data-key="${f.key}" value="${escapeHtml(val || '')}" placeholder="${escapeHtml(f.placeholder || '')}" ${f.required ? 'required' : ''} /></div>`;
    }).join('');

    form.querySelectorAll('[data-file]').forEach(fileInput => {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const b64 = await fileToBase64(file);
        const key = fileInput.dataset.file;
        form.querySelector(`[data-preview="${key}"]`).src = b64;
        form.querySelector(`input[type="hidden"][data-key="${key}"]`).value = b64;
      });
    });

    overlay.classList.add('open');

    function closeModal() {
      overlay.classList.remove('open');
      form.onsubmit = null;
    }
    document.getElementById('modalClose').onclick = closeModal;
    document.getElementById('modalCancel').onclick = closeModal;

    form.onsubmit = (e) => {
      e.preventDefault();
      const item = {};
      let missing = null;
      config.fields.forEach(f => {
        const el = form.querySelector(`[data-key="${f.key}"]`);
        item[f.key] = f.type === 'number' ? Number(el.value) : el.value;
        // Image fields use a hidden input, so the browser's native "required"
        // validation never sees them — check those explicitly.
        if (f.type === 'image' && f.required && !el.value) missing = f.label;
      });
      if (missing) {
        Toast.error('Missing image', `Please upload an image for "${missing}".`);
        return;
      }
      if (existingItem) {
        DataStore.updateItem(sectionKey, existingItem.id, item);
        Toast.success('Updated', `${config.label} updated successfully.`);
      } else {
        DataStore.addItem(sectionKey, item);
        Toast.success('Added', `${config.label} added successfully.`);
      }
      data = DataStore.get();
      closeModal();
      onDone();
      updateMsgBadge();
    };
  }

  // Close modal on overlay click
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') e.target.classList.remove('open');
  });
})();
