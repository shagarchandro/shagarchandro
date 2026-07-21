/* ==========================================================================
   PRINTABLE RESUME
   Renders a clean, one-page resume from the shared DataStore. The
   "Print / Save as PDF" button just calls window.print() — css/print.css
   handles stripping site chrome so the browser's native print-to-PDF output
   looks like an actual resume document.
   ========================================================================== */

(() => {
  'use strict';

  const data = DataStore.get();
  const html = document.documentElement;
  html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  document.title = `Resume — ${data.profile.name}`;

  const root = document.getElementById('resumeContent');
  root.innerHTML = `
    <div class="resume-header">
      <h1 class="resume-name">${escapeHtml(data.profile.name)}</h1>
      <p class="resume-title">${escapeHtml(data.profile.title)}</p>
      <div class="resume-contact-row">
        <span><i class="fa-solid fa-envelope"></i> ${escapeHtml(data.contact.email)}</span>
        <span><i class="fa-solid fa-phone"></i> ${escapeHtml(data.contact.phone)}</span>
        <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(data.contact.address)}</span>
        ${data.social.github ? `<span><i class="fa-brands fa-github"></i> ${escapeHtml(data.social.github.replace(/^https?:\/\//, ''))}</span>` : ''}
        ${data.social.linkedin ? `<span><i class="fa-brands fa-linkedin"></i> ${escapeHtml(data.social.linkedin.replace(/^https?:\/\//, ''))}</span>` : ''}
      </div>
    </div>

    <div class="resume-section">
      <h2>Summary</h2>
      <p class="resume-item-desc">${escapeHtml(data.about.text)}</p>
    </div>

    <div class="resume-section">
      <h2>Experience</h2>
      ${data.experience.map(e => `
        <div class="resume-item">
          <div class="resume-item-head">
            <div>
              <div class="resume-item-title">${escapeHtml(e.role)}</div>
              <div class="resume-item-sub">${escapeHtml(e.company)}</div>
            </div>
            <div class="resume-item-date">${escapeHtml(e.duration)}</div>
          </div>
          <p class="resume-item-desc">${escapeHtml(e.description)}</p>
        </div>
      `).join('')}
    </div>

    <div class="resume-section">
      <h2>Education</h2>
      ${data.education.map(e => `
        <div class="resume-item">
          <div class="resume-item-head">
            <div>
              <div class="resume-item-title">${escapeHtml(e.degree)}</div>
              <div class="resume-item-sub">${escapeHtml(e.institute)}</div>
            </div>
            <div class="resume-item-date">${escapeHtml(e.duration)}</div>
          </div>
          <p class="resume-item-desc">${escapeHtml(e.description)}</p>
        </div>
      `).join('')}
    </div>

    <div class="resume-section">
      <h2>Skills</h2>
      <div class="resume-skills-row">
        ${data.skills.map(s => `<span class="resume-skill-pill">${escapeHtml(s.name)}</span>`).join('')}
      </div>
    </div>

    <div class="resume-section">
      <h2>Selected Projects</h2>
      ${data.projects.slice(0, 5).map(p => `
        <div class="resume-item">
          <div class="resume-item-head">
            <div class="resume-item-title">${escapeHtml(p.title)}</div>
            <div class="resume-item-date">${escapeHtml(p.category)}</div>
          </div>
          <p class="resume-item-desc">${escapeHtml(p.description)}</p>
        </div>
      `).join('')}
    </div>

    <div class="resume-section">
      <h2>Certificates</h2>
      ${data.certificates.map(c => `
        <div class="resume-item">
          <div class="resume-item-head">
            <div class="resume-item-title">${escapeHtml(c.title)}</div>
            <div class="resume-item-date">${escapeHtml(c.date)}</div>
          </div>
          <div class="resume-item-sub">${escapeHtml(c.issuer)}</div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('printBtn').addEventListener('click', () => window.print());
})();
