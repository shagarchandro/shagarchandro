/* ==========================================================================
   I18N — English / Bengali toggle for static UI chrome
   This translates hardcoded labels, navigation, section headings, buttons,
   form text and footer copy. It intentionally does NOT translate
   admin-entered content (profile bio, project descriptions, blog posts,
   testimonials, etc.) — that stays exactly as written in the Admin Panel,
   since auto-translating user content reliably needs a translation API this
   project doesn't depend on. Elements are marked with data-i18n="key"
   (innerHTML), data-i18n-placeholder="key", or data-i18n-aria="key".
   ========================================================================== */

const TRANSLATIONS = {
  'nav.home': { en: 'Home', bn: 'হোম' },
  'nav.about': { en: 'About', bn: 'পরিচিতি' },
  'nav.skills': { en: 'Skills', bn: 'দক্ষতা' },
  'nav.projects': { en: 'Projects', bn: 'প্রজেক্ট' },
  'nav.blog': { en: 'Blog', bn: 'ব্লগ' },
  'nav.experience': { en: 'Experience', bn: 'অভিজ্ঞতা' },
  'nav.certificates': { en: 'Certificates', bn: 'সার্টিফিকেট' },
  'nav.gallery': { en: 'Gallery', bn: 'গ্যালারি' },
  'nav.services': { en: 'Services', bn: 'সেবা' },
  'nav.faq': { en: 'FAQ', bn: 'প্রশ্নোত্তর' },
  'nav.contact': { en: 'Contact', bn: 'যোগাযোগ' },
  'nav.letsTalk': { en: "Let's Talk", bn: 'কথা বলুন' },

  'hero.status': { en: '<span class="tok-var">const</span>&nbsp;status&nbsp;=&nbsp;"available_for_work"', bn: '<span class="tok-var">const</span>&nbsp;status&nbsp;=&nbsp;"কাজের জন্য উপলব্ধ"' },
  'hero.viewProjects': { en: 'View Projects', bn: 'প্রজেক্ট দেখুন' },
  'hero.downloadCV': { en: 'Download CV', bn: 'সিভি ডাউনলোড' },
  'hero.now': { en: 'Currently', bn: 'বর্তমানে' },

  'about.eyebrow': { en: 'About Me', bn: 'আমার সম্পর্কে' },
  'about.titleHtml': { en: 'Building interfaces people <span class="accent-text">enjoy using</span>.', bn: 'এমন ইন্টারফেস তৈরি করি যা মানুষ <span class="accent-text">ব্যবহার করে আনন্দ পায়</span>।' },
  'about.experience': { en: 'EXPERIENCE', bn: 'অভিজ্ঞতা' },
  'about.education': { en: 'EDUCATION', bn: 'শিক্ষা' },
  'about.email': { en: 'EMAIL', bn: 'ইমেইল' },
  'about.location': { en: 'LOCATION', bn: 'অবস্থান' },
  'about.getInTouch': { en: 'Get In Touch', bn: 'যোগাযোগ করুন' },
  'about.downloadResume': { en: 'Download Resume', bn: 'রিজিউমি ডাউনলোড করুন' },
  'skills.levelExpert': { en: 'Expert', bn: 'দক্ষ' },
  'skills.levelAdvanced': { en: 'Advanced', bn: 'উন্নত' },
  'skills.levelIntermediate': { en: 'Intermediate', bn: 'মধ্যম' },
  'skills.levelBeginner': { en: 'Beginner', bn: 'প্রাথমিক' },

  'skills.eyebrow': { en: 'Skills', bn: 'দক্ষতা' },
  'skills.titleHtml': { en: 'My <span class="accent-text">Tech Stack</span>', bn: 'আমার <span class="accent-text">টেক স্ট্যাক</span>' },
  'skills.desc': { en: 'Tools and technologies I use to bring ideas to life.', bn: 'যেসব টুল ও প্রযুক্তি দিয়ে আমি আইডিয়াকে বাস্তবে রূপ দিই।' },

  'clients.eyebrow': { en: 'Worked With', bn: 'কাজ করেছি যাদের সাথে' },

  'projects.eyebrow': { en: 'Portfolio', bn: 'পোর্টফোলিও' },
  'projects.titleHtml': { en: 'Featured <span class="accent-text">Projects</span>', bn: 'নির্বাচিত <span class="accent-text">প্রজেক্ট</span>' },
  'projects.desc': { en: "A selection of things I've designed, built and shipped.", bn: 'আমার ডিজাইন করা, তৈরি করা এবং প্রকাশ করা কিছু কাজ।' },
  'projects.filterAll': { en: 'All', bn: 'সব' },

  'blog.eyebrow': { en: 'Writing', bn: 'লেখালেখি' },
  'blog.titleHtml': { en: 'From the <span class="accent-text">Blog</span>', bn: '<span class="accent-text">ব্লগ</span> থেকে' },
  'blog.desc': { en: 'Notes on frontend development, design and building this very site.', bn: 'ফ্রন্টএন্ড ডেভেলপমেন্ট, ডিজাইন এবং এই সাইট তৈরির নোট।' },

  'services.eyebrow': { en: 'Services', bn: 'সেবা' },
  'services.titleHtml': { en: 'What I Can <span class="accent-text">Do For You</span>', bn: 'আমি আপনার জন্য <span class="accent-text">যা করতে পারি</span>' },
  'services.desc': { en: 'Focused, practical help across the frontend of your product.', bn: 'আপনার প্রোডাক্টের ফ্রন্টএন্ডে কেন্দ্রীভূত ও বাস্তবসম্মত সহায়তা।' },

  'experience.eyebrow': { en: 'Journey', bn: 'যাত্রা' },
  'experience.titleHtml': { en: 'Experience &amp; <span class="accent-text">Education</span>', bn: 'অভিজ্ঞতা ও <span class="accent-text">শিক্ষা</span>' },
  'experience.desc': { en: "Where I've worked and what I've studied along the way.", bn: 'যেখানে কাজ করেছি এবং যা পড়াশোনা করেছি।' },
  'experience.tabExperience': { en: 'Experience', bn: 'অভিজ্ঞতা' },
  'experience.tabEducation': { en: 'Education', bn: 'শিক্ষা' },

  'certificates.eyebrow': { en: 'Credentials', bn: 'সনদপত্র' },
  'certificates.titleHtml': { en: 'Certificates &amp; <span class="accent-text">Achievements</span>', bn: 'সার্টিফিকেট ও <span class="accent-text">অর্জন</span>' },
  'certificates.desc': { en: 'Courses and certifications that back up the skills above.', bn: 'উপরের দক্ষতাগুলো প্রমাণ করে এমন কোর্স ও সার্টিফিকেশন।' },

  'gallery.eyebrow': { en: 'Gallery', bn: 'গ্যালারি' },
  'gallery.titleHtml': { en: 'Behind The <span class="accent-text">Scenes</span>', bn: 'পর্দার <span class="accent-text">আড়ালে</span>' },
  'gallery.desc': { en: "A few snapshots outside of the code editor.", bn: 'কোড এডিটরের বাইরের কিছু মুহূর্ত।' },

  'testimonials.eyebrow': { en: 'Testimonials', bn: 'মতামত' },
  'testimonials.titleHtml': { en: 'What People <span class="accent-text">Say</span>', bn: 'মানুষ যা <span class="accent-text">বলে</span>' },
  'testimonials.shareBtn': { en: 'Share Your Experience', bn: 'আপনার অভিজ্ঞতা জানান' },

  'faq.eyebrow': { en: 'FAQ', bn: 'প্রশ্নোত্তর' },
  'faq.titleHtml': { en: 'Frequently Asked <span class="accent-text">Questions</span>', bn: 'সচরাচর জিজ্ঞাসিত <span class="accent-text">প্রশ্ন</span>' },

  'contact.eyebrow': { en: 'Contact', bn: 'যোগাযোগ' },
  'contact.titleHtml': { en: "Let's Work <span class=\"accent-text\">Together</span>", bn: 'আসুন একসাথে <span class="accent-text">কাজ করি</span>' },
  'contact.desc': { en: "Have a project in mind? Send a message and I'll get back to you.", bn: 'কোনো প্রজেক্ট মাথায় আছে? মেসেজ পাঠান, দ্রুত উত্তর দেব।' },
  'contact.phone': { en: 'PHONE', bn: 'ফোন' },
  'contact.email': { en: 'EMAIL', bn: 'ইমেইল' },
  'contact.address': { en: 'ADDRESS', bn: 'ঠিকানা' },
  'contact.mapLink': { en: 'Open in Google Maps', bn: 'গুগল ম্যাপে দেখুন' },
  'contact.saveContact': { en: 'Save Contact', bn: 'কন্টাক্ট সেভ করুন' },
  'contact.nameLabel': { en: 'Your Name', bn: 'আপনার নাম' },
  'contact.namePh': { en: 'John Doe', bn: 'আপনার নাম লিখুন' },
  'contact.emailLabel': { en: 'Your Email', bn: 'আপনার ইমেইল' },
  'contact.emailPh': { en: 'john@example.com', bn: 'you@example.com' },
  'contact.subjectLabel': { en: 'Subject', bn: 'বিষয়' },
  'contact.subjectPh': { en: 'Project inquiry', bn: 'প্রজেক্ট সম্পর্কিত' },
  'contact.messageLabel': { en: 'Message', bn: 'বার্তা' },
  'contact.messagePh': { en: 'Tell me about your project...', bn: 'আপনার প্রজেক্ট সম্পর্কে বলুন...' },
  'contact.sendBtn': { en: 'Send Message', bn: 'বার্তা পাঠান' },

  'footer.navigate': { en: 'Navigate', bn: 'নেভিগেট' },
  'footer.resources': { en: 'Resources', bn: 'রিসোর্স' },
  'footer.newsletter': { en: 'Newsletter', bn: 'নিউজলেটার' },
  'footer.newsletterText': { en: 'Get occasional updates on new projects and posts.', bn: 'নতুন প্রজেক্ট ও পোস্টের মাঝে মাঝে আপডেট পান।' },
  'footer.newsletterPh': { en: 'you@example.com', bn: 'you@example.com' },
  'footer.newsletterSuccess': { en: "Subscribed! Thanks for following along.", bn: 'সাবস্ক্রাইব হয়েছে! সাথে থাকার জন্য ধন্যবাদ।' },
  'footer.newsletterDuplicate': { en: "You're already subscribed.", bn: 'আপনি ইতিমধ্যে সাবস্ক্রাইব করেছেন।' },
  'footer.newsletterInvalid': { en: 'Please enter a valid email address.', bn: 'সঠিক ইমেইল ঠিকানা দিন।' },
  'footer.resume': { en: 'Resume', bn: 'সিভি' },
  'footer.printableResume': { en: 'Printable Resume (PDF)', bn: 'প্রিন্টযোগ্য সিভি (PDF)' },
  'footer.admin': { en: 'Admin Panel', bn: 'অ্যাডমিন প্যানেল' },
  'footer.privacy': { en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি' },
  'footer.builtWith': { en: 'Built with HTML, CSS & JavaScript', bn: 'HTML, CSS ও JavaScript দিয়ে তৈরি' },

  'cmdk.placeholder': { en: 'Search sections, projects, posts... (Esc to close)', bn: 'সেকশন, প্রজেক্ট, পোস্ট খুঁজুন... (Esc চাপুন বন্ধ করতে)' },
  'cmdk.searchLabel': { en: 'Search', bn: 'খুঁজুন' },

  'cookie.text': { en: "This site stores basic preferences and anonymous visit counts in your browser's local storage (no third-party cookies or tracking).", bn: 'এই সাইট আপনার ব্রাউজারের local storage-এ কিছু পছন্দ ও অজ্ঞাত ভিজিট-সংখ্যা সংরক্ষণ করে (কোনো থার্ড-পার্টি কুকি বা ট্র্যাকিং নেই)।' },
  'cookie.learnMore': { en: 'Learn more', bn: 'আরও জানুন' },
  'cookie.accept': { en: 'Got it', bn: 'বুঝেছি' },

  'install.title': { en: 'Install this site', bn: 'সাইটটি ইনস্টল করুন' },
  'install.text': { en: 'Add it to your home screen for quick, app-like access.', bn: 'দ্রুত অ্যাপের মতো ব্যবহারের জন্য হোম স্ক্রিনে যোগ করুন।' },
  'install.btn': { en: 'Install', bn: 'ইনস্টল' },
  'update.title': { en: 'Update available', bn: 'নতুন আপডেট এসেছে' },
  'update.text': { en: 'A new version of this site is ready.', bn: 'সাইটের নতুন একটি ভার্সন প্রস্তুত।' },
  'update.btn': { en: 'Refresh', bn: 'রিফ্রেশ' },

  'testimonialForm.title': { en: 'Share Your Experience', bn: 'আপনার অভিজ্ঞতা জানান' },
  'testimonialForm.nameLabel': { en: 'Your Name', bn: 'আপনার নাম' },
  'testimonialForm.roleLabel': { en: 'Your Role / Company', bn: 'আপনার পদবি / প্রতিষ্ঠান' },
  'testimonialForm.ratingLabel': { en: 'Rating', bn: 'রেটিং' },
  'testimonialForm.textLabel': { en: 'Your Testimonial', bn: 'আপনার মতামত' },
  'testimonialForm.note': { en: 'Submitted testimonials are reviewed before they appear on the site.', bn: 'জমা দেওয়া মতামত পর্যালোচনার পর সাইটে প্রকাশিত হবে।' },
  'testimonialForm.cancel': { en: 'Cancel', bn: 'বাতিল' },
  'testimonialForm.submit': { en: 'Submit', bn: 'জমা দিন' },

  'blog.allPosts': { en: 'All Posts', bn: 'সব পোস্ট' },
  'blog.searchDesc': { en: 'Search by title, or filter by tag.', bn: 'শিরোনাম দিয়ে খুঁজুন, বা ট্যাগ দিয়ে ফিল্টার করুন।' },
  'blog.searchPh': { en: 'Search posts...', bn: 'পোস্ট খুঁজুন...' },
  'blog.allTag': { en: 'All', bn: 'সব' },
  'blog.noMatch': { en: 'No posts match your search.', bn: 'আপনার সার্চের সাথে কোনো পোস্ট মেলেনি।' },
  'blog.minRead': { en: 'min read', bn: 'মিনিট পড়া' },
  'blog.readMore': { en: 'Read more', bn: 'আরও পড়ুন' },
  'blog.backToBlog': { en: 'Back to Blog', bn: 'ব্লগে ফিরে যান' },
  'blog.relatedPosts': { en: 'Related Posts', bn: 'সম্পর্কিত পোস্ট' },
  'blog.viewAllPosts': { en: 'View All Posts', bn: 'সব পোস্ট দেখুন' },
  'blog.noPostsYet': { en: 'No posts yet', bn: 'এখনো কোনো পোস্ট নেই' },
  'blog.checkBackSoon': { en: 'Check back soon.', bn: 'শীঘ্রই আবার দেখুন।' },
  'blog.eyebrowWriting': { en: 'Writing', bn: 'লেখালেখি' },
  'blog.backToPortfolio': { en: 'Back to portfolio', bn: 'পোর্টফোলিওতে ফিরে যান' },
  'blog.notFoundEyebrow': { en: 'Not found', bn: 'পাওয়া যায়নি' },
  'blog.notFoundTitle': { en: "This post doesn't exist (yet)", bn: 'এই পোস্টটি এখনো নেই' },
  'blog.notFoundDesc': { en: 'It may have been removed, or the link is out of date.', bn: 'এটি হয়তো সরিয়ে ফেলা হয়েছে, অথবা লিংকটি পুরনো।' },

  'comments.heading': { en: 'Comments', bn: 'মন্তব্য' },
  'comments.empty': { en: 'No comments yet — be the first to share your thoughts.', bn: 'এখনো কোনো মন্তব্য নেই — প্রথম মন্তব্যটি আপনিই করুন।' },
  'comments.nameLabel': { en: 'Name', bn: 'নাম' },
  'comments.textLabel': { en: 'Comment', bn: 'মন্তব্য' },
  'comments.submit': { en: 'Post Comment', bn: 'মন্তব্য জমা দিন' },
  'comments.note': { en: 'Comments are reviewed before they appear publicly.', bn: 'মন্তব্য পর্যালোচনার পর প্রকাশিত হবে।' },
  'comments.thanks': { en: 'Thanks — your comment is awaiting approval and will appear here once reviewed.', bn: 'ধন্যবাদ — আপনার মন্তব্যটি অনুমোদনের অপেক্ষায় আছে, পর্যালোচনার পর এখানে দেখা যাবে।' }
};

const I18n = {
  KEY: 'siteLang',

  get() {
    return localStorage.getItem(this.KEY) || 'en';
  },

  set(lang) {
    localStorage.setItem(this.KEY, lang);
  },

  apply(lang) {
    document.documentElement.setAttribute('lang', lang === 'bn' ? 'bn' : 'en');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const entry = TRANSLATIONS[key];
      if (entry) el.innerHTML = entry[lang] || entry.en;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const entry = TRANSLATIONS[key];
      if (entry) el.placeholder = entry[lang] || entry.en;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const entry = TRANSLATIONS[key];
      if (entry) el.setAttribute('aria-label', entry[lang] || entry.en);
    });
  },

  init() {
    this.apply(this.get());
  },

  toggle() {
    const next = this.get() === 'bn' ? 'en' : 'bn';
    this.set(next);
    this.apply(next);
    return next;
  }
};
