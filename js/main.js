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

  /* ============================ THEME ============================ */
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
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
  function renderAbout() {
    document.getElementById('aboutPhoto').src = data.profile.photo;
    document.getElementById('aboutPhoto').alt = `Portrait of ${data.profile.name}`;
    document.getElementById('aboutText').textContent = data.about.text;
    document.getElementById('aboutExpSummary').textContent = data.about.experienceSummary;
    document.getElementById('aboutEduSummary').textContent = data.about.educationSummary;
    document.getElementById('aboutEmail').textContent = data.contact.email;
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
      <div class="skill-card card reveal" style="transition-delay:${i * 60}ms">
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
    filterWrap.innerHTML = categories.map((c, i) => `<button class="filter-btn ${i === 0 ? 'active' : ''}" data-filter="${escapeAttr(c)}" type="button">${escapeHtml(c)}</button>`).join('');

    const grid = document.getElementById('projectsGrid');
    function draw(filter) {
      const list = filter === 'All' ? data.projects : data.projects.filter(p => p.category === filter);
      grid.innerHTML = list.map((p, i) => `
        <article class="project-card card reveal" style="transition-delay:${i * 60}ms">
          <div class="project-thumb">
            <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)} preview" loading="lazy" />
            <div class="project-thumb-overlay">
              ${p.liveLink && p.liveLink !== '#' ? `<a href="${escapeAttr(p.liveLink)}" target="_blank" rel="noopener noreferrer" aria-label="Live preview of ${escapeAttr(p.title)}"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
              ${p.githubLink && p.githubLink !== '#' ? `<a href="${escapeAttr(p.githubLink)}" target="_blank" rel="noopener noreferrer" aria-label="Source code of ${escapeAttr(p.title)}"><i class="fa-brands fa-github"></i></a>` : ''}
            </div>
          </div>
          <div class="project-body">
            <span class="project-cat">${escapeHtml(p.category)}</span>
            <h3 class="project-title">${escapeHtml(p.title)}</h3>
            <p class="project-desc">${escapeHtml(p.description)}</p>
          </div>
        </article>
      `).join('');
      requestAnimationFrame(() => observeReveal());
    }
    draw('All');

    filterWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      draw(btn.dataset.filter);
    });
  }

  /* ============================ SERVICES ============================ */
  function renderServices() {
    document.getElementById('servicesGrid').innerHTML = data.services.map((s, i) => `
      <div class="service-card card reveal" style="transition-delay:${i * 60}ms">
        <div class="service-icon"><i class="${escapeAttr(s.icon)}" aria-hidden="true"></i></div>
        <h3 class="service-title">${escapeHtml(s.title)}</h3>
        <p class="service-desc">${escapeHtml(s.description)}</p>
      </div>
    `).join('');
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
        <div class="cert-thumb"><img src="${escapeAttr(c.image)}" alt="${escapeAttr(c.title)} certificate" loading="lazy" /></div>
        <div class="cert-body">
          <div>
            <h3 class="cert-title">${escapeHtml(c.title)}</h3>
            <div class="cert-issuer">${escapeHtml(c.issuer)}</div>
          </div>
          <span class="cert-date">${escapeHtml(c.date)}</span>
        </div>
      </div>
    `).join('');
  }

  /* ============================ GALLERY ============================ */
  function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = data.gallery.map((g, i) => `
      <div class="gallery-item reveal" style="transition-delay:${i * 50}ms" data-img="${escapeAttr(g.image)}" data-caption="${escapeAttr(g.caption)}" role="button" tabindex="0" aria-label="View ${escapeAttr(g.caption)} image">
        <img src="${escapeAttr(g.image)}" alt="${escapeAttr(g.caption)}" loading="lazy" />
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
        <div class="testimonial-avatar"><img src="${escapeAttr(t.photo)}" alt="${escapeAttr(t.name)}" loading="lazy" /></div>
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
    document.getElementById('contactPhone').textContent = data.contact.phone;
    document.getElementById('contactEmail').textContent = data.contact.email;
    document.getElementById('contactAddress').textContent = data.contact.address;
    document.getElementById('footerAbout').textContent = data.about.text.slice(0, 130) + '...';

    const mapFrame = document.getElementById('contactMapFrame');
    const query = encodeURIComponent(data.contact.address);
    mapFrame.src = `https://maps.google.com/maps?q=${query}&output=embed`;

    // The admin-editable "Google Map link" is used for the outbound "Open in
    // Google Maps" link; the embedded iframe itself is always built from the
    // address above so it keeps working even if that field is left blank.
    const mapLink = document.getElementById('contactMapLink');
    if (mapLink) {
      mapLink.href = (data.contact.mapEmbed && data.contact.mapEmbed.trim())
        ? data.contact.mapEmbed
        : `https://maps.google.com/?q=${query}`;
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

      // Always store the message locally so it shows up in the Admin > Messages panel.
      DataStore.addMessage(payload);

      // Simulate network delay so the UI feels responsive rather than instant.
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
        form.reset();
        form.querySelectorAll('.field').forEach(f => f.classList.remove('valid', 'invalid'));
        statusEl.textContent = "Message sent successfully! I'll get back to you soon.";
        statusEl.style.color = 'var(--success)';
        statusEl.classList.add('show');
        Toast.success('Message sent', "Thanks for reaching out — I'll reply soon.");
      }, 700);
    });
  }

  /* ============================ NAV / HEADER ============================ */
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
    const sections = ['home', 'about', 'skills', 'projects', 'experience', 'certificates', 'contact']
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
    renderServices();
    renderTimeline();
    renderCertificates();
    renderGallery();
    renderTestimonials();
    renderContact();
    initNav();
    initScrollUtils();
    initLoader();
    observeReveal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
