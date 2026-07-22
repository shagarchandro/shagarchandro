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

**Default admin login:** `admin` / `admin123` — this is documented here
only; it is **not** shown anywhere in the admin UI for security. Change it
immediately from **Security → Change Password**, which now requires your
current password and enforces a minimum-strength new password (8+
characters, with a live strength meter) before it's accepted.

**Strongly recommended right after that:** generate an **Account Recovery
Key** from Security → Account Recovery Key and save it somewhere safe (a
password manager, not this browser). There's no email/backend here, so a
forgotten password with no recovery key means starting over from scratch.

## 2. Folder structure

```
/                       Root — the public site
├─ index.html           Main site (semantic HTML5, SEO meta, all sections)
├─ blog.html            Blog post reader page (?post=slug-or-id)
├─ resume.html          Printable / PDF-able resume (data-driven)
├─ 404.html             Custom error page
├─ privacy.html         Privacy policy page
├─ manifest.json        PWA manifest (installable app)
├─ service-worker.js    Offline caching (app shell + runtime cache)
├─ robots.txt / sitemap.xml / rss.xml   Basic SEO + feed files
├─ css/
│  ├─ variables.css      Design tokens (colors, type, spacing, dark/light theme)
│  ├─ base.css           Reset, base elements, layout/section helpers
│  ├─ components.css     Buttons, cards, nav, forms, toasts, loader, glass UI
│  ├─ sections.css       Hero, about, skills, projects, timeline, contact, footer
│  ├─ animations.css     Keyframes and animation utility classes
│  ├─ responsive.css     Tablet / mobile / large-desktop breakpoints
│  ├─ premium.css        Custom cursor, magnetic hover, project modal, FAQ,
│  │                     blog grid/reader, image shimmer, PWA install banner,
│  │                     command palette, WhatsApp button, cookie banner,
│  │                     GitHub card, star picker, visitor testimonial modal,
│  │                     language toggle, "Now" badge, client logo strip
│  └─ print.css          resume.html on-screen + @media print layout
├─ js/
│  ├─ data-store.js      Shared localStorage data layer + schema (used by site & admin)
│  ├─ validation.js      Toast notifications + form validators (shared)
│  ├─ i18n.js             English/Bengali translation dictionary + apply/toggle logic
│  ├─ main.js            Renders every section from the data store; nav, theme,
│  │                     loader, scroll effects, carousel, lightbox, contact form,
│  │                     custom cursor, magnetic hover, parallax, project modal,
│  │                     blog/FAQ rendering, PWA install prompt + SW registration,
│  │                     command palette, GitHub widget, WhatsApp button, cookie
│  │                     banner, visitor testimonial submission, focus trap,
│  │                     FAQ schema injection, language + Now-badge + clients
│  ├─ blog.js            Standalone script for blog.html (reads one post by slug)
│  └─ resume.js          Standalone script for resume.html
├─ admin/
│  ├─ index.html          Admin login screen + dashboard app shell
│  ├─ css/admin.css       Admin-only layout (sidebar, tables, modals, cards)
│  └─ js/admin.js         Auth/session, router, dashboard stats, generic CRUD
│                         engine (with drag-to-reorder), every settings panel,
│                         JSON export/import/reset + RSS regeneration (Data
│                         Management), Testimonial Requests approval queue,
│                         Clients panel, and login activity log
├─ assets/
│  ├─ images/             profile/, projects/, certificates/, gallery/,
│  │                      testimonials/, clients/, and og-image.png
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
  Services / Clients / Testimonials / Blog / FAQ** — full add / edit / delete
  for each, including image uploads (stored as base64 directly in the data)
  and **drag-and-drop reordering** (drag the ⠿ handle in any list — the new
  order is saved immediately and reflected on the public site)
- **Contact Info / Social Media** — phone, email, address, map, all socials
- **Integrations** — connect EmailJS (real email delivery) and/or a Google
  Sheet (via Apps Script) to contact-form submissions — see section 6 below
- **Theme Settings** — primary/secondary/background color, font. Leaving
  these at their defaults keeps each theme's own tuned colors; changing any
  of them applies your custom color/font in both dark and light mode
- **Website Settings** — site title, logo text, favicon, footer text
- **Data Management** — export everything as a JSON backup, import a backup
  to restore it (replacing current data), or reset everything back to the
  original sample content
- **Messages** — view and delete contact-form submissions
- **Analytics** — local visitor/page-view counters
- **Security** — change password, session timeout

Design tokens (colors, spacing, fonts) also live in `css/variables.css` if
you'd rather adjust the visual system directly in code.

## 5. Premium features added on top of the base build

- **Project case-study modals** — click any project card to open a detail
  view (challenge / solution / tech stack) instead of just a thumbnail. Edit
  these fields from Admin → Projects.
- **Custom cursor + magnetic hover** — a two-part cursor (dot + trailing
  ring) that reacts to hoverable elements, and buttons/cards that gently
  pull toward the pointer. Automatically disabled on touch devices — the
  system checks `(hover: none)` / `(pointer: coarse)` and never engages
  there, so mobile is untouched.
- **Parallax hero glow** — the two background glow orbs drift slightly with
  the mouse, again gated off on touch devices.
- **Image shimmer-in** — images fade in over a subtle shimmer placeholder
  instead of popping in abruptly once loaded.
- **Blog** — a full mini-blog: a 3-post teaser grid on the homepage
  (`#blog`), a standalone reader page (`blog.html?post=slug`), and full CRUD
  in Admin → Blog. Note: `sitemap.xml` is a static file, so if you add or
  remove posts you'll want to update it by hand (or drop it if you don't
  need it — it's optional).
- **FAQ accordion** — editable Q&A list (Admin → FAQ), same drag-to-reorder
  support as everything else.
- **PWA support** — `manifest.json` + `service-worker.js` make the site
  installable ("Add to Home Screen" / desktop install) and give it basic
  offline support via a cache-first strategy for static assets and a
  network-first strategy for pages. Requires HTTPS (or localhost/127.0.0.1)
  to activate — it's silently skipped on plain `http://` or `file://`.
- **SEO extras** — JSON-LD `Person` structured data, `robots.txt`,
  `sitemap.xml`.
- **Data Management (Admin)** — JSON export/import for full backup/restore,
  plus a one-click reset to the original sample data.

## 6. Contact form integrations (EmailJS + Google Sheets)

By default, contact-form submissions are only stored locally
(Admin → Messages) — that always works with zero setup. Two optional
integrations, both configured from **Admin → Integrations**, can send
submissions further:

### EmailJS (get an actual email when someone submits the form)

1. Create a free account at [emailjs.com](https://www.emailjs.com).
2. Add an **Email Service** (e.g. connect your Gmail) — note its **Service
   ID**.
3. Create an **Email Template** using these variables in the template body:
   `{{from_name}}`, `{{reply_to}}`, `{{subject}}`, `{{message}}` — note its
   **Template ID**.
4. Copy your **Public Key** from Account → General.
5. In Admin → Integrations, paste all three values, tick **Enable EmailJS
   delivery**, save, then click **Send Test Email** to confirm it works.

### Google Sheets (log every submission as a row in a spreadsheet)

A browser can't write to a Google Sheet directly — Google requires a small
script in front of it to accept the request. This is a one-time setup:

1. Create (or open) a Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Delete any starter code and paste this:
   ```javascript
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     const data = JSON.parse(e.postData.contents);
     sheet.appendRow([data.date, data.name, data.email, data.subject, data.message]);
     return ContentService.createTextOutput(JSON.stringify({result: "success"}))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```
4. Click **Deploy → New deployment → Web app**. Set **Execute as: Me** and
   **Who has access: Anyone**, then deploy.
5. Google will show a URL ending in `/exec` — copy it.
6. In Admin → Integrations, paste that URL into **Apps Script Web App URL**,
   tick **Enable Google Sheets logging**, save, then click **Send Test Row**
   and check the sheet for a new row.

Because of how Apps Script Web Apps respond to cross-origin requests, the
site can't read a success/failure response back — it fires the request and
moves on. If rows aren't appearing, double-check the deployment's access is
set to "Anyone" and that you copied the `/exec` URL (not the script editor
URL).

Both integrations run independently of the local Messages inbox — even if
neither is configured, or a request fails, the form submission is still
saved to Admin → Messages every time.

## 7. More premium features (round 3)

- **Command palette** — press `Ctrl+K` / `Cmd+K` anywhere on the public site
  (or click the search pill in the nav) to jump to any section, project, or
  blog post, toggle the theme, or open the resume, all from the keyboard.
- **GitHub activity widget** — set your GitHub username in Admin → Profile
  and a card appears (after Skills) showing your avatar, repo/follower
  counts, and a contribution graph pulled live from the GitHub public API.
  If GitHub is unreachable or the username is empty, the widget simply
  doesn't render — it never shows broken content.
- **Printable resume** (`resume.html`) — a clean, data-driven one-page resume
  generated from the same content as the rest of the site, with a
  "Print / Save as PDF" button (uses the browser's native print-to-PDF, so
  the output is real selectable text, not a screenshot). Linked from the
  footer.
- **WhatsApp floating button** — enable it and set a number in
  Admin → Integrations to add a floating chat button with a pre-filled
  message, on every page.
- **Visitor testimonial submissions** — a "Share Your Experience" button in
  the Testimonials section opens a form for visitors to submit their own
  testimonial. Submissions land in Admin → Testimonial Requests for
  approval — nothing appears on the site until you approve it.
- **Blog share buttons** — every blog post has Twitter/X, Facebook, LinkedIn
  share links plus a "Copy Link" button.
- **Custom 404 page** (`404.html`) — themed to match the rest of the site,
  with links back to Home, Projects and Contact.
- **Open Graph image** — a branded 1200×630 preview image
  (`assets/images/og-image.png`) used when the site or a blog post is shared
  on social media, so it doesn't rely on a plain screenshot or logo.
- **Local-storage / privacy notice banner** — a small, dismissible banner
  informing first-time visitors that the site uses local storage (not
  cookies) for preferences and anonymous visit counts. Toggle it off from
  Admin → Website Settings if you don't want it shown.
- **Backup reminder** — the Admin dashboard shows a banner if you've never
  exported a backup, or it's been 14+ days since the last one, with a
  one-click shortcut to Data Management → Export.
- **Login activity log** (Admin → Security) — an honest, client-side-only
  record of recent logins (date, browser, platform) in this browser, so a
  login you don't recognize stands out. Since everything here lives in the
  same browser storage a bad actor would already need access to, treat this
  as a convenience log rather than real intrusion detection.

## 8. More premium features (round 4)

- **Bilingual site (English / বাংলা)** — a language toggle (নেভ-এ "বাং"/"EN"
  বাটন) switches all static UI chrome — navigation, section headings,
  buttons, form labels, footer, banners — between English and Bengali.
  **This does not auto-translate admin-entered content** (profile bio,
  project descriptions, blog posts, testimonials): those stay exactly as
  written in the Admin Panel, in whichever language you wrote them.
  Reliably translating arbitrary user content needs a translation API this
  project intentionally doesn't depend on — if you want a fully bilingual
  experience, write your content in both languages and swap it manually, or
  wire up a translation API in `js/i18n.js`. The dictionary itself lives in
  `js/i18n.js` (`TRANSLATIONS`) if you want to add more languages or edit
  the wording.
- **FAQ rich results (FAQPage schema)** — structured data is generated
  automatically from whatever's in Admin → FAQ, so search engines can show
  your questions directly in results.
- **RSS feed** (`rss.xml`) — ships with a feed of the default blog posts,
  linked from `<head>` for feed readers to discover. It's a static file, so
  after adding/editing posts, regenerate it from Admin → Data Management →
  "Generate rss.xml" and re-upload it to your host.
- **Keyboard focus trap** — the project modal, testimonial form, and command
  palette now trap Tab/Shift+Tab focus while open and return focus to
  whatever triggered them on close, instead of letting keyboard focus leak
  to the page behind.
- **System theme detection** — a first-time visitor (no theme saved yet)
  gets dark or light mode based on their OS/browser preference
  (`prefers-color-scheme`); once anyone toggles it explicitly, that choice
  is remembered and always wins after that.
- **"Now" status badge** — an optional small badge under the hero
  ("Currently: ..."), set from Admin → Hero Section. Leave it blank to hide
  it.
- **Client / "Worked With" logo strip** — a grayscale-to-color logo strip
  above Projects, managed from Admin → Clients. Hides itself automatically
  if you delete every client.

## 9. More premium features (round 5)

- **Cross-browser polish** — added missing `-webkit-` prefixes for every
  `backdrop-filter` (glass-blur effects were Chrome/Firefox-only before;
  Safari now renders them too), and reset native `<select>` styling so
  dropdowns match the site's dark theme in every browser instead of
  falling back to OS chrome.
- **Newsletter signup** (footer) — a real, working form: email is validated,
  deduplicated, and stored locally. Subscribers show up in
  Admin → Newsletter with a CSV export button.
- **Blog reading time + related posts** — each post now shows an estimated
  reading time, and up to 3 related posts (matched by shared tags) appear
  at the bottom.
- **Sitemap regeneration** (Admin → Data Management) — same idea as the RSS
  button: `sitemap.xml` is static, so regenerate and re-upload it after
  adding or removing content, right alongside the RSS generator.
- **Privacy Policy page** (`privacy.html`) — a plain-language page explaining
  exactly what's stored locally and why, linked from the cookie banner and
  footer.

## 10. Admin panel power-ups

- **Search + bulk actions on every list section** — a search box filters
  by any visible column, and checkboxes let you select multiple rows for a
  single "Delete Selected" action. (Drag-to-reorder is automatically
  disabled while a search filter is active, since the visible order no
  longer matches the underlying saved order — clear the search to reorder.)
- **Duplicate** — every list item (skills, projects, blog posts, etc.) has a
  duplicate button that clones it (with "(Copy)" appended to its title) so
  you can quickly create a variant instead of retyping everything.
- **Storage usage meter** (Data Management) — shows how much of the
  browser's local storage quota is in use, with a per-key breakdown, and a
  warning once you're getting close to the limit (images uploaded through
  the admin panel are almost always the biggest contributor).
- **Change Username** (Security) — previously only the password could be
  changed from the UI.
- **Account Recovery Key** (Security) — since there's no email or backend,
  a forgotten password used to mean permanent lockout. Generate a recovery
  key here, save it somewhere safe (a password manager — not this
  browser), and use the login screen's "Forgot password?" link to reset
  your password if you're ever locked out. Each key is single-use and
  invalidated the moment it's used; generating a new one invalidates any
  previous key.
- **Per-section "Reset to Default"** — Profile, Hero Section, About Section,
  Contact Info, Social Media, Theme Settings, Website Settings, and
  Integrations each have their own "Reset" button (next to the panel
  title) that restores just that section to its shipped defaults, without
  touching anything else. This is separate from Data Management's
  "Reset All Data", which wipes everything. Theme Settings and Website
  Settings share the same underlying settings object but reset
  independently — resetting one never touches the other's fields.

## 11. Images & the resume

The original upload didn't include any image assets, so this build ships
with clean, on-brand **SVG placeholders** for the profile photo, project
thumbnails, certificates, gallery and testimonials (`assets/images/...`),
plus a minimal placeholder PDF at
`assets/Resume-of-Shagar-Chandro.pdf`. Replace any of them either by:
- uploading a new file directly from the relevant Admin panel (Profile,
  Projects, Certificates, Gallery, Testimonials, Website Settings), or
- swapping the file on disk at the same path.

## 12. Notes on the CDN dependencies

The site loads **Google Fonts** (Space Grotesk / Inter / JetBrains Mono) and
**Font Awesome** icons from their public CDNs via `<link>` tags in
`index.html` and `admin/index.html`. An internet connection is required for
those to load; if you need a fully offline build, download the font/icon
files and swap the CDN `<link>` tags for local paths.

## 13. Accessibility & SEO

- Semantic landmarks (`header`, `main`, `nav`, `footer`, `section`), skip
  link, visible focus states, `aria-label`s on icon-only controls, alt text
  on all images.
- Respects `prefers-reduced-motion`.
- Meta description/keywords, canonical tag, and Open Graph tags in
  `index.html` — update them if you deploy to a different domain.
- `admin/index.html` is marked `noindex, nofollow` since it's not meant to
  be publicly indexed.
