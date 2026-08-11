/* ==========================================================================
   MAIN SITE SCRIPT
   Renders every section from DataStore so the whole page stays in sync with
   whatever is edited in /admin. Also owns navigation, theme, page-loader,
   scroll effects, small carousels/lightbox and the contact form.
   ========================================================================== */

(() => {
  'use strict';

  const data = DataStore.get();
  DataStore.trackVisit('Home');

  /* ============================ MAINTENANCE MODE ============================
     When enabled from Admin → Website Settings, ordinary visitors see a
     simple holding page instead of the full site. A logged-in admin (same
     browser/session used for the Admin panel) still sees the real site, with
     a small banner as a reminder it's on — otherwise there'd be no way to
     preview or edit the site while it's "down" for everyone else. */
  if (data.siteSettings.maintenanceMode && !AuthStore.isLoggedIn()) {
    document.title = `${data.siteSettings.siteTitle} — Maintenance`;
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;background:var(--bg);color:var(--text);font-family:var(--font-body);gap:1.25rem">
        <div style="width:64px;height:64px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#0b0f17;font-family:var(--font-mono);font-weight:800;font-size:1.4rem">${escapeHtml(data.siteSettings.logoText || 'SC')}</div>
        <h1 style="font-family:var(--font-display);font-size:clamp(1.5rem,4vw,2.2rem);margin:0">${escapeHtml(data.siteSettings.siteTitle)}</h1>
        <p style="color:var(--text-muted);max-width:420px;margin:0">${escapeHtml(data.siteSettings.maintenanceMessage || "We're making some updates. Please check back shortly.")}</p>
      </div>
    `;
    return;
  }
  if (data.siteSettings.maintenanceMode && AuthStore.isLoggedIn()) {
    document.addEventListener('DOMContentLoaded', () => {
      const bar = document.createElement('div');
      bar.textContent = '⚠ Maintenance mode is ON — visitors see a holding page instead of this site. Turn it off from Admin → Website Settings when you\'re ready.';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:var(--warning,#f59e0b);color:#1a1200;font-family:var(--font-mono);font-size:0.8rem;text-align:center;padding:8px 12px;';
      document.body.prepend(bar);
    });
  }

  /* ============================ THEME ============================ */
  const html = document.documentElement;
  // Respect the OS/browser color-scheme preference on a visitor's very
  // first visit; once they pick a theme (or toggle it), that explicit
  // choice is remembered and always wins after that.
  const storedTheme = localStorage.getItem('theme');
  const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const savedTheme = storedTheme || (systemPrefersLight ? 'light' : 'dark');
  html.setAttribute('data-theme', savedTheme);

  // Keep the mobile browser chrome (address bar) color in sync with the
  // active theme, instead of always showing the dark background color.
  function syncThemeColorMeta(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f6fa' : '#0b0f17');
  }
  syncThemeColorMeta(savedTheme);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncThemeColorMeta(next);
  });

  /* ============================ LANGUAGE ============================ */
  I18n.init();
  const langLabel = document.getElementById('langToggleLabel');
  if (langLabel) langLabel.textContent = I18n.get() === 'bn' ? 'EN' : 'বাং';
  document.getElementById('langToggle')?.addEventListener('click', () => {
    const next = I18n.toggle();
    langLabel.textContent = next === 'bn' ? 'EN' : 'বাং';
  });

  /* ============================ SITE SETTINGS ============================ */
  function applySiteSettings() {
    const s = data.siteSettings;
    document.title = s.siteTitle;
    document.getElementById('logoMark').textContent = s.logoText || 'SC';
    const favicon = document.getElementById('favicon-link');
    if (favicon && s.favicon) {
      favicon.href = s.favicon;
      // The default favicon is an SVG, but an admin-uploaded favicon can be
      // any image type. Keep the <link type> honest so browsers don't reject
      // it: read the MIME straight off a data: URI, or infer it from the
      // file extension for a plain path.
      if (s.favicon.startsWith('data:')) {
        const mime = s.favicon.slice(5, s.favicon.indexOf(';'));
        if (mime) favicon.type = mime;
      } else if (/\.svg$/i.test(s.favicon)) {
        favicon.type = 'image/svg+xml';
      } else {
        favicon.removeAttribute('type');
      }
    }
    document.getElementById('footerText').textContent = s.footerText;

    // Each theme (dark/light) ships its own contrast-tuned accent/background
    // in css/variables.css. We only want to override those with an inline
    // style when the admin has actually customized a color away from the
    // shipped default — otherwise every page load would permanently pin the
    // dark theme's colors even while browsing in light mode.
    const defaults = DEFAULT_DATA.siteSettings;
    const rootStyle = document.documentElement.style;
    if (s.primaryColor && s.primaryColor.toLowerCase() !== defaults.primaryColor.toLowerCase()) {
      rootStyle.setProperty('--accent', s.primaryColor);
    }
    if (s.secondaryColor && s.secondaryColor.toLowerCase() !== defaults.secondaryColor.toLowerCase()) {
      rootStyle.setProperty('--accent-2', s.secondaryColor);
    }
    if (s.backgroundColor && s.backgroundColor.toLowerCase() !== defaults.backgroundColor.toLowerCase()) {
      rootStyle.setProperty('--bg', s.backgroundColor);
    }
    if (s.fontFamily) {
      rootStyle.setProperty('--font-body', s.fontFamily);
    }
  }

  /* ============================ SECTION VISIBILITY ============================
     Lets Admin → Website Settings hide whole sections (without deleting the
     underlying content) — e.g. temporarily pull "Testimonials" while
     waiting on more reviews. Hides the section itself plus any nav link
     (desktop nav, mobile menu, footer) pointing at it, so there's no dead
     link left behind. */
  function applySectionVisibility() {
    const visibility = data.siteSettings.sectionVisibility || {};
    const SECTION_ANCHORS = {
      about: 'about', skills: 'skills', clients: 'clients', projects: 'projects',
      blog: 'blog', services: 'services', experience: 'experience', certificates: 'certificates',
      gallery: 'gallery', testimonials: 'testimonials', faqs: 'faq', contact: 'contact'
    };
    Object.entries(SECTION_ANCHORS).forEach(([key, anchorId]) => {
      if (visibility[key] === false) {
        const section = document.getElementById(anchorId);
        if (section) section.style.display = 'none';
        document.querySelectorAll(`a[href="#${anchorId}"]`).forEach(link => {
          const li = link.closest('li');
          (li || link).style.display = 'none';
        });
      }
    });
  }

  /* ============================ HERO ============================ */
  function renderHero() {
    document.getElementById('heroName').textContent = data.hero.title || data.profile.name;
    document.getElementById('heroDesc').textContent = data.hero.description;
    document.getElementById('resumeLink').href = data.profile.resumeUrl;
    document.getElementById('footerResume').href = data.profile.resumeUrl;

    const socialsWrap = document.getElementById('heroSocials');
    const footerSocialsWrap = document.getElementById('footerSocials');
    socialsWrap.innerHTML = '';
    footerSocialsWrap.innerHTML = '';
    (data.hero.socialLinks || []).forEach(link => {
      const a = `<a class="icon-btn" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(link.platform)}"><i class="${escapeAttr(link.icon)}" aria-hidden="true"></i></a>`;
      socialsWrap.insertAdjacentHTML('beforeend', a);
      footerSocialsWrap.insertAdjacentHTML('beforeend', a);
    });

    if (data.hero.nowStatus && data.hero.nowStatus.trim()) {
      document.getElementById('nowText').textContent = data.hero.nowStatus;
      document.getElementById('nowBadge').hidden = false;
    }

    // Typed role effect
    const roles = (data.hero.typedRoles && data.hero.typedRoles.length) ? data.hero.typedRoles : [data.hero.subtitle];
    typeRoles(document.getElementById('heroRole'), roles);
  }

  function typeRoles(el, roles) {
    if (!roles.length) return;
    let roleIndex = 0, charIndex = 0, deleting = false;
    el.innerHTML = '<span class="typed-text"></span><span class="typed-cursor">&nbsp;</span>';
    const textEl = el.querySelector('.typed-text');

    function tick() {
      const current = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        textEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1400);
          return;
        }
      } else {
        charIndex--;
        textEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
        }
      }
      setTimeout(tick, deleting ? 45 : 85);
    }
    tick();
  }

  /* ============================ ABOUT ============================ */
  /** Wires an <a> element as a mailto: link. On touch devices, native
      mailto: handling is left alone (correctly opens the phone's mail app).
      On desktop, clicking opens Gmail's web compose in a new tab instead,
      since many desktops have no mail client registered for mailto: at all. */
  function setupEmailLink(el, email) {
    el.textContent = email;
    el.href = `mailto:${email}`;
    if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`, '_blank', 'noopener,noreferrer');
      });
    }
  }

  function renderAbout() {
    document.getElementById('aboutPhoto').src = data.profile.photo;
    document.getElementById('aboutPhoto').alt = `Portrait of ${data.profile.name}`;
    document.getElementById('aboutText').textContent = data.about.text;
    document.getElementById('aboutExpSummary').textContent = data.about.experienceSummary;
    document.getElementById('aboutEduSummary').textContent = data.about.educationSummary;
    setupEmailLink(document.getElementById('aboutEmail'), data.contact.email);
    document.getElementById('aboutLocation').textContent = data.contact.address;
    document.getElementById('aboutExpBadge').textContent = (data.about.experienceSummary.match(/\d+/) || ['1'])[0] + '+';

    const statsWrap = document.getElementById('aboutStats');
    statsWrap.innerHTML = (data.about.stats || []).map((s, i) => `
      <div class="stat-box reveal" style="transition-delay:${i * 80}ms">
        <div class="num" data-count="${s.value}">0</div>
        <div class="label">${escapeHtml(s.label)}</div>
      </div>
    `).join('');
  }

  /* ============================ SKILLS ============================ */
  function renderSkills() {
    const wrap = document.getElementById('skillsGrid');
    wrap.innerHTML = data.skills.map((s, i) => `
      <div class="skill-card card reveal magnetic" style="transition-delay:${i * 60}ms">
        <div class="skill-icon"><i class="${escapeAttr(s.icon)}" aria-hidden="true"></i></div>
        <div class="skill-name">${escapeHtml(s.name)}</div>
        <div class="skill-bar-track"><div class="skill-bar" data-pct="${s.percentage}"></div></div>
        <div class="skill-pct">${s.percentage}%</div>
      </div>
    `).join('');
  }

  /* ============================ PROJECTS ============================ */
  function renderProjects() {
    const categories = ['All', ...new Set(data.projects.map(p => p.category))];
    const filterWrap = document.getElementById('projectFilters');
    filterWrap.innerHTML = categories.map((c, i) => `<button class="filter-btn ${i === 0 ? 'active' : ''}" data-filter="${escapeAttr(c)}" type="button"${c === 'All' ? ' data-i18n="projects.filterAll"' : ''}>${escapeHtml(c)}</button>`).join('');

    const grid = document.getElementById('projectsGrid');
    function draw(filter) {
      const list = filter === 'All' ? data.projects : data.projects.filter(p => p.category === filter);
      grid.innerHTML = list.map((p, i) => `
        <article class="project-card card reveal magnetic" style="transition-delay:${i * 60}ms" data-project-id="${escapeAttr(p.id)}" role="button" tabindex="0" aria-label="View case study: ${escapeAttr(p.title)}">
          <div class="project-thumb">
            <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)} preview" loading="lazy" data-shimmer />
            <div class="project-thumb-overlay">
              ${p.liveLink && p.liveLink !== '#' ? `<a href="${escapeAttr(p.liveLink)}" target="_blank" rel="noopener noreferrer" aria-label="Live preview of ${escapeAttr(p.title)}" data-stop><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
              ${p.githubLink && p.githubLink !== '#' ? `<a href="${escapeAttr(p.githubLink)}" target="_blank" rel="noopener noreferrer" aria-label="Source code of ${escapeAttr(p.title)}" data-stop><i class="fa-brands fa-github"></i></a>` : ''}
            </div>
          </div>
          <div class="project-body">
            <span class="project-cat">${escapeHtml(p.category)}</span>
            <h3 class="project-title">${escapeHtml(p.title)}</h3>
            <p class="project-desc">${escapeHtml(p.description)}</p>
          </div>
        </article>
      `).join('');
      requestAnimationFrame(() => { observeReveal(); bindShimmer(); bindMagnetic(); });
    }
    draw('All');

    grid.addEventListener('click', (e) => {
      if (e.target.closest('[data-stop]')) return;
      const card = e.target.closest('.project-card');
      if (!card) return;
      openProjectModal(card.dataset.projectId);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.project-card');
      if (!card) return;
      e.preventDefault();
      openProjectModal(card.dataset.projectId);
    });

    filterWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      draw(btn.dataset.filter);
    });
  }

  /* ============================ FOCUS TRAP (accessibility) ============================ */
  /* Keeps Tab/Shift+Tab cycling inside an open modal instead of leaking focus
     to the page behind it, and restores focus to whatever triggered the
     modal once it closes. Used by the project modal, testimonial form, and
     command palette. */
  const FocusTrap = {
    _container: null,
    _lastFocused: null,
    _handler: null,

    activate(container) {
      this._container = container;
      this._lastFocused = document.activeElement;
      this._handler = (e) => {
        if (e.key !== 'Tab') return;
        const focusable = container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', this._handler);
    },

    deactivate() {
      if (this._handler) document.removeEventListener('keydown', this._handler);
      this._handler = null;
      if (this._lastFocused && typeof this._lastFocused.focus === 'function') {
        this._lastFocused.focus();
      }
      this._container = null;
      this._lastFocused = null;
    }
  };

  /* ============================ PROJECT CASE-STUDY MODAL ============================ */
  function openProjectModal(id) {
    const p = data.projects.find(pr => pr.id === id);
    if (!p) return;
    document.getElementById('projectModalImg').src = p.image;
    document.getElementById('projectModalImg').alt = `${p.title} preview`;
    document.getElementById('projectModalCat').textContent = p.category;
    document.getElementById('projectModalTitle').textContent = p.title;
    document.getElementById('projectModalChallenge').textContent = p.challenge || 'Details coming soon.';
    document.getElementById('projectModalSolution').textContent = p.solution || p.description;

    const linksWrap = document.getElementById('projectModalLinks');
    linksWrap.innerHTML = '';
    if (p.liveLink && p.liveLink !== '#') linksWrap.insertAdjacentHTML('beforeend', `<a class="btn btn-primary btn-sm" href="${escapeAttr(p.liveLink)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Live Site</a>`);
    if (p.githubLink && p.githubLink !== '#') linksWrap.insertAdjacentHTML('beforeend', `<a class="btn btn-outline btn-sm" href="${escapeAttr(p.githubLink)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github"></i> Source Code</a>`);

    const techWrap = document.getElementById('projectModalTech');
    const stack = (p.techStack || '').split(',').map(s => s.trim()).filter(Boolean);
    techWrap.innerHTML = stack.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') || '<span class="tag">Not specified</span>';

    const overlay = document.getElementById('projectModalOverlay');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    FocusTrap.activate(document.getElementById('projectModalBox'));
    document.getElementById('projectModalClose').focus();
  }
  function closeProjectModal() {
    document.getElementById('projectModalOverlay').classList.remove('open');
    document.body.style.overflow = '';
    FocusTrap.deactivate();
  }
  function initProjectModal() {
    document.getElementById('projectModalClose').addEventListener('click', closeProjectModal);
    document.getElementById('projectModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'projectModalOverlay') closeProjectModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('projectModalOverlay').classList.contains('open')) closeProjectModal();
    });
  }

  /* ============================ SERVICES ============================ */
  function renderServices() {
    document.getElementById('servicesGrid').innerHTML = data.services.map((s, i) => `
      <div class="service-card card reveal magnetic" style="transition-delay:${i * 60}ms">
        <div class="service-icon"><i class="${escapeAttr(s.icon)}" aria-hidden="true"></i></div>
        <h3 class="service-title">${escapeHtml(s.title)}</h3>
        <p class="service-desc">${escapeHtml(s.description)}</p>
      </div>
    `).join('');
  }

  /* ============================ CLIENTS / WORKED WITH ============================ */
  function renderClients() {
    const track = document.getElementById('clientsTrack');
    const section = document.getElementById('clients');
    if (!track || !section) return;
    if (!data.clients || !data.clients.length) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    const logoCard = (c, i, animated) => {
      const hasUrl = c.url && c.url.trim();
      const tag = hasUrl ? 'a' : 'div';
      const linkAttrs = hasUrl ? `href="${escapeAttr(c.url)}" target="_blank" rel="noopener noreferrer"` : '';
      const magneticClass = animated ? '' : ' magnetic';
      const delay = animated ? '' : ` style="transition-delay:${i * 60}ms"`;
      return `
        <${tag} class="client-logo-card reveal${magneticClass}"${delay} ${linkAttrs} aria-label="${escapeAttr(c.name)}" title="${escapeAttr(c.name)}">
          <img class="client-logo" src="${escapeAttr(c.logo)}" alt="${escapeAttr(c.name)}" loading="lazy" data-shimmer />
        </${tag}>
      `;
    };

    // A handful of logos reads better as a calm, static row (also plays
    // nicer with the magnetic hover effect used elsewhere on the page).
    // Once there are enough to feel like a real client list, switch to a
    // continuous marquee — the common "worked with" pattern — with the
    // logo set duplicated so the loop has no visible seam. Respects
    // prefers-reduced-motion by falling back to the static row.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useMarquee = data.clients.length >= 6 && !reduceMotion;

    if (useMarquee) {
      track.classList.add('clients-track-marquee');
      const oneSet = data.clients.map((c, i) => logoCard(c, i, true)).join('');
      // Duplicated once is enough for a seamless CSS-only loop (see
      // .clients-track-marquee's -50% keyframe in premium.css).
      track.innerHTML = `<div class="clients-marquee-group">${oneSet}</div><div class="clients-marquee-group" aria-hidden="true">${oneSet}</div>`;
    } else {
      track.classList.remove('clients-track-marquee');
      track.innerHTML = data.clients.map((c, i) => logoCard(c, i, false)).join('');
    }

    requestAnimationFrame(() => {
      observeReveal();
      bindShimmer();
      if (!useMarquee) bindMagnetic();
    });
  }

  /* ============================ EXPERIENCE / EDUCATION ============================ */
  function renderTimeline() {
    document.getElementById('experienceTimeline').innerHTML = data.experience.map(e => `
      <div class="timeline-item reveal">
        <span class="timeline-dot"></span>
        <div class="timeline-card card">
          <div class="timeline-duration">${escapeHtml(e.duration)}</div>
          <h3 class="timeline-role">${escapeHtml(e.role)}</h3>
          <div class="timeline-org">${escapeHtml(e.company)}</div>
          <p class="timeline-desc">${escapeHtml(e.description)}</p>
        </div>
      </div>
    `).join('');

    document.getElementById('educationTimeline').innerHTML = data.education.map(e => `
      <div class="timeline-item reveal">
        <span class="timeline-dot"></span>
        <div class="timeline-card card">
          <div class="timeline-duration">${escapeHtml(e.duration)}</div>
          <h3 class="timeline-role">${escapeHtml(e.degree)}</h3>
          <div class="timeline-org">${escapeHtml(e.institute)}</div>
          <p class="timeline-desc">${escapeHtml(e.description)}</p>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.exp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.timeline-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${tab.dataset.tab}Panel`).classList.add('active');
      });
    });
  }

  /* ============================ CERTIFICATES ============================ */
  function renderCertificates() {
    document.getElementById('certGrid').innerHTML = data.certificates.map((c, i) => `
      <div class="cert-card card reveal" style="transition-delay:${i * 60}ms">
        <div class="cert-thumb"><img src="${escapeAttr(c.image)}" alt="${escapeAttr(c.title)} certificate" loading="lazy" data-shimmer /></div>
        <div class="cert-body">
          <div>
            <h3 class="cert-title">${escapeHtml(c.title)}</h3>
            <div class="cert-issuer">${escapeHtml(c.issuer)}</div>
          </div>
          <span class="cert-date">${escapeHtml(c.date)}</span>
        </div>
        ${c.link && c.link !== '#' ? `<a class="cert-verify-link" href="${escapeAttr(c.link)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Verify Certificate</a>` : ''}
      </div>
    `).join('');
  }

  /* ============================ GALLERY ============================ */
  function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = data.gallery.map((g, i) => `
      <div class="gallery-item reveal" style="transition-delay:${i * 50}ms" data-img="${escapeAttr(g.image)}" data-caption="${escapeAttr(g.caption)}" role="button" tabindex="0" aria-label="View ${escapeAttr(g.caption)} image">
        <img src="${escapeAttr(g.image)}" alt="${escapeAttr(g.caption)}" loading="lazy" data-shimmer />
        <div class="gallery-caption">${escapeHtml(g.caption)}</div>
      </div>
    `).join('');

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    function openLightbox(item) {
      lightboxImg.src = item.dataset.img;
      lightboxImg.alt = item.dataset.caption;
      lightbox.classList.add('open');
    }
    grid.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => openLightbox(item));
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(item); } });
    });
    document.getElementById('lightboxClose').addEventListener('click', () => lightbox.classList.remove('open'));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.classList.remove('open'); });
  }

  /* ============================ TESTIMONIALS ============================ */
  function renderTestimonials() {
    const track = document.getElementById('testimonialTrack');
    const dotsWrap = document.getElementById('testimonialDots');
    track.innerHTML = data.testimonials.map(t => `
      <div class="testimonial-card card">
        <div class="testimonial-avatar"><img src="${escapeAttr(t.photo)}" alt="${escapeAttr(t.name)}" loading="lazy" data-shimmer /></div>
        <div class="testimonial-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
        <p class="testimonial-text">"${escapeHtml(t.text)}"</p>
        <div class="testimonial-name">${escapeHtml(t.name)}</div>
        <div class="testimonial-role">${escapeHtml(t.role)}</div>
      </div>
    `).join('');

    const count = data.testimonials.length;
    if (count === 0) {
      dotsWrap.innerHTML = '';
      return;
    }
    dotsWrap.innerHTML = Array.from({ length: count }).map((_, i) => `<button data-i="${i}" aria-label="Go to testimonial ${i + 1}" class="${i === 0 ? 'active' : ''}"></button>`).join('');

    let current = 0;
    const perView = () => (window.innerWidth >= 860 ? 3 : 1);
    function goTo(i) {
      current = Math.max(0, Math.min(i, count - 1));
      const cardWidth = track.children[0] ? track.children[0].getBoundingClientRect().width + 24 : 0;
      track.style.transform = `translateX(-${current * cardWidth}px)`;
      dotsWrap.querySelectorAll('button').forEach((d, idx) => d.classList.toggle('active', idx === current));
    }
    dotsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) goTo(Number(btn.dataset.i));
    });
    let autoTimer = null;
    function startAuto() {
      if (count < 2) return;
      autoTimer = setInterval(() => goTo((current + 1) % count), 5000);
    }
    function stopAuto() {
      clearInterval(autoTimer);
    }
    startAuto();
    const wrap = track.closest('.testimonial-track-wrap');
    wrap.addEventListener('mouseenter', stopAuto);
    wrap.addEventListener('mouseleave', startAuto);
  }

  /* ============================ CONTACT ============================ */
  function renderContact() {
    const phoneLink = document.getElementById('contactPhone');
    const emailLink = document.getElementById('contactEmail');
    const addressLink = document.getElementById('contactAddress');

    phoneLink.textContent = data.contact.phone;
    phoneLink.href = `tel:${data.contact.phone.replace(/[^\d+]/g, '')}`;

    setupEmailLink(emailLink, data.contact.email);

    document.getElementById('footerAbout').textContent = data.about.text.slice(0, 130) + '...';

    const mapFrame = document.getElementById('contactMapFrame');
    const query = encodeURIComponent(data.contact.address);
    mapFrame.src = `https://maps.google.com/maps?q=${query}&output=embed`;

    // The admin-editable "Google Map link" is used for the outbound "Open in
    // Google Maps" link and the clickable address text; the embedded iframe
    // itself is always built from the address above so it keeps working
    // even if that field is left blank.
    const resolvedMapUrl = (data.contact.mapEmbed && data.contact.mapEmbed.trim())
      ? data.contact.mapEmbed
      : `https://maps.google.com/?q=${query}`;
    addressLink.textContent = data.contact.address;
    addressLink.href = resolvedMapUrl;

    const mapLink = document.getElementById('contactMapLink');
    if (mapLink) {
      mapLink.href = resolvedMapUrl;
    }

    const form = document.getElementById('contactForm');
    const statusEl = document.getElementById('formStatus');
    const submitBtn = document.getElementById('contactSubmitBtn');

    const rules = {
      'cf-name': { field: 'fieldName', fn: Validators.name },
      'cf-email': { field: 'fieldEmail', fn: Validators.email },
      'cf-subject': { field: 'fieldSubject', fn: Validators.subject },
      'cf-message': { field: 'fieldMessage', fn: Validators.message }
    };

    Object.keys(rules).forEach(id => {
      const input = document.getElementById(id);
      input.addEventListener('blur', () => validateFieldEl(document.getElementById(rules[id].field), rules[id].fn));
      input.addEventListener('input', () => {
        const fieldEl = document.getElementById(rules[id].field);
        if (fieldEl.classList.contains('invalid')) validateFieldEl(fieldEl, rules[id].fn);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot: a hidden field real visitors never see or fill. If it has
      // a value, silently drop the submission without any error feedback —
      // that avoids tipping the bot off while protecting Messages/inbox.
      const hp = document.getElementById('cf-website');
      if (hp && hp.value) return;

      let allValid = true;
      Object.keys(rules).forEach(id => {
        const fieldEl = document.getElementById(rules[id].field);
        const ok = validateFieldEl(fieldEl, rules[id].fn);
        if (!ok) allValid = false;
      });

      if (!allValid) {
        statusEl.textContent = 'Please fix the highlighted fields.';
        statusEl.style.color = 'var(--danger)';
        statusEl.classList.add('show');
        Toast.error('Form incomplete', 'Please check the highlighted fields and try again.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Sending...';

      const payload = {
        name: document.getElementById('cf-name').value.trim(),
        email: document.getElementById('cf-email').value.trim(),
        subject: document.getElementById('cf-subject').value.trim(),
        message: document.getElementById('cf-message').value.trim()
      };

      // Always store the message locally first — this is the one delivery
      // path that's guaranteed to work with zero setup, so it never depends
      // on the two optional integrations below.
      DataStore.addMessage(payload);

      Promise.allSettled([sendViaEmailJS(payload), sendToGoogleSheets(payload)]).then((results) => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
        form.reset();
        form.querySelectorAll('.field').forEach(f => f.classList.remove('valid', 'invalid'));
        statusEl.textContent = "Message sent successfully! I'll get back to you soon.";
        statusEl.style.color = 'var(--success)';
        statusEl.classList.add('show');
        Toast.success('Message sent', "Thanks for reaching out — I'll reply soon.");

        // Only surface integration failures quietly — the message is already
        // saved either way, so this is informational rather than blocking.
        const [emailResult] = results;
        if (emailResult.status === 'rejected') {
          console.warn('EmailJS delivery failed:', emailResult.reason);
        }
      });
    });
  }

  /* ============================ INTEGRATIONS: EMAILJS + GOOGLE SHEETS ============================ */
  function sendViaEmailJS(payload) {
    const cfg = data.integrations && data.integrations.emailjs;
    if (!cfg || !cfg.enabled || !cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
      return Promise.resolve({ skipped: true });
    }
    if (typeof emailjs === 'undefined') {
      return Promise.reject(new Error('EmailJS SDK did not load'));
    }
    return emailjs.send(cfg.serviceId, cfg.templateId, {
      from_name: payload.name,
      reply_to: payload.email,
      subject: payload.subject,
      message: payload.message
    }, { publicKey: cfg.publicKey });
  }

  function sendToGoogleSheets(payload) {
    const cfg = data.integrations && data.integrations.googleSheets;
    if (!cfg || !cfg.enabled || !cfg.webAppUrl) {
      return Promise.resolve({ skipped: true });
    }
    // Apps Script Web Apps don't return CORS headers for simple requests, so
    // the response can't be read from here — this is a fire-and-forget POST.
    // As long as the URL is a correctly deployed Web App, the row still gets
    // appended even though this promise resolves without confirmation.
    return fetch(cfg.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        date: new Date().toISOString(),
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        message: payload.message
      })
    });
  }

  /* ============================ NAV / HEADER ============================ */
  /* ============================ FOOTER NEWSLETTER SIGNUP ============================ */
  function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    const status = document.getElementById('newsletterStatus');
    const lang = I18n.get();
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot: dropped silently, same as the contact form above.
      const hp = document.getElementById('nl-website');
      if (hp && hp.value) return;

      const email = document.getElementById('newsletter-email').value;
      const result = DataStore.addSubscriber(email);
      const currentLang = I18n.get();
      status.classList.remove('success', 'error');
      if (result === 'added') {
        status.textContent = TRANSLATIONS['footer.newsletterSuccess'][currentLang];
        status.classList.add('success');
        form.reset();
        Toast.success('Subscribed', TRANSLATIONS['footer.newsletterSuccess'][currentLang]);
      } else if (result === 'duplicate') {
        status.textContent = TRANSLATIONS['footer.newsletterDuplicate'][currentLang];
        status.classList.add('error');
      } else {
        status.textContent = TRANSLATIONS['footer.newsletterInvalid'][currentLang];
        status.classList.add('error');
      }
    });
  }

  function initNav() {
    const header = document.getElementById('siteHeader');
    const navToggle = document.getElementById('navToggle');
    const navDrawer = document.getElementById('navDrawer');
    const navOverlay = document.getElementById('navOverlay');

    function openDrawer() {
      navDrawer.classList.add('open');
      navOverlay.classList.add('open');
      navToggle.classList.add('active');
      navToggle.setAttribute('aria-expanded', 'true');
    }
    function closeDrawer() {
      navDrawer.classList.remove('open');
      navOverlay.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    }
    navToggle.addEventListener('click', () => navDrawer.classList.contains('open') ? closeDrawer() : openDrawer());
    navOverlay.addEventListener('click', closeDrawer);
    document.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', closeDrawer));

    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    // Scroll-spy
    const sections = ['home', 'about', 'skills', 'projects', 'blog', 'experience', 'certificates', 'faq', 'contact']
      .map(id => document.getElementById(id)).filter(Boolean);
    const navLinks = document.querySelectorAll('.nav-list a[data-nav], .nav-drawer a[data-nav]');

    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spyObserver.observe(s));
  }

  /* ============================ SCROLL PROGRESS + TOP BTN ============================ */
  function initScrollUtils() {
    const progress = document.getElementById('scrollProgress');
    const topBtn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      progress.style.width = `${scrolled}%`;
      topBtn.classList.toggle('visible', h.scrollTop > 500);
    }, { passive: true });

    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ============================ REVEAL ON SCROLL ============================ */
  let revealObserver;
  function observeReveal() {
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            if (entry.target.classList.contains('skill-card')) {
              const bar = entry.target.querySelector('.skill-bar');
              if (bar) bar.style.width = bar.dataset.pct + '%';
            }
            if (entry.target.classList.contains('stat-box') || entry.target.querySelector('[data-count]')) {
              animateCount(entry.target);
            }
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
    }
    document.querySelectorAll('.reveal:not(.in-view)').forEach(el => revealObserver.observe(el));
  }

  function animateCount(container) {
    const el = container.querySelector('[data-count]');
    if (!el || el.dataset.done) return;
    el.dataset.done = '1';
    const target = Number(el.dataset.count);
    const duration = 1200;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(progress * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* ============================ BLOG ============================ */
  function renderBlog() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;
    const posts = [...(data.blog || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    if (!posts.length) {
      grid.closest('.section').style.display = 'none';
      return;
    }
    grid.innerHTML = posts.map((post, i) => `
      <article class="blog-card card reveal" style="transition-delay:${i * 60}ms">
        <a href="blog.html?post=${encodeURIComponent(post.slug || post.id)}" class="blog-card-cover">
          <img src="${escapeAttr(post.cover)}" alt="${escapeAttr(post.title)}" loading="lazy" data-shimmer />
        </a>
        <div class="blog-card-body">
          <span class="blog-card-date">${escapeHtml(formatDate(post.date))} · ${readingTime(post)} min read</span>
          <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
          <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
          <a class="blog-card-link" href="blog.html?post=${encodeURIComponent(post.slug || post.id)}">Read more <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </article>
    `).join('');
    requestAnimationFrame(() => { observeReveal(); bindShimmer(); });
  }
  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  // Matches the reading-time estimate on the single-post page (js/blog.js)
  // so the number shown on the homepage teaser cards doesn't disagree.
  function readingTime(post) {
    const words = (post.content || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  /* ============================ FAQ ============================ */
  function renderFAQ() {
    const wrap = document.getElementById('faqList');
    if (!wrap) return;
    wrap.innerHTML = (data.faqs || []).map((f, i) => `
      <div class="faq-item reveal" style="transition-delay:${i * 50}ms">
        <button class="faq-question" aria-expanded="false">
          <span>${escapeHtml(f.question)}</span>
          <i class="fa-solid fa-plus" aria-hidden="true"></i>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">${escapeHtml(f.answer)}</div>
        </div>
      </div>
    `).join('');
    wrap.querySelectorAll('.faq-item').forEach(item => {
      const btn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        item.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
        answer.style.maxHeight = isOpen ? '' : answer.scrollHeight + 'px';
      });
    });
    injectFAQSchema();
  }

  /* Generates FAQPage JSON-LD from the current FAQ data so search engines
     can show questions directly in results. Regenerated whenever FAQs
     render, so it always matches what's actually on the page. */
  function injectFAQSchema() {
    const existing = document.getElementById('faqSchema');
    if (existing) existing.remove();
    if (!data.faqs || !data.faqs.length) return;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: data.faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer }
      }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faqSchema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  /* ============================ IMAGE SHIMMER-IN ============================ */
  function bindShimmer() {
    document.querySelectorAll('img[data-shimmer]:not([data-shimmer-bound])').forEach(img => {
      img.setAttribute('data-shimmer-bound', '1');
      const markLoaded = () => img.classList.add('loaded');
      if (img.complete && img.naturalWidth > 0) markLoaded();
      else {
        img.addEventListener('load', markLoaded);
        img.addEventListener('error', markLoaded);
      }
    });
  }

  /* ============================ MAGNETIC HOVER ============================ */
  function bindMagnetic() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    document.querySelectorAll('.magnetic:not([data-magnetic-bound])').forEach(el => {
      el.setAttribute('data-magnetic-bound', '1');
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.12;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.12;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ============================ CUSTOM CURSOR ============================ */
  function initCustomCursor() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    document.body.classList.add('has-custom-cursor');
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    let dotX = 0, dotY = 0, ringX = 0, ringY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      dot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
    });

    function loop() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    document.addEventListener('mouseover', (e) => {
      ring.classList.toggle('hover', !!e.target.closest('a, button, .card, [role="button"]'));
    });
  }

  /* ============================ PARALLAX GLOW ORBS ============================ */
  function initParallax() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const orbs = document.querySelectorAll('.hero .glow-orb');
    if (!orbs.length) return;
    orbs.forEach(o => o.classList.add('parallax'));
    document.getElementById('home').addEventListener('mousemove', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width - 0.5) * 40;
      const py = ((e.clientY - rect.top) / rect.height - 0.5) * 40;
      orbs.forEach((o, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        o.style.setProperty('--px', (px * dir).toFixed(1));
        o.style.setProperty('--py', (py * dir).toFixed(1));
      });
    });
  }

  /* ============================ PWA: INSTALL PROMPT + SERVICE WORKER ============================ */
  /* Fixed-position banners that dock to the bottom of the screen (cookie
     consent, PWA install prompt) would otherwise sit on top of — and
     silently swallow taps on — whatever page content scrolls to that same
     screen region on mobile. This keeps the page's bottom padding equal to
     the tallest currently-visible bottom banner, so content is always
     pushed clear instead of hidden underneath. */
  function updateBottomReservedSpace() {
    let tallest = 0;
    document.querySelectorAll('.cookie-banner.visible, .install-banner.visible').forEach(el => {
      tallest = Math.max(tallest, el.offsetHeight);
    });
    document.body.style.paddingBottom = tallest ? `${tallest}px` : '';
  }

  function initPWA() {
    let deferredPrompt = null;
    const banner = document.getElementById('installBanner');
    const dismissedKey = 'installBannerDismissed';

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!localStorage.getItem(dismissedKey) && banner) {
        banner.hidden = false;
        requestAnimationFrame(() => { banner.classList.add('visible'); updateBottomReservedSpace(); });
      }
    });

    document.getElementById('installBtn')?.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.classList.remove('visible');
      updateBottomReservedSpace();
    });
    document.getElementById('installDismiss')?.addEventListener('click', () => {
      banner.classList.remove('visible');
      localStorage.setItem(dismissedKey, '1');
      updateBottomReservedSpace();
    });

    if ('serviceWorker' in navigator && window.isSecureContext) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').then((reg) => {
          // Detect a new version once it's installed. navigator.serviceWorker.controller
          // is only set once a worker has already taken control of this page,
          // so checking for it here is what distinguishes "this is an update"
          // from "this is the very first install" (which needs no banner).
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner();
              }
            });
          });
        }).catch(() => {
          /* Offline support is a progressive enhancement — silently skip if registration fails. */
        });
      });

      function showUpdateBanner() {
        const banner = document.getElementById('updateBanner');
        if (!banner) return;
        banner.hidden = false;
        requestAnimationFrame(() => { banner.classList.add('visible'); updateBottomReservedSpace(); });
      }

      document.getElementById('updateReloadBtn')?.addEventListener('click', () => {
        // service-worker.js calls skipWaiting()/clients.claim() automatically,
        // so by the time this banner is visible the new worker has already
        // taken over — a plain reload is enough to pick up the new assets.
        window.location.reload();
      });
    }
  }

  /* ============================ COMMAND PALETTE (Ctrl/Cmd + K) ============================ */
  function initCommandPalette() {
    const overlay = document.getElementById('cmdkOverlay');
    const input = document.getElementById('cmdkInput');
    const resultsEl = document.getElementById('cmdkResults');
    if (!overlay || !input || !resultsEl) return;

    const commands = [
      { label: 'Go to Home', icon: 'fa-solid fa-house', cat: 'Navigate', action: () => scrollToId('home') },
      { label: 'Go to About', icon: 'fa-solid fa-user', cat: 'Navigate', action: () => scrollToId('about') },
      { label: 'Go to Skills', icon: 'fa-solid fa-code', cat: 'Navigate', action: () => scrollToId('skills') },
      { label: 'Go to Projects', icon: 'fa-solid fa-diagram-project', cat: 'Navigate', action: () => scrollToId('projects') },
      { label: 'Go to Blog', icon: 'fa-solid fa-pen-nib', cat: 'Navigate', action: () => scrollToId('blog') },
      { label: 'Go to Experience', icon: 'fa-solid fa-briefcase', cat: 'Navigate', action: () => scrollToId('experience') },
      { label: 'Go to Certificates', icon: 'fa-solid fa-certificate', cat: 'Navigate', action: () => scrollToId('certificates') },
      { label: 'Go to Gallery', icon: 'fa-solid fa-images', cat: 'Navigate', action: () => scrollToId('gallery') },
      { label: 'Go to Testimonials', icon: 'fa-solid fa-comment-dots', cat: 'Navigate', action: () => scrollToId('testimonials') },
      { label: 'Go to FAQ', icon: 'fa-solid fa-circle-question', cat: 'Navigate', action: () => scrollToId('faq') },
      { label: 'Go to Contact', icon: 'fa-solid fa-envelope', cat: 'Navigate', action: () => scrollToId('contact') },
      { label: 'Toggle Dark / Light Mode', icon: 'fa-solid fa-circle-half-stroke', cat: 'Action', action: () => document.getElementById('themeToggle').click() },
      { label: 'Download Resume (PDF)', icon: 'fa-solid fa-download', cat: 'Action', action: () => { window.location.href = data.profile.resumeUrl; } },
      { label: 'Open Printable Resume', icon: 'fa-solid fa-file-lines', cat: 'Action', action: () => window.open('resume.html', '_blank') },
      ...data.projects.map(p => ({ label: p.title, icon: 'fa-solid fa-diagram-project', cat: 'Project', action: () => { scrollToId('projects'); setTimeout(() => openProjectModal(p.id), 500); } })),
      ...(data.blog || []).map(post => ({ label: post.title, icon: 'fa-solid fa-pen-nib', cat: 'Blog', action: () => { window.location.href = `blog.html?post=${encodeURIComponent(post.slug || post.id)}`; } }))
    ];

    function scrollToId(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    let filtered = commands;
    let activeIndex = 0;

    function draw() {
      if (!filtered.length) {
        resultsEl.innerHTML = '<div class="cmdk-empty">No matches. Try a different search.</div>';
        return;
      }
      resultsEl.innerHTML = filtered.map((c, i) => `
        <button type="button" class="cmdk-item ${i === activeIndex ? 'active' : ''}" data-i="${i}">
          <i class="${c.icon}" aria-hidden="true"></i>
          <span>${escapeHtml(c.label)}</span>
          <span class="cmdk-item-cat">${escapeHtml(c.cat)}</span>
        </button>
      `).join('');
      resultsEl.querySelectorAll('.cmdk-item').forEach(btn => {
        btn.addEventListener('click', () => runCommand(Number(btn.dataset.i)));
      });
    }

    function runCommand(i) {
      const cmd = filtered[i];
      if (!cmd) return;
      close();
      cmd.action();
    }

    function open() {
      overlay.classList.add('open');
      input.value = '';
      filtered = commands;
      activeIndex = 0;
      draw();
      FocusTrap.activate(document.querySelector('.cmdk-box'));
      setTimeout(() => input.focus(), 30);
    }
    function close() {
      overlay.classList.remove('open');
      FocusTrap.deactivate();
    }

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      filtered = q ? commands.filter(c => c.label.toLowerCase().includes(q) || c.cat.toLowerCase().includes(q)) : commands;
      activeIndex = 0;
      draw();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); runCommand(activeIndex); }
      else if (e.key === 'Escape') { close(); }
    });

    document.getElementById('cmdkTrigger').addEventListener('click', open);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      const isK = e.key === 'k' || e.key === 'K';
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        overlay.classList.contains('open') ? close() : open();
      }
    });
  }

  /* ============================ GITHUB ACTIVITY WIDGET ============================ */
  async function initGitHubStats() {
    const username = data.profile.githubUsername;
    const card = document.getElementById('githubCard');
    if (!username || !card) return;
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error('GitHub user not found');
      const user = await res.json();

      document.getElementById('githubAvatar').src = user.avatar_url;
      document.getElementById('githubAvatar').alt = `${user.login} on GitHub`;
      const userLink = document.getElementById('githubUserLink');
      userLink.textContent = `@${user.login}`;
      userLink.href = user.html_url;
      document.getElementById('githubBio').textContent = user.bio || 'Frontend developer on GitHub';
      document.getElementById('githubFollowBtn').href = user.html_url;

      document.getElementById('githubStatsRow').innerHTML = `
        <div class="github-stat"><strong>${user.public_repos}</strong><span>Repos</span></div>
        <div class="github-stat"><strong>${user.followers}</strong><span>Followers</span></div>
        <div class="github-stat"><strong>${user.following}</strong><span>Following</span></div>
        <div class="github-stat"><strong>${new Date(user.created_at).getFullYear()}</strong><span>Joined</span></div>
      `;

      // Third-party contribution-graph image generator; hide the chart block
      // gracefully if it fails to load instead of showing a broken image.
      const chartImg = document.getElementById('githubChart');
      chartImg.src = `https://ghchart.rshah.org/ffb454/${encodeURIComponent(username)}`;
      chartImg.addEventListener('error', () => { chartImg.closest('.github-chart-wrap').style.display = 'none'; });

      card.hidden = false;
      requestAnimationFrame(() => { bindShimmer(); });
    } catch (err) {
      // No internet, rate-limited, or invalid username — simply skip the
      // widget rather than showing broken content.
      console.warn('GitHub stats unavailable:', err.message);
    }
  }

  /* ============================ WHATSAPP FLOATING BUTTON ============================ */
  function initWhatsApp() {
    const cfg = data.integrations && data.integrations.whatsapp;
    const btn = document.getElementById('whatsappBtn');
    if (!btn || !cfg || !cfg.enabled || !cfg.number) return;
    const text = encodeURIComponent(cfg.message || '');
    btn.href = `https://wa.me/${cfg.number.replace(/\D/g, '')}${text ? `?text=${text}` : ''}`;
    btn.hidden = false;
  }

  /* ============================ COOKIE / LOCAL STORAGE CONSENT ============================ */
  function initCookieConsent() {
    if (!data.siteSettings.cookieConsentEnabled) return;
    const KEY = 'cookieConsentAccepted';
    if (localStorage.getItem(KEY)) return;
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;

    banner.hidden = false;
    requestAnimationFrame(() => {
      banner.classList.add('visible');
      updateBottomReservedSpace();
    });
    window.addEventListener('resize', () => {
      if (banner.classList.contains('visible')) updateBottomReservedSpace();
    });

    document.getElementById('cookieAcceptBtn').addEventListener('click', () => {
      localStorage.setItem(KEY, '1');
      banner.classList.remove('visible');
      updateBottomReservedSpace();
      setTimeout(() => { banner.hidden = true; }, 400);
    });
  }

  /* ============================ VISITOR TESTIMONIAL SUBMISSION ============================ */
  function initTestimonialSubmission() {
    const openBtn = document.getElementById('openTestimonialFormBtn');
    const overlay = document.getElementById('testimonialFormOverlay');
    const form = document.getElementById('testimonialForm');
    if (!openBtn || !overlay || !form) return;

    const starPicker = document.getElementById('starPicker');
    const ratingInput = document.getElementById('tf-rating');
    function drawStars(rating) {
      starPicker.querySelectorAll('button').forEach(b => b.classList.toggle('filled', Number(b.dataset.star) <= rating));
    }
    drawStars(5);
    starPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      ratingInput.value = btn.dataset.star;
      drawStars(Number(btn.dataset.star));
    });

    function open() {
      overlay.classList.add('open');
      FocusTrap.activate(overlay.querySelector('.site-modal'));
      document.getElementById('tf-name').focus();
    }
    function close() {
      overlay.classList.remove('open');
      FocusTrap.deactivate();
    }

    openBtn.addEventListener('click', open);
    document.getElementById('testimonialFormClose').addEventListener('click', close);
    document.getElementById('testimonialFormCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot: dropped silently, same pattern as the contact form.
      const hp = document.getElementById('tf-website');
      if (hp && hp.value) return;

      const name = document.getElementById('tf-name').value.trim();
      const role = document.getElementById('tf-role').value.trim();
      const text = document.getElementById('tf-text').value.trim();
      const rating = Number(ratingInput.value);
      if (!name || !role || !text) return;

      DataStore.addItem('pendingTestimonials', {
        name, role, text, rating,
        photo: 'assets/images/testimonials/t1.svg',
        submittedAt: new Date().toISOString()
      });

      form.reset();
      drawStars(5);
      close();
      Toast.success('Thank you!', 'Your testimonial was submitted and will appear once reviewed.');
    });
  }

  /* ============================ PAGE LOADER ============================ */
  function initLoader() {
    window.addEventListener('load', () => {
      setTimeout(() => document.getElementById('pageLoader').classList.add('hidden'), 500);
    });
    // Fallback in case 'load' already fired
    setTimeout(() => document.getElementById('pageLoader').classList.add('hidden'), 2500);
  }

  /* ============================ HELPERS ============================ */
  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function escapeAttr(str = '') { return escapeHtml(str); }

  /* ============================ INIT ============================ */
  function init() {
    applySiteSettings();
    renderHero();
    renderAbout();
    renderSkills();
    renderProjects();
    renderBlog();
    renderServices();
    renderClients();
    renderTimeline();
    renderCertificates();
    renderGallery();
    renderTestimonials();
    renderFAQ();
    renderContact();
    // Runs after the render*() calls above — some of them (renderClients,
    // for one) set a section's display based on whether it has data, so an
    // explicit "hide this section" from Website Settings has to be applied
    // last or a data-driven render could re-show it.
    applySectionVisibility();
    initNav();
    initScrollUtils();
    initLoader();
    initProjectModal();
    initCustomCursor();
    initParallax();
    initPWA();
    initCommandPalette();
    initGitHubStats();
    initWhatsApp();
    initCookieConsent();
    initTestimonialSubmission();
    initNewsletter();
    observeReveal();
    bindShimmer();
    bindMagnetic();
    // Some data-i18n elements (e.g. the "All" project filter button) are
    // created by the render functions above, after I18n.init() already ran
    // at the top of this script — re-apply so they pick up the saved
    // language too instead of always showing their hardcoded English text.
    I18n.apply(I18n.get());
  }

  document.addEventListener('DOMContentLoaded', init);
})();
