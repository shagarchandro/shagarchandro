# Shagar Chandro — Portfolio + Admin Panel

A fully rebuilt, responsive personal portfolio with a custom, no-backend Admin
Panel. Built with plain **HTML5, CSS3 and vanilla JavaScript** — no
frameworks, no build step. Every section of the public site can be edited
live from `/admin`, and all content is stored in the browser's
`localStorage`.

## 1. How to run it

No build step, no server required.

- **Quickest:** double-click `index.html` to open it in your browser.
- **Recommended:** serve the folder with any static server so paths and
  browser storage behave exactly like production, e.g.:
  ```bash
  npx serve .
  # or
  python3 -m http.server 8080
  ```
  then open `http://localhost:8080`.

Open `/admin/index.html` (or click **Admin Panel** in the site footer) to
manage content.

**Default admin login:** `admin` / `admin123` — change it immediately from
**Security → Change Password** after your first login.

## 2. Folder structure

```
/                       Root — the public site
├─ index.html           Main site (semantic HTML5, SEO meta, all sections)
├─ css/
│  ├─ variables.css      Design tokens (colors, type, spacing, dark/light theme)
│  ├─ base.css           Reset, base elements, layout/section helpers
│  ├─ components.css     Buttons, cards, nav, forms, toasts, loader, glass UI
│  ├─ sections.css       Hero, about, skills, projects, timeline, contact, footer
│  ├─ animations.css     Keyframes and animation utility classes
│  └─ responsive.css     Tablet / mobile / large-desktop breakpoints
├─ js/
│  ├─ data-store.js      Shared localStorage data layer + schema (used by site & admin)
│  ├─ validation.js      Toast notifications + form validators (shared)
│  └─ main.js            Renders every section from the data store; nav, theme,
│                         loader, scroll effects, carousel, lightbox, contact form
├─ admin/
│  ├─ index.html          Admin login screen + dashboard app shell
│  ├─ css/admin.css       Admin-only layout (sidebar, tables, modals, cards)
│  └─ js/admin.js         Auth/session, router, dashboard stats, generic CRUD
│                         engine, and every settings panel
├─ assets/
│  ├─ images/             profile/, projects/, certificates/, gallery/, testimonials/
│  └─ Resume-of-Shagar-Chandro.pdf   Placeholder — replace with the real CV
└─ data/
   └─ schema.json         Documented copy of the full data structure (reference only)
```

## 3. How content flows

`js/data-store.js` defines one JSON object (`DEFAULT_DATA`) covering every
section — profile, hero, about, skills, projects, experience, education,
certificates, gallery, services, testimonials, contact, social, site/theme
settings, messages and analytics. On first load it's seeded into
`localStorage` under the key `portfolioData`.

- **`index.html` / `js/main.js`** reads that data and renders the whole page.
- **`/admin`** reads *and writes* the same data. Any edit, add, or delete you
  make in the admin panel is immediately reflected on the public site the
  next time it loads (same browser).

This is a genuinely backend-free architecture — there is no server or
database. That means:
- All data lives in the visitor's own browser. It does **not** sync between
  devices or visitors, and clearing browser data resets everything back to
  the defaults baked into `data-store.js`.
- Contact form submissions are stored the same way and show up under
  **Admin → Messages**. There is no email delivery — wire up a service like
  Formspree, EmailJS or your own backend in `js/main.js` (`renderContact`)
  if you need real email notifications.
- For a real multi-user production site, replace `DataStore`'s
  localStorage calls with API calls to a real backend — the rest of the
  code (rendering, forms, admin UI) can stay as-is since it all goes through
  that one module.

## 4. Customizing content

Everything is editable from `/admin` — no code required for day-to-day
updates:
- **Profile / Hero / About** — identity, bio, photo, resume, social links
- **Skills / Projects / Experience / Education / Certificates / Gallery /
  Services / Testimonials** — full add / edit / delete for each, including
  image uploads (stored as base64 directly in the data)
- **Contact Info / Social Media** — phone, email, address, map, all socials
- **Theme Settings** — primary/secondary/background color, font
- **Website Settings** — site title, logo text, favicon, footer text
- **Messages** — view and delete contact-form submissions
- **Analytics** — local visitor/page-view counters
- **Security** — change password, session timeout

Design tokens (colors, spacing, fonts) also live in `css/variables.css` if
you'd rather adjust the visual system directly in code.

## 5. Images & the resume

The original upload didn't include any image assets, so this build ships
with clean, on-brand **SVG placeholders** for the profile photo, project
thumbnails, certificates, gallery and testimonials (`assets/images/...`),
plus a minimal placeholder PDF at
`assets/Resume-of-Shagar-Chandro.pdf`. Replace any of them either by:
- uploading a new file directly from the relevant Admin panel (Profile,
  Projects, Certificates, Gallery, Testimonials, Website Settings), or
- swapping the file on disk at the same path.

## 6. Notes on the CDN dependencies

The site loads **Google Fonts** (Space Grotesk / Inter / JetBrains Mono) and
**Font Awesome** icons from their public CDNs via `<link>` tags in
`index.html` and `admin/index.html`. An internet connection is required for
those to load; if you need a fully offline build, download the font/icon
files and swap the CDN `<link>` tags for local paths.

## 7. Accessibility & SEO

- Semantic landmarks (`header`, `main`, `nav`, `footer`, `section`), skip
  link, visible focus states, `aria-label`s on icon-only controls, alt text
  on all images.
- Respects `prefers-reduced-motion`.
- Meta description/keywords, canonical tag, and Open Graph tags in
  `index.html` — update them if you deploy to a different domain.
- `admin/index.html` is marked `noindex, nofollow` since it's not meant to
  be publicly indexed.
