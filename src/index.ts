const SHEET_ID = "1AkIGIxjUaDhnDb582v3RMOBdys69BSVKNuqaSkBRRTU";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const CACHE_TTL = 300; // 5 minutes

interface Scholarship {
  name: string;
  deadline: string;
  amount: string;
  eligibility: string;
  notes: string;
  apply_url: string;
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n" || (ch === "\r" && csv[i + 1] === "\n")) {
        row.push(current);
        current = "";
        rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function parseSheet(csv: string): Scholarship[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  // Skip header row
  return rows.slice(1)
    .map((row) => ({
      name: (row[0] || "").trim(),
      deadline: (row[1] || "").trim(),
      amount: (row[2] || "").trim(),
      eligibility: (row[3] || "").trim(),
      notes: (row[4] || "").trim(),
      apply_url: (row[5] || "").trim(),
    }))
    .filter((s) => s.name.length > 0);
}

async function fetchScholarships(): Promise<Scholarship[]> {
  const res = await fetch(CSV_URL, {
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
  });
  if (!res.ok) throw new Error("Failed to fetch sheet");
  const csv = await res.text();
  return parseSheet(csv);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/scholarships") {
      try {
        const scholarships = await fetchScholarships();
        return new Response(JSON.stringify(scholarships), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${CACHE_TTL}`,
          },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to load scholarships" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/" || !url.pathname.startsWith("/assets/")) {
      return new Response(getHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Indigenous Scholarships | Loyola Marymount University</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --blue: #0076A5;
    --blue-dark: #005f85;
    --blue-light: #e8f4f8;
    --light-gray: #C8C9C7;
    --dark-gray: #888B8D;
    --text: #222;
    --text-light: #555;
    --white: #ffffff;
    --bg: #f7f8f9;
    --card-bg: #ffffff;
    --shadow: 0 1px 3px rgba(0,0,0,0.08);
    --shadow-md: 0 3px 8px rgba(0,0,0,0.1);
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
  }

  header {
    background: var(--white);
    border-bottom: 2px solid var(--blue);
  }

  .header-top {
    max-width: 960px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
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
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--blue-dark);
    line-height: 1.2;
  }

  .header-titles p {
    font-size: 0.83rem;
    color: var(--text-light);
    margin-top: 0.1rem;
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .intro {
    text-align: center;
    margin-bottom: 1.5rem;
    color: var(--text-light);
    font-size: 0.9rem;
  }

  .scholarship-card {
    background: var(--card-bg);
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 0.75rem;
    box-shadow: var(--shadow);
    border-left: 3px solid var(--blue);
  }

  .scholarship-card.past-deadline {
    opacity: 0.5;
    border-left-color: var(--light-gray);
  }

  .scholarship-card.past-deadline .card-header h2 { color: var(--dark-gray); }
  .scholarship-card.past-deadline .deadline { color: var(--dark-gray) !important; }
  .scholarship-card.past-deadline .btn-apply { background: var(--dark-gray); }

  .card-header h2 {
    font-size: 1.05rem;
    color: var(--blue-dark);
    font-weight: 600;
    margin-bottom: 0.35rem;
  }

  .card-meta {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.4rem;
    font-size: 0.82rem;
  }

  .card-meta span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-light);
  }

  .card-meta .deadline { color: var(--blue-dark); font-weight: 600; }
  .card-meta .amount { color: var(--text-light); font-weight: 600; }

  .card-desc {
    color: var(--text-light);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .card-desc:last-child { margin-bottom: 0; }

  .btn-apply {
    display: inline-block;
    background: var(--blue);
    color: var(--white);
    padding: 0.35rem 0.9rem;
    border-radius: 5px;
    text-decoration: none;
    font-size: 0.82rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-apply:hover { background: var(--blue-dark); }

  .hub-banner {
    background: var(--blue-light);
    border: 1px solid #c4dfe8;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.88rem;
    color: var(--text);
  }

  .hub-banner a {
    color: var(--blue);
    font-weight: 600;
  }

  footer {
    text-align: center;
    padding: 1.5rem 1rem;
    color: var(--dark-gray);
    font-size: 0.75rem;
  }

  .loading, .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--dark-gray);
  }

  @media (max-width: 600px) {
    .header-top { padding: 0.75rem 1rem; }
    .header-titles h1 { font-size: 1.05rem; }
    .header-brand img { height: 40px; }
    main { padding: 1rem; }
    .scholarship-card { padding: 1rem; }
    .card-meta { flex-direction: column; gap: 0.2rem; }
  }
</style>
</head>
<body>
<header>
  <div class="header-top">
    <div class="header-brand">
      <img src="/assets/lmu-logo.png" alt="LMU" />
      <div class="header-titles">
        <h1>Indigenous Scholarship Opportunities</h1>
        <p>Resources for Native &amp; Indigenous Students at LMU</p>
      </div>
    </div>
  </div>
</header>

<main>
  <p class="intro">
    A curated list of scholarships for American Indian, Alaska Native, and Indigenous students.
  </p>

  <div id="scholarships">
    <div class="loading">Loading scholarships...</div>
  </div>

  <div class="hub-banner">
    Visit the <a href="https://www.lmu.edu/dei/indigenous/" target="_blank" rel="noopener">LMU Indigenous Hub</a>
    to join our mailing list, find contact info, and see more events and opportunities at LMU.
  </div>
</main>

<footer>
  Loyola Marymount University
</footer>

<script>
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

function parseDeadline(dl) {
  if (!dl || dl.toLowerCase() === 'varies') return null;
  const match = dl.match(/([A-Za-z]+ \\d{1,2},? \\d{4})/);
  if (match) {
    const d = new Date(match[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isPast(dl) {
  const d = parseDeadline(dl);
  if (!d) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  return d < today;
}

function sortScholarships(list) {
  return list.slice().sort((a, b) => {
    const pa = isPast(a.deadline);
    const pb = isPast(b.deadline);
    if (pa !== pb) return pa ? 1 : -1;
    const da = parseDeadline(a.deadline);
    const db = parseDeadline(b.deadline);
    if (da && !db) return -1;
    if (!da && db) return 1;
    if (!da && !db) return 0;
    return da - db;
  });
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function render() {
  const el = document.getElementById('scholarships');
  if (scholarships.length === 0) {
    el.innerHTML = '<div class="empty-state">No scholarships listed yet.</div>';
    return;
  }
  el.innerHTML = sortScholarships(scholarships).map(s => \`
    <div class="scholarship-card\${isPast(s.deadline) ? ' past-deadline' : ''}">
      <div class="card-header">
        <h2>\${esc(s.name)}</h2>
      </div>
      <div class="card-meta">
        \${s.deadline ? \`<span class="deadline">&#128197; \${esc(s.deadline)}</span>\` : ''}
        \${s.amount ? \`<span class="amount">&#128176; \${esc(s.amount)}</span>\` : ''}
      </div>
      \${s.eligibility ? \`<p class="card-desc">\${esc(s.eligibility)}</p>\` : ''}
      \${s.notes ? \`<p class="card-desc" style="font-size:0.83rem;color:#666;">\${esc(s.notes)}</p>\` : ''}
      \${s.apply_url ? \`<div class="card-actions"><a href="\${esc(s.apply_url)}" target="_blank" rel="noopener" class="btn-apply">Apply &rarr;</a></div>\` : ''}
    </div>
  \`).join('');
}

loadScholarships();
</script>
</body>
</html>`;
}
