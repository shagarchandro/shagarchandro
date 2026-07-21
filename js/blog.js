/* ==========================================================================
   BLOG POST READER
   Standalone page script — reads a single post from the shared DataStore
   (by ?post=slug-or-id) and renders it. Also owns this page's own small
   theme toggle / scroll-top since it doesn't load the full main.js.
   ========================================================================== */

(() => {
  'use strict';

  const data = DataStore.get();

  const html = document.documentElement;
  html.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  I18n.init();
  document.getElementById('langToggleLabel').textContent = I18n.get() === 'bn' ? 'EN' : 'বাং';
  document.getElementById('langToggle').addEventListener('click', () => {
    const next = I18n.toggle();
    document.getElementById('langToggleLabel').textContent = next === 'bn' ? 'EN' : 'বাং';
  });

  document.getElementById('logoMark').textContent = data.siteSettings.logoText || 'SC';
  document.getElementById('footerText').textContent = data.siteSettings.footerText;

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const params = new URLSearchParams(location.search);
  const key = params.get('post');
  const post = (data.blog || []).find(p => p.slug === key || p.id === key);
  const root = document.getElementById('postContent');

  if (!post) {
    root.innerHTML = `
      <div class="blog-post-not-found">
        <p class="eyebrow"><i class="fa-solid fa-triangle-exclamation"></i> Not found</p>
        <h1 class="section-title">This post doesn't exist (yet)</h1>
        <p class="section-desc" style="margin-bottom:var(--sp-6)">It may have been removed, or the link is out of date.</p>
        <a href="index.html#blog" class="btn btn-primary"><i class="fa-solid fa-arrow-left"></i> Back to Blog</a>
      </div>
    `;
    document.title = 'Post not found — Shagar Chandro';
  } else {
    document.title = `${post.title} — Shagar Chandro`;
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = post.excerpt;
    document.head.appendChild(metaDesc);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && post.cover) ogImage.setAttribute('content', post.cover);
    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage && post.cover) twImage.setAttribute('content', post.cover);

    const tags = (post.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const paragraphs = (post.content || '').split(/\n\s*\n/).map(p => `<p>${escapeHtml(p)}</p>`).join('');
    const pageUrl = location.href;
    const shareText = encodeURIComponent(post.title);
    const shareUrl = encodeURIComponent(pageUrl);

    const wordCount = (post.content || '').trim().split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.round(wordCount / 200));

    // Related posts: other posts sharing at least one tag, newest first, max 3.
    const related = (data.blog || [])
      .filter(p => p.id !== post.id)
      .map(p => {
        const pTags = (p.tags || '').split(',').map(t => t.trim());
        const shared = pTags.filter(t => tags.includes(t)).length;
        return { post: p, shared };
      })
      .filter(x => x.shared > 0)
      .sort((a, b) => b.shared - a.shared || new Date(b.post.date) - new Date(a.post.date))
      .slice(0, 3)
      .map(x => x.post);

    root.innerHTML = `
      <div class="blog-post-header">
        <p class="eyebrow"><i class="fa-solid fa-pen-nib"></i> ${escapeHtml(formatDate(post.date))} · ${readingMinutes} min read</p>
        <h1 class="section-title">${escapeHtml(post.title)}</h1>
        <p class="section-desc">${escapeHtml(post.excerpt)}</p>
        <div class="blog-post-tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
      <div class="blog-post-cover"><img src="${post.cover}" alt="${escapeHtml(post.title)}" /></div>
      <div class="blog-post-body">${paragraphs}</div>
      <div class="blog-share-row">
        <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-x-twitter"></i> Share</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-facebook-f"></i> Share</a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin-in"></i> Share</a>
        <button type="button" id="copyLinkBtn"><i class="fa-solid fa-link"></i> Copy Link</button>
      </div>
      ${related.length ? `
        <div class="related-posts">
          <h2>Related Posts</h2>
          <div class="related-posts-grid">
            ${related.map(p => `
              <a class="related-post-card" href="blog.html?post=${encodeURIComponent(p.slug || p.id)}">
                <img src="${p.cover}" alt="${escapeHtml(p.title)}" loading="lazy" />
                <span>${escapeHtml(p.title)}</span>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div style="text-align:center;margin-top:var(--sp-6)">
        <a href="index.html#blog" class="btn btn-outline"><i class="fa-solid fa-arrow-left"></i> Back to Blog</a>
      </div>
    `;

    document.getElementById('copyLinkBtn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(pageUrl);
      } catch (err) {
        // Clipboard API unavailable (e.g. insecure context) — fall back to a manual prompt.
        window.prompt('Copy this link:', pageUrl);
      }
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => { btn.innerHTML = original; }, 1800);
    });
  }

  // Scroll progress + scroll-to-top (lightweight copy of main.js's version)
  const progress = document.getElementById('scrollProgress');
  const topBtn = document.getElementById('scrollTopBtn');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    progress.style.width = `${scrolled}%`;
    topBtn.classList.toggle('visible', h.scrollTop > 500);
  }, { passive: true });
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
