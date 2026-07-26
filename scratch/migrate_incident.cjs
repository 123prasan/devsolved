const fs = require('fs');

const html = fs.readFileSync('Incident.html', 'utf8');

// We'll extract pieces from Incident.html
function extract(startStr, endStr) {
    const start = html.indexOf(startStr);
    if (start === -1) return '';
    const end = html.indexOf(endStr, start);
    if (end === -1) return '';
    return html.substring(start, end + endStr.length);
}

const styleBlock = extract('<style>', '</style>');
const topbar = extract('<header class="topbar">', '</header>');
const scriptBlock = extract('<script>', '</script>');

const fullEjs = `<!DOCTYPE html>
<html lang="en">
<head>
    <%- include('../partials/head') %>
    ${styleBlock}
</head>
<body>
    <header class="topbar">
        <span class="topbar-logo">IncidentVi</span>
        <span class="topbar-sep">/</span>
        <span class="topbar-title"><%= post.title %></span>
    </header>

    <div class="page-wrap">
        <!-- Incident Header -->
        <div class="incident-header">
            <nav class="breadcrumb" aria-label="Breadcrumb">
                <span>Incidents</span>
                <span class="sep">›</span>
                <% if (post.tags && post.tags.length > 0) { %>
                    <span><%= post.tags[0].name %></span>
                <% } else { %>
                    <span>General</span>
                <% } %>
                <span class="sep">›</span>
                <span style="color:var(--fg);font-weight:600">INC-<%= post._id.toString().substring(0, 4).toUpperCase() %></span>
            </nav>

            <div class="chips-row">
                <% if (post.severity) { %>
                    <span class="chip <%= post.severity === 'critical' ? 'chip-p1' : (post.severity === 'high' ? 'chip-p2' : 'chip-p3') %>">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <%= post.severity.toUpperCase() %>
                    </span>
                <% } %>
                <span class="chip <%= post.status === 'resolved' ? 'chip-resolved' : 'chip-investigating' %>">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <%= post.status === 'resolved' ? 'Resolved' : 'Investigating' %>
                </span>
            </div>

            <h1 class="incident-title"><%= post.title %></h1>

            <div class="tags-row">
                <% post.tags.forEach(tag => { %>
                    <span class="tag"><%= tag.name %></span>
                <% }) %>
            </div>

            <div class="meta-row">
                <span class="meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <strong><%= post.author?.displayName || post.author?.username || 'System' %></strong>
                </span>
                <span class="meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <%= new Date(post.createdAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) %>
                </span>
                <span class="meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    MTTR: <strong><%= post.mttr || 'N/A' %></strong>
                </span>
                <span class="meta-item">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    <%= post.views || 0 %> views
                </span>
            </div>

            <div class="actions-row">
                <button class="btn <%= hasUpvoted ? 'active-upvote' : '' %>" id="upvoteBtn" data-post-id="<%= post._id %>" aria-label="Upvote">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="<%= hasUpvoted ? 'currentColor' : 'none' %>" stroke="currentColor" stroke-width="2" id="upvote-icon">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                    <span id="upvote-label"><%= hasUpvoted ? 'Upvoted' : 'Upvote' %></span>
                    <span id="upvoteCount" style="font-weight:700"><%= post.upvotes || 0 %></span>
                </button>
                <button class="btn <%= hasSaved ? 'active-bookmark' : '' %>" id="saveBtn" data-post-id="<%= post._id %>" aria-label="Bookmark">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="<%= hasSaved ? 'currentColor' : 'none' %>" stroke="currentColor" stroke-width="2" id="bookmark-icon">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span id="bookmark-label"><%= hasSaved ? 'Saved' : 'Save' %></span>
                </button>
            </div>

            <% if (post.excerpt) { %>
            <div class="exec-summary">
                <div class="exec-summary-label">Executive Summary</div>
                <p><%= post.excerpt %></p>
            </div>
            <% } %>
        </div>

        <div class="layout-grid">
            <aside class="nav-col sticky-col">
                <nav class="jump-nav" aria-label="Jump to section">
                    <div class="jump-nav-label">On this page</div>
                    <ul id="jump-nav-list">
                        <% 
                        let sections = [];
                        if (post.content && Array.isArray(post.content)) {
                            post.content.forEach((b, i) => {
                                if (['symptom', 'investigation', 'rootCause', 'resolution', 'timeline'].includes(b.type)) {
                                    sections.push({id: 'section-' + b.type + '-' + i, label: b.type.charAt(0).toUpperCase() + b.type.slice(1)});
                                } else if (b.type === 'custom-heading') {
                                    sections.push({id: 'section-heading-' + i, label: b.content});
                                }
                            });
                        }
                        %>
                        <% sections.forEach((sec, i) => { %>
                            <li><button onclick="scrollTo('<%= sec.id %>')" id="nav-<%= sec.id %>" class="<%= i === 0 ? 'active' : '' %>"><%= sec.label %></button></li>
                        <% }) %>
                        <li><button onclick="scrollTo('discussion')" id="nav-discussion">Discussion</button></li>
                    </ul>
                    <div class="nav-progress">
                        <div class="nav-progress-label" id="nav-progress-label">Section 1 of <%= sections.length + 1 %></div>
                        <div class="nav-progress-bar">
                            <div class="nav-progress-fill" id="nav-progress-fill" style="width:<%= 100 / (sections.length + 1) %>%"></div>
                        </div>
                    </div>
                </nav>
            </aside>

            <main class="content-area">
                <% if (Array.isArray(post.content)) { %>
                    <% post.content.forEach((block, idx) => { %>
                        <% if (block.type === 'paragraph') { %>
                            <div class="section-block">
                                <p class="para"><%- block.content %></p>
                            </div>
                        <% } else if (block.type === 'custom-heading') { %>
                            <h2 class="heading-2" id="section-heading-<%= idx %>"><%- block.content %></h2>
                        <% } else if (block.type === 'divider') { %>
                            <hr class="divider" />
                        <% } else if (block.type === 'image') { %>
                            <div class="section-block">
                                <img src="<%= block.src %>" alt="<%= block.caption %>" style="width:100%; border-radius:8px; border:1px solid var(--outline-variant); margin-bottom: 8px;">
                                <% if (block.caption) { %><p style="font-size:12px;color:var(--muted);text-align:center"><%= block.caption %></p><% } %>
                            </div>
                        <% } else if (block.type === 'list') { %>
                            <ul class="list-block">
                                <% block.items.forEach(li => { %>
                                    <li>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                        <%- li %>
                                    </li>
                                <% }) %>
                            </ul>
                        <% } else if (block.type === 'symptom') { %>
                            <section id="section-symptom-<%= idx %>" class="section-block">
                                <div class="block-header">
                                    <div class="block-icon block-icon-warning">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                    </div>
                                    <h2 class="block-title">Symptom</h2>
                                </div>
                                <div class="block-card block-card-warning">
                                    <ul class="symptom-list">
                                        <% block.items.forEach(item => { %>
                                            <li><span class="symptom-dot"></span><%- item %></li>
                                        <% }) %>
                                    </ul>
                                </div>
                            </section>
                        <% } else if (block.type === 'investigation') { %>
                            <section id="section-investigation-<%= idx %>" class="section-block">
                                <div class="block-header">
                                    <div class="block-icon block-icon-primary">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </div>
                                    <h2 class="block-title">Investigation</h2>
                                </div>
                                <div class="block-card">
                                    <ol class="investigation-list">
                                        <% block.steps.forEach((step, sIdx) => { %>
                                            <li><span class="step-num"><%= sIdx + 1 %></span><%- step %></li>
                                        <% }) %>
                                    </ol>
                                </div>
                            </section>
                        <% } else if (block.type === 'rootCause') { %>
                            <section id="section-rootCause-<%= idx %>" class="section-block">
                                <div class="block-header">
                                    <div class="block-icon block-icon-error">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                    </div>
                                    <h2 class="block-title">Root Cause</h2>
                                </div>
                                <div class="block-card block-card-error">
                                    <p><%- block.content %></p>
                                </div>
                            </section>
                        <% } else if (block.type === 'resolution') { %>
                            <section id="section-resolution-<%= idx %>" class="section-block">
                                <div class="block-header">
                                    <div class="block-icon block-icon-success">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                    </div>
                                    <h2 class="block-title">Resolution</h2>
                                </div>
                                <div class="block-card block-card-success">
                                    <ul class="resolution-list">
                                        <% block.items.forEach(item => { %>
                                            <li>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                    <polyline points="22 4 12 14.01 9 11.01" />
                                                </svg>
                                                <%- item %>
                                            </li>
                                        <% }) %>
                                    </ul>
                                </div>
                            </section>
                        <% } else if (block.type === 'terminal') { %>
                            <div class="terminal-block">
                                <div class="terminal-titlebar">
                                    <div style="display:flex;align-items:center;gap:8px">
                                        <div class="terminal-dots">
                                            <span class="dot-red"></span><span class="dot-yellow"></span><span class="dot-green"></span>
                                        </div>
                                        <div class="terminal-title-text">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                                            <%= block.title || 'Terminal' %>
                                        </div>
                                    </div>
                                    <button class="terminal-copy-btn" onclick="copyTerminal(this, 'term-<%= idx %>')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy
                                    </button>
                                </div>
                                <div class="terminal-body" id="term-<%= idx %>">
                                    <% block.lines.forEach(line => { %>
                                        <div class="terminal-line <%= line.startsWith('$') ? 'terminal-command' : 'terminal-output' %>"><%- line.replace(/^\$\s*/, '') %></div>
                                    <% }) %>
                                </div>
                            </div>
                        <% } else if (block.type === 'code') { %>
                            <div class="code-block">
                                <div class="code-header">
                                    <div class="code-header-left">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                                        <span class="code-filename"><%= block.filename || 'Code' %></span>
                                        <span class="code-lang"><%= block.language || 'text' %></span>
                                    </div>
                                    <button class="code-copy-btn" onclick="copyCode(this, 'code-<%= idx %>')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy
                                    </button>
                                </div>
                                <div class="code-body">
                                    <pre class="code-pre" id="code-<%= idx %>"><%= block.code %></pre>
                                </div>
                            </div>
                        <% } else if (block.type === 'timeline') { %>
                            <section id="section-timeline-<%= idx %>" class="section-block timeline-section">
                                <div class="block-header">
                                    <div class="block-icon block-icon-secondary">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    </div>
                                    <h2 class="block-title">Timeline</h2>
                                </div>
                                <ul class="timeline-list">
                                    <% block.events.forEach(ev => { %>
                                        <li class="timeline-item tl-<%= ev.status || 'update' %>">
                                            <div class="timeline-dot"><div class="timeline-dot-inner"></div></div>
                                            <div class="tl-content">
                                                <div class="tl-meta"><span class="tl-time"><%= ev.time %></span><span class="tl-badge"><%= ev.status || 'update' %></span></div>
                                                <p class="tl-desc"><%- ev.description %></p>
                                                <% if (ev.actor) { %><p class="tl-actor">— <%= ev.actor %></p><% } %>
                                            </div>
                                        </li>
                                    <% }) %>
                                </ul>
                            </section>
                        <% } %>
                    <% }) %>
                <% } %>
                
                <%- include('../partials/commentThread', { post }) %>
            </main>

            <aside class="related-col sticky-col">
                <div class="related-label">Related Incidents</div>
                <ul class="related-list">
                    <% if (typeof relatedPosts !== 'undefined' && relatedPosts.length > 0) { %>
                        <% relatedPosts.forEach(related => { %>
                            <li>
                                <a href="/incidents/<%= related.slug %>" class="related-card">
                                    <div class="related-chips">
                                        <span class="chip <%= related.severity === 'critical' ? 'chip-p1' : (related.severity === 'high' ? 'chip-p2' : 'chip-p3') %>" style="font-size:10px;padding:3px 8px">
                                            <%= (related.severity || 'normal').toUpperCase() %>
                                        </span>
                                        <span class="chip <%= related.status === 'resolved' ? 'chip-resolved' : 'chip-investigating' %>" style="font-size:10px;padding:3px 8px">
                                            <%= related.status === 'resolved' ? 'Resolved' : 'Investigating' %>
                                        </span>
                                    </div>
                                    <p class="related-title"><%= related.title %></p>
                                    <div class="related-meta">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                        <%= related.upvotes || 0 %> · <%= related.tags && related.tags[0] ? related.tags[0].name : 'General' %>
                                        <span class="ml-auto"><%= new Date(related.createdAt).toLocaleDateString('en-US', {month:'short', day:'numeric'}) %></span>
                                    </div>
                                </a>
                            </li>
                        <% }) %>
                    <% } else { %>
                        <p style="font-size:13px; color:var(--muted)">No related incidents found.</p>
                    <% } %>
                </ul>
            </aside>
        </div>
    </div>

    <%- include('../partials/footer') %>

    ${scriptBlock}

    <script>
        const postId = '<%= post._id %>';
        
        // Upvote Logic
        const upvoteBtn = document.getElementById('upvoteBtn');
        if (upvoteBtn) {
            upvoteBtn.addEventListener('click', async () => {
                const countEls = document.querySelectorAll('#upvoteCount');
                try {
                    const res = await fetch(\`/api/posts/\${postId}/upvote\`, { method: 'POST', credentials: 'include' });
                    if (res.status === 401) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); return; }
                    const data = await res.json();
                    if (data.success) {
                        countEls.forEach(el => el.textContent = data.upvotes);
                        upvoteBtn.classList.toggle('active-upvote', data.hasUpvoted);
                        const icon = document.getElementById('upvote-icon');
                        const label = document.getElementById('upvote-label');
                        icon.setAttribute('fill', data.hasUpvoted ? 'currentColor' : 'none');
                        label.textContent = data.hasUpvoted ? 'Upvoted' : 'Upvote';
                    }
                } catch(e) { console.error(e) }
            });
        }
        
        // Save Logic
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    const res = await fetch(\`/api/posts/\${postId}/save\`, { method: 'POST', credentials: 'include' });
                    if (res.status === 401) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname); return; }
                    const data = await res.json();
                    if (data.success) {
                        saveBtn.classList.toggle('active-bookmark', data.hasSaved);
                        const icon = document.getElementById('bookmark-icon');
                        const label = document.getElementById('bookmark-label');
                        icon.setAttribute('fill', data.hasSaved ? 'currentColor' : 'none');
                        label.textContent = data.hasSaved ? 'Saved' : 'Save';
                    }
                } catch(e) { console.error(e) }
            });
        }

        // Jump Nav updates
        var navIds = [];
        <% sections.forEach(sec => { %>
            navIds.push('<%= sec.id %>');
        <% }) %>
        navIds.push('discussion');

        function updateNavDynamic() {
            var active = navIds[0];
            for (var i = navIds.length - 1; i >= 0; i--) {
                var el = document.getElementById(navIds[i]);
                if (el) {
                    var rect = el.getBoundingClientRect();
                    if (rect.top <= 150) { active = navIds[i]; break; }
                }
            }
            navIds.forEach(function (id) {
                var btn = document.getElementById('nav-' + id);
                if (btn) btn.classList.toggle('active', id === active);
            });
            var idx = navIds.indexOf(active);
            var label = document.getElementById('nav-progress-label');
            var fill = document.getElementById('nav-progress-fill');
            if (label) label.textContent = 'Section ' + (idx + 1) + ' of ' + navIds.length;
            if (fill) fill.style.width = ((idx + 1) / navIds.length * 100) + '%';
        }

        window.addEventListener('scroll', updateNavDynamic, { passive: true });
        setTimeout(updateNavDynamic, 100);
    </script>
</body>
</html>`;

fs.writeFileSync('src/views/pages/incident.ejs', fullEjs);
console.log("Successfully generated src/views/pages/incident.ejs");
