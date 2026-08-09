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
  const initialTheme = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', initialTheme);

  function syncThemeColorMeta(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f6fa' : '#0b0f17');
  }
  syncThemeColorMeta(initialTheme);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncThemeColorMeta(next);
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

  const root = document.getElementById('postContent');

  /* ============================ ARCHIVE (all posts, search + tag filter) ============================
     Shown when blog.html is opened with no ?post= param — previously this
     showed a generic "not found" message, which meant there was no way to
     browse older posts once more than a few existed. */
  function renderArchive() {
    document.title = 'Blog — Shagar Chandro';
    const allPosts = [...(data.blog || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const allTags = [...new Set(allPosts.flatMap(p => (p.tags || '').split(',').map(t => t.trim()).filter(Boolean)))].sort();

    if (!allPosts.length) {
      root.innerHTML = `
        <div class="blog-post-not-found">
          <p class="eyebrow"><i class="fa-solid fa-pen-nib"></i> Blog</p>
          <h1 class="section-title">No posts yet</h1>
          <p class="section-desc" style="margin-bottom:var(--sp-6)">Check back soon.</p>
          <a href="index.html" class="btn btn-primary"><i class="fa-solid fa-arrow-left"></i> Back to portfolio</a>
        </div>
      `;
      return;
    }

    root.innerHTML = `
      <div class="blog-post-header">
        <p class="eyebrow"><i class="fa-solid fa-pen-nib"></i> Writing</p>
        <h1 class="section-title">All Posts</h1>
        <p class="section-desc">Search by title, or filter by tag.</p>
      </div>
      <div class="blog-archive-toolbar">
        <div class="blog-archive-search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" id="archiveSearch" placeholder="Search posts..." aria-label="Search blog posts" />
        </div>
        ${allTags.length ? `
          <div class="blog-archive-tags" id="archiveTags">
            <button type="button" class="blog-archive-tag active" data-tag="">All</button>
            ${allTags.map(t => `<button type="button" class="blog-archive-tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="blog-grid" id="archiveGrid"></div>
    `;

    const grid = document.getElementById('archiveGrid');
    const searchInput = document.getElementById('archiveSearch');
    const tagButtons = document.querySelectorAll('#archiveTags .blog-archive-tag');
    let activeTag = '';

    function renderGrid() {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = allPosts.filter(p => {
        const pTags = (p.tags || '').split(',').map(t => t.trim());
        const matchesTag = !activeTag || pTags.includes(activeTag);
        const matchesQuery = !q || p.title.toLowerCase().includes(q) || (p.excerpt || '').toLowerCase().includes(q);
        return matchesTag && matchesQuery;
      });

      if (!filtered.length) {
        grid.innerHTML = `<div class="blog-archive-empty" style="grid-column:1/-1"><i class="fa-solid fa-magnifying-glass" style="font-size:1.5rem;margin-bottom:var(--sp-3);display:block"></i>No posts match your search.</div>`;
        return;
      }

      grid.innerHTML = filtered.map(post => `
        <article class="blog-card card">
          <a href="blog.html?post=${encodeURIComponent(post.slug || post.id)}" class="blog-card-cover">
            <img src="${post.cover}" alt="${escapeHtml(post.title)}" loading="lazy" />
          </a>
          <div class="blog-card-body">
            <span class="blog-card-date">${escapeHtml(formatDate(post.date))}</span>
            <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
            <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
            <a class="blog-card-link" href="blog.html?post=${encodeURIComponent(post.slug || post.id)}">Read more <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        </article>
      `).join('');
    }

    searchInput.addEventListener('input', renderGrid);
    tagButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activeTag = btn.dataset.tag;
        tagButtons.forEach(b => b.classList.toggle('active', b === btn));
        renderGrid();
      });
    });

    renderGrid();
  }

  const params = new URLSearchParams(location.search);
  const key = params.get('post');
  const post = key ? (data.blog || []).find(p => p.slug === key || p.id === key) : null;

  if (!key) {
    renderArchive();
  } else if (!post) {
    root.innerHTML = `
      <div class="blog-post-not-found">
        <p class="eyebrow"><i class="fa-solid fa-triangle-exclamation"></i> Not found</p>
        <h1 class="section-title">This post doesn't exist (yet)</h1>
        <p class="section-desc" style="margin-bottom:var(--sp-6)">It may have been removed, or the link is out of date.</p>
        <a href="blog.html" class="btn btn-primary"><i class="fa-solid fa-arrow-left"></i> Back to Blog</a>
      </div>
    `;
    document.title = 'Post not found — Shagar Chandro';
  } else {
    document.title = `${post.title} — Shagar Chandro`;

    // Update the page's meta tags in place (creating any that don't exist
    // yet) so search engines and social crawlers pick up the post's own
    // title/description/image instead of the generic blog-page defaults.
    // (Previously this appended a second <meta name="description">, which
    // crawlers ignore in favor of the first one already in the HTML head.)
    const absoluteUrl = (path) => {
      if (!path) return path;
      if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
      return new URL(path, location.origin + location.pathname.replace(/[^/]*$/, '')).href;
    };
    const setMeta = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const coverUrl = absoluteUrl(post.cover);
    setMeta('name', 'description', post.excerpt);
    setMeta('property', 'og:type', 'article');
    setMeta('property', 'og:title', post.title);
    setMeta('property', 'og:description', post.excerpt);
    setMeta('property', 'og:url', location.href);
    setMeta('property', 'og:image', coverUrl);
    setMeta('name', 'twitter:title', post.title);
    setMeta('name', 'twitter:description', post.excerpt);
    setMeta('name', 'twitter:image', coverUrl);

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

    // BlogPosting JSON-LD so search engines can show rich results for the
    // post (byline, dates, image) — mirrors the FAQPage schema main.js
    // injects on the homepage.
    (function injectBlogPostingSchema() {
      const existing = document.getElementById('blogPostingSchema');
      if (existing) existing.remove();
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: coverUrl ? [coverUrl] : undefined,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Person', name: data.profile?.name || 'Shagar Chandro' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': location.href }
      };
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'blogPostingSchema';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    })();

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
        <a href="blog.html" class="btn btn-outline"><i class="fa-solid fa-arrow-left"></i> Back to Blog</a>
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
