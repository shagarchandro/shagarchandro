/* ==========================================================================
   DATA STORE
   Single source of truth for the whole project.
   The public site (js/main.js) reads this. The admin panel (admin/js/admin.js)
   reads AND writes this. Both share the exact same schema below, so anything
   edited in /admin is reflected on the live site immediately (same browser,
   since this is a static, backend-free project running on localStorage).
   ========================================================================== */

const STORAGE_KEY = 'portfolioData';
const AUTH_KEY = 'portfolioAuth';
const SESSION_KEY = 'portfolioSession';
const LOGIN_HISTORY_KEY = 'portfolioLoginHistory';
const BACKUP_META_KEY = 'portfolioBackupMeta';

/* Full JSON structure for every section. This exact shape is what gets
   persisted to localStorage under STORAGE_KEY. See /data/schema.json for a
   documented, standalone copy of this same structure. */
const DEFAULT_DATA = {
  siteSettings: {
    siteTitle: 'Shagar Chandro — Frontend Developer',
    logoText: 'SC',
    favicon: 'assets/images/profile/favicon.svg',
    footerText: '© 2026 Shagar Chandro. All rights reserved.',
    primaryColor: '#ffb454',
    secondaryColor: '#5eead4',
    backgroundColor: '#0b0f17',
    fontFamily: "'Space Grotesk', sans-serif",
    cookieConsentEnabled: true
  },

  profile: {
    name: 'Shagar Chandro',
    title: 'Frontend Developer',
    bio: 'I build fast, accessible, and thoughtfully designed interfaces — from pixel-perfect landing pages to full React applications.',
    photo: 'assets/images/profile/profile.svg',
    resumeUrl: 'assets/Resume-of-Shagar-Chandro.pdf',
    githubUsername: 'shagarchandro'
  },

  hero: {
    title: 'Shagar Chandro',
    subtitle: 'Frontend Developer',
    description: "I craft clean, responsive, and user-focused web experiences with HTML, CSS, JavaScript and React — turning ideas into interfaces people enjoy using.",
    typedRoles: ['Frontend Developer', 'UI/UX Enthusiast', 'React Developer', 'Problem Solver'],
    nowStatus: 'Building out this very portfolio and its admin panel',
    socialLinks: [
      { platform: 'GitHub', url: 'https://github.com/shagarchandro', icon: 'fa-brands fa-github' },
      { platform: 'LinkedIn', url: 'https://www.linkedin.com/in/shagar-chandro-26a58121b/', icon: 'fa-brands fa-linkedin-in' },
      { platform: 'Facebook', url: 'https://facebook.com', icon: 'fa-brands fa-facebook-f' },
      { platform: 'Twitter', url: 'https://twitter.com', icon: 'fa-brands fa-twitter' }
    ]
  },

  about: {
    text: "I'm Shagar Chandro, a frontend developer based in Dhaka, Bangladesh. I love turning complex problems into simple, beautiful and intuitive interfaces. My focus is on writing clean, maintainable code and building products that feel effortless to use.",
    experienceSummary: '1+ Years Experience',
    educationSummary: 'B.Sc. in Computer Science & Engineering',
    stats: [
      { label: 'Projects Completed', value: 12 },
      { label: 'Happy Clients', value: 8 },
      { label: 'Years Learning', value: 3 },
      { label: 'Cups of Coffee', value: 240 }
    ]
  },

  skills: [
    { id: 'sk1', name: 'HTML5', percentage: 95, icon: 'fa-brands fa-html5' },
    { id: 'sk2', name: 'CSS3', percentage: 92, icon: 'fa-brands fa-css3-alt' },
    { id: 'sk3', name: 'JavaScript', percentage: 88, icon: 'fa-brands fa-js' },
    { id: 'sk4', name: 'React', percentage: 80, icon: 'fa-brands fa-react' },
    { id: 'sk5', name: 'Git & GitHub', percentage: 85, icon: 'fa-brands fa-git-alt' },
    { id: 'sk6', name: 'Responsive Design', percentage: 90, icon: 'fa-solid fa-mobile-screen' },
    { id: 'sk7', name: 'Tailwind CSS', percentage: 78, icon: 'fa-brands fa-css3' },
    { id: 'sk8', name: 'Node.js (Basics)', percentage: 60, icon: 'fa-brands fa-node' }
  ],

  projects: [
    { id: 'pr1', title: 'Aam Bazar', description: 'A fruit e-commerce concept site with product listing, cart UI and a clean checkout flow.', image: 'assets/images/projects/aambazar.svg', liveLink: 'https://shagarchandro.github.io/aambazar.com/', githubLink: 'https://github.com/shagarchandro/aambazar.com', category: 'E-commerce', challenge: 'Local fruit sellers had no simple way to showcase products online or take orders without relying on third-party marketplace apps.', solution: 'Built a lightweight storefront with category browsing, a persistent cart and a streamlined checkout — all running on the client with no backend dependency.', techStack: 'HTML, CSS, JavaScript, LocalStorage' },
    { id: 'pr2', title: 'Amer Hat Bazar', description: 'A responsive local marketplace landing experience built with vanilla HTML, CSS and JavaScript.', image: 'assets/images/projects/amerhatbazar.svg', liveLink: 'https://shagarchandro.github.io/amerhatbazar.com/', githubLink: 'https://github.com/shagarchandro/amerhatbazar.com', category: 'E-commerce', challenge: 'Needed a marketplace-style landing page that felt trustworthy and fast on low-end mobile devices common in the target market.', solution: 'Focused on a lean CSS footprint, compressed imagery and a mobile-first layout to keep load times low on 3G connections.', techStack: 'HTML, CSS, JavaScript' },
    { id: 'pr3', title: 'Personal Home Page', description: 'An animated personal landing page exploring layout, motion and typography experiments.', image: 'assets/images/projects/homepage.svg', liveLink: 'https://shagarchandro.github.io/home-page/', githubLink: 'https://github.com/shagarchandro/home-page', category: 'Landing Page', challenge: 'Wanted a sandbox to practice advanced CSS animation and typography without the constraints of a client brief.', solution: 'Used the page as a personal design lab — scroll-linked motion, variable fonts and layered typography experiments.', techStack: 'HTML, CSS, JavaScript' },
    { id: 'pr4', title: 'TextUtils (React)', description: 'A text-utility React app that trims, converts case and analyzes word/character counts in real time.', image: 'assets/images/projects/textutils.svg', liveLink: 'https://shagarchandro.github.io/textutils-React-js/', githubLink: 'https://github.com/shagarchandro/textutils-React-js', category: 'React App', challenge: 'Needed a first real React project to learn component state, props and controlled inputs beyond tutorials.', solution: 'Built a small but complete utility app — case conversion, whitespace trimming, live word/character counts — all driven by React state.', techStack: 'React, JavaScript, CSS' },
    { id: 'pr5', title: 'School ERP UI', description: 'An admin-style dashboard interface concept for managing students, classes and results.', image: 'assets/images/projects/schoolerp.svg', liveLink: '#', githubLink: '#', category: 'Dashboard', challenge: 'Small schools often manage records with paper or spreadsheets — a big usability gap for non-technical staff.', solution: 'Designed a clean, form-heavy admin UI concept covering student records, class assignment and result entry.', techStack: 'HTML, CSS, JavaScript' },
    { id: 'pr6', title: 'Portfolio Website', description: 'This very portfolio — fully responsive, dark/light aware, and backed by a custom admin panel.', image: 'assets/images/projects/portfolio.svg', liveLink: '#', githubLink: 'https://github.com/shagarchandro/shagarchandro-Portfolio', category: 'Portfolio', challenge: 'Needed a portfolio that could be updated without touching code, and that felt distinctive rather than templated.', solution: 'Built a shared localStorage data layer powering both the public site and a full custom admin panel, styled around a code-editor visual identity.', techStack: 'HTML, CSS, JavaScript, LocalStorage' }
  ],

  experience: [
    { id: 'ex1', role: 'Frontend Developer', company: 'Freelance', duration: '2024 — Present', description: 'Designing and building responsive websites and landing pages for small businesses and personal brands.' },
    { id: 'ex2', role: 'Web Development Intern', company: 'Local Tech Startup', duration: '2023 — 2024', description: 'Assisted in building and maintaining UI components, fixed cross-browser issues, and learned Git workflows in a team setting.' }
  ],

  education: [
    { id: 'ed1', degree: 'B.Sc. in Computer Science & Engineering', institute: 'Uttara University', duration: '2021 — 2025', description: 'Focused on web technologies, data structures, and software engineering fundamentals.' },
    { id: 'ed2', degree: 'Higher Secondary Certificate (HSC)', institute: 'Kurigram Polytechnic Institute', duration: '2018 — 2020', description: 'Completed HSC with a focus on science and technology.' }
  ],

  certificates: [
    { id: 'ce1', title: 'Responsive Web Design', issuer: 'freeCodeCamp', date: '2023', image: 'assets/images/certificates/cert1.svg', link: '#' },
    { id: 'ce2', title: 'JavaScript Algorithms & Data Structures', issuer: 'freeCodeCamp', date: '2023', image: 'assets/images/certificates/cert2.svg', link: '#' },
    { id: 'ce3', title: 'React – The Complete Guide', issuer: 'Udemy', date: '2024', image: 'assets/images/certificates/cert3.svg', link: '#' }
  ],

  gallery: [
    { id: 'ga1', image: 'assets/images/gallery/gallery1.svg', caption: 'Workspace' },
    { id: 'ga2', image: 'assets/images/gallery/gallery2.svg', caption: 'Hackathon' },
    { id: 'ga3', image: 'assets/images/gallery/gallery3.svg', caption: 'Team meetup' },
    { id: 'ga4', image: 'assets/images/gallery/gallery4.svg', caption: 'Conference' }
  ],

  services: [
    { id: 'se1', title: 'Website Design', description: 'Clean, modern, and conversion-focused website design tailored to your brand.', icon: 'fa-solid fa-pen-ruler' },
    { id: 'se2', title: 'Frontend Development', description: 'Pixel-perfect, responsive builds using HTML, CSS, JavaScript and React.', icon: 'fa-solid fa-code' },
    { id: 'se3', title: 'UI/UX Improvement', description: 'Auditing and improving existing interfaces for usability and accessibility.', icon: 'fa-solid fa-wand-magic-sparkles' },
    { id: 'se4', title: 'Website Maintenance', description: 'Ongoing fixes, performance tuning and content updates for existing sites.', icon: 'fa-solid fa-screwdriver-wrench' }
  ],

  clients: [
    { id: 'cl1', name: 'Aam Bazar', logo: 'assets/images/clients/client1.svg' },
    { id: 'cl2', name: 'Amer Hat Bazar', logo: 'assets/images/clients/client2.svg' },
    { id: 'cl3', name: 'TextUtils', logo: 'assets/images/clients/client3.svg' },
    { id: 'cl4', name: 'School ERP', logo: 'assets/images/clients/client4.svg' }
  ],

  testimonials: [
    { id: 'te1', name: 'Rafiul Islam', role: 'Startup Founder', photo: 'assets/images/testimonials/t1.svg', text: 'Shagar delivered our landing page ahead of schedule with great attention to detail.', rating: 5 },
    { id: 'te2', name: 'Nusrat Jahan', role: 'Product Manager', photo: 'assets/images/testimonials/t2.svg', text: 'Communicative, reliable, and genuinely cares about getting the UI right.', rating: 5 },
    { id: 'te3', name: 'Imran Kabir', role: 'Small Business Owner', photo: 'assets/images/testimonials/t3.svg', text: 'Our site finally feels modern and works great on mobile. Highly recommend.', rating: 4 }
  ],

  // Visitor-submitted testimonials land here first ("Share Your Experience"
  // form) and only appear on the public site once an admin approves them
  // from Admin > Testimonial Requests, which moves the entry into
  // `testimonials` above.
  pendingTestimonials: [],

  faqs: [
    { id: 'fa1', question: 'What technologies do you specialize in?', answer: 'Primarily HTML5, CSS3, JavaScript and React — with a strong focus on responsive layout, accessibility and clean, maintainable code.' },
    { id: 'fa2', question: 'Do you work with clients remotely?', answer: 'Yes — all of my current work is remote, and I communicate through email, calls or whichever tool a client prefers.' },
    { id: 'fa3', question: 'How long does a typical project take?', answer: 'A landing page usually takes 3–7 days; a full multi-page site or small web app can take 2–4 weeks depending on scope.' },
    { id: 'fa4', question: 'Do you provide ongoing maintenance after launch?', answer: 'Yes, I offer ongoing fixes, content updates and small feature additions after a site goes live.' }
  ],

  blog: [
    {
      id: 'bl1', slug: 'building-this-portfolio', title: 'How I Built This Portfolio (and Its Admin Panel)',
      excerpt: 'A behind-the-scenes look at building a fully static, backend-free portfolio with its own custom CMS.',
      cover: 'assets/images/projects/portfolio.svg', date: '2026-06-01', tags: 'JavaScript, Architecture',
      content: "Most portfolio sites hardcode their content directly into the HTML, which means every small update means editing code. I wanted something different: a single site where all the content — projects, skills, testimonials, everything — lives in one data layer that both the public page and a private admin panel read from.\n\nThe result is a shared `DataStore` module backed by `localStorage`. The public site renders every section from it on load; the admin panel reads and writes the exact same structure. No backend, no database, no build step — just HTML, CSS and JavaScript.\n\nThe trade-off is that data lives per-browser rather than syncing across devices, so the admin panel includes a JSON export/import tool to back up and restore content reliably."
    },
    {
      id: 'bl2', slug: 'why-vanilla-js', title: 'Why I Still Reach for Vanilla JavaScript',
      excerpt: 'Frameworks are great, but plain JavaScript still wins for small, fast, dependency-free sites.',
      cover: 'assets/images/projects/homepage.svg', date: '2026-05-12', tags: 'JavaScript, Opinion',
      content: "It's easy to reach for a framework by default, but for a lot of small projects — landing pages, portfolios, tools — plain JavaScript is genuinely the better choice. No build step, no dependency updates, no bundle size to worry about.\n\nThe key is discipline: keep render functions small and predictable, use a single source of truth for state, and lean on the platform (IntersectionObserver, the Fetch API, native form validation) instead of reinventing it.\n\nFrameworks earn their keep on large, stateful applications. For a fast, focused site, vanilla JS keeps things simple and easy to reason about."
    },
    {
      id: 'bl3', slug: 'responsive-design-checklist', title: 'My Responsive Design Checklist',
      excerpt: 'A quick checklist I run through on every project before calling it "done".',
      cover: 'assets/images/projects/schoolerp.svg', date: '2026-04-20', tags: 'CSS, Workflow',
      content: "Before I consider any layout finished, I run through the same short checklist: test at 375px, 768px, 1024px and 1440px; check that tap targets are at least 44px; make sure text never overflows its container; verify images have explicit dimensions to avoid layout shift; and confirm keyboard focus order makes sense.\n\nIt sounds basic, but consistently doing it catches the majority of responsive bugs before a client ever sees them."
    }
  ],

  contact: {
    phone: '+8801305144356',
    email: 'mbs200361@gmail.com',
    address: 'Gaibandha, Dhaka, Bangladesh',
    mapEmbed: 'https://maps.google.com/?q=Gaibandha,+Dhaka,+Bangladesh'
  },

  social: {
    facebook: 'https://facebook.com',
    github: 'https://github.com/shagarchandro',
    linkedin: 'https://www.linkedin.com/in/shagar-chandro-26a58121b/',
    youtube: '',
    instagram: '',
    twitter: 'https://twitter.com'
  },

  /* Contact-form delivery integrations, plus the WhatsApp floating button.
     All are optional and off by default — until configured, submissions are
     only stored locally (Admin > Messages), which always works regardless
     of these settings. */
  integrations: {
    emailjs: {
      enabled: false,
      serviceId: '',
      templateId: '',
      publicKey: ''
    },
    googleSheets: {
      enabled: false,
      // This must be a deployed Google Apps Script Web App URL
      // (https://script.google.com/macros/s/XXXX/exec) — a plain Sheet ID or
      // share link cannot receive data directly from a browser. See the
      // "Integrations" panel in /admin or the README for the exact script
      // to deploy.
      webAppUrl: ''
    },
    whatsapp: {
      enabled: false,
      // Digits only, with country code, no + or spaces (e.g. 8801305144356)
      number: '',
      message: "Hi! I found your portfolio and I'd like to talk about a project."
    }
  },

  messages: [],

  // Emails collected from the footer "Newsletter" signup form.
  newsletterSubscribers: [],

  analytics: {
    visitors: 0,
    pageViews: 0,
    popularPages: [
      { page: 'Home', views: 0 },
      { page: 'Projects', views: 0 },
      { page: 'Contact', views: 0 }
    ]
  }
};

const DEFAULT_AUTH = {
  username: 'admin',
  /* Default password: admin123 (SHA-256 hashed below at runtime-safe load time) */
  passwordHash: null,
  sessionTimeoutMinutes: 30,
  // Set once the admin generates a recovery key (Security panel). Lets them
  // reset a forgotten password without knowing the old one — there's no
  // backend/email here, so this is the only recovery path available.
  recoveryKeyHash: null
};

/* ---------- Tiny helpers (no external deps) ---------- */

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------- Data Store API ---------- */

const DataStore = {
  /** Read the full data object, seeding defaults on first run. */
  get() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.set(DEFAULT_DATA);
      return structuredClone(DEFAULT_DATA);
    }
    try {
      const parsed = JSON.parse(raw);
      // Merge with defaults so new fields introduced by an update never crash old data
      return this._mergeDefaults(DEFAULT_DATA, parsed);
    } catch (e) {
      console.error('Portfolio data corrupted, restoring defaults.', e);
      this.set(DEFAULT_DATA);
      return structuredClone(DEFAULT_DATA);
    }
  },

  set(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  /** Shallow-merge top level keys, keep arrays/objects from saved data if present. */
  _mergeDefaults(defaults, saved) {
    const out = structuredClone(defaults);
    for (const key of Object.keys(defaults)) {
      if (saved[key] !== undefined) out[key] = saved[key];
    }
    return out;
  },

  update(sectionKey, value) {
    const data = this.get();
    data[sectionKey] = value;
    this.set(data);
    return data;
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return this.get();
  },

  /* ---- Generic CRUD helpers for array-based sections ---- */
  addItem(sectionKey, item) {
    const data = this.get();
    item.id = item.id || uid(sectionKey);
    data[sectionKey].push(item);
    this.set(data);
    return data[sectionKey];
  },

  updateItem(sectionKey, id, updatedItem) {
    const data = this.get();
    const idx = data[sectionKey].findIndex(i => i.id === id);
    if (idx !== -1) data[sectionKey][idx] = { ...data[sectionKey][idx], ...updatedItem, id };
    this.set(data);
    return data[sectionKey];
  },

  deleteItem(sectionKey, id) {
    const data = this.get();
    data[sectionKey] = data[sectionKey].filter(i => i.id !== id);
    this.set(data);
    return data[sectionKey];
  },

  addMessage(msg) {
    const data = this.get();
    data.messages.unshift({ id: uid('msg'), date: new Date().toISOString(), read: false, ...msg });
    this.set(data);
    return data.messages;
  },

  /** Returns 'added', 'duplicate', or 'invalid'. */
  addSubscriber(email) {
    const clean = (email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return 'invalid';
    const data = this.get();
    if (data.newsletterSubscribers.some(s => s.email === clean)) return 'duplicate';
    data.newsletterSubscribers.unshift({ id: uid('sub'), email: clean, date: new Date().toISOString() });
    this.set(data);
    return 'added';
  },

  trackVisit(pageName = 'Home') {
    const data = this.get();
    const sessionFlag = 'visitCountedThisSession';
    if (!sessionStorage.getItem(sessionFlag)) {
      data.analytics.visitors += 1;
      sessionStorage.setItem(sessionFlag, '1');
    }
    data.analytics.pageViews += 1;
    const page = data.analytics.popularPages.find(p => p.page === pageName);
    if (page) page.views += 1;
    else data.analytics.popularPages.push({ page: pageName, views: 1 });
    this.set(data);
  }
};

/* ---------- Auth Store API ---------- */

const AuthStore = {
  async init() {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      const hash = await sha256('admin123');
      const auth = { ...DEFAULT_AUTH, passwordHash: hash };
      localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
      return auth;
    }
    return JSON.parse(raw);
  },

  get() {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  save(auth) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  },

  async verify(username, password) {
    const auth = this.get() || (await this.init());
    const hash = await sha256(password);
    return auth.username === username && auth.passwordHash === hash;
  },

  async changePassword(newPassword) {
    const auth = this.get() || (await this.init());
    auth.passwordHash = await sha256(newPassword);
    this.save(auth);
  },

  async changeUsername(newUsername) {
    const auth = this.get() || (await this.init());
    auth.username = newUsername.trim();
    this.save(auth);
  },

  /** Generates a fresh recovery key, stores only its hash, and returns the
      plaintext key ONCE — the caller must show it to the admin immediately,
      since it cannot be retrieved again after this. */
  async generateRecoveryKey() {
    const auth = this.get() || (await this.init());
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const key = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{1,4}/g).join('-');
    auth.recoveryKeyHash = await sha256(key);
    this.save(auth);
    return key;
  },

  hasRecoveryKey() {
    const auth = this.get();
    return !!(auth && auth.recoveryKeyHash);
  },

  /** Resets the password using a recovery key instead of the old password.
      Returns true on success, false if the key doesn't match. Invalidates
      the used key afterward (single use) so a leaked old key can't be reused. */
  async resetPasswordWithRecoveryKey(key, newPassword) {
    const auth = this.get() || (await this.init());
    if (!auth.recoveryKeyHash) return false;
    const hash = await sha256((key || '').trim().toUpperCase());
    if (hash !== auth.recoveryKeyHash) return false;
    auth.passwordHash = await sha256(newPassword);
    auth.recoveryKeyHash = null;
    this.save(auth);
    return true;
  },

  startSession(remember) {
    const auth = this.get();
    const expires = Date.now() + (auth.sessionTimeoutMinutes || 30) * 60 * 1000;
    const session = { loggedIn: true, expires, remember: !!remember };
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  getSession() {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expires) {
      this.logout();
      return null;
    }
    return session;
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  extendSession() {
    const session = this.getSession();
    if (!session) return;
    const auth = this.get();
    session.expires = Date.now() + (auth.sessionTimeoutMinutes || 30) * 60 * 1000;
    if (session.remember) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
};

/* ---------- Login activity (honest, client-side-only convenience log) ----------
   This is NOT real intrusion detection — everything here lives in the same
   browser storage a bad actor would already have to control to log in, so it
   can't catch anything that localStorage itself can't protect against. It's
   just a visible record of "when/what browser last logged in", useful for
   noticing something looks off (e.g. a login you don't remember). */
function parseBrowserLabel(ua) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  return 'Unknown browser';
}

const SecurityLog = {
  MAX_ENTRIES: 15,

  list() {
    const raw = localStorage.getItem(LOGIN_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  record() {
    const entries = this.list();
    entries.unshift({
      date: new Date().toISOString(),
      browser: typeof navigator !== 'undefined' ? parseBrowserLabel(navigator.userAgent) : 'Unknown',
      platform: typeof navigator !== 'undefined' && navigator.platform ? navigator.platform : 'Unknown'
    });
    localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(entries.slice(0, this.MAX_ENTRIES)));
  }
};

/* ---------- Backup reminder tracking ---------- */
const BackupTracker = {
  get() {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    return raw ? JSON.parse(raw) : { lastExportAt: null };
  },

  recordExport() {
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ lastExportAt: new Date().toISOString() }));
  },

  /** Days since the last export, or null if never exported. */
  daysSinceLastExport() {
    const meta = this.get();
    if (!meta.lastExportAt) return null;
    return Math.floor((Date.now() - new Date(meta.lastExportAt).getTime()) / (1000 * 60 * 60 * 24));
  }
};

/* ---------- Storage usage (localStorage has a per-origin quota, typically
   ~5-10MB depending on the browser — this is mostly eaten by base64-encoded
   images saved through the admin panel). ---------- */
const StorageUsage = {
  // A conservative, widely-safe assumption; real quotas vary by browser.
  ASSUMED_QUOTA_BYTES: 5 * 1024 * 1024,

  breakdown() {
    const items = [];
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key) || '';
      // UTF-16 in memory, but localStorage is typically quota-counted in
      // UTF-16 code units too (2 bytes/char) — close enough for an estimate.
      const bytes = value.length * 2;
      items.push({ key, bytes });
      total += bytes;
    }
    items.sort((a, b) => b.bytes - a.bytes);
    return { items, total, quota: this.ASSUMED_QUOTA_BYTES, percent: Math.min(100, (total / this.ASSUMED_QUOTA_BYTES) * 100) };
  },

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};
