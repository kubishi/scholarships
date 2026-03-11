export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
}

interface Scholarship {
  id: number;
  name: string;
  deadline: string;
  amount: string;
  description: string;
  apply_url: string;
  created_at: string;
  updated_at: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function checkAuth(request: Request, env: Env): boolean {
  const auth = request.headers.get("Authorization");
  if (!auth) return false;
  const password = auth.replace("Bearer ", "");
  return password === env.ADMIN_PASSWORD;
}

async function handleAPI(request: Request, env: Env, path: string): Promise<Response> {
  // GET /api/scholarships
  if (path === "/api/scholarships" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM scholarships ORDER BY deadline ASC, name ASC"
    ).all<Scholarship>();
    return jsonResponse(results);
  }

  // POST /api/auth - verify password
  if (path === "/api/auth" && request.method === "POST") {
    const { password } = await request.json<{ password: string }>();
    if (password === env.ADMIN_PASSWORD) {
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ ok: false, error: "Invalid password" }, 401);
  }

  // All other API routes require auth
  if (!checkAuth(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // POST /api/scholarships
  if (path === "/api/scholarships" && request.method === "POST") {
    const body = await request.json<Partial<Scholarship>>();
    const result = await env.DB.prepare(
      "INSERT INTO scholarships (name, deadline, amount, description, apply_url) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(body.name, body.deadline, body.amount, body.description, body.apply_url)
      .run();
    return jsonResponse({ ok: true, id: result.meta.last_row_id }, 201);
  }

  // PUT /api/scholarships/:id
  const putMatch = path.match(/^\/api\/scholarships\/(\d+)$/);
  if (putMatch && request.method === "PUT") {
    const id = parseInt(putMatch[1]);
    const body = await request.json<Partial<Scholarship>>();
    await env.DB.prepare(
      "UPDATE scholarships SET name = ?, deadline = ?, amount = ?, description = ?, apply_url = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(body.name, body.deadline, body.amount, body.description, body.apply_url, id)
      .run();
    return jsonResponse({ ok: true });
  }

  // DELETE /api/scholarships/:id
  const deleteMatch = path.match(/^\/api\/scholarships\/(\d+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const id = parseInt(deleteMatch[1]);
    await env.DB.prepare("DELETE FROM scholarships WHERE id = ?").bind(id).run();
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleAPI(request, env, url.pathname);
    }

    // Serve the frontend
    return new Response(getHTML(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Indigenous Scholarships | Loyola Marymount University</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --crimson: #AB0C2F;
    --crimson-dark: #8a0a26;
    --blue: #0076A5;
    --blue-dark: #005f85;
    --light-gray: #C8C9C7;
    --dark-gray: #888B8D;
    --black: #000000;
    --white: #ffffff;
    --bg: #f5f5f4;
    --card-bg: #ffffff;
    --shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: var(--bg);
    color: var(--black);
    line-height: 1.6;
    min-height: 100vh;
  }

  /* Header */
  header {
    background: var(--crimson);
    color: var(--white);
    padding: 0;
    box-shadow: var(--shadow-md);
  }

  .header-top {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header-brand img {
    height: 50px;
    width: auto;
  }

  .header-titles h1 {
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.2;
  }

  .header-titles p {
    font-size: 0.85rem;
    opacity: 0.9;
    margin-top: 0.15rem;
  }

  .admin-toggle {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    color: var(--white);
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.2s;
    white-space: nowrap;
  }

  .admin-toggle:hover { background: rgba(255,255,255,0.25); }

  /* Main */
  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .intro {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #444;
    font-size: 0.95rem;
  }

  /* Cards */
  .scholarship-card {
    background: var(--card-bg);
    border-radius: 10px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--crimson);
    transition: box-shadow 0.2s;
  }

  .scholarship-card:hover { box-shadow: var(--shadow-md); }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .card-header h2 {
    font-size: 1.15rem;
    color: var(--crimson);
    font-weight: 600;
  }

  .card-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.6rem;
    font-size: 0.85rem;
  }

  .card-meta span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: #555;
  }

  .card-meta .deadline { color: var(--crimson-dark); font-weight: 600; }
  .card-meta .amount { color: var(--blue-dark); font-weight: 600; }

  .card-desc {
    color: #444;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn-apply {
    display: inline-block;
    background: var(--blue);
    color: var(--white);
    padding: 0.45rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-apply:hover { background: var(--blue-dark); }

  .btn-edit, .btn-delete {
    background: none;
    border: 1px solid var(--light-gray);
    padding: 0.35rem 0.7rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .btn-edit:hover { border-color: var(--blue); color: var(--blue); }
  .btn-delete:hover { border-color: var(--crimson); color: var(--crimson); }

  .admin-actions { display: none; }
  .admin-mode .admin-actions { display: flex; gap: 0.5rem; }

  /* Add button */
  .add-scholarship-bar {
    display: none;
    margin-bottom: 1rem;
  }

  .admin-mode .add-scholarship-bar { display: block; }

  .btn-add {
    background: var(--crimson);
    color: var(--white);
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: background 0.2s;
    width: 100%;
  }

  .btn-add:hover { background: var(--crimson-dark); }

  /* Modal */
  .modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 100;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-backdrop.active { display: flex; }

  .modal {
    background: var(--white);
    border-radius: 12px;
    padding: 1.75rem;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }

  .modal h2 {
    font-size: 1.15rem;
    margin-bottom: 1rem;
    color: var(--crimson);
  }

  .form-group {
    margin-bottom: 0.85rem;
  }

  .form-group label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: #333;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--light-gray);
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(0,118,165,0.1);
  }

  .form-group textarea { resize: vertical; min-height: 80px; }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .btn-modal {
    padding: 0.5rem 1.2rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-save { background: var(--crimson); color: var(--white); }
  .btn-save:hover { background: var(--crimson-dark); }
  .btn-cancel { background: var(--light-gray); color: #333; }
  .btn-cancel:hover { background: var(--dark-gray); color: var(--white); }

  /* Password modal */
  .password-input {
    width: 100%;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--light-gray);
    border-radius: 6px;
    font-size: 0.95rem;
    margin-bottom: 0.5rem;
  }

  .password-input:focus {
    outline: none;
    border-color: var(--crimson);
    box-shadow: 0 0 0 3px rgba(171,12,47,0.1);
  }

  .error-msg {
    color: var(--crimson);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    display: none;
  }

  /* Footer */
  footer {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--dark-gray);
    font-size: 0.8rem;
  }

  /* Loading */
  .loading {
    text-align: center;
    padding: 3rem;
    color: var(--dark-gray);
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--dark-gray);
  }

  @media (max-width: 600px) {
    .header-top { padding: 1rem; flex-wrap: wrap; }
    .header-titles h1 { font-size: 1.1rem; }
    .header-brand img { height: 40px; }
    main { padding: 1rem; }
    .scholarship-card { padding: 1.15rem; }
    .card-meta { flex-direction: column; gap: 0.25rem; }
  }
</style>
</head>
<body>
<header>
  <div class="header-top">
    <div class="header-brand">
      <img src="https://brand.lmu.edu/media/marcomm/brand/identitystandards/marks-primary/loyola-marymount-university.png" alt="LMU" crossorigin="anonymous" />
      <div class="header-titles">
        <h1>Indigenous Scholarship Opportunities</h1>
        <p>Resources for Native &amp; Indigenous Students at LMU</p>
      </div>
    </div>
    <button class="admin-toggle" onclick="toggleAdmin()">Admin</button>
  </div>
</header>

<main>
  <p class="intro">
    Below is a curated list of scholarships available to American Indian, Alaska Native, and Indigenous students. Click "Apply" to visit each scholarship's application page.
  </p>

  <div class="add-scholarship-bar">
    <button class="btn-add" onclick="openAdd()">+ Add Scholarship</button>
  </div>

  <div id="scholarships">
    <div class="loading">Loading scholarships...</div>
  </div>
</main>

<footer>
  Loyola Marymount University &mdash; Indigenous Scholarship Portal
</footer>

<!-- Password Modal -->
<div class="modal-backdrop" id="passwordModal">
  <div class="modal">
    <h2>Admin Login</h2>
    <p style="font-size:0.9rem;color:#555;margin-bottom:1rem;">Enter the admin password to manage scholarships.</p>
    <input type="password" class="password-input" id="passwordInput" placeholder="Password" onkeydown="if(event.key==='Enter')doLogin()" />
    <div class="error-msg" id="loginError">Incorrect password. Please try again.</div>
    <div class="modal-actions">
      <button class="btn-modal btn-cancel" onclick="closeModal('passwordModal')">Cancel</button>
      <button class="btn-modal btn-save" onclick="doLogin()">Login</button>
    </div>
  </div>
</div>

<!-- Edit/Add Modal -->
<div class="modal-backdrop" id="editModal">
  <div class="modal">
    <h2 id="editTitle">Add Scholarship</h2>
    <form id="editForm" onsubmit="return saveScholarship(event)">
      <input type="hidden" id="editId" />
      <div class="form-group">
        <label for="editName">Scholarship Name</label>
        <input type="text" id="editName" required />
      </div>
      <div class="form-group">
        <label for="editDeadline">Deadline</label>
        <input type="text" id="editDeadline" placeholder="e.g. March 31, 2026" />
      </div>
      <div class="form-group">
        <label for="editAmount">Amount</label>
        <input type="text" id="editAmount" placeholder="e.g. Up to $5,000" />
      </div>
      <div class="form-group">
        <label for="editDesc">Description</label>
        <textarea id="editDesc"></textarea>
      </div>
      <div class="form-group">
        <label for="editUrl">Application URL</label>
        <input type="url" id="editUrl" placeholder="https://..." />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-modal btn-cancel" onclick="closeModal('editModal')">Cancel</button>
        <button type="submit" class="btn-modal btn-save">Save</button>
      </div>
    </form>
  </div>
</div>

<script>
let adminToken = null;
let scholarships = [];

async function loadScholarships() {
  try {
    const res = await fetch('/api/scholarships');
    scholarships = await res.json();
    render();
  } catch (e) {
    document.getElementById('scholarships').innerHTML = '<div class="empty-state">Failed to load scholarships.</div>';
  }
}

function render() {
  const el = document.getElementById('scholarships');
  if (scholarships.length === 0) {
    el.innerHTML = '<div class="empty-state">No scholarships listed yet.</div>';
    return;
  }
  el.innerHTML = scholarships.map(s => \`
    <div class="scholarship-card">
      <div class="card-header">
        <h2>\${esc(s.name)}</h2>
      </div>
      <div class="card-meta">
        \${s.deadline ? \`<span class="deadline">&#128197; \${esc(s.deadline)}</span>\` : ''}
        \${s.amount ? \`<span class="amount">&#128176; \${esc(s.amount)}</span>\` : ''}
      </div>
      <p class="card-desc">\${esc(s.description)}</p>
      <div class="card-actions">
        \${s.apply_url ? \`<a href="\${esc(s.apply_url)}" target="_blank" rel="noopener" class="btn-apply">Apply &rarr;</a>\` : ''}
        <div class="admin-actions">
          <button class="btn-edit" onclick="openEdit(\${s.id})">Edit</button>
          <button class="btn-delete" onclick="doDelete(\${s.id})">Delete</button>
        </div>
      </div>
    </div>
  \`).join('');
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function toggleAdmin() {
  if (adminToken) {
    adminToken = null;
    document.body.classList.remove('admin-mode');
    document.querySelector('.admin-toggle').textContent = 'Admin';
    return;
  }
  openModal('passwordModal');
  document.getElementById('passwordInput').value = '';
  document.getElementById('loginError').style.display = 'none';
  setTimeout(() => document.getElementById('passwordInput').focus(), 100);
}

async function doLogin() {
  const pw = document.getElementById('passwordInput').value;
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      adminToken = pw;
      document.body.classList.add('admin-mode');
      document.querySelector('.admin-toggle').textContent = 'Logout';
      closeModal('passwordModal');
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  } catch {
    document.getElementById('loginError').style.display = 'block';
  }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function openAdd() {
  document.getElementById('editTitle').textContent = 'Add Scholarship';
  document.getElementById('editId').value = '';
  document.getElementById('editName').value = '';
  document.getElementById('editDeadline').value = '';
  document.getElementById('editAmount').value = '';
  document.getElementById('editDesc').value = '';
  document.getElementById('editUrl').value = '';
  openModal('editModal');
}

function openEdit(id) {
  const s = scholarships.find(x => x.id === id);
  if (!s) return;
  document.getElementById('editTitle').textContent = 'Edit Scholarship';
  document.getElementById('editId').value = s.id;
  document.getElementById('editName').value = s.name || '';
  document.getElementById('editDeadline').value = s.deadline || '';
  document.getElementById('editAmount').value = s.amount || '';
  document.getElementById('editDesc').value = s.description || '';
  document.getElementById('editUrl').value = s.apply_url || '';
  openModal('editModal');
}

async function saveScholarship(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const body = {
    name: document.getElementById('editName').value,
    deadline: document.getElementById('editDeadline').value,
    amount: document.getElementById('editAmount').value,
    description: document.getElementById('editDesc').value,
    apply_url: document.getElementById('editUrl').value,
  };

  const url = id ? \`/api/scholarships/\${id}\` : '/api/scholarships';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      closeModal('editModal');
      await loadScholarships();
    } else {
      alert('Failed to save. Are you still logged in?');
    }
  } catch {
    alert('Network error. Please try again.');
  }
}

async function doDelete(id) {
  if (!confirm('Delete this scholarship?')) return;
  try {
    await fetch(\`/api/scholarships/\${id}\`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken },
    });
    await loadScholarships();
  } catch {
    alert('Failed to delete.');
  }
}

// Close modals on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) closeModal(el.id);
  });
});

loadScholarships();
</script>
</body>
</html>`;
}
