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
    fontFamily: "'Space Grotesk', sans-serif"
  },

  profile: {
    name: 'Shagar Chandro',
    title: 'Frontend Developer',
    bio: 'I build fast, accessible, and thoughtfully designed interfaces — from pixel-perfect landing pages to full React applications.',
    photo: 'assets/images/profile/profile.svg',
    resumeUrl: 'assets/Resume-of-Shagar-Chandro.pdf'
  },

  hero: {
    title: 'Shagar Chandro',
    subtitle: 'Frontend Developer',
    description: "I craft clean, responsive, and user-focused web experiences with HTML, CSS, JavaScript and React — turning ideas into interfaces people enjoy using.",
    typedRoles: ['Frontend Developer', 'UI/UX Enthusiast', 'React Developer', 'Problem Solver'],
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
    { id: 'pr1', title: 'Aam Bazar', description: 'A fruit e-commerce concept site with product listing, cart UI and a clean checkout flow.', image: 'assets/images/projects/aambazar.svg', liveLink: 'https://shagarchandro.github.io/aambazar.com/', githubLink: 'https://github.com/shagarchandro/aambazar.com', category: 'E-commerce' },
    { id: 'pr2', title: 'Amer Hat Bazar', description: 'A responsive local marketplace landing experience built with vanilla HTML, CSS and JavaScript.', image: 'assets/images/projects/amerhatbazar.svg', liveLink: 'https://shagarchandro.github.io/amerhatbazar.com/', githubLink: 'https://github.com/shagarchandro/amerhatbazar.com', category: 'E-commerce' },
    { id: 'pr3', title: 'Personal Home Page', description: 'An animated personal landing page exploring layout, motion and typography experiments.', image: 'assets/images/projects/homepage.svg', liveLink: 'https://shagarchandro.github.io/home-page/', githubLink: 'https://github.com/shagarchandro/home-page', category: 'Landing Page' },
    { id: 'pr4', title: 'TextUtils (React)', description: 'A text-utility React app that trims, converts case and analyzes word/character counts in real time.', image: 'assets/images/projects/textutils.svg', liveLink: 'https://shagarchandro.github.io/textutils-React-js/', githubLink: 'https://github.com/shagarchandro/textutils-React-js', category: 'React App' },
    { id: 'pr5', title: 'School ERP UI', description: 'An admin-style dashboard interface concept for managing students, classes and results.', image: 'assets/images/projects/schoolerp.svg', liveLink: '#', githubLink: '#', category: 'Dashboard' },
    { id: 'pr6', title: 'Portfolio Website', description: 'This very portfolio — fully responsive, dark/light aware, and backed by a custom admin panel.', image: 'assets/images/projects/portfolio.svg', liveLink: '#', githubLink: 'https://github.com/shagarchandro/shagarchandro-Portfolio', category: 'Portfolio' }
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

  testimonials: [
    { id: 'te1', name: 'Rafiul Islam', role: 'Startup Founder', photo: 'assets/images/testimonials/t1.svg', text: 'Shagar delivered our landing page ahead of schedule with great attention to detail.', rating: 5 },
    { id: 'te2', name: 'Nusrat Jahan', role: 'Product Manager', photo: 'assets/images/testimonials/t2.svg', text: 'Communicative, reliable, and genuinely cares about getting the UI right.', rating: 5 },
    { id: 'te3', name: 'Imran Kabir', role: 'Small Business Owner', photo: 'assets/images/testimonials/t3.svg', text: 'Our site finally feels modern and works great on mobile. Highly recommend.', rating: 4 }
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

  messages: [],

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
  sessionTimeoutMinutes: 30
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
