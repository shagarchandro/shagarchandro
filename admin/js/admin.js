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

    const btn = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Signing in...';

    const valid = await AuthStore.verify(username, password);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In';

    if (!valid) {
      Toast.error('Login failed', 'Incorrect username or password.');
      passField.classList.add('invalid');
      return;
    }
    AuthStore.startSession(remember);
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
    else { loginScreen.hidden = false; adminApp.hidden = true; }
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
    certificates: 'Certificates', gallery: 'Gallery', services: 'Services', testimonials: 'Testimonials',
    contact: 'Contact Information', social: 'Social Media', messages: 'Messages',
    theme: 'Theme Settings', website: 'Website Settings', analytics: 'Analytics', security: 'Security'
  };

  const viewRenderers = {
    dashboard: renderDashboard, profile: renderProfile, hero: renderHero, about: renderAbout,
    skills: () => renderCrud('skills', skillsConfig), projects: () => renderCrud('projects', projectsConfig),
    experience: () => renderCrud('experience', experienceConfig), education: () => renderCrud('education', educationConfig),
    certificates: () => renderCrud('certificates', certificatesConfig), gallery: () => renderCrud('gallery', galleryConfig),
    services: () => renderCrud('services', servicesConfig), testimonials: () => renderCrud('testimonials', testimonialsConfig),
    contact: renderContact, social: renderSocial, messages: renderMessages,
    theme: renderTheme, website: renderWebsite, analytics: renderAnalytics, security: renderSecurity
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
  }

  /* ============================ DASHBOARD ============================ */
  function renderDashboard(root) {
    const stats = [
      { label: 'Total Projects', value: data.projects.length, icon: 'fa-diagram-project' },
      { label: 'Total Skills', value: data.skills.length, icon: 'fa-code' },
      { label: 'Total Certificates', value: data.certificates.length, icon: 'fa-certificate' },
      { label: 'Total Messages', value: data.messages.length, icon: 'fa-envelope' },
      { label: 'Total Visitors', value: data.analytics.visitors, icon: 'fa-users' }
    ];
    root.innerHTML = `
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
      <div class="admin-panel-head"><div><h2>Profile</h2><p>Your public identity shown across the site.</p></div></div>
      <form id="profileForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field"><label>Full Name</label><input name="name" value="${escapeHtml(p.name)}" required /></div>
          <div class="field"><label>Title</label><input name="title" value="${escapeHtml(p.title)}" required /></div>
          <div class="field full"><label>Bio</label><textarea name="bio" required>${escapeHtml(p.bio)}</textarea></div>
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
      const updated = { ...data.profile, name: fd.get('name'), title: fd.get('title'), bio: fd.get('bio'), photo: fd.get('photo'), resumeUrl: fd.get('resumeUrl') };
      DataStore.update('profile', updated);
    });
  }

  /* ============================ HERO ============================ */
  function renderHero(root) {
    const h = data.hero;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Hero Section</h2><p>The first thing visitors see.</p></div></div>
      <form id="heroForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field full"><label>Title</label><input name="title" value="${escapeHtml(h.title)}" required /></div>
          <div class="field full"><label>Subtitle</label><input name="subtitle" value="${escapeHtml(h.subtitle)}" required /></div>
          <div class="field full"><label>Typed Roles (comma separated)</label><input name="typedRoles" value="${escapeHtml((h.typedRoles || []).join(', '))}" placeholder="Frontend Developer, React Developer" /></div>
          <div class="field full"><label>Description</label><textarea name="description" required>${escapeHtml(h.description)}</textarea></div>
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
        typedRoles: fd.get('typedRoles').split(',').map(s => s.trim()).filter(Boolean),
        socialLinks: socials
      };
      DataStore.update('hero', updated);
    });
  }

  /* ============================ ABOUT ============================ */
  function renderAbout(root) {
    const a = data.about;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>About Section</h2><p>Your story, experience and education summary.</p></div></div>
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
  }

  /* ============================ CONTACT ============================ */
  function renderContact(root) {
    const c = data.contact;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Contact Information</h2><p>Shown in the Contact section and footer.</p></div></div>
      <form id="contactForm" class="admin-card card">
        <div class="admin-form-grid">
          <div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(c.phone)}" required /></div>
          <div class="field"><label>Email</label><input name="email" type="email" value="${escapeHtml(c.email)}" required /></div>
          <div class="field full"><label>Address</label><input name="address" value="${escapeHtml(c.address)}" required /></div>
          <div class="field full"><label>Google Map link (used to embed map)</label><input name="mapEmbed" value="${escapeHtml(c.mapEmbed)}" /></div>
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Contact Info</button>
      </form>
    `;
    bindSimpleForm(root, 'contactForm', (fd) => {
      DataStore.update('contact', { phone: fd.get('phone'), email: fd.get('email'), address: fd.get('address'), mapEmbed: fd.get('mapEmbed') });
    });
  }

  /* ============================ SOCIAL ============================ */
  function renderSocial(root) {
    const s = data.social;
    const platforms = ['facebook', 'github', 'linkedin', 'youtube', 'instagram', 'twitter'];
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Social Media</h2><p>Profile links used across the site.</p></div></div>
      <form id="socialForm" class="admin-card card">
        <div class="admin-form-grid">
          ${platforms.map(p => `<div class="field"><label>${p.charAt(0).toUpperCase() + p.slice(1)}</label><input name="${p}" value="${escapeHtml(s[p] || '')}" placeholder="https://" /></div>`).join('')}
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Social Links</button>
      </form>
    `;
    bindSimpleForm(root, 'socialForm', (fd) => {
      const updated = {};
      platforms.forEach(p => updated[p] = fd.get(p));
      DataStore.update('social', updated);
    });
  }

  /* ============================ THEME SETTINGS ============================ */
  function renderTheme(root) {
    const s = data.siteSettings;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Theme Settings</h2><p>Controls the accent colors and font used site-wide.</p></div></div>
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
  }

  /* ============================ WEBSITE SETTINGS ============================ */
  function renderWebsite(root) {
    const s = data.siteSettings;
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Website Settings</h2><p>Logo, favicon, site title and footer text.</p></div></div>
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
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Website Settings</button>
      </form>
    `;
    document.getElementById('faviconInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await fileToBase64(file);
      document.getElementById('faviconPreview').src = b64;
      document.getElementById('faviconValue').value = b64;
    });
    bindSimpleForm(root, 'websiteForm', (fd) => {
      DataStore.update('siteSettings', { ...data.siteSettings, siteTitle: fd.get('siteTitle'), logoText: fd.get('logoText'), favicon: fd.get('favicon'), footerText: fd.get('footerText') });
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

  /* ============================ SECURITY ============================ */
  function renderSecurity(root) {
    const auth = AuthStore.get();
    root.innerHTML = `
      <div class="admin-panel-head"><div><h2>Security</h2><p>Change your password and session behavior.</p></div></div>
      <form id="passForm" class="admin-card card">
        <h3>Change Password</h3>
        <div class="admin-form-grid">
          <div class="field"><label>New Password</label><input type="password" name="newPass" minlength="6" required /></div>
          <div class="field"><label>Confirm New Password</label><input type="password" name="confirmPass" minlength="6" required /></div>
        </div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-key"></i> Update Password</button>
      </form>
      <form id="sessionForm" class="admin-card card">
        <h3>Session Timeout</h3>
        <div class="field" style="max-width:260px"><label>Auto logout after (minutes)</label><input type="number" name="timeout" min="5" max="240" value="${auth.sessionTimeoutMinutes}" /></div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-clock"></i> Save Session Settings</button>
      </form>
      <button class="btn btn-outline" id="securityLogoutBtn"><i class="fa-solid fa-right-from-bracket"></i> Logout Now</button>
    `;
    document.getElementById('passForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const p1 = fd.get('newPass'), p2 = fd.get('confirmPass');
      if (p1 !== p2) { Toast.error('Passwords do not match', 'Please re-enter matching passwords.'); return; }
      await AuthStore.changePassword(p1);
      Toast.success('Password updated', 'Use your new password next time you log in.');
      e.target.reset();
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

  /* ============================ GENERIC CRUD ENGINE ============================ */
  const skillsConfig = {
    label: 'Skill', labelPlural: 'Skills',
    fields: [
      { key: 'name', label: 'Skill Name', type: 'text', required: true },
      { key: 'percentage', label: 'Percentage (0-100)', type: 'number', min: 0, max: 100, required: true },
      { key: 'icon', label: 'Icon class (Font Awesome, e.g. fa-brands fa-react)', type: 'text', required: true }
    ],
    columns: [
      { key: 'icon', label: '', render: v => `<i class="${escapeHtml(v)}" style="color:var(--accent)"></i>` },
      { key: 'name', label: 'Name' },
      { key: 'percentage', label: 'Level', render: v => `${v}%` }
    ]
  };

  const projectsConfig = {
    label: 'Project', labelPlural: 'Projects',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'image', label: 'Project Image', type: 'image' },
      { key: 'liveLink', label: 'Live Link', type: 'url' },
      { key: 'githubLink', label: 'GitHub Link', type: 'url' }
    ],
    columns: [
      { key: 'image', label: '', type: 'image' },
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' }
    ]
  };

  const experienceConfig = {
    label: 'Experience', labelPlural: 'Experience',
    fields: [
      { key: 'role', label: 'Role', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text', required: true },
      { key: 'duration', label: 'Duration', type: 'text', required: true, placeholder: '2024 — Present' },
      { key: 'description', label: 'Description', type: 'textarea', required: true }
    ],
    columns: [{ key: 'role', label: 'Role' }, { key: 'company', label: 'Company' }, { key: 'duration', label: 'Duration' }]
  };

  const educationConfig = {
    label: 'Education', labelPlural: 'Education',
    fields: [
      { key: 'degree', label: 'Degree', type: 'text', required: true },
      { key: 'institute', label: 'Institute', type: 'text', required: true },
      { key: 'duration', label: 'Duration', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true }
    ],
    columns: [{ key: 'degree', label: 'Degree' }, { key: 'institute', label: 'Institute' }, { key: 'duration', label: 'Duration' }]
  };

  const certificatesConfig = {
    label: 'Certificate', labelPlural: 'Certificates',
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
    label: 'Image', labelPlural: 'Gallery',
    fields: [
      { key: 'image', label: 'Image', type: 'image', required: true },
      { key: 'caption', label: 'Caption', type: 'text', required: true }
    ],
    columns: [{ key: 'image', label: '', type: 'image' }, { key: 'caption', label: 'Caption' }]
  };

  const servicesConfig = {
    label: 'Service', labelPlural: 'Services',
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

  const testimonialsConfig = {
    label: 'Testimonial', labelPlural: 'Testimonials',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role / Company', type: 'text', required: true },
      { key: 'photo', label: 'Photo', type: 'image' },
      { key: 'text', label: 'Testimonial Text', type: 'textarea', required: true },
      { key: 'rating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5, required: true }
    ],
    columns: [{ key: 'photo', label: '', type: 'image' }, { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'rating', label: 'Rating', render: v => '★'.repeat(v) }]
  };

  function renderCrud(sectionKey, config) {
    const root = document.getElementById('adminContent');
    root.innerHTML = `
      <div class="admin-panel-head">
        <div><h2>${config.labelPlural}</h2><p>${data[sectionKey].length} item(s)</p></div>
        <button class="btn btn-primary" id="addItemBtn"><i class="fa-solid fa-plus"></i> Add ${config.label}</button>
      </div>
      <div class="admin-table-wrap card" id="crudTableWrap"></div>
    `;
    function draw() {
      const items = data[sectionKey];
      const wrap = document.getElementById('crudTableWrap');
      if (!items.length) {
        wrap.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-folder-open"></i>No ${config.labelPlural.toLowerCase()} yet. Click "Add ${config.label}" to create one.</div>`;
        return;
      }
      wrap.innerHTML = `
        <table class="admin-table">
          <thead><tr>${config.columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}<th style="text-align:right">Actions</th></tr></thead>
          <tbody>
            ${items.map(item => `
              <tr data-id="${item.id}">
                ${config.columns.map(c => {
                  const val = item[c.key];
                  if (c.type === 'image') return `<td><img class="admin-thumb" src="${resolveAssetPath(val) || ''}" alt="" /></td>`;
                  if (c.render) return `<td>${c.render(val)}</td>`;
                  return `<td>${escapeHtml(String(val ?? ''))}</td>`;
                }).join('')}
                <td>
                  <div class="admin-row-actions">
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
        openCrudModal(sectionKey, config, items.find(i => i.id === id), draw);
      }));
      wrap.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        confirmAction(`Delete this ${config.label.toLowerCase()}? This cannot be undone.`, () => {
          DataStore.deleteItem(sectionKey, id);
          data = DataStore.get();
          Toast.success('Deleted', `${config.label} removed.`);
          draw();
          updateMsgBadge();
        });
      }));
    }
    draw();
    document.getElementById('addItemBtn').addEventListener('click', () => openCrudModal(sectionKey, config, null, draw));
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
